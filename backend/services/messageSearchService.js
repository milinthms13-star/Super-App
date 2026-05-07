const Message = require('../models/Message');
const Chat = require('../models/Chat');
const logger = require('../utils/logger');

/**
 * Advanced Message Search Service
 * Full-text search with filters, date ranges, and aggregations
 * Singleton pattern
 */

class MessageSearchService {
  constructor() {
    if (MessageSearchService.instance) {
      return MessageSearchService.instance;
    }
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    MessageSearchService.instance = this;
  }

  /**
   * Search messages with filters
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Query options (limit, offset, sort)
   * @returns {Promise<Object>} Search results with metadata
   */
  async searchMessages(criteria, options = {}) {
    try {
      const {
        query,
        chatIds,
        userId,
        senderIds,
        messageTypes,
        hasMedia,
        hasReactions,
        startDate,
        endDate,
        limit = 20,
        offset = 0,
        sortBy = 'relevance',
      } = criteria;

      // Build MongoDB query
      const filter = {};

      // Text search
      if (query) {
        filter.$text = { $search: query };
      }

      // Chat filter
      if (chatIds && chatIds.length > 0) {
        filter.chatId = { $in: chatIds };
      }

      // User filter
      if (userId) {
        filter.chatId = await this.getUserChatIds(userId);
      }

      // Sender filter
      if (senderIds && senderIds.length > 0) {
        filter.senderId = { $in: senderIds };
      }

      // Message type filter
      if (messageTypes && messageTypes.length > 0) {
        filter.type = { $in: messageTypes };
      }

      // Media filter
      if (hasMedia) {
        filter.media = { $exists: true, $ne: [] };
      }

      // Reactions filter
      if (hasReactions) {
        filter.reactionCount = { $gt: 0 };
      }

      // Date range filter
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      // Exclude deleted messages
      filter.isDeleted = { $ne: true };

      // Sort options
      let sortObj = {};
      switch (sortBy) {
        case 'recent':
          sortObj = { createdAt: -1 };
          break;
        case 'oldest':
          sortObj = { createdAt: 1 };
          break;
        case 'relevance':
          if (query) {
            sortObj = { score: { $meta: 'textScore' } };
          } else {
            sortObj = { createdAt: -1 };
          }
          break;
        case 'popular':
          sortObj = { reactionCount: -1, createdAt: -1 };
          break;
        default:
          sortObj = { createdAt: -1 };
      }

      // Execute search
      let query_obj = Message.find(filter);

      if (query && sortBy === 'relevance') {
        query_obj = query_obj.select({ score: { $meta: 'textScore' } });
      }

      const total = await Message.countDocuments(filter);

      const results = await query_obj
        .populate('senderId', 'username avatar')
        .populate('chatId', 'name')
        .sort(sortObj)
        .limit(limit)
        .skip(offset)
        .lean();

      logger.info('Message search executed', {
        query,
        resultsCount: results.length,
        totalCount: total,
      });

      return {
        results,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
        searchQuery: criteria,
      };
    } catch (error) {
      logger.error('Error searching messages', { error, criteria });
      throw error;
    }
  }

  /**
   * Search in specific chat
   * @param {string} chatId - Chat ID
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Messages matching query
   */
  async searchInChat(chatId, query, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;

      const results = await Message.find(
        {
          chatId,
          $text: { $search: query },
          isDeleted: { $ne: true },
        },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .populate('senderId', 'username avatar')
        .limit(limit)
        .skip(offset)
        .lean();

      return results;
    } catch (error) {
      logger.error('Error searching in chat', { error, chatId, query });
      throw error;
    }
  }

  /**
   * Search by sender
   * @param {string} senderId - Sender User ID
   * @param {string} query - Optional search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Messages from sender
   */
  async searchBySender(senderId, query, options = {}) {
    try {
      const { limit = 50, offset = 0, startDate, endDate } = options;

      const filter = { senderId, isDeleted: { $ne: true } };

      if (query) {
        filter.$text = { $search: query };
      }

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const results = await Message.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .populate('chatId', 'name')
        .lean();

      return results;
    } catch (error) {
      logger.error('Error searching by sender', { error, senderId });
      throw error;
    }
  }

  /**
   * Get message statistics by type
   * @param {Array<string>} chatIds - Chat IDs to analyze
   * @returns {Promise<Object>} Message statistics
   */
  async getMessageStats(chatIds) {
    try {
      const stats = await Message.aggregate([
        { $match: { chatId: { $in: chatIds }, isDeleted: { $ne: true } } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            avgLength: { $avg: { $strLenCP: '$content' } },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return stats;
    } catch (error) {
      logger.error('Error getting message stats', { error });
      throw error;
    }
  }

  /**
   * Get trending keywords
   * @param {Array<string>} chatIds - Chat IDs to analyze
   * @param {Object} options - Options (limit, timeframe)
   * @returns {Promise<Array>} Trending keywords
   */
  async getTrendingKeywords(chatIds, options = {}) {
    try {
      const { limit = 20, daysBack = 7 } = options;

      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      // This is simplified; real implementation would use NLP
      const keywords = await Message.aggregate([
        {
          $match: {
            chatId: { $in: chatIds },
            createdAt: { $gte: startDate },
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: null,
            messages: { $push: '$content' },
          },
        },
      ]);

      // Extract keywords from messages
      const keywordMap = new Map();
      if (keywords.length > 0) {
        keywords[0].messages.forEach((msg) => {
          if (msg) {
            const words = msg.toLowerCase().split(/\W+/);
            words.forEach((word) => {
              if (word.length > 3) {
                keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
              }
            });
          }
        });
      }

      // Sort by frequency
      const trending = Array.from(keywordMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([keyword, frequency]) => ({ keyword, frequency }));

      return trending;
    } catch (error) {
      logger.error('Error getting trending keywords', { error });
      throw error;
    }
  }

  /**
   * Search for images/media in chats
   * @param {Array<string>} chatIds - Chat IDs
   * @param {string} mediaType - image, video, audio, file
   * @returns {Promise<Array>} Messages with media
   */
  async searchMedia(chatIds, mediaType, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;

      const results = await Message.find({
        chatId: { $in: chatIds },
        media: { $exists: true, $ne: [] },
        $or: [{ 'media.type': mediaType }],
        isDeleted: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .populate('senderId', 'username avatar')
        .lean();

      return results;
    } catch (error) {
      logger.error('Error searching media', { error });
      throw error;
    }
  }

  /**
   * Get message activity over time
   * @param {Array<string>} chatIds - Chat IDs
   * @param {string} interval - day, week, month
   * @returns {Promise<Array>} Activity timeline
   */
  async getActivityTimeline(chatIds, interval = 'day') {
    try {
      const dateFormat = this.getDateFormat(interval);

      const timeline = await Message.aggregate([
        {
          $match: {
            chatId: { $in: chatIds },
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: dateFormat, date: '$createdAt' },
            },
            count: { $sum: 1 },
            uniqueSenders: { $addToSet: '$senderId' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return timeline.map((item) => ({
        period: item._id,
        messageCount: item.count,
        uniqueSendersCount: item.uniqueSenders.length,
      }));
    } catch (error) {
      logger.error('Error getting activity timeline', { error });
      throw error;
    }
  }

  /**
   * Search recent messages
   * @param {string} userId - User ID
   * @param {number} hours - Hours to look back
   * @returns {Promise<Array>} Recent messages
   */
  async getRecentMessages(userId, hours = 24) {
    try {
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

      const chatIds = await this.getUserChatIds(userId);

      const messages = await Message.find({
        chatId: { $in: chatIds },
        createdAt: { $gte: startDate },
        isDeleted: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('senderId', 'username avatar')
        .lean();

      return messages;
    } catch (error) {
      logger.error('Error getting recent messages', { error, userId });
      throw error;
    }
  }

  /**
   * Helper: Get user's chat IDs
   * @private
   */
  async getUserChatIds(userId) {
    const chats = await Chat.find({
      'participants.userId': userId,
    }).select('_id');

    return chats.map((c) => c._id);
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
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Message search cache cleared');
  }
}

module.exports = new MessageSearchService();
