/**
 * Analytics Dashboard Service
 * Provides aggregated, dashboard-ready analytics data
 * Builds on ReminderDeliveryLog for performance visualization
 */

const ReminderDeliveryLog = require('../models/ReminderDeliveryLog');
const Reminder = require('../models/Reminder');
const logger = require('../utils/logger');

class AnalyticsDashboardService {
  /**
   * Get comprehensive dashboard overview
   * @param {String} userId - User ID
   * @param {Number} daysBack - Days to analyze (default 30)
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardOverview(userId, daysBack = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const [
        successRate,
        channelStats,
        deliveryTrend,
        failureAnalysis,
        deviceReach,
        peakTimes
      ] = await Promise.all([
        this._getSuccessRateStats(userId, startDate),
        this._getChannelStats(userId, startDate),
        this._getDeliveryTrend(userId, startDate),
        this._getFailureAnalysis(userId, startDate),
        this._getDeviceReach(userId, startDate),
        this._getPeakDeliveryTimes(userId, startDate)
      ]);

      return {
        period: `${daysBack} days`,
        startDate,
        endDate: new Date(),
        successRate,
        channelStats,
        deliveryTrend,
        failureAnalysis,
        deviceReach,
        peakTimes,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error getting dashboard overview:', error);
      throw error;
    }
  }

  /**
   * Get success rate statistics
   * @private
   */
  async _getSuccessRateStats(userId, startDate) {
    try {
      const result = await ReminderDeliveryLog.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalDeliveries: { $sum: 1 },
            successfulDeliveries: {
              $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
            },
            failedDeliveries: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            pendingDeliveries: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            }
          }
        }
      ]);

      if (result.length === 0) {
        return {
          totalDeliveries: 0,
          successfulDeliveries: 0,
          failedDeliveries: 0,
          pendingDeliveries: 0,
          successRate: 0
        };
      }

      const stats = result[0];
      const successRate = stats.totalDeliveries > 0
        ? Math.round((stats.successfulDeliveries / stats.totalDeliveries) * 100)
        : 0;

      return {
        ...stats,
        successRate
      };
    } catch (error) {
      logger.error('Error calculating success rate:', error);
      throw error;
    }
  }

  /**
   * Get per-channel breakdown
   * @private
   */
  async _getChannelStats(userId, startDate) {
    try {
      const result = await ReminderDeliveryLog.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$channel',
            total: { $sum: 1 },
            sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            avgDeliveryTime: { $avg: '$metadata.duration' }
          }
        },
        {
          $addFields: {
            successRate: {
              $cond: [
                { $eq: ['$total', 0] },
                0,
                { $round: [{ $multiply: [{ $divide: ['$sent', '$total'] }, 100] }, 2] }
              ]
            }
          }
        },
        {
          $sort: { total: -1 }
        }
      ]);

      return result;
    } catch (error) {
      logger.error('Error getting channel stats:', error);
      throw error;
    }
  }

  /**
   * Get delivery trend over time
   * @private
   */
  async _getDeliveryTrend(userId, startDate) {
    try {
      const result = await ReminderDeliveryLog.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            total: { $sum: 1 },
            sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      return result.map(item => ({
        date: item._id,
        total: item.total,
        sent: item.sent,
        failed: item.failed,
        successRate: item.total > 0 ? Math.round((item.sent / item.total) * 100) : 0
      }));
    } catch (error) {
      logger.error('Error getting delivery trend:', error);
      throw error;
    }
  }

  /**
   * Analyze failure patterns
   * @private
   */
  async _getFailureAnalysis(userId, startDate) {
    try {
      const result = await ReminderDeliveryLog.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate },
            status: 'failed'
          }
        },
        {
          $group: {
            _id: '$errorMessage',
            count: { $sum: 1 },
            channels: { $push: '$channel' }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 10
        }
      ]);

      return result.map(item => ({
        error: item._id || 'Unknown error',
        count: item.count,
        channels: [...new Set(item.channels)]
      }));
    } catch (error) {
      logger.error('Error analyzing failures:', error);
      throw error;
    }
  }

  /**
   * Get device reach for push notifications
   * @private
   */
  async _getDeviceReach(userId, startDate) {
    try {
      const result = await ReminderDeliveryLog.aggregate([
        {
          $match: {
            userId,
            channel: 'push',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$metadata.deviceInfo',
            count: { $sum: 1 },
            status: { $push: '$status' }
          }
        },
        {
          $addFields: {
            deviceName: { $cond: [{ $ne: ['$_id', null] }, '$_id', 'Unknown device'] }
          }
        }
      ]);

      return result.map(item => ({
        device: item.deviceName,
        deliveries: item.count,
        statuses: item.status
      }));
    } catch (error) {
      logger.error('Error getting device reach:', error);
      throw error;
    }
  }

  /**
   * Identify peak delivery times
   * @private
   */
  async _getPeakDeliveryTimes(userId, startDate) {
    try {
      const result = await ReminderDeliveryLog.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $project: {
            hour: { $hour: '$createdAt' },
            dayOfWeek: { $dayOfWeek: '$createdAt' },
            status: 1
          }
        },
        {
          $group: {
            _id: '$hour',
            total: { $sum: 1 },
            sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      return result.map(item => ({
        hour: item._id,
        deliveries: item.total,
        successful: item.sent,
        rate: item.total > 0 ? Math.round((item.sent / item.total) * 100) : 0
      }));
    } catch (error) {
      logger.error('Error getting peak times:', error);
      throw error;
    }
  }

  /**
   * Get channel comparison summary
   * @param {String} userId
   * @param {Number} daysBack
   */
  async getChannelComparison(userId, daysBack = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      return await this._getChannelStats(userId, startDate);
    } catch (error) {
      logger.error('Error getting channel comparison:', error);
      throw error;
    }
  }

  /**
   * Get reminder type breakdown
   * @param {String} userId
   * @param {Number} daysBack
   */
  async getReminderTypeAnalysis(userId, daysBack = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const result = await ReminderDeliveryLog.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$reminderCategory',
            total: { $sum: 1 },
            sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
          }
        },
        {
          $addFields: {
            successRate: {
              $cond: [
                { $eq: ['$total', 0] },
                0,
                { $round: [{ $multiply: [{ $divide: ['$sent', '$total'] }, 100] }, 2] }
              ]
            }
          }
        },
        {
          $sort: { total: -1 }
        }
      ]);

      return result;
    } catch (error) {
      logger.error('Error getting reminder type analysis:', error);
      throw error;
    }
  }

  /**
   * Get priority level impact
   * @param {String} userId
   * @param {Number} daysBack
   */
  async getPriorityImpactAnalysis(userId, daysBack = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const result = await ReminderDeliveryLog.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$reminderPriority',
            total: { $sum: 1 },
            sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
            avgRetries: { $avg: '$retryCount' }
          }
        },
        {
          $addFields: {
            successRate: {
              $cond: [
                { $eq: ['$total', 0] },
                0,
                { $round: [{ $multiply: [{ $divide: ['$sent', '$total'] }, 100] }, 2] }
              ]
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      return result;
    } catch (error) {
      logger.error('Error getting priority impact:', error);
      throw error;
    }
  }

  /**
   * Get template usage analytics
   * @param {String} userId
   * @param {Number} daysBack
   */
  async getTemplateUsageAnalytics(userId, daysBack = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get reminders with template usage
      const result = await Reminder.aggregate([
        {
          $match: {
            userId,
            templateId: { $ne: null },
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$templateId',
            reminderCount: { $sum: 1 },
            titles: { $push: '$title' }
          }
        },
        {
          $lookup: {
            from: 'remindertemplates',
            localField: '_id',
            foreignField: '_id',
            as: 'template'
          }
        },
        {
          $unwind: {
            path: '$template',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            templateName: '$template.name',
            templateId: '$_id',
            reminderCount: 1,
            isDefault: '$template.isDefault'
          }
        },
        {
          $sort: { reminderCount: -1 }
        }
      ]);

      return result;
    } catch (error) {
      logger.error('Error getting template usage analytics:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsDashboardService();
