/**
 * Activity Log Controller - Phase 10 REST Endpoints
 * User activity tracking and monitoring endpoints
 */

const { validationResult } = require('express-validator');
const ActivityLogService = require('../services/ActivityLogService');

class ActivityLogController {
  async logActivity(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { userId, userType, activityType, details } = req.body;

      const enrichedDetails = {
        ...details,
        ipAddress: req.ip,
        sessionId: req.sessionID,
      };

      const result = await ActivityLogService.logActivity(userId, userType, activityType, enrichedDetails);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to log activity',
        errors: [error.message],
      });
    }
  }

  async getUserActivityLog(req, res) {
    try {
      const { userId } = req.params;
      const filters = {
        activityType: req.query.activityType,
        module: req.query.module,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: parseInt(req.query.limit) || 50,
        skip: parseInt(req.query.skip) || 0,
      };

      const result = await ActivityLogService.getUserActivityLog(userId, filters);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve activity logs',
        errors: [error.message],
      });
    }
  }

  async getActivityDetails(req, res) {
    try {
      const { logId } = req.params;

      const result = await ActivityLogService.getActivityDetails(logId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve activity details',
        errors: [error.message],
      });
    }
  }

  async getAnomalousActivity(req, res) {
    try {
      const { userId } = req.params;
      const timeWindowDays = parseInt(req.query.timeWindowDays) || 7;

      const result = await ActivityLogService.getAnomalousActivity(userId, timeWindowDays);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to analyze activities',
        errors: [error.message],
      });
    }
  }

  async exportActivityLogs(req, res) {
    try {
      const { userId } = req.params;
      const format = req.query.format || 'json';

      const result = await ActivityLogService.exportActivityLogs(userId, format);

      if (result.success) {
        res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="activity-logs.${format === 'json' ? 'json' : 'csv'}"`);
        return res.send(result.data.exportData);
      }

      return res.status(400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to export activity logs',
        errors: [error.message],
      });
    }
  }
}

module.exports = new ActivityLogController();
