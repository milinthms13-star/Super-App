const express = require('express');
const mongoose = require('mongoose');

const { authenticate } = require('../middleware/auth');
const AstrologyUserProfile = require('../models/AstrologyUserProfile');
const devAstrologyStore = require('../utils/devAstrologyStore');
const {
  getDailyHoroscope,
  getSignDetails,
  normalizeSign,
  zodiacSigns,
} = require('../utils/astrologyData');

const router = express.Router();

const shouldUseDevStore = () =>
  process.env.NODE_ENV !== 'production' && mongoose.connection.readyState !== 1;

const parseOptionalDate = (value) => {
  if (!value) {
    return undefined;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
};

const normalizeFavoriteTopics = (topics) =>
  (Array.isArray(topics) ? topics : [])
    .map((topic) => String(topic || '').trim())
    .filter(Boolean);

const normalizeSavedReading = (reading) => {
  const sign = normalizeSign(reading?.sign);
  const signDetails = getSignDetails(sign);
  const horoscope = String(reading?.horoscope || '').trim();

  if (!signDetails || !horoscope) {
    return null;
  }

  return {
    sign,
    horoscope,
    readingDate: parseOptionalDate(reading?.readingDate || reading?.generatedAt || new Date()) || new Date(),
  };
};

const mergeSavedReadings = (existingReadings = [], nextReading) => {
  const normalizedExisting = (Array.isArray(existingReadings) ? existingReadings : [])
    .map((reading) => normalizeSavedReading(reading))
    .filter(Boolean);
  const normalizedNext = normalizeSavedReading(nextReading);

  if (!normalizedNext) {
    return normalizedExisting;
  }

  const nextDayKey = normalizedNext.readingDate.toISOString().slice(0, 10);
  const dedupedReadings = normalizedExisting.filter((reading) => {
    const existingDayKey = new Date(reading.readingDate).toISOString().slice(0, 10);
    return !(reading.sign === normalizedNext.sign && existingDayKey === nextDayKey);
  });

  return [normalizedNext, ...dedupedReadings]
    .sort((left, right) => new Date(right.readingDate) - new Date(left.readingDate))
    .slice(0, 14);
};

const findProfileByUserId = async (userId) => {
  if (shouldUseDevStore()) {
    return devAstrologyStore.findProfile(userId);
  }

  return AstrologyUserProfile.findOne({ userId }).lean();
};

const saveProfileByUserId = async (userId, profile) => {
  if (shouldUseDevStore()) {
    return devAstrologyStore.saveProfile({
      ...profile,
      userId,
    });
  }

  return AstrologyUserProfile.findOneAndUpdate(
    { userId },
    { $set: profile },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  ).lean();
};

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

router.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const existingProfile = await findProfileByUserId(userId);
    const sign = normalizeSign(req.body?.sign || existingProfile?.sign);
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
    const receiveDailyHoroscope =
      typeof req.body?.preferences?.receiveDailyHoroscope === 'boolean'
        ? req.body.preferences.receiveDailyHoroscope
        : typeof existingProfile?.preferences?.receiveDailyHoroscope === 'boolean'
          ? existingProfile.preferences.receiveDailyHoroscope
          : true;
    const dailyReading = getDailyHoroscope(sign);

    const nextProfile = {
      userId,
      sign,
      birthDate,
      birthTime:
        req.body?.birthTime !== undefined
          ? String(req.body.birthTime || '').trim()
          : String(existingProfile?.birthTime || ''),
      birthPlace:
        req.body?.birthPlace !== undefined
          ? String(req.body.birthPlace || '').trim()
          : String(existingProfile?.birthPlace || ''),
      preferences: {
        receiveDailyHoroscope,
        favoriteTopics,
      },
      savedReadings: mergeSavedReadings(existingProfile?.savedReadings, dailyReading),
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

router.__testables = {
  mergeSavedReadings,
  normalizeSavedReading,
  shouldUseDevStore,
};

module.exports = router;
