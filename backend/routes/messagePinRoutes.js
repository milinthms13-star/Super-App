const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const messagePinService = require('../services/messagePinService');
const logger = require('../utils/logger');

/**
 * Message Pin Routes
 * Pin important messages with ordering and auto-cleanup
 * All routes require authentication
 */

// Middleware
router.use(authMiddleware);

/**
 * POST /:messageId
 * Pin message in chat
 * Body: { chatId, reason?, notes? }
 */
router.post('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { chatId, reason, notes } = req.body;
    const userId = req.user._id;

    if (!chatId) {
      return res.status(400).json({
        status: 'error',
        message: 'chatId is required',
      });
    }

    const result = await messagePinService.pinMessage(
      messageId,
      userId,
      chatId,
      { reason, notes }
    );

    res.status(201).json({
      status: 'success',
      message: 'Message pinned',
      data: result,
    });
  } catch (error) {
    logger.error('Error pinning message', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to pin message',
      error: error.message,
    });
  }
});

/**
 * DELETE /:messageId
 * Unpin message from chat
 * Body: { chatId }
 */
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { chatId } = req.body;
    const userId = req.user._id;

    if (!chatId) {
      return res.status(400).json({
        status: 'error',
        message: 'chatId is required',
      });
    }

    await messagePinService.unpinMessage(messageId, userId, chatId);

    res.status(200).json({
      status: 'success',
      message: 'Message unpinned',
      messageId,
    });
  } catch (error) {
    logger.error('Error unpinning message', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to unpin message',
      error: error.message,
    });
  }
});

/**
 * GET /:chatId
 * Get all pinned messages in chat
 * Query: limit, offset, sortBy
 */
router.get('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 10, offset = 0, sortBy = 'pinnedAt' } = req.query;

    const messages = await messagePinService.getPinnedMessages(chatId, {
      limit,
      offset,
      sortBy,
    });

    res.status(200).json({
      status: 'success',
      data: messages,
      chatId,
      count: messages.length,
    });
  } catch (error) {
    logger.error('Error getting pinned messages', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get pinned messages',
      error: error.message,
    });
  }
});

/**
 * GET /:messageId/history
 * Get pin history for message
 */
router.get('/:messageId/history', async (req, res) => {
  try {
    const { messageId } = req.params;

    const history = await messagePinService.getPinHistory(messageId);

    res.status(200).json({
      status: 'success',
      data: history,
      messageId,
    });
  } catch (error) {
    logger.error('Error getting pin history', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get pin history',
      error: error.message,
    });
  }
});

/**
 * GET /:chatId/stats
 * Get pin statistics for chat
 */
router.get('/:chatId/stats', async (req, res) => {
  try {
    const { chatId } = req.params;

    const stats = await messagePinService.getPinStats(chatId);

    res.status(200).json({
      status: 'success',
      data: stats,
      chatId,
    });
  } catch (error) {
    logger.error('Error getting pin stats', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get pin stats',
      error: error.message,
    });
  }
});

/**
 * PUT /:messageId/reorder
 * Reorder pin (move up/down)
 * Body: { chatId, direction (up/down) }
 */
router.put('/:messageId/reorder', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { chatId, direction } = req.body;
    const userId = req.user._id;

    if (!chatId || !direction) {
      return res.status(400).json({
        status: 'error',
        message: 'chatId and direction (up/down) are required',
      });
    }

    const result = await messagePinService.reorderPin(messageId, direction, chatId);

    res.status(200).json({
      status: 'success',
      message: 'Pin reordered',
      data: result,
    });
  } catch (error) {
    logger.error('Error reordering pin', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to reorder pin',
      error: error.message,
    });
  }
});

/**
 * GET /:chatId/search
 * Search within pinned messages
 * Query: query
 */
router.get('/:chatId/search', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required',
      });
    }

    const results = await messagePinService.searchPinned(chatId, query);

    res.status(200).json({
      status: 'success',
      data: results,
      chatId,
      query,
    });
  } catch (error) {
    logger.error('Error searching pinned', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to search pinned messages',
      error: error.message,
    });
  }
});

module.exports = router;
