const express = require('express');
const multer = require('multer');
const authenticate = require('../middleware/auth');
const { mergeDanceDuet } = require('../services/danceDuetService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 180 * 1024 * 1024 } });
const supportedVideoMime = /^(video\/(mp4|webm|mov|quicktime|x-matroska)|application\/octet-stream)$/i;
const supportedImageMime = /^(image\/(png|jpeg|jpg))$/i;

const validateFileType = (file, regex, label) => {
  if (!file || !regex.test(String(file.mimetype || ''))) {
    throw new Error(`Invalid ${label}. Please upload MP4/WebM/MOV video or PNG/JPG background.`);
  }
};

router.get('/meta', authenticate, async (_req, res) => {
  res.json({
    success: true,
    module: 'AI Dance Duet',
    description: 'Merge two dance videos into one reel, side-by-side duet, or same-stage performance.',
    limits: { maxVideoMb: 180, recommendedSeconds: '10-30' },
    modes: ['auto', 'side-by-side', 'same-background', 'spotlight-stage', 'vertical-reel'],
  });
});

router.post('/merge', authenticate, upload.fields([
  { name: 'video1', maxCount: 1 },
  { name: 'video2', maxCount: 1 },
  { name: 'backgroundImage', maxCount: 1 },
]), async (req, res) => {
  try {
    const video1 = req.files.video1?.[0];
    const video2 = req.files.video2?.[0];
    const backgroundImage = req.files.backgroundImage?.[0];

    if (!video1 || !video2) {
      return res.status(400).json({ success: false, message: 'Please upload both dancer videos.' });
    }

    validateFileType(video1, supportedVideoMime, 'first dancer video');
    validateFileType(video2, supportedVideoMime, 'second dancer video');
    if (backgroundImage) validateFileType(backgroundImage, supportedImageMime, 'background image');

    const result = await mergeDanceDuet({
      video1Buffer: video1.buffer,
      video2Buffer: video2.buffer,
      backgroundBuffer: backgroundImage?.buffer,
      mode: req.body.mode || 'auto',
      outputFormat: req.body.outputFormat || 'reel',
      backgroundColor: req.body.backgroundColor || 'black',
      removeBackground: req.body.removeBackground,
      syncAudio: req.body.syncAudio,
      mirrorSecondVideo: req.body.mirrorSecondVideo,
    });

    res.status(201).json({ success: true, message: 'Dance duet created successfully.', outputUrl: result.outputUrl, warning: result.warning });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Dance duet merge failed. Try shorter videos or side-by-side mode.', error: error.message });
  }
});

module.exports = router;
