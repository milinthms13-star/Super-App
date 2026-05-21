const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Joi = require('joi');
const multer = require('multer');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');

const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const BeautyPlan = require('../models/BeautyPlan');
const BeautyTip = require('../models/BeautyTip');
const BeautyProgressLog = require('../models/BeautyProgressLog');
const BeautySubscriptionRule = require('../models/BeautySubscriptionRule');
const BeautyUsageQuota = require('../models/BeautyUsageQuota');
const BeautyConsentAudit = require('../models/BeautyConsentAudit');
const BeautyOpsEvent = require('../models/BeautyOpsEvent');
const BeautySelfie = require('../models/BeautySelfie');
const s3Storage = require('../utils/s3Storage');
const {
  normalizeStorageKey,
  extractStorageKeyFromPhotoUrl,
  normalizeSafePhotoUrl,
} = require('../services/beautyAiStorageService');
const {
  buildBeautyPrompt,
  validateBeautyPayload,
} = require('../services/beautyAiBackendHelpers');

const router = express.Router();
const authenticate = auth.authenticate || auth;
const verifyAdmin = auth.verifyAdmin;
if (typeof verifyAdmin !== 'function') {
  throw new Error('Beauty AI route requires auth.verifyAdmin middleware.');
}
const isTestEnv = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';
const BEAUTY_API_VERSION =
  String(process.env.BEAUTY_AI_API_VERSION || 'beauty-ai-v1.1').trim().slice(0, 40) || 'beauty-ai-v1.1';
const BEAUTY_MODEL_VERSION =
  String(process.env.BEAUTY_AI_MODEL_VERSION || 'heuristic-selfie-v2').trim().slice(0, 60) ||
  'heuristic-selfie-v2';

const dataDir = path.join(__dirname, '..', 'data');
const dataPath = path.join(dataDir, 'beauty-ai-data.json');

const DEFAULT_TIPS = [
  {
    title: 'Daily Sunscreen Matters',
    text: 'Apply broad-spectrum sunscreen 15 minutes before sun exposure, and reapply every 2-3 hours.',
    category: 'skin-care',
    language: 'en',
    status: 'published',
  },
  {
    title: 'Patch Test First',
    text: 'Always patch-test a new product or home remedy on a small skin area for 24 hours.',
    category: 'safety',
    language: 'en',
    status: 'published',
  },
  {
    title: 'Hydrate for Glow',
    text: 'Hydration supports skin barrier health. Drink water and use a simple moisturizer regularly.',
    category: 'skin-care',
    language: 'en',
    status: 'published',
  },
];

const DEFAULT_SUBSCRIPTION_RULES = {
  free: {
    dailyAnalysisLimit: 1,
    weeklyPlanLengthDays: 7,
    allowPremiumReport: false,
    allowDermatologistReferral: false,
  },
  premium: {
    dailyAnalysisLimit: 10,
    weeklyPlanLengthDays: 30,
    allowPremiumReport: true,
    allowDermatologistReferral: true,
  },
};

const DEFAULT_PRODUCTS = {
  low: [
    'Gentle sulfate-free cleanser',
    'Niacinamide serum (budget)',
    'SPF 30 sunscreen',
  ],
  medium: [
    'Ceramide cleanser',
    'Vitamin C serum',
    'SPF 50 PA++++ sunscreen',
  ],
  high: [
    'Barrier-repair cleanser',
    'Retinol night serum',
    'Broad-spectrum matte sunscreen',
  ],
};

const limiterConfig = (max) => ({
  windowMs: 60 * 1000,
  max: isTestEnv ? 500 : max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again shortly.',
  },
});

const analysisLimiter = rateLimit(limiterConfig(12));
const planGenerationLimiter = rateLimit(limiterConfig(16));
const planStorageLimiter = rateLimit(limiterConfig(20));
const progressLimiter = rateLimit(limiterConfig(30));
const adminLimiter = rateLimit(limiterConfig(15));
const selfieUploadLimiter = rateLimit(limiterConfig(12));

const ALLOWED_SELFIE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const MAX_SELFIE_UPLOAD_BYTES = 8 * 1024 * 1024;

const normalizeText = (value = '', maxLength = 400) => String(value || '').trim().slice(0, maxLength);
const normalizeLower = (value = '', maxLength = 120) => normalizeText(value, maxLength).toLowerCase();
const normalizeArray = (value = [], maxLength = 80, maxItems = 20) => {
  const list = Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map((entry) => entry.trim());

  const unique = [];
  for (const item of list) {
    const normalized = normalizeText(item, maxLength);
    if (normalized && !unique.includes(normalized)) {
      unique.push(normalized);
    }
    if (unique.length >= maxItems) {
      break;
    }
  }
  return unique;
};

const parseBoolean = (value, defaultValue = false) => {
  if (typeof value === 'boolean') {
    return value;
  }
  const text = normalizeLower(value, 12);
  if (['true', '1', 'yes', 'on'].includes(text)) return true;
  if (['false', '0', 'no', 'off'].includes(text)) return false;
  return defaultValue;
};

const toNumber = (value, fallback = 0, min = 0, max = 100) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, numeric));
};

const resolveUserId = (req) =>
  normalizeText(req.user?._id || req.user?.id || req.auth?.sub || req.auth?.userId || '', 120);

const resolveUserTier = (req) => {
  const explicitTier = normalizeLower(
    req.user?.subscriptionTier ||
      req.user?.planTier ||
      req.user?.plan ||
      req.user?.membershipType,
    24
  );
  if (explicitTier === 'premium' || explicitTier === 'gold' || explicitTier === 'platinum' || explicitTier === 'vip' || explicitTier === 'pro') {
    return 'premium';
  }
  if (req.user?.isPremium === true) {
    return 'premium';
  }
  return 'free';
};

const getClientIp = (req) => {
  const forwarded = normalizeText(req.headers['x-forwarded-for'], 200);
  if (forwarded) {
    return normalizeText(forwarded.split(',')[0], 80);
  }
  return normalizeText(req.ip || req.socket?.remoteAddress || '', 80);
};

const getUserAgent = (req) => normalizeText(req.headers['user-agent'], 300);

const createStorageKey = (userId, extension = 'webp') => {
  const safeUserId = normalizeText(userId, 80).replace(/[^a-zA-Z0-9_-]/g, '_') || 'anonymous';
  const suffix = crypto.randomBytes(6).toString('hex');
  return `beauty-ai/selfies/${safeUserId}/${Date.now()}-${suffix}.${extension}`;
};

const buildPublicUploadUrl = (req, uploadResult = {}) => {
  const publicUrlPath = normalizeText(uploadResult.publicUrlPath, 2000);
  if (publicUrlPath) {
    const forwardedProto = normalizeLower(req.headers['x-forwarded-proto'], 12);
    const protocol = forwardedProto === 'https' ? 'https' : req.protocol || 'http';
    const host = normalizeText(req.get('host'), 255);
    if (host) {
      return `${protocol}://${host}${publicUrlPath}`;
    }
    return publicUrlPath;
  }
  return normalizeText(uploadResult.s3Url, 2000);
};

const severityFromCount = (count, amberThreshold, redThreshold) => {
  if (count >= redThreshold) return 'red';
  if (count >= amberThreshold) return 'amber';
  return 'green';
};

const toOpsCounterMap = (rows = []) => {
  const map = new Map();
  for (const row of rows) {
    const eventType = normalizeLower(row?._id?.eventType || '', 80);
    const severity = normalizeLower(row?._id?.severity || '', 20);
    if (!eventType || !severity) {
      continue;
    }
    map.set(`${eventType}:${severity}`, Number(row.count || 0));
  }
  return map;
};

const getOpsCount = (counterMap, eventType, severity) =>
  Number(counterMap.get(`${normalizeLower(eventType, 80)}:${normalizeLower(severity, 20)}`) || 0);

const recordOpsEvent = async ({
  userId = '',
  requestId = '',
  eventType = '',
  severity = 'info',
  endpoint = '',
  message = '',
  metadata = {},
}) => {
  if (dbUnavailable()) {
    return;
  }
  try {
    await BeautyOpsEvent.create({
      userId: normalizeText(userId, 120),
      requestId: normalizeText(requestId, 120),
      eventType: normalizeLower(eventType, 80),
      severity: ['info', 'warning', 'critical'].includes(severity) ? severity : 'info',
      endpoint: normalizeText(endpoint, 180),
      message: normalizeText(message, 320),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });
  } catch (error) {
    logger.warn(`Beauty AI ops event logging failed: ${error.message}`);
  }
};

const recordConsentAudit = async ({
  userId = '',
  requestId = '',
  action = '',
  consentGiven = false,
  endpoint = '',
  reason = '',
  req = null,
  metadata = {},
}) => {
  if (dbUnavailable()) {
    return;
  }

  try {
    await BeautyConsentAudit.create({
      userId: normalizeText(userId, 120),
      requestId: normalizeText(requestId, 120),
      action: normalizeLower(action, 40),
      consentGiven: Boolean(consentGiven),
      endpoint: normalizeText(endpoint, 160),
      reason: normalizeText(reason, 220),
      ipAddress: req ? getClientIp(req) : '',
      userAgent: req ? getUserAgent(req) : '',
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });
  } catch (error) {
    logger.warn(`Beauty AI consent audit logging failed: ${error.message}`);
  }
};

const deleteStoredSelfie = async ({
  storageKey = '',
  photoUrl = '',
  userId = '',
  requestId = '',
  endpoint = '',
}) => {
  const key = normalizeStorageKey(storageKey) || extractStorageKeyFromPhotoUrl(photoUrl);
  if (!key) {
    return false;
  }

  try {
    await s3Storage.deleteFromS3(key);
    await recordOpsEvent({
      userId,
      requestId,
      eventType: 'upload_deleted',
      severity: 'info',
      endpoint,
      message: 'Stored selfie deleted successfully.',
      metadata: { storageKey: key },
    });
    return true;
  } catch (error) {
    await recordOpsEvent({
      userId,
      requestId,
      eventType: 'upload_delete_failed',
      severity: 'warning',
      endpoint,
      message: error.message || 'Failed to delete stored selfie.',
      metadata: { storageKey: key },
    });
    return false;
  }
};

const selfieUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_SELFIE_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_SELFIE_MIME_TYPES.has(normalizeLower(file?.mimetype || '', 40))) {
      cb(new Error('Only JPEG, PNG, WEBP, and HEIC selfie images are allowed.'));
      return;
    }
    cb(null, true);
  },
});

const runSelfieUpload = (req, res) =>
  new Promise((resolve, reject) => {
    selfieUpload.single('selfie')(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const sanitizeSelfieBuffer = async (fileBuffer = Buffer.alloc(0)) => {
  const image = sharp(fileBuffer, { failOn: 'error' });
  const metadata = await image.metadata();
  if (!metadata || !metadata.format) {
    throw new Error('Unsupported selfie image payload.');
  }

  const sanitized = await image
    .rotate()
    .resize({
      width: 1800,
      height: 1800,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 84 })
    .toBuffer();

  return {
    buffer: sanitized,
    outputMimeType: 'image/webp',
    outputExtension: 'webp',
    originalWidth: Number(metadata.width || 0),
    originalHeight: Number(metadata.height || 0),
  };
};

const deriveSelfieSignalsFromBuffer = async (sanitizedBuffer = Buffer.alloc(0)) => {
  const imageStats = await sharp(sanitizedBuffer, { failOn: 'error' }).stats();
  const channels = Array.isArray(imageStats?.channels) ? imageStats.channels : [];
  const red = Number(channels?.[0]?.mean || 0);
  const green = Number(channels?.[1]?.mean || 0);
  const blue = Number(channels?.[2]?.mean || 0);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  const rednessRaw = (red - (green + blue) / 2 + 80) / 180;
  const textureRaw =
    (Number(channels?.[0]?.stdev || 0) + Number(channels?.[1]?.stdev || 0) + Number(channels?.[2]?.stdev || 0)) /
    (3 * 64);
  const confidenceRaw = Math.min(1, Math.max(0, Number(imageStats?.entropy || 0) / 7));

  return normalizeSelfieSignals({
    rednessScore: Math.max(0, Math.min(1, rednessRaw)),
    textureScore: Math.max(0, Math.min(1, textureRaw)),
    brightnessScore: Math.max(0, Math.min(1, luminance)),
    confidence: Math.max(0.35, Math.min(1, confidenceRaw)),
  });
};

const QUOTA_TIMEZONE = normalizeText(process.env.BEAUTY_QUOTA_TIMEZONE || process.env.APP_TIMEZONE || 'Asia/Kolkata', 80);

const getDateKeyForTimezone = (timeZone = QUOTA_TIMEZONE) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: normalizeText(timeZone, 80) || QUOTA_TIMEZONE || 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch (_error) {
    return new Date().toISOString().slice(0, 10);
  }
};

const getTodayDateKey = () => getDateKeyForTimezone(QUOTA_TIMEZONE);

const buildStableTipIndex = ({ total = 0, dateKey = '', language = 'en', userId = '' } = {}) => {
  const size = Number(total || 0);
  if (size <= 0) {
    return 0;
  }

  const seed = `${normalizeText(dateKey, 16)}:${normalizeLower(language, 8)}:${normalizeText(userId, 120)}`;
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const bucket = parseInt(hash.slice(0, 12), 16);
  if (!Number.isFinite(bucket)) {
    return 0;
  }
  return Math.abs(bucket) % size;
};

const buildNextDateKey = (dateKey = '') => {
  const [year, month, day] = String(dateKey || '')
    .split('-')
    .map((part) => Number(part));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().slice(0, 10);
  }
  const nextUtc = new Date(Date.UTC(year, Math.max(0, month - 1), day + 1));
  return nextUtc.toISOString().slice(0, 10);
};

const buildQuotaWindow = (dateKey = '') => {
  const nextDateKey = buildNextDateKey(dateKey || getTodayDateKey());
  return {
    dateKey: normalizeText(dateKey || getTodayDateKey(), 16),
    timezone: QUOTA_TIMEZONE,
    nextDateKey,
    nextAllowedAt: `${nextDateKey}T00:00:00`,
  };
};

const buildFeatureFlags = ({ tier = 'free', quotaRule = {} } = {}) => ({
  tier: tier === 'premium' ? 'premium' : 'free',
  canUseRealSelfieAnalysis: true,
  canGeneratePlan: true,
  canSavePlan: true,
  canDuplicatePlan: true,
  canUploadSelfie: true,
  allowPremiumReport: Boolean(quotaRule?.allowPremiumReport),
  allowDermatologistReferral: Boolean(quotaRule?.allowDermatologistReferral),
  weeklyPlanLengthDays: Number(quotaRule?.weeklyPlanLengthDays || 0),
});

const resolveQuotaRuleByTier = (rules, tier) => (tier === 'premium' ? rules.premium : rules.free);

const enforceDailyQuota = async ({ userId, tier, quotaField, limit }) => {
  if (!Number.isFinite(Number(limit)) || Number(limit) <= 0) {
    return { allowed: true, currentCount: 0, remaining: 0 };
  }

  const dateKey = getTodayDateKey();
  const path = `counts.${quotaField}`;
  const query = {
    userId,
    dateKey,
    $or: [{ [path]: { $exists: false } }, { [path]: { $lt: Number(limit) } }],
  };

  let updated = null;
  try {
    updated = await BeautyUsageQuota.findOneAndUpdate(
      query,
      {
        $setOnInsert: { userId, dateKey },
        $set: { tier },
        $inc: { [path]: 1 },
      },
      { new: true, upsert: true }
    ).lean();
  } catch (error) {
    if (!(error && error.code === 11000)) {
      throw error;
    }
  }

  if (updated) {
    const used = Number(updated.counts?.[quotaField] || 0);
    const quotaWindow = buildQuotaWindow(dateKey);
    return {
      allowed: true,
      currentCount: used,
      remaining: Math.max(0, Number(limit) - used),
      limit: Number(limit),
      dateKey: quotaWindow.dateKey,
      nextAllowedAt: quotaWindow.nextAllowedAt,
      timezone: quotaWindow.timezone,
      nextDateKey: quotaWindow.nextDateKey,
    };
  }

  const existing = await BeautyUsageQuota.findOne({ userId, dateKey }).lean();
  const currentCount = Number(existing?.counts?.[quotaField] || 0);
  const quotaWindow = buildQuotaWindow(dateKey);
  return {
    allowed: false,
    currentCount,
    remaining: 0,
    limit: Number(limit),
    dateKey: quotaWindow.dateKey,
    nextAllowedAt: quotaWindow.nextAllowedAt,
    timezone: quotaWindow.timezone,
    nextDateKey: quotaWindow.nextDateKey,
  };
};

const dbUnavailable = () => mongoose.connection.readyState !== 1;

const ensureDbReady = (res) => {
  if (!dbUnavailable()) {
    return true;
  }

  res.status(503).json({
    success: false,
    message: 'Beauty AI service is temporarily unavailable. Please try again shortly.',
  });
  return false;
};

const JoiSchemas = {
  tipQuery: Joi.object({
    language: Joi.string().trim().lowercase().max(8).default('en'),
    category: Joi.string().trim().lowercase().max(40).allow('').default(''),
    timezone: Joi.string().trim().max(80).allow('').default(''),
  }),
  analyzeSelfie: Joi.object({
    knownSkinType: Joi.string().trim().max(40).allow('').default('Not sure'),
    concern: Joi.string().trim().max(120).required(),
    eventMode: Joi.string().trim().max(60).allow('').default(''),
    eventType: Joi.string().trim().max(40).allow('').default('daily-glow'),
    language: Joi.string().trim().lowercase().valid('ml', 'en', 'hi').default('en'),
    hairType: Joi.string().trim().max(40).allow('').default('normal'),
    preference: Joi.string().trim().max(40).allow('').default('balanced'),
    ageRange: Joi.string().trim().max(40).allow('').default(''),
    selfieConsent: Joi.boolean().truthy('true', '1').required(),
    budget: Joi.string().trim().valid('low', 'medium', 'high').default('medium'),
    safety: Joi.object({
      sensitiveSkin: Joi.boolean().truthy('true', '1').default(false),
      knownAllergy: Joi.string().trim().max(120).allow('').default(''),
      pregnantOrBreastfeeding: Joi.boolean().truthy('true', '1').default(false),
      usingSkinMedicine: Joi.boolean().truthy('true', '1').default(false),
    }).default({}),
    selfieSignals: Joi.object({
      rednessScore: Joi.number().min(0).max(1),
      textureScore: Joi.number().min(0).max(1),
      brightnessScore: Joi.number().min(0).max(1),
      confidence: Joi.number().min(0).max(1),
    })
      .optional()
      .default(null),
  }),
  plan: Joi.object({
    language: Joi.string().trim().lowercase().valid('ml', 'en', 'hi').required(),
    concern: Joi.string().trim().max(120).required(),
    selectedConcerns: Joi.array().items(Joi.string().trim().max(80)).max(20).default([]),
    gender: Joi.string().trim().max(24).allow('').default(''),
    age: Joi.number().integer().min(0).max(120).allow(null).default(null),
    budget: Joi.string().trim().valid('low', 'medium', 'high').required(),
    eventType: Joi.string().trim().max(40).required(),
    skinType: Joi.string().trim().max(40).required(),
    hairType: Joi.string().trim().max(40).allow('').default('normal'),
    notes: Joi.string().trim().max(800).allow('').default(''),
    preference: Joi.string().trim().max(40).allow('').default('balanced'),
    consent: Joi.boolean().truthy('true', '1').required(),
    safety: Joi.object({
      sensitiveSkin: Joi.boolean().truthy('true', '1').default(false),
      knownAllergy: Joi.string().trim().max(120).allow('').default(''),
      pregnantOrBreastfeeding: Joi.boolean().truthy('true', '1').default(false),
      usingSkinMedicine: Joi.boolean().truthy('true', '1').default(false),
    }).default({}),
    selfieMeta: Joi.object({
      fileName: Joi.string().trim().max(180).allow('').default(''),
      fileSize: Joi.number().min(0).max(20 * 1024 * 1024).allow(null).default(null),
      mimeType: Joi.string().trim().max(120).allow('').default(''),
    }).default({}),
    selfieSignals: Joi.object({
      rednessScore: Joi.number().min(0).max(1).default(0.3),
      textureScore: Joi.number().min(0).max(1).default(0.3),
      brightnessScore: Joi.number().min(0).max(1).default(0.5),
      confidence: Joi.number().min(0).max(1).default(0.5),
    }).default({}),
  }),
  createPlan: Joi.object({
    gender: Joi.string().trim().max(24).allow('').default(''),
    age: Joi.number().integer().min(0).max(120).allow(null).default(null),
    primaryConcern: Joi.string().trim().max(120).allow('').default(''),
    skinType: Joi.string().trim().max(40).required(),
    hairType: Joi.string().trim().max(40).allow('').default('normal'),
    budget: Joi.string().trim().valid('low', 'medium', 'high').required(),
    language: Joi.string().trim().lowercase().valid('ml', 'en', 'hi').required(),
    selectedConcerns: Joi.array().items(Joi.string().trim().max(80)).max(20).default([]),
    notes: Joi.string().trim().max(800).allow('').default(''),
    photoUrl: Joi.string().trim().max(2000).allow('').default(''),
    photoStorageKey: Joi.string().trim().max(500).allow('').default(''),
    photoStorageProvider: Joi.string().trim().max(32).allow('').default(''),
    photoName: Joi.string().trim().max(180).allow('').default(''),
    eventType: Joi.string().trim().max(40).required(),
    safety: Joi.object({
      sensitiveSkin: Joi.boolean().truthy('true', '1').default(false),
      knownAllergy: Joi.string().trim().max(120).allow('').default(''),
      pregnantOrBreastfeeding: Joi.boolean().truthy('true', '1').default(false),
      usingSkinMedicine: Joi.boolean().truthy('true', '1').default(false),
    }).default({}),
    selfieSignals: Joi.object({
      rednessScore: Joi.number().min(0).max(1).default(0.3),
      textureScore: Joi.number().min(0).max(1).default(0.3),
      brightnessScore: Joi.number().min(0).max(1).default(0.5),
      confidence: Joi.number().min(0).max(1).default(0.5),
    }).default({}),
    plan: Joi.object({
      title: Joi.string().trim().max(120).allow('').default(''),
      score: Joi.number().min(0).max(100).default(0),
      morning: Joi.array().items(Joi.string().trim().max(180)).max(30).default([]),
      night: Joi.array().items(Joi.string().trim().max(180)).max(30).default([]),
      hair: Joi.array().items(Joi.string().trim().max(180)).max(30).default([]),
      products: Joi.array().items(Joi.string().trim().max(180)).max(40).default([]),
      avoid: Joi.array().items(Joi.string().trim().max(180)).max(40).default([]),
      eventPlan: Joi.array().items(Joi.string().trim().max(180)).max(40).default([]),
      concernSeverity: Joi.string().trim().valid('mild', 'moderate', 'severe').default('mild'),
      disclaimer: Joi.array().items(Joi.string().trim().max(260)).max(20).default([]),
      apiVersion: Joi.string().trim().max(40).allow('').default(BEAUTY_API_VERSION),
      modelVersion: Joi.string().trim().max(60).allow('').default(BEAUTY_MODEL_VERSION),
    }).allow(null).default(null),
  }),
  updatePlan: Joi.object({
    selectedConcerns: Joi.array().items(Joi.string().trim().max(80)).max(20),
    primaryConcern: Joi.string().trim().max(120).allow(''),
    notes: Joi.string().trim().max(800).allow(''),
    status: Joi.string().trim().valid('Active', 'Archived'),
  })
    .min(1)
    .required(),
  deleteSelfie: Joi.object({
    selfieId: Joi.string().trim().max(80).allow('').default(''),
    photoStorageKey: Joi.string().trim().max(500).allow('').default(''),
    photoUrl: Joi.string().trim().max(2000).allow('').default(''),
  }),
  progress: Joi.object({
    day: Joi.number().integer().min(1).max(30).required(),
    done: Joi.alternatives().try(Joi.boolean(), Joi.string(), Joi.number()).required(),
    note: Joi.string().trim().max(600).allow('').default(''),
    skinScore: Joi.number().min(0).max(100).default(0),
    selfieSnapshotLabel: Joi.string().trim().max(120).allow('').default(''),
  }),
  addTip: Joi.object({
    title: Joi.string().trim().max(140).required(),
    text: Joi.string().trim().max(1000).required(),
    category: Joi.string().trim().max(64).default('general'),
    language: Joi.string().trim().lowercase().max(8).default('en'),
  }),
  subscriptionRules: Joi.object({
    free: Joi.object({
      dailyAnalysisLimit: Joi.number().integer().min(0).max(500).required(),
      weeklyPlanLengthDays: Joi.number().integer().min(1).max(90).required(),
      allowPremiumReport: Joi.boolean().required(),
      allowDermatologistReferral: Joi.boolean().required(),
    }).required(),
    premium: Joi.object({
      dailyAnalysisLimit: Joi.number().integer().min(0).max(500).required(),
      weeklyPlanLengthDays: Joi.number().integer().min(1).max(90).required(),
      allowPremiumReport: Joi.boolean().required(),
      allowDermatologistReferral: Joi.boolean().required(),
    }).required(),
  }),
};

const validate = (schema, payload) => {
  const result = schema.validate(payload, { abortEarly: false, stripUnknown: true, convert: true });
  if (result.error) {
    return {
      ok: false,
      errors: result.error.details.map((detail) => detail.message),
    };
  }

  return {
    ok: true,
    value: result.value,
  };
};

const detectSkinType = (knownSkinType = 'Not sure', concern = '') => {
  const explicitSkinType = normalizeText(knownSkinType, 40);
  if (explicitSkinType && explicitSkinType.toLowerCase() !== 'not sure') {
    return explicitSkinType;
  }

  const normalizedConcern = normalizeLower(concern);
  if (normalizedConcern.includes('acne')) return 'Oily';
  if (normalizedConcern.includes('wrinkle')) return 'Dry';
  if (normalizedConcern.includes('pigmentation')) return 'Combination';
  return 'Combination';
};

const concernList = (primaryConcern = '', eventMode = '') => {
  const seed = [normalizeText(primaryConcern, 80)].filter(Boolean);
  const event = normalizeLower(eventMode, 40);

  if (event.includes('bridal') || event.includes('festival')) {
    seed.push('Tanning');
  }
  if (event.includes('teen')) {
    seed.push('Acne');
  }

  return normalizeArray(seed, 80, 4);
};

const resolveEffectiveEventType = (eventType = '', eventMode = '') =>
  normalizeText(eventType || eventMode || 'daily-glow', 40);

const pickProducts = (budget = 'medium') => {
  const normalized = normalizeLower(budget, 20);
  if (normalized === 'low') return DEFAULT_PRODUCTS.low;
  if (normalized === 'high') return DEFAULT_PRODUCTS.high;
  return DEFAULT_PRODUCTS.medium;
};

const buildRoutines = (analysisInput = {}) => {
  const concern = normalizeLower(analysisInput.concern, 80);
  const preference = normalizeLower(analysisInput.preference || 'balanced', 30);

  const morningRoutine = [
    'Gentle cleanse',
    concern.includes('pigmentation') ? 'Vitamin C or brightening serum' : 'Hydrating serum',
    'Moisturizer',
    'Broad-spectrum sunscreen',
  ];

  const nightRoutine = [
    'Cleanse (double cleanse if makeup was used)',
    concern.includes('acne') ? 'Target acne treatment' : 'Barrier-support serum',
    'Moisturizer',
    'Lip and under-eye care',
  ];

  const weeklyPlan = [
    '2x soothing mask',
    '1x mild exfoliation (skip if skin is irritated)',
    'Scalp and hair nourishment routine',
  ];

  const remedies =
    preference === 'natural'
      ? [
          'Aloe vera gel (patch-tested) for soothing',
          'Cold green tea compress for under-eye puffiness',
          'Honey + yogurt mask weekly if no sensitivity',
        ]
      : [
          'Use a dermatologist-tested soothing gel',
          'Use fragrance-free moisturizer for barrier support',
          'Use a targeted concern serum 3-4 nights/week',
        ];

  return { morningRoutine, nightRoutine, weeklyPlan, remedies };
};

const buildSafetyWarnings = (safety = {}) => {
  const warnings = [];

  if (safety.sensitiveSkin) {
    warnings.push('Patch test every new product for at least 24 hours before full-face use.');
  }
  if (safety.pregnantOrBreastfeeding) {
    warnings.push('Avoid strong active ingredients unless approved by your doctor.');
  }
  if (safety.usingSkinMedicine) {
    warnings.push('Do not mix acne or skin medicine with new active products without dermatologist advice.');
  }
  if (normalizeText(safety.knownAllergy, 120)) {
    warnings.push(`Avoid ingredients related to: ${normalizeText(safety.knownAllergy, 120)}.`);
  }

  return warnings;
};

const normalizeSelfieSignals = (signals = {}) => {
  const rednessScore = toNumber(signals.rednessScore, 0.3, 0, 1);
  const textureScore = toNumber(signals.textureScore, 0.3, 0, 1);
  const brightnessScore = toNumber(signals.brightnessScore, 0.5, 0, 1);
  const confidence = toNumber(signals.confidence, 0.5, 0, 1);

  return {
    rednessScore,
    textureScore,
    brightnessScore,
    confidence,
  };
};

const scoreFromSignals = (signals = {}) => {
  const normalized = normalizeSelfieSignals(signals);
  const penalty =
    normalized.rednessScore * 12 +
    normalized.textureScore * 10 +
    Math.max(0, 0.55 - normalized.brightnessScore) * 8;
  return Math.max(42, Math.round(82 - penalty));
};

const eventPlanAddons = (eventType = '') => {
  const normalized = normalizeLower(eventType, 40);
  if (normalized.includes('bridal')) {
    return ['Start 4-week glow prep', 'Schedule 2 trial makeup sessions', 'Hydration + sleep tracker daily'];
  }
  if (normalized.includes('festival')) {
    return ['Add de-tan care 2x weekly', 'Practice lightweight makeup look', 'Avoid last-minute unknown products'];
  }
  if (normalized.includes('interview')) {
    return ['Keep routine minimal and calm', 'Focus on hydration and SPF', 'Prep low-shine grooming night before'];
  }
  if (normalized.includes('teen')) {
    return ['Use gentle acne-safe routine', 'Avoid harsh scrubs', 'Track breakout triggers'];
  }
  if (normalized.includes('men-grooming')) {
    return ['Shave-care soothing routine', 'Beard area hygiene checks', 'Weekly scalp + skin reset'];
  }
  return ['Keep routine consistent for 7 days', 'Take weekly progress selfie'];
};

const severityFromConcernText = (concerns = []) => {
  const normalized = (Array.isArray(concerns) ? concerns : [concerns])
    .map((c) => normalizeLower(c, 80))
    .filter(Boolean);

  // Simple heuristic severity classifier
  const severeHits = normalized.some((c) =>
    ['infection', 'burn', 'burns', 'allergy', 'allergic', 'eczema', 'severe', 'open wound', 'blood'].some((k) => c.includes(k))
  );
  if (severeHits) return 'severe';

  const moderateHits = normalized.some((c) => ['acne', 'pigmentation', 'wrinkle', 'dandruff', 'irritation'].some((k) => c.includes(k)));
  if (moderateHits) return 'moderate';

  return 'mild';
};

const buildDisclaimers = ({ safety = {}, concernSeverity = 'mild' } = {}) => {
  const disclaimers = [];

  if (safety?.sensitiveSkin) {
    disclaimers.push('Patch test new products first (especially if you have sensitive skin).');
  }
  if (safety?.pregnantOrBreastfeeding) {
    disclaimers.push('If you are pregnant or breastfeeding, confirm ingredient suitability with a healthcare professional.');
  }
  if (safety?.usingSkinMedicine) {
    disclaimers.push('If you are using skin medicines, avoid introducing new actives without professional guidance.');
  }

  if (concernSeverity === 'severe') {
    disclaimers.push('For severe symptoms (infection/allergy/burns), consult a dermatologist urgently.');
  } else if (concernSeverity === 'moderate') {
    disclaimers.push('If irritation worsens or symptoms persist, consult a dermatologist.');
  }

  if (!disclaimers.length) {
    disclaimers.push('This plan is for general guidance and is not medical advice.');
  }

  return disclaimers;
};

const buildDisclaimerBundle = ({ safety = {}, concernSeverity = 'mild' } = {}) => {
  const general = ['This plan is for informational guidance and is not medical advice.'];
  const caution = [];
  const escalation = [];

  if (safety?.sensitiveSkin) {
    caution.push('Sensitive skin detected: patch test before applying new products.');
  }
  if (safety?.pregnantOrBreastfeeding) {
    caution.push('Pregnancy/breastfeeding flag: verify ingredient suitability with your clinician.');
  }
  if (safety?.usingSkinMedicine) {
    caution.push('Current skin medicine use: avoid combining with strong actives without professional review.');
  }
  if (normalizeText(safety?.knownAllergy, 120)) {
    caution.push(`Known allergy noted: ${normalizeText(safety.knownAllergy, 120)}.`);
  }

  if (concernSeverity === 'severe') {
    escalation.push('Severe concern detected. Seek dermatologist support urgently.');
  } else if (concernSeverity === 'moderate') {
    escalation.push('Moderate concern detected. Consult a dermatologist if no improvement in 7-14 days.');
  }

  return {
    severity: concernSeverity,
    general,
    caution,
    escalation,
    combined: [...general, ...caution, ...escalation],
  };
};

const generateStructuredBeautyPlan = ({
  skinType = 'normal',
  hairType = 'normal',
  selectedConcerns = [],
  budget = 'medium',
  language = 'en',
  eventType = 'daily-glow',
  safety = {},
  signals = {},
}) => {
  const concerns = normalizeArray(selectedConcerns, 80, 20).map((item) => normalizeLower(item, 80));
  const lowerSkinType = normalizeLower(skinType || 'normal', 30);
  const lowerHairType = normalizeLower(hairType || 'normal', 30);
  const score = scoreFromSignals(signals);

  const severity = severityFromConcernText(selectedConcerns);
  const disclaimers = buildDisclaimers({ safety, concernSeverity: severity });
  const disclaimerBundle = buildDisclaimerBundle({ safety, concernSeverity: severity });

  const morning = [
    'Gentle cleanser',
    lowerSkinType === 'dry' ? 'Hydrating moisturizer' : 'Light moisturizer',
    'Sunscreen SPF 30+',
  ];

  const night = [
    'Cleanse face',
    concerns.includes('acne') ? 'Use acne-safe treatment only if suitable' : 'Apply serum if suitable',
    'Moisturizer',
  ];

  const hair = [
    lowerHairType === 'dry' ? 'Oil massage once or twice weekly' : 'Mild shampoo routine',
    concerns.includes('dandruff') ? 'Use anti-dandruff shampoo twice weekly' : 'Use gentle shampoo',
    concerns.includes('hair fall')
      ? 'Check stress, sleep, and diet. Consult doctor if hair fall is severe.'
      : 'Use conditioner on hair lengths',
  ];

  return {
    title: language === 'ml' ? 'സുരക്ഷിത ബ്യൂട്ടി പ്ലാൻ' : 'Personal Beauty Routine Plan',
    score,
    morning,
    night,
    hair,
    products: pickProducts(normalizeLower(budget || 'medium', 20)),
    avoid: [
      'Avoid bleaching creams and unknown fairness products.',
      ...buildSafetyWarnings(safety).map((warning) => `Safety: ${warning}`),
    ],
    eventPlan: eventPlanAddons(eventType),
    concernSeverity: severity,
    disclaimer: disclaimers,
    disclaimerBundle,
    apiVersion: BEAUTY_API_VERSION,
    modelVersion: BEAUTY_MODEL_VERSION,
  };
};

let migrationAttempted = false;
const migrateLegacyJsonIfNeeded = async () => {
  if (migrationAttempted || dbUnavailable()) {
    return;
  }
  migrationAttempted = true;

  try {
    await fs.access(dataPath);
  } catch (_error) {
    return;
  }

  try {
    const raw = await fs.readFile(dataPath, 'utf8');
    const parsed = JSON.parse(raw || '{}');

    const tipCount = await BeautyTip.countDocuments();
    if (tipCount === 0 && Array.isArray(parsed.tips) && parsed.tips.length) {
      const docs = parsed.tips
        .map((tip) => ({
          title: normalizeText(tip.title, 140),
          text: normalizeText(tip.text, 1000),
          category: normalizeLower(tip.category || 'general', 64),
          language: normalizeLower(tip.language || 'en', 8),
          status: normalizeLower(tip.status || 'published', 16) || 'published',
          createdBy: normalizeLower(tip.createdBy || 'legacy-migration', 120),
          createdAt: tip.createdAt ? new Date(tip.createdAt) : undefined,
          updatedAt: tip.updatedAt ? new Date(tip.updatedAt) : undefined,
        }))
        .filter((tip) => tip.title && tip.text);

      if (docs.length) {
        await BeautyTip.insertMany(docs, { ordered: false });
      }
    }

    if (Array.isArray(parsed.progressLogs) && parsed.progressLogs.length) {
      for (const entry of parsed.progressLogs) {
        const userId = normalizeText(entry.userId || entry.userKey, 120);
        const day = toNumber(entry.day, 0, 0, 30);
        if (!userId || !day) {
          continue;
        }

        await BeautyProgressLog.findOneAndUpdate(
          { userId, day },
          {
            $set: {
              done: parseBoolean(entry.done, false),
              note: normalizeText(entry.note, 600),
              skinScore: toNumber(entry.skinScore, 0, 0, 100),
              selfieSnapshotLabel: normalizeText(entry.selfieSnapshotLabel, 120),
              updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
            },
            $setOnInsert: {
              createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
            },
          },
          { upsert: true, new: true }
        );
      }
    }

    const existingRule = await BeautySubscriptionRule.findOne({ key: 'default' });
    if (!existingRule && parsed.subscriptionRules && typeof parsed.subscriptionRules === 'object') {
      await BeautySubscriptionRule.create({
        key: 'default',
        free: {
          dailyAnalysisLimit: toNumber(parsed.subscriptionRules?.free?.dailyAnalysisLimit, 1, 0, 500),
          weeklyPlanLengthDays: toNumber(parsed.subscriptionRules?.free?.weeklyPlanLengthDays, 7, 1, 90),
          allowPremiumReport: parseBoolean(parsed.subscriptionRules?.free?.allowPremiumReport, false),
          allowDermatologistReferral: parseBoolean(
            parsed.subscriptionRules?.free?.allowDermatologistReferral,
            false
          ),
        },
        premium: {
          dailyAnalysisLimit: toNumber(parsed.subscriptionRules?.premium?.dailyAnalysisLimit, 10, 0, 500),
          weeklyPlanLengthDays: toNumber(parsed.subscriptionRules?.premium?.weeklyPlanLengthDays, 30, 1, 90),
          allowPremiumReport: parseBoolean(parsed.subscriptionRules?.premium?.allowPremiumReport, true),
          allowDermatologistReferral: parseBoolean(
            parsed.subscriptionRules?.premium?.allowDermatologistReferral,
            true
          ),
        },
        updatedBy: 'legacy-migration',
      });
    }
  } catch (error) {
    logger.warn(`Beauty AI legacy data migration skipped: ${error.message}`);
  }
};

const seedTipsIfMissing = async () => {
  if (dbUnavailable()) {
    return;
  }

  const tipCount = await BeautyTip.countDocuments();
  if (tipCount > 0) {
    return;
  }

  await BeautyTip.insertMany(
    DEFAULT_TIPS.map((tip) => ({
      ...tip,
      createdBy: 'system-seed',
    }))
  );
};

const getSubscriptionRules = async () => {
  if (dbUnavailable()) {
    return DEFAULT_SUBSCRIPTION_RULES;
  }

  let rulesDoc = await BeautySubscriptionRule.findOne({ key: 'default' }).lean();
  if (!rulesDoc) {
    rulesDoc = (
      await BeautySubscriptionRule.create({
        key: 'default',
        ...DEFAULT_SUBSCRIPTION_RULES,
        updatedBy: 'system-seed',
      })
    ).toObject();
  }

  return {
    free: {
      dailyAnalysisLimit: Number(rulesDoc.free?.dailyAnalysisLimit || 0),
      weeklyPlanLengthDays: Number(rulesDoc.free?.weeklyPlanLengthDays || 0),
      allowPremiumReport: Boolean(rulesDoc.free?.allowPremiumReport),
      allowDermatologistReferral: Boolean(rulesDoc.free?.allowDermatologistReferral),
    },
    premium: {
      dailyAnalysisLimit: Number(rulesDoc.premium?.dailyAnalysisLimit || 0),
      weeklyPlanLengthDays: Number(rulesDoc.premium?.weeklyPlanLengthDays || 0),
      allowPremiumReport: Boolean(rulesDoc.premium?.allowPremiumReport),
      allowDermatologistReferral: Boolean(rulesDoc.premium?.allowDermatologistReferral),
    },
  };
};

const handleRouteError = (res, error, message, statusCode = 500) => {
  logger.error(`Beauty AI route failed: ${message} :: ${error.message}`);
  return res.status(statusCode).json({
    success: false,
    message,
    requestId: res.locals?.requestId || '',
  });
};

const ensureValidPlanId = (res, rawId = '') => {
  if (!mongoose.Types.ObjectId.isValid(rawId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid plan id.',
      requestId: res.locals?.requestId || '',
    });
    return false;
  }
  return true;
};

router.use((req, res, next) => {
  const requestId = normalizeText(req.headers['x-request-id'], 100) || `beauty-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

router.get('/tips/today', authenticate, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }

    await seedTipsIfMissing();

    const queryValidation = validate(JoiSchemas.tipQuery, req.query || {});
    if (!queryValidation.ok) {
      return res.status(400).json({
        success: false,
        errors: queryValidation.errors,
      });
    }

    const language = queryValidation.value.language;
    const category = queryValidation.value.category;
    const timezone = normalizeText(queryValidation.value.timezone || QUOTA_TIMEZONE, 80) || QUOTA_TIMEZONE;
    const dateKey = getDateKeyForTimezone(timezone);
    const userId = resolveUserId(req) || 'anonymous';

    const filter = { status: 'published' };
    if (category) {
      filter.category = category;
    }

    const tips = await BeautyTip.find(filter).sort({ createdAt: -1 }).lean();

    if (tips.length > 0) {
      const preferred = tips.filter((tip) => normalizeLower(tip.language, 8) === language);
      const fallbackEnglish = tips.filter((tip) => normalizeLower(tip.language, 8) === 'en');
      const selected = preferred.length ? preferred : fallbackEnglish.length ? fallbackEnglish : tips;
      const stableIndex = buildStableTipIndex({
        total: selected.length,
        dateKey,
        language,
        userId,
      });
      const todayTip = selected[stableIndex] || null;

      return res.json({
        success: true,
        language,
        category: category || 'all',
        timezone,
        dateKey,
        todayTip,
        tips: selected.slice(0, 20),
      });
    }

    return res.json({
      success: true,
      language,
      category: category || 'all',
      timezone,
      dateKey,
      todayTip: null,
      tips: [],
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch beauty tips.');
  }
});

router.post('/selfies/upload', authenticate, selfieUploadLimiter, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        requestId: res.locals?.requestId || '',
      });
    }

    try {
      await runSelfieUpload(req, res);
    } catch (error) {
      const isMulterError = error instanceof multer.MulterError;
      const statusCode = isMulterError ? 400 : 415;
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Selfie image must be under 8MB.'
          : error.message || 'Invalid selfie upload payload.';

      await recordOpsEvent({
        userId,
        requestId: res.locals?.requestId || '',
        eventType: 'upload_failure',
        severity: 'warning',
        endpoint: req.originalUrl,
        message,
        metadata: { isMulterError: Boolean(isMulterError), code: error.code || '' },
      });

      return res.status(statusCode).json({
        success: false,
        message,
        requestId: res.locals?.requestId || '',
      });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Selfie image file is required (form field name: selfie).',
        requestId: res.locals?.requestId || '',
      });
    }

    const sanitizedImage = await sanitizeSelfieBuffer(req.file.buffer);
    const storageKey = createStorageKey(userId, sanitizedImage.outputExtension);
    const uploadResult = await s3Storage.uploadToS3(sanitizedImage.buffer, storageKey, {
      contentType: sanitizedImage.outputMimeType,
      metadata: {
        module: 'beauty-ai',
        kind: 'selfie',
        userId,
      },
    });

    const publicUrl = buildPublicUploadUrl(req, uploadResult);
    if (!publicUrl) {
      await recordOpsEvent({
        userId,
        requestId: res.locals?.requestId || '',
        eventType: 'upload_failure',
        severity: 'critical',
        endpoint: req.originalUrl,
        message: 'Upload succeeded but no public URL was generated.',
      });

      return res.status(500).json({
        success: false,
        message: 'Selfie upload failed to produce a public URL.',
        requestId: res.locals?.requestId || '',
      });
    }

    await recordOpsEvent({
      userId,
      requestId: res.locals?.requestId || '',
      eventType: 'upload_success',
      severity: 'info',
      endpoint: req.originalUrl,
      message: 'Selfie uploaded successfully.',
      metadata: {
        mimeType: sanitizedImage.outputMimeType,
        originalMimeType: normalizeLower(req.file.mimetype, 40),
        originalSizeBytes: Number(req.file.size || 0),
        storedSizeBytes: Number(sanitizedImage.buffer.length || 0),
        originalWidth: sanitizedImage.originalWidth,
        originalHeight: sanitizedImage.originalHeight,
      },
    });

    const selfieRecord = await BeautySelfie.create({
      userId,
      photoUrl: publicUrl,
      photoStorageKey: normalizeStorageKey(uploadResult.s3Key || ''),
      photoStorageProvider: normalizeText(uploadResult.storage || 's3', 32) || 's3',
      photoName: normalizeText(req.file?.originalname || '', 180),
      status: 'active',
    });

    return res.status(201).json({
      success: true,
      data: {
        selfieId: String(selfieRecord._id || ''),
        photoUrl: publicUrl,
        photoStorageKey: normalizeStorageKey(uploadResult.s3Key || ''),
        photoStorageProvider: normalizeText(uploadResult.storage || 's3', 32) || 's3',
        contentType: sanitizedImage.outputMimeType,
        sizeBytes: Number(sanitizedImage.buffer.length || 0),
      },
      apiVersion: BEAUTY_API_VERSION,
      modelVersion: BEAUTY_MODEL_VERSION,
      requestId: res.locals?.requestId || '',
    });
  } catch (error) {
    await recordOpsEvent({
      userId: resolveUserId(req),
      requestId: res.locals?.requestId || '',
      eventType: 'upload_failure',
      severity: 'critical',
      endpoint: req.originalUrl,
      message: error.message || 'Selfie upload failed unexpectedly.',
    });
    return handleRouteError(res, error, 'Failed to upload selfie.');
  }
});

router.post('/selfies/delete', authenticate, planStorageLimiter, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        requestId: res.locals?.requestId || '',
      });
    }

    const validation = validate(JoiSchemas.deleteSelfie, req.body || {});
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
        requestId: res.locals?.requestId || '',
      });
    }

    const payload = validation.value;
    if (!payload.selfieId && !payload.photoStorageKey && !payload.photoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Provide selfieId or photoStorageKey or photoUrl to delete.',
        requestId: res.locals?.requestId || '',
      });
    }

    let selfieDoc = null;
    if (payload.selfieId && mongoose.Types.ObjectId.isValid(payload.selfieId)) {
      selfieDoc = await BeautySelfie.findOne({ _id: payload.selfieId, userId, status: 'active' });
    }

    const storageKey =
      normalizeStorageKey(payload.photoStorageKey) ||
      normalizeStorageKey(selfieDoc?.photoStorageKey || '') ||
      extractStorageKeyFromPhotoUrl(payload.photoUrl) ||
      extractStorageKeyFromPhotoUrl(selfieDoc?.photoUrl || '');

    let storageDeleted = false;
    if (storageKey || payload.photoUrl || selfieDoc?.photoUrl) {
      storageDeleted = await deleteStoredSelfie({
        storageKey,
        photoUrl: payload.photoUrl || selfieDoc?.photoUrl || '',
        userId,
        requestId: res.locals?.requestId || '',
        endpoint: req.originalUrl,
      });
    }

    let dbUpdated = false;
    if (selfieDoc) {
      selfieDoc.status = 'deleted';
      selfieDoc.deletedAt = new Date();
      await selfieDoc.save();
      dbUpdated = true;
    } else if (payload.selfieId) {
      const updated = await BeautySelfie.findOneAndUpdate(
        { _id: payload.selfieId, userId },
        { status: 'deleted', deletedAt: new Date() },
        { new: true }
      ).lean();
      dbUpdated = Boolean(updated);
    }

    return res.json({
      success: true,
      deletion: {
        storageDeleted,
        dbUpdated,
        storageKey: normalizeText(storageKey, 500),
      },
      apiVersion: BEAUTY_API_VERSION,
      modelVersion: BEAUTY_MODEL_VERSION,
      requestId: res.locals?.requestId || '',
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to delete selfie.');
  }
});

router.post('/analyze-selfie', authenticate, analysisLimiter, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }

    const isMultipart = Boolean(req.is('multipart/form-data'));
    const declaredContentLength = Number(req.headers['content-length'] || 0);
    const multipartSafetyBudget = MAX_SELFIE_UPLOAD_BYTES + 1024 * 1024;
    if (isMultipart && Number.isFinite(declaredContentLength) && declaredContentLength > multipartSafetyBudget) {
      return res.status(413).json({
        success: false,
        message: 'Selfie payload is too large.',
        requestId: res.locals?.requestId || '',
      });
    }

    let validation = null;
    if (!isMultipart) {
      validation = validate(JoiSchemas.analyzeSelfie, req.body || {});
      if (!validation.ok) {
        return res.status(400).json({
          success: false,
          errors: validation.errors,
        });
      }
    }

    if (isMultipart) {
      try {
        await runSelfieUpload(req, res);
      } catch (error) {
        const isMulterError = error instanceof multer.MulterError;
        const statusCode = isMulterError ? 400 : 415;
        const message =
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Selfie image must be under 8MB.'
            : error.message || 'Invalid selfie payload.';
        return res.status(statusCode).json({
          success: false,
          message,
          requestId: res.locals?.requestId || '',
        });
      }

      validation = validate(JoiSchemas.analyzeSelfie, req.body || {});
      if (!validation.ok) {
        return res.status(400).json({
          success: false,
          errors: validation.errors,
        });
      }
    }

    const {
      knownSkinType,
      concern,
      eventMode,
      eventType,
      language,
      hairType,
      preference,
      safety,
      ageRange,
      selfieConsent,
      budget,
      selfieSignals: inputSelfieSignals,
    } = validation.value;

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        requestId: res.locals?.requestId || '',
      });
    }

    if (!selfieConsent) {
      await recordConsentAudit({
        userId,
        requestId: res.locals?.requestId || '',
        action: 'selfie_analysis',
        consentGiven: false,
        endpoint: req.originalUrl,
        reason: 'Consent checkbox is required before selfie analysis.',
        req,
      });
      await recordOpsEvent({
        userId,
        requestId: res.locals?.requestId || '',
        eventType: 'consent_rejected',
        severity: 'warning',
        endpoint: req.originalUrl,
        message: 'Selfie analysis blocked due to missing consent.',
      });
      return res.status(400).json({
        success: false,
        message: 'Consent is required before selfie analysis.',
        requestId: res.locals?.requestId || '',
      });
    }

    await recordConsentAudit({
      userId,
      requestId: res.locals?.requestId || '',
      action: 'selfie_analysis',
      consentGiven: true,
      endpoint: req.originalUrl,
      reason: 'Selfie analysis consent accepted.',
      req,
      metadata: {
        concern: normalizeText(concern, 60),
        eventMode: normalizeText(eventMode, 40),
      },
    });

    const rules = await getSubscriptionRules();
    const tier = resolveUserTier(req);
    const quotaRule = resolveQuotaRuleByTier(rules, tier);
    const featureFlags = buildFeatureFlags({ tier, quotaRule });
    const quota = await enforceDailyQuota({
      userId,
      tier,
      quotaField: 'analyzeSelfie',
      limit: Number(quotaRule.dailyAnalysisLimit || 0),
    });
    if (!quota.allowed) {
      logger.warn(
        `Beauty AI quota blocked analyze-selfie user=${userId} tier=${tier} used=${quota.currentCount} limit=${quota.limit} requestId=${res.locals?.requestId || ''}`
      );
      await recordOpsEvent({
        userId,
        requestId: res.locals?.requestId || '',
        eventType: 'quota_block',
        severity: 'warning',
        endpoint: req.originalUrl,
        message: 'Selfie analysis quota limit reached.',
        metadata: {
          tier,
          used: quota.currentCount,
          limit: quota.limit,
          dateKey: quota.dateKey,
        },
      });
      return res.status(429).json({
        success: false,
        message: 'Daily analysis limit reached for your plan. Please try again tomorrow or upgrade.',
        quota: {
          tier,
          used: quota.currentCount,
          limit: quota.limit,
          remaining: quota.remaining,
          dateKey: quota.dateKey,
          nextAllowedAt: quota.nextAllowedAt,
          timezone: quota.timezone,
          nextDateKey: quota.nextDateKey,
        },
        featureFlags,
        apiVersion: BEAUTY_API_VERSION,
        modelVersion: BEAUTY_MODEL_VERSION,
        requestId: res.locals?.requestId || '',
      });
    }

    const hasUploadedSelfie = Boolean(req.file?.buffer);
    const hasProvidedSignals = Boolean(inputSelfieSignals && typeof inputSelfieSignals === 'object');
    if (hasUploadedSelfie && hasProvidedSignals) {
      return res.status(400).json({
        success: false,
        message: 'Provide either a selfie upload or selfieSignals, not both.',
        requestId: res.locals?.requestId || '',
      });
    }

    const detectedSkinType = detectSkinType(knownSkinType, concern);
    const effectiveEventType = resolveEffectiveEventType(eventType, eventMode);
    const detectedConcerns = concernList(concern, effectiveEventType);
    const selectedSafety = safety || {};

    let selfieSignals = normalizeSelfieSignals({});
    let derivedFromSelfie = false;
    if (hasUploadedSelfie) {
      const sanitizedImage = await sanitizeSelfieBuffer(req.file.buffer);
      selfieSignals = await deriveSelfieSignalsFromBuffer(sanitizedImage.buffer);
      derivedFromSelfie = true;
    } else if (hasProvidedSignals) {
      selfieSignals = normalizeSelfieSignals(inputSelfieSignals);
    }

    const signalScore = scoreFromSignals(selfieSignals);
    const concernPenalty = Math.min(20, detectedConcerns.length * 4);
    const agePenalty = String(ageRange || '').includes('41') ? 4 : 0;
    const skinScore = Math.max(45, Math.round((signalScore + (72 - concernPenalty - agePenalty)) / 2));

    const severity = severityFromConcernText([concern, ...detectedConcerns]);
    const disclaimerBundle = buildDisclaimerBundle({ safety: selectedSafety, concernSeverity: severity });
    const generatedPlan = generateStructuredBeautyPlan({
      skinType: detectedSkinType,
      hairType: normalizeText(hairType || 'normal', 40),
      selectedConcerns: detectedConcerns,
      budget,
      language,
      eventType: effectiveEventType,
      safety: selectedSafety,
      signals: selfieSignals,
    });

    const severeConcern = severity === 'severe';

    return res.json({
      success: true,
      analysis: {
        skinType: detectedSkinType,
        skinScore,
        concernsDetected: detectedConcerns,
        productsPreview: pickProducts(budget),
        severeConcernDetected: severeConcern,
        concernSeverity: severity,
        disclaimerBundle,
        selfieSignals,
        warning: severeConcern
          ? 'Possible severe concern detected. Please consult a dermatologist.'
          : '',
        dataPolicy: {
          selfieStored: false,
          note: 'Selfie image is processed for guidance and not stored by this endpoint.',
        },
      },
      plan: {
        ...generatedPlan,
        summary:
          generatedPlan.summary ||
          (language === 'ml'
            ? 'à´‡à´¤àµ à´ªàµŠà´¤àµà´µà´¾à´¯ guidance à´†à´£àµ.'
            : 'Guidance generated from selfie signals and concern profile.'),
      },
      featureFlags,
      quota: {
        tier,
        used: quota.currentCount,
        limit: quota.limit,
        remaining: quota.remaining,
        dateKey: quota.dateKey,
        nextAllowedAt: quota.nextAllowedAt,
        timezone: quota.timezone,
        nextDateKey: quota.nextDateKey,
      },
      meta: {
        source: derivedFromSelfie ? 'selfie-upload' : 'guided-input',
        derivedFromSelfie,
      },
      apiVersion: BEAUTY_API_VERSION,
      modelVersion: BEAUTY_MODEL_VERSION,
      requestId: res.locals?.requestId || '',
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to analyze selfie.');
  }
});

// Legacy preview route removed. Use POST /plan for authenticated beauty plan creation with consent, validation, and quota enforcement.

router.post('/plan', authenticate, planGenerationLimiter, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }

    const validation = validate(JoiSchemas.plan, req.body || {});
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const payload = validation.value;
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        requestId: res.locals?.requestId || '',
      });
    }

    if (!payload.consent) {
      await recordConsentAudit({
        userId,
        requestId: res.locals?.requestId || '',
        action: 'plan_generation',
        consentGiven: false,
        endpoint: req.originalUrl,
        reason: 'Plan generation consent was not provided.',
        req,
      });
      await recordOpsEvent({
        userId,
        requestId: res.locals?.requestId || '',
        eventType: 'consent_rejected',
        severity: 'warning',
        endpoint: req.originalUrl,
        message: 'Beauty plan generation blocked due to missing consent.',
      });
      return res.status(400).json({
        success: false,
        message: 'Consent is required before plan generation.',
        requestId: res.locals?.requestId || '',
      });
    }

    const helperValidation = validateBeautyPayload(payload);
    if (!helperValidation.ok) {
      return res.status(400).json({
        success: false,
        errors: helperValidation.errors,
      });
    }

    await recordConsentAudit({
      userId,
      requestId: res.locals?.requestId || '',
      action: 'plan_generation',
      consentGiven: true,
      endpoint: req.originalUrl,
      reason: 'Plan generation consent accepted.',
      req,
      metadata: {
        concern: normalizeText(payload.concern, 60),
        eventType: normalizeText(payload.eventType, 40),
        language: normalizeText(payload.language, 8),
      },
    });

    const rules = await getSubscriptionRules();
    const tier = resolveUserTier(req);
    const quotaRule = resolveQuotaRuleByTier(rules, tier);
    const featureFlags = buildFeatureFlags({ tier, quotaRule });
    const quota = await enforceDailyQuota({
      userId,
      tier,
      quotaField: 'plan',
      limit: Number(quotaRule.dailyAnalysisLimit || 0),
    });
    if (!quota.allowed) {
      logger.warn(
        `Beauty AI quota blocked plan user=${userId} tier=${tier} used=${quota.currentCount} limit=${quota.limit} requestId=${res.locals?.requestId || ''}`
      );
      await recordOpsEvent({
        userId,
        requestId: res.locals?.requestId || '',
        eventType: 'quota_block',
        severity: 'warning',
        endpoint: req.originalUrl,
        message: 'Beauty plan quota limit reached.',
        metadata: {
          tier,
          used: quota.currentCount,
          limit: quota.limit,
          dateKey: quota.dateKey,
        },
      });
      return res.status(429).json({
        success: false,
        message: 'Daily plan generation limit reached for your plan. Please try again tomorrow or upgrade.',
        quota: {
          tier,
          used: quota.currentCount,
          limit: quota.limit,
          remaining: quota.remaining,
          dateKey: quota.dateKey,
          nextAllowedAt: quota.nextAllowedAt,
          timezone: quota.timezone,
          nextDateKey: quota.nextDateKey,
        },
        featureFlags,
        apiVersion: BEAUTY_API_VERSION,
        modelVersion: BEAUTY_MODEL_VERSION,
        requestId: res.locals?.requestId || '',
      });
    }

    const safety = payload.safety || {};
    const warnings = buildSafetyWarnings(safety);
    const signals = normalizeSelfieSignals(payload.selfieSignals || {});
    const score = scoreFromSignals(signals);

    const selectedConcerns = normalizeArray(payload.selectedConcerns || [], 80, 20);
    const concern = normalizeText(payload.concern || selectedConcerns[0] || 'General care', 120);
    const eventType = normalizeText(payload.eventType || 'daily-glow', 40);
    const skinType = detectSkinType(payload.skinType, concern);
    const hairType = normalizeText(payload.hairType || 'normal', 40);
    const routines = buildRoutines({
      concern,
      preference: payload.preference || 'balanced',
    });
    const products = pickProducts(normalizeLower(payload.budget || 'medium', 20));
    const structuredPlan = generateStructuredBeautyPlan({
      skinType,
      hairType,
      selectedConcerns,
      budget: payload.budget,
      language: payload.language,
      eventType,
      safety,
      signals,
    });
    const concernSeverity = structuredPlan.concernSeverity || severityFromConcernText([concern, ...selectedConcerns]);
    const disclaimerBundle = buildDisclaimerBundle({ safety, concernSeverity });

    return res.json({
      success: true,
      prompt: buildBeautyPrompt(payload),
      analysis: {
        skinType,
        skinScore: score,
        concern,
        selfieSignals: signals,
        severeConcernDetected:
          concern.toLowerCase().includes('infection') ||
          concern.toLowerCase().includes('burn') ||
          concern.toLowerCase().includes('allergy'),
        concernSeverity,
        disclaimerBundle,
      },
      plan: {
        title: payload.language === 'ml' ? 'സുരക്ഷിത ബ്യൂട്ടി പ്ലാൻ' : 'Safe Beauty Plan',
        score,
        summary:
          payload.language === 'ml'
            ? 'ഇത് പൊതുവായ skincare guidance ആണ്. ഗുരുതര പ്രശ്നങ്ങൾക്ക് ഡെർമറ്റോളജിസ്റ്റിനെ സമീപിക്കുക.'
            : 'This is general skincare guidance. Consult a dermatologist for severe concerns.',
        morning: structuredPlan.morning.length ? structuredPlan.morning : routines.morningRoutine,
        night: structuredPlan.night.length ? structuredPlan.night : routines.nightRoutine,
        hair: structuredPlan.hair,
        avoid: [
          'Do not use steroid creams without dermatologist advice.',
          'Avoid bleaching creams and unknown fairness products.',
          ...warnings.map((item) => `Safety: ${item}`),
        ],
        products: structuredPlan.products.length ? structuredPlan.products : products,
        eventPlan: structuredPlan.eventPlan.length ? structuredPlan.eventPlan : eventPlanAddons(eventType),
        concernSeverity,
        disclaimer: structuredPlan.disclaimer || disclaimerBundle.combined,
        disclaimerBundle,
        apiVersion: BEAUTY_API_VERSION,
        modelVersion: BEAUTY_MODEL_VERSION,
      },
      warnings,
      bookingHooks: {
        salonModule: 'localservices',
        productModule: 'localmarket',
      },
      featureFlags,
      quota: {
        tier,
        used: quota.currentCount,
        limit: quota.limit,
        remaining: quota.remaining,
        dateKey: quota.dateKey,
        nextAllowedAt: quota.nextAllowedAt,
        timezone: quota.timezone,
        nextDateKey: quota.nextDateKey,
      },
      apiVersion: BEAUTY_API_VERSION,
      modelVersion: BEAUTY_MODEL_VERSION,
      requestId: res.locals?.requestId || '',
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to generate safety-first beauty plan.');
  }
});

router.get('/products/recommendations', authenticate, async (req, res) => {
  const budget = normalizeLower(req.query.budget || 'medium', 20);
  const concern = normalizeText(req.query.concern || 'General care', 120);
  const tier = budget === 'low' || budget === 'high' ? budget : 'medium';

  return res.json({
    success: true,
    budget: tier,
    concern,
    products: pickProducts(tier),
  });
});

router.post('/plans', authenticate, planStorageLimiter, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        requestId: res.locals?.requestId || '',
      });
    }

    const validation = validate(JoiSchemas.createPlan, req.body || {});
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const payload = validation.value;

    let photoUrl = '';
    let photoStorageKey = '';
    let photoStorageProvider = '';
    if (payload.photoUrl) {
      try {
        photoUrl = normalizeSafePhotoUrl(req, payload.photoUrl, { isProduction });
        photoStorageKey = normalizeStorageKey(payload.photoStorageKey) || extractStorageKeyFromPhotoUrl(photoUrl);
        photoStorageProvider = normalizeText(payload.photoStorageProvider || (photoStorageKey ? 's3' : ''), 32);
      } catch (error) {
        await recordOpsEvent({
          userId,
          requestId: res.locals?.requestId || '',
          eventType: 'validation_error',
          severity: 'warning',
          endpoint: req.originalUrl,
          message: error.message,
          metadata: { field: 'photoUrl' },
        });
        return res.status(400).json({
          success: false,
          message: error.message,
          requestId: res.locals?.requestId || '',
        });
      }
    }

    const generatedPlan =
      payload.plan && typeof payload.plan === 'object'
        ? {
            title: normalizeText(payload.plan.title, 120),
            score: toNumber(payload.plan.score, 0, 0, 100),
            morning: normalizeArray(payload.plan.morning || [], 180, 30),
            night: normalizeArray(payload.plan.night || [], 180, 30),
            hair: normalizeArray(payload.plan.hair || [], 180, 30),
            products: normalizeArray(payload.plan.products || [], 180, 40),
            avoid: normalizeArray(payload.plan.avoid || [], 180, 40),
            eventPlan: normalizeArray(payload.plan.eventPlan || [], 180, 40),
            concernSeverity: normalizeLower(payload.plan.concernSeverity || 'mild', 20),
            disclaimer: normalizeArray(payload.plan.disclaimer || [], 260, 20),
            apiVersion: normalizeText(payload.plan.apiVersion || BEAUTY_API_VERSION, 40),
            modelVersion: normalizeText(payload.plan.modelVersion || BEAUTY_MODEL_VERSION, 60),
          }
        : generateStructuredBeautyPlan({
            skinType: payload.skinType,
            hairType: payload.hairType,
            selectedConcerns: payload.selectedConcerns,
            budget: payload.budget,
            language: payload.language,
            eventType: payload.eventType,
            safety: payload.safety,
            signals: payload.selfieSignals,
          });

    const savedPlan = await BeautyPlan.create({
      userId,
      gender: normalizeText(payload.gender, 24),
      age: Number.isFinite(Number(payload.age)) ? Number(payload.age) : undefined,
      skinType: normalizeText(payload.skinType, 40),
      hairType: normalizeText(payload.hairType, 40),
      budget: normalizeText(payload.budget, 20),
      language: normalizeLower(payload.language || 'en', 8),
      selectedConcerns: normalizeArray(payload.selectedConcerns, 80, 20),
      primaryConcern: normalizeText(payload.primaryConcern || payload.selectedConcerns?.[0] || '', 120),
      eventType: normalizeText(payload.eventType, 40),
      notes: normalizeText(payload.notes, 800),
      photoUrl,
      photoStorageKey,
      photoStorageProvider,
      photoName: normalizeText(payload.photoName, 180),
      plan: generatedPlan,
      status: 'Active',
    });

    await recordOpsEvent({
      userId,
      requestId: res.locals?.requestId || '',
      eventType: 'plan_saved',
      severity: 'info',
      endpoint: req.originalUrl,
      message: 'Beauty plan saved successfully.',
      metadata: {
        planId: String(savedPlan._id || ''),
        hasPhotoUrl: Boolean(photoUrl),
        hasPhotoStorageKey: Boolean(photoStorageKey),
        selectedConcernCount: Array.isArray(savedPlan.selectedConcerns) ? savedPlan.selectedConcerns.length : 0,
      },
    });

    return res.status(201).json({
      success: true,
      data: savedPlan,
      message: 'Beauty plan created',
      apiVersion: BEAUTY_API_VERSION,
      modelVersion: BEAUTY_MODEL_VERSION,
      requestId: res.locals?.requestId || '',
    });
  } catch (error) {
    return handleRouteError(res, error, 'Unable to create beauty plan');
  }
});

router.get('/plans/my', authenticate, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const plans = await BeautyPlan.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json({
      success: true,
      data: plans,
      apiVersion: BEAUTY_API_VERSION,
      modelVersion: BEAUTY_MODEL_VERSION,
    });
  } catch (error) {
    return handleRouteError(res, error, 'Unable to load beauty plans');
  }
});

router.get('/plans/:id', authenticate, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }
    if (!ensureValidPlanId(res, req.params.id)) {
      return;
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        requestId: res.locals?.requestId || '',
      });
    }

    const plan = await BeautyPlan.findOne({ _id: req.params.id, userId }).lean();
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
        requestId: res.locals?.requestId || '',
      });
    }

    return res.json({
      success: true,
      data: plan,
      apiVersion: BEAUTY_API_VERSION,
      modelVersion: BEAUTY_MODEL_VERSION,
      requestId: res.locals?.requestId || '',
    });
  } catch (error) {
    return handleRouteError(res, error, 'Unable to load beauty plan');
  }
});

router.put('/plans/:id', authenticate, planStorageLimiter, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }
    if (!ensureValidPlanId(res, req.params.id)) {
      return;
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        requestId: res.locals?.requestId || '',
      });
    }

    const validation = validate(JoiSchemas.updatePlan, req.body || {});
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
        requestId: res.locals?.requestId || '',
      });
    }

    const payload = validation.value;
    const updates = {};
    if (payload.selectedConcerns !== undefined) {
      updates.selectedConcerns = normalizeArray(payload.selectedConcerns, 80, 20);
    }
    if (payload.primaryConcern !== undefined) {
      updates.primaryConcern = normalizeText(payload.primaryConcern, 120);
    }
    if (payload.notes !== undefined) {
      updates.notes = normalizeText(payload.notes, 800);
    }
    if (payload.status !== undefined) {
      updates.status = payload.status;
    }

    const updated = await BeautyPlan.findOneAndUpdate({ _id: req.params.id, userId }, updates, {
      new: true,
    }).lean();
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
        requestId: res.locals?.requestId || '',
      });
    }

    return res.json({
      success: true,
      data: updated,
      message: 'Beauty plan updated',
      apiVersion: BEAUTY_API_VERSION,
      modelVersion: BEAUTY_MODEL_VERSION,
      requestId: res.locals?.requestId || '',
    });
  } catch (error) {
    return handleRouteError(res, error, 'Unable to update beauty plan');
  }
});

router.post('/plans/:id/duplicate', authenticate, planStorageLimiter, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }
    if (!ensureValidPlanId(res, req.params.id)) {
      return;
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        requestId: res.locals?.requestId || '',
      });
    }

    const existing = await BeautyPlan.findOne({ _id: req.params.id, userId }).lean();
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
        requestId: res.locals?.requestId || '',
      });
    }

    const duplicated = await BeautyPlan.create({
      userId,
      gender: normalizeText(existing.gender, 24),
      age: Number.isFinite(Number(existing.age)) ? Number(existing.age) : undefined,
      skinType: normalizeText(existing.skinType, 40),
      hairType: normalizeText(existing.hairType, 40),
      budget: normalizeText(existing.budget, 20),
      language: normalizeLower(existing.language || 'en', 8),
      selectedConcerns: normalizeArray(existing.selectedConcerns, 80, 20),
      primaryConcern: normalizeText(existing.primaryConcern || existing.selectedConcerns?.[0] || '', 120),
      eventType: normalizeText(existing.eventType, 40),
      notes: normalizeText(existing.notes, 800),
      photoUrl: normalizeText(existing.photoUrl, 2000),
      photoStorageKey: normalizeText(existing.photoStorageKey, 500),
      photoStorageProvider: normalizeText(existing.photoStorageProvider, 32),
      photoName: normalizeText(existing.photoName, 180),
      plan: {
        ...(existing.plan || {}),
        title: normalizeText(existing?.plan?.title || 'Duplicated Beauty Plan', 120),
        apiVersion: normalizeText(existing?.plan?.apiVersion || BEAUTY_API_VERSION, 40),
        modelVersion: normalizeText(existing?.plan?.modelVersion || BEAUTY_MODEL_VERSION, 60),
      },
      status: 'Active',
    });

    await recordOpsEvent({
      userId,
      requestId: res.locals?.requestId || '',
      eventType: 'plan_saved',
      severity: 'info',
      endpoint: req.originalUrl,
      message: 'Beauty plan duplicated successfully.',
      metadata: {
        sourcePlanId: String(existing._id || ''),
        duplicatedPlanId: String(duplicated._id || ''),
      },
    });

    return res.status(201).json({
      success: true,
      data: duplicated,
      message: 'Beauty plan duplicated',
      apiVersion: BEAUTY_API_VERSION,
      modelVersion: BEAUTY_MODEL_VERSION,
      requestId: res.locals?.requestId || '',
    });
  } catch (error) {
    return handleRouteError(res, error, 'Unable to duplicate beauty plan');
  }
});

router.put('/plans/:id/photo', authenticate, planStorageLimiter, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }
    if (!ensureValidPlanId(res, req.params.id)) {
      return;
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        requestId: res.locals?.requestId || '',
      });
    }

    const existingPlan = await BeautyPlan.findOne({ _id: req.params.id, userId }).lean();
    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
        requestId: res.locals?.requestId || '',
      });
    }

    try {
      await runSelfieUpload(req, res);
    } catch (error) {
      const isMulterError = error instanceof multer.MulterError;
      const statusCode = isMulterError ? 400 : 415;
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Selfie image must be under 8MB.'
          : error.message || 'Invalid selfie upload payload.';
      return res.status(statusCode).json({
        success: false,
        message,
        requestId: res.locals?.requestId || '',
      });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Selfie image file is required (form field name: selfie).',
        requestId: res.locals?.requestId || '',
      });
    }

    const sanitizedImage = await sanitizeSelfieBuffer(req.file.buffer);
    const storageKey = createStorageKey(userId, sanitizedImage.outputExtension);
    const uploadResult = await s3Storage.uploadToS3(sanitizedImage.buffer, storageKey, {
      contentType: sanitizedImage.outputMimeType,
      metadata: {
        module: 'beauty-ai',
        kind: 'plan-selfie',
        userId,
      },
    });
    const publicUrl = buildPublicUploadUrl(req, uploadResult);
    if (!publicUrl) {
      return res.status(500).json({
        success: false,
        message: 'Updated selfie upload did not produce a public URL.',
        requestId: res.locals?.requestId || '',
      });
    }

    const storageDeleteStatus = await deleteStoredSelfie({
      storageKey: existingPlan.photoStorageKey,
      photoUrl: existingPlan.photoUrl,
      userId,
      requestId: res.locals?.requestId || '',
      endpoint: req.originalUrl,
    });

    const updatedPlan = await BeautyPlan.findOneAndUpdate(
      { _id: req.params.id, userId },
      {
        photoUrl: publicUrl,
        photoStorageKey: normalizeStorageKey(uploadResult.s3Key || ''),
        photoStorageProvider: normalizeText(uploadResult.storage || 's3', 32) || 's3',
        photoName: normalizeText(req.file?.originalname || '', 180),
      },
      { new: true }
    ).lean();

    if (!updatedPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
        requestId: res.locals?.requestId || '',
      });
    }

    return res.json({
      success: true,
      data: updatedPlan,
      deletion: {
        previousPhotoDeleteSuccess: storageDeleteStatus,
      },
      message: 'Plan selfie replaced successfully.',
      apiVersion: BEAUTY_API_VERSION,
      modelVersion: BEAUTY_MODEL_VERSION,
      requestId: res.locals?.requestId || '',
    });
  } catch (error) {
    return handleRouteError(res, error, 'Unable to replace plan selfie');
  }
});

router.put('/plans/:id/archive', authenticate, planStorageLimiter, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }
    if (!ensureValidPlanId(res, req.params.id)) {
      return;
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const plan = await BeautyPlan.findOneAndUpdate(
      { _id: req.params.id, userId },
      { status: 'Archived' },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    return res.json({
      success: true,
      data: plan,
      message: 'Beauty plan archived',
      apiVersion: BEAUTY_API_VERSION,
      modelVersion: BEAUTY_MODEL_VERSION,
      requestId: res.locals?.requestId || '',
    });
  } catch (error) {
    return handleRouteError(res, error, 'Unable to archive beauty plan');
  }
});

router.delete('/plans/:id/photo', authenticate, planStorageLimiter, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }
    if (!ensureValidPlanId(res, req.params.id)) {
      return;
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const existing = await BeautyPlan.findOne({ _id: req.params.id, userId }).lean();
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const storageDeleteStatus = await deleteStoredSelfie({
      storageKey: existing.photoStorageKey,
      photoUrl: existing.photoUrl,
      userId,
      requestId: res.locals?.requestId || '',
      endpoint: req.originalUrl,
    });

    const updated = await BeautyPlan.findOneAndUpdate(
      { _id: req.params.id, userId },
      { photoUrl: '', photoName: '', photoStorageKey: '', photoStorageProvider: '' },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    return res.json({
      success: true,
      data: updated,
      deletion: {
        previousPhotoDeleteSuccess: storageDeleteStatus,
      },
      message: 'Saved selfie was removed from this plan.',
      apiVersion: BEAUTY_API_VERSION,
      modelVersion: BEAUTY_MODEL_VERSION,
      requestId: res.locals?.requestId || '',
    });
  } catch (error) {
    return handleRouteError(res, error, 'Unable to remove plan selfie');
  }
});

router.delete('/plans/:id', authenticate, planStorageLimiter, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }
    if (!ensureValidPlanId(res, req.params.id)) {
      return;
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const deleted = await BeautyPlan.findOneAndDelete({ _id: req.params.id, userId }).lean();
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const storageDeleteStatus = await deleteStoredSelfie({
      storageKey: deleted.photoStorageKey,
      photoUrl: deleted.photoUrl,
      userId,
      requestId: res.locals?.requestId || '',
      endpoint: req.originalUrl,
    });

    return res.json({
      success: true,
      deletion: {
        selfieDeleteSuccess: storageDeleteStatus,
      },
      message: 'Beauty plan deleted permanently.',
      apiVersion: BEAUTY_API_VERSION,
      modelVersion: BEAUTY_MODEL_VERSION,
      requestId: res.locals?.requestId || '',
    });
  } catch (error) {
    return handleRouteError(res, error, 'Unable to delete beauty plan');
  }
});

router.post('/progress-log', authenticate, progressLimiter, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const validation = validate(JoiSchemas.progress, req.body || {});
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const payload = validation.value;
    const entry = await BeautyProgressLog.findOneAndUpdate(
      { userId, day: payload.day },
      {
        done: parseBoolean(payload.done, false),
        note: normalizeText(payload.note, 600),
        skinScore: toNumber(payload.skinScore, 0, 0, 100),
        selfieSnapshotLabel: normalizeText(payload.selfieSnapshotLabel, 120),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return res.status(201).json({
      success: true,
      entry,
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to save progress log.');
  }
});

router.get('/progress-log/mine', authenticate, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const logs = await BeautyProgressLog.find({ userId }).sort({ day: 1 }).lean();
    const completedCount = logs.filter((item) => item.done).length;

    return res.json({
      success: true,
      logs,
      summary: {
        completedCount,
        totalLoggedDays: logs.length,
      },
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to fetch progress logs.');
  }
});

router.delete('/progress-log/mine', authenticate, progressLimiter, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    await BeautyProgressLog.deleteMany({ userId });
    return res.json({
      success: true,
      message: 'Progress history removed successfully.',
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to clear progress logs.');
  }
});

router.post('/admin/tip-library', authenticate, verifyAdmin, adminLimiter, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }

    const validation = validate(JoiSchemas.addTip, req.body || {});
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const payload = validation.value;

    const tip = await BeautyTip.create({
      title: normalizeText(payload.title, 140),
      text: normalizeText(payload.text, 1000),
      category: normalizeLower(payload.category || 'general', 64),
      language: normalizeLower(payload.language || 'en', 8),
      status: 'published',
      createdBy: normalizeLower(req.user?.email || req.user?.id || 'admin', 120),
    });

    return res.status(201).json({
      success: true,
      tip,
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to add tip.');
  }
});

router.get('/admin/alerts', authenticate, verifyAdmin, adminLimiter, async (_req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }

    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [ops24hRows, ops7dRows, consent24h, consent7d] = await Promise.all([
      BeautyOpsEvent.aggregate([
        { $match: { createdAt: { $gte: since24h } } },
        { $group: { _id: { eventType: '$eventType', severity: '$severity' }, count: { $sum: 1 } } },
      ]),
      BeautyOpsEvent.aggregate([
        { $match: { createdAt: { $gte: since7d } } },
        { $group: { _id: { eventType: '$eventType', severity: '$severity' }, count: { $sum: 1 } } },
      ]),
      BeautyConsentAudit.aggregate([
        { $match: { createdAt: { $gte: since24h } } },
        { $group: { _id: '$consentGiven', count: { $sum: 1 } } },
      ]),
      BeautyConsentAudit.aggregate([
        { $match: { createdAt: { $gte: since7d } } },
        { $group: { _id: '$consentGiven', count: { $sum: 1 } } },
      ]),
    ]);

    const ops24h = toOpsCounterMap(ops24hRows);
    const ops7d = toOpsCounterMap(ops7dRows);
    const consent24hMap = new Map(consent24h.map((row) => [String(Boolean(row._id)), Number(row.count || 0)]));
    const consent7dMap = new Map(consent7d.map((row) => [String(Boolean(row._id)), Number(row.count || 0)]));

    const uploadFailures24h =
      getOpsCount(ops24h, 'upload_failure', 'warning') +
      getOpsCount(ops24h, 'upload_failure', 'critical');
    const quotaBlocks24h = getOpsCount(ops24h, 'quota_block', 'warning');
    const consentRejected24h = Number(consent24hMap.get('false') || 0);
    const consentAccepted24h = Number(consent24hMap.get('true') || 0);

    const uploadFailures7d =
      getOpsCount(ops7d, 'upload_failure', 'warning') +
      getOpsCount(ops7d, 'upload_failure', 'critical');
    const quotaBlocks7d = getOpsCount(ops7d, 'quota_block', 'warning');
    const consentRejected7d = Number(consent7dMap.get('false') || 0);
    const consentAccepted7d = Number(consent7dMap.get('true') || 0);

    return res.json({
      success: true,
      generatedAt: now.toISOString(),
      range: {
        last24Hours: since24h.toISOString(),
        last7Days: since7d.toISOString(),
      },
      alerts: [
        {
          key: 'upload_failures',
          label: 'Selfie upload failures',
          count24h: uploadFailures24h,
          count7d: uploadFailures7d,
          severity24h: severityFromCount(uploadFailures24h, 2, 6),
        },
        {
          key: 'quota_blocks',
          label: 'Quota block spikes',
          count24h: quotaBlocks24h,
          count7d: quotaBlocks7d,
          severity24h: severityFromCount(quotaBlocks24h, 4, 12),
        },
        {
          key: 'consent_rejections',
          label: 'Consent rejections',
          count24h: consentRejected24h,
          count7d: consentRejected7d,
          severity24h: severityFromCount(consentRejected24h, 5, 20),
        },
      ],
      consent: {
        accepted24h: consentAccepted24h,
        rejected24h: consentRejected24h,
        accepted7d: consentAccepted7d,
        rejected7d: consentRejected7d,
      },
      requestId: res.locals?.requestId || '',
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to load Beauty AI alerts.');
  }
});

router.put('/admin/subscription-rules', authenticate, verifyAdmin, adminLimiter, async (req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }

    const validation = validate(JoiSchemas.subscriptionRules, req.body || {});
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const payload = validation.value;
    const updated = await BeautySubscriptionRule.findOneAndUpdate(
      { key: 'default' },
      {
        free: payload.free,
        premium: payload.premium,
        updatedBy: normalizeLower(req.user?.email || req.user?.id || 'admin', 120),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return res.json({
      success: true,
      subscriptionRules: {
        free: updated.free,
        premium: updated.premium,
      },
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to update subscription rules.');
  }
});

router.get('/admin/subscription-rules', authenticate, verifyAdmin, async (_req, res) => {
  try {
    if (!ensureDbReady(res)) {
      return;
    }

    const rules = await getSubscriptionRules();

    return res.json({
      success: true,
      subscriptionRules: rules,
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to load subscription rules.');
  }
});

// Best-effort, idempotent persistence initializer.
// Uses MongoDB upserts inside migrate/seed functions, so it can safely run on multiple instances.
// This module-level guard only prevents duplicate work within the same process.
let initializerAttached = false;
const initializeBeautyAiPersistence = async () => {
  if (dbUnavailable()) {
    return;
  }
  try {
    await migrateLegacyJsonIfNeeded();
    await seedTipsIfMissing();
    await getSubscriptionRules();
  } catch (error) {
    logger.warn(`Beauty AI persistence initializer failed: ${error.message}`);
  }
};

if (!initializerAttached) {
  initializerAttached = true;
  if (!dbUnavailable()) {
    void initializeBeautyAiPersistence();
  } else {
    mongoose.connection.once('connected', () => {
      void initializeBeautyAiPersistence();
    });
  }
}

module.exports = router;
