const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const conversationAnalyticsService = require('../services/conversationAnalyticsService');
const logger = require('../utils/logger');

/**
 * Conversation Analytics Routes
 * Comprehensive conversation insights and metrics
 * All routes require authentication
 */

// Middleware
router.use(authMiddleware);

/**
 * GET /:chatId/overview
 * Get conversation overview/dashboard
 * Query: daysBack (default 30)
 */
router.get('/:chatId/overview', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { daysBack = 30 } = req.query;

    const overview = await conversationAnalyticsService.getConversationOverview(
      chatId,
      { daysBack: parseInt(daysBack) }
    );

    res.status(200).json({
      status: 'success',
      data: overview,
      chatId,
      daysBack: parseInt(daysBack),
    });
  } catch (error) {
    logger.error('Error getting overview', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get conversation overview',
      error: error.message,
    });
  }
});

/**
 * GET /:chatId/engagement
 * Get engagement metrics
 * Query: userId (optional for specific user)
 */
router.get('/:chatId/engagement', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.query;

    const metrics = await conversationAnalyticsService.getEngagementMetrics(
      chatId,
      userId
    );

    res.status(200).json({
      status: 'success',
      data: metrics,
      chatId,
    });
  } catch (error) {
    logger.error('Error getting engagement metrics', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get engagement metrics',
      error: error.message,
    });
  }
});

/**
 * GET /:chatId/sentiment
 * Get sentiment analysis
 * Query: limit (default 100)
 */
router.get('/:chatId/sentiment', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 100 } = req.query;

    const sentiment = await conversationAnalyticsService.getSentimentAnalysis(
      chatId,
      { limit: parseInt(limit) }
    );

    res.status(200).json({
      status: 'success',
      data: sentiment,
      chatId,
    });
  } catch (error) {
    logger.error('Error getting sentiment analysis', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get sentiment analysis',
      error: error.message,
    });
  }
});

/**
 * GET /:chatId/trends
 * Get trend analysis
 * Query: daysBack (default 30), interval (day/week/month)
 */
router.get('/:chatId/trends', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { daysBack = 30, interval = 'day' } = req.query;

    const trends = await conversationAnalyticsService.getTrendAnalysis(
      chatId,
      { daysBack: parseInt(daysBack), interval }
    );

    res.status(200).json({
      status: 'success',
      data: trends,
      chatId,
      interval,
      daysBack: parseInt(daysBack),
    });
  } catch (error) {
    logger.error('Error getting trend analysis', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get trend analysis',
      error: error.message,
    });
  }
});

/**
 * GET /:chatId/health
 * Get conversation health score
 */
router.get('/:chatId/health', async (req, res) => {
  try {
    const { chatId } = req.params;

    const health = await conversationAnalyticsService.getConversationHealth(chatId);

    res.status(200).json({
      status: 'success',
      data: health,
      chatId,
    });
  } catch (error) {
    logger.error('Error getting health score', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get conversation health',
      error: error.message,
    });
  }
});

/**
 * GET /:chatId/active-hours
 * Get most active hours in chat
 */
router.get('/:chatId/active-hours', async (req, res) => {
  try {
    const { chatId } = req.params;

    const hours = await conversationAnalyticsService.getMostActiveHours(chatId);

    res.status(200).json({
      status: 'success',
      data: hours,
      chatId,
    });
  } catch (error) {
    logger.error('Error getting active hours', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get active hours',
      error: error.message,
    });
  }
});

/**
 * GET /:chatId/topics
 * Get conversation topics (keywords)
 * Query: limit (default 20)
 */
router.get('/:chatId/topics', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 20 } = req.query;

    const topics = await conversationAnalyticsService.getConversationTopics(
      chatId,
      parseInt(limit)
    );

    res.status(200).json({
      status: 'success',
      data: topics,
      chatId,
      limit: parseInt(limit),
    });
  } catch (error) {
    logger.error('Error getting topics', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get conversation topics',
      error: error.message,
    });
  }
});

/**
 * POST /:chatId/report
 * Generate comprehensive analytics report
 * Body: { daysBack?, includeAll? }
 */
router.post('/:chatId/report', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { daysBack = 30, includeAll = true } = req.body;

    const report = await conversationAnalyticsService.generateAnalyticsReport(
      chatId,
      { daysBack: parseInt(daysBack) }
    );

    res.status(200).json({
      status: 'success',
      data: report,
      chatId,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error generating report', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate analytics report',
      error: error.message,
    });
  }
});

module.exports = router;
