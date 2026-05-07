const express = require('express');
const router = express.Router();
const { authenticate: authMiddleware } = require('../middleware/auth');
const messageThreadService = require('../services/messageThreadService');
const logger = require('../utils/logger');

/**
 * Message Thread Routes
 * Threaded conversations with replies and resolution
 * All routes require authentication
 */

// Middleware
router.use(authMiddleware);

/**
 * POST /
 * Create reply to message
 * Body: { parentMessageId, content, type?, metadata? }
 */
router.post('/', async (req, res) => {
  try {
    const { parentMessageId, content, type, metadata } = req.body;
    const senderId = req.user._id;

    if (!parentMessageId || !content) {
      return res.status(400).json({
        status: 'error',
        message: 'parentMessageId and content are required',
      });
    }

    const reply = await messageThreadService.createReply(
      parentMessageId,
      senderId,
      content,
      { type, metadata }
    );

    res.status(201).json({
      status: 'success',
      message: 'Reply created',
      data: reply,
    });
  } catch (error) {
    logger.error('Error creating reply', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to create reply',
      error: error.message,
    });
  }
});

/**
 * GET /:messageId
 * Get thread (parent message and all replies)
 * Query: limit, offset
 */
router.get('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const thread = await messageThreadService.getThread(messageId, {
      limit,
      offset,
    });

    res.status(200).json({
      status: 'success',
      data: thread,
      messageId,
    });
  } catch (error) {
    logger.error('Error getting thread', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get thread',
      error: error.message,
    });
  }
});

/**
 * GET /:messageId/chain
 * Get full conversation chain (all parents and descendants)
 */
router.get('/:messageId/chain', async (req, res) => {
  try {
    const { messageId } = req.params;

    const chain = await messageThreadService.getConversationChain(messageId);

    res.status(200).json({
      status: 'success',
      data: chain,
      messageId,
    });
  } catch (error) {
    logger.error('Error getting conversation chain', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get conversation chain',
      error: error.message,
    });
  }
});

/**
 * GET /:messageId/stats
 * Get thread statistics
 */
router.get('/:messageId/stats', async (req, res) => {
  try {
    const { messageId } = req.params;

    const stats = await messageThreadService.getThreadStats(messageId);

    res.status(200).json({
      status: 'success',
      data: stats,
      messageId,
    });
  } catch (error) {
    logger.error('Error getting thread stats', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get thread stats',
      error: error.message,
    });
  }
});

/**
 * DELETE /:messageId
 * Delete thread (message + all replies)
 */
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    await messageThreadService.deleteThread(messageId, userId);

    res.status(200).json({
      status: 'success',
      message: 'Thread deleted',
      messageId,
    });
  } catch (error) {
    logger.error('Error deleting thread', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete thread',
      error: error.message,
    });
  }
});

/**
 * POST /:messageId/resolve
 * Mark thread as resolved
 */
router.post('/:messageId/resolve', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const result = await messageThreadService.markThreadResolved(messageId, userId);

    res.status(200).json({
      status: 'success',
      message: 'Thread marked as resolved',
      data: result,
    });
  } catch (error) {
    logger.error('Error resolving thread', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to resolve thread',
      error: error.message,
    });
  }
});

/**
 * GET /chat/:chatId/popular
 * Get popular threads in chat
 * Query: limit, offset
 */
router.get('/chat/:chatId/popular', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const threads = await messageThreadService.getPopularThreads(chatId, {
      limit,
      offset,
    });

    res.status(200).json({
      status: 'success',
      data: threads,
      chatId,
    });
  } catch (error) {
    logger.error('Error getting popular threads', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get popular threads',
      error: error.message,
    });
  }
});

module.exports = router;
