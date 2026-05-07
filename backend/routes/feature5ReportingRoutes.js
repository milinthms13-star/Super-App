/**
 * Phase 2 Feature 5: Advanced Abuse Reporting Routes
 * Routes for bulk reporting, aggregation, and analytics
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const abuseReportingService = require('../services/abuseReportingService');
const logger = require('../config/logger');

/**
 * POST /api/messaging/reports/bulk
 * Submit bulk abuse reports
 * Feature 5: Bulk Reporting
 */
router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    const { reports, batchId } = req.body;

    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      return res.status(400).json({ error: 'Invalid bulk report format' });
    }

    const bulkReportData = {
      reports: reports.map(r => ({
        reporterUserId: req.user.id,
        ...r
      })),
      batchId: batchId || `batch_${Date.now()}`,
      timestamp: new Date()
    };

    const results = await abuseReportingService.bulkReportAbuse(bulkReportData);

    logger.info(`[Feature5] Bulk report processed: ${results.successful.length}/${results.total}`);

    res.status(200).json({
      message: 'Bulk reports processed',
      results
    });
  } catch (error) {
    logger.error('[Feature5] Error processing bulk reports:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/reports/aggregation
 * Get aggregated report data (patterns, trends)
 * Feature 5: Report Aggregation
 */
router.get('/aggregation', authMiddleware, async (req, res) => {
  try {
    // Require admin/moderator role
    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const timeWindow = parseInt(req.query.timeWindow) || 24; // hours
    const patterns = await abuseReportingService.aggregateReports(timeWindow);

    res.status(200).json({
      message: 'Aggregation complete',
      timeWindow,
      patterns
    });
  } catch (error) {
    logger.error('[Feature5] Error getting aggregation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/reports/analytics
 * Get analytics dashboard data
 * Feature 5: Advanced Analytics
 */
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    // Require admin/moderator role
    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const days = parseInt(req.query.days) || 7;
    const analytics = await abuseReportingService.getAnalytics(days);

    res.status(200).json({
      message: 'Analytics retrieved',
      analytics
    });
  } catch (error) {
    logger.error('[Feature5] Error getting analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/reports/trends
 * Get report trends over time
 * Feature 5: Trend Analysis
 */
router.get('/trends', authMiddleware, async (req, res) => {
  try {
    // Require admin/moderator role
    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const days = parseInt(req.query.days) || 30;
    const trends = await abuseReportingService.getReportTrends(days);

    res.status(200).json({
      message: 'Trends retrieved',
      trends
    });
  } catch (error) {
    logger.error('[Feature5] Error getting trends:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/reports/filter
 * Get filtered reports with advanced criteria
 * Feature 5: Enhanced Filtering
 */
router.get('/filter', authMiddleware, async (req, res) => {
  try {
    // Require admin/moderator role
    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const filters = {
      reason: req.query.reason,
      status: req.query.status,
      severity: req.query.severity,
      sortBy: req.query.sortBy || 'createdAt'
    };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const results = await abuseReportingService.filterReports(filters, page, limit);

    res.status(200).json({
      message: 'Filtered reports retrieved',
      ...results
    });
  } catch (error) {
    logger.error('[Feature5] Error filtering reports:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/reports/categories
 * Get list of report categories
 * Feature 5: Report Categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      'harassment',
      'hate_speech',
      'spam',
      'misinformation',
      'sexual_content',
      'violence',
      'scam',
      'impersonation'
    ];

    res.status(200).json({
      message: 'Categories retrieved',
      categories
    });
  } catch (error) {
    logger.error('[Feature5] Error getting categories:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
