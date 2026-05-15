const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const authenticate = require('../middleware/auth');
const { mergeDanceDuet } = require('../services/danceDuetService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 180 * 1024 * 1024 },
});

const supportedVideoMime = /^(video\/(mp4|webm|mov|quicktime|x-matroska)|application\/octet-stream)$/i;
const supportedImageMime = /^(image\/(png|jpeg|jpg))$/i;

const validateFileType = (file, regex, label) => {
  if (!file || !regex.test(String(file.mimetype || ''))) {
    throw new Error(`Invalid ${label} upload. Please provide the correct file type.`);
  }
};

router.get('/meta', authenticate, async (_req, res) => {
  res.json({
    success: true,
    module: 'AI Dance Duet',
    description: 'Upload two dance videos and merge them into one shared performance clip with a unified stage or split-screen layout.',
    features: ['AI duet merge', 'side-by-side and shared background layouts', 'optional green/blue screen removal', 'MP4 export'],
  });
});

router.post(
  '/merge',
  authenticate,
  upload.fields([
    { name: 'video1', maxCount: 1 },
    { name: 'video2', maxCount: 1 },
    { name: 'backgroundImage', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const video1 = req.files.video1?.[0];
      const video2 = req.files.video2?.[0];
      const backgroundImage = req.files.backgroundImage?.[0];

      if (!video1 || !video2) {
        return res.status(400).json({
          success: false,
          message: 'Please upload both dancer videos before merging.',
        });
      }

      validateFileType(video1, supportedVideoMime, 'first video');
      validateFileType(video2, supportedVideoMime, 'second video');
      if (backgroundImage) {
        validateFileType(backgroundImage, supportedImageMime, 'background image');
      }

      const mode = String(req.body.mode || 'side-by-side').trim();
      const backgroundColor = String(req.body.backgroundColor || 'black').trim();
      const removeBackground = String(req.body.removeBackground || 'false').toLowerCase() === 'true';

      const result = await mergeDanceDuet({
        video1Buffer: video1.buffer,
        video2Buffer: video2.buffer,
        backgroundBuffer: backgroundImage?.buffer,
        mode: mode === 'same-background' ? 'same-background' : 'side-by-side',
        backgroundColor,
        removeBackground,
      });

      res.status(201).json({
        success: true,
        message: 'Dance duet created successfully.',
        outputUrl: result.outputUrl,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Dance duet merge failed.',
        error: error.message,
      });
    }
  }
);

module.exports = router;
