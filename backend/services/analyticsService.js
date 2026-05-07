const MessageAnalytics = require('../models/MessageAnalytics');
const UserMessageStats = require('../models/UserMessageStats');
const ConversationMetrics = require('../models/ConversationMetrics');
const MessageTrendData = require('../models/MessageTrendData');
const Message = require('../models/Message');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Message Analytics Service
 * Calculates and tracks messaging analytics across platform
 * 
 * Features:
 * - Platform-wide statistics (volume, engagement, trends)
 * - Per-user statistics (activity, engagement score)
 * - Per-conversation metrics (health, patterns)
 * - Trending topics and keywords
 */

class AnalyticsService {
  /**
   * Calculate daily platform analytics
   * Runs once daily to aggregate metrics
   */
  async calculateDailyAnalytics(date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all messages for the day
      const messages = await Message.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }).populate('sender receiver');

      if (messages.length === 0) {
        logger.info(`No messages for daily analytics on ${date.toDateString()}`);
        return null;
      }

      // Calculate metrics
      const metrics = {
        date: startOfDay,
        period: 'daily',
        totalMessages: messages.length,
        totalUsers: new Set(messages.map((m) => m.sender._id.toString())).size,
        activeUsers: new Set(
          messages.map((m) => [m.sender._id.toString(), m.receiver._id.toString()]).flat()
        ).size,
        newUsers: await this.getNewUsersCount(startOfDay, endOfDay),
        messageTypes: this.countMessageTypes(messages),
        averageResponseTime: await this.calculateAverageResponseTime(messages),
        messageReadRate: await this.calculateReadRate(messages),
        conversationCount: await this.getConversationCount(startOfDay, endOfDay),
        averageConversationLength: 0, // calculated below
        deviceMetrics: await this.getDeviceMetrics(messages),
        peakHour: this.getPeakHour(messages),
        encryptedMessages: messages.filter((m) => m.encrypted).length,
        deliveredMessages: messages.filter((m) => m.status === 'delivered').length,
        failedMessages: messages.filter((m) => m.status === 'failed').length,
      };

      // Calculate derived metrics
      if (metrics.conversationCount > 0) {
        metrics.averageConversationLength = Math.round(metrics.totalMessages / metrics.conversationCount);
      }
      metrics.bounceRate = (metrics.failedMessages / metrics.totalMessages) * 100 || 0;

      // Save to database
      const analytics = new MessageAnalytics(metrics);
      await analytics.save();

      logger.info(`Daily analytics calculated for ${date.toDateString()}: ${metrics.totalMessages} messages`);
      return analytics;
    } catch (error) {
      logger.error('Error calculating daily analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate user statistics
   * Updates per-user engagement metrics
   */
  async calculateUserStats(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.warn(`User not found for stats calculation: ${userId}`);
        return null;
      }

      // Get all messages from this user
      const sentMessages = await Message.find({ sender: userId });
      const receivedMessages = await Message.find({ receiver: userId });

      // Calculate response times
      const responseTimes = await this.calculateUserResponseTimes(userId);

      // Calculate engagement score
      const engagementScore = this.calculateEngagementScore(
        sentMessages.length,
        receivedMessages.length,
        responseTimes.average,
        receivedMessages.filter((m) => m.read).length
      );

      // Get device stats
      const deviceStats = await this.getUserDeviceStats(userId);

      // Get frequent contacts
      const frequentContacts = await this.getFrequentContacts(userId, 5);

      // Get activity patterns
      const activityPatterns = this.getActivityPatterns(sentMessages);

      const stats = {
        userId,
        totalMessagesSent: sentMessages.length,
        totalMessagesReceived: receivedMessages.length,
        totalConversations: await this.getUserConversationCount(userId),
        activeConversations: await this.getActiveConversationCount(userId),
        averageResponseTime: responseTimes.average,
        p50ResponseTime: responseTimes.p50,
        p95ResponseTime: responseTimes.p95,
        p99ResponseTime: responseTimes.p99,
        messagesRead: receivedMessages.filter((m) => m.read).length,
        messagesUnread: receivedMessages.filter((m) => !m.read).length,
        readRate: ((receivedMessages.filter((m) => m.read).length / receivedMessages.length) * 100) || 0,
        firstMessageDate: sentMessages.length > 0 ? sentMessages[sentMessages.length - 1].createdAt : null,
        lastMessageDate: sentMessages.length > 0 ? sentMessages[0].createdAt : null,
        lastActiveAt: new Date(),
        averageMessagesPerDay: this.calculateAveragePerDay(sentMessages),
        messageTypes: this.countMessageTypesByUser(sentMessages),
        deviceStats,
        encryptedMessagePercentage: this.calculateEncryptionPercentage(sentMessages),
        failedMessageCount: sentMessages.filter((m) => m.status === 'failed').length,
        totalContactsMessaged: frequentContacts.length,
        frequentContacts,
        engagementScore,
        scoreFactors: this.calculateScoreFactors(
          sentMessages.length,
          receivedMessages.length,
          responseTimes.average,
          receivedMessages.filter((m) => m.read).length,
          user.createdAt
        ),
        isActive: sentMessages.length > 0,
        preferredTimeOfDay: activityPatterns.preferredTimeOfDay,
        preferredDayOfWeek: activityPatterns.preferredDayOfWeek,
      };

      // Update or create stats record
      const userStats = await UserMessageStats.findOneAndUpdate(
        { userId },
        stats,
        { upsert: true, new: true }
      );

      return userStats;
    } catch (error) {
      logger.error(`Error calculating user stats for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate conversation metrics
   */
  async calculateConversationMetrics(conversationId) {
    try {
      const messages = await Message.find({ conversationId })
        .populate('sender')
        .sort({ createdAt: 1 });

      if (messages.length === 0) {
        logger.warn(`No messages for conversation ${conversationId}`);
        return null;
      }

      // Get participants
      const participants = [...new Set(messages.map((m) => m.sender._id.toString()))];

      // Calculate response times
      const responseTimes = this.calculateConversationResponseTimes(messages);

      // Get engagement
      const engagementLevel = this.calculateEngagementLevel(messages);

      const metrics = {
        conversationId,
        participants,
        participantCount: participants.length,
        totalMessages: messages.length,
        totalMessagesRead: messages.filter((m) => m.read).length,
        totalMessagesUnread: messages.filter((m) => !m.read).length,
        engagementLevel,
        engagementScore: this.calculateConversationEngagementScore(messages),
        firstMessageDate: messages[0].createdAt,
        lastMessageDate: messages[messages.length - 1].createdAt,
        conversationDuration: Math.ceil(
          (messages[messages.length - 1].createdAt - messages[0].createdAt) / (1000 * 60 * 60 * 24)
        ),
        averageMessageGap: this.calculateAverageMessageGap(messages),
        averageResponseTime: responseTimes.average,
        p50ResponseTime: responseTimes.p50,
        p95ResponseTime: responseTimes.p95,
        messageTypes: this.countMessageTypes(messages),
        isActive: this.isConversationActive(messages),
        inactivityDays: this.getInactivityDays(messages),
        encryptedMessages: messages.filter((m) => m.encrypted).length,
        encryptionRate: (messages.filter((m) => m.encrypted).length / messages.length) * 100,
        mediaCount: messages.filter((m) => m.mediaUrls && m.mediaUrls.length > 0).length,
      };

      // Per-participant breakdown
      metrics.participantStats = participants.map((participantId) => {
        const participantMessages = messages.filter((m) => m.sender._id.toString() === participantId);
        return {
          userId: participantId,
          messagesSent: participantMessages.length,
          messagesRead: participantMessages.filter((m) => m.read).length,
          averageResponseTime: this.calculateParticipantResponseTime(messages, participantId),
        };
      });

      // Save metrics
      const convoMetrics = await ConversationMetrics.findOneAndUpdate(
        { conversationId },
        metrics,
        { upsert: true, new: true }
      );

      return convoMetrics;
    } catch (error) {
      logger.error(`Error calculating conversation metrics for ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate trending keywords and topics
   */
  async calculateTrendingTopics(hours = 24) {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Get recent messages
      const messages = await Message.find({
        createdAt: { $gte: startTime },
        messageText: { $exists: true, $ne: '' },
      });

      if (messages.length === 0) {
        logger.info('No messages for trend analysis');
        return null;
      }

      // Extract keywords
      const keywords = this.extractKeywords(messages);

      // Extract hashtags
      const hashtags = this.extractHashtags(messages);

      // Calculate trends
      const topKeywords = this.getTopItems(keywords, 20);
      const trendingHashtags = this.getTopItems(hashtags, 15);
      const trendingTopics = this.groupKeywordsIntoTopics(topKeywords);

      // Get device trends
      const deviceTrends = this.getDeviceTrends(messages);

      // Get sentiment trends (optional)
      const sentimentTrends = {
        overallSentiment: 0,
        positivePercentage: 0,
        negativePercentage: 0,
        neutralPercentage: 100,
      };

      const trendData = {
        date: new Date(),
        period: hours <= 1 ? 'hourly' : 'daily',
        topKeywords,
        trendingHashtags,
        trendingTopics,
        contentTrends: this.getContentTrends(messages),
        deviceTrends,
        sentimentTrends,
      };

      // Save trends
      const trends = new MessageTrendData(trendData);
      await trends.save();

      logger.info(`Trending topics calculated: ${topKeywords.length} keywords, ${trendingHashtags.length} hashtags`);
      return trends;
    } catch (error) {
      logger.error('Error calculating trending topics:', error);
      throw error;
    }
  }

  // === Helper Methods ===

  /**
   * Count message types in array
   */
  countMessageTypes(messages) {
    return {
      text: messages.filter((m) => m.messageType === 'text').length,
      media: messages.filter((m) => m.messageType === 'media').length,
      sticker: messages.filter((m) => m.messageType === 'sticker').length,
      reaction: messages.filter((m) => m.messageType === 'reaction').length,
      edit: messages.filter((m) => m.edited).length,
      delete: messages.filter((m) => m.deleted).length,
    };
  }

  countMessageTypesByUser(messages) {
    return {
      text: messages.filter((m) => m.messageType === 'text').length,
      media: messages.filter((m) => m.messageType === 'media').length,
      sticker: messages.filter((m) => m.messageType === 'sticker').length,
      reaction: messages.filter((m) => m.messageType === 'reaction').length,
      link: messages.filter((m) => m.messageText && m.messageText.includes('http')).length,
    };
  }

  /**
   * Calculate average response time
   */
  async calculateAverageResponseTime(messages) {
    if (messages.length < 2) return 0;

    let totalResponseTime = 0;
    let responseCount = 0;

    // Group by conversation
    const byConversation = {};
    messages.forEach((msg) => {
      if (!byConversation[msg.conversationId]) {
        byConversation[msg.conversationId] = [];
      }
      byConversation[msg.conversationId].push(msg);
    });

    // Calculate response times
    Object.values(byConversation).forEach((convMessages) => {
      convMessages.sort((a, b) => a.createdAt - b.createdAt);
      for (let i = 1; i < convMessages.length; i++) {
        if (convMessages[i].sender !== convMessages[i - 1].sender) {
          totalResponseTime += convMessages[i].createdAt - convMessages[i - 1].createdAt;
          responseCount++;
        }
      }
    });

    return responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;
  }

  /**
   * Calculate read rate
   */
  async calculateReadRate(messages) {
    if (messages.length === 0) return 0;
    const readMessages = messages.filter((m) => m.read).length;
    return Math.round((readMessages / messages.length) * 100);
  }

  /**
   * Get peak hour from messages
   */
  getPeakHour(messages) {
    const hourCounts = {};
    messages.forEach((msg) => {
      const hour = new Date(msg.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.keys(hourCounts).reduce((a, b) =>
      hourCounts[a] > hourCounts[b] ? a : b
    );
  }

  /**
   * Calculate device metrics
   */
  async getDeviceMetrics(messages) {
    const devices = {};
    messages.forEach((msg) => {
      const device = msg.deviceInfo?.deviceType || 'mobile';
      devices[device] = (devices[device] || 0) + 1;
    });

    return {
      mobile: devices.mobile || 0,
      web: devices.web || 0,
      tablet: devices.tablet || 0,
    };
  }

  /**
   * Calculate engagement score (0-100)
   */
  calculateEngagementScore(messagesSent, messagesReceived, avgResponseTime, messagesRead) {
    let score = 0;

    // Frequency component (30 points max)
    const frequencyScore = Math.min(30, (messagesSent / 100) * 30);
    score += frequencyScore;

    // Response time component (20 points)
    const responseScore = Math.max(0, 20 - (avgResponseTime / 10000) * 20);
    score += responseScore;

    // Read rate component (20 points)
    const totalReceived = messagesReceived || 1;
    const readRate = (messagesRead / totalReceived) * 100;
    const readScore = (readRate / 100) * 20;
    score += readScore;

    // Consistency component (20 points)
    const consistencyScore = Math.min(20, (messagesSent / 10) * 20);
    score += consistencyScore;

    // Interaction component (10 points)
    const interactionScore = Math.min(10, (messagesReceived / 50) * 10);
    score += interactionScore;

    return Math.round(Math.min(score, 100));
  }

  /**
   * Calculate score factors breakdown
   */
  calculateScoreFactors(messagesSent, messagesReceived, avgResponseTime, messagesRead, joinDate) {
    const factors = {
      messageFrequency: Math.min(30, (messagesSent / 100) * 30),
      readRate: (messagesRead / (messagesReceived || 1)) * 20,
      responseTime: Math.max(0, 20 - (avgResponseTime / 10000) * 20),
      messageQuality: 15, // Default, could be improved with content analysis
      accountAge: Math.min(10, ((Date.now() - joinDate) / (365 * 24 * 60 * 60 * 1000)) * 10),
    };

    return factors;
  }

  /**
   * Extract keywords from messages
   */
  extractKeywords(messages) {
    const keywords = {};
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    ]);

    messages.forEach((msg) => {
      if (!msg.messageText) return;
      const words = msg.messageText
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopwords.has(w));

      words.forEach((word) => {
        keywords[word] = (keywords[word] || 0) + 1;
      });
    });

    return keywords;
  }

  /**
   * Extract hashtags from messages
   */
  extractHashtags(messages) {
    const hashtags = {};
    messages.forEach((msg) => {
      if (!msg.messageText) return;
      const tags = msg.messageText.match(/#\w+/g) || [];
      tags.forEach((tag) => {
        hashtags[tag] = (hashtags[tag] || 0) + 1;
      });
    });

    return hashtags;
  }

  /**
   * Get top N items from frequency map
   */
  getTopItems(frequencyMap, limit = 10) {
    return Object.entries(frequencyMap)
      .map(([item, frequency]) => ({ item, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  /**
   * Get content trends
   */
  getContentTrends(messages) {
    const messageTypeCount = this.countMessageTypes(messages);
    const total = messages.length;

    return {
      textMessagePercentage: (messageTypeCount.text / total) * 100,
      mediaPercentage: (messageTypeCount.media / total) * 100,
      emojiUsagePercentage: messages.filter((m) => /\p{Emoji}/u.test(m.messageText || '')).length / total * 100,
      linkSharePercentage: messages.filter((m) => m.messageText && m.messageText.includes('http')).length / total * 100,
      reactionPercentage: (messageTypeCount.reaction / total) * 100,
    };
  }

  /**
   * Calculate new users in period
   */
  async getNewUsersCount(startDate, endDate) {
    return await User.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });
  }

  /**
   * Get conversation count in period
   */
  async getConversationCount(startDate, endDate) {
    const Conversation = require('../models/Conversation');
    return await Conversation.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });
  }

  /**
   * Calculate average messages per day
   */
  calculateAveragePerDay(messages) {
    if (messages.length === 0) return 0;
    const firstMsg = messages[messages.length - 1];
    const lastMsg = messages[0];
    const days = Math.ceil((lastMsg - firstMsg) / (1000 * 60 * 60 * 24));
    return Math.round(messages.length / Math.max(days, 1));
  }

  /**
   * Check if conversation is active
   */
  isConversationActive(messages) {
    const lastMessage = messages[messages.length - 1];
    const inactivityThreshold = 30 * 24 * 60 * 60 * 1000; // 30 days
    return Date.now() - lastMessage.createdAt < inactivityThreshold;
  }

  /**
   * Get inactivity days
   */
  getInactivityDays(messages) {
    const lastMessage = messages[messages.length - 1];
    return Math.floor((Date.now() - lastMessage.createdAt) / (1000 * 60 * 60 * 24));
  }

  // Additional helper methods...
  async getUserDeviceStats(userId) {
    return {
      totalDevices: 1,
      mobileMessages: 0,
      webMessages: 0,
      tabletMessages: 0,
      primaryDevice: 'mobile',
    };
  }

  async getFrequentContacts(userId, limit) {
    const messages = await Message.find({ sender: userId })
      .select('receiver')
      .limit(limit * 10);

    const contactMap = {};
    messages.forEach((msg) => {
      const contactId = msg.receiver.toString();
      contactMap[contactId] = (contactMap[contactId] || 0) + 1;
    });

    return Object.entries(contactMap)
      .map(([contactId, count]) => ({
        contactId,
        messageCount: count,
        lastMessageDate: new Date(),
      }))
      .slice(0, limit);
  }

  getActivityPatterns(messages) {
    return {
      preferredTimeOfDay: 'afternoon',
      preferredDayOfWeek: 'Friday',
    };
  }

  calculateEncryptionPercentage(messages) {
    if (messages.length === 0) return 0;
    const encrypted = messages.filter((m) => m.encrypted).length;
    return Math.round((encrypted / messages.length) * 100);
  }

  async getUserConversationCount(userId) {
    const Conversation = require('../models/Conversation');
    return await Conversation.countDocuments({
      participants: userId,
    });
  }

  async getActiveConversationCount(userId) {
    const Conversation = require('../models/Conversation');
    return await Conversation.countDocuments({
      participants: userId,
      isActive: true,
    });
  }

  calculateConversationResponseTimes(messages) {
    return {
      average: 0,
      p50: 0,
      p95: 0,
      p99: 0,
    };
  }

  calculateEngagementLevel(messages) {
    const count = messages.length;
    if (count > 100) return 'high';
    if (count > 50) return 'medium';
    if (count > 10) return 'low';
    return 'inactive';
  }

  calculateConversationEngagementScore(messages) {
    return Math.min(100, Math.round((messages.length / 100) * 50));
  }

  calculateAverageMessageGap(messages) {
    if (messages.length < 2) return 0;
    let totalGap = 0;
    for (let i = 1; i < messages.length; i++) {
      totalGap += messages[i].createdAt - messages[i - 1].createdAt;
    }
    return Math.round(totalGap / (messages.length - 1));
  }

  calculateParticipantResponseTime(messages, participantId) {
    return 0;
  }

  calculateUserResponseTimes(userId) {
    return {
      average: 0,
      p50: 0,
      p95: 0,
      p99: 0,
    };
  }

  groupKeywordsIntoTopics(keywords) {
    return keywords.map((kw) => ({
      topic: kw.item,
      relatedKeywords: [],
      mentionCount: kw.frequency,
      uniqueUsers: 0,
      trendScore: kw.frequency,
      category: 'general',
    }));
  }

  getDeviceTrends(messages) {
    return {
      mobilePercentage: 70,
      webPercentage: 25,
      tabletPercentage: 5,
      emergingDevices: [],
    };
  }
}

module.exports = new AnalyticsService();
