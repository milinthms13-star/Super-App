const express = require('express');
const router = express.Router();
const disappearingMessageService = require('../services/disappearingMessageService');
const authMiddleware = require('../middleware/authMiddleware');

// Create disappearing message
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { chatId, content, disappearType, duration, options } = req.body;
    const userId = req.user.id;

    const message = await disappearingMessageService.createDisappearingMessage(
      chatId,
      userId,
      content,
      disappearType,
      duration,
      options
    );

    res.status(201).json({
      success: true,
      message: 'Disappearing message created',
      data: message,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Mark message as viewed
router.post('/:messageId/view', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await disappearingMessageService.markAsViewed(
      messageId,
      userId
    );

    res.json({
      success: true,
      message: 'Message marked as viewed',
      data: message,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Process expired messages (cron job)
router.post('/process/expired', authMiddleware, async (req, res) => {
  try {
    const count = await disappearingMessageService.processExpiredMessages();

    res.json({
      success: true,
      message: `Processed ${count} expired messages`,
      processedCount: count,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete disappearing message
router.delete('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    const result = await disappearingMessageService.deleteDisappearingMessage(
      messageId
    );

    res.json({
      success: true,
      message: 'Disappearing message deleted',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get disappearing messages in chat
router.get('/chat/:chatId', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 20, offset = 0, status = 'active' } = req.query;

    const messages = await disappearingMessageService.getDisappearingMessages(
      chatId,
      {
        limit: parseInt(limit),
        offset: parseInt(offset),
        status,
      }
    );

    res.json({
      success: true,
      data: messages,
      count: messages.length,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get disappearing message statistics
router.get('/:chatId/stats', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;

    const stats = await disappearingMessageService.getDisappearingStats(chatId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Set chat-level disappearing defaults
router.post('/:chatId/defaults', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { disappearType, duration } = req.body;

    const result = await disappearingMessageService.setChatDisappearingDefault(
      chatId,
      disappearType,
      duration
    );

    res.json({
      success: true,
      message: 'Disappearing message defaults updated',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get message view status
router.get('/:messageId/status', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    const status = await disappearingMessageService.getMessageViewStatus(
      messageId
    );

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
