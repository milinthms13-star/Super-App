const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Conversation Analytics Service
 * Provides insights and metrics for conversations
 * Singleton pattern
 */

class ConversationAnalyticsService {
  constructor() {
    if (ConversationAnalyticsService.instance) {
      return ConversationAnalyticsService.instance;
    }
    this.analyticsCache = new Map();
    this.cacheTTL = 60 * 60 * 1000; // 1 hour
    ConversationAnalyticsService.instance = this;
  }

  /**
   * Get conversation overview/dashboard
   * @param {string} chatId - Chat ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Comprehensive analytics
   */
  async getConversationOverview(chatId, options = {}) {
    try {
      const { daysBack = 30 } = options;
      const cacheKey = `overview_${chatId}_${daysBack}`;

      if (this.analyticsCache.has(cacheKey)) {
        return this.analyticsCache.get(cacheKey);
      }

      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      // Get chat info
      const chat = await Chat.findById(chatId)
        .select('name participants createdAt')
        .populate('participants.userId', 'username')
        .lean();

      if (!chat) {
        throw new Error(`Chat ${chatId} not found`);
      }

      // Message statistics
      const messageStats = await Message.aggregate([
        {
          $match: {
            chatId: mongoose.Types.ObjectId(chatId),
            createdAt: { $gte: startDate },
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            totalWords: { $sum: { $size: { $split: ['$content', ' '] } } },
            avgMessageLength: { $avg: { $strLenCP: '$content' } },
            messagesWithMedia: {
              $sum: { $cond: [{ $ne: ['$media', null] }, 1, 0] },
            },
            messagesWithReactions: {
              $sum: { $cond: [{ $gt: ['$reactionCount', 0] }, 1, 0] },
            },
          },
        },
      ]);

      // Participant activity
      const participantActivity = await Message.aggregate([
        {
          $match: {
            chatId: mongoose.Types.ObjectId(chatId),
            createdAt: { $gte: startDate },
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: '$senderId',
            messageCount: { $sum: 1 },
            avgResponseTime: { $avg: { $subtract: [new Date(), '$createdAt'] } },
          },
        },
        { $sort: { messageCount: -1 } },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
      ]);

      // Activity timeline
      const activityTimeline = await Message.aggregate([
        {
          $match: {
            chatId: mongoose.Types.ObjectId(chatId),
            createdAt: { $gte: startDate },
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const overview = {
        chat: {
          id: chatId,
          name: chat.name,
          participantCount: chat.participants.length,
          createdAt: chat.createdAt,
        },
        messageStats: messageStats[0] || {
          totalMessages: 0,
          totalWords: 0,
          avgMessageLength: 0,
        },
        participantActivity,
        activityTimeline,
        dateRange: { startDate, daysBack },
      };

      // Cache
      this.analyticsCache.set(cacheKey, overview);
      setTimeout(() => this.analyticsCache.delete(cacheKey), this.cacheTTL);

      logger.info(`Analytics retrieved for chat ${chatId}`);
      return overview;
    } catch (error) {
      logger.error('Error getting conversation overview', { error });
      throw error;
    }
  }

  /**
   * Get participant engagement metrics
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID (optional for specific user)
   * @returns {Promise<Object>} Engagement metrics
   */
  async getEngagementMetrics(chatId, userId = null) {
    try {
      const query = {
        chatId: mongoose.Types.ObjectId(chatId),
        isDeleted: { $ne: true },
      };

      if (userId) {
        query.senderId = mongoose.Types.ObjectId(userId);
      }

      const engagement = await Message.aggregate([
        { $match: query },
        {
          $group: {
            _id: userId ? null : '$senderId',
            messageCount: { $sum: 1 },
            totalReactions: { $sum: '$reactionCount' },
            avgReactions: { $avg: '$reactionCount' },
            repliesGenerated: { $sum: '$replyCount' },
            forwards: { $sum: '$forwardCount' },
            engagement: {
              $sum: {
                $add: ['$reactionCount', '$replyCount', '$forwardCount'],
              },
            },
          },
        },
      ]);

      return engagement[0] || {
        messageCount: 0,
        totalReactions: 0,
        engagement: 0,
      };
    } catch (error) {
      logger.error('Error getting engagement metrics', { error });
      throw error;
    }
  }

  /**
   * Get sentiment analysis placeholder
   * @param {string} chatId - Chat ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Sentiment data
   */
  async getSentimentAnalysis(chatId, options = {}) {
    try {
      const { limit = 100 } = options;

      // In production, integrate with sentiment analysis API
      // This is a placeholder
      const messages = await Message.find({ chatId })
        .select('content senderId createdAt')
        .limit(limit)
        .lean();

      // Mock sentiment scoring
      const sentiments = messages.map((msg) => ({
        messageId: msg._id,
        content: msg.content?.substring(0, 100),
        sentiment: this.mockSentimentAnalysis(msg.content),
        confidence: 0.85,
      }));

      const summary = {
        positive: sentiments.filter((s) => s.sentiment === 'positive').length,
        neutral: sentiments.filter((s) => s.sentiment === 'neutral').length,
        negative: sentiments.filter((s) => s.sentiment === 'negative').length,
      };

      return { sentiments, summary };
    } catch (error) {
      logger.error('Error getting sentiment analysis', { error });
      throw error;
    }
  }

  /**
   * Get message trend analysis
   * @param {string} chatId - Chat ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Trend data
   */
  async getTrendAnalysis(chatId, options = {}) {
    try {
      const { daysBack = 30, interval = 'day' } = options;

      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      const dateFormat = this.getDateFormat(interval);

      const trends = await Message.aggregate([
        {
          $match: {
            chatId: mongoose.Types.ObjectId(chatId),
            createdAt: { $gte: startDate },
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: dateFormat, date: '$createdAt' },
            },
            messageCount: { $sum: 1 },
            uniqueParticipants: { $addToSet: '$senderId' },
            engagementScore: {
              $sum: {
                $add: ['$reactionCount', '$replyCount'],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return trends.map((t) => ({
        period: t._id,
        messageCount: t.messageCount,
        participants: t.uniqueParticipants.length,
        engagementScore: t.engagementScore,
      }));
    } catch (error) {
      logger.error('Error getting trend analysis', { error });
      throw error;
    }
  }

  /**
   * Get conversation health score
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Health metrics
   */
  async getConversationHealth(chatId) {
    try {
      const messages = await Message.countDocuments({ chatId });
      const activeParticipants = await Message.distinct('senderId', { chatId });
      const engagement = await this.getEngagementMetrics(chatId);

      // Calculate health score (0-100)
      const messageHealth = Math.min((messages / 1000) * 100, 100);
      const participantHealth =
        (activeParticipants.length / Math.max(activeParticipants.length, 1)) *
        100;
      const engagementHealth = Math.min(
        (engagement.engagement / Math.max(engagement.engagement, 1)) * 100,
        100
      );

      const healthScore = Math.round(
        (messageHealth + participantHealth + engagementHealth) / 3
      );

      return {
        healthScore,
        metrics: {
          messageHealth,
          participantHealth,
          engagementHealth,
        },
        status:
          healthScore > 70
            ? 'excellent'
            : healthScore > 40
              ? 'good'
              : 'needs_attention',
      };
    } catch (error) {
      logger.error('Error getting conversation health', { error });
      throw error;
    }
  }

  /**
   * Generate analytics report
   * @param {string} chatId - Chat ID
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Complete report
   */
  async generateAnalyticsReport(chatId, options = {}) {
    try {
      const overview = await this.getConversationOverview(chatId, options);
      const engagement = await this.getEngagementMetrics(chatId);
      const sentiment = await this.getSentimentAnalysis(chatId);
      const trends = await this.getTrendAnalysis(chatId);
      const health = await this.getConversationHealth(chatId);

      const report = {
        generatedAt: new Date(),
        chatId,
        overview,
        engagement,
        sentiment: sentiment.summary,
        trends,
        health,
      };

      logger.info(`Analytics report generated for chat ${chatId}`);
      return report;
    } catch (error) {
      logger.error('Error generating analytics report', { error });
      throw error;
    }
  }

  /**
   * Get most active hours
   * @param {string} chatId - Chat ID
   * @returns {Promise<Array>} Activity by hour
   */
  async getMostActiveHours(chatId) {
    try {
      const hours = await Message.aggregate([
        { $match: { chatId: mongoose.Types.ObjectId(chatId) } },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return hours.map((h) => ({
        hour: h._id,
        messageCount: h.count,
      }));
    } catch (error) {
      logger.error('Error getting active hours', { error });
      throw error;
    }
  }

  /**
   * Get conversation topics (keywords)
   * @param {string} chatId - Chat ID
   * @param {number} limit - Top N keywords
   * @returns {Promise<Array>} Top keywords
   */
  async getConversationTopics(chatId, limit = 20) {
    try {
      const messages = await Message.find({ chatId, isDeleted: { $ne: true } })
        .select('content')
        .lean();

      const keywordFrequency = new Map();

      messages.forEach((msg) => {
        if (msg.content) {
          const words = msg.content
            .toLowerCase()
            .split(/\W+/)
            .filter((w) => w.length > 4);

          words.forEach((word) => {
            keywordFrequency.set(word, (keywordFrequency.get(word) || 0) + 1);
          });
        }
      });

      const topics = Array.from(keywordFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([keyword, count]) => ({ keyword, frequency: count }));

      return topics;
    } catch (error) {
      logger.error('Error getting conversation topics', { error });
      throw error;
    }
  }

  /**
   * Helper: Get date format for aggregation
   * @private
   */
  getDateFormat(interval) {
    switch (interval) {
      case 'day':
        return '%Y-%m-%d';
      case 'week':
        return '%G-W%V';
      case 'month':
        return '%Y-%m';
      default:
        return '%Y-%m-%d';
    }
  }

  /**
   * Mock sentiment analysis
   * @private
   * In production, use proper sentiment analysis library or API
   */
  mockSentimentAnalysis(text) {
    if (!text) return 'neutral';
    const positiveWords = [
      'great',
      'good',
      'excellent',
      'happy',
      'love',
      'wonderful',
    ];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'sad', 'angry'];

    const lowerText = text.toLowerCase();
    const hasPositive = positiveWords.some((w) => lowerText.includes(w));
    const hasNegative = negativeWords.some((w) => lowerText.includes(w));

    if (hasPositive) return 'positive';
    if (hasNegative) return 'negative';
    return 'neutral';
  }

  /**
   * Clear analytics cache
   */
  clearCache() {
    this.analyticsCache.clear();
    logger.info('Analytics cache cleared');
  }
}

module.exports = new ConversationAnalyticsService();
