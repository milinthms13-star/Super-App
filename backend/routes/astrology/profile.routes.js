const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../../middleware/auth');
const {
  findProfileByUserId,
  saveProfileByUserId,
  sanitizeText,
  parseOptionalDate,
  normalizeBirthTimeZone,
  normalizeFavoriteTopics,
  normalizeBoolean,
  normalizeFamilyProfiles,
  normalizeKundliHistory,
  normalizeCompatibilityHistory,
  mergeSavedReadings,
  normalizeSign,
  getSignDetails,
  getDailyHoroscope,
  calculateNakshatra,
  calculateBirthAstroProfile,
  DEFAULT_BIRTH_TIME_ZONE,
} = require('../../services/astrologyBackendService');

const router = express.Router();
const { authenticate } = authMiddleware;

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

const profileValidators = [
  body('sign').optional().isString().isLength({ min: 3, max: 20 }),
  body('birthDate').optional().isISO8601(),
  body('birthTime').optional().matches(/^\d{1,2}:\d{2}(\s?(AM|PM))?$/i),
  body('birthPlace').optional().isString().isLength({ min: 2, max: 120 }),
  body('birthTimezone').optional().isString().isLength({ min: 2, max: 64 }),
  body('nakshatra').optional().isString().isLength({ min: 2, max: 40 }),
  body('rashi').optional().isString().isLength({ min: 2, max: 40 }),
  body('lagna').optional().isString().isLength({ min: 2, max: 40 }),
  body('gender').optional().isString().isLength({ min: 2, max: 30 }),
  body('preferences.favoriteTopics').optional().isArray({ max: 20 }),
  body('preferences.favoriteTopics.*').optional().isString().isLength({ min: 1, max: 40 }),
  body('notifications').optional().isObject(),
  body('familyProfiles').optional().isArray({ max: 20 }),
  body('kundliHistory').optional().isArray({ max: 50 }),
  body('compatibilityHistory').optional().isArray({ max: 50 }),
  validateRequest,
];

/**
 * GET /api/astrology/profile
 * Get current user's astrology profile
 */
router.get('/', authenticate, async (req, res) => {
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
      message: error.message || 'Unable to fetch profile.',
    });
  }
});

/**
 * PUT /api/astrology/profile
 * Update current user's astrology profile
 */
router.put('/', authenticate, profileValidators, async (req, res) => {
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
      message: error.message || 'Unable to update profile.',
    });
  }
});

/**
 * DELETE /api/astrology/profile
 * Delete current user's astrology profile
 */
router.delete('/', authenticate, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    
    // For MongoDB, we can use the model directly
    const AstrologyUserProfile = require('../../models/AstrologyUserProfile');
    await AstrologyUserProfile.deleteOne({ userId });

    return res.json({
      success: true,
      message: 'Profile deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to delete profile.',
    });
  }
});

module.exports = router;
