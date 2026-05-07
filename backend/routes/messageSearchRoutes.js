const express = require('express');
const router = express.Router();
const { authenticate: authMiddleware } = require('../middleware/auth');
const messageSearchService = require('../services/messageSearchService');
const logger = require('../utils/logger');

/**
 * Message Search Routes
 * Advanced full-text search with filtering
 * All routes require authentication
 */

// Middleware
router.use(authMiddleware);

/**
 * POST /
 * Advanced search with multiple filters
 * Body: { query, chatIds[], userId, senderIds[], messageTypes[], hasMedia, hasReactions, startDate, endDate, sortBy, limit, offset }
 */
router.post('/', async (req, res) => {
  try {
    const { query, chatIds, userId, senderIds, messageTypes, hasMedia, hasReactions, startDate, endDate, sortBy = 'relevance', limit = 20, offset = 0 } = req.body;

    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required',
      });
    }

    const criteria = {
      query,
      chatIds,
      userId,
      senderIds,
      messageTypes,
      hasMedia,
      hasReactions,
      startDate,
      endDate,
    };

    const results = await messageSearchService.searchMessages(criteria, {
      sortBy,
      limit,
      offset,
    });

    res.status(200).json({
      status: 'success',
      data: results,
      query,
      count: results.length,
    });
  } catch (error) {
    logger.error('Error searching messages', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to search messages',
      error: error.message,
    });
  }
});

/**
 * GET /chat/:chatId
 * Search within specific chat
 * Query: query (required), limit, offset, sortBy
 */
router.get('/chat/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { query, limit = 20, offset = 0, sortBy = 'relevance' } = req.query;

    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required',
      });
    }

    const results = await messageSearchService.searchInChat(chatId, query, {
      limit,
      offset,
      sortBy,
    });

    res.status(200).json({
      status: 'success',
      data: results,
      chatId,
      query,
    });
  } catch (error) {
    logger.error('Error searching in chat', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to search in chat',
      error: error.message,
    });
  }
});

/**
 * GET /sender/:senderId
 * Search by sender
 * Query: query, limit, offset
 */
router.get('/sender/:senderId', async (req, res) => {
  try {
    const { senderId } = req.params;
    const { query, limit = 20, offset = 0 } = req.query;

    const results = await messageSearchService.searchBySender(senderId, query, {
      limit,
      offset,
    });

    res.status(200).json({
      status: 'success',
      data: results,
      senderId,
      query,
    });
  } catch (error) {
    logger.error('Error searching by sender', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to search by sender',
      error: error.message,
    });
  }
});

/**
 * GET /recent
 * Get recent messages for user
 * Query: hours (default 24)
 */
router.get('/recent', async (req, res) => {
  try {
    const userId = req.user._id;
    const { hours = 24 } = req.query;

    const messages = await messageSearchService.getRecentMessages(userId, parseInt(hours));

    res.status(200).json({
      status: 'success',
      data: messages,
      hours: parseInt(hours),
    });
  } catch (error) {
    logger.error('Error getting recent messages', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get recent messages',
      error: error.message,
    });
  }
});

/**
 * GET /media
 * Search for media
 * Query: chatIds[], mediaType (image/video/audio/file), limit, offset
 */
router.get('/media', async (req, res) => {
  try {
    const { chatIds, mediaType, limit = 20, offset = 0 } = req.query;

    if (!mediaType) {
      return res.status(400).json({
        status: 'error',
        message: 'mediaType is required (image/video/audio/file)',
      });
    }

    const chatIdArray = Array.isArray(chatIds) ? chatIds : [chatIds];
    const results = await messageSearchService.searchMedia(chatIdArray, mediaType, {
      limit,
      offset,
    });

    res.status(200).json({
      status: 'success',
      data: results,
      mediaType,
    });
  } catch (error) {
    logger.error('Error searching media', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to search media',
      error: error.message,
    });
  }
});

/**
 * GET /trends
 * Get trending keywords
 * Query: chatIds[], limit (default 20), daysBack (default 7)
 */
router.get('/trends', async (req, res) => {
  try {
    const { chatIds, limit = 20, daysBack = 7 } = req.query;

    if (!chatIds) {
      return res.status(400).json({
        status: 'error',
        message: 'chatIds are required',
      });
    }

    const chatIdArray = Array.isArray(chatIds) ? chatIds : [chatIds];
    const trends = await messageSearchService.getTrendingKeywords(chatIdArray, {
      limit,
      daysBack,
    });

    res.status(200).json({
      status: 'success',
      data: trends,
      limit,
    });
  } catch (error) {
    logger.error('Error getting trends', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get trends',
      error: error.message,
    });
  }
});

/**
 * GET /activity
 * Get activity timeline
 * Query: chatIds[], interval (day/week/month), daysBack
 */
router.get('/activity', async (req, res) => {
  try {
    const { chatIds, interval = 'day', daysBack = 7 } = req.query;

    if (!chatIds) {
      return res.status(400).json({
        status: 'error',
        message: 'chatIds are required',
      });
    }

    const chatIdArray = Array.isArray(chatIds) ? chatIds : [chatIds];
    const timeline = await messageSearchService.getActivityTimeline(chatIdArray, interval);

    res.status(200).json({
      status: 'success',
      data: timeline,
      interval,
    });
  } catch (error) {
    logger.error('Error getting activity timeline', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get activity timeline',
      error: error.message,
    });
  }
});

/**
 * GET /stats
 * Get message statistics
 * Query: chatIds[]
 */
router.get('/stats', async (req, res) => {
  try {
    const { chatIds } = req.query;

    if (!chatIds) {
      return res.status(400).json({
        status: 'error',
        message: 'chatIds are required',
      });
    }

    const chatIdArray = Array.isArray(chatIds) ? chatIds : [chatIds];
    const stats = await messageSearchService.getMessageStats(chatIdArray);

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting message stats', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get message stats',
      error: error.message,
    });
  }
});

module.exports = router;
