const express = require('express');
const crypto = require('crypto');
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../../utils/logger');

const authMiddleware = require('../../middleware/auth');
const NotificationService = require('../../services/NotificationService');
const ABTestingService = require('../../services/abTestingService');
const astrologyProviderService = require('../../services/astrologyProviderService');
const {
  validateAstrologyProfileInput,
  buildAstrologyReportPayload,
  getAstrologyLegalDisclaimer,
} = require('../../utils/astrologyBackendUpgradeHelpers');
const {
  shouldUseDevStore,
  sanitizeText,
  parseOptionalDate,
  isBookingOwner,
  getRequestUserId,
  isConsultantUser,
  getConsultantIdsForUser,
  hasConsultantAccess,
  ensureConsultantScopeAccess,
  ensureBookingAccess,
  DEFAULT_BIRTH_TIME_ZONE,
  normalizeBirthTimeZone,
  normalizeFavoriteTopics,
  normalizeSavedReading,
  mergeSavedReadings,
  normalizeBoolean,
  normalizeFamilyProfiles,
  normalizeKundliHistory,
  normalizeCompatibilityHistory,
  getKundliFallbackProfile,
  buildKundliData,
  buildKundliPdfStream,
  hashText,
  buildCompatibility,
  listConsultantsPersistent,
  getConsultantByIdPersistent,
  updateConsultantByIdPersistent,
  addConsultantSlotPersistent,
  removeConsultantSlotPersistent,
  seedAstrologyConsultantsIfNeeded,
  getPanchangamData,
  getFestivalData,
  findProfileByUserId,
  saveProfileByUserId,
  saveConsultationBookingWithLock,
  listConsultationBookings,
  listAllConsultationBookings,
  findBookingBySlotLock,
  buildBookingIdempotencyKey,
  findConsultationBookingById,
  updateConsultationBookingByIdWithLocks,
  findConsultationBookingByPaymentOrderId,
  createWebhookAuditEvent,
  updateWebhookAuditEvent,
  recordAstrologyOperationalEvent,
  getAstrologyOperationalAlerts,
  formatPeriodStart,
  normalizeReportLanguage,
  buildMonthwisePredictions,
  buildTotalAreaInsights,
  ensurePdfSpace,
  drawScoreBarChart,
  buildAnalyticsMetrics,
  buildAnalyticsCsv,
  buildAnalyticsPdfStream,
  buildHoroscopePdfBuffer,
  razorpay,
  assistantLimiter,
  compatibilityLimiter,
  bookingLimiter,
  paymentLimiter,
  zodiacSigns,
  getDailyHoroscope,
  getSignDetails,
  normalizeSign,
  calculateNakshatra,
  calculateBirthAstroProfile,
} = require('../../services/astrologyBackendService');

const router = express.Router();
const { authenticate, hasAdminPrivileges } = authMiddleware;
const ACTIVE_BOOKING_STATUSES = new Set(['pending', 'pending_payment', 'confirmed', 'completed']);
const MIN_BOOKING_LEAD_TIME_MS = 5 * 60 * 1000;
const ASTRO_CACHE_TTL_MS = 5 * 60 * 1000;
const astrologyRouteCache = {
  panchangam: new Map(),
  festivals: new Map(),
};

const normalizeHexDigest = (value = '', maxLength = 256) =>
  sanitizeText(value, maxLength)
    .toLowerCase()
    .replace(/[^a-f0-9]/g, '');

const isValidHexDigest = (value = '') =>
  typeof value === 'string' && value.length > 0 && value.length % 2 === 0 && /^[a-f0-9]+$/i.test(value);

const secureDigestEquals = (leftDigest = '', rightDigest = '') => {
  const normalizedLeft = normalizeHexDigest(leftDigest);
  const normalizedRight = normalizeHexDigest(rightDigest);

  if (!isValidHexDigest(normalizedLeft) || !isValidHexDigest(normalizedRight)) {
    return false;
  }

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(normalizedLeft, 'hex'),
      Buffer.from(normalizedRight, 'hex')
    );
  } catch (_error) {
    return false;
  }
};

const resolveRazorpaySecret = ({ allowTestFallback = false } = {}) => {
  const configured = String(process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (configured) {
    return configured;
  }

  if (allowTestFallback) {
    return 'test_secret';
  }

  return '';
};

const getWebhookRawBodyBuffer = (req) => {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (Buffer.isBuffer(req.rawBody)) {
    return req.rawBody;
  }
  if (typeof req.body === 'string') {
    return Buffer.from(req.body, 'utf8');
  }
  return Buffer.from(JSON.stringify(req.body || {}), 'utf8');
};

const toBookingDayKey = (value) => {
  const dateValue = parseOptionalDate(value);
  if (!dateValue) {
    return '';
  }
  return dateValue.toISOString().slice(0, 10);
};

const isActiveBookingStatus = (status = '') =>
  ACTIVE_BOOKING_STATUSES.has(String(status || '').toLowerCase());

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  return res.status(400).json({
    success: false,
    message: 'Invalid request payload.',
    errors: errors.array().map((entry) => ({
      field: entry.path,
      message: entry.msg,
    })),
  });
};

const consultantIdParamValidators = [
  param('consultantId').exists().isString().isLength({ min: 3, max: 80 }),
  validateRequest,
];

const consultantSlotActionValidators = [
  body('consultantId').optional().isString().isLength({ min: 3, max: 80 }),
  body('slotTime').optional().isString().isLength({ min: 2, max: 80 }),
  body('slotLabel').optional().isString().isLength({ min: 2, max: 80 }),
  body('slotId').optional().isString().isLength({ min: 2, max: 80 }),
  body().custom((value, { req }) => {
    return Boolean(req.body?.slotTime || req.body?.slotLabel || req.body?.slotId);
  }).withMessage('slotTime, slotLabel, or slotId is required.'),
  validateRequest,
];

const analyticsDashboardValidators = [
  query('period').optional().isString().isLength({ min: 3, max: 16 }),
  validateRequest,
];

const profileValidators = [
  body('sign').optional().isString().isLength({ min: 3, max: 20 }),
  body('birthDate').optional().isISO8601(),
  body('birthTime').optional().matches(/^\d{1,2}:\d{2}(\s?(AM|PM))?$/i),
  body('birthPlace').optional().isString().isLength({ min: 2, max: 120 }),
  body('birthTimezone').optional().isString().isLength({ min: 2, max: 64 }),
  body('preferences.favoriteTopics').optional().isArray({ max: 20 }),
  body('preferences.favoriteTopics.*').optional().isString().isLength({ min: 1, max: 40 }),
  body('notifications').optional().isObject(),
  body('familyProfiles').optional().isArray({ max: 20 }),
  validateRequest,
];

const consultationBookingValidators = [
  body('consultantId').exists().isString().isLength({ min: 3, max: 80 }),
  body('slotId').exists().isString().isLength({ min: 2, max: 80 }),
  body('preferredDate').optional().isISO8601(),
  body('notes').optional().isString().isLength({ max: 280 }),
  validateRequest,
];

const consultationStatusValidators = [
  param('bookingId').isString().isLength({ min: 8, max: 80 }),
  body('status').exists().isIn(['confirmed', 'pending', 'pending_payment', 'completed', 'cancelled']),
  validateRequest,
];

const paymentCreateOrderValidators = [
  param('bookingId').isString().isLength({ min: 8, max: 80 }),
  validateRequest,
];

const paymentVerifyValidators = [
  param('bookingId').isString().isLength({ min: 8, max: 80 }),
  body('orderId').optional().isString().isLength({ min: 5, max: 120 }),
  body('paymentId').exists().isString().isLength({ min: 5, max: 120 }),
  body('signature').exists().isString().isLength({ min: 16, max: 256 }),
  validateRequest,
];

const consultantScopeValidators = [
  body('consultantId').optional().isString().isLength({ min: 3, max: 80 }),
  body('slotTime').optional().isString().isLength({ min: 2, max: 80 }),
  body('slotLabel').optional().isString().isLength({ min: 2, max: 80 }),
  body('slotId').optional().isString().isLength({ min: 2, max: 80 }),
  validateRequest,
];

const consultantQueryValidators = [
  query('consultantId').optional().isString().isLength({ min: 3, max: 80 }),
  validateRequest,
];

const compatibilityValidators = [
  body('sign').exists().isString().isLength({ min: 3, max: 20 }),
  body('partnerSign').exists().isString().isLength({ min: 3, max: 20 }),
  validateRequest,
];

const assistantValidators = [
  body('sign').optional().isString().isLength({ min: 3, max: 20 }),
  body('question').exists().isString().isLength({ min: 3, max: 500 }),
  validateRequest,
];

const analyticsAlertsValidators = [
  query('lookbackHours').optional().isInt({ min: 1, max: 240 }),
  validateRequest,
];

const analyticsReportValidators = [
  query('period').optional().isString().isLength({ min: 3, max: 16 }),
  query('format').optional().isString().isIn(['pdf', 'csv']),
  validateRequest,
];

const horoscopeReportValidators = [
  query('period').optional().isString().isLength({ min: 3, max: 16 }),
  query('sign').optional().isString().isLength({ min: 3, max: 20 }),
  query('language').optional().isString().isLength({ min: 2, max: 8 }),
  validateRequest,
];

const experimentsTrackValidators = [
  body('experimentName').exists().isString().isLength({ min: 3, max: 64 }),
  body('eventType').exists().isString().isLength({ min: 3, max: 32 }),
  body('eventData').optional().isObject(),
  validateRequest,
];

const experimentsResultsValidators = [
  param('experimentName').exists().isString().isLength({ min: 3, max: 64 }),
  validateRequest,
];

const isProduction = process.env.NODE_ENV === 'production';

const toPublicConsultantPayload = (consultant = {}) => ({
  id: sanitizeText(consultant.id || consultant.consultantId, 80),
  name: sanitizeText(consultant.name, 120),
  specialty: sanitizeText(consultant.specialty, 240),
  rate: sanitizeText(consultant.rate, 60),
  amountInr: Number(consultant.amountInr || 0),
  availability: sanitizeText(consultant.availability, 120),
  availableSlots: Array.isArray(consultant.availableSlots)
    ? consultant.availableSlots
        .map((slot) => ({
          id: sanitizeText(slot?.id, 80),
          label: sanitizeText(slot?.label, 80),
          date: sanitizeText(slot?.date, 40),
        }))
        .filter((slot) => slot.id && slot.label)
    : [],
  languages: Array.isArray(consultant.languages)
    ? consultant.languages.map((entry) => sanitizeText(entry, 40)).filter(Boolean)
    : [],
  rating: Number(consultant.rating || 0),
  bio: sanitizeText(consultant.bio, 500),
});

router.get('/signs', (req, res) => {
  res.json({
    success: true,
    data: zodiacSigns,
  });
});

router.get('/daily/:sign', (req, res) => {
  const dailyReading = getDailyHoroscope(req.params.sign);

  if (!dailyReading) {
    return res.status(400).json({
      success: false,
      message: 'Invalid zodiac sign',
    });
  }

  return res.json({
    success: true,
    data: dailyReading,
  });
});

router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const profile = await findProfileByUserId(userId);

    return res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.put('/profile', authenticate, profileValidators, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const existingProfile = await findProfileByUserId(userId);
    const sign = normalizeSign(req.body?.sign || existingProfile?.sign || 'aries');
    const signDetails = getSignDetails(sign);

    if (!signDetails) {
      return res.status(400).json({
        success: false,
        message: 'Invalid zodiac sign',
      });
    }

    const birthDate =
      req.body?.birthDate !== undefined
        ? parseOptionalDate(req.body.birthDate)
        : parseOptionalDate(existingProfile?.birthDate);
    const favoriteTopics =
      req.body?.preferences?.favoriteTopics !== undefined
        ? normalizeFavoriteTopics(req.body.preferences.favoriteTopics)
        : normalizeFavoriteTopics(existingProfile?.preferences?.favoriteTopics);
    const receiveDailyHoroscope = normalizeBoolean(
      req.body?.preferences?.receiveDailyHoroscope,
      normalizeBoolean(existingProfile?.preferences?.receiveDailyHoroscope, true)
    );
    const dailyReading = getDailyHoroscope(sign);

    const birthDateValue =
      req.body?.birthDate !== undefined
        ? req.body.birthDate
        : existingProfile?.birthDate;
    const birthTimeValue =
      req.body?.birthTime !== undefined
        ? req.body.birthTime
        : existingProfile?.birthTime;
    const birthTimezoneValue =
      req.body?.birthTimezone !== undefined
        ? req.body.birthTimezone
        : existingProfile?.birthTimezone;
    const normalizedBirthTimezone = normalizeBirthTimeZone(
      birthTimezoneValue,
      normalizeBirthTimeZone(existingProfile?.birthTimezone, DEFAULT_BIRTH_TIME_ZONE)
    );
    const explicitNakshatra =
      req.body?.nakshatra !== undefined
        ? sanitizeText(req.body.nakshatra, 40)
        : undefined;
    const explicitRashi =
      req.body?.rashi !== undefined
        ? sanitizeText(req.body.rashi, 40)
        : undefined;
    const explicitLagna =
      req.body?.lagna !== undefined
        ? sanitizeText(req.body.lagna, 40)
        : undefined;
    const autoBirthProfile =
      birthDateValue && birthTimeValue
        ? calculateBirthAstroProfile(birthDateValue, birthTimeValue, {
            timeZone: normalizedBirthTimezone,
          })
        : undefined;
    const calculatedNakshatra =
      explicitNakshatra ||
      autoBirthProfile?.nakshatra ||
      (birthDateValue && birthTimeValue
        ? calculateNakshatra(birthDateValue, birthTimeValue, {
            timeZone: normalizedBirthTimezone,
          })
        : undefined);
    const calculatedRashi = explicitRashi || autoBirthProfile?.rashi;

    const nextProfile = {
      userId,
      sign,
      birthDate,
      birthTime:
        req.body?.birthTime !== undefined
          ? sanitizeText(req.body.birthTime, 16)
          : sanitizeText(existingProfile?.birthTime, 16),
      birthPlace:
        req.body?.birthPlace !== undefined
          ? sanitizeText(req.body.birthPlace, 120)
          : sanitizeText(existingProfile?.birthPlace, 120),
      birthTimezone: normalizedBirthTimezone,
      nakshatra:
        explicitNakshatra !== undefined
          ? explicitNakshatra
          : sanitizeText(calculatedNakshatra || existingProfile?.nakshatra || 'Ashwini', 40),
      rashi: sanitizeText(calculatedRashi || existingProfile?.rashi || '', 40),
      lagna: sanitizeText(explicitLagna || existingProfile?.lagna || '', 40),
      gender:
        req.body?.gender !== undefined
          ? sanitizeText(req.body.gender, 30).toLowerCase()
          : sanitizeText(existingProfile?.gender, 30).toLowerCase(),
      preferences: {
        receiveDailyHoroscope,
        favoriteTopics,
      },
      notifications: {
        dailyHoroscope: normalizeBoolean(
          req.body?.notifications?.dailyHoroscope,
          normalizeBoolean(existingProfile?.notifications?.dailyHoroscope, true)
        ),
        goodMuhurtam: normalizeBoolean(
          req.body?.notifications?.goodMuhurtam,
          normalizeBoolean(existingProfile?.notifications?.goodMuhurtam, true)
        ),
        festivalReminders: normalizeBoolean(
          req.body?.notifications?.festivalReminders,
          normalizeBoolean(existingProfile?.notifications?.festivalReminders, true)
        ),
        dashaAlerts: normalizeBoolean(
          req.body?.notifications?.dashaAlerts,
          normalizeBoolean(existingProfile?.notifications?.dashaAlerts, true)
        ),
      },
      familyProfiles:
        req.body?.familyProfiles !== undefined
          ? normalizeFamilyProfiles(req.body.familyProfiles)
          : normalizeFamilyProfiles(existingProfile?.familyProfiles),
      savedReadings: mergeSavedReadings(existingProfile?.savedReadings, dailyReading),
      kundliHistory:
        req.body?.kundliHistory !== undefined
          ? normalizeKundliHistory(req.body.kundliHistory)
          : normalizeKundliHistory(existingProfile?.kundliHistory),
      compatibilityHistory:
        req.body?.compatibilityHistory !== undefined
          ? normalizeCompatibilityHistory(req.body.compatibilityHistory)
          : normalizeCompatibilityHistory(existingProfile?.compatibilityHistory),
    };

    const profile = await saveProfileByUserId(userId, nextProfile);

    return res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

router.get('/panchangam', async (req, res) => {
  const cacheKey = `${sanitizeText(req.query?.date, 32)}|${sanitizeText(req.query?.timezone || 'Asia/Kolkata', 64)}`;
  const cachedEntry = astrologyRouteCache.panchangam.get(cacheKey);
  if (cachedEntry && Date.now() - cachedEntry.cachedAt < ASTRO_CACHE_TTL_MS) {
    return res.json({
      success: true,
      data: cachedEntry.data,
      meta: {
        ...cachedEntry.meta,
        cached: true,
      },
    });
  }

  const result = await astrologyProviderService.getPanchangam({
    date: req.query?.date || '',
    timezone: req.query?.timezone || 'Asia/Kolkata',
    fallbackData: getPanchangamData(),
  });
  logger.info(`Astrology panchangam served from ${result.meta.source}`);
  astrologyRouteCache.panchangam.set(cacheKey, {
    cachedAt: Date.now(),
    data: result.data,
    meta: result.meta,
  });
  return res.json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

router.get('/festivals', async (req, res) => {
  const cacheKey = `${sanitizeText(req.query?.region || 'IN-KL', 24)}|${sanitizeText(req.query?.month, 8)}|${sanitizeText(req.query?.year, 8)}`;
  const cachedEntry = astrologyRouteCache.festivals.get(cacheKey);
  if (cachedEntry && Date.now() - cachedEntry.cachedAt < ASTRO_CACHE_TTL_MS) {
    return res.json({
      success: true,
      data: cachedEntry.data,
      meta: {
        ...cachedEntry.meta,
        cached: true,
      },
    });
  }

  const result = await astrologyProviderService.getFestivals({
    region: req.query?.region || 'IN-KL',
    month: req.query?.month || '',
    year: req.query?.year || '',
    fallbackData: getFestivalData(),
  });
  logger.info(`Astrology festivals served from ${result.meta.source}`);
  astrologyRouteCache.festivals.set(cacheKey, {
    cachedAt: Date.now(),
    data: result.data,
    meta: result.meta,
  });
  return res.json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

router.post('/kundli', authenticate, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const profile = await findProfileByUserId(userId);
    const payloadProfile = req.body?.profile || profile || {};
    const fallbackSign = normalizeSign(payloadProfile?.sign || profile?.sign || 'aries');
    const inputValidation = validateAstrologyProfileInput(payloadProfile);

    if (!inputValidation.ok) {
      return res.status(400).json({
        success: false,
        message: inputValidation.errors[0] || 'Invalid birth profile details.',
        errors: inputValidation.errors,
      });
    }

    const kundliData = buildKundliData(payloadProfile, fallbackSign);
    const reportPayload = buildAstrologyReportPayload(payloadProfile, 'free');

    return res.json({
      success: true,
      data: kundliData,
      meta: {
        reportPayload,
        disclaimer: getAstrologyLegalDisclaimer(),
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to generate Kundli.',
    });
  }
});

router.post('/kundli/report', authenticate, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const profile = await findProfileByUserId(userId);
    const payloadProfile = req.body?.profile || {};
    const fallbackSign = normalizeSign(payloadProfile?.sign || profile?.sign || 'aries');
    const kundliData = buildKundliData(payloadProfile, fallbackSign);
    const profileName = sanitizeText(payloadProfile?.name || req.user?.name || 'Astrology User', 80);
    const reportDate = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="kundli-report-${reportDate}.pdf"`);
    const pdfStream = buildKundliPdfStream(kundliData, profileName);
    pdfStream.on('error', (streamError) => {
      logger.error(`Kundli PDF stream error: ${streamError.message}`);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Unable to generate Kundli PDF report.',
        });
      }
    });
    return pdfStream.pipe(res);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to generate Kundli PDF report.',
    });
  }
});

router.post('/compatibility', compatibilityValidators, compatibilityLimiter, async (req, res) => {
  const sign = normalizeSign(req.body?.sign);
  const partnerSign = normalizeSign(req.body?.partnerSign);

  if (!getSignDetails(sign) || !getSignDetails(partnerSign)) {
    return res.status(400).json({
      success: false,
      message: 'Both sign and partnerSign must be valid zodiac signs.',
    });
  }

  const fallbackData = buildCompatibility(sign, partnerSign);
  const result = await astrologyProviderService.getCompatibility({
    sign,
    partnerSign,
    fallbackData,
  });

  return res.json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

router.post('/assistant', assistantValidators, assistantLimiter, async (req, res) => {
  const sign = normalizeSign(req.body?.sign || 'aries');
  const signDetails = getSignDetails(sign) || zodiacSigns[0];
  const question = sanitizeText(req.body?.question, 500);

  if (!question || question.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a meaningful question for the assistant.',
    });
  }

  const fallbackData = {
    answer: `For ${signDetails.label}, prioritize clear routines and family harmony. Your question suggests focusing on one practical step each day.`,
    tips: [
      'Begin the day with a short calm routine before major decisions.',
      'Use a fixed time window for financial planning and communication.',
      `For ${signDetails.label}, patience and consistency improve outcomes this week.`,
    ],
    sign: signDetails.sign,
    quality: {
      source: 'template-engine',
      guidanceOnly: true,
      isSynthetic: true,
      note: 'Assistant response is currently guidance-oriented template output.',
    },
  };
  const result = await astrologyProviderService.getAssistantReply({
    sign: signDetails.sign,
    question,
    fallbackData,
  });

  return res.json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

router.get('/consultants', async (req, res) => {
  try {
    await seedAstrologyConsultantsIfNeeded();
    const consultants = await listConsultantsPersistent();
    return res.json({
      success: true,
      data: consultants.map((consultant) => toPublicConsultantPayload(consultant)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load consultants.',
    });
  }
});

router.get('/consultants/:consultantId', authenticate, consultantIdParamValidators, async (req, res) => {
  const consultantId = sanitizeText(req.params.consultantId, 80);
  if (!ensureConsultantScopeAccess(req, res, consultantId)) {
    return;
  }
  const consultant = await getConsultantByIdPersistent(consultantId);

  if (!consultant) {
    return res.status(404).json({
      success: false,
      message: 'Consultant not found.',
    });
  }

  return res.json({
    success: true,
    data: consultant,
  });
});

router.put('/consultants/:consultantId', authenticate, consultantIdParamValidators, async (req, res) => {
  const consultantId = sanitizeText(req.params.consultantId, 80);
  if (!ensureConsultantScopeAccess(req, res, consultantId)) {
    return;
  }
  const payload = req.body || {};
  const consultantUpdates = {};

  if (payload.bio !== undefined) {
    consultantUpdates.bio = sanitizeText(payload.bio, 500);
  }

  if (Array.isArray(payload.specialties)) {
    consultantUpdates.specialty = payload.specialties
      .map((item) => sanitizeText(item, 60))
      .filter(Boolean)
      .join(', ');
  }

  if (Array.isArray(payload.languages)) {
    consultantUpdates.languages = payload.languages.map((item) => sanitizeText(item, 40)).filter(Boolean);
  }

  if (Number(payload.rate) > 0) {
    consultantUpdates.rate = `₹${Number(payload.rate).toLocaleString('en-IN')} / 15 min`;
    consultantUpdates.amountInr = Number(payload.rate);
  }

  const consultant = await updateConsultantByIdPersistent(consultantId, {
    ...consultantUpdates,
  });

  if (!consultant) {
    return res.status(404).json({
      success: false,
      message: 'Consultant not found.',
    });
  }

  return res.json({
    success: true,
    data: consultant,
  });
});

router.post('/consultants/add-slot', authenticate, consultantSlotActionValidators, async (req, res) => {
  const consultantId = sanitizeText(req.body?.consultantId || req.user?.consultantId || req.user?.id || '', 80);
  if (!ensureConsultantScopeAccess(req, res, consultantId)) {
    return;
  }
  const slotLabel = sanitizeText(req.body?.slotTime || req.body?.slotLabel, 80);
  const consultant = await addConsultantSlotPersistent(consultantId, slotLabel);

  if (!consultant) {
    return res.status(404).json({
      success: false,
      message: 'Consultant not found.',
    });
  }

  return res.json({
    success: true,
    data: consultant,
  });
});

router.delete('/consultants/remove-slot', authenticate, consultantSlotActionValidators, async (req, res) => {
  const consultantId = sanitizeText(req.body?.consultantId || req.user?.consultantId || req.user?.id || '', 80);
  if (!ensureConsultantScopeAccess(req, res, consultantId)) {
    return;
  }
  const slotLabel = sanitizeText(req.body?.slotTime || req.body?.slotId || '', 80);
  const consultant = await removeConsultantSlotPersistent(consultantId, slotLabel);

  if (!consultant) {
    return res.status(404).json({
      success: false,
      message: 'Consultant not found.',
    });
  }

  return res.json({
    success: true,
    data: consultant,
  });
});

router.post('/consultations/book', authenticate, bookingLimiter, consultationBookingValidators, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const consultant = await getConsultantByIdPersistent(req.body?.consultantId);

    if (!consultant) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consultant selection.',
      });
    }

    const requestedSlotId = sanitizeText(req.body?.slotId || req.body?.slot, 80);
    const chosenSlot = consultant.availableSlots.find((slot) => slot.id === requestedSlotId);

    if (!chosenSlot) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consultation slot selection.',
      });
    }

    const preferredDateInput = req.body?.preferredDate;
    const preferredDate =
      preferredDateInput !== undefined ? parseOptionalDate(preferredDateInput) : new Date();
    if (preferredDateInput !== undefined && !preferredDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid preferredDate value.',
      });
    }
    const scheduledDate = preferredDate || new Date();
    if (scheduledDate.getTime() < Date.now() - MIN_BOOKING_LEAD_TIME_MS) {
      return res.status(400).json({
        success: false,
        message: 'preferredDate cannot be in the past.',
      });
    }
    const notes = sanitizeText(req.body?.notes, 280);
    const bookingDayKey = toBookingDayKey(scheduledDate);
    const slotLockPreview = await findBookingBySlotLock({
      consultantId: consultant.id,
      slot: chosenSlot.label,
      preferredDate: scheduledDate,
    });
    if (slotLockPreview && String(slotLockPreview.userId || '') !== userId) {
      await recordAstrologyOperationalEvent({
        category: 'booking',
        eventType: 'slot_conflict_detected',
        severity: 'warn',
        message: 'Slot booking conflict detected before booking create.',
        consultantId: consultant.id,
        bookingId: String(slotLockPreview.id || slotLockPreview._id || ''),
        userId,
        metadata: {
          slotId: requestedSlotId,
          slotLabel: chosenSlot.label,
          bookingDayKey,
        },
      });
      return res.status(409).json({
        success: false,
        message: 'Selected consultation slot is no longer available.',
      });
    }

    const confirmationCode = `ASTRO-${Date.now().toString(36).toUpperCase()}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const bookingPayload = {
      userId,
      consultantId: consultant.id,
      consultantName: consultant.name,
      slotId: chosenSlot.id,
      slot: chosenSlot.label,
      preferredDate: scheduledDate,
      notes,
      status: consultant.amountInr > 0 ? 'pending_payment' : 'confirmed',
      confirmationCode,
      amountInr: consultant.amountInr,
      currency: 'INR',
      paymentStatus: 'pending',
    };

    const idempotencyKey = sanitizeText(
      req.headers['x-idempotency-key'] ||
        buildBookingIdempotencyKey({
          userId,
          consultantId: consultant.id,
          slot: chosenSlot.label,
          preferredDateDay: bookingDayKey,
        }),
      240
    );
    const bookingResult = await saveConsultationBookingWithLock(bookingPayload, { idempotencyKey });
    const booking = bookingResult.booking;
    if (bookingResult.conflict && String(booking?.userId || '') !== userId) {
      await recordAstrologyOperationalEvent({
        category: 'booking',
        eventType: 'slot_conflict_detected',
        severity: 'warn',
        message: 'Slot lock conflict blocked at DB layer.',
        consultantId: consultant.id,
        bookingId: String(booking?.id || booking?._id || ''),
        userId,
        metadata: {
          slotId: chosenSlot.id,
          slotLabel: chosenSlot.label,
          bookingDayKey,
        },
      });
      return res.status(409).json({
        success: false,
        message: 'Selected consultation slot is no longer available.',
      });
    }
    if (bookingResult.reused && String(booking?.userId || '') === userId) {
      return res.status(200).json({
        success: true,
        data: booking,
        message: 'Existing active booking found for this slot.',
      });
    }

    // 30-min reminder integration with the existing Reminder schedulers
    // (EmailReminderScheduler / In-app reminder delivery via reminders pipeline)
    try {
      const Reminder = require('../../models/Reminder');

      const reminderDueDate = scheduledDate;

      const reminder = await Reminder.create({
        userId,
        title: 'AstroNila Consultation Reminder',
        description: `Your astrology consultation with ${consultant.name} starts in 30 minutes.`,
        category: 'Personal',
        priority: 'Medium',
        dueDate: reminderDueDate,
        dueTime: undefined,
        completed: false,
        status: 'Reminder scheduled',
        reminders: ['Email', 'In-app'],
        reminderBeforeOffsets: [30],
        email: sanitizeText(req.user?.email || '', 200),
        notificationLog: [],
        notificationCount: 0,
        // Helps dedupe/resume later if you extend reminder handling
        data: {
          bookingId: booking.id || booking._id || '',
          confirmationCode,
          consultantId: consultant.id,
        },
      });

      // Keep reference (non-critical)
      // eslint-disable-next-line no-unused-vars
      reminder;
    } catch (_reminderError) {
      // Booking must not fail due to reminder creation issues
    }

    const bookingNotificationData = {
      userEmail: req.user?.email || '',
      userName: sanitizeText(req.user?.name || 'User', 80),
      consultantName: consultant.name,
      slotTime: chosenSlot.label,
      confirmationCode,
      phoneNumber: sanitizeText(req.user?.phone || req.user?.mobile || '', 20),
      consultantEmail: consultant.email,
      bookingCode: confirmationCode,
    };

    await Promise.allSettled([
      NotificationService.sendBookingConfirmationEmail(bookingNotificationData),
      NotificationService.sendBookingConfirmationSMS(bookingNotificationData),
      NotificationService.notifyConsultantOfBooking({
        consultantEmail: consultant.email,
        consultantName: consultant.name,
        userName: bookingNotificationData.userName,
        slotTime: chosenSlot.label,
        bookingCode: confirmationCode,
      }),
    ]);

    return res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to create consultation booking.',
    });
  }
});

router.get('/consultations/consultant-bookings', authenticate, consultantQueryValidators, async (req, res) => {
  try {
    const requestedConsultantId = sanitizeText(req.query?.consultantId || '', 80);
    const consultantId = hasAdminPrivileges(req.user)
      ? requestedConsultantId
      : sanitizeText(requestedConsultantId || req.user?.consultantId || req.user?.id || '', 80);
    if (!ensureConsultantScopeAccess(req, res, consultantId)) {
      return;
    }
    const allBookings = await listAllConsultationBookings();
    const scopedBookings = consultantId
      ? allBookings.filter((booking) => booking.consultantId === consultantId)
      : allBookings;

    return res.json({
      success: true,
      data: scopedBookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load consultant bookings.',
    });
  }
});

router.get('/consultations/consultant-earnings', authenticate, consultantQueryValidators, async (req, res) => {
  try {
    const requestedConsultantId = sanitizeText(req.query?.consultantId || '', 80);
    const consultantId = hasAdminPrivileges(req.user)
      ? requestedConsultantId
      : sanitizeText(requestedConsultantId || req.user?.consultantId || req.user?.id || '', 80);
    if (!ensureConsultantScopeAccess(req, res, consultantId)) {
      return;
    }
    const allBookings = await listAllConsultationBookings();
    const scopedBookings = consultantId
      ? allBookings.filter((booking) => booking.consultantId === consultantId)
      : allBookings;

    const completed = scopedBookings.filter(
      (booking) => booking.status === 'completed' || booking.paymentStatus === 'completed'
    );
    const total = completed.reduce((sum, booking) => sum + Number(booking.amountInr || 0), 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const month = completed
      .filter((booking) => new Date(booking.createdAt || booking.preferredDate || Date.now()) >= monthStart)
      .reduce((sum, booking) => sum + Number(booking.amountInr || 0), 0);

    return res.json({
      success: true,
      data: {
        total,
        month,
        bookings: completed.length,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load consultant earnings.',
    });
  }
});

router.patch(
  '/consultations/:bookingId/status',
  authenticate,
  bookingLimiter,
  consultationStatusValidators,
  async (req, res) => {
  try {
    const bookingId = sanitizeText(req.params.bookingId, 80);
    const nextStatus = sanitizeText(req.body?.status, 20);
    const allowedStatuses = new Set(['confirmed', 'pending', 'pending_payment', 'completed', 'cancelled']);

    if (!allowedStatuses.has(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking status value.',
      });
    }

    const existingBooking = await findConsultationBookingById(bookingId);
    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const requesterIsAdmin = hasAdminPrivileges(req.user);
    const requesterIsOwner = isBookingOwner(existingBooking, req);
    const requesterCanManageConsultant = hasConsultantAccess(req, existingBooking.consultantId);
    if (!requesterIsAdmin && !requesterCanManageConsultant && !requesterIsOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for this booking.',
      });
    }
    if (!requesterIsAdmin && !requesterCanManageConsultant && requesterIsOwner && nextStatus !== 'cancelled') {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own booking.',
      });
    }

    const booking = await updateConsultationBookingByIdWithLocks(bookingId, { status: nextStatus });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    return res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to update booking status.',
    });
  }
});

router.get('/consultations', authenticate, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const bookings = await listConsultationBookings(userId);

    return res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load consultation history.',
    });
  }
});

router.post(
  '/consultations/:bookingId/payment/create-order',
  authenticate,
  paymentLimiter,
  paymentCreateOrderValidators,
  async (req, res) => {
  try {
    const bookingId = sanitizeText(req.params.bookingId, 80);
    const booking = await findConsultationBookingById(bookingId);

    if (!ensureBookingAccess(booking, req, res)) {
      return;
    }

    const amountInr = Number(booking.amountInr || 0);
    if (String(booking.status || '').toLowerCase() === 'cancelled') {
      return res.status(409).json({
        success: false,
        message: 'Cannot create payment order for a cancelled booking.',
      });
    }

    if (isProduction && (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)) {
      logger.error('Astrology payment order blocked: Razorpay credentials are not configured.');
      return res.status(503).json({
        success: false,
        message: 'Payment service temporarily unavailable. Please try again later.',
      });
    }
    if (String(booking.paymentStatus || '').toLowerCase() === 'completed') {
      return res.status(409).json({
        success: false,
        message: 'Payment is already completed for this booking.',
        data: booking,
      });
    }
    if (amountInr < 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking amount for payment.',
      });
    }
    if (
      sanitizeText(booking.paymentOrderId, 120) &&
      String(booking.paymentStatus || '').toLowerCase() === 'pending'
    ) {
      return res.json({
        success: true,
        data: {
          bookingId: booking.id || booking._id || bookingId,
          orderId: booking.paymentOrderId,
          amountInr,
          currency: 'INR',
          keyId: process.env.RAZORPAY_KEY_ID || 'test_key',
          reused: true,
        },
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      receipt: `astro-${booking.confirmationCode || bookingId}`,
      notes: {
        bookingId: String(booking.id || booking._id || bookingId),
        consultantId: booking.consultantId,
        userId: String(req.user._id || req.user.id),
      },
    });

    await updateConsultationBookingByIdWithLocks(booking.id || booking._id || bookingId, {
      paymentOrderId: order.id,
      paymentStatus: 'pending',
      status: 'pending_payment',
    });

    return res.json({
      success: true,
      data: {
        bookingId: booking.id || booking._id || bookingId,
        orderId: order.id,
        amountInr,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID || 'test_key',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to create payment order.',
    });
  }
});

router.post(
  '/consultations/:bookingId/payment/verify',
  authenticate,
  paymentLimiter,
  paymentVerifyValidators,
  async (req, res) => {
  try {
    const bookingId = sanitizeText(req.params.bookingId, 80);
    const { orderId, paymentId, signature } = req.body || {};
    const booking = await findConsultationBookingById(bookingId);

    if (!ensureBookingAccess(booking, req, res)) {
      return;
    }
    const normalizedPaymentId = sanitizeText(paymentId, 120);
    const normalizedSignature = normalizeHexDigest(signature, 200);
    if (!normalizedPaymentId || !normalizedSignature) {
      return res.status(400).json({
        success: false,
        message: 'paymentId and signature are required for verification.',
      });
    }

    if (
      String(booking.paymentStatus || '').toLowerCase() === 'completed' &&
      booking.paymentId &&
      String(booking.paymentId) === normalizedPaymentId
    ) {
      return res.json({
        success: true,
        data: booking,
      });
    }
    if (
      String(booking.paymentStatus || '').toLowerCase() === 'completed' &&
      booking.paymentId &&
      String(booking.paymentId) !== normalizedPaymentId
    ) {
      return res.status(409).json({
        success: false,
        message: 'Booking payment is already completed with a different payment reference.',
      });
    }

    const expectedOrderId = sanitizeText(orderId || booking.paymentOrderId, 120);
    if (!expectedOrderId) {
      return res.status(400).json({
        success: false,
        message: 'orderId is required for verification.',
      });
    }
    if (booking.paymentOrderId && expectedOrderId !== String(booking.paymentOrderId)) {
      return res.status(400).json({
        success: false,
        message: 'Provided orderId does not match booking payment order.',
      });
    }
    const razorpaySecret = resolveRazorpaySecret({
      allowTestFallback: process.env.NODE_ENV !== 'production',
    });
    if (!razorpaySecret) {
      logger.error('Astrology payment verification blocked: RAZORPAY_KEY_SECRET is not configured.');
      return res.status(503).json({
        success: false,
        message: 'Payment verification is temporarily unavailable.',
      });
    }
    const shasum = crypto.createHmac('sha256', razorpaySecret);
    shasum.update(`${expectedOrderId}|${normalizedPaymentId}`);
    const digest = shasum.digest('hex');

    if (!secureDigestEquals(digest, normalizedSignature)) {
      await recordAstrologyOperationalEvent({
        category: 'payment',
        eventType: 'payment_verification_failed',
        severity: 'warn',
        message: 'Payment signature verification failed.',
        consultantId: sanitizeText(booking.consultantId, 120),
        bookingId: String(booking.id || booking._id || bookingId),
        userId: String(req.user?._id || req.user?.id || ''),
        metadata: {
          orderId: expectedOrderId,
          paymentId: normalizedPaymentId,
        },
      });
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed.',
      });
    }

    const updatedBooking = await updateConsultationBookingByIdWithLocks(booking.id || booking._id || bookingId, {
      paymentStatus: 'completed',
      paymentOrderId: expectedOrderId,
      paymentId: normalizedPaymentId,
      paymentSignature: normalizedSignature,
      paymentDate: new Date(),
      status: booking.status === 'cancelled' ? 'cancelled' : 'confirmed',
    });

    return res.json({
      success: true,
      data: updatedBooking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to verify payment.',
    });
  }
});

router.get('/consultations/:bookingId/payment', authenticate, paymentLimiter, async (req, res) => {
  try {
    const bookingId = sanitizeText(req.params.bookingId, 80);
    const booking = await findConsultationBookingById(bookingId);

    if (!ensureBookingAccess(booking, req, res)) {
      return;
    }

    return res.json({
      success: true,
      data: {
        bookingId: booking.id || booking._id || bookingId,
        paymentStatus: booking.paymentStatus || 'pending',
        bookingStatus: booking.status || 'pending_payment',
        paymentOrderId: booking.paymentOrderId || '',
        paymentId: booking.paymentId || '',
        amountInr: Number(booking.amountInr || 0),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to fetch payment status.',
    });
  }
});

router.post('/payment/webhook/razorpay', async (req, res) => {
  let webhookAudit = null;
  let normalizedEventName = '';
  let normalizedEventId = '';
  let normalizedOrderId = '';
  let normalizedPaymentId = '';
  let normalizedBookingId = '';
  let payloadText = '';
  try {
    const signatureHeader = normalizeHexDigest(
      req.headers['x-razorpay-signature'] || req.headers['X-Razorpay-Signature'],
      256
    );
    const webhookSecret =
      String(process.env.RAZORPAY_WEBHOOK_SECRET || '').trim() ||
      resolveRazorpaySecret({ allowTestFallback: process.env.NODE_ENV !== 'production' });
    if (!webhookSecret) {
      logger.error('Astrology webhook blocked: Razorpay webhook secret is not configured.');
      return res.status(503).json({
        success: false,
        message: 'Webhook processing is temporarily unavailable.',
      });
    }

    const rawBodyBuffer = getWebhookRawBodyBuffer(req);
    payloadText = rawBodyBuffer.toString('utf8');
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBodyBuffer)
      .digest('hex');
    let eventPayload = {};
    try {
      eventPayload = payloadText ? JSON.parse(payloadText) : {};
    } catch (_error) {
      eventPayload = {};
    }
    const paymentEntity = eventPayload?.payload?.payment?.entity || {};
    const orderEntity = eventPayload?.payload?.order?.entity || {};
    normalizedEventName = sanitizeText(eventPayload?.event, 80).toLowerCase();
    normalizedOrderId = sanitizeText(
      paymentEntity?.order_id || paymentEntity?.orderId || orderEntity?.id || '',
      120
    );
    normalizedPaymentId = sanitizeText(paymentEntity?.id || paymentEntity?.payment_id || '', 120);
    const notesBookingId = sanitizeText(
      (paymentEntity?.notes && paymentEntity?.notes?.bookingId) ||
        (paymentEntity?.notes && paymentEntity?.notes?.booking_id) ||
        '',
      80
    );
    normalizedBookingId = notesBookingId;
    normalizedEventId = sanitizeText(
      req.headers['x-razorpay-event-id'] ||
        eventPayload?.payload?.payment?.entity?.id ||
        `${normalizedEventName || 'unknown'}:${normalizedOrderId || 'no-order'}:${normalizedPaymentId || 'no-payment'}`,
      160
    );

    webhookAudit = await createWebhookAuditEvent({
      provider: 'razorpay',
      eventId: normalizedEventId,
      eventName: normalizedEventName || 'unknown',
      signature: signatureHeader,
      signatureValid: secureDigestEquals(computedSignature, signatureHeader),
      status: 'received',
      requestPath: req.originalUrl || req.path || '',
      orderId: normalizedOrderId,
      paymentId: normalizedPaymentId,
      bookingId: normalizedBookingId,
      payloadText,
      headersSnapshot: {
        'x-razorpay-signature': sanitizeText(req.headers['x-razorpay-signature'], 256),
        'x-razorpay-event-id': sanitizeText(req.headers['x-razorpay-event-id'], 160),
        'content-type': sanitizeText(req.headers['content-type'], 80),
      },
      sourceIp: sanitizeText(req.ip || req.socket?.remoteAddress || '', 80),
    });

    if (webhookAudit?.status === 'duplicate') {
      return res.status(200).json({
        success: true,
        message: 'Duplicate webhook ignored.',
      });
    }

    if (!signatureHeader || !secureDigestEquals(computedSignature, signatureHeader)) {
      await updateWebhookAuditEvent(webhookAudit?._id || webhookAudit?.id, {
        status: 'invalid_signature',
        signatureValid: false,
        failureReason: 'Invalid Razorpay webhook signature.',
      });
      await recordAstrologyOperationalEvent({
        category: 'webhook',
        eventType: 'webhook_signature_invalid',
        severity: 'critical',
        message: 'Rejected webhook due to signature mismatch.',
        bookingId: normalizedBookingId,
        metadata: {
          eventId: normalizedEventId,
          eventName: normalizedEventName || 'unknown',
          orderId: normalizedOrderId,
          paymentId: normalizedPaymentId,
        },
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid Razorpay webhook signature.',
      });
    }

    if (!normalizedEventName) {
      await updateWebhookAuditEvent(webhookAudit?._id || webhookAudit?.id, {
        status: 'invalid_payload',
        signatureValid: true,
        failureReason: 'Webhook event name is required.',
      });
      return res.status(400).json({
        success: false,
        message: 'Webhook event name is required.',
      });
    }

    let booking = notesBookingId ? await findConsultationBookingById(notesBookingId) : null;
    if (!booking && normalizedOrderId) {
      booking = await findConsultationBookingByPaymentOrderId(normalizedOrderId);
    }

    if (!booking) {
      await updateWebhookAuditEvent(webhookAudit?._id || webhookAudit?.id, {
        status: 'ignored',
        signatureValid: true,
        failureReason: 'Webhook received without booking mapping.',
      });
      logger.warn(
        `Astrology webhook ignored: no booking mapped for event=${normalizedEventName} orderId=${normalizedOrderId}`
      );
      return res.status(202).json({
        success: true,
        message: 'Webhook received. No matching booking found.',
      });
    }
    normalizedBookingId = String(booking.id || booking._id || '');
    if (
      String(booking.paymentStatus || '').toLowerCase() === 'completed' &&
      normalizedPaymentId &&
      String(booking.paymentId || '') === normalizedPaymentId
    ) {
      await updateWebhookAuditEvent(webhookAudit?._id || webhookAudit?.id, {
        status: 'processed',
        signatureValid: true,
        bookingId: normalizedBookingId,
      });
      return res.json({
        success: true,
        message: 'Duplicate webhook ignored.',
        data: booking,
      });
    }

    const normalizedEvent = normalizedEventName || 'unknown';
    const bookingId = booking.id || booking._id;
    const updates = {};
    if (normalizedOrderId) {
      updates.paymentOrderId = normalizedOrderId;
    }
    if (normalizedPaymentId) {
      updates.paymentId = normalizedPaymentId;
    }

    if (normalizedEvent === 'payment.captured' || normalizedEvent === 'payment.authorized') {
      updates.paymentStatus = 'completed';
      updates.paymentDate = new Date();
      updates.status = String(booking.status || '').toLowerCase() === 'cancelled' ? 'cancelled' : 'confirmed';
    } else if (normalizedEvent === 'payment.failed') {
      updates.paymentStatus = 'failed';
      if (String(booking.status || '').toLowerCase() !== 'cancelled') {
        updates.status = 'pending_payment';
      }
    } else if (normalizedEvent === 'order.paid') {
      updates.paymentStatus = 'completed';
      updates.paymentDate = new Date();
      updates.status = String(booking.status || '').toLowerCase() === 'cancelled' ? 'cancelled' : 'confirmed';
    } else {
      updates.paymentStatus = booking.paymentStatus || 'pending';
      updates.status = booking.status || 'pending_payment';
    }

    const updatedBooking = await updateConsultationBookingByIdWithLocks(bookingId, updates);
    await updateWebhookAuditEvent(webhookAudit?._id || webhookAudit?.id, {
      status: 'processed',
      signatureValid: true,
      bookingId: String(bookingId),
      orderId: normalizedOrderId,
      paymentId: normalizedPaymentId,
      metadata: {
        reconciledStatus: updates.status,
        reconciledPaymentStatus: updates.paymentStatus,
      },
    });
    logger.info(
      `Astrology webhook reconciled booking=${bookingId} event=${normalizedEvent} paymentStatus=${updates.paymentStatus}`
    );

    return res.json({
      success: true,
      data: updatedBooking || booking,
    });
  } catch (error) {
    if (webhookAudit?._id || webhookAudit?.id) {
      try {
        await updateWebhookAuditEvent(webhookAudit._id || webhookAudit.id, {
          status: 'error',
          signatureValid: true,
          failureReason: sanitizeText(error.message, 280),
          bookingId: normalizedBookingId,
          orderId: normalizedOrderId,
          paymentId: normalizedPaymentId,
          metadata: {
            eventId: normalizedEventId,
            eventName: normalizedEventName || 'unknown',
          },
        });
      } catch (_auditError) {
        logger.error(`Astrology webhook audit update failed: ${_auditError.message}`);
      }
    }
    await recordAstrologyOperationalEvent({
      category: 'webhook',
      eventType: 'webhook_processing_error',
      severity: 'critical',
      message: sanitizeText(error.message, 280) || 'Webhook reconciliation error.',
      bookingId: normalizedBookingId,
      metadata: {
        eventId: normalizedEventId,
        eventName: normalizedEventName || 'unknown',
        orderId: normalizedOrderId,
        paymentId: normalizedPaymentId,
      },
    });
    logger.error(`Astrology webhook reconciliation failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Unable to process webhook.',
    });
  }
});

router.get('/analytics/dashboard', authenticate, analyticsDashboardValidators, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    }

    const startDate = formatPeriodStart(req.query?.period || 'month');
    const allBookings = await listAllConsultationBookings();
    const filteredBookings = allBookings.filter(
      (booking) => new Date(booking.createdAt || booking.preferredDate || Date.now()) >= startDate
    );
    const metrics = buildAnalyticsMetrics(filteredBookings);

    return res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load analytics dashboard.',
    });
  }
});

router.get('/analytics/alerts', authenticate, analyticsAlertsValidators, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    }

    const lookbackHours = Math.max(1, Math.min(240, Number(req.query?.lookbackHours || 24)));
    const alerts = await getAstrologyOperationalAlerts({ lookbackHours });
    return res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to load alerts dashboard.',
    });
  }
});

router.get('/analytics/report', authenticate, analyticsReportValidators, async (req, res) => {
  try {
    if (!hasAdminPrivileges(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    }

    const period = sanitizeText(req.query?.period || 'month', 16);
    const format = sanitizeText(req.query?.format || 'pdf', 8).toLowerCase();
    const startDate = formatPeriodStart(period);
    const allBookings = await listAllConsultationBookings();
    const filteredBookings = allBookings.filter(
      (booking) => new Date(booking.createdAt || booking.preferredDate || Date.now()) >= startDate
    );
    const metrics = buildAnalyticsMetrics(filteredBookings);

    if (format === 'csv') {
      const csvBuffer = Buffer.from(buildAnalyticsCsv(metrics), 'utf8');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="astrology-report-${period}.csv"`);
      return res.send(csvBuffer);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="astrology-report-${period}.pdf"`);
    const pdfStream = buildAnalyticsPdfStream(metrics, period);
    pdfStream.on('error', (streamError) => {
      logger.error(`Analytics PDF stream error: ${streamError.message}`);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Unable to generate analytics report.',
        });
      }
    });
    return pdfStream.pipe(res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to generate analytics report.',
    });
  }
});

router.get('/horoscope/report', authenticate, horoscopeReportValidators, async (req, res) => {
  try {
    const period = sanitizeText(String(req.query?.period || 'year'), 16).toLowerCase();
    const sign = normalizeSign(String(req.query?.sign || 'aries'));
    const language = normalizeReportLanguage(req.query?.language || 'en');
    const pdfBuffer = await buildHoroscopePdfBuffer(sign, period, language);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="horoscope-report-${sign}-${period}-${language}.pdf"`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to generate horoscope report.',
    });
  }
});

router.get('/experiments/variants', authenticate, async (req, res) => {
  const userId = String(req.user._id || req.user.id);
  const result = await ABTestingService.getUserVariants(userId);

  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: result.error || 'Unable to assign experiment variants.',
    });
  }

  return res.json({
    success: true,
    data: result.variants,
  });
});

router.post('/experiments/track', authenticate, experimentsTrackValidators, async (req, res) => {
  const userId = String(req.user._id || req.user.id);
  const experimentName = sanitizeText(req.body?.experimentName, 64);
  const eventType = sanitizeText(req.body?.eventType, 32);
  const eventData = req.body?.eventData && typeof req.body.eventData === 'object' ? req.body.eventData : {};

  const result = await ABTestingService.trackEvent(userId, experimentName, eventType, eventData);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.error || 'Unable to track experiment event.',
    });
  }

  return res.json({
    success: true,
    data: result,
  });
});

router.get('/experiments/results/:experimentName', authenticate, experimentsResultsValidators, async (req, res) => {
  if (!hasAdminPrivileges(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.',
    });
  }

  const experimentName = sanitizeText(req.params.experimentName, 64);
  const result = await ABTestingService.getExperimentResults(experimentName);

  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: result.error || 'Unable to load experiment results.',
    });
  }

  return res.json({
    success: true,
    data: result,
  });
});

router.get('/experiments', authenticate, async (req, res) => {
  if (!hasAdminPrivileges(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.',
    });
  }

  const result = await ABTestingService.getActiveExperiments();
  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: result.error || 'Unable to load active experiments.',
    });
  }

  return res.json({
    success: true,
    data: result,
  });
});

router.__testables = {
  mergeSavedReadings,
  normalizeSavedReading,
  shouldUseDevStore,
  sanitizeText,
  buildCompatibility,
  normalizeHexDigest,
  secureDigestEquals,
};

module.exports = router;
