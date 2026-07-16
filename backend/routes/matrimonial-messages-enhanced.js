/**
 * Enhanced Messaging Routes with Voice Notes and Images
 */

const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const { uploadToS3 } = require('../config/s3');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const messageLimiter = createModerateRateLimiter({
  maxRequests: 120,
  windowMs: 24 * 60 * 60 * 1000,
});

router.use(authenticate);
router.use(messageLimiter);

// Send image message
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    const { toProfileId } = req.body;
    
    const senderProfile = await MatrimonialProfile.findOne({ userId: req.user._id });
    const receiverProfile = await MatrimonialProfile.findById(toProfileId);

    if (!senderProfile || !receiverProfile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Upload image to S3
    const imageUrl = await uploadToS3(
      req.file.buffer,
      `matrimonial/chat-images/${Date.now()}-${req.file.originalname}`,
      req.file.mimetype
    );

    // Create message
    const message = {
      id: require('crypto').randomUUID(),
      fromProfileId: senderProfile._id,
      toProfileId: receiverProfile._id,
      content: '',
      messageType: 'image',
      imageUrl,
      isRead: false,
      createdAt: new Date(),
    };

    receiverProfile.messages.push(message);
    await receiverProfile.save();

    res.json({
      success: true,
      message: 'Image sent successfully',
      data: message,
    });
  } catch (error) {
    logger.error('Send image message failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send image',
    });
  }
});

// Send voice note
router.post('/voice', upload.single('voiceNote'), async (req, res) => {
  try {
    const { toProfileId } = req.body;
    
    const senderProfile = await MatrimonialProfile.findOne({ userId: req.user._id });
    const receiverProfile = await MatrimonialProfile.findById(toProfileId);

    if (!senderProfile || !receiverProfile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Upload voice note to S3
    const voiceUrl = await uploadToS3(
      req.file.buffer,
      `matrimonial/voice-notes/${Date.now()}-voice-note.webm`,
      'audio/webm'
    );

    // Create message
    const message = {
      id: require('crypto').randomUUID(),
      fromProfileId: senderProfile._id,
      toProfileId: receiverProfile._id,
      content: '',
      messageType: 'voice',
      voiceUrl,
      isRead: false,
      createdAt: new Date(),
    };

    receiverProfile.messages.push(message);
    await receiverProfile.save();

    res.json({
      success: true,
      message: 'Voice note sent successfully',
      data: message,
    });
  } catch (error) {
    logger.error('Send voice note failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send voice note',
    });
  }
});

// Add reaction to message
router.post('/:messageId/react', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Find the message and add reaction
    const message = profile.messages.find(m => m.id === messageId);
    
    if (message) {
      message.reaction = emoji;
      await profile.save();
    }

    res.json({
      success: true,
      message: 'Reaction added',
    });
  } catch (error) {
    logger.error('Add reaction failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reaction',
    });
  }
});

// Get message thread
router.get('/thread/:otherProfileId', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    const messages = profile.messages.filter(
      m => m.fromProfileId.toString() === req.params.otherProfileId ||
           m.toProfileId.toString() === req.params.otherProfileId
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    logger.error('Get message thread failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
    });
  }
});

module.exports = router;
