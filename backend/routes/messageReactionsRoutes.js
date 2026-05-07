const express = require('express');
const router = express.Router();
const { authenticate: authMiddleware } = require('../middleware/auth');
const messageReactionService = require('../services/messageReactionService');
const logger = require('../utils/logger');

/**
 * Message Reaction Routes
 * All routes require authentication
 */

// Middleware
router.use(authMiddleware);

/**
 * POST /
 * Add reaction to message
 * Body: { messageId, emoji, type?, isAnimated?, metadata? }
 */
router.post('/', async (req, res) => {
  try {
    const { messageId, emoji, type, isAnimated, metadata } = req.body;
    const userId = req.user._id;

    // Validate inputs
    if (!messageId || !emoji) {
      return res.status(400).json({
        status: 'error',
        message: 'messageId and emoji are required',
      });
    }

    // Validate emoji format
    if (!messageReactionService.validateEmoji(emoji)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid emoji format',
      });
    }

    const reaction = await messageReactionService.addReaction(
      messageId,
      userId,
      emoji,
      { type, isAnimated, metadata }
    );

    res.status(201).json({
      status: 'success',
      message: 'Reaction added',
      data: reaction,
    });
  } catch (error) {
    logger.error('Error adding reaction', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * DELETE /:messageId/:emoji
 * Remove reaction from message
 */
router.delete('/:messageId/:emoji', async (req, res) => {
  try {
    const { messageId, emoji } = req.params;
    const userId = req.user._id;

    if (!messageId || !emoji) {
      return res.status(400).json({
        status: 'error',
        message: 'messageId and emoji are required',
      });
    }

    await messageReactionService.removeReaction(messageId, userId, emoji);

    res.status(200).json({
      status: 'success',
      message: 'Reaction removed',
    });
  } catch (error) {
    logger.error('Error removing reaction', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /message/:messageId
 * Get all reactions on a message
 */
router.get('/message/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const reactions = await messageReactionService.getMessageReactions(
      messageId
    );

    res.status(200).json({
      status: 'success',
      message: 'Reactions retrieved',
      data: reactions,
    });
  } catch (error) {
    logger.error('Error getting message reactions', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /message/:messageId/:emoji
 * Get who reacted with specific emoji
 */
router.get('/message/:messageId/:emoji', async (req, res) => {
  try {
    const { messageId, emoji } = req.params;

    const users = await messageReactionService.getWhoReacted(
      messageId,
      emoji
    );

    res.status(200).json({
      status: 'success',
      message: 'Users retrieved',
      data: users,
    });
  } catch (error) {
    logger.error('Error getting who reacted', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /count/:messageId/:emoji
 * Get count of specific reaction
 */
router.get('/count/:messageId/:emoji', async (req, res) => {
  try {
    const { messageId, emoji } = req.params;

    const count = await messageReactionService.getReactionCount(
      messageId,
      emoji
    );

    res.status(200).json({
      status: 'success',
      message: 'Count retrieved',
      data: { messageId, emoji, count },
    });
  } catch (error) {
    logger.error('Error getting reaction count', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /user/reactions
 * Get current user's reactions on provided messages
 * Query: ?messageIds=id1,id2,id3
 */
router.get('/user/reactions', async (req, res) => {
  try {
    const { messageIds } = req.query;
    const userId = req.user._id;

    if (!messageIds) {
      return res.status(400).json({
        status: 'error',
        message: 'messageIds query parameter is required',
      });
    }

    const ids = messageIds.split(',');
    const reactions = await messageReactionService.getUserReactions(
      userId,
      ids
    );

    res.status(200).json({
      status: 'success',
      message: 'User reactions retrieved',
      data: reactions,
    });
  } catch (error) {
    logger.error('Error getting user reactions', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /stats
 * Get current user's reaction statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await messageReactionService.getUserReactionStats(userId);

    res.status(200).json({
      status: 'success',
      message: 'User stats retrieved',
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting user stats', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * POST /batch
 * Batch add reactions
 * Body: { reactions: [{messageId, userId, emoji}, ...] }
 */
router.post('/batch', async (req, res) => {
  try {
    const { reactions } = req.body;

    if (!Array.isArray(reactions) || reactions.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'reactions array is required',
      });
    }

    const created = await messageReactionService.batchAddReactions(reactions);

    res.status(201).json({
      status: 'success',
      message: `${created.length} reactions added`,
      data: created,
    });
  } catch (error) {
    logger.error('Error batch adding reactions', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /popular
 * Get popular reactions across messages
 * Query: ?messageIds=id1,id2,id3
 */
router.get('/popular', async (req, res) => {
  try {
    const { messageIds } = req.query;

    if (!messageIds) {
      return res.status(400).json({
        status: 'error',
        message: 'messageIds query parameter is required',
      });
    }

    const ids = messageIds.split(',');
    const popular = await messageReactionService.getPopularReactions(ids);

    res.status(200).json({
      status: 'success',
      message: 'Popular reactions retrieved',
      data: popular,
    });
  } catch (error) {
    logger.error('Error getting popular reactions', { error });
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

module.exports = router;
