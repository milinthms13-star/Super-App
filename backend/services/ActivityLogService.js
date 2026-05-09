/**
 * Activity Log Service - Phase 10 Business Logic
 * Comprehensive activity logging and monitoring
 */

const ActivityLog = require('../models/ActivityLog');

class ActivityLogService {
  async logActivity(userId, userType, activityType, details = {}) {
    try {
      const logId = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const activityLog = new ActivityLog({
        logId,
        userId,
        userType,
        activityType,
        module: this._getModule(activityType),
        entityType: details.entityType,
        entityId: details.entityId,
        entityName: details.entityName,
        details: {
          description: details.description,
          oldValue: details.oldValue,
          newValue: details.newValue,
          amount: details.amount,
          currency: details.currency,
          status: details.status,
          metadata: details.metadata,
        },
        ipAddress: details.ipAddress,
        deviceInfo: details.deviceInfo || {},
        location: details.location || {},
        sessionId: details.sessionId,
        timestamp: new Date(),
        sensitiveData: details.sensitiveData || {},
        complianceFlags: details.complianceFlags || {},
      });

      await activityLog.save();

      return {
        success: true,
        data: { logId },
        message: 'Activity logged successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to log activity',
        errors: [error.message],
      };
    }
  }

  async getUserActivityLog(userId, filters = {}) {
    try {
      const query = { userId };

      if (filters.activityType) query.activityType = filters.activityType;
      if (filters.module) query.module = filters.module;

      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
        if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
      }

      const logs = await ActivityLog.find(query)
        .sort({ timestamp: -1 })
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);

      const total = await ActivityLog.countDocuments(query);

      return {
        success: true,
        data: { logs, total },
        message: 'Activity logs retrieved',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve activity logs',
        errors: [error.message],
      };
    }
  }

  async getActivityDetails(logId) {
    try {
      const log = await ActivityLog.findOne({ logId });

      if (!log) {
        return { success: false, message: 'Activity log not found', statusCode: 404 };
      }

      return {
        success: true,
        data: log,
        message: 'Activity details retrieved',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve activity details',
        errors: [error.message],
      };
    }
  }

  async getAnomalousActivity(userId, timeWindowDays = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeWindowDays);

      const activities = await ActivityLog.find({
        userId,
        timestamp: { $gte: startDate },
      }).sort({ timestamp: -1 });

      // Analyze for anomalies
      const anomalies = this._detectAnomalies(activities);

      return {
        success: true,
        data: { anomalies, activityCount: activities.length },
        message: 'Anomalous activities detected',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to analyze activities',
        errors: [error.message],
      };
    }
  }

  async exportActivityLogs(userId, format = 'json') {
    try {
      const logs = await ActivityLog.find({ userId }).sort({ timestamp: -1 });

      let exportData;
      if (format === 'json') {
        exportData = JSON.stringify(logs, null, 2);
      } else if (format === 'csv') {
        exportData = this._convertToCSV(logs);
      }

      return {
        success: true,
        data: { exportData, count: logs.length },
        message: 'Activity logs exported',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to export activity logs',
        errors: [error.message],
      };
    }
  }

  // Helper methods
  _getModule(activityType) {
    const moduleMap = {
      login: 'auth',
      logout: 'auth',
      signup: 'auth',
      profile_update: 'profile',
      place_order: 'order',
      payment_success: 'payment',
      rate_restaurant: 'review',
    };
    return moduleMap[activityType] || 'general';
  }

  _detectAnomalies(activities) {
    const anomalies = [];
    // TODO: Implement anomaly detection logic
    return anomalies;
  }

  _convertToCSV(logs) {
    const headers = ['logId', 'userId', 'activityType', 'module', 'timestamp'];
    const rows = logs.map((log) =>
      headers.map((header) => JSON.stringify(log[header] || '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
}

module.exports = new ActivityLogService();
