/**
 * AuditLoggingService.js
 * Phase 10: Security & Compliance - Audit trail, activity logging, compliance tracking
 */

const mongoose = require('mongoose');

class AuditLoggingService {
  /**
   * Log security event
   * @param {object} eventData - Event details
   * @returns {Promise<{success, message, data}>}
   */
  static async logSecurityEvent(eventData) {
    try {
      const auditCollection = mongoose.connection.collection('securityevents');
      
      const event = {
        eventId: `SEC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        eventType: eventData.eventType, // login, logout, failed_auth, permission_change, etc
        severity: eventData.severity || 'info', // critical, high, medium, low, info
        userId: eventData.userId || 'system',
        affectedResource: eventData.affectedResource || 'system',
        action: eventData.action || 'unknown',
        status: eventData.status || 'completed',
        timestamp: new Date(),
        ipAddress: eventData.ipAddress || 'unknown',
        userAgent: eventData.userAgent || 'unknown',
        details: eventData.details || {},
        result: eventData.result || 'success'
      };

      await auditCollection.insertOne(event);

      return {
        success: true,
        message: 'Security event logged',
        data: {
          eventId: event.eventId,
          eventType: event.eventType,
          severity: event.severity,
          timestamp: event.timestamp
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Event logging failed: ${error.message}`
      };
    }
  }

  /**
   * Log admin action with reversibility
   * @param {object} adminActionData - Admin action details
   * @returns {Promise<{success, message, data}>}
   */
  static async logAdminAction(adminActionData) {
    try {
      const adminAuditCollection = mongoose.connection.collection('adminaudits');
      
      const action = {
        actionId: `ADM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        adminId: adminActionData.adminId,
        actionType: adminActionData.actionType, // user_edit, policy_update, system_config, etc
        targetResourceType: adminActionData.targetResourceType,
        targetResourceId: adminActionData.targetResourceId,
        changes: {
          before: adminActionData.before || {},
          after: adminActionData.after || {}
        },
        reason: adminActionData.reason || 'no reason provided',
        timestamp: new Date(),
        ipAddress: adminActionData.ipAddress || 'unknown',
        status: 'completed',
        reversible: adminActionData.reversible !== false,
        reversalActionId: null
      };

      const result = await adminAuditCollection.insertOne(action);

      return {
        success: true,
        message: 'Admin action logged',
        data: {
          actionId: action.actionId,
          adminId: action.adminId,
          actionType: action.actionType,
          reversible: action.reversible,
          timestamp: action.timestamp
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Admin action logging failed: ${error.message}`
      };
    }
  }

  /**
   * Reverse admin action (audit trail only)
   * @param {string} actionId - Action to reverse
   * @param {object} reversalData - Reversal details
   * @returns {Promise<{success, message, data}>}
   */
  static async reverseAdminAction(actionId, reversalData) {
    try {
      const adminAuditCollection = mongoose.connection.collection('adminaudits');
      
      // Get original action
      const originalAction = await adminAuditCollection.findOne({ actionId });
      
      if (!originalAction || !originalAction.reversible) {
        return {
          success: false,
          message: 'Action cannot be reversed'
        };
      }

      // Create reversal action
      const reversalAction = {
        actionId: `ADM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        adminId: reversalData.adminId,
        actionType: 'action_reversal',
        targetResourceType: originalAction.targetResourceType,
        targetResourceId: originalAction.targetResourceId,
        changes: {
          before: originalAction.after,
          after: originalAction.before
        },
        reason: reversalData.reason || 'reversal requested',
        timestamp: new Date(),
        ipAddress: reversalData.ipAddress || 'unknown',
        reversalOf: actionId,
        status: 'completed'
      };

      await adminAuditCollection.insertOne(reversalAction);

      // Mark original as reversed
      await adminAuditCollection.updateOne(
        { actionId },
        {
          $set: {
            reversalActionId: reversalAction.actionId,
            reversed: true,
            reversedAt: new Date()
          }
        }
      );

      return {
        success: true,
        message: 'Admin action reversed',
        data: {
          originalActionId: actionId,
          reversalActionId: reversalAction.actionId,
          reversedAt: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Action reversal failed: ${error.message}`
      };
    }
  }

  /**
   * Log user activity
   * @param {object} activityData - Activity details
   * @returns {Promise<{success, message, data}>}
   */
  static async logUserActivity(activityData) {
    try {
      const activityCollection = mongoose.connection.collection('useractivitylogs');
      
      const activity = {
        activityId: `ACT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: activityData.userId,
        activityType: activityData.activityType, // ride_booked, payment_made, profile_updated, etc
        description: activityData.description || '',
        metadata: activityData.metadata || {},
        timestamp: new Date(),
        duration: activityData.duration || null, // in milliseconds
        ipAddress: activityData.ipAddress || 'unknown',
        deviceInfo: {
          userAgent: activityData.userAgent || 'unknown',
          deviceType: activityData.deviceType || 'unknown',
          osType: activityData.osType || 'unknown'
        },
        location: activityData.location || null,
        status: activityData.status || 'success'
      };

      await activityCollection.insertOne(activity);

      return {
        success: true,
        message: 'User activity logged',
        data: {
          activityId: activity.activityId,
          userId: activity.userId,
          activityType: activity.activityType,
          timestamp: activity.timestamp
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Activity logging failed: ${error.message}`
      };
    }
  }

  /**
   * Get user activity history
   * @param {string} userId - User ID
   * @param {object} filters - Filter options
   * @returns {Promise<{success, message, data}>}
   */
  static async getUserActivityHistory(userId, filters = {}) {
    try {
      const activityCollection = mongoose.connection.collection('useractivitylogs');
      
      const limit = filters.limit || 50;
      const days = filters.days || 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const activities = await activityCollection
        .find({
          userId,
          timestamp: { $gte: startDate }
        })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean()
        .toArray();

      return {
        success: true,
        message: `Retrieved ${activities.length} activities`,
        data: {
          userId,
          period: {
            days,
            startDate,
            endDate: new Date()
          },
          activityCount: activities.length,
          activities: activities
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to retrieve activity history: ${error.message}`
      };
    }
  }

  /**
   * Detect suspicious activity
   * @param {string} userId - User ID
   * @returns {Promise<{success, message, data}>}
   */
  static async detectSuspiciousActivity(userId) {
    try {
      const activityCollection = mongoose.connection.collection('useractivitylogs');
      
      // Get recent activities (last 24 hours)
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentActivities = await activityCollection
        .find({
          userId,
          timestamp: { $gte: last24h }
        })
        .lean()
        .toArray();

      // Anomaly detection logic
      const anomalies = [];
      
      // Check for rapid activities
      if (recentActivities.length > 100) {
        anomalies.push({
          type: 'rapid_activity',
          severity: 'high',
          message: `${recentActivities.length} activities in 24 hours (unusual)`
        });
      }

      // Check for failed authentication attempts
      const failedAuths = recentActivities.filter(a => a.activityType === 'failed_auth');
      if (failedAuths.length > 5) {
        anomalies.push({
          type: 'multiple_failed_auths',
          severity: 'high',
          message: `${failedAuths.length} failed authentication attempts`
        });
      }

      // Check for geographic anomalies (if location data exists)
      const locationChanges = recentActivities.filter(a => a.location);
      if (locationChanges.length > 2) {
        // Could indicate account compromise
        anomalies.push({
          type: 'geographic_anomaly',
          severity: 'medium',
          message: 'Multiple location changes detected'
        });
      }

      return {
        success: true,
        message: `Detected ${anomalies.length} anomalies`,
        data: {
          userId,
          suspiciousActivityDetected: anomalies.length > 0,
          anomalyCount: anomalies.length,
          anomalies: anomalies,
          riskLevel: anomalies.length > 2 ? 'high' : 'low'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Anomaly detection failed: ${error.message}`
      };
    }
  }

  /**
   * Export audit trail
   * @param {object} filterOptions - Export filters
   * @returns {Promise<{success, message, data}>}
   */
  static async exportAuditTrail(filterOptions = {}) {
    try {
      const auditCollection = mongoose.connection.collection('securityevents');
      const adminCollection = mongoose.connection.collection('adminaudits');
      
      const startDate = filterOptions.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const endDate = filterOptions.endDate || new Date();
      const format = filterOptions.format || 'json';

      const securityEvents = await auditCollection
        .find({
          timestamp: { $gte: startDate, $lte: endDate }
        })
        .lean()
        .toArray();

      const adminActions = await adminCollection
        .find({
          timestamp: { $gte: startDate, $lte: endDate }
        })
        .lean()
        .toArray();

      const report = {
        exportId: `AUD-${Date.now()}`,
        exportedAt: new Date(),
        period: {
          startDate,
          endDate
        },
        format,
        summary: {
          securityEventCount: securityEvents.length,
          adminActionCount: adminActions.length,
          totalRecords: securityEvents.length + adminActions.length
        },
        securityEvents: securityEvents,
        adminActions: adminActions
      };

      return {
        success: true,
        message: 'Audit trail exported',
        data: {
          exportId: report.exportId,
          exportedAt: report.exportedAt,
          format: report.format,
          recordCount: report.summary.totalRecords,
          securityEvents: report.summary.securityEventCount,
          adminActions: report.summary.adminActionCount
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Audit export failed: ${error.message}`
      };
    }
  }

  /**
   * Get audit statistics
   * @param {object} options - Statistics options
   * @returns {Promise<{success, message, data}>}
   */
  static async getAuditStatistics(options = {}) {
    try {
      const auditCollection = mongoose.connection.collection('securityevents');
      const days = options.days || 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const totalEvents = await auditCollection.countDocuments({
        timestamp: { $gte: startDate }
      });

      const eventsByType = await auditCollection
        .aggregate([
          {
            $match: { timestamp: { $gte: startDate } }
          },
          {
            $group: {
              _id: '$eventType',
              count: { $sum: 1 }
            }
          }
        ])
        .toArray();

      const eventsBySeverity = await auditCollection
        .aggregate([
          {
            $match: { timestamp: { $gte: startDate } }
          },
          {
            $group: {
              _id: '$severity',
              count: { $sum: 1 }
            }
          }
        ])
        .toArray();

      return {
        success: true,
        message: 'Audit statistics retrieved',
        data: {
          period: {
            days,
            startDate,
            endDate: new Date()
          },
          totalEvents,
          eventsByType: Object.fromEntries(eventsByType.map(e => [e._id, e.count])),
          eventsBySeverity: Object.fromEntries(eventsBySeverity.map(e => [e._id, e.count])),
          averageEventsPerDay: Math.round(totalEvents / days)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Statistics retrieval failed: ${error.message}`
      };
    }
  }

  /**
   * Create compliance report
   * @param {object} reportOptions - Report configuration
   * @returns {Promise<{success, message, data}>}
   */
  static async createComplianceReport(reportOptions = {}) {
    try {
      const auditCollection = mongoose.connection.collection('securityevents');
      
      const reportType = reportOptions.type || 'monthly';
      const startDate = reportOptions.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = reportOptions.endDate || new Date();

      const events = await auditCollection
        .find({
          timestamp: { $gte: startDate, $lte: endDate }
        })
        .lean()
        .toArray();

      const report = {
        reportId: `CMP-${Date.now()}`,
        reportType,
        period: { startDate, endDate },
        generatedAt: new Date(),
        eventsSummary: {
          total: events.length,
          critical: events.filter(e => e.severity === 'critical').length,
          high: events.filter(e => e.severity === 'high').length,
          medium: events.filter(e => e.severity === 'medium').length,
          low: events.filter(e => e.severity === 'low').length
        },
        complianceScore: this._calculateComplianceScore(events),
        recommendations: this._generateRecommendations(events)
      };

      return {
        success: true,
        message: 'Compliance report generated',
        data: {
          reportId: report.reportId,
          reportType: report.reportType,
          period: report.period,
          generatedAt: report.generatedAt,
          eventsSummary: report.eventsSummary,
          complianceScore: report.complianceScore
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Compliance report generation failed: ${error.message}`
      };
    }
  }

  /**
   * Calculate compliance score
   * @private
   * @param {array} events - Security events
   * @returns {number} Compliance score (0-100)
   */
  static _calculateComplianceScore(events) {
    if (events.length === 0) return 100;

    const criticalCount = events.filter(e => e.severity === 'critical').length;
    const highCount = events.filter(e => e.severity === 'high').length;
    
    let score = 100;
    score -= criticalCount * 10;
    score -= highCount * 5;
    
    return Math.max(0, score);
  }

  /**
   * Generate compliance recommendations
   * @private
   * @param {array} events - Security events
   * @returns {array} Recommendations
   */
  static _generateRecommendations(events) {
    const recommendations = [];

    const criticalCount = events.filter(e => e.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push({
        priority: 'critical',
        message: `${criticalCount} critical security events detected - immediate action required`
      });
    }

    const failedAuths = events.filter(e => e.eventType === 'failed_auth').length;
    if (failedAuths > 10) {
      recommendations.push({
        priority: 'high',
        message: `${failedAuths} failed authentication attempts - consider implementing rate limiting`
      });
    }

    return recommendations;
  }
}

module.exports = AuditLoggingService;
