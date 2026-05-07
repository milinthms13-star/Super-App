const express = require('express');
const router = express.Router();
const richMediaService = require('../services/richMediaService');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');

const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/mpeg',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

// Upload media
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { messageId, options } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const media = await richMediaService.uploadMedia(
      req.file.buffer,
      messageId,
      req.file.originalname,
      req.file.mimetype,
      options ? JSON.parse(options) : {}
    );

    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      data: media,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Process image
router.post('/:mediaId/process-image', authMiddleware, async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { options } = req.body;

    const processed = await richMediaService.processImage(
      mediaId,
      options || {}
    );

    res.json({
      success: true,
      message: 'Image processed',
      data: processed,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Process video
router.post('/:mediaId/process-video', authMiddleware, async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { options } = req.body;

    const processed = await richMediaService.processVideo(
      mediaId,
      options || {}
    );

    res.json({
      success: true,
      message: 'Video processed',
      data: processed,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Process document
router.post('/:mediaId/process-document', authMiddleware, async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { mimeType } = req.body;

    const processed = await richMediaService.processDocument(
      mediaId,
      mimeType
    );

    res.json({
      success: true,
      message: 'Document processed',
      data: processed,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get media metadata
router.get('/:mediaId', authMiddleware, async (req, res) => {
  try {
    const { mediaId } = req.params;

    const media = await richMediaService.getMedia(mediaId);

    res.json({
      success: true,
      data: media,
    });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Delete media
router.delete('/:mediaId', authMiddleware, async (req, res) => {
  try {
    const { mediaId } = req.params;

    const result = await richMediaService.deleteMedia(mediaId);

    res.json({
      success: true,
      message: 'Media deleted successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get media for message
router.get('/message/:messageId/all', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    const media = await richMediaService.getMediaForMessage(messageId);

    res.json({
      success: true,
      data: media,
      count: media.length,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
