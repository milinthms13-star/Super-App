const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const moderationService = require('../services/moderationService');
const logger = require('../config/logger');

/**
 * Admin Moderation Routes - Phase 2 Feature 3
 * REST API for moderation dashboard and admin actions
 */

// Middleware: Verify admin/moderator role
const verifyModerator = async (req, res, next) => {
  try {
    if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization error' });
  }
};

// ============ ABUSE REPORT ENDPOINTS ============

/**
 * POST /reports - Submit abuse report
 * Body: { reportedUser, reportedMessage, reason, description }
 */
router.post('/reports', auth, async (req, res) => {
  try {
    const { reportedUser, reportedMessage, reason, description } = req.body;

    // Validate inputs
    if (!reportedUser || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const report = await moderationService.submitReport({
      reportedBy: req.user.id,
      reportedUser,
      reportedMessage,
      reason,
      description
    });

    res.status(201).json({
      message: 'Report submitted successfully',
      report
    });
  } catch (error) {
    logger.error('Error submitting report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /reports - Get pending reports for moderation
 * Query: ?limit=20&status=pending
 */
router.get('/reports', auth, verifyModerator, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const data = await moderationService.getPendingReports(req.user.id, parseInt(limit));

    res.json(data);
  } catch (error) {
    logger.error('Error fetching reports:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /reports/:id - Get specific report details
 */
router.get('/reports/:id', auth, verifyModerator, async (req, res) => {
  try {
    const report = await moderationService.getPendingReports(req.user.id, 1);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (error) {
    logger.error('Error fetching report:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ MODERATION QUEUE ENDPOINTS ============

/**
 * GET /queue - Get current moderation queue
 * Query: ?limit=10&status=queued
 */
router.get('/queue', auth, verifyModerator, async (req, res) => {
  try {
    const task = await moderationService.getNextModerationTask(req.user.id);

    res.json({
      nextTask: task,
      message: task ? 'Task retrieved' : 'No pending tasks'
    });
  } catch (error) {
    logger.error('Error fetching queue:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /queue/:id/claim - Claim moderation task
 */
router.post('/queue/:id/claim', auth, verifyModerator, async (req, res) => {
  try {
    const { notes, severity } = req.body;

    const updated = await moderationService.reviewReport(
      req.params.id,
      req.user.id,
      { notes, severity }
    );

    res.json({
      message: 'Task claimed',
      task: updated
    });
  } catch (error) {
    logger.error('Error claiming task:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ MODERATION ACTIONS ============

/**
 * POST /users/:id/warn - Issue warning to user
 * Body: { reason, severity }
 */
router.post('/users/:id/warn', auth, verifyModerator, async (req, res) => {
  try {
    const { reason, severity } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason required' });
    }

    const user = await moderationService.warnUser(
      req.params.id,
      reason,
      req.user.id,
      { severity }
    );

    res.json({
      message: 'User warned',
      user: {
        id: user._id,
        warnings: user.moderation.warnings,
        status: user.moderation.status
      }
    });
  } catch (error) {
    logger.error('Error warning user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /users/:id/suspend - Suspend user
 * Body: { days, reason }
 */
router.post('/users/:id/suspend', auth, verifyModerator, async (req, res) => {
  try {
    const { days = 7, reason } = req.body;

    if (!reason || !days) {
      return res.status(400).json({ error: 'Days and reason required' });
    }

    const user = await moderationService.suspendUser(
      req.params.id,
      days,
      reason,
      req.user.id
    );

    res.json({
      message: `User suspended for ${days} days`,
      user: {
        id: user._id,
        status: user.moderation.status,
        suspendedUntil: user.moderation.suspendedUntil
      }
    });
  } catch (error) {
    logger.error('Error suspending user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /users/:id/ban - Ban user permanently
 * Body: { reason }
 */
router.post('/users/:id/ban', auth, verifyModerator, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason required' });
    }

    const user = await moderationService.banUser(
      req.params.id,
      reason,
      req.user.id
    );

    res.json({
      message: 'User banned',
      user: {
        id: user._id,
        status: user.moderation.status
      }
    });
  } catch (error) {
    logger.error('Error banning user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /users/:id/history - Get user moderation history
 */
router.get('/users/:id/history', auth, verifyModerator, async (req, res) => {
  try {
    const history = await moderationService.getUserModerationHistory(req.params.id);

    res.json(history);
  } catch (error) {
    logger.error('Error fetching history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ REPORT RESOLUTION ============

/**
 * POST /reports/:id/resolve - Resolve report with action
 * Body: { resolution, qualityScore, notes, suspensionDays }
 * resolution: 'dismissed', 'user_warned', 'message_removed', 'user_suspended', 'user_banned'
 */
router.post('/reports/:id/resolve', auth, verifyModerator, async (req, res) => {
  try {
    const { resolution, qualityScore, notes, suspensionDays } = req.body;

    if (!resolution) {
      return res.status(400).json({ error: 'Resolution type required' });
    }

    const report = await moderationService.resolveReport(
      req.params.id,
      resolution,
      { qualityScore, notes, suspensionDays },
      req.user.id
    );

    res.json({
      message: 'Report resolved',
      report
    });
  } catch (error) {
    logger.error('Error resolving report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /reports/:id/dismiss - Dismiss report as false positive
 * Body: { reason }
 */
router.post('/reports/:id/dismiss', auth, verifyModerator, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason required' });
    }

    const report = await moderationService.dismissReport(
      req.params.id,
      reason,
      req.user.id
    );

    res.json({
      message: 'Report dismissed',
      report
    });
  } catch (error) {
    logger.error('Error dismissing report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /reports/:id/escalate - Escalate report
 * Body: { escalatedTo, reason }
 */
router.post('/reports/:id/escalate', auth, verifyModerator, async (req, res) => {
  try {
    const { escalatedTo, reason } = req.body;

    if (!escalatedTo || !reason) {
      return res.status(400).json({ error: 'Escalated to and reason required' });
    }

    const escalation = await moderationService.escalateReport(
      req.params.id,
      escalatedTo,
      reason,
      req.user.id
    );

    res.json({
      message: 'Report escalated',
      escalation
    });
  } catch (error) {
    logger.error('Error escalating report:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ APPEAL HANDLING ============

/**
 * POST /appeals/:id/respond - Respond to moderation appeal
 * Body: { approved, response }
 */
router.post('/appeals/:id/respond', auth, verifyModerator, async (req, res) => {
  try {
    const { approved, response } = req.body;

    if (response === undefined) {
      return res.status(400).json({ error: 'Response required' });
    }

    const result = await moderationService.handleAppeal(
      req.params.id,
      approved,
      response,
      req.user.id
    );

    res.json({
      message: `Appeal ${approved ? 'approved' : 'rejected'}`,
      result
    });
  } catch (error) {
    logger.error('Error handling appeal:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ ANALYTICS & REPORTS ============

/**
 * GET /analytics - Get moderation statistics
 * Query: ?days=7
 */
router.get('/analytics', auth, verifyModerator, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const stats = await moderationService.getModerationStats(parseInt(days));

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /audit - Get audit trail
 * Query: ?limit=100&action=warn_user
 */
router.get('/audit', auth, verifyModerator, async (req, res) => {
  try {
    const AdminLog = require('../models/AdminLog');
    const { limit = 100, action } = req.query;

    const logs = await AdminLog.getActionLogs(action, parseInt(limit));

    res.json({
      count: logs.length,
      logs
    });
  } catch (error) {
    logger.error('Error fetching audit:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /moderators/stats - Get moderator performance
 * Query: ?days=7
 */
router.get('/moderators/:id/stats', auth, verifyModerator, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const performance = await moderationService.getModeratorPerformance(
      req.params.id,
      parseInt(days)
    );

    res.json(performance);
  } catch (error) {
    logger.error('Error fetching moderator stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
