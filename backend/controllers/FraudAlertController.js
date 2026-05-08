/**
 * FraudAlertController
 * Handles fraud alert management endpoints
 */

const FraudAlertService = require('../services/FraudAlertService');
const logger = require('../utils/logger');

class FraudAlertController {
  /**
   * GET /api/v1/fraud/alerts
   * List fraud alerts with filtering
   */
  async listAlerts(req, res) {
    try {
      const { status = 'open', userId, severity, limit = 20, skip = 0 } = req.query;

      const filters = {
        limit: parseInt(limit),
        skip: parseInt(skip),
      };

      if (userId) filters.userId = userId;
      if (severity) filters.severity = severity;

      // Allow user to only see their own alerts unless admin
      const userIdFilter = req.user?.userId;
      if (userIdFilter && req.user?.role !== 'admin') {
        filters.userId = userIdFilter;
      }

      const result = await FraudAlertService.getOpenAlerts(filters);

      return res.json({
        success: true,
        data: {
          alerts: result.alerts.map((a) => ({
            alertId: a.alertId,
            userId: a.userId,
            severity: a.severity,
            riskScore: a.riskScore,
            category: a.category,
            status: a.status,
            entityType: a.entityType,
            createdAt: a.createdAt,
            priority: a.priority,
          })),
          total: result.total,
          limit: parseInt(limit),
          skip: parseInt(skip),
        },
      });
    } catch (error) {
      logger.error('Error listing alerts:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to list alerts',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/fraud/alerts/:alertId
   * Get alert details
   */
  async getAlert(req, res) {
    try {
      const { alertId } = req.params;

      const alert = await FraudAlertService.getAlertById(alertId);

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found',
        });
      }

      // Check access: user can view their own alerts or admin can view any
      if (req.user?.role !== 'admin' && alert.userId !== req.user?.userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view this alert',
        });
      }

      const relatedAlerts = await FraudAlertService.getRelatedAlerts(alertId);

      return res.json({
        success: true,
        data: {
          alert,
          relatedAlerts: relatedAlerts.map((a) => ({
            alertId: a.alertId,
            severity: a.severity,
            riskScore: a.riskScore,
            createdAt: a.createdAt,
          })),
        },
      });
    } catch (error) {
      logger.error('Error getting alert:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get alert',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/fraud/alerts/:alertId/acknowledge
   * Acknowledge alert
   */
  async acknowledgeAlert(req, res) {
    try {
      const { alertId } = req.params;
      const { notes } = req.body;

      const alert = await FraudAlertService.getAlertById(alertId);

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found',
        });
      }

      // Check admin role
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can acknowledge alerts',
        });
      }

      const acknowledgedAlert = await FraudAlertService.acknowledgeAlert(
        alertId,
        req.user?.userId,
        req.user?.role,
        notes
      );

      return res.json({
        success: true,
        data: acknowledgedAlert,
        message: 'Alert acknowledged successfully',
      });
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to acknowledge alert',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/fraud/alerts/:alertId/escalate
   * Escalate alert
   */
  async escalateAlert(req, res) {
    try {
      const { alertId } = req.params;
      const { escalatedTo, reason, priority } = req.body;

      if (!escalatedTo || !reason) {
        return res.status(400).json({
          success: false,
          message: 'escalatedTo and reason are required',
        });
      }

      const alert = await FraudAlertService.getAlertById(alertId);

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found',
        });
      }

      // Check admin role
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can escalate alerts',
        });
      }

      const escalatedAlert = await FraudAlertService.escalateAlert(
        alertId,
        escalatedTo,
        reason,
        priority
      );

      return res.json({
        success: true,
        data: escalatedAlert,
        message: 'Alert escalated successfully',
      });
    } catch (error) {
      logger.error('Error escalating alert:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to escalate alert',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/fraud/alerts/:alertId/investigate
   * Start investigation on alert
   */
  async investigateAlert(req, res) {
    try {
      const { alertId } = req.params;
      const { findings, recommendedAction } = req.body;

      if (!findings || !recommendedAction) {
        return res.status(400).json({
          success: false,
          message: 'findings and recommendedAction are required',
        });
      }

      const alert = await FraudAlertService.getAlertById(alertId);

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found',
        });
      }

      // Check admin role
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can investigate alerts',
        });
      }

      const investigatedAlert = await FraudAlertService.investigateAlert(
        alertId,
        req.user?.userId,
        findings,
        recommendedAction
      );

      return res.json({
        success: true,
        data: investigatedAlert,
        message: 'Investigation started successfully',
      });
    } catch (error) {
      logger.error('Error investigating alert:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to start investigation',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/fraud/alerts/:alertId/action
   * Record action taken on alert
   */
  async recordAction(req, res) {
    try {
      const { alertId } = req.params;
      const { action, reason } = req.body;

      const validActions = ['none', 'block', 'challenge', 'manual_review', 'contact_user', 'freeze_account'];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          success: false,
          message: `Invalid action. Must be one of: ${validActions.join(', ')}`,
        });
      }

      const alert = await FraudAlertService.getAlertById(alertId);

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found',
        });
      }

      // Check admin role
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can record actions',
        });
      }

      const updatedAlert = await FraudAlertService.recordAction(
        alertId,
        action,
        req.user?.userId,
        reason
      );

      return res.json({
        success: true,
        data: updatedAlert,
        message: 'Action recorded successfully',
      });
    } catch (error) {
      logger.error('Error recording action:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to record action',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/fraud/alerts/:alertId/resolve
   * Resolve alert
   */
  async resolveAlert(req, res) {
    try {
      const { alertId } = req.params;
      const { resolution, feedback } = req.body;

      const validResolutions = ['fraud_confirmed', 'false_positive', 'legitimate_activity', 'unknown'];
      if (!validResolutions.includes(resolution)) {
        return res.status(400).json({
          success: false,
          message: `Invalid resolution. Must be one of: ${validResolutions.join(', ')}`,
        });
      }

      const alert = await FraudAlertService.getAlertById(alertId);

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found',
        });
      }

      // Check admin role
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can resolve alerts',
        });
      }

      const resolvedAlert = await FraudAlertService.resolveAlert(
        alertId,
        resolution,
        req.user?.userId,
        feedback
      );

      return res.json({
        success: true,
        data: resolvedAlert,
        message: 'Alert resolved successfully',
      });
    } catch (error) {
      logger.error('Error resolving alert:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to resolve alert',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/fraud/alerts/:alertId/dismiss
   * Dismiss alert as false positive
   */
  async dismissAlert(req, res) {
    try {
      const { alertId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'reason is required',
        });
      }

      const alert = await FraudAlertService.getAlertById(alertId);

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found',
        });
      }

      // Check admin role
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can dismiss alerts',
        });
      }

      const dismissedAlert = await FraudAlertService.dismissAlert(
        alertId,
        req.user?.userId,
        reason
      );

      return res.json({
        success: true,
        data: dismissedAlert,
        message: 'Alert dismissed successfully',
      });
    } catch (error) {
      logger.error('Error dismissing alert:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to dismiss alert',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/fraud/alerts/statistics
   * Get fraud alert statistics
   */
  async getStatistics(req, res) {
    try {
      const { timeframe = '24h' } = req.query;

      const stats = await FraudAlertService.getAlertStatistics(timeframe);
      const byCategory = await FraudAlertService.getAlertsByCategory(timeframe);

      return res.json({
        success: true,
        data: {
          timeframe,
          statistics: stats,
          byCategory,
        },
      });
    } catch (error) {
      logger.error('Error getting statistics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get statistics',
        error: error.message,
      });
    }
  }
}

module.exports = new FraudAlertController();
