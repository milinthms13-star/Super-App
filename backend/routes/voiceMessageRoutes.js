const express = require('express');
const router = express.Router();
const voiceMessageService = require('../services/voiceMessageService');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');

const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/webm',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported audio format'));
    }
  },
});

// Upload voice message
router.post('/', authMiddleware, upload.single('audio'), async (req, res) => {
  try {
    const { chatId, options } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const userId = req.user.id;

    const message = await voiceMessageService.uploadVoiceMessage(
      req.file.buffer,
      chatId,
      userId,
      {
        mimeType: req.file.mimetype,
        ...JSON.parse(options || '{}'),
      }
    );

    res.status(201).json({
      success: true,
      message: 'Voice message uploaded successfully',
      data: message,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get voice message
router.get('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    const voiceMessage = await voiceMessageService.getVoiceMessage(messageId);

    res.json({
      success: true,
      data: voiceMessage,
    });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Transcribe voice message
router.post('/:messageId/transcribe', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { language = 'en' } = req.body;

    const transcription = await voiceMessageService.transcribeVoiceMessage(
      messageId,
      language
    );

    res.json({
      success: true,
      message: 'Voice message transcribed successfully',
      data: transcription,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get voice messages in chat
router.get('/chat/:chatId/list', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const messages = await voiceMessageService.getVoiceMessagesInChat(chatId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: messages,
      count: messages.length,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete voice message
router.delete('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const result = await voiceMessageService.deleteVoiceMessage(
      messageId,
      userId
    );

    res.json({
      success: true,
      message: 'Voice message deleted successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get voice message statistics
router.get('/:chatId/stats', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;

    const stats = await voiceMessageService.getVoiceStats(chatId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Stream voice message audio
router.get('/:messageId/stream', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    const voiceMessage = await voiceMessageService.getVoiceMessage(messageId);

    if (!voiceMessage) {
      return res.status(404).json({ error: 'Voice message not found' });
    }

    // In production, stream the audio file
    res.setHeader('Content-Type', voiceMessage.mimeType);
    res.json({
      success: true,
      message: 'Stream setup would happen here',
      data: { url: `/api/voice/${voiceMessage.fileHash}` },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
