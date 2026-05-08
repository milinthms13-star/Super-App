/**
 * FraudAlertService
 * Manages fraud alert creation, workflow, and notifications
 */

const FraudAlert = require('../models/FraudAlert');
const logger = require('../utils/logger');
const crypto = require('crypto');

class FraudAlertService {
  /**
   * Create fraud alert
   */
  async createFraudAlert(alertData) {
    try {
      const alert = new FraudAlert({
        alertId: `alert_${crypto.randomBytes(8).toString('hex')}`,
        triggeredBy: alertData.triggeredBy,
        mlModelId: alertData.mlModelId,
        entityType: alertData.entityType,
        entityId: alertData.entityId,
        userId: alertData.userId,
        severity: this._determineSeverity(alertData.riskScore),
        riskScore: alertData.riskScore,
        confidence: alertData.confidence,
        category: alertData.category,
        indicators: alertData.indicators || [],
        triggerData: alertData.triggerData,
        deviations: alertData.deviations,
        status: 'open',
        priority: this._calculatePriority(alertData.riskScore, alertData.entityType),
      });

      await alert.save();
      logger.info(`Created fraud alert: ${alert.alertId} for user ${alertData.userId}`);

      // Trigger notifications if critical
      if (alert.severity === 'critical') {
        await this.notifyAdmins(alert);
      }

      return alert;
    } catch (error) {
      logger.error('Error creating fraud alert:', error);
      throw error;
    }
  }

  /**
   * Determine severity from risk score
   */
  _determineSeverity(riskScore) {
    if (riskScore >= 90) return 'critical';
    if (riskScore >= 75) return 'high';
    if (riskScore >= 50) return 'medium';
    return 'low';
  }

  /**
   * Calculate alert priority
   */
  _calculatePriority(riskScore, entityType) {
    let basePriority = 5;

    // Higher priority for certain entity types
    if (entityType === 'payment') basePriority = 3;
    if (entityType === 'refund') basePriority = 2;

    // Adjust by risk score
    if (riskScore >= 90) basePriority = Math.max(1, basePriority - 3);
    else if (riskScore >= 75) basePriority = Math.max(1, basePriority - 2);
    else if (riskScore >= 50) basePriority = Math.max(1, basePriority - 1);

    return basePriority;
  }

  /**
   * Get open alerts with filtering
   */
  async getOpenAlerts(filters = {}) {
    try {
      const query = { status: 'open' };

      if (filters.userId) query.userId = filters.userId;
      if (filters.severity) query.severity = filters.severity;
      if (filters.entityType) query.entityType = filters.entityType;
      if (filters.priority) query.priority = { $lte: filters.priority };
      if (filters.minRiskScore) query.riskScore = { $gte: filters.minRiskScore };

      const alerts = await FraudAlert.find(query)
        .sort({ priority: 1, createdAt: -1 })
        .limit(filters.limit || 100);

      return {
        total: await FraudAlert.countDocuments(query),
        alerts,
      };
    } catch (error) {
      logger.error('Error getting open alerts:', error);
      throw error;
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy, role, notes) {
    try {
      const alert = await FraudAlert.findOne({ alertId });

      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      await alert.acknowledge(acknowledgedBy, role, notes);
      logger.info(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);

      return alert;
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  /**
   * Escalate alert
   */
  async escalateAlert(alertId, escalatedTo, reason, priority) {
    try {
      const alert = await FraudAlert.findOne({ alertId });

      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      await alert.escalate(escalatedTo, reason, priority);
      logger.info(`Alert ${alertId} escalated to ${escalatedTo}`);

      // Notify escalation target
      await this.notifyUser(alert.userId, {
        type: 'alert_escalated',
        message: reason,
        alertId,
      });

      return alert;
    } catch (error) {
      logger.error('Error escalating alert:', error);
      throw error;
    }
  }

  /**
   * Record investigation findings
   */
  async investigateAlert(alertId, investigatedBy, findings, recommendedAction) {
    try {
      const alert = await FraudAlert.findOne({ alertId });

      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      alert.status = 'investigating';
      alert.investigation = {
        investigatedBy,
        investigatedAt: new Date(),
        findings,
        recommendedAction,
        evidenceCollected: [],
      };

      await alert.save();
      logger.info(`Alert ${alertId} investigation started by ${investigatedBy}`);

      return alert;
    } catch (error) {
      logger.error('Error investigating alert:', error);
      throw error;
    }
  }

  /**
   * Record action taken
   */
  async recordAction(alertId, action, actionBy, reason) {
    try {
      const alert = await FraudAlert.findOne({ alertId });

      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      await alert.recordAction(action, actionBy, reason);
      logger.info(`Action ${action} recorded for alert ${alertId}`);

      // Notify user of action
      if (action === 'block') {
        await this.notifyUser(alert.userId, {
          type: 'transaction_blocked',
          message: 'Your transaction was blocked due to fraud detection',
          alertId,
        });
      }

      return alert;
    } catch (error) {
      logger.error('Error recording action:', error);
      throw error;
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId, resolution, resolvedBy, feedback) {
    try {
      const alert = await FraudAlert.findOne({ alertId });

      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      await alert.resolve(resolution, resolvedBy, feedback);
      logger.info(`Alert ${alertId} resolved as ${resolution}`);

      return alert;
    } catch (error) {
      logger.error('Error resolving alert:', error);
      throw error;
    }
  }

  /**
   * Dismiss alert as false positive
   */
  async dismissAlert(alertId, dismissedBy, reason) {
    try {
      const alert = await FraudAlert.findOne({ alertId });

      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      alert.status = 'dismissed';
      alert.resolution = {
        resolvedAt: new Date(),
        resolvedBy: dismissedBy,
        resolution: 'false_positive',
        feedback: reason,
        feedbackUsedForRetraining: true,
      };

      await alert.save();
      logger.info(`Alert ${alertId} dismissed as false positive`);

      return alert;
    } catch (error) {
      logger.error('Error dismissing alert:', error);
      throw error;
    }
  }

  /**
   * Get alerts for user
   */
  async getUserAlerts(userId, status = 'open', limit = 20) {
    try {
      const query = { userId };
      if (status) query.status = status;

      const alerts = await FraudAlert.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);

      return {
        total: await FraudAlert.countDocuments(query),
        alerts,
      };
    } catch (error) {
      logger.error('Error getting user alerts:', error);
      throw error;
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(timeframe = '24h') {
    try {
      const startDate = this._getDateFromTimeframe(timeframe);

      const stats = await FraudAlert.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            totalAlerts: { $sum: 1 },
            critical: {
              $sum: {
                $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0],
              },
            },
            high: {
              $sum: {
                $cond: [{ $eq: ['$severity', 'high'] }, 1, 0],
              },
            },
            medium: {
              $sum: {
                $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0],
              },
            },
            low: {
              $sum: {
                $cond: [{ $eq: ['$severity', 'low'] }, 1, 0],
              },
            },
            resolved: {
              $sum: {
                $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0],
              },
            },
            openAlerts: {
              $sum: {
                $cond: [{ $eq: ['$status', 'open'] }, 1, 0],
              },
            },
          },
        },
      ]);

      return stats[0] || {
        totalAlerts: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        resolved: 0,
        openAlerts: 0,
      };
    } catch (error) {
      logger.error('Error getting alert statistics:', error);
      throw error;
    }
  }

  /**
   * Get alerts by category
   */
  async getAlertsByCategory(timeframe = '7d') {
    try {
      const startDate = this._getDateFromTimeframe(timeframe);

      const alerts = await FraudAlert.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgRiskScore: { $avg: '$riskScore' },
            maxRiskScore: { $max: '$riskScore' },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      return alerts;
    } catch (error) {
      logger.error('Error getting alerts by category:', error);
      throw error;
    }
  }

  /**
   * Search alerts
   */
  async searchAlerts(query) {
    try {
      const searchQuery = {};

      if (query.userId) searchQuery.userId = query.userId;
      if (query.alertId) searchQuery.alertId = query.alertId;
      if (query.severity) searchQuery.severity = query.severity;
      if (query.status) searchQuery.status = query.status;
      if (query.category) searchQuery.category = query.category;
      if (query.entityType) searchQuery.entityType = query.entityType;

      if (query.riskScoreRange) {
        searchQuery.riskScore = {
          $gte: query.riskScoreRange.min,
          $lte: query.riskScoreRange.max,
        };
      }

      if (query.dateRange) {
        searchQuery.createdAt = {
          $gte: new Date(query.dateRange.start),
          $lte: new Date(query.dateRange.end),
        };
      }

      const alerts = await FraudAlert.find(searchQuery)
        .sort({ createdAt: -1 })
        .limit(query.limit || 100)
        .skip(query.skip || 0);

      const total = await FraudAlert.countDocuments(searchQuery);

      return { alerts, total };
    } catch (error) {
      logger.error('Error searching alerts:', error);
      throw error;
    }
  }

  /**
   * Notify admins of critical alert
   */
  async notifyAdmins(alert) {
    try {
      logger.warn(`CRITICAL ALERT: ${alert.alertId} - Risk Score: ${alert.riskScore}`);
      // In production, integrate with email/SMS service
      // await emailService.sendAdminAlert(alert);
      // await smsService.sendAdminAlert(alert);
    } catch (error) {
      logger.error('Error notifying admins:', error);
    }
  }

  /**
   * Notify user
   */
  async notifyUser(userId, notification) {
    try {
      logger.info(`Notifying user ${userId}: ${notification.type}`);
      // In production, integrate with notification service
      // await notificationService.sendToUser(userId, notification);
    } catch (error) {
      logger.error('Error notifying user:', error);
    }
  }

  /**
   * Helper: Get date from timeframe
   */
  _getDateFromTimeframe(timeframe) {
    const now = new Date();
    const match = timeframe.match(/(\d+)([dhm])/);

    if (!match) return new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [, value, unit] = match;
    const amount = parseInt(value);

    switch (unit) {
      case 'd':
        return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
      case 'h':
        return new Date(now.getTime() - amount * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() - amount * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get alert by ID
   */
  async getAlertById(alertId) {
    try {
      return await FraudAlert.findOne({ alertId });
    } catch (error) {
      logger.error('Error getting alert:', error);
      throw error;
    }
  }

  /**
   * Get related alerts
   */
  async getRelatedAlerts(alertId) {
    try {
      const alert = await FraudAlert.findOne({ alertId });

      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      const relatedAlerts = await FraudAlert.find({
        userId: alert.userId,
        entityType: alert.entityType,
        createdAt: {
          $gte: new Date(alert.createdAt.getTime() - 24 * 60 * 60 * 1000),
          $lte: new Date(alert.createdAt.getTime() + 24 * 60 * 60 * 1000),
        },
      }).limit(5);

      return relatedAlerts;
    } catch (error) {
      logger.error('Error getting related alerts:', error);
      throw error;
    }
  }
}

module.exports = new FraudAlertService();
