const express = require('express');
const router = express.Router();
const messageScheduleService = require('../services/messageScheduleService');
const authMiddleware = require('../middleware/authMiddleware');

// Schedule message route
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { chatId, content, scheduledTime, options } = req.body;
    const userId = req.user.id;

    const message = await messageScheduleService.scheduleMessage(
      chatId,
      userId,
      content,
      scheduledTime,
      options
    );

    res.status(201).json({
      success: true,
      message: 'Message scheduled successfully',
      data: message,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get scheduled messages for chat
router.get('/:chatId', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const messages = await messageScheduleService.getScheduledMessages(
      chatId,
      { limit: parseInt(limit), offset: parseInt(offset) }
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

// Cancel scheduled message
router.delete('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const result = await messageScheduleService.cancelScheduledMessage(
      messageId,
      userId
    );

    res.json({
      success: true,
      message: 'Scheduled message cancelled',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Reschedule message
router.patch('/:messageId/reschedule', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newTime } = req.body;
    const userId = req.user.id;

    const message = await messageScheduleService.rescheduleMessage(
      messageId,
      newTime,
      userId
    );

    res.json({
      success: true,
      message: 'Message rescheduled successfully',
      data: message,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get schedule statistics
router.get('/:userId/stats', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await messageScheduleService.getScheduleStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get messages by time range
router.post('/time-range/query', authMiddleware, async (req, res) => {
  try {
    const { startTime, endTime, options } = req.body;

    const messages = await messageScheduleService.getMessagesByTimeRange(
      startTime,
      endTime,
      options
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

// Process scheduled messages (admin/cron endpoint)
router.post('/process/pending', authMiddleware, async (req, res) => {
  try {
    const count = await messageScheduleService.processScheduledMessages();

    res.json({
      success: true,
      message: `Processed ${count} scheduled messages`,
      processedCount: count,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
