const express = require('express');
const router = express.Router();
const { authenticate: authMiddleware } = require('../middleware/auth');
const messageForwardingService = require('../services/messageForwardingService');
const logger = require('../utils/logger');

/**
 * Message Forwarding Routes
 * Forward messages to other chats with chain tracking
 * All routes require authentication
 */

// Middleware
router.use(authMiddleware);

/**
 * POST /
 * Forward message to one or multiple chats
 * Body: { messageId, targetChatIds[], metadata? }
 */
router.post('/', async (req, res) => {
  try {
    const { messageId, targetChatIds, metadata } = req.body;
    const userId = req.user._id;

    if (!messageId || !targetChatIds || !Array.isArray(targetChatIds)) {
      return res.status(400).json({
        status: 'error',
        message: 'messageId and targetChatIds (array) are required',
      });
    }

    if (targetChatIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one target chat is required',
      });
    }

    const result = await messageForwardingService.forwardMessage(
      messageId,
      userId,
      targetChatIds,
      { metadata }
    );

    res.status(201).json({
      status: 'success',
      message: 'Message forwarded',
      data: result,
    });
  } catch (error) {
    logger.error('Error forwarding message', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to forward message',
      error: error.message,
    });
  }
});

/**
 * POST /batch
 * Batch forward messages to chats
 * Body: { messageIds[], targetChatIds[] }
 */
router.post('/batch', async (req, res) => {
  try {
    const { messageIds, targetChatIds } = req.body;
    const userId = req.user._id;

    if (!messageIds || !targetChatIds) {
      return res.status(400).json({
        status: 'error',
        message: 'messageIds and targetChatIds are required',
      });
    }

    const results = await messageForwardingService.batchForwardMessages(
      messageIds,
      userId,
      targetChatIds
    );

    res.status(201).json({
      status: 'success',
      message: 'Messages forwarded',
      data: results,
      count: results.length,
    });
  } catch (error) {
    logger.error('Error batch forwarding', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to batch forward messages',
      error: error.message,
    });
  }
});

/**
 * GET /:messageId/chain
 * Get forward chain (trace origin and forwards)
 */
router.get('/:messageId/chain', async (req, res) => {
  try {
    const { messageId } = req.params;

    const chain = await messageForwardingService.getForwardChain(messageId);

    res.status(200).json({
      status: 'success',
      data: chain,
      messageId,
    });
  } catch (error) {
    logger.error('Error getting forward chain', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get forward chain',
      error: error.message,
    });
  }
});

/**
 * GET /:messageId/stats
 * Get forward statistics
 */
router.get('/:messageId/stats', async (req, res) => {
  try {
    const { messageId } = req.params;

    const stats = await messageForwardingService.getForwardStats(messageId);

    res.status(200).json({
      status: 'success',
      data: stats,
      messageId,
    });
  } catch (error) {
    logger.error('Error getting forward stats', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get forward stats',
      error: error.message,
    });
  }
});

/**
 * GET /:messageId/check
 * Check if message was forwarded
 */
router.get('/:messageId/check', async (req, res) => {
  try {
    const { messageId } = req.params;

    const isForwarded = await messageForwardingService.isMessageForwarded(messageId);

    res.status(200).json({
      status: 'success',
      isForwarded,
      messageId,
    });
  } catch (error) {
    logger.error('Error checking if forwarded', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to check forward status',
      error: error.message,
    });
  }
});

/**
 * GET /chat/:chatId/popular
 * Get most forwarded messages in chat
 * Query: limit, offset
 */
router.get('/chat/:chatId/popular', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const messages = await messageForwardingService.getMostForwardedInChat(chatId, {
      limit,
      offset,
    });

    res.status(200).json({
      status: 'success',
      data: messages,
      chatId,
    });
  } catch (error) {
    logger.error('Error getting popular forwards', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get popular forwards',
      error: error.message,
    });
  }
});

module.exports = router;
