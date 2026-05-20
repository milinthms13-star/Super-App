const express = require('express');
const multer = require('multer');
const authenticate = require('../middleware/auth');
const { mergeDanceDuet } = require('../services/danceDuetService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 180 * 1024 * 1024 } });
const supportedVideoMime = /^(video\/(mp4|webm|mov|quicktime|x-matroska)|application\/octet-stream)$/i;
const supportedImageMime = /^(image\/(png|jpeg|jpg))$/i;
const supportedAudioMime = /^(audio\/(mpeg|mp3|wav|x-wav|aac|mp4|ogg)|application\/octet-stream)$/i;

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

const uploadFields = upload.fields([
  { name: 'video1', maxCount: 1 },
  { name: 'video2', maxCount: 1 },
  { name: 'videoA', maxCount: 1 },
  { name: 'videoB', maxCount: 1 },
  { name: 'music', maxCount: 1 },
  { name: 'backgroundImage', maxCount: 1 },
]);

const mergeHandler = async (req, res) => {
  try {
    const video1 = req.files.video1?.[0] || req.files.videoA?.[0];
    const video2 = req.files.video2?.[0] || req.files.videoB?.[0];
    const backgroundImage = req.files.backgroundImage?.[0];
    const music = req.files.music?.[0];

    if (!video1 || !video2) {
      return res.status(400).json({ success: false, message: 'Please upload both dancer videos.' });
    }

    validateFileType(video1, supportedVideoMime, 'first dancer video');
    validateFileType(video2, supportedVideoMime, 'second dancer video');
    if (backgroundImage) validateFileType(backgroundImage, supportedImageMime, 'background image');
    if (music) validateFileType(music, supportedAudioMime, 'music track');

    const result = await mergeDanceDuet({
      video1Buffer: video1.buffer,
      video2Buffer: video2.buffer,
      backgroundBuffer: backgroundImage?.buffer,
      musicBuffer: music?.buffer,
      secondVideoDelaySeconds: req.body.delayB || req.body.secondVideoDelaySeconds || 0,
      trimStart1: req.body.trimStart1 || 0,
      trimEnd1: req.body.trimEnd1 || 0,
      trimStart2: req.body.trimStart2 || 0,
      trimEnd2: req.body.trimEnd2 || 0,
      mode: req.body.mode || 'auto',
      outputFormat: req.body.outputFormat || 'reel',
      backgroundColor: req.body.backgroundColor || 'black',
      removeBackground: req.body.removeBackground,
      syncAudio: req.body.syncAudio,
      mirrorSecondVideo: req.body.mirrorSecondVideo,
    });

    res.status(201).json({
      success: true,
      message: 'Dance duet created successfully.',
      outputUrl: result.outputUrl,
      warning: result.warning,
      data: {
        outputUrl: result.outputUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Dance duet merge failed. Try shorter videos or side-by-side mode.', error: error.message });
  }
};

router.post('/merge', authenticate, uploadFields, mergeHandler);

router.post('/export', authenticate, uploadFields, async (req, res) => {
  req.body.mode =
    req.body.mode ||
    (req.body.layout === 'vertical'
      ? 'vertical-reel'
      : req.body.layout === 'overlay'
      ? 'spotlight-stage'
      : 'side-by-side');
  req.body.outputFormat = req.body.outputFormat || (req.body.layout === 'vertical' ? 'reel' : 'landscape');
  return mergeHandler(req, res);
});

module.exports = router;
