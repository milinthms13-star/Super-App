const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const Joi = require('joi');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { authenticate, hasAdminPrivileges } = require('../middleware/auth');
const {
  createListingLimiter,
  messageLimiter,
  reportLimiter,
  searchLimiter,
} = require('../middleware/classifiedsRateLimiter');
const devAppDataStore = require('../utils/devAppDataStore');
const {
  useMongoClassifieds,
  listClassifiedModuleData,
  createClassifiedAd,
  updateClassifiedAd,
  addClassifiedMessage,
  addClassifiedReport,
  addClassifiedReview,
  moderateClassifiedAd,
  deleteClassifiedAd,
  findClassifiedAdById,
  incrementClassifiedView,
  searchClassifieds,
} = require('../utils/classifiedStore');
const {
  listRealEstateProperties,
  serializeRealEstateProperty,
  useMongoRealEstate,
  createRealEstateProperty,
  updateRealEstateProperty,
  addRealEstateLead,
  addRealEstateMessage,
  addRealEstateReview,
  addRealEstateReport,
  moderateRealEstateProperty,
  deleteRealEstateProperty,
  findRealEstatePropertyById,
} = require('../utils/realEstateStore');
const { listRestaurants } = require('../utils/restaurantStore');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const EducationState = require('../models/EducationState');
const EducationEnrollment = require('../models/EducationEnrollment');
const EducationScholarshipApplication = require('../models/EducationScholarshipApplication');
const EducationCommunityMembership = require('../models/EducationCommunityMembership');
const EducationTuitionRequest = require('../models/EducationTuitionRequest');
const EducationLearningEvent = require('../models/EducationLearningEvent');
const PlatformSetting = require('../models/PlatformSetting');
const CheckoutService = require('../services/CheckoutService');
const devAuthStore = require('../utils/devAuthStore');
const { deleteGridFSFile, uploadBufferToGridFS } = require('../utils/gridfs');
const { ADMIN_EMAIL } = require('../config/constants');
const { validatePhone } = require('../utils/validators');
const { sendEmailViaGmail, hasGmailDeliveryConfig } = require('../config/gmail');
const logger = require('../config/logger');
const SkillCertificate = require('../models/SkillCertificate');
const SkillTestResult = require('../models/SkillTestResult');
const {
  COURSE_CATEGORIES,
  COURSE_CATALOG,
  getSkillLearningCourses,
  getCourseById,
  getSkillRecommendations,
  getQuestionBank,
  GOVT_PORTALS,
} = require('../data/skillLearningData');
const {
  EDUCATION_SCHOLARSHIPS,
  EDUCATION_GOVERNMENT_SCHEMES,
  EDUCATION_CANVA_TEMPLATES,
  EDUCATION_CANVA_CAMPAIGN_SIZES,
} = require('../data/educationData');
const {
  validateCertificateUploadPayload,
  buildSkillWalletShareText,
} = require('../utils/skillDevelopmentBackendHelpers');
const {
  calculateClassifiedRiskScore,
  sanitizeClassifiedContact,
  buildClassifiedLeadPriority,
} = require('../utils/classifiedsBackendUpgradeHelpers');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const isTestEnv = process.env.NODE_ENV === 'test';
const EDUCATION_COLD_CACHE_SECONDS = Math.max(
  30,
  Number(process.env.EDUCATION_COLD_CACHE_SECONDS || 300)
);
const EDUCATION_PRIVATE_CACHE_SECONDS = Math.max(
  15,
  Number(process.env.EDUCATION_PRIVATE_CACHE_SECONDS || 60)
);
const EDUCATION_IDEMPOTENCY_TTL_MS = Math.max(
  30000,
  Number(process.env.EDUCATION_IDEMPOTENCY_TTL_MS || 10 * 60 * 1000)
);
const EDUCATION_OVERVIEW_CACHE_TTL_MS = Math.max(
  10000,
  Number(process.env.EDUCATION_OVERVIEW_CACHE_TTL_MS || 45 * 1000)
);
const ENABLE_EDUCATION_360 =
  String(process.env.EDUCATION_360_ENABLED || 'true').trim().toLowerCase() !== 'false';
const educationIdempotencyLocks = new Map();
const educationIdempotencyResponses = new Map();
const educationOverviewCache = new Map();

const educationWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTestEnv ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many education write requests. Please retry shortly.',
  },
});

const setEducationCacheHeaders = (res, policy = 'hot_private') => {
  if (!res || typeof res.setHeader !== 'function') {
    return;
  }
  if (policy === 'cold_public') {
    res.setHeader(
      'Cache-Control',
      `public, max-age=${EDUCATION_COLD_CACHE_SECONDS}, s-maxage=${EDUCATION_COLD_CACHE_SECONDS}, stale-while-revalidate=60`
    );
    return;
  }
  if (policy === 'cold_private') {
    res.setHeader(
      'Cache-Control',
      `private, max-age=${EDUCATION_PRIVATE_CACHE_SECONDS}, stale-while-revalidate=30`
    );
    return;
  }
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
};

const withEducationTelemetry = (routeId, handler) => async (req, res, next) => {
  const startedAtMs = Date.now();
  if (res && typeof res.setHeader === 'function') {
    res.setHeader('x-edu-route', routeId);
  }
  try {
    await handler(req, res, next);
  } finally {
    const durationMs = Date.now() - startedAtMs;
    logger.info('education route telemetry', {
      routeId,
      method: req.method,
      statusCode: res.statusCode,
      durationMs,
      user: normalizeEmailAddress(req.user?.email || req.user?.id || req.user?._id),
    });
  }
};

const getEducationIdempotencyKey = (req, scope = '') => {
  const rawKey = String(
    req.headers['x-idempotency-key'] || req.headers['idempotency-key'] || req.body?.idempotencyKey || ''
  )
    .trim()
    .slice(0, 180);
  if (!rawKey) {
    return '';
  }
  const user = normalizeEmailAddress(req.user?.email || req.user?.id || req.user?._id || 'guest');
  return `${scope}:${user}:${rawKey}`;
};

const purgeExpiredEducationIdempotencyEntries = () => {
  const now = Date.now();
  for (const [key, entry] of educationIdempotencyResponses.entries()) {
    if (!entry || entry.expiresAt <= now) {
      educationIdempotencyResponses.delete(key);
    }
  }
};

const withEducationIdempotency = async (req, scope, execute) => {
  purgeExpiredEducationIdempotencyEntries();
  const lockKey = getEducationIdempotencyKey(req, scope);
  if (!lockKey) {
    return execute({ replay: null });
  }

  const replay = educationIdempotencyResponses.get(lockKey);
  if (replay && replay.expiresAt > Date.now()) {
    return execute({ replay: replay.response, replayed: true });
  }

  if (educationIdempotencyLocks.has(lockKey)) {
    return {
      idempotencyConflict: true,
    };
  }

  educationIdempotencyLocks.set(lockKey, Date.now());
  try {
    const result = await execute({ replay: null, replayed: false });
    if (result && !result.idempotencyConflict && !result.skipCache) {
      educationIdempotencyResponses.set(lockKey, {
        response: result,
        expiresAt: Date.now() + EDUCATION_IDEMPOTENCY_TTL_MS,
      });
    }
    return result;
  } finally {
    educationIdempotencyLocks.delete(lockKey);
  }
};

const ensureUploadsFolder = (subfolder) => {
  const folderPath = path.join(__dirname, '../uploads', subfolder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  return folderPath;
};

const buildSkillRecordId = (prefix) => `${prefix}-${crypto.randomUUID()}`;

// Module ID normalization mapping (matches frontend moduleRoutes.js)
const MODULE_ID_ALIASES = {
  quicklink: "quicklinks",
  "quick-links": "quicklinks",
  mydiary: "diary",
  personaldiary: "diary",
  map: "maps",
  loans: "finance",
  financehub: "finance",
  freelancers: "freelancer",
  worklink: "freelancer",
  nilaworks: "freelancer",
  proconnect: "freelancer",
  skillhub: "skilllearning",
  skills: "skilllearning",
  learning: "skilllearning",
  skillearning: "skilllearning",
  careerhub: "skilllearning",
  utility: "billpay",
  utilities: "billpay",
  bbps: "billpay",
  billpayment: "billpay",
  utilityhub: "billpay",
  hyperlocaldelivery: "hyperlocal",
  "hyperlocal-delivery": "hyperlocal",
  deliveryhub: "hyperlocal",
  instamart: "hyperlocal",
  dunzo: "hyperlocal",
  templebooking: "devadarshan",
  eventbooking: "devadarshan",
  hallbooking: "devadarshan",
  vazhipadu: "devadarshan",
  poojalink: "devadarshan",
  blessinghub: "devadarshan",
  devotionalecosystem: "devadarshan",
  "devotional-ecosystem": "devadarshan",
  localservice: "localservices",
  localmarket: "hyperlocal",
  "local-market": "hyperlocal",
  "photo-studio-ai-ar": "photostudio",
  photostudioaiar: "photostudio",
  photostudio: "photostudio",
  aiarstudio: "photostudio",
  "remote-karaoke-duet": "karaokeduet",
  karaokeduet: "karaokeduet",
  karaoke: "karaokeduet",
  duet: "karaokeduet",
  "dance-duet": "danceduet",
  "ai-dance-duet": "danceduet",
  danceduet: "danceduet",
  voicefriend: "voicefriend",
  "voice-friend": "voicefriend",
  "ai-voice-friend": "voicefriend",
  "nila-beauty-ai": "beautyai",
  "nila-beauty": "beautyai",
  beautyai: "beautyai",
  beauty: "beautyai",
  glowmate: "beautyai",
  "smart-kitchen-recipe-hub": "kitchen",
  smartkitchen: "kitchen",
  kitchen: "kitchen",
  recipes: "kitchen",
  "recipe-hub": "kitchen",
  "ai-business-os": "aibusinessos",
  businessos: "aibusinessos",
  "ai-business-operating-system": "aibusinessos",
  gulfjobsmigration: "gulfservices",
  gulfjobmigration: "gulfservices",
  "gulf-job-migration": "gulfservices",
  "kerala-gulf-jobs-migration": "gulfservices",
  gulfjobs: "gulfservices",
  migration: "gulfservices",
  nilakids: "kidsstoryvideomaker",
  "nila-kids": "kidsstoryvideomaker",
  kidsstory: "kidsstoryvideomaker",
  "kids-video": "kidsstoryvideomaker",
  "kids-story-video-maker": "kidsstoryvideomaker",
  kidsstoryvideomaker: "kidsstoryvideomaker",
  "gulf-services": "gulfservices",
  gulfservice: "gulfservices",
  "nila-ai-hub": "nilaaihub",
  nilaai: "nilaaihub",
  aiassistant: "nilaaihub",
  ai: "nilaaihub",
  nilahub: "nilaaihub",
  tourismmarketplace: "tourism",
  tourismhub: "tourism",
  travel: "tourism",
  travelhub: "tourism",
  nilatravel: "tourism",
  localservicesmarket: "localservices",
  eventservice: "localservices",
  caterers: "localservices",
  decorators: "localservices",
  photographers: "localservices",
  "business-builder": "businessbuilder",
};

const normalizeModuleId = (moduleId = "") => {
  const normalizedId = String(moduleId || "").trim().toLowerCase();
  return MODULE_ID_ALIASES[normalizedId] || normalizedId;
};

const normalizeEnabledModules = (moduleIds = []) => {
  if (!Array.isArray(moduleIds)) {
    return [];
  }
  // Deduplicate and normalize all module IDs
  return Array.from(
    new Set(
      moduleIds
        .map((moduleId) => normalizeModuleId(moduleId))
        .filter(Boolean)
    )
  );
};

const MODULE_BRANDING_MANAGED_IDS = normalizeEnabledModules([
  'ecommerce',
  'messaging',
  'classifieds',
  'realestate',
  'socialmedia',
  'matrimonial',
  'localservices',
  'hyperlocal',
  'tourism',
  'hotelbooking',
  'bustrainbooking',
  'ridesharing',
  'gulfservices',
  'businessbuilder',
  'businessservices',
  'freelancer',
  'resumebuilder',
  'photostudio',
  'karaokeduet',
  'danceduet',
  'voicefriend',
  'liveplaceexplorer',
  'beautyai',
  'kitchen',
  'jobportal',
  'skilllearning',
  'education',
  'nilaaihub',
  'kidsstoryvideomaker',
  'finance',
  'billpay',
  'fooddelivery',
  'healthcare',
  'reminderalert',
  'sosalert',
  'devadarshan',
  'astrology',
  'quicklinks',
  'diary',
]);

const toDefaultModuleLabel = (moduleId = '') => {
  const normalizedId = String(moduleId || '').trim().toLowerCase();
  const combinedWords = normalizedId
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return combinedWords.join(' ');
};

const normalizeModuleBranding = (moduleBranding = {}) =>
  MODULE_BRANDING_MANAGED_IDS.reduce((accumulator, moduleId) => {
    const raw = moduleBranding && typeof moduleBranding === 'object' ? moduleBranding[moduleId] : {};
    const name = String(raw?.name || '').trim();
    const logoUrl = String(raw?.logoUrl || '').trim();

    accumulator[moduleId] = {
      id: moduleId,
      name: name || toDefaultModuleLabel(moduleId),
      logoUrl: logoUrl || '',
    };
    return accumulator;
  }, {});

const PLATFORM_SETTINGS_KEY = 'global';

const getPersistedEnabledModules = async (fallbackModules = []) => {
  const normalizedFallbackModules = normalizeEnabledModules(fallbackModules);

  try {
    const platformSettings = await PlatformSetting.findOne({ key: PLATFORM_SETTINGS_KEY }).lean();
    if (!platformSettings || !Array.isArray(platformSettings.enabledModules)) {
      return normalizedFallbackModules;
    }

    return normalizeEnabledModules(platformSettings.enabledModules);
  } catch (error) {
    return normalizedFallbackModules;
  }
};

const persistEnabledModules = async (moduleIds = []) => {
  const normalizedModules = normalizeEnabledModules(moduleIds);

  try {
    await PlatformSetting.findOneAndUpdate(
      { key: PLATFORM_SETTINGS_KEY },
      {
        $set: {
          enabledModules: normalizedModules,
        },
        $setOnInsert: {
          key: PLATFORM_SETTINGS_KEY,
        },
      },
      {
        upsert: true,
      }
    );
  } catch (error) {
    logger.warn('Failed to persist enabled modules in MongoDB. Falling back to file data.', {
      error: error.message,
    });
  }

  return normalizedModules;
};

// Fetch registered accounts from MongoDB instead of app-data.json
const getRegisteredAccountsFromDB = async () => {
  try {
    const users = await User.find(
      {
        $or: [
          { registrationType: { $in: ['user', 'entrepreneur', 'business', 'admin'] } },
          { role: 'admin' },
          { roles: 'admin' },
        ],
      },
      {
        email: 1,
        name: 1,
        role: 1,
        registrationType: 1,
        roles: 1,
        businessName: 1,
        phone: 1,
        location: 1,
        selectedBusinessCategories: 1,
      }
    ).lean();

    return users.map(user => ({
      email: user.email,
      name: user.name || '',
      role: user.role || '',
      registrationType: user.registrationType || '',
      roles: user.roles || [user.role || 'user'],
      businessName: user.businessName || '',
      phone: user.phone || '',
      location: user.location || '',
      selectedBusinessCategories: user.selectedBusinessCategories || [],
    }));
  } catch (error) {
    console.error('Error fetching registered accounts from DB:', error);
    return [];
  }
};

const applicationSchema = Joi.object({
  applicantName: Joi.string().trim().required(),
  businessName: Joi.string().allow('').trim().default(''),
  email: Joi.string().email().required().lowercase().trim(),
  registrationType: Joi.string().trim().required(),
  phone: Joi.string().allow('').trim().default(''),
  location: Joi.string().allow('').trim().default(''),
  selectedBusinessCategories: Joi.array().items(Joi.object()).default([]),
  registrationFee: Joi.number().min(0).default(0),
  monthlyFee: Joi.number().min(0).default(0),
  transactionFee: Joi.string().allow('').trim().default(''),
  planId: Joi.string().allow('').trim().default(''),
  planName: Joi.string().allow('').trim().default(''),
  licenseNumber: Joi.string().allow('').trim().default(''),
  identityType: Joi.string().allow('').trim().default(''),
  identityNumber: Joi.string().allow('').trim().default(''),
  profilePhotoName: Joi.string().allow('').trim().default(''),
  profilePhotoFileId: Joi.string().allow('').trim().default(''),
  profilePhotoUrl: Joi.string().allow('').trim().default(''),
  licenseDocumentName: Joi.string().allow('').trim().default(''),
  licenseDocumentFileId: Joi.string().allow('').trim().default(''),
  licenseDocumentUrl: Joi.string().allow('').trim().default(''),
  identityDocumentName: Joi.string().allow('').trim().default(''),
  identityDocumentFileId: Joi.string().allow('').trim().default(''),
  identityDocumentUrl: Joi.string().allow('').trim().default(''),
  foodLicenseNumber: Joi.string().allow('').trim().default(''),
  foodLicenseAuthority: Joi.string().allow('').trim().default(''),
  foodLicenseDocumentName: Joi.string().allow('').trim().default(''),
  foodLicenseDocumentFileId: Joi.string().allow('').trim().default(''),
  foodLicenseDocumentUrl: Joi.string().allow('').trim().default(''),
  foodLicenseRequired: Joi.boolean().default(false),
  status: Joi.string().allow('').trim().default('Pending Review'),
});

const globeMartCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required(),
  theme: Joi.string().allow('').trim().max(80).default(''),
  accentColor: Joi.string().allow('').trim().pattern(/^#?[0-9a-fA-F]{6}$/).default(''),
  subcategories: Joi.array().items(Joi.string().trim().min(2).max(60)).default([]),
});

const globeMartSubcategorySchema = Joi.object({
  subcategory: Joi.string().trim().min(2).max(60).required(),
});

const moduleBrandingSchema = Joi.object({
  name: Joi.string().allow('').trim().max(80).optional(),
  logoUrl: Joi.string().allow('').trim().max(3000000).optional(),
});

const classifiedsMediaItemSchema = Joi.alternatives().try(
  Joi.string().allow('').trim(),
  Joi.object({
    id: Joi.string().allow('').trim().default(''),
    url: Joi.string().allow('').trim().required(),
    fileId: Joi.string().allow('').trim().default(''),
    type: Joi.string().valid('image', 'video').default('image'),
    order: Joi.number().integer().min(0).default(0),
    uploadedAt: Joi.date().iso().optional(),
  })
);

const classifiedsListingSchema = Joi.object({
  listingType: Joi.string().valid('sell', 'buy').default('sell'),
  title: Joi.string().trim().min(3).max(140).required(),
  description: Joi.string().trim().min(10).max(1500).required(),
  price: Joi.number().min(1).required(),
  category: Joi.string().trim().min(2).max(60).required(),
  location: Joi.string().trim().min(2).max(120).required(),
  contactPhone: Joi.string().allow('').trim().max(15).default(''),
  whatsappNumber: Joi.string().allow('').trim().max(15).default(''),
  condition: Joi.string().valid('New', 'Like New', 'Used').default('Used'),
  mediaCount: Joi.number().integer().min(0).max(12).default(1),
  mediaGallery: Joi.array().items(classifiedsMediaItemSchema).max(12).default([]),
  plan: Joi.string().valid('free', 'featured', 'urgent', 'subscription').default('free'),
});

const classifiedsListingUpdateSchema = classifiedsListingSchema
  .fork(
    ['title', 'description', 'price', 'category', 'location'],
    (schema) => schema.optional()
  )
  .min(1);

const classifiedsMessageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(1000).required(),
});

const classifiedsReportSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(300).required(),
});

const classifiedsReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().min(3).max(500).required(),
});

const classifiedsModerationSchema = Joi.object({
  action: Joi.string().valid('approve', 'flag', 'reject', 'return_to_review').required(),
  reason: Joi.string().allow('').trim().max(300).default(''),
});

const classifiedsBanSellerSchema = Joi.object({
  sellerEmail: Joi.string().trim().email().required(),
  sellerName: Joi.string().allow('').trim().max(120).default(''),
  reason: Joi.string().allow('').trim().max(300).default(''),
});

const classifiedsRenewalSchema = Joi.object({
  durationDays: Joi.number().integer().min(1).max(365).default(30),
  autoRenew: Joi.boolean().optional(),
});

const classifiedsSavedSearchSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  filters: Joi.object({
    searchText: Joi.string().allow('').trim().default(''),
    categoryFilter: Joi.array().items(Joi.string().trim().min(1)).default([]),
    locationFilter: Joi.array().items(Joi.string().trim().min(1)).default([]),
    conditionFilter: Joi.array().items(Joi.string().trim().min(1)).default([]),
    priceFilter: Joi.array()
      .items(Joi.string().valid('Under 10k', '10k - 50k', '50k - 1L', '1L+'))
      .default([]),
    sortBy: Joi.string()
      .valid('featured', 'latest', 'price-low', 'price-high', 'popular')
      .default('featured'),
  }).default(),
  notificationsEnabled: Joi.boolean().default(true),
});

const realEstateMediaItemSchema = Joi.object({
  id: Joi.string().allow('').trim().default(''),
  type: Joi.string().valid('image', 'video', 'floor-plan', 'brochure', 'map').default('image'),
  label: Joi.string().allow('').trim().max(120).default(''),
  url: Joi.string().uri().allow('').trim().default(''),
  thumbnailUrl: Joi.string().uri().allow('').trim().default(''),
  order: Joi.number().integer().min(0).default(0),
});

const realEstateListingSchema = Joi.object({
  postingType: Joi.string().valid('property', 'requirement').default('property'),
  title: Joi.string().trim().min(3).max(140).required(),
  intent: Joi.string().valid('sale', 'rent', 'project').default('sale'),
  priceLabel: Joi.string().trim().min(2).max(80).required(),
  location: Joi.string().trim().min(2).max(120).required(),
  locality: Joi.string().allow('').trim().max(120).default(''),
  type: Joi.string().trim().min(2).max(60).required(),
  bedrooms: Joi.number().integer().min(0).max(20).default(0),
  bathrooms: Joi.number().integer().min(0).max(20).default(0),
  furnishing: Joi.string().trim().max(60).default('Semi Furnished'),
  areaSqft: Joi.number().min(100).max(100000).required(),
  description: Joi.string().allow('').trim().max(2000).default(''),
  possession: Joi.string().allow('').trim().max(120).default(''),
  amenities: Joi.array().items(Joi.string().trim().min(2).max(80)).max(20).default([]),
  featured: Joi.boolean().default(false),
  mediaCount: Joi.number().integer().min(0).max(50).default(0),
  hasVideoTour: Joi.boolean().default(false),
  mediaGallery: Joi.array().items(realEstateMediaItemSchema).max(40).default([]),
  videoTourUrl: Joi.string().uri().allow('').trim().max(2000).default(''),
  floorPlanUrl: Joi.string().uri().allow('').trim().max(2000).default(''),
  brochureUrl: Joi.string().uri().allow('').trim().max(2000).default(''),
  mapPreviewUrl: Joi.string().uri().allow('').trim().max(2000).default(''),
  mapLocationLat: Joi.number().min(-90).max(90).allow(null).default(null),
  mapLocationLng: Joi.number().min(-180).max(180).allow(null).default(null),
  carpetAreaSqft: Joi.number().min(0).max(200000).allow(null).default(null),
  builtUpAreaSqft: Joi.number().min(0).max(200000).allow(null).default(null),
  landSizeSqft: Joi.number().min(0).max(1000000).allow(null).default(null),
  floorNumber: Joi.number().integer().min(0).max(200).allow(null).default(null),
  totalFloors: Joi.number().integer().min(0).max(200).allow(null).default(null),
  parkingSpots: Joi.number().integer().min(0).max(500).allow(null).default(null),
  propertyAgeYears: Joi.number().min(0).max(250).allow(null).default(null),
  address: Joi.string().allow('').trim().max(300).default(''),
  landmark: Joi.string().allow('').trim().max(160).default(''),
  contactPhone: Joi.string().allow('').trim().max(30).default(''),
  whatsappNumber: Joi.string().allow('').trim().max(30).default(''),
  nearbySchoolKm: Joi.number().min(0).max(100).allow(null).default(null),
  nearbyHospitalKm: Joi.number().min(0).max(100).allow(null).default(null),
  nearbyMetroKm: Joi.number().min(0).max(100).allow(null).default(null),
  readyToMove: Joi.boolean().default(false),
  underConstruction: Joi.boolean().default(false),
  reraNumber: Joi.string().allow('').trim().max(80).default(''),
  titleDeedStatus: Joi.string()
    .valid('pending', 'verified', 'rejected', 'not-applicable')
    .default('pending'),
  taxReceipt: Joi.boolean().default(false),
  buildingPermit: Joi.boolean().default(false),
  encumbranceCertificate: Joi.boolean().default(false),
  minBudget: Joi.string().allow('').trim().max(80).default(''),
  maxBudget: Joi.string().allow('').trim().max(80).default(''),
  preferredLocations: Joi.string().allow('').trim().max(300).default(''),
  mustHaveAmenities: Joi.string().allow('').trim().max(300).default(''),
  moveInDate: Joi.string().allow('').trim().max(50).default(''),
  status: Joi.string().valid('available', 'sold', 'rented').default('available'),
  roleMode: Joi.string().valid('owner', 'agent', 'builder').default('owner'),
});

const realEstateListingUpdateSchema = realEstateListingSchema
  .fork(
    ['title', 'priceLabel', 'location', 'type', 'areaSqft'],
    (schema) => schema.optional()
  )
  .min(1);

const realEstateEnquirySchema = Joi.object({
  message: Joi.string().allow('').trim().max(1000).default(''),
  channel: Joi.string().valid('Enquiry', 'Call', 'Chat').default('Enquiry'),
});

const realEstateMessageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(1000).required(),
});

const realEstateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().min(3).max(500).required(),
});

const realEstateReportSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(300).required(),
});

const realEstateModerationSchema = Joi.object({
  action: Joi.string().valid('approve', 'flag', 'reject').required(),
});

const realEstateLeadUpdateSchema = Joi.object({
  status: Joi.string()
    .valid('new', 'contacted', 'site_visit', 'negotiation', 'token_paid', 'closed', 'lost')
    .optional(),
  followUpAt: Joi.date().iso().allow(null).optional(),
  followUpNote: Joi.string().allow('').trim().max(300).optional(),
  assignedTo: Joi.string().allow('').trim().max(120).optional(),
}).min(1);

const realEstateVisitSchema = Joi.object({
  scheduledAt: Joi.date().iso().required(),
  durationMinutes: Joi.number().integer().min(15).max(240).default(45),
  mode: Joi.string().valid('onsite', 'virtual').default('onsite'),
  note: Joi.string().allow('').trim().max(500).default(''),
  leadId: Joi.string().allow('').trim().default(''),
  buyerPhone: Joi.string().allow('').trim().default(''),
});

const realEstateVisitUpdateSchema = Joi.object({
  status: Joi.string().valid('scheduled', 'confirmed', 'completed', 'cancelled').optional(),
  scheduledAt: Joi.date().iso().optional(),
  durationMinutes: Joi.number().integer().min(15).max(240).optional(),
  reminderAt: Joi.date().iso().allow(null).optional(),
  note: Joi.string().allow('').trim().max(500).optional(),
}).min(1);

const educationStateSchema = Joi.object({
  enrolledCourseIds: Joi.array().items(Joi.string().trim().min(1)).max(200).default([]),
  appliedScholarships: Joi.array().items(Joi.string().trim().min(1)).max(200).default([]),
  joinedGroups: Joi.array().items(Joi.string().trim().min(1)).max(200).default([]),
  courseProgress: Joi.object()
    .pattern(Joi.string().trim().min(1).max(120), Joi.number().min(0).max(100))
    .default({}),
  roleProfile: Joi.object({
    primaryRole: Joi.string().valid('student', 'parent', 'tutor', 'institute_admin').default('student'),
    studentName: Joi.string().trim().allow('').max(120).default(''),
    classLevel: Joi.string().trim().allow('').max(80).default(''),
    targetExam: Joi.string().trim().allow('').max(120).default(''),
    preferredLanguage: Joi.string().trim().allow('').max(60).default('English'),
    careerGoal: Joi.string().trim().allow('').max(200).default(''),
  }).default(),
  interventionsDismissed: Joi.array().items(Joi.string().trim().min(1)).max(200).default([]),
});

const educationEnrollmentSchema = Joi.object({
  courseId: Joi.string().trim().required(),
  courseTitle: Joi.string().trim().default(''),
  amount: Joi.number().min(0).default(0),
  paymentMethod: Joi.string().trim().default('none'),
  paymentGateway: Joi.string().trim().default('none'),
});

const educationScholarshipSchema = Joi.object({
  scholarshipName: Joi.string().trim().required(),
});

const educationGroupJoinSchema = Joi.object({
  groupTitle: Joi.string().trim().required(),
});

const educationTuitionRequestSchema = Joi.object({
  subject: Joi.string().trim().required(),
  classLevel: Joi.string().trim().allow('').max(80).default(''),
  contactPhone: Joi.string().trim().allow('').max(20).default(''),
  preferredMode: Joi.string().trim().valid('online', 'offline', 'hybrid').default('online'),
  preferredTime: Joi.string().trim().allow('').max(80).default(''),
  details: Joi.string().allow('').trim().default(''),
});

const buildEducationTuitionPriority = ({
  subject = '',
  classLevel = '',
  preferredTime = '',
  contactPhone = '',
}) => {
  let score = 0;
  const normalizedSubject = String(subject || '').trim().toLowerCase();
  const normalizedClassLevel = String(classLevel || '').trim().toLowerCase();
  const normalizedPreferredTime = String(preferredTime || '').trim();
  const normalizedContactPhone = String(contactPhone || '').replace(/\D/g, '');

  if (normalizedSubject) score += 20;
  if (normalizedClassLevel) score += 20;
  if (normalizedPreferredTime) score += 20;
  if (normalizedContactPhone) score += 30;
  if (/class 10|plus two|sslc|neet|jee/.test(`${normalizedClassLevel} ${normalizedSubject}`)) {
    score += 10;
  }

  if (score >= 80) return 'hot';
  if (score >= 50) return 'warm';
  return 'normal';
};

const buildEducationTutorMatches = ({
  subject = '',
  classLevel = '',
  preferredMode = 'online',
}) => {
  const base = [
    {
      tutorId: 'tutor-anita-mathews',
      name: 'Anita Mathews',
      subjects: ['Mathematics', 'Science'],
      classLevels: ['Class 8', 'Class 9', 'Class 10'],
      modes: ['online', 'hybrid'],
      hourlyFee: 450,
      rating: 4.7,
    },
    {
      tutorId: 'tutor-faisal-rahman',
      name: 'Faisal Rahman',
      subjects: ['Physics', 'Chemistry', 'Biology'],
      classLevels: ['Plus One', 'Plus Two'],
      modes: ['online', 'offline'],
      hourlyFee: 600,
      rating: 4.8,
    },
    {
      tutorId: 'tutor-reshma-k',
      name: 'Reshma K',
      subjects: ['English', 'Hindi', 'Malayalam', 'Social Studies'],
      classLevels: ['Class 8', 'Class 9', 'Class 10', 'Plus One'],
      modes: ['online', 'offline', 'hybrid'],
      hourlyFee: 400,
      rating: 4.6,
    },
  ];

  const requestedSubject = String(subject || '').trim();
  const requestedClass = String(classLevel || '').trim();
  const requestedMode = String(preferredMode || '').trim().toLowerCase();

  const scored = base.map((tutor) => {
    let score = tutor.rating * 10;
    if (requestedSubject && tutor.subjects.includes(requestedSubject)) score += 25;
    if (requestedClass && tutor.classLevels.includes(requestedClass)) score += 20;
    if (requestedMode && tutor.modes.includes(requestedMode)) score += 15;
    return { ...tutor, matchScore: Math.min(100, Math.round(score)) };
  });

  return scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3)
    .map((tutor) => ({
      tutorId: tutor.tutorId,
      name: tutor.name,
      subjects: tutor.subjects,
      classLevels: tutor.classLevels,
      modes: tutor.modes,
      hourlyFee: tutor.hourlyFee,
      rating: tutor.rating,
      matchScore: tutor.matchScore,
    }));
};

const computeEducationProgressDelta = ({
  eventType = 'progress_adjustment',
  explicitDelta = null,
  quizScore = null,
  watchMinutes = 0,
}) => {
  if (explicitDelta !== null && explicitDelta !== undefined && explicitDelta !== '' && Number.isFinite(Number(explicitDelta))) {
    return Number(explicitDelta);
  }

  if (eventType === 'lesson_complete') {
    return 8;
  }
  if (eventType === 'quiz_complete') {
    const score = Number(quizScore);
    if (Number.isFinite(score) && score >= 85) return 12;
    if (Number.isFinite(score) && score >= 60) return 8;
    return 4;
  }
  if (eventType === 'watch_time') {
    const minutes = Math.max(0, Number(watchMinutes || 0));
    return Math.min(6, Math.floor(minutes / 10));
  }
  return 3;
};

const buildSkillAssessmentMetrics = ({
  questions = [],
  answers = [],
}) => {
  const normalizedQuestions = Array.isArray(questions) ? questions : [];
  const normalizedAnswers = Array.isArray(answers) ? answers : [];
  const answerLookup = normalizedAnswers.reduce((accumulator, answer) => {
    const questionId = String(answer?.id || '').trim();
    if (questionId) {
      accumulator[questionId] = answer;
    }
    return accumulator;
  }, {});

  const totalQuestions = normalizedQuestions.length;
  let correct = 0;
  let wrong = 0;
  let attempted = 0;
  const weakAreaTopics = [];

  normalizedQuestions.forEach((question) => {
    const answer = answerLookup[question.id];
    if (typeof answer?.selectedIndex !== 'number') {
      return;
    }

    attempted += 1;
    if (question.answer === answer.selectedIndex) {
      correct += 1;
      return;
    }

    wrong += 1;
    weakAreaTopics.push(question?.topic || 'general');
  });

  const negativeMarks = wrong * 0.25;
  const scoreBase = totalQuestions > 0 ? ((correct - negativeMarks) / totalQuestions) * 100 : 0;
  const score = Math.max(0, Number(scoreBase.toFixed(0)));

  return {
    totalQuestions,
    correct,
    wrong,
    attempted,
    negativeMarks,
    score,
    weakAreaTopics: [...new Set(weakAreaTopics)],
  };
};

const EDUCATION_TUITION_STATUS_TRANSITIONS = {
  submitted: ['matched', 'cancelled'],
  matched: ['trial_scheduled', 'cancelled'],
  trial_scheduled: ['trial_completed', 'cancelled'],
  trial_completed: ['booked', 'cancelled'],
  booked: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const canTransitionEducationTuitionStatus = ({
  currentStatus = '',
  nextStatus = '',
}) => {
  const from = String(currentStatus || '').trim().toLowerCase();
  const to = String(nextStatus || '').trim().toLowerCase();
  if (!from || !to) return false;
  if (from === to) return true;
  const allowedTransitions = EDUCATION_TUITION_STATUS_TRANSITIONS[from] || [];
  return allowedTransitions.includes(to);
};

const buildEducationOutcomeMetrics = ({
  state = {},
  latestTest = null,
  tuitionRequests = [],
  certificates = [],
  learningEvents = [],
}) => {
  const progressValues = Object.values(state?.courseProgress || {}).map((value) => Number(value || 0));
  const avgCourseProgress = progressValues.length
    ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
    : 0;
  const appliedScholarshipsCount = Array.isArray(state?.appliedScholarships)
    ? state.appliedScholarships.length
    : 0;
  const scholarshipConversionRate = EDUCATION_SCHOLARSHIPS.length
    ? Math.round((appliedScholarshipsCount / EDUCATION_SCHOLARSHIPS.length) * 100)
    : 0;
  const requestList = Array.isArray(tuitionRequests) ? tuitionRequests : [];
  const completedTuition = requestList.filter((item) => item?.status === 'completed').length;
  const tuitionCompletionRate = requestList.length
    ? Math.round((completedTuition / requestList.length) * 100)
    : 0;
  const certificateList = Array.isArray(certificates) ? certificates : [];
  const verifiedCertificates = certificateList.filter(
    (item) => String(item?.verificationStatus || 'uploaded') === 'verified'
  ).length;
  const certificationVerificationRate = certificateList.length
    ? Math.round((verifiedCertificates / certificateList.length) * 100)
    : 0;
  const recentEvents = (Array.isArray(learningEvents) ? learningEvents : [])
    .filter((event) => new Date(event?.createdAt || 0).getTime() >= Date.now() - 14 * 24 * 60 * 60 * 1000);
  const learningConsistencyScore = Math.max(0, Math.min(100, recentEvents.length * 8));
  const latestTestScore = Number(latestTest?.score || 0);

  const readinessScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        avgCourseProgress * 0.4 +
          latestTestScore * 0.2 +
          tuitionCompletionRate * 0.15 +
          certificationVerificationRate * 0.15 +
          learningConsistencyScore * 0.1
      )
    )
  );

  return {
    readinessScore,
    avgCourseProgress,
    latestTestScore,
    tuitionCompletionRate,
    scholarshipConversionRate,
    certificationVerificationRate,
    learningConsistencyScore,
    appliedScholarshipsCount,
    verifiedCertificates,
  };
};

const buildEducationInterventions = ({
  state = {},
  latestTest = null,
  tuitionRequests = [],
  outcomeMetrics = {},
}) => {
  const interventions = [];
  const weakAreas = Array.isArray(latestTest?.weakAreas) ? latestTest.weakAreas : [];
  const dismissed = new Set(
    (Array.isArray(state?.interventionsDismissed) ? state.interventionsDismissed : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  );

  if (Number(outcomeMetrics?.avgCourseProgress || 0) < 45) {
    interventions.push({
      id: 'low-progress',
      severity: 'high',
      title: 'Course progress is below target',
      description: 'Focus on one enrolled course daily to cross 45% progress.',
      action: 'Resume top-priority course',
    });
  }

  if (weakAreas.length) {
    interventions.push({
      id: 'weak-areas',
      severity: 'medium',
      title: 'Weak topics detected from assessments',
      description: `Review topics: ${weakAreas.join(', ')}.`,
      action: 'Start weak-area revision plan',
    });
  }

  const staleTuition = (Array.isArray(tuitionRequests) ? tuitionRequests : []).find((request) => {
    const status = String(request?.status || 'submitted');
    if (status === 'completed' || status === 'cancelled') return false;
    const createdAt = new Date(request?.createdAt || 0).getTime();
    return Number.isFinite(createdAt) && createdAt <= Date.now() - 7 * 24 * 60 * 60 * 1000;
  });
  if (staleTuition) {
    interventions.push({
      id: 'tuition-stagnation',
      severity: 'medium',
      title: 'Tuition request is stagnant',
      description: `Request ${staleTuition.requestId} has not progressed recently.`,
      action: 'Schedule next tuition session',
    });
  }

  if (Number(outcomeMetrics?.certificationVerificationRate || 0) < 60) {
    interventions.push({
      id: 'certificate-verification',
      severity: 'low',
      title: 'Certificate verification backlog',
      description: 'Get your uploaded certificates verified to improve trust score.',
      action: 'Submit certificate verification details',
    });
  }

  return interventions.filter((item) => !dismissed.has(item.id));
};

const buildEducationCanvaToolkit = ({
  roleProfile = {},
  interventions = [],
}) => {
  const primaryRole = String(roleProfile?.primaryRole || 'student');
  const language = String(roleProfile?.preferredLanguage || 'English');
  const interventionCampaigns = interventions.slice(0, 3).map((item) => ({
    campaignId: `campaign-${item.id}`,
    title: `${item.title} Campaign`,
    message: item.description,
    targetAudience: primaryRole === 'parent' ? 'Parents' : 'Learners',
  }));

  return {
    preferredLanguage: language,
    templates: EDUCATION_CANVA_TEMPLATES,
    campaignSizes: EDUCATION_CANVA_CAMPAIGN_SIZES,
    translationTargets: ['English', 'Malayalam', 'Hindi'],
    suggestedCampaigns: interventionCampaigns,
  };
};

const buildEducationOverview360Payload = async ({
  userIdentifier,
  userEmail,
}) => {
  const [state, latestTest, tuitionRequests, certificates, learningEvents] = await Promise.all([
    getUserEducationStateFromDB(userIdentifier),
    SkillTestResult.findOne({ userEmail }).sort({ createdAt: -1 }).lean(),
    EducationTuitionRequest.find({ userEmail }).sort({ createdAt: -1 }).lean(),
    SkillCertificate.find({ userEmail }).sort({ uploadedAt: -1 }).lean(),
    EducationLearningEvent.find({ userEmail }).sort({ createdAt: -1 }).limit(40).lean(),
  ]);

  const outcomeMetrics = buildEducationOutcomeMetrics({
    state,
    latestTest,
    tuitionRequests,
    certificates,
    learningEvents,
  });
  const interventions = buildEducationInterventions({
    state,
    latestTest,
    tuitionRequests,
    outcomeMetrics,
  });
  const canvaToolkit = buildEducationCanvaToolkit({
    roleProfile: state.roleProfile,
    interventions,
  });

  return {
    state,
    latestTest,
    outcomeMetrics,
    interventions,
    canvaToolkit,
  };
};

const getCachedEducationOverview360 = async ({
  userIdentifier,
  userEmail,
}) => {
  const cacheKey = normalizeEmailAddress(userEmail || userIdentifier);
  const current = educationOverviewCache.get(cacheKey);
  const now = Date.now();
  if (current && current.payload && current.expiresAt > now) {
    return {
      payload: current.payload,
      cacheState: 'hit',
    };
  }

  if (current && current.payload) {
    if (!current.refreshing) {
      const refreshPromise = buildEducationOverview360Payload({
        userIdentifier,
        userEmail,
      })
        .then((payload) => {
          educationOverviewCache.set(cacheKey, {
            payload,
            expiresAt: Date.now() + EDUCATION_OVERVIEW_CACHE_TTL_MS,
            refreshing: null,
          });
        })
        .catch((refreshError) => {
          logger.warn('education overview refresh failed', {
            cacheKey,
            error: refreshError?.message || 'unknown',
          });
          const fallback = educationOverviewCache.get(cacheKey) || {};
          educationOverviewCache.set(cacheKey, {
            ...fallback,
            refreshing: null,
            expiresAt: Date.now() + 10 * 1000,
          });
        });

      educationOverviewCache.set(cacheKey, {
        ...current,
        refreshing: refreshPromise,
      });
    }

    return {
      payload: current.payload,
      cacheState: 'stale',
    };
  }

  const payload = await buildEducationOverview360Payload({
    userIdentifier,
    userEmail,
  });
  educationOverviewCache.set(cacheKey, {
    payload,
    expiresAt: now + EDUCATION_OVERVIEW_CACHE_TTL_MS,
    refreshing: null,
  });
  return {
    payload,
    cacheState: 'miss',
  };
};

const educationPaymentConfirmSchema = Joi.object({
  paymentId: Joi.string().trim().required(),
  razorpay_order_id: Joi.string().trim().allow('').default(''),
  razorpay_payment_id: Joi.string().trim().allow('').default(''),
  razorpay_signature: Joi.string().trim().allow('').default(''),
  stripePaymentIntentId: Joi.string().trim().allow('').default(''),
});

const educationProgressEventSchema = Joi.object({
  courseId: Joi.string().trim().required(),
  lessonId: Joi.string().trim().allow('').max(140).default(''),
  eventType: Joi.string()
    .trim()
    .valid('lesson_complete', 'quiz_complete', 'watch_time', 'progress_adjustment')
    .default('progress_adjustment'),
  progressDelta: Joi.number().min(-100).max(100).optional(),
  progressValue: Joi.number().min(0).max(100).optional(),
  quizScore: Joi.number().min(0).max(100).optional(),
  watchMinutes: Joi.number().integer().min(0).max(1000).optional(),
  metadata: Joi.object().unknown(true).default({}),
});

const educationTuitionStatusUpdateSchema = Joi.object({
  status: Joi.string()
    .trim()
    .valid('submitted', 'matched', 'trial_scheduled', 'trial_completed', 'booked', 'in_progress', 'completed', 'cancelled')
    .required(),
  note: Joi.string().trim().allow('').max(400).default(''),
  tutorName: Joi.string().trim().allow('').max(120).default(''),
  tutorPhone: Joi.string().trim().allow('').max(20).default(''),
  tutorMode: Joi.string().trim().allow('').max(40).default(''),
  tutorHourlyFee: Joi.number().min(0).max(50000).default(0),
  trialSessionAt: Joi.date().iso().allow(null).default(null),
});

const educationRoleProfileSchema = Joi.object({
  primaryRole: Joi.string().valid('student', 'parent', 'tutor', 'institute_admin').required(),
  studentName: Joi.string().trim().allow('').max(120).default(''),
  classLevel: Joi.string().trim().allow('').max(80).default(''),
  targetExam: Joi.string().trim().allow('').max(120).default(''),
  preferredLanguage: Joi.string().trim().allow('').max(60).default('English'),
  careerGoal: Joi.string().trim().allow('').max(200).default(''),
});

const educationTuitionSessionCreateSchema = Joi.object({
  scheduledAt: Joi.date().iso().required(),
  durationMinutes: Joi.number().integer().min(15).max(240).default(60),
  agenda: Joi.string().trim().allow('').max(400).default(''),
});

const educationTuitionSessionUpdateSchema = Joi.object({
  attendanceStatus: Joi.string().valid('pending', 'attended', 'missed', 'rescheduled').optional(),
  homework: Joi.string().trim().allow('').max(800).optional(),
  mentorNotes: Joi.string().trim().allow('').max(800).optional(),
  agenda: Joi.string().trim().allow('').max(400).optional(),
}).min(1);

const certificateVerificationSchema = Joi.object({
  verificationStatus: Joi.string().valid('uploaded', 'verified', 'rejected').required(),
  verificationNote: Joi.string().trim().allow('').max(500).default(''),
});

const slugifyCategoryName = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeSubcategories = (subcategories = []) =>
  [...new Set((Array.isArray(subcategories) ? subcategories : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean))];

const normalizeGlobeMartCategory = (category) => {
  if (typeof category === 'string') {
    const name = category.trim();
    return {
      id: slugifyCategoryName(name),
      name,
      theme: '',
      accentColor: '',
      subcategories: [],
    };
  }

  const name = String(category?.name || category?.label || category?.id || '').trim();
  return {
    id: String(category?.id || slugifyCategoryName(name)).trim(),
    name,
    theme: String(category?.theme || '').trim(),
    accentColor: String(category?.accentColor || '')
      .trim()
      .replace(/^([0-9a-fA-F]{6})$/, '#$1'),
    subcategories: normalizeSubcategories(category?.subcategories),
  };
};

const normalizeGlobeMartCategories = (categories = []) =>
  (Array.isArray(categories) ? categories : [])
    .map(normalizeGlobeMartCategory)
    .filter((category) => category.name);

const ensureClassifiedsModuleData = (moduleData = {}) => ({
  ...moduleData,
  classifiedsListings: Array.isArray(moduleData.classifiedsListings)
    ? moduleData.classifiedsListings
    : [],
  classifiedsMessages: Array.isArray(moduleData.classifiedsMessages)
    ? moduleData.classifiedsMessages
    : [],
  classifiedsReports: Array.isArray(moduleData.classifiedsReports)
    ? moduleData.classifiedsReports
    : [],
  classifiedsBannedUsers: Array.isArray(moduleData.classifiedsBannedUsers)
    ? moduleData.classifiedsBannedUsers
    : [],
});

const buildClassifiedPlanLabel = (plan = 'free') => {
  if (plan === 'featured') {
    return 'Featured';
  }

  if (plan === 'urgent') {
    return 'Urgent';
  }

  if (plan === 'subscription') {
    return 'Seller Pro';
  }

  return 'Free';
};

const CLASSIFIED_PLAN_DURATION_DAYS = {
  free: 30,
  featured: 7,
  urgent: 3,
  subscription: 365,
};

const toIsoDateOrNull = (value) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
};

const addDaysToIsoDate = (value, days) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  parsedDate.setDate(parsedDate.getDate() + Number(days || 0));
  return parsedDate.toISOString();
};

const isPromotionWindowActive = (value, now = new Date()) => {
  if (!value) {
    return true;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return true;
  }

  return parsedDate >= now;
};

const buildClassifiedLifecycleFields = (plan = 'free', now = new Date()) => {
  const normalizedPlan = ['free', 'featured', 'urgent', 'subscription'].includes(plan)
    ? plan
    : 'free';
  const nowIso = new Date(now).toISOString();
  const expiryDate = addDaysToIsoDate(nowIso, CLASSIFIED_PLAN_DURATION_DAYS[normalizedPlan]);

  if (normalizedPlan === 'subscription') {
    return {
      expiryDate,
      autoRenew: true,
      promotionPlanExpiry: null,
      subscriptionTier: 'pro',
      subscriptionExpiryDate: expiryDate,
    };
  }

  return {
    expiryDate,
    autoRenew: false,
    promotionPlanExpiry:
      normalizedPlan === 'featured' || normalizedPlan === 'urgent' ? expiryDate : null,
    subscriptionTier: 'none',
    subscriptionExpiryDate: null,
  };
};

const buildClassifiedRenewalFields = (listing = {}, payload = {}, now = new Date()) => {
  const durationDays = Number(payload?.durationDays || 30);
  const nowDate = new Date(now);
  const currentExpiry = listing?.expiryDate ? new Date(listing.expiryDate) : null;
  const renewalBase =
    currentExpiry && !Number.isNaN(currentExpiry.getTime()) && currentExpiry > nowDate
      ? currentExpiry
      : nowDate;
  const renewalBaseIso = renewalBase.toISOString();
  const renewedExpiryDate = addDaysToIsoDate(renewalBaseIso, durationDays);
  const normalizedMonetizationPlan = String(listing?.monetizationPlan || '').trim().toLowerCase();
  const hasPromotedPlacement = Boolean(
    listing?.featured ||
      listing?.urgent ||
      normalizedMonetizationPlan === 'featured' ||
      normalizedMonetizationPlan === 'urgent'
  );
  const isSubscriptionPlan =
    normalizedMonetizationPlan === 'seller pro' ||
    String(listing?.subscriptionTier || '').trim().toLowerCase() !== 'none';

  return {
    expiryDate: renewedExpiryDate,
    autoRenew:
      typeof payload?.autoRenew === 'boolean' ? payload.autoRenew : Boolean(listing?.autoRenew),
    promotionPlanExpiry: hasPromotedPlacement ? renewedExpiryDate : null,
    subscriptionExpiryDate: isSubscriptionPlan ? renewedExpiryDate : null,
    subscriptionTier: isSubscriptionPlan
      ? String(listing?.subscriptionTier || 'pro').trim() || 'pro'
      : String(listing?.subscriptionTier || 'none').trim() || 'none',
  };
};

const normalizeClassifiedMediaGallery = (mediaGallery = []) =>
  (Array.isArray(mediaGallery) ? mediaGallery : [])
    .map((item, index) => {
      if (typeof item === 'string') {
        const url = item.trim();
        if (!url) {
          return null;
        }

        return {
          id: `classified-media-${index + 1}`,
          url,
          fileId: '',
          type: 'image',
          order: index,
          uploadedAt: new Date().toISOString(),
        };
      }

      const url = String(item?.url || '').trim();
      if (!url) {
        return null;
      }

      return {
        id: String(item?.id || `classified-media-${index + 1}`).trim(),
        url,
        fileId: String(item?.fileId || '').trim(),
        type: item?.type === 'video' ? 'video' : 'image',
        order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
        uploadedAt: item?.uploadedAt || new Date().toISOString(),
      };
    })
    .filter(Boolean);

const normalizeClassifiedsListingRecord = (listing = {}, index = 0) => ({
  id: String(listing.id || `classified-${index + 1}`),
  listingType:
    String(listing.listingType || listing.intent || '')
      .trim()
      .toLowerCase() === 'buy'
      ? 'buy'
      : 'sell',
  title: String(listing.title || 'Marketplace Listing').trim(),
  description: String(
    listing.description ||
      'Trusted local listing with seller details, direct chat, and location-first discovery.'
  ).trim(),
  price: Number(listing.price || 0),
  category: String(listing.category || 'General').trim(),
  seller: String(listing.seller || 'Trusted Seller').trim(),
  sellerRole: String(
    listing.sellerRole ||
      (String(listing.listingType || listing.intent || '').trim().toLowerCase() === 'buy'
        ? 'Buyer'
        : 'Seller')
  ).trim(),
  sellerEmail: String(listing.sellerEmail || '').trim().toLowerCase(),
  location: String(listing.location || 'Kerala').trim(),
  locality: String(listing.locality || listing.location || 'Prime area').trim(),
  image: String(listing.image || 'Listing').trim(),
  posted: String(listing.posted || new Date().toISOString().slice(0, 10)).trim(),
  condition: String(listing.condition || 'Used').trim(),
  featured:
    Boolean(listing.featured) &&
    isPromotionWindowActive(listing.promotionPlanExpiry || listing.expiryDate),
  urgent:
    Boolean(listing.urgent) &&
    isPromotionWindowActive(listing.promotionPlanExpiry || listing.expiryDate),
  verified: Boolean(listing.verified),
  views: Number(listing.views || 0),
  favorites: Number(listing.favorites || 0),
  chats: Number(listing.chats || 0),
  languageSupport:
    Array.isArray(listing.languageSupport) && listing.languageSupport.length > 0
      ? listing.languageSupport
      : ['English', 'Malayalam'],
  tags:
    Array.isArray(listing.tags) && listing.tags.length > 0
      ? listing.tags
      : [String(listing.category || 'General').trim(), String(listing.condition || 'Used').trim()],
  mapLabel: String(listing.mapLabel || `${listing.location || 'Kerala'} local discovery zone`).trim(),
  contactOptions:
    Array.isArray(listing.contactOptions) && listing.contactOptions.length > 0
      ? listing.contactOptions
      : ['Chat'],
  phone: String(listing.phone || listing.contactPhone || '').trim(),
  contactPhone: String(listing.contactPhone || listing.phone || '').trim(),
  whatsappNumber: String(listing.whatsappNumber || '').trim(),
  mediaGallery: normalizeClassifiedMediaGallery(listing.mediaGallery),
  monetizationPlan: String(
    listing.monetizationPlan ||
      buildClassifiedPlanLabel(listing.plan || (listing.featured ? 'featured' : 'free'))
  ).trim(),
  promotionPlanExpiry: toIsoDateOrNull(listing.promotionPlanExpiry),
  subscriptionTier: String(listing.subscriptionTier || 'none').trim(),
  subscriptionExpiryDate: toIsoDateOrNull(listing.subscriptionExpiryDate),
  expiryDate: toIsoDateOrNull(listing.expiryDate),
  autoRenew: Boolean(listing.autoRenew),
  reviews: Array.isArray(listing.reviews) ? listing.reviews : [],
  averageRating:
    Array.isArray(listing.reviews) && listing.reviews.length > 0
      ? Number(listing.averageRating || (
        listing.reviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0) /
        listing.reviews.length
      ))
      : Number(listing.averageRating || 0),
  totalReviews: Number(
    listing.totalReviews ||
      (Array.isArray(listing.reviews) ? listing.reviews.length : 0)
  ),
  spamScore: Number(listing.spamScore || 0),
  spamFlags: Array.isArray(listing.spamFlags) ? listing.spamFlags : [],
  riskScore: Number(listing.riskScore || 0),
  riskFlags: Array.isArray(listing.riskFlags) ? listing.riskFlags : [],
  safetyLabel: String(listing.safetyLabel || '').trim(),
  leadPriority:
    typeof listing.leadPriority === 'object' && listing.leadPriority !== null
      ? {
          level: String(listing.leadPriority.level || 'normal').trim(),
          label: String(listing.leadPriority.label || 'Normal').trim(),
          score: Number(listing.leadPriority.score || 0),
        }
      : {
          level: 'normal',
          label: 'Normal',
          score: 0,
        },
  moderationStatus: String(listing.moderationStatus || (listing.verified === false ? 'pending' : 'approved')).trim(),
  moderationNotes: String(listing.moderationNotes || '').trim(),
  moderationUpdatedAt: listing.moderationUpdatedAt
    ? String(listing.moderationUpdatedAt).trim()
    : String(listing.updatedAt || listing.createdAt || new Date().toISOString()).trim(),
  createdAt: String(listing.createdAt || new Date().toISOString()).trim(),
  updatedAt: String(listing.updatedAt || listing.createdAt || new Date().toISOString()).trim(),
});

const normalizeClassifiedBannedUserRecord = (record = {}, index = 0) => ({
  id: String(record.id || `classified-ban-${index + 1}`).trim(),
  sellerEmail: String(record.sellerEmail || record.email || '').trim().toLowerCase(),
  sellerName: String(record.sellerName || record.name || 'Seller').trim(),
  reason: String(record.reason || '').trim(),
  bannedByEmail: String(record.bannedByEmail || '').trim().toLowerCase(),
  bannedByName: String(record.bannedByName || '').trim(),
  createdAt: String(record.createdAt || new Date().toISOString()).trim(),
});

const normalizeClassifiedsModule = (moduleData = {}) => {
  const nextModuleData = ensureClassifiedsModuleData(moduleData);
  return {
    ...nextModuleData,
    classifiedsListings: nextModuleData.classifiedsListings.map(normalizeClassifiedsListingRecord),
    classifiedsMessages: nextModuleData.classifiedsMessages.map((message, index) => ({
      id: String(message.id || `classified-message-${index + 1}`),
      listingId: String(message.listingId || ''),
      from: String(message.from || 'User').trim(),
      senderEmail: String(message.senderEmail || '').trim().toLowerCase(),
      text: String(message.text || '').trim(),
      createdAt: String(message.createdAt || new Date().toISOString()).trim(),
    })),
    classifiedsReports: nextModuleData.classifiedsReports.map((report, index) => ({
      id: String(report.id || `classified-report-${index + 1}`),
      listingId: String(report.listingId || ''),
      reporterEmail: String(report.reporterEmail || '').trim().toLowerCase(),
      reporterName: String(report.reporterName || 'User').trim(),
      reason: String(report.reason || '').trim(),
      status: String(report.status || 'open').trim(),
      createdAt: String(report.createdAt || new Date().toISOString()).trim(),
    })),
    classifiedsBannedUsers: nextModuleData.classifiedsBannedUsers
      .map(normalizeClassifiedBannedUserRecord)
      .filter((record) => record.sellerEmail),
  };
};

const normalizeEmailAddress = (value = '') => String(value || '').trim().toLowerCase();

const isClassifiedSellerBanned = (sellerEmail = '', moduleData = {}) => {
  const normalizedEmail = normalizeEmailAddress(sellerEmail);
  if (!normalizedEmail) {
    return false;
  }

  const normalizedModule = normalizeClassifiedsModule(moduleData);
  return normalizedModule.classifiedsBannedUsers.some(
    (record) => normalizeEmailAddress(record?.sellerEmail) === normalizedEmail
  );
};

const getClassifiedBannedSellerRecord = (sellerEmail = '', moduleData = {}) => {
  const normalizedEmail = normalizeEmailAddress(sellerEmail);
  if (!normalizedEmail) {
    return null;
  }

  const normalizedModule = normalizeClassifiedsModule(moduleData);
  return (
    normalizedModule.classifiedsBannedUsers.find(
      (record) => normalizeEmailAddress(record?.sellerEmail) === normalizedEmail
    ) || null
  );
};

const normalizeEducationState = (state = {}) => {
  const normalizeList = (values) =>
    [...new Set((Array.isArray(values) ? values : [])
      .map((value) => String(value || '').trim())
      .filter(Boolean))];
  const normalizeProgress = (progressInput = {}) => {
    const entries =
      progressInput && typeof progressInput === 'object'
        ? Object.entries(progressInput)
        : [];
    const normalized = {};
    for (const [rawCourseId, rawProgress] of entries) {
      const courseId = String(rawCourseId || '').trim();
      const progress = Number(rawProgress);
      if (!courseId || !Number.isFinite(progress)) {
        continue;
      }
      normalized[courseId] = Math.max(0, Math.min(100, Math.round(progress)));
    }
    return normalized;
  };
  const roleProfileInput =
    state && typeof state.roleProfile === 'object' && state.roleProfile
      ? state.roleProfile
      : {};
  const primaryRole = String(roleProfileInput.primaryRole || 'student').trim().toLowerCase();
  const normalizedRoleProfile = {
    primaryRole: ['student', 'parent', 'tutor', 'institute_admin'].includes(primaryRole)
      ? primaryRole
      : 'student',
    studentName: String(roleProfileInput.studentName || '').trim(),
    classLevel: String(roleProfileInput.classLevel || '').trim(),
    targetExam: String(roleProfileInput.targetExam || '').trim(),
    preferredLanguage: String(roleProfileInput.preferredLanguage || 'English').trim() || 'English',
    careerGoal: String(roleProfileInput.careerGoal || '').trim(),
  };

  return {
    enrolledCourseIds: normalizeList(state.enrolledCourseIds),
    appliedScholarships: normalizeList(state.appliedScholarships),
    joinedGroups: normalizeList(state.joinedGroups),
    courseProgress: normalizeProgress(state.courseProgress),
    roleProfile: normalizedRoleProfile,
    interventionsDismissed: normalizeList(state.interventionsDismissed),
  };
};

const buildEducationRecordId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getOrCreateEducationState = async (userEmail) => {
  const normalizedEmail = normalizeEmailAddress(userEmail);
  if (!normalizedEmail) {
    return null;
  }

  return EducationState.findOneAndUpdate(
    { userEmail: normalizedEmail },
    {
      $setOnInsert: {
        userEmail: normalizedEmail,
        enrolledCourseIds: [],
        appliedScholarships: [],
        joinedGroups: [],
        courseProgress: {},
        roleProfile: {
          primaryRole: 'student',
          studentName: '',
          classLevel: '',
          targetExam: '',
          preferredLanguage: 'English',
          careerGoal: '',
        },
        interventionsDismissed: [],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const getUserEducationStateFromDB = async (userEmail) => {
  const stateDoc = await getOrCreateEducationState(userEmail);
  return normalizeEducationState(stateDoc || {});
};

const updateUserEducationState = async (userEmail, updater) => {
  const stateDoc = await getOrCreateEducationState(userEmail);
  if (!stateDoc) {
    return normalizeEducationState();
  }

  const currentState = normalizeEducationState(stateDoc);
  const nextState = normalizeEducationState(await updater(currentState));
  stateDoc.enrolledCourseIds = nextState.enrolledCourseIds;
  stateDoc.appliedScholarships = nextState.appliedScholarships;
  stateDoc.joinedGroups = nextState.joinedGroups;
  stateDoc.courseProgress = nextState.courseProgress;
  stateDoc.roleProfile = nextState.roleProfile;
  stateDoc.interventionsDismissed = nextState.interventionsDismissed;
  await stateDoc.save();
  return normalizeEducationState(stateDoc);
};

const getClassifiedPublicInteractionGuard = (listing = {}, user = {}) => {
  const normalizedUserEmail = normalizeEmailAddress(user?.email);
  const normalizedSellerEmail = normalizeEmailAddress(listing?.sellerEmail);
  const moderationStatus = String(
    listing?.moderationStatus || (listing?.verified === false ? 'pending' : 'approved')
  )
    .trim()
    .toLowerCase();

  if (!listing?.id) {
    return {
      allowed: false,
      statusCode: 404,
      message: 'Classified listing not found.',
    };
  }

  if (normalizedUserEmail && normalizedSellerEmail && normalizedUserEmail === normalizedSellerEmail) {
    return {
      allowed: false,
      statusCode: 400,
      message: 'You cannot perform this action on your own listing.',
    };
  }

  if (moderationStatus !== 'approved') {
    return {
      allowed: false,
      statusCode: 403,
      message: 'Only approved classifieds can receive buyer interactions.',
    };
  }

  return { allowed: true };
};

const normalizeStringList = (values = []) =>
  [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean))];

const normalizeClassifiedSavedSearchFilters = (filters = {}) => {
  const sortBy = String(filters?.sortBy || 'featured').trim();
  const supportedSortOptions = new Set(['featured', 'latest', 'price-low', 'price-high', 'popular']);

  return {
    searchText: String(filters?.searchText || '').trim(),
    categoryFilter: normalizeStringList(filters?.categoryFilter),
    locationFilter: normalizeStringList(filters?.locationFilter),
    conditionFilter: normalizeStringList(filters?.conditionFilter),
    priceFilter: normalizeStringList(filters?.priceFilter).filter((priceRange) =>
      ['Under 10k', '10k - 50k', '50k - 1L', '1L+'].includes(priceRange)
    ),
    sortBy: supportedSortOptions.has(sortBy) ? sortBy : 'featured',
  };
};

const normalizeClassifiedSavedSearchRecord = (search = {}, index = 0) => ({
  id: String(search.id || `classified-search-${index + 1}`).trim(),
  name: String(search.name || 'Saved search').trim(),
  filters: normalizeClassifiedSavedSearchFilters(search.filters),
  notificationsEnabled: search.notificationsEnabled !== false,
  lastSeenListingIds: normalizeStringList(search.lastSeenListingIds),
  createdAt: String(search.createdAt || new Date().toISOString()).trim(),
  updatedAt: String(search.updatedAt || search.createdAt || new Date().toISOString()).trim(),
  lastMatchedAt: search.lastMatchedAt ? String(search.lastMatchedAt).trim() : null,
});

const normalizeClassifiedRecentViewRecord = (record = {}, index = 0) => ({
  listingId: String(record.listingId || record.id || `classified-recent-${index + 1}`).trim(),
  viewedAt: String(record.viewedAt || new Date().toISOString()).trim(),
});

const normalizeUserClassifiedsState = (state = {}) => ({
  savedSearches: (Array.isArray(state.savedSearches) ? state.savedSearches : [])
    .map(normalizeClassifiedSavedSearchRecord)
    .filter((search) => search.id && search.name),
  recentlyViewed: (Array.isArray(state.recentlyViewed) ? state.recentlyViewed : [])
    .map(normalizeClassifiedRecentViewRecord)
    .filter((record) => record.listingId),
});

const resolveClassifiedPriceRangeMatch = (price = 0, priceFilter = []) => {
  if (!Array.isArray(priceFilter) || priceFilter.length === 0) {
    return true;
  }

  return priceFilter.some((range) => {
    if (range === 'Under 10k') return price < 10000;
    if (range === '10k - 50k') return price >= 10000 && price <= 50000;
    if (range === '50k - 1L') return price > 50000 && price <= 100000;
    if (range === '1L+') return price > 100000;
    return false;
  });
};

const matchesClassifiedSavedSearchFilters = (listing = {}, filters = {}) => {
  const normalizedFilters = normalizeClassifiedSavedSearchFilters(filters);
  const normalizedListing = normalizeClassifiedsListingRecord(listing);
  const moderationStatus = String(normalizedListing.moderationStatus || '').trim().toLowerCase();
  const availabilityStatus = String(normalizedListing.status || 'available').trim().toLowerCase();

  if (moderationStatus && moderationStatus !== 'approved') {
    return false;
  }

  if (availabilityStatus === 'sold' || availabilityStatus === 'rented') {
    return false;
  }

  const searchHaystack = [
    normalizedListing.title,
    normalizedListing.description,
    normalizedListing.category,
    normalizedListing.location,
    normalizedListing.seller,
    ...(Array.isArray(normalizedListing.tags) ? normalizedListing.tags : []),
  ]
    .join(' ')
    .toLowerCase();

  const matchesSearch =
    !normalizedFilters.searchText ||
    searchHaystack.includes(normalizedFilters.searchText.toLowerCase());

  const matchesCategory =
    normalizedFilters.categoryFilter.length === 0 ||
    normalizedFilters.categoryFilter.includes(normalizedListing.category);
  const matchesLocation =
    normalizedFilters.locationFilter.length === 0 ||
    normalizedFilters.locationFilter.includes(normalizedListing.location);
  const matchesCondition =
    normalizedFilters.conditionFilter.length === 0 ||
    normalizedFilters.conditionFilter.includes(normalizedListing.condition);
  const matchesPrice = resolveClassifiedPriceRangeMatch(
    Number(normalizedListing.price || 0),
    normalizedFilters.priceFilter
  );

  return matchesSearch && matchesCategory && matchesLocation && matchesCondition && matchesPrice;
};

const buildClassifiedSavedSearchSummary = (search = {}, listings = []) => {
  const normalizedSearch = normalizeClassifiedSavedSearchRecord(search);
  const matchingListings = (Array.isArray(listings) ? listings : [])
    .map((listing, index) => normalizeClassifiedsListingRecord(listing, index))
    .filter((listing) => matchesClassifiedSavedSearchFilters(listing, normalizedSearch.filters))
    .sort(
      (first, second) =>
        new Date(second.createdAt || second.updatedAt || second.posted || 0) -
        new Date(first.createdAt || first.updatedAt || first.posted || 0)
    );
  const matchedListingIds = matchingListings.map((listing) => String(listing.id));
  const unseenMatches = matchingListings.filter(
    (listing) => !normalizedSearch.lastSeenListingIds.includes(String(listing.id))
  );

  return {
    ...normalizedSearch,
    matchCount: matchingListings.length,
    newMatchCount: unseenMatches.length,
    matchedListingIds,
    previewListings: unseenMatches.slice(0, 3),
    lastMatchedAt:
      matchingListings[0]?.createdAt ||
      matchingListings[0]?.updatedAt ||
      matchingListings[0]?.posted ||
      normalizedSearch.lastMatchedAt,
  };
};

const getSearchableClassifiedListings = async () => {
  const moduleData = await listClassifiedModuleData({ page: 1, limit: 500 });
  return Array.isArray(moduleData?.classifiedsListings) ? moduleData.classifiedsListings : [];
};

const buildUserClassifiedsResponse = async (state = {}) => {
  const normalizedState = normalizeUserClassifiedsState(state);
  const searchableListings = await getSearchableClassifiedListings();
  const recentlyViewedLookup = new Map(
    searchableListings.map((listing) => [String(listing.id), normalizeClassifiedsListingRecord(listing)])
  );

  return {
    savedSearches: normalizedState.savedSearches.map((search) =>
      buildClassifiedSavedSearchSummary(search, searchableListings)
    ),
    recentlyViewed: normalizedState.recentlyViewed
      .map((entry) => {
        const matchedListing = recentlyViewedLookup.get(String(entry.listingId));
        if (!matchedListing) {
          return null;
        }

        return {
          ...matchedListing,
          viewedAt: entry.viewedAt,
        };
      })
      .filter(Boolean),
  };
};

const getUserClassifiedsStateFromFile = async (userEmail) => {
  const currentData = await devAppDataStore.readAppData();
  const normalizedEmail = normalizeEmailAddress(userEmail);
  return normalizeUserClassifiedsState(currentData.userClassifieds?.[normalizedEmail]);
};

const saveUserClassifiedsStateToFile = async (userEmail, updater) => {
  const normalizedEmail = normalizeEmailAddress(userEmail);
  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const currentState = normalizeUserClassifiedsState(currentData.userClassifieds?.[normalizedEmail]);
    const nextState = normalizeUserClassifiedsState(await updater(currentState));

    return {
      ...currentData,
      userClassifieds: {
        ...(currentData.userClassifieds || {}),
        [normalizedEmail]: nextState,
      },
    };
  });

  return normalizeUserClassifiedsState(nextData.userClassifieds?.[normalizedEmail]);
};

const getUserClassifiedsState = async (userEmail) => {
  const normalizedEmail = normalizeEmailAddress(userEmail);

  if (useMongoClassifieds()) {
    const user = await User.findOne({ email: normalizedEmail })
      .select('classifiedsSavedSearches classifiedsRecentlyViewed')
      .lean();

    if (user) {
      return normalizeUserClassifiedsState({
        savedSearches: user.classifiedsSavedSearches,
        recentlyViewed: user.classifiedsRecentlyViewed,
      });
    }
  }

  return getUserClassifiedsStateFromFile(normalizedEmail);
};

const updateUserClassifiedsState = async (userEmail, updater) => {
  const normalizedEmail = normalizeEmailAddress(userEmail);

  if (useMongoClassifieds()) {
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const currentState = normalizeUserClassifiedsState({
        savedSearches: user.classifiedsSavedSearches,
        recentlyViewed: user.classifiedsRecentlyViewed,
      });
      const nextState = normalizeUserClassifiedsState(await updater(currentState));

      user.classifiedsSavedSearches = nextState.savedSearches;
      user.classifiedsRecentlyViewed = nextState.recentlyViewed;
      await user.save();
      return nextState;
    }
  }

  return saveUserClassifiedsStateToFile(normalizedEmail, updater);
};

const canManageClassifieds = (user = {}) =>
  user?.email?.trim().toLowerCase() === ADMIN_EMAIL ||
  user?.registrationType === 'entrepreneur' ||
  user?.role === 'business' ||
  user?.registrationType === 'admin' ||
  user?.role === 'admin';

const canManageRealEstate = (user = {}) =>
  user?.email?.trim().toLowerCase() === ADMIN_EMAIL ||
  user?.registrationType === 'entrepreneur' ||
  user?.role === 'business' ||
  user?.registrationType === 'admin' ||
  user?.role === 'admin';

const resolveRealEstateOwnerId = (user = {}) =>
  String(
    user?.id ||
      user?.userId ||
      user?.email ||
      user?.phone ||
      user?.businessName ||
      user?.name ||
      ''
  ).trim();

const resolveRealEstateSellerRole = (roleMode = 'owner', user = {}) => {
  if (user?.email?.trim().toLowerCase() === ADMIN_EMAIL) {
    return 'Admin';
  }

  if (roleMode === 'builder') {
    return 'Builder';
  }

  if (roleMode === 'agent') {
    return 'Agent';
  }

  return 'Owner';
};

const matchesRealEstateListingId = (listing = {}, listingId = '') =>
  String(listing?._id || listing?.id || '') === String(listingId || '');

const buildRealEstateModuleData = async () => ({
  realestateProperties: await listRealEstateProperties(),
});

const isRealEstateListingOwner = (listing = {}, user = {}) => {
  const normalizedUserEmail = String(user?.email || '').trim().toLowerCase();
  const normalizedSellerEmail = String(listing?.sellerEmail || '').trim().toLowerCase();
  const ownerId = String(listing?.ownerId || '').trim();
  const resolvedOwnerId = resolveRealEstateOwnerId(user);

  return Boolean(
    (normalizedUserEmail && normalizedSellerEmail && normalizedUserEmail === normalizedSellerEmail) ||
      (ownerId && resolvedOwnerId && ownerId === resolvedOwnerId)
  );
};

const normalizeRealEstateLeadStatus = (status = '') => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'site_visit_scheduled') return 'site_visit';
  if (normalized === 'negotiating') return 'negotiation';
  if (normalized === 'token') return 'token_paid';
  return normalized || 'new';
};

const normalizeRealEstateLeadRecord = (lead = {}, index = 0) => ({
  id: String(lead.id || `realestate-lead-${index + 1}`).trim(),
  name: String(lead.name || 'Buyer').trim(),
  email: String(lead.email || '').trim().toLowerCase(),
  phone: String(lead.phone || '').trim(),
  channel: String(lead.channel || 'Enquiry').trim(),
  priority: String(lead.priority || 'Warm').trim(),
  status: normalizeRealEstateLeadStatus(lead.status),
  message: String(lead.message || '').trim(),
  followUpAt: toIsoDateOrNull(lead.followUpAt),
  followUpNote: String(lead.followUpNote || '').trim(),
  assignedTo: String(lead.assignedTo || '').trim(),
  lastContactedAt: toIsoDateOrNull(lead.lastContactedAt),
  createdAt: String(lead.createdAt || new Date().toISOString()).trim(),
  updatedAt: String(lead.updatedAt || lead.createdAt || new Date().toISOString()).trim(),
});

const normalizeRealEstateVisitRecord = (visit = {}, index = 0) => ({
  id: String(visit.id || `realestate-visit-${index + 1}`).trim(),
  leadId: String(visit.leadId || '').trim(),
  buyerName: String(visit.buyerName || 'Buyer').trim(),
  buyerEmail: String(visit.buyerEmail || '').trim().toLowerCase(),
  buyerPhone: String(visit.buyerPhone || '').trim(),
  scheduledAt: toIsoDateOrNull(visit.scheduledAt) || new Date().toISOString(),
  durationMinutes: Number(visit.durationMinutes || 45),
  mode: String(visit.mode || 'onsite').trim(),
  note: String(visit.note || '').trim(),
  status: String(visit.status || 'scheduled').trim(),
  reminderAt: toIsoDateOrNull(visit.reminderAt),
  createdAt: String(visit.createdAt || new Date().toISOString()).trim(),
  updatedAt: String(visit.updatedAt || visit.createdAt || new Date().toISOString()).trim(),
});

const buildRealEstateLeadUpdate = (lead = {}, payload = {}, now = new Date()) => {
  const normalizedLead = normalizeRealEstateLeadRecord(lead);
  const nextStatus =
    payload.status !== undefined ? normalizeRealEstateLeadStatus(payload.status) : normalizedLead.status;
  const nextLead = {
    ...normalizedLead,
    status: nextStatus || 'new',
    followUpAt:
      payload.followUpAt !== undefined ? toIsoDateOrNull(payload.followUpAt) : normalizedLead.followUpAt,
    followUpNote:
      payload.followUpNote !== undefined
        ? String(payload.followUpNote || '').trim()
        : normalizedLead.followUpNote,
    assignedTo:
      payload.assignedTo !== undefined
        ? String(payload.assignedTo || '').trim()
        : normalizedLead.assignedTo,
    updatedAt: new Date(now).toISOString(),
  };

  if (payload.status !== undefined && nextStatus !== 'new') {
    nextLead.lastContactedAt = new Date(now).toISOString();
  }

  return nextLead;
};

const buildRealEstateVisitRecord = (payload = {}, user = {}, now = new Date()) => {
  const scheduledAtIso = toIsoDateOrNull(payload.scheduledAt) || new Date(now).toISOString();
  const scheduledAtDate = new Date(scheduledAtIso);
  const reminderCandidate = new Date(scheduledAtDate.getTime() - 2 * 60 * 60 * 1000);
  const reminderAt =
    reminderCandidate > new Date(now) ? reminderCandidate.toISOString() : new Date(now).toISOString();

  return normalizeRealEstateVisitRecord({
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `realestate-visit-${Date.now()}`,
    leadId: payload.leadId,
    buyerName: user?.name?.trim() || 'Buyer',
    buyerEmail: user?.email,
    buyerPhone: payload.buyerPhone,
    scheduledAt: scheduledAtIso,
    durationMinutes: Number(payload.durationMinutes || 45),
    mode: payload.mode || 'onsite',
    note: payload.note,
    status: 'scheduled',
    reminderAt,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  });
};

const buildRealEstateVisitUpdate = (visit = {}, payload = {}, now = new Date()) => {
  const normalizedVisit = normalizeRealEstateVisitRecord(visit);
  const scheduledAt =
    payload.scheduledAt !== undefined
      ? toIsoDateOrNull(payload.scheduledAt) || normalizedVisit.scheduledAt
      : normalizedVisit.scheduledAt;
  const durationMinutes =
    payload.durationMinutes !== undefined
      ? Number(payload.durationMinutes || normalizedVisit.durationMinutes)
      : normalizedVisit.durationMinutes;
  const reminderAt =
    payload.reminderAt !== undefined
      ? toIsoDateOrNull(payload.reminderAt)
      : payload.scheduledAt !== undefined
        ? new Date(new Date(scheduledAt).getTime() - 2 * 60 * 60 * 1000).toISOString()
        : normalizedVisit.reminderAt;

  return normalizeRealEstateVisitRecord({
    ...normalizedVisit,
    status:
      payload.status !== undefined ? String(payload.status).trim() : normalizedVisit.status,
    scheduledAt,
    durationMinutes,
    reminderAt,
    note: payload.note !== undefined ? String(payload.note || '').trim() : normalizedVisit.note,
    updatedAt: new Date(now).toISOString(),
  });
};

const REAL_ESTATE_ACTIVE_VISIT_STATUSES = new Set(['scheduled', 'confirmed']);

const findRealEstateVisitConflict = (properties = [], candidateVisit = {}, owner = {}) => {
  const candidate = normalizeRealEstateVisitRecord(candidateVisit);
  const candidateStart = new Date(candidate.scheduledAt);
  const candidateEnd = new Date(
    candidateStart.getTime() + Number(candidate.durationMinutes || 45) * 60 * 1000
  );
  const targetOwnerId = String(owner.ownerId || '').trim();
  const targetSellerEmail = String(owner.sellerEmail || '').trim().toLowerCase();

  if (Number.isNaN(candidateStart.getTime()) || Number.isNaN(candidateEnd.getTime())) {
    return null;
  }

  for (const property of Array.isArray(properties) ? properties : []) {
    const matchesOwner =
      (targetOwnerId && String(property?.ownerId || '').trim() === targetOwnerId) ||
      (targetSellerEmail &&
        String(property?.sellerEmail || '').trim().toLowerCase() === targetSellerEmail);

    if (!matchesOwner) {
      continue;
    }

    for (const visit of Array.isArray(property?.visits) ? property.visits : []) {
      const normalizedVisit = normalizeRealEstateVisitRecord(visit);
      if (!REAL_ESTATE_ACTIVE_VISIT_STATUSES.has(normalizedVisit.status)) {
        continue;
      }

      const visitStart = new Date(normalizedVisit.scheduledAt);
      const visitEnd = new Date(
        visitStart.getTime() + Number(normalizedVisit.durationMinutes || 45) * 60 * 1000
      );
      const overlaps = candidateStart < visitEnd && candidateEnd > visitStart;

      if (!overlaps) {
        continue;
      }

      return {
        propertyId: String(property?.id || property?._id || '').trim(),
        propertyTitle: String(property?.title || 'Property').trim(),
        visitId: normalizedVisit.id,
        scheduledAt: normalizedVisit.scheduledAt,
        status: normalizedVisit.status,
      };
    }
  }

  return null;
};

const adminOnly = (req, res, next) => {
  if (!hasAdminPrivileges(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  return next();
};

const registrationUploadFields = upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'licenseDocument', maxCount: 1 },
  { name: 'identityDocument', maxCount: 1 },
  { name: 'foodLicenseDocument', maxCount: 1 },
]);

const storeRegistrationFile = async ({ file, ownerEmail, category }) => {
  if (!file?.buffer?.length) {
    return {
      fileId: '',
      url: '',
      name: '',
    };
  }

  const storedFile = await uploadBufferToGridFS({
    buffer: file.buffer,
    filename: file.originalname || `${category}-${Date.now()}`,
    contentType: file.mimetype || 'application/octet-stream',
    metadata: {
      category,
      visibility: 'private',
      ownerEmail,
    },
  });

  return {
    fileId: storedFile.id,
    url: `/api/files/private/${storedFile.id}`,
    name: file.originalname || storedFile.filename,
  };
};

const parseJsonField = (value, fallback) => {
  if (typeof value !== 'string') {
    return value ?? fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const normalizeApplicationBody = (body = {}) => ({
  ...body,
  selectedBusinessCategories: parseJsonField(body.selectedBusinessCategories, []),
  registrationFee: Number(body.registrationFee || 0),
  monthlyFee: Number(body.monthlyFee || 0),
  foodLicenseRequired:
    body.foodLicenseRequired === true || String(body.foodLicenseRequired).toLowerCase() === 'true',
});

const useMemoryAuth = () => {
  return process.env.AUTH_STORAGE === 'memory' && process.env.NODE_ENV !== 'production';
};

const getEmailMode = () => {
  const rawMode = String(process.env.EMAIL_SERVICE || process.env.EMAIL_PROVIDER || 'smtp')
    .trim()
    .toLowerCase();

  if (rawMode === 'gmail' || rawMode === 'sendgrid') {
    return 'smtp';
  }

  return rawMode;
};

const EMAIL_OPERATION_TIMEOUT_MS = Number(process.env.EMAIL_OPERATION_TIMEOUT_MS) || 8000;
const RENDER_RESTRICTED_SMTP_PORTS = new Set([25, 465, 587]);

const isRenderEnvironment = () => String(process.env.RENDER || '').toLowerCase() === 'true';

const isRenderSmtpPortRestricted = () => {
  return (
    isRenderEnvironment() &&
    getEmailMode() === 'smtp' &&
    RENDER_RESTRICTED_SMTP_PORTS.has(Number(process.env.EMAIL_PORT) || 587)
  );
};

const withTimeout = async (promise, timeoutMs, message) => {
  let timerId;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timerId = setTimeout(() => {
          const timeoutError = new Error(message || 'Operation timed out');
          timeoutError.code = 'ETIMEDOUT';
          reject(timeoutError);
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timerId);
  }
};

const hasRealEmailConfig = () => {
  if (getEmailMode() === 'gmail-api') {
    return hasGmailDeliveryConfig();
  }

  if (getEmailMode() === 'ses') {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.EMAIL_FROM &&
      !process.env.AWS_ACCESS_KEY_ID.includes('your-')
    );
  }

  const values = [
    process.env.EMAIL_USER,
    process.env.EMAIL_PASS,
    process.env.EMAIL_FROM,
  ];
  return values.every((value) => value && !value.includes('your-'));
};

const getEmailService = () => {
  if (getEmailMode() === 'gmail-api') {
    return 'gmail-api';
  }

  if (getEmailMode() === 'ses') {
    const { SESClient } = require('@aws-sdk/client-ses');
    const sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    return sesClient;
  }

  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 8000,
    dnsTimeout: 4000,
  });
};

const sendRegistrationReviewEmail = async ({ to, applicantName, businessName, status, reason }) => {
  if (!hasRealEmailConfig()) {
    logger.warn(`Registration review email skipped for ${to}: email service not configured.`);
    return false;
  }

  const subject = `NilaHub registration update: ${status}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #1a2332;">
      <h2>NilaHub Registration Review</h2>
      <p>Hello ${applicantName || businessName || 'Entrepreneur'},</p>
      <p>Your entrepreneur registration for <strong>${businessName || 'your business account'}</strong> has been reviewed.</p>
      <p><strong>Status:</strong> ${status}</p>
      <p><strong>Reason:</strong> ${reason || 'No additional reason provided.'}</p>
      <p>Please log in to NilaHub for the latest account details.</p>
    </div>
  `;

  if (getEmailMode() === 'gmail-api') {
    await withTimeout(
      sendEmailViaGmail(to, subject, htmlContent),
      EMAIL_OPERATION_TIMEOUT_MS,
      'Gmail API request timed out'
    );
    return true;
  }

  if (getEmailMode() === 'ses') {
    const { SendEmailCommand } = require('@aws-sdk/client-ses');
    const ses = getEmailService();
    await withTimeout(
      ses.send(new SendEmailCommand({
        Source: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: {
            Html: { Data: htmlContent },
          },
        },
      })),
      EMAIL_OPERATION_TIMEOUT_MS,
      'SES email request timed out'
    );
    return true;
  }

  const transporter = getEmailService();
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  try {
    await withTimeout(
      transporter.sendMail({
        from: `NilaHub <${fromAddress}>`,
        to,
        subject,
        html: htmlContent,
      }),
      EMAIL_OPERATION_TIMEOUT_MS,
      'SMTP email request timed out'
    );
  } catch (error) {
    if (isRenderSmtpPortRestricted()) {
      error.message =
        'SMTP email delivery can fail on Render free web services. Switch EMAIL_SERVICE to gmail-api or ses, or upgrade the Render web service.';
    }
    throw error;
  }
  return true;
};

router.get('/public', async (req, res) => {
  const appData = await devAppDataStore.readAppData();
  const enabledModules = await getPersistedEnabledModules(appData.enabledModules);
  const classifiedsModuleData = await listClassifiedModuleData();
  const realestateProperties = await listRealEstateProperties();
  const restaurants = await listRestaurants();
  const registeredAccounts = await getRegisteredAccountsFromDB();

  return res.json({
    success: true,
    data: {
      businessCategories: appData.businessCategories,
      globeMartCategories: normalizeGlobeMartCategories(appData.globeMartCategories),
      enabledModules,
      moduleBranding: normalizeModuleBranding(appData.moduleBranding),
      registeredAccounts: registeredAccounts,
      moduleData: {
        ...appData.moduleData,
        ...classifiedsModuleData,
        realestateProperties,
        restaurants,
      },
    },
  });
});

router.get('/skilllearning/courses', authenticate, async (req, res) => {
  try {
    const filters = {
      query: req.query.query,
      category: req.query.category,
      level: req.query.level,
      language: req.query.language,
      region: req.query.region,
      isFree: req.query.isFree === 'true' ? true : req.query.isFree === 'false' ? false : undefined,
      certificateAvailable:
        req.query.certificateAvailable === 'true'
          ? true
          : req.query.certificateAvailable === 'false'
          ? false
          : undefined,
      jobLinked:
        req.query.jobLinked === 'true'
          ? true
          : req.query.jobLinked === 'false'
          ? false
          : undefined,
    };
    const courses = getSkillLearningCourses(filters);
    return res.json({ success: true, data: { courses, categories: COURSE_CATEGORIES } });
  } catch (error) {
    logger.error('skilllearning courses error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load skill learning courses.' });
  }
});

router.get('/skilllearning/courses/:courseId', authenticate, async (req, res) => {
  const course = getCourseById(req.params.courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found.' });
  }
  return res.json({ success: true, data: { course } });
});

router.get('/skilllearning/recommendations', authenticate, async (req, res) => {
  try {
    const recommendations = getSkillRecommendations({
      education: req.query.education,
      interests: req.query.interests,
      salaryTarget: req.query.salaryTarget,
      destination: req.query.destination,
    });
    return res.json({ success: true, data: { recommendations } });
  } catch (error) {
    logger.error('skilllearning recommendations error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate recommendations.' });
  }
});

router.get('/skilllearning/questions', authenticate, async (req, res) => {
  try {
    const category = req.query.category || 'Gulf Ready';
    const questions = getQuestionBank(category).map((question) => ({
      id: question.id,
      category: question.category,
      question: question.question,
      options: question.options,
    }));
    return res.json({ success: true, data: { questions } });
  } catch (error) {
    logger.error('skilllearning questions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load question bank.' });
  }
});

router.post('/skilllearning/tests/submit', authenticate, async (req, res) => {
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  const category = req.body.category || 'Gulf Ready';
  const questions = getQuestionBank(category);
  if (!questions.length) {
    return res.status(400).json({
      success: false,
      message: 'No questions are available for this category.',
    });
  }
  const {
    totalQuestions,
    correct,
    wrong,
    attempted,
    negativeMarks,
    score,
    weakAreaTopics,
  } = buildSkillAssessmentMetrics({
    questions,
    answers,
  });

  try {
    const result = await SkillTestResult.create({
      resultId: buildSkillRecordId('skill-test'),
      userEmail: normalizeEmailAddress(req.user?.email || req.user?.id || req.user?._id),
      category,
      score,
      totalQuestions,
      correct,
      wrong,
      attempted,
      negativeMarks,
      weakAreas: weakAreaTopics,
      questions: questions.map((question) => ({
        id: question.id,
        question: question.question,
        options: question.options,
        correctIndex: question.answer,
      })),
    });

    return res.json({
      success: true,
      data: {
        result,
        insight: weakAreaTopics.length
          ? `Focus on ${weakAreaTopics.join(', ')} to improve your next mock test.`
          : 'Great work — keep building your score with timed practice.',
      },
    });
  } catch (error) {
    logger.error('skilllearning test submit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit test.' });
  }
});

router.get('/skilllearning/certificates', authenticate, async (req, res) => {
  try {
    const userEmail = normalizeEmailAddress(req.user?.email || req.user?.id || req.user?._id);
    const certificates = await SkillCertificate.find({ userEmail }).sort({ uploadedAt: -1 }).lean();
    return res.json({ success: true, data: { certificates, govtPortals: GOVT_PORTALS } });
  } catch (error) {
    logger.error('skilllearning certificates list error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load certificates.' });
  }
});

router.post('/skilllearning/certificates/upload', authenticate, upload.single('certificateFile'), async (req, res) => {
  const { title, issuer, completedOn, credentialId } = req.body;
  const validationErrors = validateCertificateUploadPayload(req.body || {}, req.file);
  if (validationErrors.length) {
    return res.status(400).json({ success: false, message: validationErrors.join(' ') });
  }

  try {
    const userEmail = normalizeEmailAddress(req.user?.email || req.user?.id || req.user?._id);
    const uploadFolder = ensureUploadsFolder('skilllearning');

    let fileName = '';
    let fileUrl = '';
    if (req.file) {
      fileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const filePath = path.join(uploadFolder, fileName);
      await fsPromises.writeFile(filePath, req.file.buffer);
      fileUrl = `/uploads/skilllearning/${fileName}`;
    }

    const certificate = await SkillCertificate.create({
      certificateId: buildSkillRecordId('skill-cert'),
      userEmail,
      title,
      issuer: issuer || 'Training Partner',
      completedOn: new Date(completedOn),
      credentialId: credentialId || '',
      verificationUrl: `https://verify.example.com/${crypto.randomBytes(8).toString('hex')}`,
      badgeUrl: `/uploads/skilllearning/badge-default.png`,
      fileName,
      fileUrl,
    });

    return res.json({ success: true, data: { certificate } });
  } catch (error) {
    logger.error('skilllearning certificate upload error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save certificate.' });
  }
});

router.patch(
  '/skilllearning/certificates/:certificateId/verification',
  authenticate,
  educationWriteLimiter,
  withEducationTelemetry('skilllearning.certificates.verification.patch', async (req, res) => {
  const { error, value } = certificateVerificationSchema.validate(req.body, {
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  try {
    setEducationCacheHeaders(res, 'hot_private');
    const result = await withEducationIdempotency(
      req,
      `education-certificate-verification-${String(req.params.certificateId || '').trim()}`,
      async ({ replay }) => {
        if (replay) return replay;
        const userEmail = normalizeEmailAddress(req.user?.email || req.user?.id || req.user?._id);
        const certificateId = String(req.params.certificateId || '').trim();
        const certificate = await SkillCertificate.findOne({ certificateId, userEmail });
        if (!certificate) {
          return {
            skipCache: true,
            statusCode: 404,
            body: { success: false, message: 'Certificate not found.' },
          };
        }

        certificate.verificationStatus = value.verificationStatus;
        certificate.verificationNote = value.verificationNote || '';
        certificate.verifiedAt = value.verificationStatus === 'verified' ? new Date() : null;
        await certificate.save();

        return {
          success: true,
          data: {
            certificate,
          },
        };
      }
    );
    if (result?.idempotencyConflict) {
      return res.status(409).json({
        success: false,
        message: 'A similar certificate verification request is already in progress.',
      });
    }
    if (result?.statusCode) {
      return res.status(result.statusCode).json(result.body);
    }
    return res.json(result);
  } catch (verificationError) {
    logger.error('skilllearning certificate verification update error:', verificationError);
    return res.status(500).json({ success: false, message: 'Failed to update verification status.' });
  }
}));

router.get('/skilllearning/wallet', authenticate, async (req, res) => {
  try {
    const courses = getSkillLearningCourses({});
    const userEmail = normalizeEmailAddress(req.user?.email || req.user?.id || req.user?._id);
    const certificates = await SkillCertificate.find({ userEmail }).lean();
    const shareText = buildSkillWalletShareText(certificates);
    return res.json({ success: true, data: { courses, certificates, shareText } });
  } catch (error) {
    logger.error('skilllearning wallet error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load wallet data.' });
  }
});

router.post('/skilllearning/course-enroll', authenticate, async (req, res) => {
  const { courseId } = req.body;
  const course = getCourseById(courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found.' });
  }

  try {
    const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
    const userEmail = normalizeEmailAddress(req.user?.email || userIdentifier);
    const currentState = await getUserEducationStateFromDB(userIdentifier);
    const alreadyEnrolled = (currentState.enrolledCourseIds || []).includes(courseId);
    if (alreadyEnrolled) {
      return res.json({ success: true, data: { alreadyEnrolled: true, state: currentState } });
    }

    await updateUserEducationState(userIdentifier, (stateInput) => ({
      ...stateInput,
      enrolledCourseIds: [...new Set([...(stateInput.enrolledCourseIds || []), courseId])],
    }));

    const state = await getUserEducationStateFromDB(userIdentifier);
    return res.json({ success: true, data: { state, alreadyEnrolled: false } });
  } catch (error) {
    logger.error('skilllearning course enroll error:', error);
    return res.status(500).json({ success: false, message: 'Failed to enroll in course.' });
  }
});

router.get('/skilllearning/dashboard', authenticate, async (req, res) => {
  try {
    const state = await getUserEducationStateFromDB(req.user?.email || req.user?.id || req.user?._id);
    const courses = getSkillLearningCourses({});
    const enrolled = courses.filter((course) => (state.enrolledCourseIds || []).includes(course.id));
    const recent = enrolled.slice(0, 3);
    const dashboardStats = {
      continueLearning: enrolled.length,
      recommendedCourses: 4,
      govtCertifications: GOVT_PORTALS.length,
      upcomingExams: 3,
      interviewPractice: 3,
      avgProgress: state.courseProgress
        ? Math.round(
            (Object.values(state.courseProgress).reduce((acc, value) => acc + Number(value), 0) || 0) /
              Math.max(Object.keys(state.courseProgress).length, 1)
          )
        : 0,
    };
    return res.json({ success: true, data: { dashboardStats, recent, enrolled } });
  } catch (error) {
    logger.error('skilllearning dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard.' });
  }
});

router.get('/skilllearning/govt-portals', async (req, res) => {
  return res.json({ success: true, data: { govtPortals: GOVT_PORTALS } });
});

router.get(
  '/education/discovery',
  withEducationTelemetry('education.discovery', async (req, res) => {
    setEducationCacheHeaders(res, 'cold_public');
    return res.json({
      success: true,
      data: {
        scholarships: EDUCATION_SCHOLARSHIPS,
        governmentSchemes: EDUCATION_GOVERNMENT_SCHEMES,
      },
    });
  })
);

router.get('/education/learning-path', authenticate, withEducationTelemetry('education.learning-path', async (req, res) => {
  try {
    if (!ENABLE_EDUCATION_360) {
      return res.status(404).json({
        success: false,
        message: 'Education 360 is disabled.',
      });
    }
    setEducationCacheHeaders(res, 'cold_private');
    const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
    const userEmail = normalizeEmailAddress(userIdentifier);
    const state = await getUserEducationStateFromDB(userIdentifier);
    const latestTest = await SkillTestResult.findOne({ userEmail }).sort({ createdAt: -1 }).lean();
    const recommendations = getSkillRecommendations({
      education: req.user?.education || req.query.education,
      interests: req.query.interests || '',
      salaryTarget: req.query.salaryTarget || '',
      destination: req.query.destination || '',
    });

    const weakAreas = Array.isArray(latestTest?.weakAreas) ? latestTest.weakAreas : [];
    const roleProfile = state?.roleProfile || {};
    const primaryRole = String(roleProfile.primaryRole || 'student');
    const targetExam = String(roleProfile.targetExam || '').trim();
    const classLevel = String(roleProfile.classLevel || '').trim();
    const avgProgress = (() => {
      const values = Object.values(state?.courseProgress || {}).map((value) => Number(value || 0));
      if (!values.length) return 0;
      return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    })();
    const path = [
      classLevel ? `Complete one focused lesson mapped to ${classLevel}.` : 'Complete one focused lesson from your enrolled course.',
      weakAreas.length
        ? `Review weak topics: ${weakAreas.join(', ')}.`
        : 'Take one timed mock test to identify weak topics.',
      avgProgress < 50
        ? 'Increase consistency: complete two 30-minute focused study blocks today.'
        : 'Summarize key notes in your own words and revise before sleep.',
    ];
    if (targetExam) {
      path.unshift(`Prioritize preparation tasks for ${targetExam}.`);
    }
    if (primaryRole === 'parent') {
      path.push('Review attendance and homework updates with your learner this evening.');
    }

    return res.json({
      success: true,
      data: {
        recommendations,
        weakAreas,
        path,
        enrolledCourseIds: state.enrolledCourseIds || [],
      },
    });
  } catch (error) {
    logger.error('education learning path error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to build learning path.',
    });
  }
}));

router.get('/education/overview360', authenticate, withEducationTelemetry('education.overview360', async (req, res) => {
  try {
    if (!ENABLE_EDUCATION_360) {
      return res.status(404).json({
        success: false,
        message: 'Education 360 is disabled.',
      });
    }
    setEducationCacheHeaders(res, 'cold_private');
    const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
    const userEmail = normalizeEmailAddress(userIdentifier);
    const { payload, cacheState } = await getCachedEducationOverview360({
      userIdentifier,
      userEmail,
    });
    res.setHeader('x-education-cache', cacheState);

    return res.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    logger.error('education overview360 error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load education overview.',
    });
  }
}));

router.patch('/education/profile', authenticate, educationWriteLimiter, withEducationTelemetry('education.profile.patch', async (req, res) => {
  const { error, value } = educationRoleProfileSchema.validate(req.body, {
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  try {
    if (!ENABLE_EDUCATION_360) {
      return res.status(404).json({
        success: false,
        message: 'Education 360 is disabled.',
      });
    }
    setEducationCacheHeaders(res, 'hot_private');
    const idempotentResult = await withEducationIdempotency(req, 'education-profile-patch', async ({ replay }) => {
      if (replay) {
        return replay;
      }
      const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
      const state = await updateUserEducationState(userIdentifier, (currentState) => ({
        ...currentState,
        roleProfile: value,
      }));
      return {
        success: true,
        data: {
          state,
        },
      };
    });
    if (idempotentResult?.idempotencyConflict) {
      return res.status(409).json({
        success: false,
        message: 'A similar profile update is already in progress.',
      });
    }

    return res.json(idempotentResult);
  } catch (saveError) {
    logger.error('education profile update error:', saveError);
    return res.status(500).json({
      success: false,
      message: 'Failed to update education profile.',
    });
  }
}));

router.get('/education/canva-kit', authenticate, withEducationTelemetry('education.canva-kit', async (req, res) => {
  try {
    if (!ENABLE_EDUCATION_360) {
      return res.status(404).json({
        success: false,
        message: 'Education 360 is disabled.',
      });
    }
    setEducationCacheHeaders(res, 'cold_private');
    const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
    const userEmail = normalizeEmailAddress(userIdentifier);
    const { payload, cacheState } = await getCachedEducationOverview360({
      userIdentifier,
      userEmail,
    });
    res.setHeader('x-education-cache', cacheState);

    return res.json({
      success: true,
      data: {
        canvaToolkit: payload?.canvaToolkit || buildEducationCanvaToolkit({}),
      },
    });
  } catch (error) {
    logger.error('education canva kit error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load Canva toolkit.',
    });
  }
}));

router.get('/education/kpis', authenticate, withEducationTelemetry('education.kpis', async (req, res) => {
  try {
    if (!ENABLE_EDUCATION_360) {
      return res.status(404).json({
        success: false,
        message: 'Education 360 is disabled.',
      });
    }
    setEducationCacheHeaders(res, 'cold_private');
    const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
    const userEmail = normalizeEmailAddress(userIdentifier);
    const { payload, cacheState } = await getCachedEducationOverview360({
      userIdentifier,
      userEmail,
    });
    const metrics = payload?.outcomeMetrics || {};
    const kpiHealth = {
      readiness: Number(metrics.readinessScore || 0) >= 60 ? 'healthy' : 'attention',
      progress: Number(metrics.avgCourseProgress || 0) >= 50 ? 'healthy' : 'attention',
      tuition: Number(metrics.tuitionCompletionRate || 0) >= 50 ? 'healthy' : 'attention',
      certificates: Number(metrics.certificationVerificationRate || 0) >= 60 ? 'healthy' : 'attention',
    };
    res.setHeader('x-education-cache', cacheState);
    return res.json({
      success: true,
      data: {
        metrics,
        kpiHealth,
      },
    });
  } catch (error) {
    logger.error('education kpis error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load education KPIs.',
    });
  }
}));

router.post('/education/progress/event', authenticate, async (req, res) => {
  const { error, value } = educationProgressEventSchema.validate(req.body, {
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  try {
    const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
    const userEmail = normalizeEmailAddress(userIdentifier);
    const course = getCourseById(value.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.',
      });
    }

    const effectiveDelta = computeEducationProgressDelta({
      eventType: value.eventType,
      explicitDelta: value.progressDelta,
      quizScore: value.quizScore,
      watchMinutes: value.watchMinutes,
    });

    const updatedState = await updateUserEducationState(userIdentifier, (currentState) => {
      const currentProgress = Number(currentState?.courseProgress?.[value.courseId] || 0);
      const nextProgress = Number.isFinite(Number(value.progressValue))
        ? Number(value.progressValue)
        : currentProgress + effectiveDelta;
      const boundedProgress = Math.max(0, Math.min(100, Math.round(nextProgress)));

      return {
        ...currentState,
        enrolledCourseIds: [...new Set([...(currentState.enrolledCourseIds || []), value.courseId])],
        courseProgress: {
          ...(currentState.courseProgress || {}),
          [value.courseId]: boundedProgress,
        },
      };
    });

    const currentProgress = Number(updatedState?.courseProgress?.[value.courseId] || 0);
    const event = await EducationLearningEvent.create({
      eventId: buildEducationRecordId('education-progress'),
      userEmail,
      courseId: value.courseId,
      lessonId: value.lessonId,
      eventType: value.eventType,
      progressDelta: effectiveDelta,
      progressAfter: currentProgress,
      quizScore: Number.isFinite(Number(value.quizScore)) ? Number(value.quizScore) : null,
      metadata: {
        ...(value.metadata || {}),
        watchMinutes: Number(value.watchMinutes || 0),
      },
    });

    return res.json({
      success: true,
      data: {
        state: updatedState,
        event,
      },
    });
  } catch (progressError) {
    logger.error('education progress event error:', progressError);
    return res.status(500).json({
      success: false,
      message: 'Failed to record learning progress.',
    });
  }
});

router.get('/education/progress/history', authenticate, async (req, res) => {
  try {
    const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
    const userEmail = normalizeEmailAddress(userIdentifier);
    const courseId = String(req.query.courseId || '').trim();
    const query = { userEmail };
    if (courseId) {
      query.courseId = courseId;
    }

    const history = await EducationLearningEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      data: {
        history,
      },
    });
  } catch (historyError) {
    logger.error('education progress history error:', historyError);
    return res.status(500).json({
      success: false,
      message: 'Failed to load progress history.',
    });
  }
});

router.get('/education/state', authenticate, async (req, res) => {
  try {
    const state = await getUserEducationStateFromDB(
      req.user?.email || req.user?.id || req.user?._id
    );
    return res.json({
      success: true,
      data: {
        state,
      },
    });
  } catch (error) {
    logger.error('education state fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load education state.',
    });
  }
});

router.patch('/education/state', authenticate, async (req, res) => {
  const { error, value } = educationStateSchema.validate(req.body, {
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  try {
    const state = await updateUserEducationState(
      req.user?.email || req.user?.id || req.user?._id,
      () => value
    );
    return res.json({
      success: true,
      data: {
        state,
      },
    });
  } catch (saveError) {
    logger.error('education state save error:', saveError);
    return res.status(500).json({
      success: false,
      message: 'Failed to save education state.',
    });
  }
});

router.post('/education/enroll', authenticate, async (req, res) => {
  const { error, value } = educationEnrollmentSchema.validate(req.body, {
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  try {
    const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
    const userEmail = normalizeEmailAddress(req.user?.email || userIdentifier);
    const matchedCourse = getCourseById(value.courseId);
    if (!matchedCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.',
      });
    }
    const amount = Math.max(0, Number(matchedCourse.price || 0));
    const canonicalCourseTitle = String(matchedCourse.title || value.courseTitle || 'Course Enrollment').trim();
    const paymentGateway = value.paymentGateway || 'razorpay';
    const paymentMethod = value.paymentMethod || 'upi';
    const now = new Date();
    const currentState = await getUserEducationStateFromDB(userIdentifier);

    if ((currentState.enrolledCourseIds || []).includes(value.courseId)) {
      return res.json({
        success: true,
        data: {
          state: currentState,
          alreadyEnrolled: true,
        },
      });
    }

    if (amount > 0) {
      const activePending = await EducationEnrollment.findOne({
        userEmail,
        courseId: value.courseId,
        status: { $in: ['payment_pending', 'payment_verification_pending'] },
      })
        .sort({ createdAt: -1 })
        .lean();

      if (activePending) {
        return res.status(409).json({
          success: false,
          message: 'Payment is already pending for this course. Complete or retry payment.',
          data: { enrollment: activePending, state: currentState },
        });
      }
    }

    let enrollment = null;
    try {
      enrollment = await EducationEnrollment.create({
        enrollmentId: buildEducationRecordId('education-enroll'),
        userEmail,
        courseId: value.courseId,
        courseTitle: canonicalCourseTitle,
        amount,
        paymentMethod,
        paymentGateway,
        status: amount > 0 ? 'payment_pending' : 'enrolled',
        enrolledAt: amount > 0 ? null : now,
      });
    } catch (createError) {
      if (Number(createError?.code) === 11000) {
        const duplicate = await EducationEnrollment.findOne({
          userEmail,
          courseId: value.courseId,
          status: { $in: ['payment_pending', 'payment_verification_pending', 'enrolled'] },
        })
          .sort({ createdAt: -1 })
          .lean();
        if (duplicate) {
          if (duplicate.status === 'enrolled') {
            const state = await updateUserEducationState(userIdentifier, (stateInput) => ({
              ...stateInput,
              enrolledCourseIds: [...new Set([...(stateInput.enrolledCourseIds || []), value.courseId])],
            }));
            return res.json({
              success: true,
              data: {
                state,
                enrollment: duplicate,
                alreadyEnrolled: true,
              },
            });
          }
          return res.status(409).json({
            success: false,
            message: 'Payment is already pending for this course. Complete or retry payment.',
            data: { enrollment: duplicate, state: currentState },
          });
        }
      }
      throw createError;
    }

    if (amount <= 0) {
      const state = await updateUserEducationState(userIdentifier, (stateInput) => ({
        ...stateInput,
        enrolledCourseIds: [...new Set([...(stateInput.enrolledCourseIds || []), value.courseId])],
      }));

      return res.json({
        success: true,
        data: {
          state,
          enrollment,
          order: null,
          paymentDetails: null,
          requiresPayment: false,
        },
      });
    }

    const order = new Order({
      customerEmail: req.user?.email || '',
      customerName: req.user?.name || req.user?.fullName || '',
      amount,
      subtotal: amount,
      total: amount,
      taxAmount: 0,
      deliveryFee: 0,
      deliveryAddress: 'Education course purchase',
      items: [
        {
          courseId: value.courseId,
          title: canonicalCourseTitle,
          price: amount,
          module: 'education',
          enrollmentId: enrollment.enrollmentId,
        },
      ],
      paymentMethod,
      paymentGateway,
      status: 'Pending Payment',
      userId: String(req.user?.id || req.user?._id || ''),
    });

    await order.save();
    const orderInfo = { orderId: order._id.toString(), status: order.status, amount: order.total || order.amount };
    const paymentDetails = await CheckoutService.initializePayment(order._id, String(req.user?.id || req.user?._id || ''), paymentGateway);

    enrollment.orderId = order._id.toString();
    enrollment.paymentRecordId = String(paymentDetails?.paymentId || '');
    await enrollment.save();

    return res.json({
      success: true,
      data: {
        state: currentState,
        enrollment,
        order: orderInfo,
        paymentDetails,
        requiresPayment: true,
      },
    });
  } catch (saveError) {
    logger.error('education enroll error:', saveError);
    return res.status(500).json({
      success: false,
      message: 'Failed to enroll in education course.',
    });
  }
});

router.post('/education/enroll/:enrollmentId/confirm-payment', authenticate, async (req, res) => {
  const { error, value } = educationPaymentConfirmSchema.validate(req.body, {
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  try {
    const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
    const userEmail = normalizeEmailAddress(req.user?.email || userIdentifier);
    const enrollmentId = String(req.params.enrollmentId || '').trim();

    const enrollment = await EducationEnrollment.findOne({
      enrollmentId,
      userEmail,
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment record not found.',
      });
    }

    if (enrollment.status === 'enrolled') {
      const state = await getUserEducationStateFromDB(userIdentifier);
      return res.json({
        success: true,
        data: { state, enrollment, alreadyConfirmed: true },
      });
    }

    if (!['payment_pending', 'payment_verification_pending', 'payment_failed'].includes(enrollment.status)) {
      return res.status(409).json({
        success: false,
        message: `Enrollment cannot be confirmed from status "${enrollment.status}".`,
      });
    }

    const expectedPaymentRecordId = String(enrollment.paymentRecordId || '').trim();
    const providedPaymentRecordId = String(value.paymentId || '').trim();
    if (expectedPaymentRecordId && providedPaymentRecordId && expectedPaymentRecordId !== providedPaymentRecordId) {
      return res.status(409).json({
        success: false,
        message: 'Provided payment id does not match this enrollment payment session.',
      });
    }

    const paymentRecordId = expectedPaymentRecordId || providedPaymentRecordId;
    if (!paymentRecordId) {
      return res.status(400).json({
        success: false,
        message: 'Payment record id is required for confirmation.',
      });
    }
    if (!enrollment.orderId && Number(enrollment.amount || 0) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Enrollment is missing payment order linkage. Please retry enrollment.',
      });
    }

    const paymentVerification = await CheckoutService.verifyPayment(paymentRecordId, {
      razorpay_order_id: value.razorpay_order_id,
      razorpay_payment_id: value.razorpay_payment_id,
      razorpay_signature: value.razorpay_signature,
      stripePaymentIntentId: value.stripePaymentIntentId,
    });
    const paymentRecord = await Payment.findById(paymentRecordId).lean();
    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        message: 'Payment record was not found after verification.',
      });
    }
    if (
      String(paymentRecord.orderId || '').trim() !== String(enrollment.orderId || '').trim() ||
      Number(paymentRecord.amount || 0) !== Number(enrollment.amount || 0)
    ) {
      return res.status(409).json({
        success: false,
        message: 'Payment record does not match this enrollment order.',
      });
    }
    const verifiedStatuses = new Set(['verified', 'captured', 'refunded', 'partial_refund']);
    if (!verifiedStatuses.has(String(paymentRecord.status || '').toLowerCase())) {
      return res.status(409).json({
        success: false,
        message: 'Payment is not yet in a verified state.',
      });
    }

    const state = await updateUserEducationState(userIdentifier, (currentState) => ({
      ...currentState,
      enrolledCourseIds: [...new Set([...(currentState.enrolledCourseIds || []), enrollment.courseId])],
    }));

    enrollment.status = 'enrolled';
    enrollment.paymentRecordId = String(paymentRecordId);
    enrollment.paymentVerifiedAt = new Date();
    enrollment.enrolledAt = new Date();
    enrollment.errorReason = '';
    await enrollment.save();

    return res.json({
      success: true,
      data: {
        state,
        enrollment,
        paymentVerification,
      },
    });
  } catch (confirmError) {
    logger.error('education payment confirmation error:', confirmError);
    return res.status(400).json({
      success: false,
      message: 'Payment confirmation failed.',
    });
  }
});

router.post('/education/scholarship', authenticate, async (req, res) => {
  const { error, value } = educationScholarshipSchema.validate(req.body, {
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
  const userEmail = normalizeEmailAddress(req.user?.email || userIdentifier);
  const scholarshipName = String(value.scholarshipName || '').trim();

  try {
    const stateBefore = await getUserEducationStateFromDB(userIdentifier);
    if ((stateBefore.appliedScholarships || []).includes(scholarshipName)) {
      return res.json({
        success: true,
        data: {
          state: stateBefore,
          alreadyApplied: true,
        },
      });
    }

    const state = await updateUserEducationState(userIdentifier, (currentState) => ({
      ...currentState,
      appliedScholarships: [...new Set([...(currentState.appliedScholarships || []), scholarshipName])],
    }));

    const scholarshipRecord = await EducationScholarshipApplication.create({
      applicationId: buildEducationRecordId('education-scholarship'),
      userEmail,
      scholarshipName,
      status: 'submitted',
    });

    return res.json({
      success: true,
      data: {
        state,
        scholarship: scholarshipRecord,
      },
    });
  } catch (saveError) {
    if (Number(saveError?.code) === 11000) {
      const state = await updateUserEducationState(userIdentifier, (currentState) => ({
        ...currentState,
        appliedScholarships: [...new Set([...(currentState.appliedScholarships || []), scholarshipName])],
      }));
      return res.json({
        success: true,
        data: {
          state,
          alreadyApplied: true,
        },
      });
    }
    logger.error('education scholarship save error:', saveError);
    return res.status(500).json({
      success: false,
      message: 'Failed to save scholarship application.',
    });
  }
});

router.post('/education/group', authenticate, async (req, res) => {
  const { error, value } = educationGroupJoinSchema.validate(req.body, {
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
  const userEmail = normalizeEmailAddress(req.user?.email || userIdentifier);
  const groupTitle = String(value.groupTitle || '').trim();

  try {
    const stateBefore = await getUserEducationStateFromDB(userIdentifier);
    if ((stateBefore.joinedGroups || []).includes(groupTitle)) {
      return res.json({
        success: true,
        data: {
          state: stateBefore,
          alreadyJoined: true,
        },
      });
    }

    const state = await updateUserEducationState(userIdentifier, (currentState) => ({
      ...currentState,
      joinedGroups: [...new Set([...(currentState.joinedGroups || []), groupTitle])],
    }));

    const groupRecord = await EducationCommunityMembership.create({
      membershipId: buildEducationRecordId('education-group'),
      userEmail,
      groupTitle,
      status: 'joined',
    });

    return res.json({
      success: true,
      data: {
        state,
        group: groupRecord,
      },
    });
  } catch (saveError) {
    if (Number(saveError?.code) === 11000) {
      const state = await updateUserEducationState(userIdentifier, (currentState) => ({
        ...currentState,
        joinedGroups: [...new Set([...(currentState.joinedGroups || []), groupTitle])],
      }));
      return res.json({
        success: true,
        data: {
          state,
          alreadyJoined: true,
        },
      });
    }
    logger.error('education group join error:', saveError);
    return res.status(500).json({
      success: false,
      message: 'Failed to join community group.',
    });
  }
});

router.post('/education/tuition', authenticate, async (req, res) => {
  const { error, value } = educationTuitionRequestSchema.validate(req.body, {
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  try {
    const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
    const userEmail = normalizeEmailAddress(req.user?.email || userIdentifier);
    const normalizedContactPhone = String(value.contactPhone || '').replace(/\D/g, '');
    if (normalizedContactPhone && normalizedContactPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact phone number.',
      });
    }
    const priority = buildEducationTuitionPriority({
      subject: value.subject,
      classLevel: value.classLevel,
      preferredTime: value.preferredTime,
      contactPhone: normalizedContactPhone,
    });
    const tutorMatches = buildEducationTutorMatches({
      subject: value.subject,
      classLevel: value.classLevel,
      preferredMode: value.preferredMode,
    });

    const tuitionRecord = await EducationTuitionRequest.create({
      requestId: buildEducationRecordId('education-tuition'),
      userEmail,
      subject: value.subject,
      classLevel: value.classLevel,
      contactPhone: normalizedContactPhone,
      preferredMode: value.preferredMode,
      preferredTime: value.preferredTime,
      details: value.details,
      priority,
      status: 'submitted',
      timeline: [
        {
          at: new Date(),
          status: 'submitted',
          note: 'Request submitted by learner.',
          actor: 'student',
        },
      ],
    });

    return res.json({
      success: true,
      data: {
        tuitionRequest: tuitionRecord,
        tutorMatches,
      },
    });
  } catch (saveError) {
    logger.error('education tuition request error:', saveError);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit tuition request.',
    });
  }
});

router.get('/education/tuition/requests', authenticate, async (req, res) => {
  try {
    const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
    const userEmail = normalizeEmailAddress(userIdentifier);
    const requests = await EducationTuitionRequest.find({ userEmail })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      data: {
        requests,
      },
    });
  } catch (error) {
    logger.error('education tuition list error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load tuition requests.',
    });
  }
});

router.patch('/education/tuition/:requestId/status', authenticate, async (req, res) => {
  const { error, value } = educationTuitionStatusUpdateSchema.validate(req.body, {
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  try {
    const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
    const userEmail = normalizeEmailAddress(userIdentifier);
    const requestId = String(req.params.requestId || '').trim();
    const tuitionRequest = await EducationTuitionRequest.findOne({ requestId, userEmail });

    if (!tuitionRequest) {
      return res.status(404).json({
        success: false,
        message: 'Tuition request not found.',
      });
    }

    const currentStatus = String(tuitionRequest.status || 'submitted').trim();
    if (!canTransitionEducationTuitionStatus({ currentStatus, nextStatus: value.status })) {
      return res.status(409).json({
        success: false,
        message: `Invalid tuition status transition from ${currentStatus} to ${value.status}.`,
      });
    }

    tuitionRequest.status = value.status;
    if (value.tutorName) {
      tuitionRequest.assignedTutor = {
        ...((tuitionRequest.assignedTutor && tuitionRequest.assignedTutor.toObject)
          ? tuitionRequest.assignedTutor.toObject()
          : tuitionRequest.assignedTutor || {}),
        tutorId:
          (tuitionRequest.assignedTutor && tuitionRequest.assignedTutor.tutorId) ||
          `tutor-${value.tutorName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: value.tutorName,
        phone: value.tutorPhone || '',
        mode: value.tutorMode || '',
        hourlyFee: Number(value.tutorHourlyFee || 0),
      };
    }

    if (value.trialSessionAt) {
      tuitionRequest.trialSessionAt = new Date(value.trialSessionAt);
    }
    if (value.status === 'booked') {
      tuitionRequest.bookedAt = new Date();
    }
    if (value.status === 'completed') {
      tuitionRequest.completedAt = new Date();
    }
    tuitionRequest.timeline = [
      ...(Array.isArray(tuitionRequest.timeline) ? tuitionRequest.timeline : []),
      {
        at: new Date(),
        status: value.status,
        note: value.note || '',
        actor: 'student',
      },
    ];

    await tuitionRequest.save();

    return res.json({
      success: true,
      data: {
        tuitionRequest,
      },
    });
  } catch (statusError) {
    logger.error('education tuition status update error:', statusError);
    return res.status(500).json({
      success: false,
      message: 'Failed to update tuition request.',
    });
  }
});

router.post(
  '/education/tuition/:requestId/sessions',
  authenticate,
  educationWriteLimiter,
  withEducationTelemetry('education.tuition.sessions.create', async (req, res) => {
  const { error, value } = educationTuitionSessionCreateSchema.validate(req.body, {
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  try {
    setEducationCacheHeaders(res, 'hot_private');
    const requestId = String(req.params.requestId || '').trim();
    const responsePayload = await withEducationIdempotency(
      req,
      `education-tuition-session-create-${requestId}`,
      async ({ replay }) => {
        if (replay) return replay;
        const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
        const userEmail = normalizeEmailAddress(userIdentifier);
        const tuitionRequest = await EducationTuitionRequest.findOne({ requestId, userEmail });
        if (!tuitionRequest) {
          return {
            skipCache: true,
            statusCode: 404,
            body: {
              success: false,
              message: 'Tuition request not found.',
            },
          };
        }

        const sessionRecord = {
          sessionId: buildEducationRecordId('tuition-session'),
          scheduledAt: new Date(value.scheduledAt),
          durationMinutes: value.durationMinutes,
          agenda: value.agenda || '',
          attendanceStatus: 'pending',
          homework: '',
          mentorNotes: '',
          updatedAt: new Date(),
        };

        tuitionRequest.sessions = [
          ...(Array.isArray(tuitionRequest.sessions) ? tuitionRequest.sessions : []),
          sessionRecord,
        ];
        tuitionRequest.timeline = [
          ...(Array.isArray(tuitionRequest.timeline) ? tuitionRequest.timeline : []),
          {
            at: new Date(),
            status: tuitionRequest.status,
            note: `Tuition session scheduled for ${new Date(value.scheduledAt).toISOString()}.`,
            actor: 'student',
          },
        ];
        await tuitionRequest.save();

        return {
          success: true,
          data: {
            tuitionRequest,
            session: sessionRecord,
          },
        };
      }
    );
    if (responsePayload?.idempotencyConflict) {
      return res.status(409).json({
        success: false,
        message: 'A similar tuition session request is already in progress.',
      });
    }
    if (responsePayload?.statusCode) {
      return res.status(responsePayload.statusCode).json(responsePayload.body);
    }
    return res.json(responsePayload);
  } catch (sessionError) {
    logger.error('education tuition session create error:', sessionError);
    return res.status(500).json({
      success: false,
      message: 'Failed to create tuition session.',
    });
  }
}));

router.patch(
  '/education/tuition/:requestId/sessions/:sessionId',
  authenticate,
  educationWriteLimiter,
  withEducationTelemetry('education.tuition.sessions.patch', async (req, res) => {
  const { error, value } = educationTuitionSessionUpdateSchema.validate(req.body, {
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  try {
    setEducationCacheHeaders(res, 'hot_private');
    const requestId = String(req.params.requestId || '').trim();
    const sessionId = String(req.params.sessionId || '').trim();
    const responsePayload = await withEducationIdempotency(
      req,
      `education-tuition-session-update-${requestId}-${sessionId}`,
      async ({ replay }) => {
        if (replay) return replay;
        const userIdentifier = req.user?.email || req.user?.id || req.user?._id;
        const userEmail = normalizeEmailAddress(userIdentifier);
        const tuitionRequest = await EducationTuitionRequest.findOne({ requestId, userEmail });
        if (!tuitionRequest) {
          return {
            skipCache: true,
            statusCode: 404,
            body: {
              success: false,
              message: 'Tuition request not found.',
            },
          };
        }

        const sessions = Array.isArray(tuitionRequest.sessions) ? tuitionRequest.sessions : [];
        const session = sessions.find((item) => String(item?.sessionId || '').trim() === sessionId);
        if (!session) {
          return {
            skipCache: true,
            statusCode: 404,
            body: {
              success: false,
              message: 'Tuition session not found.',
            },
          };
        }

        if (value.attendanceStatus !== undefined) session.attendanceStatus = value.attendanceStatus;
        if (value.homework !== undefined) session.homework = value.homework;
        if (value.mentorNotes !== undefined) session.mentorNotes = value.mentorNotes;
        if (value.agenda !== undefined) session.agenda = value.agenda;
        session.updatedAt = new Date();

        if (value.attendanceStatus === 'attended' && tuitionRequest.status === 'booked') {
          tuitionRequest.status = 'in_progress';
        }

        tuitionRequest.timeline = [
          ...(Array.isArray(tuitionRequest.timeline) ? tuitionRequest.timeline : []),
          {
            at: new Date(),
            status: tuitionRequest.status,
            note: `Session ${sessionId} updated (${value.attendanceStatus || 'notes'}).`,
            actor: 'student',
          },
        ];

        await tuitionRequest.save();

        return {
          success: true,
          data: {
            tuitionRequest,
            session,
          },
        };
      }
    );
    if (responsePayload?.idempotencyConflict) {
      return res.status(409).json({
        success: false,
        message: 'A similar tuition session update is already in progress.',
      });
    }
    if (responsePayload?.statusCode) {
      return res.status(responsePayload.statusCode).json(responsePayload.body);
    }
    return res.json(responsePayload);
  } catch (sessionUpdateError) {
    logger.error('education tuition session update error:', sessionUpdateError);
    return res.status(500).json({
      success: false,
      message: 'Failed to update tuition session.',
    });
  }
}));

router.get('/classifieds/user/:sellerEmail/rating', async (req, res) => {
  try {
    const sellerEmail = req.params.sellerEmail.toLowerCase().trim();
    const user = await User.findOne({ email: sellerEmail }).select('classifiedsTotalRating classifiedsReviewCount');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    res.json({
      success: true,
      data: {
        classifiedsTotalRating: user.classifiedsTotalRating,
        classifiedsReviewCount: user.classifiedsReviewCount,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /app-data/classifieds/search - Search classified listings
router.get('/classifieds/search', searchLimiter, async (req, res) => {
  try {
    const {
      q: text = '',
      category = null,
      location = null,
      minPrice = 0,
      maxPrice = Infinity,
      condition = null,
      sortBy = 'featured',
      page = 1,
      limit = 20,
    } = req.query;

    const parsedMinPrice = Number(minPrice);
    const parsedMaxPrice = Number(maxPrice);

    const result = await searchClassifieds({
      text,
      category,
      location,
      minPrice: Number.isFinite(parsedMinPrice) ? parsedMinPrice : 0,
      maxPrice: Number.isFinite(parsedMaxPrice) ? parsedMaxPrice : Infinity,
      condition,
      sortBy,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/classifieds/saved-searches', authenticate, async (req, res) => {
  try {
    const state = await getUserClassifiedsState(req.user?.email);
    const response = await buildUserClassifiedsResponse(state);

    return res.json({
      success: true,
      data: {
        savedSearches: response.savedSearches,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load saved searches.',
      error: error.message,
    });
  }
});

router.post('/classifieds/saved-searches', authenticate, async (req, res) => {
  const { error, value } = classifiedsSavedSearchSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  try {
    const searchableListings = await getSearchableClassifiedListings();
    const matchedListings = searchableListings.filter((listing) =>
      matchesClassifiedSavedSearchFilters(listing, value.filters)
    );
    const now = new Date().toISOString();
    const savedSearch = normalizeClassifiedSavedSearchRecord({
      id:
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `classified-search-${Date.now()}`,
      name: value.name,
      filters: value.filters,
      notificationsEnabled: value.notificationsEnabled,
      lastSeenListingIds: matchedListings.map((listing) => String(listing.id)),
      createdAt: now,
      updatedAt: now,
      lastMatchedAt:
        matchedListings[0]?.createdAt || matchedListings[0]?.updatedAt || matchedListings[0]?.posted || null,
    });

    const nextState = await updateUserClassifiedsState(req.user?.email, (currentState) => ({
      ...currentState,
      savedSearches: [savedSearch, ...currentState.savedSearches],
    }));
    const response = await buildUserClassifiedsResponse(nextState);

    return res.json({
      success: true,
      data: {
        savedSearches: response.savedSearches,
        savedSearch,
      },
    });
  } catch (saveError) {
    return res.status(500).json({
      success: false,
      message: 'Failed to save this classifieds search.',
      error: saveError.message,
    });
  }
});

router.patch('/classifieds/saved-searches/:searchId/acknowledge', authenticate, async (req, res) => {
  try {
    const state = await getUserClassifiedsState(req.user?.email);
    const searchableListings = await getSearchableClassifiedListings();
    const matchedSearch = state.savedSearches.find((search) => search.id === req.params.searchId);

    if (!matchedSearch) {
      return res.status(404).json({
        success: false,
        message: 'Saved search not found.',
      });
    }

    const summary = buildClassifiedSavedSearchSummary(matchedSearch, searchableListings);
    const nextState = await updateUserClassifiedsState(req.user?.email, (currentState) => ({
      ...currentState,
      savedSearches: currentState.savedSearches.map((search) =>
        search.id === req.params.searchId
          ? normalizeClassifiedSavedSearchRecord({
              ...search,
              lastSeenListingIds: summary.matchedListingIds,
              updatedAt: new Date().toISOString(),
              lastMatchedAt: summary.lastMatchedAt,
            })
          : search
      ),
    }));
    const response = await buildUserClassifiedsResponse(nextState);
    const updatedSearch = response.savedSearches.find((search) => search.id === req.params.searchId) || null;

    return res.json({
      success: true,
      data: {
        savedSearches: response.savedSearches,
        savedSearch: updatedSearch,
      },
    });
  } catch (acknowledgeError) {
    return res.status(500).json({
      success: false,
      message: 'Failed to acknowledge saved-search alerts.',
      error: acknowledgeError.message,
    });
  }
});

router.delete('/classifieds/saved-searches/:searchId', authenticate, async (req, res) => {
  try {
    const nextState = await updateUserClassifiedsState(req.user?.email, (currentState) => ({
      ...currentState,
      savedSearches: currentState.savedSearches.filter((search) => search.id !== req.params.searchId),
    }));
    const response = await buildUserClassifiedsResponse(nextState);

    return res.json({
      success: true,
      data: {
        savedSearches: response.savedSearches,
      },
    });
  } catch (deleteError) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete the saved search.',
      error: deleteError.message,
    });
  }
});

router.get('/classifieds/recently-viewed', authenticate, async (req, res) => {
  try {
    const state = await getUserClassifiedsState(req.user?.email);
    const response = await buildUserClassifiedsResponse(state);

    return res.json({
      success: true,
      data: {
        recentlyViewed: response.recentlyViewed,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load recently viewed classifieds.',
      error: error.message,
    });
  }
});

router.post('/classifieds/listings/:listingId/view', authenticate, async (req, res) => {
  const now = new Date().toISOString();

  try {
    let viewedListing = null;

    if (useMongoClassifieds()) {
      viewedListing = await incrementClassifiedView(req.params.listingId);
    } else {
      const nextData = await devAppDataStore.updateAppData(async (currentData) => {
        const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);
        let matchedListing = null;

        const nextListings = currentModuleData.classifiedsListings.map((listing) => {
          if (listing.id !== req.params.listingId) {
            return listing;
          }

          matchedListing = normalizeClassifiedsListingRecord({
            ...listing,
            views: Number(listing.views || 0) + 1,
            updatedAt: now,
          });

          return matchedListing;
        });

        viewedListing = matchedListing;

        return {
          ...currentData,
          moduleData: {
            ...currentData.moduleData,
            ...currentModuleData,
            classifiedsListings: nextListings,
          },
        };
      });

      if (!viewedListing) {
        const normalizedModuleData = normalizeClassifiedsModule(nextData.moduleData);
        viewedListing = normalizedModuleData.classifiedsListings.find(
          (listing) => listing.id === req.params.listingId
        ) || null;
      }
    }

    if (!viewedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    const nextState = await updateUserClassifiedsState(req.user?.email, (currentState) => {
      const recentViews = currentState.recentlyViewed.filter(
        (entry) => String(entry.listingId) !== String(req.params.listingId)
      );

      return {
        ...currentState,
        recentlyViewed: [
          {
            listingId: String(req.params.listingId),
            viewedAt: now,
          },
          ...recentViews,
        ].slice(0, 12),
      };
    });
    const response = await buildUserClassifiedsResponse(nextState);

    return res.json({
      success: true,
      data: {
        listing: viewedListing,
        moduleData: await listClassifiedModuleData(),
        recentlyViewed: response.recentlyViewed,
      },
    });
  } catch (viewError) {
    return res.status(500).json({
      success: false,
      message: 'Failed to track the classifieds view.',
      error: viewError.message,
    });
  }
});

router.get('/admin', authenticate, adminOnly, async (req, res) => {
  const appData = await devAppDataStore.readAppData();
  const enabledModules = await getPersistedEnabledModules(appData.enabledModules);
  const classifiedsModuleData = await listClassifiedModuleData({}, {
    includeExpired: true,
    includeRejected: true,
  });
  const realestateProperties = await listRealEstateProperties();
  const restaurants = await listRestaurants();
  const registeredAccounts = await getRegisteredAccountsFromDB();

  return res.json({
    success: true,
    data: {
      businessCategories: appData.businessCategories,
      globeMartCategories: normalizeGlobeMartCategories(appData.globeMartCategories),
      enabledModules,
      moduleBranding: normalizeModuleBranding(appData.moduleBranding),
      registrationApplications: appData.registrationApplications,
      registeredAccounts: registeredAccounts,
      moduleData: {
        ...appData.moduleData,
        ...classifiedsModuleData,
        realestateProperties,
        restaurants,
      },
    },
  });
});

router.post('/registration-applications', registrationUploadFields, async (req, res) => {
  const profilePhoto = await storeRegistrationFile({
    file: req.files?.profilePhoto?.[0],
    ownerEmail: req.body?.email,
    category: 'profile-photo',
  });
  const licenseDocument = await storeRegistrationFile({
    file: req.files?.licenseDocument?.[0],
    ownerEmail: req.body?.email,
    category: 'license-document',
  });
  const identityDocument = await storeRegistrationFile({
    file: req.files?.identityDocument?.[0],
    ownerEmail: req.body?.email,
    category: 'identity-document',
  });
  const foodLicenseDocument = await storeRegistrationFile({
    file: req.files?.foodLicenseDocument?.[0],
    ownerEmail: req.body?.email,
    category: 'food-license-document',
  });

  const { error, value } = applicationSchema.validate(normalizeApplicationBody(req.body), {
    stripUnknown: true,
  });
  if (error) {
    await Promise.all([
      deleteGridFSFile(profilePhoto.fileId),
      deleteGridFSFile(licenseDocument.fileId),
      deleteGridFSFile(identityDocument.fileId),
      deleteGridFSFile(foodLicenseDocument.fileId),
    ]);
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  // Additional validation for email and phone
  if (!validatePhone(value.phone)) {
    await Promise.all([
      deleteGridFSFile(profilePhoto.fileId),
      deleteGridFSFile(licenseDocument.fileId),
      deleteGridFSFile(identityDocument.fileId),
      deleteGridFSFile(foodLicenseDocument.fileId),
    ]);
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format (at least 10 digits required)',
    });
  }

  const registrationPayload = {
    ...value,
    profilePhotoName: profilePhoto.name || value.profilePhotoName,
    profilePhotoFileId: profilePhoto.fileId || value.profilePhotoFileId,
    profilePhotoUrl: profilePhoto.url || value.profilePhotoUrl,
    licenseDocumentName: licenseDocument.name || value.licenseDocumentName,
    licenseDocumentFileId: licenseDocument.fileId || value.licenseDocumentFileId,
    licenseDocumentUrl: licenseDocument.url || value.licenseDocumentUrl,
    identityDocumentName: identityDocument.name || value.identityDocumentName,
    identityDocumentFileId: identityDocument.fileId || value.identityDocumentFileId,
    identityDocumentUrl: identityDocument.url || value.identityDocumentUrl,
    foodLicenseDocumentName:
      foodLicenseDocument.name || value.foodLicenseDocumentName,
    foodLicenseDocumentFileId:
      foodLicenseDocument.fileId || value.foodLicenseDocumentFileId,
    foodLicenseDocumentUrl:
      foodLicenseDocument.url || value.foodLicenseDocumentUrl,
  };

  const normalizedRole = registrationPayload.registrationType === 'entrepreneur' ? 'business' : 'user';
  const nextUserRoles = registrationPayload.registrationType === 'entrepreneur'
    ? ['user', 'entrepreneur']
    : ['user'];

  if (useMemoryAuth()) {
    await devAuthStore.updateUserByEmail(registrationPayload.email, {
      name: registrationPayload.applicantName,
      phone: registrationPayload.phone,
      location: registrationPayload.location,
      businessName: registrationPayload.businessName,
      registrationType: registrationPayload.registrationType,
      role: normalizedRole,
      roles: nextUserRoles,
      selectedBusinessCategories: registrationPayload.selectedBusinessCategories || [],
      selectedCategoryDetails: registrationPayload.selectedBusinessCategories || [],
    });
  } else {
    await User.findOneAndUpdate(
      { email: registrationPayload.email },
      {
        email: registrationPayload.email,
        name: registrationPayload.applicantName,
        phone: registrationPayload.phone,
        location: registrationPayload.location,
        businessName: registrationPayload.businessName,
        registrationType: registrationPayload.registrationType,
        role: normalizedRole,
        roles: nextUserRoles,
        selectedBusinessCategories: registrationPayload.selectedBusinessCategories || [],
        selectedCategoryDetails: registrationPayload.selectedBusinessCategories || [],
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const nextApplications =
      registrationPayload.registrationType === 'entrepreneur'
        ? [
            {
              id: Date.now(),
              submittedAt: new Date().toLocaleDateString(),
              status: 'Pending Review',
              reviewReason: '',
              ...registrationPayload,
            },
            ...currentData.registrationApplications,
          ]
        : currentData.registrationApplications;

    const existingAccount = currentData.registeredAccounts.find(
      (account) => account.email === registrationPayload.email
    );

    let nextAccounts;
    if (existingAccount) {
      const nextRoles = existingAccount.roles.includes(registrationPayload.registrationType)
        ? existingAccount.roles
        : [...existingAccount.roles, registrationPayload.registrationType];

      nextAccounts = currentData.registeredAccounts.map((account) =>
        account.email === registrationPayload.email
          ? {
              ...account,
              roles: nextRoles,
              name: registrationPayload.applicantName,
              businessName: registrationPayload.businessName || account.businessName || '',
              phone: registrationPayload.phone || account.phone || '',
              location: registrationPayload.location || account.location || '',
              selectedBusinessCategories:
                registrationPayload.selectedBusinessCategories ||
                account.selectedBusinessCategories ||
                [],
              profilePhotoName:
                registrationPayload.profilePhotoName || account.profilePhotoName || '',
              profilePhotoFileId:
                registrationPayload.profilePhotoFileId || account.profilePhotoFileId || '',
              profilePhotoUrl:
                registrationPayload.profilePhotoUrl || account.profilePhotoUrl || '',
              licenseDocumentName:
                registrationPayload.licenseDocumentName || account.licenseDocumentName || '',
              licenseDocumentFileId:
                registrationPayload.licenseDocumentFileId ||
                account.licenseDocumentFileId ||
                '',
              licenseDocumentUrl:
                registrationPayload.licenseDocumentUrl || account.licenseDocumentUrl || '',
              identityDocumentName:
                registrationPayload.identityDocumentName || account.identityDocumentName || '',
              identityDocumentFileId:
                registrationPayload.identityDocumentFileId ||
                account.identityDocumentFileId ||
                '',
              identityDocumentUrl:
                registrationPayload.identityDocumentUrl || account.identityDocumentUrl || '',
              foodLicenseNumber:
                registrationPayload.foodLicenseNumber || account.foodLicenseNumber || '',
              foodLicenseAuthority:
                registrationPayload.foodLicenseAuthority || account.foodLicenseAuthority || '',
              foodLicenseDocumentName:
                registrationPayload.foodLicenseDocumentName ||
                account.foodLicenseDocumentName ||
                '',
              foodLicenseDocumentFileId:
                registrationPayload.foodLicenseDocumentFileId ||
                account.foodLicenseDocumentFileId ||
                '',
              foodLicenseDocumentUrl:
                registrationPayload.foodLicenseDocumentUrl ||
                account.foodLicenseDocumentUrl ||
                '',
              entrepreneurApprovalStatus:
                registrationPayload.registrationType === 'entrepreneur'
                  ? 'Pending Review'
                  : account.entrepreneurApprovalStatus || 'Not Requested',
            }
          : account
      );
    } else {
      nextAccounts = [
        ...currentData.registeredAccounts,
        {
          email: registrationPayload.email,
          name: registrationPayload.applicantName,
          roles: [registrationPayload.registrationType],
          businessName: registrationPayload.businessName || '',
          phone: registrationPayload.phone || '',
          location: registrationPayload.location || '',
          selectedBusinessCategories: registrationPayload.selectedBusinessCategories || [],
          profilePhotoName: registrationPayload.profilePhotoName || '',
          profilePhotoFileId: registrationPayload.profilePhotoFileId || '',
          profilePhotoUrl: registrationPayload.profilePhotoUrl || '',
          licenseDocumentName: registrationPayload.licenseDocumentName || '',
          licenseDocumentFileId: registrationPayload.licenseDocumentFileId || '',
          licenseDocumentUrl: registrationPayload.licenseDocumentUrl || '',
          identityDocumentName: registrationPayload.identityDocumentName || '',
          identityDocumentFileId: registrationPayload.identityDocumentFileId || '',
          identityDocumentUrl: registrationPayload.identityDocumentUrl || '',
          foodLicenseNumber: registrationPayload.foodLicenseNumber || '',
          foodLicenseAuthority: registrationPayload.foodLicenseAuthority || '',
          foodLicenseDocumentName: registrationPayload.foodLicenseDocumentName || '',
          foodLicenseDocumentFileId: registrationPayload.foodLicenseDocumentFileId || '',
          foodLicenseDocumentUrl: registrationPayload.foodLicenseDocumentUrl || '',
          entrepreneurApprovalStatus:
            registrationPayload.registrationType === 'entrepreneur'
              ? 'Pending Review'
              : 'Not Requested',
        },
      ];
    }

    return {
      ...currentData,
      registrationApplications: nextApplications,
      registeredAccounts: nextAccounts,
    };
  });

  return res.json({
    success: true,
    data: {
      registrationApplications: nextData.registrationApplications,
      registeredAccounts: nextData.registeredAccounts,
    },
  });
});

router.patch('/registration-applications/:applicationId/review', authenticate, adminOnly, async (req, res) => {
  const normalizedAction = String(req.body?.action || '').trim().toLowerCase();
  const normalizedReason = String(req.body?.reason || '').trim();

  if (!['approve', 'reject'].includes(normalizedAction)) {
    return res.status(400).json({
      success: false,
      message: 'Action must be approve or reject.',
    });
  }

  const applicationId = String(req.params.applicationId);
  const nextStatus = normalizedAction === 'approve' ? 'Approved' : 'Rejected';
  let reviewedApplication = null;

  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const registrationApplications = currentData.registrationApplications.map((application) =>
      String(application.id) === applicationId
        ? {
            ...application,
            status: nextStatus,
            reviewReason: normalizedReason,
            reviewedAt: new Date().toISOString(),
            reviewedBy: req.user.email,
          }
        : application
    );

    const registrationEmail =
      registrationApplications.find((application) => String(application.id) === applicationId)?.email || '';

    const registeredAccounts = currentData.registeredAccounts.map((account) =>
      account.email === registrationEmail
        ? {
            ...account,
            entrepreneurApprovalStatus: nextStatus,
          }
        : account
    );

    reviewedApplication =
      registrationApplications.find((application) => String(application.id) === applicationId) || null;

    return {
      ...currentData,
      registrationApplications,
      registeredAccounts,
    };
  });

  if (!reviewedApplication) {
    return res.status(404).json({
      success: false,
      message: 'Registration application not found.',
    });
  }

  let emailSent = false;
  try {
    emailSent = await sendRegistrationReviewEmail({
      to: reviewedApplication.email,
      applicantName: reviewedApplication.applicantName,
      businessName: reviewedApplication.businessName,
      status: nextStatus,
      reason: normalizedReason,
    });
  } catch (error) {
    logger.error('Failed to send registration review email', {
      applicationId,
      email: reviewedApplication.email,
      error: error.message,
    });
  }

  const completedActionLabel = normalizedAction === 'approve' ? 'approved' : 'rejected';

  return res.json({
    success: true,
    message: emailSent
      ? `Registration ${completedActionLabel} and email sent to entrepreneur.`
      : `Registration ${completedActionLabel}. Email could not be sent.`,
    data: {
      registrationApplications: nextData.registrationApplications,
      registeredAccounts: nextData.registeredAccounts,
      emailSent,
    },
  });
});

router.patch('/module-branding/:moduleId', authenticate, adminOnly, async (req, res) => {
  const normalizedModuleId = normalizeModuleId(req.params.moduleId);
  if (!MODULE_BRANDING_MANAGED_IDS.includes(normalizedModuleId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid module id for branding update.',
    });
  }

  const { error, value } = moduleBrandingSchema.validate(req.body || {}, {
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const currentBranding = normalizeModuleBranding(currentData.moduleBranding);
    const currentRecord = currentBranding[normalizedModuleId] || {
      id: normalizedModuleId,
      name: toDefaultModuleLabel(normalizedModuleId),
      logoUrl: '',
    };

    const nextRecord = {
      ...currentRecord,
      ...(typeof value.name !== 'undefined' ? { name: String(value.name || '').trim() || toDefaultModuleLabel(normalizedModuleId) } : {}),
      ...(typeof value.logoUrl !== 'undefined' ? { logoUrl: String(value.logoUrl || '').trim() } : {}),
    };

    return {
      ...currentData,
      moduleBranding: {
        ...currentBranding,
        [normalizedModuleId]: nextRecord,
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleBranding: normalizeModuleBranding(nextData.moduleBranding),
      module: normalizedModuleId,
    },
  });
});

router.patch('/enabled-modules/:moduleId', authenticate, adminOnly, async (req, res) => {
  // Normalize the module ID to match frontend normalization
  const normalizedModuleId = normalizeModuleId(req.params.moduleId);
  const currentData = await devAppDataStore.readAppData();
  const normalizedExistingModules = await getPersistedEnabledModules(currentData.enabledModules);
  const enabledModules = normalizedExistingModules.includes(normalizedModuleId)
    ? normalizedExistingModules.filter((id) => id !== normalizedModuleId)
    : [...normalizedExistingModules, normalizedModuleId];

  const normalizedEnabledModules = await persistEnabledModules(enabledModules);
  const nextData = await devAppDataStore.updateAppData(async (latestData) => ({
    ...latestData,
    enabledModules: normalizedEnabledModules,
  }));

  return res.json({
    success: true,
    data: {
      enabledModules: normalizeEnabledModules(nextData.enabledModules),
    },
  });
});

router.post('/globemart-categories', authenticate, adminOnly, async (req, res) => {
  const { error, value } = globeMartCategorySchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const normalizedCategory = normalizeGlobeMartCategory({
    id: slugifyCategoryName(value.name),
    name: value.name.trim(),
    theme: value.theme,
    accentColor: value.accentColor,
    subcategories: value.subcategories,
  });

  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const currentCategories = normalizeGlobeMartCategories(currentData.globeMartCategories);
    const alreadyExists = currentCategories.some(
      (category) => category.name.trim().toLowerCase() === normalizedCategory.name.toLowerCase()
    );

    return {
      ...currentData,
      globeMartCategories: alreadyExists
        ? currentCategories
        : [...currentCategories, normalizedCategory],
    };
  });

  return res.json({
    success: true,
    data: {
      globeMartCategories: normalizeGlobeMartCategories(nextData.globeMartCategories),
    },
  });
});

router.post('/globemart-categories/:categoryId/subcategories', authenticate, adminOnly, async (req, res) => {
  const { error, value } = globeMartSubcategorySchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const currentData = await devAppDataStore.readAppData();
  const currentCategories = normalizeGlobeMartCategories(currentData.globeMartCategories);
  const categoryFound = currentCategories.some((category) => category.id === req.params.categoryId);

  if (!categoryFound) {
    return res.status(404).json({
      success: false,
      message: 'GlobeMart category not found.',
    });
  }

  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const latestCategories = normalizeGlobeMartCategories(latestData.globeMartCategories);

    return {
      ...latestData,
      globeMartCategories: latestCategories.map((category) =>
        category.id === req.params.categoryId
          ? {
              ...category,
              subcategories: normalizeSubcategories([...category.subcategories, value.subcategory]),
            }
          : category
      ),
    };
  });

  return res.json({
    success: true,
    data: {
      globeMartCategories: normalizeGlobeMartCategories(nextData.globeMartCategories),
    },
  });
});

router.post('/classifieds/listings', authenticate, createListingLimiter, async (req, res) => {
  const requestedListingType =
    String(req.body?.listingType || '')
      .trim()
      .toLowerCase() === 'buy'
      ? 'buy'
      : 'sell';

  if (!canManageClassifieds(req.user) && requestedListingType !== 'buy') {
    return res.status(403).json({
      success: false,
      message: 'Seller or admin access required to post sell ads. Buy requirements are available to all signed-in users.',
    });
  }

  const { error, value } = classifiedsListingSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const now = new Date().toISOString();
  const sellerName = req.user.businessName?.trim() || req.user.name?.trim() || 'New Seller';
  const sellerRole =
    req.user.email?.trim().toLowerCase() === ADMIN_EMAIL
      ? 'Admin'
      : value.listingType === 'buy'
        ? 'Buyer'
      : req.user.registrationType === 'entrepreneur' || req.user.role === 'business'
        ? 'Micro-entrepreneur'
        : 'Seller';
  const listingId =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `classified-${Date.now()}`;
  const lifecycleFields = buildClassifiedLifecycleFields(value.plan, now);
  const contact = sanitizeClassifiedContact({
    phone: value.contactPhone,
    contactPhone: value.contactPhone,
    whatsappNumber: value.whatsappNumber,
    email: req.user.email,
  });
  const risk = calculateClassifiedRiskScore({
    ...value,
    ...contact,
  });
  const leadPriority = buildClassifiedLeadPriority({
    ...value,
    category: value.category,
    price: value.price,
  });
  const moderationStatus =
    req.user.email?.trim().toLowerCase() === ADMIN_EMAIL
      ? risk.score >= 70
        ? 'pending'
        : 'approved'
      : 'pending';

  const createdListing = normalizeClassifiedsListingRecord({
    id: listingId,
    ...value,
    ...contact,
    listingType: value.listingType,
    ...lifecycleFields,
    seller: sellerName,
    sellerRole,
    sellerEmail: req.user.email,
    locality: value.location,
    image: 'Fresh listing',
    posted: now.slice(0, 10),
    featured: value.plan === 'featured' || value.plan === 'subscription',
    urgent: value.plan === 'urgent',
    verified: req.user.email?.trim().toLowerCase() === ADMIN_EMAIL,
    mediaGallery:
      normalizeClassifiedMediaGallery(value.mediaGallery).length > 0
        ? normalizeClassifiedMediaGallery(value.mediaGallery)
        : Number(value.mediaCount || 0) > 0
          ? Array.from({ length: value.mediaCount }, (_, index) => ({
              id: `classified-media-${index + 1}`,
              url: '',
              fileId: '',
              type: 'image',
              order: index,
              uploadedAt: now,
            }))
          : [],
    contactOptions: ['Chat', 'Call'],
    languageSupport: ['English', 'Malayalam', 'Tamil', 'Hindi'],
    tags: [value.category, value.condition, 'New ad'],
    mapLabel: `${value.location} local discovery zone`,
    monetizationPlan: buildClassifiedPlanLabel(value.plan),
    moderationStatus,
    spamScore: risk.score,
    spamFlags: risk.flags,
    riskScore: risk.score,
    riskFlags: risk.flags,
    safetyLabel: risk.safetyLabel,
    leadPriority,
    reviews: [],
    averageRating: 0,
    totalReviews: 0,
    createdAt: now,
    updatedAt: now,
  });

  if (useMongoClassifieds()) {
    const listing = await createClassifiedAd({
      ...createdListing,
      posted: createdListing.posted,
      messages: [],
      reports: [],
    });

    return res.json({
      success: true,
      data: {
        moduleData: await listClassifiedModuleData(),
        listing,
      },
    });
  }

  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);

    return {
      ...currentData,
      moduleData: {
        ...currentData.moduleData,
        ...currentModuleData,
        classifiedsListings: [createdListing, ...currentModuleData.classifiedsListings],
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: normalizeClassifiedsModule(nextData.moduleData),
      listing: createdListing,
    },
  });
});

router.patch('/classifieds/listings/:listingId', authenticate, async (req, res) => {
  const { error, value } = classifiedsListingUpdateSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  if (useMongoClassifieds()) {
    const matchedListing = await findClassifiedAdById(req.params.listingId);

    if (!matchedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
    const isOwner = matchedListing.sellerEmail === req.user.email?.trim().toLowerCase();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller or admin can update this listing.',
      });
    }

    const lifecycleUpdates =
      value.plan !== undefined ? buildClassifiedLifecycleFields(value.plan, new Date()) : {};
    const planUpdates =
      value.plan !== undefined
        ? {
            featured: value.plan === 'featured' || value.plan === 'subscription',
            urgent: value.plan === 'urgent',
            monetizationPlan: buildClassifiedPlanLabel(value.plan),
          }
        : {};
    const updatedListing = await updateClassifiedAd(req.params.listingId, {
      ...value,
      ...lifecycleUpdates,
      ...planUpdates,
      mediaGallery: normalizeClassifiedMediaGallery(value.mediaGallery),
    });

    return res.json({
      success: true,
      data: {
        moduleData: await listClassifiedModuleData(),
        listing: updatedListing,
      },
    });
  }

  const currentData = await devAppDataStore.readAppData();
  const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);
  const matchedListing = currentModuleData.classifiedsListings.find(
    (listing) => listing.id === req.params.listingId
  );

  if (!matchedListing) {
    return res.status(404).json({
      success: false,
      message: 'Classified listing not found.',
    });
  }

  const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
  const isOwner = matchedListing.sellerEmail === req.user.email?.trim().toLowerCase();

  if (!isAdmin && !isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Only the seller or admin can update this listing.',
    });
  }

  let updatedListing = null;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const latestModuleData = normalizeClassifiedsModule(latestData.moduleData);
    const nextListings = latestModuleData.classifiedsListings.map((listing) => {
      if (listing.id !== req.params.listingId) {
        return listing;
      }

      const lifecycleUpdates =
        value.plan !== undefined ? buildClassifiedLifecycleFields(value.plan, new Date()) : {};
      updatedListing = normalizeClassifiedsListingRecord({
        ...listing,
        ...value,
        ...lifecycleUpdates,
        mediaGallery:
          value.mediaGallery !== undefined
            ? normalizeClassifiedMediaGallery(value.mediaGallery)
            : listing.mediaGallery,
        featured:
          value.plan !== undefined
            ? value.plan === 'featured' || value.plan === 'subscription'
            : listing.featured,
        urgent: value.plan !== undefined ? value.plan === 'urgent' : listing.urgent,
        monetizationPlan:
          value.plan !== undefined ? buildClassifiedPlanLabel(value.plan) : listing.monetizationPlan,
        updatedAt: new Date().toISOString(),
      });

      return updatedListing;
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        ...latestModuleData,
        classifiedsListings: nextListings,
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: normalizeClassifiedsModule(nextData.moduleData),
      listing: updatedListing,
    },
  });
});

router.patch('/classifieds/listings/:listingId/renew', authenticate, async (req, res) => {
  const { error, value } = classifiedsRenewalSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  if (useMongoClassifieds()) {
    const matchedListing = await findClassifiedAdById(req.params.listingId);

    if (!matchedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
    const isOwner = matchedListing.sellerEmail === req.user.email?.trim().toLowerCase();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller or admin can renew this listing.',
      });
    }

    const renewalUpdates = buildClassifiedRenewalFields(matchedListing, value, new Date());
    const updatedListing = await updateClassifiedAd(req.params.listingId, renewalUpdates);

    return res.json({
      success: true,
      data: {
        moduleData: await listClassifiedModuleData(),
        listing: updatedListing,
      },
    });
  }

  const currentData = await devAppDataStore.readAppData();
  const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);
  const matchedListing = currentModuleData.classifiedsListings.find(
    (listing) => listing.id === req.params.listingId
  );

  if (!matchedListing) {
    return res.status(404).json({
      success: false,
      message: 'Classified listing not found.',
    });
  }

  const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
  const isOwner = matchedListing.sellerEmail === req.user.email?.trim().toLowerCase();

  if (!isAdmin && !isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Only the seller or admin can renew this listing.',
    });
  }

  let updatedListing = null;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const latestModuleData = normalizeClassifiedsModule(latestData.moduleData);
    const nextListings = latestModuleData.classifiedsListings.map((listing) => {
      if (listing.id !== req.params.listingId) {
        return listing;
      }

      const renewalUpdates = buildClassifiedRenewalFields(listing, value, new Date());
      updatedListing = normalizeClassifiedsListingRecord({
        ...listing,
        ...renewalUpdates,
        updatedAt: new Date().toISOString(),
      });

      return updatedListing;
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        ...latestModuleData,
        classifiedsListings: nextListings,
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: normalizeClassifiedsModule(nextData.moduleData),
      listing: updatedListing,
    },
  });
});

router.post('/classifieds/listings/:listingId/messages', authenticate, messageLimiter, async (req, res) => {
  const { error, value } = classifiedsMessageSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  if (useMongoClassifieds()) {
    const matchedListing = await findClassifiedAdById(req.params.listingId);

    if (!matchedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    const interactionGuard = getClassifiedPublicInteractionGuard(matchedListing, req.user);
    if (!interactionGuard.allowed) {
      return res.status(interactionGuard.statusCode).json({
        success: false,
        message: interactionGuard.message,
      });
    }

    const updatedListing = await addClassifiedMessage(req.params.listingId, {
      id:
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `classified-message-${Date.now()}`,
      from: req.user.name?.trim() || 'You',
      senderEmail: req.user.email,
      text: value.text,
      createdAt: new Date(),
    });

    if (!updatedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await listClassifiedModuleData(),
      },
    });
  }

  const currentData = await devAppDataStore.readAppData();
  const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);
  const matchedListing = currentModuleData.classifiedsListings.find(
    (listing) => listing.id === req.params.listingId
  );

  if (!matchedListing) {
    return res.status(404).json({
      success: false,
      message: 'Classified listing not found.',
    });
  }

  const interactionGuard = getClassifiedPublicInteractionGuard(matchedListing, req.user);
  if (!interactionGuard.allowed) {
    return res.status(interactionGuard.statusCode).json({
      success: false,
      message: interactionGuard.message,
    });
  }

  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const message = {
      id:
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `classified-message-${Date.now()}`,
      listingId: req.params.listingId,
      from: req.user.name?.trim() || 'You',
      senderEmail: req.user.email,
      text: value.text,
      createdAt: new Date().toISOString(),
    };

    return {
      ...currentData,
      moduleData: {
        ...currentData.moduleData,
        ...currentModuleData,
        classifiedsListings: currentModuleData.classifiedsListings.map((listing) =>
          listing.id === req.params.listingId
            ? {
                ...listing,
                chats: Number(listing.chats || 0) + 1,
                updatedAt: message.createdAt,
              }
            : listing
        ),
        classifiedsMessages: [...currentModuleData.classifiedsMessages, message],
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: normalizeClassifiedsModule(nextData.moduleData),
    },
  });
});

router.post('/classifieds/listings/:listingId/reviews', authenticate, async (req, res) => {
  const { error, value } = classifiedsReviewSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  if (useMongoClassifieds()) {
    const updatedListing = await addClassifiedReview(req.params.listingId, {
      id:
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `classified-review-${Date.now()}`,
      buyerEmail: req.user.email,
      buyerName: req.user.name?.trim() || 'Anonymous',
      rating: value.rating,
      comment: value.comment,
      createdAt: new Date(),
    });

    if (!updatedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await listClassifiedModuleData(),
        listing: updatedListing,
      },
    });
  }

  let listingFound = false;
  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);
    const now = new Date().toISOString();

    const nextListings = currentModuleData.classifiedsListings.map((listing) => {
      if (listing.id !== req.params.listingId) {
        return listing;
      }

      listingFound = true;
      const reviews = [
        {
          id:
            typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `classified-review-${Date.now()}`,
          buyerEmail: req.user.email,
          buyerName: req.user.name?.trim() || 'Anonymous',
          rating: value.rating,
          comment: value.comment,
          createdAt: now,
        },
        ...(Array.isArray(listing.reviews) ? listing.reviews : []),
      ];

      return normalizeClassifiedsListingRecord({
        ...listing,
        reviews,
        totalReviews: reviews.length,
        averageRating:
          reviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0) / reviews.length,
        updatedAt: now,
      });
    });

    return {
      ...currentData,
      moduleData: {
        ...currentData.moduleData,
        ...currentModuleData,
        classifiedsListings: nextListings,
      },
    };
  });

  if (!listingFound) {
    return res.status(404).json({
      success: false,
      message: 'Classified listing not found.',
    });
  }

  return res.json({
    success: true,
    data: {
      moduleData: normalizeClassifiedsModule(nextData.moduleData),
    },
  });
});

router.post('/classifieds/listings/:listingId/reports', authenticate, reportLimiter, async (req, res) => {
  const { error, value } = classifiedsReportSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  if (useMongoClassifieds()) {
    const matchedListing = await findClassifiedAdById(req.params.listingId);

    if (!matchedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    const interactionGuard = getClassifiedPublicInteractionGuard(matchedListing, req.user);
    if (!interactionGuard.allowed) {
      return res.status(interactionGuard.statusCode).json({
        success: false,
        message: interactionGuard.message,
      });
    }

    const updatedListing = await addClassifiedReport(req.params.listingId, {
      id:
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `classified-report-${Date.now()}`,
      reporterEmail: req.user.email,
      reporterName: req.user.name?.trim() || 'User',
      reason: value.reason,
      status: 'open',
      createdAt: new Date(),
    });

    if (!updatedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await listClassifiedModuleData(),
      },
    });
  }

  const currentData = await devAppDataStore.readAppData();
  const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);
  const matchedListing = currentModuleData.classifiedsListings.find(
    (listing) => listing.id === req.params.listingId
  );

  if (!matchedListing) {
    return res.status(404).json({
      success: false,
      message: 'Classified listing not found.',
    });
  }

  const interactionGuard = getClassifiedPublicInteractionGuard(matchedListing, req.user);
  if (!interactionGuard.allowed) {
    return res.status(interactionGuard.statusCode).json({
      success: false,
      message: interactionGuard.message,
    });
  }

  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const report = {
      id:
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `classified-report-${Date.now()}`,
      listingId: req.params.listingId,
      reporterEmail: req.user.email,
      reporterName: req.user.name?.trim() || 'User',
      reason: value.reason,
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    return {
      ...currentData,
      moduleData: {
        ...currentData.moduleData,
        ...currentModuleData,
        classifiedsReports: [...currentModuleData.classifiedsReports, report],
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: normalizeClassifiedsModule(nextData.moduleData),
    },
  });
});

router.patch('/classifieds/listings/:listingId/moderation', authenticate, adminOnly, async (req, res) => {
  const { error, value } = classifiedsModerationSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const moderationNote = String(value.reason || '').trim();
  const moderationTimestamp = new Date().toISOString();

  if (useMongoClassifieds()) {
    const updates =
      value.action === 'approve'
        ? {
            verified: true,
            moderationStatus: 'approved',
            moderationNotes: moderationNote,
            moderationUpdatedAt: moderationTimestamp,
          }
        : value.action === 'flag'
          ? {
              verified: false,
              moderationStatus: 'flagged',
              moderationNotes: moderationNote,
              moderationUpdatedAt: moderationTimestamp,
            }
          : value.action === 'return_to_review'
            ? {
                verified: false,
                moderationStatus: 'pending',
                moderationNotes: moderationNote,
                moderationUpdatedAt: moderationTimestamp,
              }
            : {
                verified: false,
                moderationStatus: 'rejected',
                moderationNotes: moderationNote,
                moderationUpdatedAt: moderationTimestamp,
              };

    const updatedListing = await moderateClassifiedAd(req.params.listingId, updates);

    if (!updatedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await listClassifiedModuleData(),
      },
    });
  }

  const nextData = await devAppDataStore.updateAppData(async (currentData) => {
    const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);
    const nextListings = currentModuleData.classifiedsListings.map((listing) => {
      if (listing.id !== req.params.listingId) {
        return listing;
      }

      if (value.action === 'approve') {
        return {
          ...listing,
          verified: true,
          moderationStatus: 'approved',
          moderationNotes: moderationNote,
          moderationUpdatedAt: moderationTimestamp,
          updatedAt: new Date().toISOString(),
        };
      }

      if (value.action === 'flag') {
        return {
          ...listing,
          verified: false,
          moderationStatus: 'flagged',
          moderationNotes: moderationNote,
          moderationUpdatedAt: moderationTimestamp,
          updatedAt: new Date().toISOString(),
        };
      }

      if (value.action === 'return_to_review') {
        return {
          ...listing,
          verified: false,
          moderationStatus: 'pending',
          moderationNotes: moderationNote,
          moderationUpdatedAt: moderationTimestamp,
          updatedAt: new Date().toISOString(),
        };
      }

      return {
        ...listing,
        verified: false,
        moderationStatus: 'rejected',
        moderationNotes: moderationNote,
        moderationUpdatedAt: moderationTimestamp,
        updatedAt: new Date().toISOString(),
      };
    });

    return {
      ...currentData,
      moduleData: {
        ...currentData.moduleData,
        ...currentModuleData,
        classifiedsListings: nextListings,
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: normalizeClassifiedsModule(nextData.moduleData),
    },
  });
});

router.delete('/classifieds/listings/:listingId', authenticate, async (req, res) => {
  if (useMongoClassifieds()) {
    const matchedListing = await findClassifiedAdById(req.params.listingId);

    if (!matchedListing) {
      return res.status(404).json({
        success: false,
        message: 'Classified listing not found.',
      });
    }

    const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
    const isOwner = matchedListing.sellerEmail === req.user.email?.trim().toLowerCase();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller or admin can delete this listing.',
      });
    }

    await deleteClassifiedAd(req.params.listingId);

    return res.json({
      success: true,
      data: {
        moduleData: await listClassifiedModuleData(),
      },
    });
  }

  const currentData = await devAppDataStore.readAppData();
  const currentModuleData = normalizeClassifiedsModule(currentData.moduleData);
  const matchedListing = currentModuleData.classifiedsListings.find(
    (listing) => listing.id === req.params.listingId
  );

  if (!matchedListing) {
    return res.status(404).json({
      success: false,
      message: 'Classified listing not found.',
    });
  }

  const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
  const isOwner = matchedListing.sellerEmail === req.user.email?.trim().toLowerCase();

  if (!isAdmin && !isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Only the seller or admin can delete this listing.',
    });
  }

  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const latestModuleData = normalizeClassifiedsModule(latestData.moduleData);
    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        ...latestModuleData,
        classifiedsListings: latestModuleData.classifiedsListings.filter(
          (listing) => listing.id !== req.params.listingId
        ),
        classifiedsMessages: latestModuleData.classifiedsMessages.filter(
          (message) => message.listingId !== req.params.listingId
        ),
        classifiedsReports: latestModuleData.classifiedsReports.filter(
          (report) => report.listingId !== req.params.listingId
        ),
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: normalizeClassifiedsModule(nextData.moduleData),
    },
  });
});

router.get('/realestate/listings', authenticate, async (req, res) => {
  try {
    const realestateProperties = await listRealEstateProperties(req.query);
    return res.json({
      success: true,
      data: {
        moduleData: {
          realestateProperties,
        },
        realestateProperties,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load real estate listings.',
      error: error.message,
    });
  }
});

router.get('/realestate/listings/:listingId', authenticate, async (req, res) => {
  try {
    const listing = useMongoRealEstate()
      ? await findRealEstatePropertyById(req.params.listingId)
      : (Array.isArray((await devAppDataStore.readAppData()).moduleData?.realestateProperties)
          ? (await devAppDataStore.readAppData()).moduleData.realestateProperties
              .map(serializeRealEstateProperty)
              .find((item) => matchesRealEstateListingId(item, req.params.listingId))
          : null);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Real-estate listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: {
          realestateProperties: await listRealEstateProperties(req.query),
        },
        listing,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load the real estate listing.',
      error: error.message,
    });
  }
});

router.post('/realestate/listings', authenticate, async (req, res) => {
  const requestedPostingType =
    String(req.body?.postingType || '').trim().toLowerCase() === 'requirement'
      ? 'requirement'
      : 'property';

  if (!canManageRealEstate(req.user) && requestedPostingType !== 'requirement') {
    return res.status(403).json({
      success: false,
      message:
        'Seller or admin access required to post property ads. Buyer requirements are available to all signed-in users.',
    });
  }

  const { error, value } = realEstateListingSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const now = new Date().toISOString();
  const sellerName = req.user.businessName?.trim() || req.user.name?.trim() || 'New Partner';
  const sellerRole =
    value.postingType === 'requirement'
      ? 'Buyer'
      : resolveRealEstateSellerRole(value.roleMode, req.user);
  const ownerId = resolveRealEstateOwnerId(req.user);
  const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
  const budgetLabel =
    value.postingType === 'requirement'
      ? value.minBudget && value.maxBudget
        ? `${value.minBudget} - ${value.maxBudget}`
        : value.maxBudget
          ? `Up to ${value.maxBudget}`
          : value.minBudget
            ? `From ${value.minBudget}`
            : value.priceLabel
      : value.priceLabel;
  const numericPriceValue = Number(String(budgetLabel || '').replace(/[^0-9.]/g, '')) || 0;
  const mediaGallery = Array.isArray(value.mediaGallery)
    ? value.mediaGallery
        .map((media, mediaIndex) => ({
          id: String(media?.id || `realestate-media-${mediaIndex + 1}`).trim(),
          type: String(media?.type || 'image').trim(),
          label: String(media?.label || '').trim(),
          url: String(media?.url || '').trim(),
          thumbnailUrl: String(media?.thumbnailUrl || '').trim(),
          order: Number(media?.order || mediaIndex),
        }))
        .filter((media) => media.url)
    : [];
  const primaryImage =
    mediaGallery.find((media) => media.type === 'image' && media.url)?.url ||
    mediaGallery.find((media) => media.url)?.url ||
    '';
  const listingPayload = {
    postingType: value.postingType,
    title: value.title,
    price: budgetLabel,
    priceLabel: budgetLabel,
    priceValue: numericPriceValue,
    area: `${Math.max(100, Number(value.areaSqft || 0) || 100)} sq ft`,
    areaSqft: Math.max(100, Number(value.areaSqft || 0) || 100),
    location: value.location,
    locality: value.locality || value.location,
    type: value.type,
    intent: value.intent,
    image: primaryImage || 'Fresh listing',
    bedrooms: Number(value.bedrooms || 0),
    bathrooms:
      Number.isFinite(Number(value.bathrooms)) && Number(value.bathrooms) >= 0
        ? Number(value.bathrooms)
        : Number(value.bedrooms || 0) > 0
          ? Math.max(1, Number(value.bedrooms || 0) - 1)
          : 0,
    furnishing: value.furnishing,
    amenities:
      Array.isArray(value.amenities) && value.amenities.length > 0
        ? value.amenities
        : value.postingType === 'requirement' && value.mustHaveAmenities
          ? value.mustHaveAmenities
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
          : ['Photo upload ready', 'Lead capture', 'Map support'],
    minBudget: value.minBudget,
    maxBudget: value.maxBudget,
    preferredLocations: value.preferredLocations,
    mustHaveAmenities: value.mustHaveAmenities,
    moveInDate: value.moveInDate,
    sellerName,
    sellerRole,
    sellerEmail: req.user.email,
    ownerId,
    developer: sellerRole === 'Builder' ? sellerName : '',
    listedBy: sellerRole,
    verified: isAdmin,
    verificationStatus: isAdmin ? 'Verified' : 'Pending approval',
    featured: isAdmin ? Boolean(value.featured) : false,
    postedOn: now.slice(0, 10),
    possession: value.possession || 'Ready to move',
    readyToMove: Boolean(value.readyToMove),
    underConstruction: Boolean(value.underConstruction),
    description:
      value.description ||
      (value.postingType === 'requirement'
        ? 'Buyer requirement posted. Matching owners and agents can respond with suitable options.'
        : 'Freshly posted listing waiting for admin review. Media, map pin, and legal checks can be attached in the next step.'),
    mapLabel: `${value.locality || value.location} growth corridor`,
    mediaGallery,
    videoTourUrl: value.videoTourUrl,
    floorPlanUrl: value.floorPlanUrl,
    brochureUrl: value.brochureUrl,
    mapPreviewUrl: value.mapPreviewUrl,
    mapLocationLat: value.mapLocationLat,
    mapLocationLng: value.mapLocationLng,
    carpetAreaSqft: value.carpetAreaSqft,
    builtUpAreaSqft: value.builtUpAreaSqft,
    landSizeSqft: value.landSizeSqft,
    floorNumber: value.floorNumber,
    totalFloors: value.totalFloors,
    parkingSpots: value.parkingSpots,
    propertyAgeYears: value.propertyAgeYears,
    address: value.address,
    landmark: value.landmark,
    contactPhone: value.contactPhone,
    whatsappNumber: value.whatsappNumber,
    nearbySchoolKm: value.nearbySchoolKm,
    nearbyHospitalKm: value.nearbyHospitalKm,
    nearbyMetroKm: value.nearbyMetroKm,
    reraNumber: value.reraNumber,
    titleDeedStatus: value.titleDeedStatus,
    taxReceipt: Boolean(value.taxReceipt),
    buildingPermit: Boolean(value.buildingPermit),
    encumbranceCertificate: Boolean(value.encumbranceCertificate),
    rating: 0,
    reviewCount: 0,
    premiumPlan:
      value.postingType === 'requirement'
        ? 'Buyer Requirement'
        : Boolean(value.featured) && isAdmin
          ? 'Featured Listing'
          : sellerRole === 'Builder' || sellerRole === 'Agent'
            ? 'Agent Pro'
            : 'Starter',
    mediaCount: Number(value.mediaCount || 0),
    hasVideoTour: Boolean(value.hasVideoTour || value.videoTourUrl),
    projectUnits: value.intent === 'project' ? 1 : 1,
    leads: [],
    visits: [],
    chatPreview: [],
    similarTags: [value.type, value.location, value.intent, value.postingType].filter(Boolean),
    reviews: [],
    reports: [],
    disputeCount: 0,
    languageSupport: ['English', 'Malayalam'],
    status: value.status,
    createdAt: now,
    updatedAt: now,
  };

  if (useMongoRealEstate()) {
    const listing = await createRealEstateProperty(listingPayload);

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
      },
    });
  }

  const createdListing = serializeRealEstateProperty({
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `realestate-${Date.now()}`,
    ...listingPayload,
  });

  const nextData = await devAppDataStore.updateAppData(async (currentData) => ({
    ...currentData,
    moduleData: {
      ...currentData.moduleData,
      realestateProperties: [createdListing, ...(currentData.moduleData?.realestateProperties || [])],
    },
  }));

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
      listing: createdListing,
    },
  });
});

router.patch('/realestate/listings/:listingId', authenticate, async (req, res) => {
  const { error, value } = realEstateListingUpdateSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  if (useMongoRealEstate()) {
    const matchedListing = await findRealEstatePropertyById(req.params.listingId);

    if (!matchedListing) {
      return res.status(404).json({
        success: false,
        message: 'Real-estate listing not found.',
      });
    }

    const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
    if (!isAdmin && !isRealEstateListingOwner(matchedListing, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only the listing owner or admin can update this property.',
      });
    }

    const updates = {
      ...value,
      price: value.priceLabel,
      priceValue:
        value.priceLabel !== undefined
          ? Number(String(value.priceLabel || '').replace(/[^0-9.]/g, '')) || 0
          : undefined,
      area: value.areaSqft !== undefined ? `${Number(value.areaSqft)} sq ft` : undefined,
      locality: value.locality || undefined,
      hasVideoTour:
        value.hasVideoTour !== undefined || value.videoTourUrl !== undefined
          ? Boolean(value.hasVideoTour || value.videoTourUrl)
          : undefined,
      image:
        value.mediaGallery !== undefined
          ? (Array.isArray(value.mediaGallery)
              ? value.mediaGallery.find((media) => String(media?.type || '').trim() === 'image' && media?.url)?.url ||
                value.mediaGallery.find((media) => media?.url)?.url ||
                matchedListing.image
              : matchedListing.image)
          : undefined,
      updatedAt: new Date(),
    };

    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const listing = await updateRealEstateProperty(req.params.listingId, updates);

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
      },
    });
  }

  const currentData = await devAppDataStore.readAppData();
  const currentListings = Array.isArray(currentData.moduleData?.realestateProperties)
    ? currentData.moduleData.realestateProperties.map(serializeRealEstateProperty)
    : [];
  const matchedListing = currentListings.find((listing) =>
    matchesRealEstateListingId(listing, req.params.listingId)
  );

  if (!matchedListing) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
  if (!isAdmin && !isRealEstateListingOwner(matchedListing, req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Only the listing owner or admin can update this property.',
    });
  }

  let updatedListing = null;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const nextListings = (latestData.moduleData?.realestateProperties || []).map((listing) => {
      if (!matchesRealEstateListingId(listing, req.params.listingId)) {
        return listing;
      }

      updatedListing = serializeRealEstateProperty({
        ...listing,
        ...value,
        price: value.priceLabel !== undefined ? value.priceLabel : listing.price,
        priceLabel: value.priceLabel !== undefined ? value.priceLabel : listing.priceLabel,
        priceValue:
          value.priceLabel !== undefined
            ? Number(String(value.priceLabel || '').replace(/[^0-9.]/g, '')) || 0
            : listing.priceValue,
        area: value.areaSqft !== undefined ? `${Number(value.areaSqft)} sq ft` : listing.area,
        locality: value.locality !== undefined ? value.locality || value.location || listing.location : listing.locality,
        image:
          value.mediaGallery !== undefined && Array.isArray(value.mediaGallery)
            ? value.mediaGallery.find((media) => String(media?.type || '').trim() === 'image' && media?.url)?.url ||
              value.mediaGallery.find((media) => media?.url)?.url ||
              listing.image
            : listing.image,
        hasVideoTour:
          value.hasVideoTour !== undefined || value.videoTourUrl !== undefined
            ? Boolean(value.hasVideoTour || value.videoTourUrl)
            : listing.hasVideoTour,
        updatedAt: new Date().toISOString(),
      });

      return {
        ...listing,
        ...value,
        price: updatedListing.price,
        priceLabel: updatedListing.priceLabel,
        priceValue: updatedListing.priceValue,
        area: updatedListing.area,
        locality: updatedListing.locality,
        image: updatedListing.image,
        hasVideoTour: updatedListing.hasVideoTour,
        updatedAt: updatedListing.updatedAt,
      };
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        realestateProperties: nextListings,
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
      listing: updatedListing,
    },
  });
});

router.post('/realestate/listings/:listingId/enquiries', authenticate, async (req, res) => {
  const { error, value } = realEstateEnquirySchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const lead = {
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `realestate-lead-${Date.now()}`,
    name: req.user.name?.trim() || 'Buyer',
    email: req.user.email,
    channel: value.channel,
    priority: value.message ? 'Hot' : 'Warm',
    status: 'new',
    message: value.message,
    followUpAt: null,
    followUpNote: '',
    assignedTo: '',
    lastContactedAt: null,
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  if (useMongoRealEstate()) {
    const listing = await addRealEstateLead(req.params.listingId, lead);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Real-estate listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
      },
    });
  }

  let listingFound = false;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const nextListings = (latestData.moduleData?.realestateProperties || []).map((listing) => {
      if (!matchesRealEstateListingId(listing, req.params.listingId)) {
        return listing;
      }

      listingFound = true;
      return {
        ...listing,
        leads: [...(Array.isArray(listing.leads) ? listing.leads : []), lead],
        updatedAt: new Date().toISOString(),
      };
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        realestateProperties: nextListings,
      },
    };
  });

  if (!listingFound) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
    },
  });
});

router.patch('/realestate/listings/:listingId/leads/:leadId', authenticate, async (req, res) => {
  const { error, value } = realEstateLeadUpdateSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const matchedListing = useMongoRealEstate()
    ? await findRealEstatePropertyById(req.params.listingId)
    : (Array.isArray((await devAppDataStore.readAppData()).moduleData?.realestateProperties)
        ? (await devAppDataStore.readAppData()).moduleData.realestateProperties
            .map(serializeRealEstateProperty)
            .find((listing) => matchesRealEstateListingId(listing, req.params.listingId))
        : null);

  if (!matchedListing) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
  if (!isAdmin && !isRealEstateListingOwner(matchedListing, req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Only the listing owner or admin can update lead status.',
    });
  }

  const existingLeads = Array.isArray(matchedListing.leads) ? matchedListing.leads : [];
  const leadExists = existingLeads.some((lead) => String(lead.id) === String(req.params.leadId));

  if (!leadExists) {
    return res.status(404).json({
      success: false,
      message: 'Lead not found for this property.',
    });
  }

  const nextLeads = existingLeads.map((lead) =>
    String(lead.id) === String(req.params.leadId)
      ? buildRealEstateLeadUpdate(lead, value, new Date())
      : normalizeRealEstateLeadRecord(lead)
  );

  if (useMongoRealEstate()) {
    const listing = await updateRealEstateProperty(req.params.listingId, {
      leads: nextLeads,
      updatedAt: new Date(),
    });

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
      },
    });
  }

  let updatedListing = null;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const nextListings = (latestData.moduleData?.realestateProperties || []).map((listing) => {
      if (!matchesRealEstateListingId(listing, req.params.listingId)) {
        return listing;
      }

      updatedListing = serializeRealEstateProperty({
        ...listing,
        leads: nextLeads,
        updatedAt: new Date().toISOString(),
      });

      return {
        ...listing,
        leads: nextLeads,
        updatedAt: updatedListing.updatedAt,
      };
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        realestateProperties: nextListings,
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
      listing: updatedListing,
    },
  });
});

router.post('/realestate/listings/:listingId/visits', authenticate, async (req, res) => {
  const { error, value } = realEstateVisitSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  if (value.buyerPhone && !validatePhone(value.buyerPhone)) {
    return res.status(400).json({
      success: false,
      message: 'Buyer phone must contain at least 10 digits.',
    });
  }

  const matchedListing = useMongoRealEstate()
    ? await findRealEstatePropertyById(req.params.listingId)
    : (Array.isArray((await devAppDataStore.readAppData()).moduleData?.realestateProperties)
        ? (await devAppDataStore.readAppData()).moduleData.realestateProperties
            .map(serializeRealEstateProperty)
            .find((listing) => matchesRealEstateListingId(listing, req.params.listingId))
        : null);

  if (!matchedListing) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  const scheduledVisit = buildRealEstateVisitRecord(value, req.user, new Date());
  const allProperties = useMongoRealEstate()
    ? await listRealEstateProperties()
    : Array.isArray((await devAppDataStore.readAppData()).moduleData?.realestateProperties)
      ? (await devAppDataStore.readAppData()).moduleData.realestateProperties.map(serializeRealEstateProperty)
      : [];
  const conflictingVisit = findRealEstateVisitConflict(allProperties, scheduledVisit, {
    ownerId: matchedListing.ownerId,
    sellerEmail: matchedListing.sellerEmail,
  });

  if (conflictingVisit) {
    return res.status(409).json({
      success: false,
      message: `Visit slot conflicts with ${conflictingVisit.propertyTitle} at ${new Date(conflictingVisit.scheduledAt).toLocaleString('en-IN')}.`,
      conflict: conflictingVisit,
    });
  }

  const existingLeads = Array.isArray(matchedListing.leads) ? matchedListing.leads : [];
  const nextLeads = existingLeads.map((lead) =>
    value.leadId && String(lead.id) === String(value.leadId)
      ? buildRealEstateLeadUpdate(
          lead,
          {
            status: 'site_visit',
            followUpAt: scheduledVisit.scheduledAt,
            followUpNote:
              String(lead.followUpNote || '').trim() || 'Site visit scheduled from the buyer workspace.',
          },
          new Date()
        )
      : normalizeRealEstateLeadRecord(lead)
  );
  const nextVisits = [
    ...(Array.isArray(matchedListing.visits) ? matchedListing.visits.map(normalizeRealEstateVisitRecord) : []),
    scheduledVisit,
  ];

  if (useMongoRealEstate()) {
    const listing = await updateRealEstateProperty(req.params.listingId, {
      leads: nextLeads,
      visits: nextVisits,
      updatedAt: new Date(),
    });

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
        visit: scheduledVisit,
      },
    });
  }

  let updatedListing = null;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const nextListings = (latestData.moduleData?.realestateProperties || []).map((listing) => {
      if (!matchesRealEstateListingId(listing, req.params.listingId)) {
        return listing;
      }

      updatedListing = serializeRealEstateProperty({
        ...listing,
        leads: nextLeads,
        visits: nextVisits,
        updatedAt: new Date().toISOString(),
      });

      return {
        ...listing,
        leads: nextLeads,
        visits: nextVisits,
        updatedAt: updatedListing.updatedAt,
      };
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        realestateProperties: nextListings,
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
      listing: updatedListing,
      visit: scheduledVisit,
    },
  });
});

router.patch('/realestate/listings/:listingId/visits/:visitId', authenticate, async (req, res) => {
  const { error, value } = realEstateVisitUpdateSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const matchedListing = useMongoRealEstate()
    ? await findRealEstatePropertyById(req.params.listingId)
    : (Array.isArray((await devAppDataStore.readAppData()).moduleData?.realestateProperties)
        ? (await devAppDataStore.readAppData()).moduleData.realestateProperties
            .map(serializeRealEstateProperty)
            .find((listing) => matchesRealEstateListingId(listing, req.params.listingId))
        : null);

  if (!matchedListing) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
  if (!isAdmin && !isRealEstateListingOwner(matchedListing, req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Only the listing owner or admin can update visits.',
    });
  }

  const existingVisits = Array.isArray(matchedListing.visits) ? matchedListing.visits : [];
  const visitExists = existingVisits.some((visit) => String(visit.id) === String(req.params.visitId));

  if (!visitExists) {
    return res.status(404).json({
      success: false,
      message: 'Visit not found for this property.',
    });
  }

  const nextVisits = existingVisits.map((visit) =>
    String(visit.id) === String(req.params.visitId)
      ? buildRealEstateVisitUpdate(visit, value, new Date())
      : normalizeRealEstateVisitRecord(visit)
  );

  const updatedVisit = nextVisits.find((visit) => String(visit.id) === String(req.params.visitId));

  if (updatedVisit && REAL_ESTATE_ACTIVE_VISIT_STATUSES.has(updatedVisit.status)) {
    const allProperties = useMongoRealEstate()
      ? await listRealEstateProperties()
      : Array.isArray((await devAppDataStore.readAppData()).moduleData?.realestateProperties)
        ? (await devAppDataStore.readAppData()).moduleData.realestateProperties.map(serializeRealEstateProperty)
        : [];
    const conflictingVisit = findRealEstateVisitConflict(
      allProperties
        .map((property) =>
          matchesRealEstateListingId(property, req.params.listingId)
            ? { ...property, visits: property.visits.filter((visit) => String(visit.id) !== String(req.params.visitId)) }
            : property
        ),
      updatedVisit,
      {
        ownerId: matchedListing.ownerId,
        sellerEmail: matchedListing.sellerEmail,
      }
    );

    if (conflictingVisit) {
      return res.status(409).json({
        success: false,
        message: `Updated visit conflicts with ${conflictingVisit.propertyTitle} at ${new Date(conflictingVisit.scheduledAt).toLocaleString('en-IN')}.`,
        conflict: conflictingVisit,
      });
    }
  }

  if (useMongoRealEstate()) {
    const listing = await updateRealEstateProperty(req.params.listingId, {
      visits: nextVisits,
      updatedAt: new Date(),
    });

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
        visit: updatedVisit,
      },
    });
  }

  let updatedListing = null;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const nextListings = (latestData.moduleData?.realestateProperties || []).map((listing) => {
      if (!matchesRealEstateListingId(listing, req.params.listingId)) {
        return listing;
      }

      updatedListing = serializeRealEstateProperty({
        ...listing,
        visits: nextVisits,
        updatedAt: new Date().toISOString(),
      });

      return {
        ...listing,
        visits: nextVisits,
        updatedAt: updatedListing.updatedAt,
      };
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        realestateProperties: nextListings,
      },
    };
  });

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
      listing: updatedListing,
      visit: updatedVisit,
    },
  });
});

router.post('/realestate/listings/:listingId/messages', authenticate, async (req, res) => {
  const { error, value } = realEstateMessageSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const message = {
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `realestate-message-${Date.now()}`,
    from: req.user.name?.trim() || 'You',
    senderEmail: req.user.email,
    text: value.text,
    createdAt: new Date(),
  };

  if (useMongoRealEstate()) {
    const listing = await addRealEstateMessage(req.params.listingId, message);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Real-estate listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
      },
    });
  }

  let listingFound = false;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const nextListings = (latestData.moduleData?.realestateProperties || []).map((listing) => {
      if (!matchesRealEstateListingId(listing, req.params.listingId)) {
        return listing;
      }

      listingFound = true;
      return {
        ...listing,
        chatPreview: [...(Array.isArray(listing.chatPreview) ? listing.chatPreview : []), message],
        updatedAt: new Date().toISOString(),
      };
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        realestateProperties: nextListings,
      },
    };
  });

  if (!listingFound) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
    },
  });
});

router.post('/realestate/listings/:listingId/reviews', authenticate, async (req, res) => {
  const { error, value } = realEstateReviewSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const review = {
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `realestate-review-${Date.now()}`,
    author: req.user.name?.trim() || 'Buyer',
    buyerEmail: req.user.email,
    score: value.rating,
    comment: value.comment,
    createdAt: new Date(),
  };

  if (useMongoRealEstate()) {
    const listing = await addRealEstateReview(req.params.listingId, review);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Real-estate listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
      },
    });
  }

  let updatedListing = null;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const nextListings = (latestData.moduleData?.realestateProperties || []).map((listing) => {
      if (!matchesRealEstateListingId(listing, req.params.listingId)) {
        return listing;
      }

      const reviews = [...(Array.isArray(listing.reviews) ? listing.reviews : []), review];
      const averageRating =
        reviews.reduce((sum, item) => sum + Number(item.score || 0), 0) / reviews.length;
      updatedListing = serializeRealEstateProperty({
        ...listing,
        reviews,
        reviewCount: reviews.length,
        rating: averageRating,
        updatedAt: new Date().toISOString(),
      });

      return {
        ...listing,
        reviews,
        reviewCount: updatedListing.reviewCount,
        rating: updatedListing.rating,
        updatedAt: updatedListing.updatedAt,
      };
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        realestateProperties: nextListings,
      },
    };
  });

  if (!updatedListing) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
      listing: updatedListing,
    },
  });
});

router.post('/realestate/listings/:listingId/reports', authenticate, async (req, res) => {
  const { error, value } = realEstateReportSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const report = {
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `realestate-report-${Date.now()}`,
    reporterEmail: req.user.email,
    reporterName: req.user.name?.trim() || 'User',
    reason: value.reason,
    status: 'open',
    createdAt: new Date(),
  };

  if (useMongoRealEstate()) {
    const listing = await addRealEstateReport(req.params.listingId, report);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Real-estate listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
      },
    });
  }

  let updatedListing = null;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const nextListings = (latestData.moduleData?.realestateProperties || []).map((listing) => {
      if (!matchesRealEstateListingId(listing, req.params.listingId)) {
        return listing;
      }

      const reports = [...(Array.isArray(listing.reports) ? listing.reports : []), report];
      updatedListing = serializeRealEstateProperty({
        ...listing,
        reports,
        disputeCount: reports.length,
        updatedAt: new Date().toISOString(),
      });

      return {
        ...listing,
        reports,
        disputeCount: updatedListing.disputeCount,
        updatedAt: updatedListing.updatedAt,
      };
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        realestateProperties: nextListings,
      },
    };
  });

  if (!updatedListing) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
      listing: updatedListing,
    },
  });
});

router.patch('/realestate/listings/:listingId/moderation', authenticate, adminOnly, async (req, res) => {
  const { error, value } = realEstateModerationSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const updates =
    value.action === 'approve'
      ? { verified: true, verificationStatus: 'Verified', updatedAt: new Date() }
      : value.action === 'flag'
        ? { verified: false, verificationStatus: 'Flagged', updatedAt: new Date() }
        : { verified: false, verificationStatus: 'Rejected', updatedAt: new Date() };

  if (useMongoRealEstate()) {
    const listing = await moderateRealEstateProperty(req.params.listingId, updates);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Real-estate listing not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
        listing,
      },
    });
  }

  let listingFound = false;
  const nextData = await devAppDataStore.updateAppData(async (latestData) => {
    const nextListings = (latestData.moduleData?.realestateProperties || []).map((listing) => {
      if (!matchesRealEstateListingId(listing, req.params.listingId)) {
        return listing;
      }

      listingFound = true;
      return {
        ...listing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    });

    return {
      ...latestData,
      moduleData: {
        ...latestData.moduleData,
        realestateProperties: nextListings,
      },
    };
  });

  if (!listingFound) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
    },
  });
});

router.delete('/realestate/listings/:listingId', authenticate, async (req, res) => {
  if (useMongoRealEstate()) {
    const matchedListing = await findRealEstatePropertyById(req.params.listingId);

    if (!matchedListing) {
      return res.status(404).json({
        success: false,
        message: 'Real-estate listing not found.',
      });
    }

    const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
    if (!isAdmin && !isRealEstateListingOwner(matchedListing, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only the listing owner or admin can delete this property.',
      });
    }

    await deleteRealEstateProperty(req.params.listingId);

    return res.json({
      success: true,
      data: {
        moduleData: await buildRealEstateModuleData(),
      },
    });
  }

  const currentData = await devAppDataStore.readAppData();
  const currentListings = Array.isArray(currentData.moduleData?.realestateProperties)
    ? currentData.moduleData.realestateProperties.map(serializeRealEstateProperty)
    : [];
  const matchedListing = currentListings.find((listing) =>
    matchesRealEstateListingId(listing, req.params.listingId)
  );

  if (!matchedListing) {
    return res.status(404).json({
      success: false,
      message: 'Real-estate listing not found.',
    });
  }

  const isAdmin = req.user.email?.trim().toLowerCase() === ADMIN_EMAIL;
  if (!isAdmin && !isRealEstateListingOwner(matchedListing, req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Only the listing owner or admin can delete this property.',
    });
  }

  const nextData = await devAppDataStore.updateAppData(async (latestData) => ({
    ...latestData,
    moduleData: {
      ...latestData.moduleData,
      realestateProperties: (latestData.moduleData?.realestateProperties || []).filter(
        (listing) => !matchesRealEstateListingId(listing, req.params.listingId)
      ),
    },
  }));

  return res.json({
    success: true,
    data: {
      moduleData: {
        realestateProperties: Array.isArray(nextData.moduleData?.realestateProperties)
          ? nextData.moduleData.realestateProperties.map(serializeRealEstateProperty)
          : [],
      },
    },
  });
});

module.exports = router;
module.exports.__testables = {
  normalizeClassifiedsListingRecord,
  normalizeClassifiedsModule,
  normalizeEducationState,
  buildEducationTutorMatches,
  computeEducationProgressDelta,
  buildSkillAssessmentMetrics,
  canTransitionEducationTuitionStatus,
  buildEducationOutcomeMetrics,
  buildEducationInterventions,
  buildEducationCanvaToolkit,
  buildClassifiedPlanLabel,
  buildClassifiedLifecycleFields,
  buildClassifiedRenewalFields,
  normalizeClassifiedSavedSearchRecord,
  matchesClassifiedSavedSearchFilters,
  buildClassifiedSavedSearchSummary,
  getClassifiedPublicInteractionGuard,
  normalizeRealEstateLeadRecord,
  normalizeRealEstateVisitRecord,
  buildRealEstateLeadUpdate,
  buildRealEstateVisitRecord,
  buildRealEstateVisitUpdate,
  findRealEstateVisitConflict,
};
