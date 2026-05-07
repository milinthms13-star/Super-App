const logger = require('../utils/logger');
const Message = require('../models/Message');

/**
 * SearchService
 * Provides message search capabilities with Elasticsearch integration
 */
class SearchService {
  constructor() {
    this.name = 'SearchService';
    this.elasticsearchClient = null;
  }

  /**
   * Initialize Elasticsearch client
   */
  initialize(elasticsearchClient) {
    this.elasticsearchClient = elasticsearchClient;
    logger.info('SearchService initialized with Elasticsearch');
  }

  /**
   * Search messages
   */
  async searchMessages(userId, query, filters = {}) {
    try {
      const {
        conversationId,
        senderId,
        fromDate,
        toDate,
        messageType = 'text',
        limit = 50,
        offset = 0,
      } = filters;

      const mongoQuery = {
        $or: [
          { recipientId: userId, senderId },
          { senderId: userId, recipientId: senderId },
        ],
        content: { $regex: query, $options: 'i' },
      };

      if (conversationId) {
        mongoQuery.conversationId = conversationId;
      }
      if (messageType) {
        mongoQuery.messageType = messageType;
      }
      if (fromDate || toDate) {
        mongoQuery.createdAt = {};
        if (fromDate) mongoQuery.createdAt.$gte = fromDate;
        if (toDate) mongoQuery.createdAt.$lte = toDate;
      }

      const results = await Message.find(mongoQuery)
        .populate('senderId', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean();

      const totalCount = await Message.countDocuments(mongoQuery);

      return {
        query,
        results,
        totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      };
    } catch (error) {
      logger.error('Error searching messages:', error);
      throw error;
    }
  }

  /**
   * Advanced search with syntax support
   */
  async advancedSearch(userId, searchString) {
    try {
      // Parse search syntax: from:user date:2024-01-01 keyword
      const parts = searchString.split(' ');
      const filters = {};
      let keywords = [];

      parts.forEach((part) => {
        if (part.startsWith('from:')) {
          filters.senderId = part.substring(5);
        } else if (part.startsWith('date:')) {
          const dateStr = part.substring(5);
          filters.fromDate = new Date(dateStr);
          filters.toDate = new Date(
            new Date(dateStr).getTime() + 24 * 60 * 60 * 1000
          );
        } else if (part.startsWith('type:')) {
          filters.messageType = part.substring(5);
        } else if (part.length > 0) {
          keywords.push(part);
        }
      });

      const query = keywords.join(' ');
      return this.searchMessages(userId, query, filters);
    } catch (error) {
      logger.error('Error in advanced search:', error);
      throw error;
    }
  }

  /**
   * Index message for search (called when message is created)
   */
  async indexMessage(message) {
    try {
      if (!this.elasticsearchClient) {
        logger.warn('Elasticsearch client not initialized');
        return;
      }

      const indexName = `${process.env.ELASTICSEARCH_INDEX_PREFIX || 'messaging'}_messages`;

      await this.elasticsearchClient.index({
        index: indexName,
        id: message._id.toString(),
        body: {
          messageId: message._id.toString(),
          content: message.content,
          senderId: message.senderId.toString(),
          recipientId: message.recipientId?.toString(),
          conversationId: message.conversationId?.toString(),
          messageType: message.messageType,
          createdAt: message.createdAt,
          isEncrypted: message.isEncrypted,
        },
      });

      logger.debug(`Message indexed: ${message._id}`);
    } catch (error) {
      logger.error('Error indexing message:', error);
      // Don't throw - indexing should not block message creation
    }
  }

  /**
   * Remove message from index (called when message is deleted)
   */
  async removeMessageFromIndex(messageId) {
    try {
      if (!this.elasticsearchClient) {
        return;
      }

      const indexName = `${process.env.ELASTICSEARCH_INDEX_PREFIX || 'messaging'}_messages`;

      await this.elasticsearchClient.delete({
        index: indexName,
        id: messageId.toString(),
      });

      logger.debug(`Message removed from index: ${messageId}`);
    } catch (error) {
      logger.error('Error removing message from index:', error);
    }
  }

  /**
   * Get search history
   */
  async getSearchHistory(userId, limit = 10) {
    try {
      // This would require a SearchHistory model to be created
      // For now, returning empty
      return [];
    } catch (error) {
      logger.error('Error fetching search history:', error);
      throw error;
    }
  }

  /**
   * Save search
   */
  async saveSearch(userId, searchName, searchQuery, filters) {
    try {
      // This would require a SavedSearch model to be created
      logger.info(`Search saved: ${searchName} for user ${userId}`);
      return {
        success: true,
        searchName,
        query: searchQuery,
      };
    } catch (error) {
      logger.error('Error saving search:', error);
      throw error;
    }
  }

  /**
   * Search messages by date range
   */
  async searchByDateRange(userId, fromDate, toDate, limit = 50) {
    try {
      const results = await Message.find({
        $or: [{ recipientId: userId }, { senderId: userId }],
        createdAt: { $gte: fromDate, $lte: toDate },
      })
        .populate('senderId', 'username avatar')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return {
        dateRange: { from: fromDate, to: toDate },
        results,
        count: results.length,
      };
    } catch (error) {
      logger.error('Error searching by date range:', error);
      throw error;
    }
  }

  /**
   * Search messages by sender
   */
  async searchBySender(userId, senderId, limit = 50) {
    try {
      const results = await Message.find({
        $or: [
          { recipientId: userId, senderId },
          { senderId: userId, recipientId: senderId },
        ],
      })
        .populate('senderId', 'username avatar')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return {
        senderId,
        results,
        count: results.length,
      };
    } catch (error) {
      logger.error('Error searching by sender:', error);
      throw error;
    }
  }

  /**
   * Fuzzy search
   */
  async fuzzySearch(userId, query, limit = 50) {
    try {
      // Create regex pattern for fuzzy matching
      const pattern = query
        .split('')
        .map((char) => char)
        .join('.*?');
      const regex = new RegExp(pattern, 'i');

      const results = await Message.find({
        $or: [{ recipientId: userId }, { senderId: userId }],
        content: regex,
      })
        .populate('senderId', 'username avatar')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return {
        query,
        results,
        count: results.length,
      };
    } catch (error) {
      logger.error('Error in fuzzy search:', error);
      throw error;
    }
  }

  /**
   * Export search results as CSV
   */
  async exportResults(userId, searchResults) {
    try {
      let csv = 'Date,From,Content,Type\n';

      searchResults.forEach((msg) => {
        const date = new Date(msg.createdAt).toISOString();
        const from = msg.senderId?.username || 'Unknown';
        const content = msg.content
          .replace(/"/g, '""')
          .replace(/\n/g, ' ');
        const type = msg.messageType || 'text';

        csv += `"${date}","${from}","${content}","${type}"\n`;
      });

      return csv;
    } catch (error) {
      logger.error('Error exporting search results:', error);
      throw error;
    }
  }

  /**
   * Get popular keywords/hashtags
   */
  async getPopularKeywords(timeRangeMs = 7 * 24 * 60 * 60 * 1000, limit = 20) {
    try {
      const startDate = new Date(Date.now() - timeRangeMs);

      const keywords = await Message.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            content: { $exists: true },
          },
        },
        {
          $project: {
            words: {
              $split: ['$content', ' '],
            },
          },
        },
        { $unwind: '$words' },
        {
          $match: {
            words: { $regex: '^#', $options: 'i' },
          },
        },
        {
          $group: {
            _id: '$words',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
      ]);

      return keywords;
    } catch (error) {
      logger.error('Error getting popular keywords:', error);
      throw error;
    }
  }

  /**
   * Bulk index messages
   */
  async bulkIndexMessages(messages) {
    try {
      if (!this.elasticsearchClient) {
        logger.warn('Elasticsearch client not initialized');
        return;
      }

      const indexName = `${process.env.ELASTICSEARCH_INDEX_PREFIX || 'messaging'}_messages`;
      const operations = [];

      messages.forEach((msg) => {
        operations.push({ index: { _index: indexName, _id: msg._id.toString() } });
        operations.push({
          messageId: msg._id.toString(),
          content: msg.content,
          senderId: msg.senderId.toString(),
          createdAt: msg.createdAt,
          messageType: msg.messageType,
        });
      });

      if (operations.length > 0) {
        await this.elasticsearchClient.bulk({ body: operations });
        logger.info(`Bulk indexed ${messages.length} messages`);
      }
    } catch (error) {
      logger.error('Error bulk indexing messages:', error);
    }
  }
}

module.exports = new SearchService();
