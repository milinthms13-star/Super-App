const DataRetentionPolicy = require('../models/DataRetentionPolicy');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const logger = require('../utils/logger');
const cron = require('node-cron');

class DataManagementService {
  constructor() {
    if (DataManagementService.instance) {
      return DataManagementService.instance;
    }
    DataManagementService.instance = this;
  }

  /**
   * Get detailed statistics for user
   */
  async getDetailedStatistics(userId, dateRange = {}) {
    try {
      // Backward-compatible input shape:
      // getDetailedStatistics({ userId, from, to })
      if (
        userId &&
        typeof userId === 'object' &&
        !Array.isArray(userId) &&
        ('userId' in userId || 'from' in userId || 'to' in userId || 'fromDate' in userId || 'toDate' in userId)
      ) {
        const payload = userId;
        const range = {
          from: payload.from || payload.fromDate || null,
          to: payload.to || payload.toDate || null,
        };
        return this.getDetailedStatistics(payload.userId, range);
      }

      const query = { $or: [{ senderId: userId }, { participants: userId }] };

      if (dateRange.from || dateRange.to) {
        query.createdAt = {};
        if (dateRange.from) query.createdAt.$gte = dateRange.from;
        if (dateRange.to) query.createdAt.$lte = dateRange.to;
      }

      const totalMessages = await Message.countDocuments({ senderId: userId, ...query });
      const totalChats = await Chat.countDocuments({
        $or: [{ participants: userId }, { owner: userId }],
      });

      const messagesByType = await Message.aggregate([
        { $match: { senderId: userId } },
        { $group: { _id: '$messageType', count: { $sum: 1 } } },
      ]);

      const mediaMessages = await Message.countDocuments({
        senderId: userId,
        'mediaUrls.0': { $exists: true },
      });

      const stats = {
        totalMessages,
        totalChats,
        mediaMessages,
        messagesByType: messagesByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        accountCreatedAt: (await require('../models/User').findById(userId))?.createdAt,
      };

      return stats;
    } catch (error) {
      logger.error('Error retrieving detailed statistics:', error);
      throw error;
    }
  }

  /**
   * Get most active chats for user
   */
  async getMostActiveChats(userId, limit = 10) {
    try {
      // Backward-compatible input shape:
      // getMostActiveChats({ userId, limit })
      if (
        userId &&
        typeof userId === 'object' &&
        !Array.isArray(userId) &&
        'userId' in userId
      ) {
        const payload = userId;
        return this.getMostActiveChats(payload.userId, payload.limit || limit);
      }

      const activeChats = await Chat.aggregate([
        {
          $match: {
            $or: [{ participants: userId }, { owner: userId }],
          },
        },
        {
          $lookup: {
            from: 'messages',
            localField: '_id',
            foreignField: 'chatId',
            as: 'messages',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            type: 1,
            messageCount: { $size: '$messages' },
            lastMessageAt: { $max: '$messages.createdAt' },
          },
        },
        { $sort: { messageCount: -1 } },
        { $limit: limit },
      ]);

      return activeChats;
    } catch (error) {
      logger.error('Error retrieving most active chats:', error);
      throw error;
    }
  }

  /**
   * Get message trends for user
   */
  async getMessageTrends(userId, timeframe = 'month') {
    try {
      // Backward-compatible input shape:
      // getMessageTrends({ userId, timeframe })
      if (
        userId &&
        typeof userId === 'object' &&
        !Array.isArray(userId) &&
        'userId' in userId
      ) {
        const payload = userId;
        const result = await this.getMessageTrends(payload.userId, payload.timeframe || timeframe);
        return result.trends || [];
      }

      const now = new Date();
      let groupFormat = '%Y-%m-%d';
      let matchDate = new Date();

      if (timeframe === 'week') {
        matchDate.setDate(matchDate.getDate() - 7);
        groupFormat = '%Y-%m-%d';
      } else if (timeframe === 'month') {
        matchDate.setMonth(matchDate.getMonth() - 1);
        groupFormat = '%Y-%m-%d';
      } else if (timeframe === 'year') {
        matchDate.setFullYear(matchDate.getFullYear() - 1);
        groupFormat = '%Y-%m';
      }

      const trends = await Message.aggregate([
        {
          $match: {
            senderId: userId,
            createdAt: { $gte: matchDate, $lte: now },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
            messageCount: { $sum: 1 },
            mediaCount: {
              $sum: { $cond: ['$mediaUrls.0', 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return {
        timeframe,
        trends,
      };
    } catch (error) {
      logger.error('Error retrieving message trends:', error);
      throw error;
    }
  }

  /**
   * Get media usage statistics
   */
  async getMediaUsageStats(userId) {
    try {
      const mediaStats = await Message.aggregate([
        {
          $match: { senderId: userId, 'mediaUrls.0': { $exists: true } },
        },
        {
          $unwind: '$mediaUrls',
        },
        {
          $group: {
            _id: '$mediaUrls.type',
            count: { $sum: 1 },
            totalSize: { $sum: '$mediaUrls.size' },
          },
        },
      ]);

      return {
        totalMediaMessages: mediaStats.reduce((sum, item) => sum + item.count, 0),
        byType: mediaStats,
      };
    } catch (error) {
      logger.error('Error retrieving media usage stats:', error);
      throw error;
    }
  }

  /**
   * Set data retention policy for user
   */
  async setRetentionPolicy(userId, policyConfig) {
    try {
      // Backward-compatible input shape:
      // setRetentionPolicy({ userId, ...policyConfig })
      if (
        userId &&
        typeof userId === 'object' &&
        !Array.isArray(userId) &&
        'userId' in userId
      ) {
        const payload = userId;
        const { userId: uid, ...cfg } = payload;
        return this.setRetentionPolicy(uid, cfg);
      }

      let policy = await DataRetentionPolicy.findOne({ userId });

      if (!policy) {
        policy = new DataRetentionPolicy({
          userId,
          ...policyConfig,
        });
      } else {
        Object.assign(policy, policyConfig);
      }

      // Calculate next execution time
      const schedule = policy.executionSchedule;
      if (schedule.enabled) {
        const nextRun = this._calculateNextExecutionTime(schedule);
        policy.statistics.nextExecutionAt = nextRun;
      }

      await policy.save();
      logger.info(`Retention policy set for user ${userId}`);
      return policy;
    } catch (error) {
      logger.error('Error setting retention policy:', error);
      throw error;
    }
  }

  /**
   * Get retention policy for user
   */
  async getRetentionPolicy(userId) {
    try {
      // Backward-compatible input shape:
      // getRetentionPolicy({ userId })
      if (
        userId &&
        typeof userId === 'object' &&
        !Array.isArray(userId) &&
        'userId' in userId
      ) {
        return this.getRetentionPolicy(userId.userId);
      }

      let policy = await DataRetentionPolicy.findOne({ userId });

      if (!policy) {
        // Create default policy
        policy = new DataRetentionPolicy({
          userId,
        });
        await policy.save();
      }

      return policy;
    } catch (error) {
      logger.error('Error retrieving retention policy:', error);
      throw error;
    }
  }

  /**
   * Archive old messages
   */
  async archiveOldMessages(userId, olderThanDays = 365) {
    try {
      // Backward-compatible input shape:
      // archiveOldMessages({ userId, olderThanDays })
      if (
        userId &&
        typeof userId === 'object' &&
        !Array.isArray(userId) &&
        'userId' in userId
      ) {
        const payload = userId;
        return this.archiveOldMessages(payload.userId, payload.olderThanDays || olderThanDays);
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await Message.updateMany(
        {
          senderId: userId,
          createdAt: { $lt: cutoffDate },
          isArchived: { $ne: true },
        },
        {
          isArchived: true,
          archivedAt: new Date(),
        }
      );

      logger.info(`Archived ${result.modifiedCount} messages for user ${userId}`);
      return result;
    } catch (error) {
      logger.error('Error archiving old messages:', error);
      throw error;
    }
  }

  /**
   * Purge deleted messages permanently
   */
  async purgeDeletedMessages(olderThanDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await Message.deleteMany({
        isDeleted: true,
        deletedAt: { $lt: cutoffDate },
      });

      logger.info(`Permanently deleted ${result.deletedCount} old deleted messages`);
      return result;
    } catch (error) {
      logger.error('Error purging deleted messages:', error);
      throw error;
    }
  }

  /**
   * Export all user data (GDPR)
   */
  async exportUserData(userId) {
    try {
      // Backward-compatible input shape:
      // exportUserData({ userId })
      if (
        userId &&
        typeof userId === 'object' &&
        !Array.isArray(userId) &&
        'userId' in userId
      ) {
        return this.exportUserData(userId.userId);
      }

      const user = await require('../models/User').findById(userId);
      const chats = await Chat.find({
        $or: [{ participants: userId }, { owner: userId }],
      });
      const messages = await Message.find({ senderId: userId });

      const exportData = {
        user: {
          id: user?._id || userId,
          username: user?.username || 'unknown',
          email: user?.email || null,
          createdAt: user?.createdAt || null,
        },
        statistics: await this.getDetailedStatistics(userId),
        chats: chats.map((chat) => ({
          id: chat._id,
          name: chat.name,
          type: chat.type,
          createdAt: chat.createdAt,
        })),
        messageCount: messages.length,
        exportedAt: new Date(),
      };

      return exportData;
    } catch (error) {
      logger.error('Error exporting user data:', error);
      throw error;
    }
  }

  /**
   * Calculate next execution time for retention policy
   */
  _calculateNextExecutionTime(schedule) {
    const now = new Date();
    const nextRun = new Date();

    // Set to next occurrence of scheduled day and time
    const [hours, minutes] = schedule.timeOfDay.split(':').map(Number);
    nextRun.setHours(hours, minutes, 0, 0);

    // Set to next scheduled day of week
    const dayDiff = (schedule.dayOfWeek - nextRun.getDay() + 7) % 7;
    if (dayDiff === 0 && nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 7);
    } else {
      nextRun.setDate(nextRun.getDate() + dayDiff);
    }

    return nextRun;
  }

  /**
   * Start data management cron jobs
   */
  startDataManagementJobs() {
    try {
      // Execute retention policies every hour
      cron.schedule('0 * * * *', async () => {
        await this._executeRetentionPolicies();
      });

      // Purge old deleted messages daily at 3 AM
      cron.schedule('0 3 * * *', async () => {
        await this.purgeDeletedMessages(30);
      });

      logger.info('Data management jobs started');
    } catch (error) {
      logger.error('Error starting data management jobs:', error);
    }
  }

  /**
   * Execute all active retention policies
   */
  async _executeRetentionPolicies() {
    try {
      const policies = await DataRetentionPolicy.find({
        'executionSchedule.enabled': true,
        'statistics.nextExecutionAt': { $lte: new Date() },
      });

      for (const policy of policies) {
        await this.archiveOldMessages(
          policy.userId,
          policy.messageRetentionDays
        );

        // Update statistics
        policy.statistics.lastExecutionAt = new Date();
        policy.statistics.nextExecutionAt = this._calculateNextExecutionTime(
          policy.executionSchedule
        );
        await policy.save();
      }

      logger.info(`Executed ${policies.length} retention policies`);
    } catch (error) {
      logger.error('Error executing retention policies:', error);
    }
  }
}

module.exports = new DataManagementService();
