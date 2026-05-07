const logger = require('../utils/logger');
const Message = require('../models/Message');
const MessageAnalytics = require('../models/MessageAnalytics');
const User = require('../models/User');
const Chat = require('../models/Chat');

/**
 * MessageAnalyticsService
 * Provides comprehensive messaging analytics for users and admins
 * Features: User trends, engagement metrics, real-time dashboards
 */
class MessageAnalyticsService {
  constructor() {
    this.name = 'MessageAnalyticsService';
  }

  /**
   * Get user-level analytics
   */
  async getUserAnalytics(userId, timeRangeMs = 30 * 24 * 60 * 60 * 1000) {
    try {
      const now = new Date();
      const startDate = new Date(now - timeRangeMs);

      const stats = await Message.aggregate([
        {
          $match: {
            senderId: userId,
            createdAt: { $gte: startDate, $lte: now },
          },
        },
        {
          $facet: {
            // Message frequency
            frequency: [
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$createdAt',
                    },
                  },
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],

            // Hourly distribution
            hourlyDistribution: [
              {
                $group: {
                  _id: {
                    $hour: '$createdAt',
                  },
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],

            // Message types
            messageTypes: [
              {
                $group: {
                  _id: '$messageType',
                  count: { $sum: 1 },
                },
              },
            ],

            // Total stats
            totalStats: [
              {
                $group: {
                  _id: null,
                  totalMessages: { $sum: 1 },
                  avgMessageLength: {
                    $avg: { $strLenCP: '$content' },
                  },
                },
              },
            ],
          },
        },
      ]);

      // Get response time metrics
      const responseMetrics = await this._getUserResponseMetrics(
        userId,
        startDate
      );

      // Get contact frequency heatmap
      const contactHeatmap = await this._getContactFrequencyHeatmap(
        userId,
        startDate
      );

      return {
        userId,
        timeRange: {
          start: startDate,
          end: now,
          days: Math.floor(timeRangeMs / (24 * 60 * 60 * 1000)),
        },
        messageFrequency: stats[0]?.frequency || [],
        hourlyDistribution: stats[0]?.hourlyDistribution || [],
        messageTypes: stats[0]?.messageTypes || [],
        totalStats: stats[0]?.totalStats[0] || {},
        responseMetrics,
        contactHeatmap,
      };
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      throw error;
    }
  }

  /**
   * Get admin-level platform analytics
   */
  async getPlatformAnalytics(period = 'daily') {
    try {
      const now = new Date();

      // Calculate date range based on period
      let startDate, dateFormat;
      switch (period) {
        case 'hourly':
          startDate = new Date(now - 24 * 60 * 60 * 1000);
          dateFormat = '%Y-%m-%d %H:00';
          break;
        case 'daily':
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
          dateFormat = '%Y-%m-%d';
          break;
        case 'weekly':
          startDate = new Date(now - 12 * 7 * 24 * 60 * 60 * 1000);
          dateFormat = '%Y-W%V';
          break;
        default:
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
          dateFormat = '%Y-%m-%d';
      }

      const analytics = await Message.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: now },
          },
        },
        {
          $facet: {
            // Time series
            timeSeries: [
              {
                $group: {
                  _id: {
                    $dateToString: { format: dateFormat, date: '$createdAt' },
                  },
                  messageCount: { $sum: 1 },
                  userCount: { $addToSet: '$senderId' },
                  avgResponseTime: { $avg: '$responseTime' },
                },
              },
              {
                $addFields: {
                  uniqueUsers: { $size: '$userCount' },
                },
              },
              { $sort: { _id: 1 } },
            ],

            // Top active users
            topUsers: [
              {
                $group: {
                  _id: '$senderId',
                  messageCount: { $sum: 1 },
                },
              },
              { $sort: { messageCount: -1 } },
              { $limit: 10 },
              {
                $lookup: {
                  from: 'users',
                  localField: '_id',
                  foreignField: '_id',
                  as: 'user',
                },
              },
            ],

            // Engagement metrics
            engagement: [
              {
                $group: {
                  _id: null,
                  totalMessages: { $sum: 1 },
                  totalUsers: { $addToSet: '$senderId' },
                  avgMessagesPerUser: { $avg: 1 },
                  readRate: {
                    $avg: { $cond: ['$isRead', 1, 0] },
                  },
                },
              },
              {
                $addFields: {
                  uniqueUsers: { $size: '$totalUsers' },
                },
              },
            ],

            // Abuse patterns
            abusePatterns: [
              {
                $match: { isReported: true },
              },
              {
                $group: {
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                  },
                  reportCount: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ]);

      return {
        period,
        generatedAt: now,
        timeSeries: analytics[0]?.timeSeries || [],
        topUsers: analytics[0]?.topUsers || [],
        engagement: analytics[0]?.engagement[0] || {},
        abusePatterns: analytics[0]?.abusePatterns || [],
      };
    } catch (error) {
      logger.error('Error getting platform analytics:', error);
      throw error;
    }
  }

  /**
   * Get real-time dashboard metrics
   */
  async getRealTimeDashboard() {
    try {
      const now = new Date();
      const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
      const lastHour = new Date(now - 60 * 60 * 1000);

      const metrics = await Message.aggregate([
        {
          $facet: {
            // Live message count (last hour)
            liveMessageCount: [
              {
                $match: {
                  createdAt: { $gte: lastHour },
                },
              },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                },
              },
            ],

            // Active users (last hour)
            activeUsers: [
              {
                $match: {
                  createdAt: { $gte: lastHour },
                },
              },
              {
                $group: {
                  _id: '$senderId',
                },
              },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                },
              },
            ],

            // 24-hour trend
            messagesTrend: [
              {
                $match: {
                  createdAt: { $gte: last24Hours },
                },
              },
              {
                $group: {
                  _id: {
                    $hour: '$createdAt',
                  },
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],

            // System health
            systemHealth: [
              {
                $facet: {
                  errorRate: [
                    { $match: { status: 'failed' } },
                    { $count: 'total' },
                  ],
                  totalMessages: [{ $count: 'total' }],
                },
              },
            ],
          },
        },
      ]);

      return {
        timestamp: now,
        liveMessageCount:
          metrics[0]?.liveMessageCount[0]?.count || 0,
        activeUsersCount: metrics[0]?.activeUsers[0]?.count || 0,
        messagesTrend: metrics[0]?.messagesTrend || [],
        systemHealth: {
          errorRate:
            metrics[0]?.systemHealth[0]?.errorRate[0]?.total || 0,
          totalMessages:
            metrics[0]?.systemHealth[0]?.totalMessages[0]?.total || 0,
        },
      };
    } catch (error) {
      logger.error('Error getting real-time dashboard:', error);
      throw error;
    }
  }

  /**
   * Get user response time metrics
   */
  async _getUserResponseMetrics(userId, startDate) {
    try {
      const responseMetrics = await Message.aggregate([
        {
          $match: {
            senderId: userId,
            createdAt: { $gte: startDate },
            responseTime: { $exists: true },
          },
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$responseTime' },
            minResponseTime: { $min: '$responseTime' },
            maxResponseTime: { $max: '$responseTime' },
            p50ResponseTime: { $percentile: { $avg: '$responseTime', p: [0.5] } },
            p95ResponseTime: { $percentile: { $avg: '$responseTime', p: [0.95] } },
            p99ResponseTime: { $percentile: { $avg: '$responseTime', p: [0.99] } },
          },
        },
      ]);

      return responseMetrics[0] || {};
    } catch (error) {
      logger.error('Error calculating response metrics:', error);
      return {};
    }
  }

  /**
   * Get contact frequency heatmap
   */
  async _getContactFrequencyHeatmap(userId, startDate) {
    try {
      const heatmap = await Message.aggregate([
        {
          $match: {
            $or: [{ senderId: userId }, { recipientId: userId }],
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              contactId: {
                $cond: [
                  { $eq: ['$senderId', userId] },
                  '$recipientId',
                  '$senderId',
                ],
              },
              hour: { $hour: '$createdAt' },
              dayOfWeek: { $dayOfWeek: '$createdAt' },
            },
            messageCount: { $sum: 1 },
          },
        },
        {
          $sort: { messageCount: -1 },
        },
        {
          $limit: 100,
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id.contactId',
            foreignField: '_id',
            as: 'contact',
          },
        },
      ]);

      return heatmap;
    } catch (error) {
      logger.error('Error calculating contact heatmap:', error);
      return [];
    }
  }

  /**
   * Record analytics snapshot
   */
  async recordAnalyticsSnapshot(period = 'daily') {
    try {
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Get aggregated metrics
      const stats = await Message.aggregate([
        {
          $match: {
            createdAt: {
              $gte: dayStart,
              $lt: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            totalUsers: { $addToSet: '$senderId' },
            messageTypes: {
              $push: {
                type: '$messageType',
                count: 1,
              },
            },
            avgReadRate: {
              $avg: { $cond: ['$isRead', 1, 0] },
            },
          },
        },
      ]);

      if (stats.length > 0) {
        const snapshot = new MessageAnalytics({
          date: dayStart,
          period,
          totalMessages: stats[0].totalMessages,
          totalUsers: stats[0].totalUsers.length,
          messageReadRate: stats[0].avgReadRate * 100,
          // Additional metrics can be added here
        });

        await snapshot.save();
        logger.info(`Analytics snapshot recorded for ${period}`);
        return snapshot;
      }
    } catch (error) {
      logger.error('Error recording analytics snapshot:', error);
      throw error;
    }
  }

  /**
   * Export analytics to CSV
   */
  async exportAnalyticsToCsv(userId, timeRangeMs = 30 * 24 * 60 * 60 * 1000) {
    try {
      const analytics = await this.getUserAnalytics(userId, timeRangeMs);
      
      // Format as CSV
      let csv = 'Date,MessageCount\n';
      analytics.messageFrequency.forEach((row) => {
        csv += `${row._id},${row.count}\n`;
      });

      return csv;
    } catch (error) {
      logger.error('Error exporting analytics:', error);
      throw error;
    }
  }
}

// Export singleton
module.exports = new MessageAnalyticsService();
