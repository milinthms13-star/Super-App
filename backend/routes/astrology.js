const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const AstrologyUserProfile = require('../models/AstrologyUserProfile');
const { getSignDetails, normalizeSign, zodiacSigns } = require('../utils/astrologyData');

router.get('/signs', (req, res) => {
  res.json({
    success: true,
    data: zodiacSigns,
  });
});

router.get('/daily/:sign', (req, res) => {
  const sign = normalizeSign(req.params.sign);
  const signDetails = getSignDetails(sign);

  if (!signDetails) {
    return res.status(400).json({
      success: false,
      message: 'Invalid zodiac sign',
    });
  }

  return res.json({
    success: true,
    data: {
      ...signDetails,
      generatedAt: new Date().toISOString(),
    },
  });
});

router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const profile = await AstrologyUserProfile.findOne({ userId }).lean();

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
    const sign = normalizeSign(req.body.sign);
    const signDetails = getSignDetails(sign);

    if (!signDetails) {
      return res.status(400).json({
        success: false,
        message: 'Invalid zodiac sign',
      });
    }

    const update = {
      userId,
      sign,
      birthDate: req.body.birthDate || undefined,
      birthTime: req.body.birthTime || '',
      birthPlace: req.body.birthPlace || '',
      preferences: {
        receiveDailyHoroscope:
          typeof req.body?.preferences?.receiveDailyHoroscope === 'boolean'
            ? req.body.preferences.receiveDailyHoroscope
            : true,
        favoriteTopics: Array.isArray(req.body?.preferences?.favoriteTopics)
          ? req.body.preferences.favoriteTopics
          : [],
      },
    };

    const profile = await AstrologyUserProfile.findOneAndUpdate(
      { userId },
      { $set: update },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

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

module.exports = router;
