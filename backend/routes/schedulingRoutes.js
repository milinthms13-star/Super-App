const express = require('express');
const router = express.Router();
const schedulingService = require('../services/schedulingService');
const authMiddleware = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/messaging/v4/scheduled
 * Schedule a message for future delivery
 */
router.post('/', async (req, res) => {
  try {
    const { chatId, content, scheduledTime, mediaUrls, messageType, timezone } = req.body;

    if (!chatId || !content || !scheduledTime) {
      return res.status(400).json({
        error: 'Missing required fields: chatId, content, scheduledTime',
      });
    }

    const scheduledMessage = await schedulingService.scheduleMessage(
      chatId,
      req.user._id,
      content,
      new Date(scheduledTime),
      mediaUrls || [],
      { messageType, timezone }
    );

    res.status(201).json({
      message: 'Message scheduled successfully',
      data: scheduledMessage,
    });
  } catch (error) {
    logger.error('Error scheduling message:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/v4/scheduled
 * Get all scheduled messages for user
 */
router.get('/', async (req, res) => {
  try {
    const { chatId, status, page, limit } = req.query;

    const result = await schedulingService.getScheduledMessages(req.user._id, {
      chatId,
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
    });

    res.json(result);
  } catch (error) {
    logger.error('Error retrieving scheduled messages:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/messaging/v4/scheduled/:id
 * Update a scheduled message
 */
router.put('/:id', async (req, res) => {
  try {
    const { content, scheduledTime } = req.body;

    const updatedMessage = await schedulingService.updateScheduledMessage(req.params.id, {
      content,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
    });

    res.json({
      message: 'Scheduled message updated successfully',
      data: updatedMessage,
    });
  } catch (error) {
    logger.error('Error updating scheduled message:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/messaging/v4/scheduled/:id
 * Cancel a scheduled message
 */
router.delete('/:id', async (req, res) => {
  try {
    const cancelledMessage = await schedulingService.cancelScheduledMessage(req.params.id);

    res.json({
      message: 'Scheduled message cancelled successfully',
      data: cancelledMessage,
    });
  } catch (error) {
    logger.error('Error cancelling scheduled message:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messaging/v4/messages/:id/expire
 * Set message expiration
 */
router.post('/messages/:id/expire', async (req, res) => {
  try {
    const { expiresInSeconds, expirationType } = req.body;

    if (!expiresInSeconds || expiresInSeconds <= 0) {
      return res.status(400).json({ error: 'expiresInSeconds must be a positive number' });
    }

    const expiration = await schedulingService.setMessageExpiration(
      req.params.id,
      expiresInSeconds,
      expirationType || 'timed'
    );

    res.status(201).json({
      message: 'Message expiration set successfully',
      data: expiration,
    });
  } catch (error) {
    logger.error('Error setting message expiration:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messaging/v4/messages/:id/self-destruct
 * Enable self-destruct for message
 */
router.post('/messages/:id/self-destruct', async (req, res) => {
  try {
    const { timerSeconds } = req.body;

    if (!timerSeconds || timerSeconds <= 0) {
      return res.status(400).json({ error: 'timerSeconds must be a positive number' });
    }

    const expiration = await schedulingService.enableSelfDestruct(
      req.params.id,
      timerSeconds
    );

    res.status(201).json({
      message: 'Self-destruct enabled successfully',
      data: expiration,
    });
  } catch (error) {
    logger.error('Error enabling self-destruct:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
