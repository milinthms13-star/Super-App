/**
 * Matrimonial Horoscope Routes
 */

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const Horoscope = require('../models/Horoscope');
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const horoscopeMatchingService = require('../utils/horoscopeMatchingService');
const logger = require('../utils/logger');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const horoscopeMatchLimiter = createModerateRateLimiter({
  maxRequests: 80,
  windowMs: 60 * 60 * 1000,
});

const horoscopeUploadLimiter = createModerateRateLimiter({
  maxRequests: 20,
  windowMs: 60 * 60 * 1000,
});

const normalizeObjectId = (value) => {
  const id = String(value || '').trim();
  return mongoose.Types.ObjectId.isValid(id) ? id : '';
};

const parseHoroscopePayload = (value) => {
  if (!value) {
    return {};
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
};

router.post('/horoscope/match', authenticate, horoscopeMatchLimiter, async (req, res) => {
  try {
    const profile1Id = normalizeObjectId(req.body?.profile1Id);
    const profile2Id = normalizeObjectId(req.body?.profile2Id);
    if (!profile1Id || !profile2Id) {
      return res.status(400).json({ success: false, message: 'Valid profile IDs are required' });
    }

    const [horoscope1, horoscope2] = await Promise.all([
      Horoscope.findOne({ profileId: profile1Id }),
      Horoscope.findOne({ profileId: profile2Id }),
    ]);

    if (!horoscope1 || !horoscope2) {
      return res.status(404).json({
        success: false,
        message: 'Horoscope details missing for one or both profiles',
      });
    }

    const result = await horoscopeMatchingService.calculateCompatibilityScore(
      horoscope1,
      horoscope2
    );

    return res.json({
      success: true,
      data: {
        overallScore: Number(result?.overallScore || 0),
        gunaScore: result?.gunaScore || {},
        compatibilityLevel: result?.compatibility || 'unknown',
        recommendation: result?.recommendation || '',
        details: result?.details || {},
      },
    });
  } catch (error) {
    logger.error(`Horoscope match error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to calculate horoscope matching' });
  }
});

router.post(
  '/horoscope/upload',
  authenticate,
  horoscopeUploadLimiter,
  upload.single('horoscope'),
  async (req, res) => {
    try {
      const payload = parseHoroscopePayload(req.body?.data);
      const profileId = normalizeObjectId(payload?.profileId || req.body?.profileId);
      if (!profileId) {
        return res.status(400).json({ success: false, message: 'profileId is required' });
      }

      const update = {
        profileId,
        ...(payload || {}),
        ...(req.file
          ? {
              horoscopeDocument: {
                uploadedAt: new Date(),
                fileName: req.file.originalname,
                fileSize: req.file.size,
                contentType: req.file.mimetype,
                url: '',
              },
            }
          : {}),
      };

      const document = await Horoscope.findOneAndUpdate(
        { profileId },
        { $set: update },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      return res.json({
        success: true,
        message: 'Horoscope details saved',
        data: document,
      });
    } catch (error) {
      logger.error(`Horoscope upload error: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Failed to save horoscope details' });
    }
  }
);

router.get('/horoscope/:profileId', authenticate, async (req, res) => {
  try {
    const profileId = normalizeObjectId(req.params?.profileId);
    if (!profileId) {
      return res.status(400).json({ success: false, message: 'Valid profileId is required' });
    }

    const horoscope = await Horoscope.findOne({ profileId });
    if (!horoscope) {
      return res.status(404).json({ success: false, message: 'Horoscope not found' });
    }

    return res.json({
      success: true,
      data: horoscope,
    });
  } catch (error) {
    logger.error(`Horoscope fetch error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch horoscope' });
  }
});

module.exports = router;

