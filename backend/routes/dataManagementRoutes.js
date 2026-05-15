const express = require('express');
const router = express.Router();
const dataManagementService = require('../services/dataManagementService');
const authMiddleware = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/messaging/v4/statistics/detailed
 * Get detailed statistics for user
 */
router.get('/statistics/detailed', async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const stats = await dataManagementService.getDetailedStatistics(req.user._id, {
      from: fromDate ? new Date(fromDate) : null,
      to: toDate ? new Date(toDate) : null,
    });

    res.json({
      message: 'Detailed statistics retrieved successfully',
      data: stats,
    });
  } catch (error) {
    logger.error('Error retrieving detailed statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/v4/statistics/active-chats
 * Get most active chats
 */
router.get('/statistics/active-chats', async (req, res) => {
  try {
    const { limit } = req.query;

    const activeChats = await dataManagementService.getMostActiveChats(
      req.user._id,
      parseInt(limit) || 10
    );

    res.json({
      message: 'Most active chats retrieved successfully',
      data: activeChats,
    });
  } catch (error) {
    logger.error('Error retrieving active chats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/v4/statistics/trends
 * Get message trends
 */
router.get('/statistics/trends', async (req, res) => {
  try {
    const { timeframe } = req.query;

    const trends = await dataManagementService.getMessageTrends(
      req.user._id,
      timeframe || 'month'
    );

    res.json({
      message: 'Message trends retrieved successfully',
      data: trends,
    });
  } catch (error) {
    logger.error('Error retrieving message trends:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/v4/statistics/media-usage
 * Get media usage statistics
 */
router.get('/statistics/media-usage', async (req, res) => {
  try {
    const mediaStats = await dataManagementService.getMediaUsageStats(req.user._id);

    res.json({
      message: 'Media usage statistics retrieved successfully',
      data: mediaStats,
    });
  } catch (error) {
    logger.error('Error retrieving media usage stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messaging/v4/retention-policy
 * Set retention policy
 */
router.post('/retention-policy', async (req, res) => {
  try {
    const {
      messageRetentionDays,
      mediaRetentionDays,
      autoDeleteMode,
      autoArchiveAfterDays,
    } = req.body;

    const policy = await dataManagementService.setRetentionPolicy(req.user._id, {
      messageRetentionDays,
      mediaRetentionDays,
      autoDeleteMode,
      autoArchiveAfterDays,
    });

    res.status(201).json({
      message: 'Retention policy set successfully',
      data: policy,
    });
  } catch (error) {
    logger.error('Error setting retention policy:', error);
    const isValidationError =
      error?.name === 'ValidationError' ||
      /validation|min|max|required|invalid/i.test(error.message || '');
    res.status(isValidationError ? 400 : 500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/v4/retention-policy
 * Get retention policy
 */
router.get('/retention-policy', async (req, res) => {
  try {
    const policy = await dataManagementService.getRetentionPolicy(req.user._id);

    res.json({
      message: 'Retention policy retrieved successfully',
      data: policy,
    });
  } catch (error) {
    logger.error('Error retrieving retention policy:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messaging/v4/data/archive
 * Archive old messages
 */
router.post('/data/archive', async (req, res) => {
  try {
    const { olderThanDays } = req.body;

    const result = await dataManagementService.archiveOldMessages(
      req.user._id,
      olderThanDays || 365
    );

    res.json({
      message: 'Messages archived successfully',
      data: {
        archivedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    logger.error('Error archiving messages:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messaging/v4/data/export
 * Export user data (GDPR)
 */
router.post('/data/export', async (req, res) => {
  try {
    const exportData = await dataManagementService.exportUserData(req.user._id);

    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="user_data_${Date.now()}.json"`,
    });

    res.json(exportData);
  } catch (error) {
    logger.error('Error exporting user data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
