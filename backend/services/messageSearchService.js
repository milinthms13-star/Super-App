const Message = require('../models/Message');
const Chat = require('../models/Chat');
const logger = require('../utils/logger');

class MessageSearchService {
  constructor() {
    if (MessageSearchService.instance) {
      return MessageSearchService.instance;
    }

    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000;
    MessageSearchService.instance = this;
  }

  async searchMessages(criteria = {}, options = {}) {
    try {
      const mergedOptions = {
        limit: options.limit ?? criteria.limit ?? 20,
        offset: options.offset ?? criteria.offset ?? 0,
        sortBy: options.sortBy ?? criteria.sortBy ?? 'relevance',
      };

      const queryText = typeof criteria.query === 'string' ? criteria.query.trim() : '';
      const hasFilters =
        queryText ||
        (criteria.chatIds && criteria.chatIds.length) ||
        criteria.userId ||
        (criteria.senderIds && criteria.senderIds.length) ||
        (criteria.messageTypes && criteria.messageTypes.length) ||
        criteria.hasMedia ||
        criteria.hasReactions ||
        criteria.startDate ||
        criteria.endDate;

      if (!hasFilters) {
        return [];
      }

      const cacheKey = JSON.stringify({ criteria, options: mergedOptions });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const filter = await this.buildFilter(criteria);
      let results = await Message.find(filter)
        .populate('senderId', 'username avatar')
        .populate('chatId', 'name')
        .lean();

      if (queryText) {
        const lowered = queryText.toLowerCase();
        results = results
          .filter((message) =>
            String(message.content || '')
              .toLowerCase()
              .includes(lowered)
          )
          .map((message) => ({
            ...message,
            _searchScore: this.getSearchScore(message.content, lowered),
          }));
      }

      results = this.sortMessages(results, mergedOptions.sortBy, queryText);
      results = results.slice(
        Number(mergedOptions.offset),
        Number(mergedOptions.offset) + Number(mergedOptions.limit)
      );

      const sanitized = results.map(({ _searchScore, ...message }) => message);
      this.setCache(cacheKey, sanitized);
      return sanitized;
    } catch (error) {
      logger.error('Error searching messages', { error, criteria });
      throw error;
    }
  }

  async searchInChat(chatId, query, options = {}) {
    try {
      const searchQuery = typeof query === 'string' ? query.trim() : '';
      if (!searchQuery) {
        throw new Error('Search query is required');
      }

      const results = await this.searchMessages(
        {
          query: searchQuery,
          chatIds: [chatId],
        },
        options
      );

      return results;
    } catch (error) {
      logger.error('Error searching in chat', { error, chatId, query });
      throw error;
    }
  }

  async searchBySender(senderId, query, options = {}) {
    try {
      const filter = await this.buildFilter({
        query,
        senderIds: [senderId],
        startDate: options.startDate,
        endDate: options.endDate,
      });

      let results = await Message.find(filter)
        .populate('chatId', 'name')
        .lean();

      const searchQuery = typeof query === 'string' ? query.trim().toLowerCase() : '';
      if (searchQuery) {
        results = results.filter((message) =>
          String(message.content || '')
            .toLowerCase()
            .includes(searchQuery)
        );
      }

      results = this.sortMessages(results, 'recent');
      return results.slice(Number(options.offset || 0), Number(options.offset || 0) + Number(options.limit || 50));
    } catch (error) {
      logger.error('Error searching by sender', { error, senderId });
      throw error;
    }
  }

  async getMessageStats(chatIds = []) {
    try {
      const filter = await this.buildFilter({ chatIds });
      const messages = await Message.find(filter).lean();

      const statsMap = new Map();
      messages.forEach((message) => {
        const type = message.type || message.messageType || 'text';
        const current = statsMap.get(type) || {
          _id: type,
          count: 0,
          avgLength: 0,
          _totalLength: 0,
        };

        current.count += 1;
        current._totalLength += String(message.content || '').length;
        statsMap.set(type, current);
      });

      return Array.from(statsMap.values())
        .map((stat) => ({
          _id: stat._id,
          count: stat.count,
          avgLength: stat.count > 0 ? stat._totalLength / stat.count : 0,
        }))
        .sort((left, right) => right.count - left.count);
    } catch (error) {
      logger.error('Error getting message stats', { error });
      throw error;
    }
  }

  async getTrendingKeywords(chatIds = [], options = {}) {
    try {
      const daysBack = Number(options.daysBack || 7);
      const limit = Number(options.limit || 20);
      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      const messages = await Message.find({
        ...(chatIds.length ? { chatId: { $in: chatIds } } : {}),
        createdAt: { $gte: startDate },
        isDeleted: { $ne: true },
      }).lean();

      const counts = new Map();
      messages.forEach((message) => {
        String(message.content || '')
          .toLowerCase()
          .split(/\W+/)
          .filter((word) => word.length > 3)
          .forEach((word) => {
            counts.set(word, (counts.get(word) || 0) + 1);
          });
      });

      return Array.from(counts.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, limit)
        .map(([keyword, frequency]) => ({ keyword, frequency }));
    } catch (error) {
      logger.error('Error getting trending keywords', { error });
      throw error;
    }
  }

  async searchMedia(chatIds = [], mediaType, options = {}) {
    try {
      const limit = Number(options.limit || 50);
      const offset = Number(options.offset || 0);

      const messages = await Message.find({
        ...(chatIds.length ? { chatId: { $in: chatIds } } : {}),
        isDeleted: { $ne: true },
      }).lean();

      const results = messages
        .filter((message) => {
          if (!message.media) {
            return false;
          }

          if (Array.isArray(message.media)) {
            return message.media.some((item) => item && item.type === mediaType);
          }

          return message.media.type === mediaType;
        })
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
        .slice(offset, offset + limit);

      return results;
    } catch (error) {
      logger.error('Error searching media', { error });
      throw error;
    }
  }

  async getActivityTimeline(chatIds = [], interval = 'day') {
    try {
      const messages = await Message.find({
        ...(chatIds.length ? { chatId: { $in: chatIds } } : {}),
        isDeleted: { $ne: true },
      }).lean();

      const grouped = new Map();
      messages.forEach((message) => {
        const period = this.formatPeriod(message.createdAt || new Date(), interval);
        const current = grouped.get(period) || {
          period,
          messageCount: 0,
          uniqueSenders: new Set(),
        };

        current.messageCount += 1;
        current.uniqueSenders.add(String(message.senderId || 'unknown'));
        grouped.set(period, current);
      });

      return Array.from(grouped.values())
        .sort((left, right) => left.period.localeCompare(right.period))
        .map((item) => ({
          period: item.period,
          messageCount: item.messageCount,
          uniqueSendersCount: item.uniqueSenders.size,
        }));
    } catch (error) {
      logger.error('Error getting activity timeline', { error });
      throw error;
    }
  }

  async getRecentMessages(userId, hours = 24) {
    try {
      const startDate = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);
      const chatIds = await this.getUserChatIds(userId);

      const messages = await Message.find({
        ...(chatIds.length ? { chatId: { $in: chatIds } } : {}),
        createdAt: { $gte: startDate },
        isDeleted: { $ne: true },
      })
        .populate('senderId', 'username avatar')
        .lean();

      return this.sortMessages(messages, 'recent').slice(0, 100);
    } catch (error) {
      logger.error('Error getting recent messages', { error, userId });
      throw error;
    }
  }

  async buildFilter(criteria = {}) {
    const filter = {
      isDeleted: { $ne: true },
    };

    if (criteria.chatIds && criteria.chatIds.length > 0) {
      filter.chatId = { $in: criteria.chatIds };
    }

    if (criteria.userId) {
      const chatIds = await this.getUserChatIds(criteria.userId);
      filter.chatId = { $in: chatIds };
    }

    if (criteria.senderIds && criteria.senderIds.length > 0) {
      filter.senderId = { $in: criteria.senderIds };
    }

    if (criteria.messageTypes && criteria.messageTypes.length > 0) {
      filter.$or = [
        { type: { $in: criteria.messageTypes } },
        { messageType: { $in: criteria.messageTypes } },
      ];
    }

    if (criteria.hasMedia) {
      filter.media = { $exists: true };
    }

    if (criteria.hasReactions) {
      filter.reactionCount = { $gt: 0 };
    }

    if (criteria.startDate || criteria.endDate) {
      filter.createdAt = {};
      if (criteria.startDate) {
        filter.createdAt.$gte = new Date(criteria.startDate);
      }
      if (criteria.endDate) {
        filter.createdAt.$lte = new Date(criteria.endDate);
      }
    }

    return filter;
  }

  async getUserChatIds(userId) {
    const chats = await Chat.find({
      $or: [
        { participants: userId },
        { 'participants.userId': userId },
        { owner: userId },
      ],
    })
      .select('_id')
      .lean();

    return chats.map((chat) => chat._id);
  }

  sortMessages(messages, sortBy = 'recent', queryText = '') {
    const sorted = [...messages];

    switch (sortBy) {
      case 'oldest':
        sorted.sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
        break;
      case 'popular':
        sorted.sort((left, right) => {
          const leftScore = Number(left.reactionCount || 0);
          const rightScore = Number(right.reactionCount || 0);
          return rightScore - leftScore || new Date(right.createdAt) - new Date(left.createdAt);
        });
        break;
      case 'relevance':
        if (queryText) {
          sorted.sort((left, right) => (right._searchScore || 0) - (left._searchScore || 0));
          break;
        }
        sorted.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
        break;
      case 'recent':
      default:
        sorted.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
        break;
    }

    return sorted;
  }

  getSearchScore(content, loweredQuery) {
    const text = String(content || '').toLowerCase();
    if (!loweredQuery) {
      return 0;
    }

    let score = 0;
    let index = text.indexOf(loweredQuery);
    while (index !== -1) {
      score += 1;
      index = text.indexOf(loweredQuery, index + loweredQuery.length);
    }
    return score;
  }

  formatPeriod(dateValue, interval) {
    const date = new Date(dateValue);

    switch (interval) {
      case 'month':
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      case 'week': {
        const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        const dayOfYear = Math.floor((date - startOfYear) / 86400000) + 1;
        const weekNumber = Math.ceil(dayOfYear / 7);
        return `${date.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
      }
      case 'day':
      default:
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
          date.getUTCDate()
        ).padStart(2, '0')}`;
    }
  }

  getFromCache(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  setCache(cacheKey, value) {
    this.cache.set(cacheKey, {
      data: value,
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.cache.clear();
    logger.info('Message search cache cleared');
  }
}

module.exports = new MessageSearchService();
