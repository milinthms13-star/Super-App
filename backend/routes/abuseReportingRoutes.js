const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const abuseReportingService = require('../services/abuseReportingService');
const logger = require('../config/logger');

/**
 * Abuse Reporting Routes - Phase 2 Feature 5
 * REST endpoints for user-submitted abuse reports
 */

// ============ USER REPORTING ENDPOINTS ============

/**
 * POST /report - Submit abuse report
 * Body: { reportedUser, reportedMessage, reason, description, relationship, previousIncidents }
 */
router.post('/report', auth, async (req, res) => {
  try {
    const { reportedUser, reportedMessage, reason, description, relationship, previousIncidents } =
      req.body;

    // Validate required fields
    if (!reportedUser || !reason) {
      return res.status(400).json({ error: 'Reported user and reason are required' });
    }

    // Validate reason is in allowed list
    const validReasons = [
      'harassment',
      'spam',
      'nsfw',
      'fraud',
      'violence',
      'hate_speech',
      'other'
    ];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason provided' });
    }

    const result = await abuseReportingService.submitUserReport(req.user.id, {
      reportedUser,
      reportedMessage,
      reason,
      description,
      relationship,
      previousIncidents
    });

    res.status(201).json(result);
  } catch (error) {
    logger.error('Error submitting abuse report:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /my-reports - Get user's own submitted reports
 * Query: ?limit=20
 */
router.get('/my-reports', auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const result = await abuseReportingService.getUserReports(req.user.id, parseInt(limit));

    res.json(result);
  } catch (error) {
    logger.error('Error fetching user reports:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /report/:id/status - Check report status
 */
router.get('/report/:id/status', auth, async (req, res) => {
  try {
    const status = await abuseReportingService.getReportStatus(req.params.id, req.user.id);

    res.json(status);
  } catch (error) {
    logger.error('Error fetching report status:', error);
    res.status(error.message === 'Unauthorized access to report' ? 403 : 500).json({
      error: error.message
    });
  }
});

/**
 * POST /report/:id/appeal - Submit appeal for report decision
 * Body: { reason }
 */
router.post('/report/:id/appeal', auth, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Appeal reason required' });
    }

    const result = await abuseReportingService.submitAppeal(req.params.id, req.user.id, reason);

    res.json(result);
  } catch (error) {
    logger.error('Error submitting appeal:', error);
    res.status(
      error.message.includes('Unauthorized') || error.message.includes('own')
        ? 403
        : 400
    ).json({
      error: error.message
    });
  }
});

// ============ USER STATISTICS ENDPOINTS ============

/**
 * GET /my-stats - Get abuse statistics for current user
 */
router.get('/my-stats', auth, async (req, res) => {
  try {
    const stats = await abuseReportingService.getUserAbuseStats(req.user.id);

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching user abuse stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ PUBLIC INSIGHTS (No Auth) ============

/**
 * GET /trending-reasons - Get trending abuse report reasons (last 7 days)
 * Query: ?days=7
 */
router.get('/trending-reasons', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const reasons = await abuseReportingService.getTrendingAbuseReasons(parseInt(days));

    res.json({
      period: `${days} days`,
      reasons
    });
  } catch (error) {
    logger.error('Error fetching trending reasons:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /insights - Get moderation insights
 */
router.get('/insights', async (req, res) => {
  try {
    const insights = await abuseReportingService.getModerationInsights();

    res.json(insights);
  } catch (error) {
    logger.error('Error fetching insights:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ ADMIN STATISTICS ============

/**
 * GET /service-stats - Get abuse reporting service statistics
 */
router.get('/service-stats', auth, async (req, res) => {
  try {
    // Verify admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = abuseReportingService.getStats();

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching service stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /service-stats/reset - Reset service statistics
 */
router.post('/service-stats/reset', auth, async (req, res) => {
  try {
    // Verify admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    abuseReportingService.resetStats();

    res.json({ message: 'Service statistics reset' });
  } catch (error) {
    logger.error('Error resetting service stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
