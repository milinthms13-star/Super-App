const logger = require('../utils/logger');
const Message = require('../models/Message');
const MessageFilter = require('../models/MessageFilter');

class MessageFilterService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes
    this.maxFiltersPerUser = 50;
  }

  /**
   * Create message filter/rule
   * @param {string} userId - User ID
   * @param {string} name - Filter name
   * @param {Object} conditions - Filter conditions
   * @param {Array} actions - Actions to perform
   * @returns {Object} Filter object
   */
  async createFilter(userId, name, conditions, actions) {
    try {
      if (!userId || !name || !conditions || !actions) {
        throw new Error('Missing required fields');
      }

      // Check limit
      const count = await MessageFilter.countDocuments({ userId });
      if (count >= this.maxFiltersPerUser) {
        throw new Error(`Maximum ${this.maxFiltersPerUser} filters per user exceeded`);
      }

      const filter = new MessageFilter({
        userId,
        name,
        conditions,
        actions,
        enabled: true,
        priority: count + 1,
        statistics: {
          messagesMatched: 0,
          actionsApplied: 0,
        },
        createdAt: new Date(),
      });

      await filter.save();
      this.invalidateCache(userId);

      logger.info(`Filter created: ${filter._id} for user ${userId}`);
      return filter;
    } catch (error) {
      logger.error(`Error creating filter: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get filters for user
   * @param {string} userId - User ID
   * @param {Object} options - Options
   * @returns {Array} Filters
   */
  async getFilters(userId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;

      const cacheKey = `filters:${userId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }

      const filters = await MessageFilter.find({ userId })
        .sort({ priority: 1 })
        .limit(limit)
        .skip(offset)
        .exec();

      this.cache.set(cacheKey, { data: filters, timestamp: Date.now() });
      return filters;
    } catch (error) {
      logger.error(`Error getting filters: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply filters to message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @returns {Object} Filter results
   */
  async applyFilters(messageId, userId) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      const filters = await MessageFilter.find({
        userId,
        enabled: true,
      }).sort({ priority: 1 });

      const results = {
        messageId,
        matched: [],
        actions: [],
      };

      for (const filter of filters) {
        if (this.matchesConditions(message, filter.conditions)) {
          results.matched.push(filter._id);

          // Apply actions
          for (const action of filter.actions) {
            const result = await this.applyAction(message, action);
            results.actions.push(result);
          }

          // Update statistics
          filter.statistics.messagesMatched += 1;
          filter.statistics.actionsApplied += filter.actions.length;
          await filter.save();
        }
      }

      this.invalidateCache(userId);
      logger.info(`Applied ${results.matched.length} filters to message ${messageId}`);
      return results;
    } catch (error) {
      logger.error(`Error applying filters: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if message matches filter conditions
   * @param {Object} message - Message object
   * @param {Object} conditions - Filter conditions
   * @returns {boolean} Matches
   */
  matchesConditions(message, conditions) {
    try {
      if (conditions.keywords && conditions.keywords.length > 0) {
        const contentLower = message.content.toLowerCase();
        const hasKeyword = conditions.keywords.some((k) =>
          contentLower.includes(k.toLowerCase())
        );
        if (!hasKeyword) return false;
      }

      if (conditions.senders && conditions.senders.length > 0) {
        if (!conditions.senders.includes(message.senderId)) return false;
      }

      if (conditions.hasAttachments !== undefined) {
        if (
          conditions.hasAttachments &&
          (!message.attachments || message.attachments.length === 0)
        )
          return false;
        if (!conditions.hasAttachments && message.attachments?.length > 0)
          return false;
      }

      if (conditions.sentiment) {
        // Implement sentiment matching if needed
      }

      return true;
    } catch (error) {
      logger.error(`Error matching conditions: ${error.message}`);
      return false;
    }
  }

  /**
   * Apply action to message
   * @param {Object} message - Message
   * @param {Object} action - Action to apply
   * @returns {Object} Action result
   */
  async applyAction(message, action) {
    try {
      const result = {
        actionType: action.type,
        success: false,
      };

      switch (action.type) {
        case 'archive':
          message.archived = true;
          result.success = true;
          break;

        case 'label':
          message.labels = message.labels || [];
          if (!message.labels.includes(action.value)) {
            message.labels.push(action.value);
          }
          result.success = true;
          break;

        case 'star':
          message.starred = true;
          result.success = true;
          break;

        case 'move':
          message.folderPath = action.value;
          result.success = true;
          break;

        case 'snooze':
          message.snoozedUntil = new Date(Date.now() + action.duration * 1000);
          result.success = true;
          break;

        case 'notify':
          result.notify = true;
          result.notificationType = action.value;
          result.success = true;
          break;

        default:
          result.success = false;
      }

      if (result.success) {
        await message.save();
      }

      return result;
    } catch (error) {
      logger.error(`Error applying action: ${error.message}`);
      return { actionType: action.type, success: false, error: error.message };
    }
  }

  /**
   * Update filter
   * @param {string} filterId - Filter ID
   * @param {string} userId - User ID
   * @param {Object} updates - Updates
   * @returns {Object} Updated filter
   */
  async updateFilter(filterId, userId, updates) {
    try {
      const filter = await MessageFilter.findById(filterId);
      if (!filter) {
        throw new Error('Filter not found');
      }

      if (filter.userId !== userId) {
        throw new Error('Not authorized');
      }

      const allowedFields = ['name', 'conditions', 'actions', 'enabled', 'priority'];
      for (const field of allowedFields) {
        if (field in updates) {
          filter[field] = updates[field];
        }
      }

      filter.updatedAt = new Date();
      await filter.save();

      this.invalidateCache(userId);
      logger.info(`Filter updated: ${filterId}`);
      return filter;
    } catch (error) {
      logger.error(`Error updating filter: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete filter
   * @param {string} filterId - Filter ID
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async deleteFilter(filterId, userId) {
    try {
      const filter = await MessageFilter.findById(filterId);
      if (!filter) {
        throw new Error('Filter not found');
      }

      if (filter.userId !== userId) {
        throw new Error('Not authorized');
      }

      await MessageFilter.deleteOne({ _id: filterId });
      this.invalidateCache(userId);

      logger.info(`Filter deleted: ${filterId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting filter: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get filter statistics
   * @param {string} userId - User ID
   * @returns {Object} Stats
   */
  async getFilterStats(userId) {
    try {
      const filters = await MessageFilter.find({ userId });

      const stats = {
        totalFilters: filters.length,
        enabledFilters: filters.filter((f) => f.enabled).length,
        totalMessagesMatched: 0,
        totalActionsApplied: 0,
      };

      for (const filter of filters) {
        stats.totalMessagesMatched += filter.statistics?.messagesMatched || 0;
        stats.totalActionsApplied += filter.statistics?.actionsApplied || 0;
      }

      return stats;
    } catch (error) {
      logger.error(`Error getting filter stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reorder filters by priority
   * @param {string} userId - User ID
   * @param {Array} filterIds - Ordered filter IDs
   * @returns {boolean} Success
   */
  async reorderFilters(userId, filterIds) {
    try {
      for (let i = 0; i < filterIds.length; i++) {
        await MessageFilter.updateOne(
          { _id: filterIds[i], userId },
          { priority: i + 1 }
        );
      }

      this.invalidateCache(userId);
      logger.info(`Filters reordered for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error reordering filters: ${error.message}`);
      throw error;
    }
  }

  invalidateCache(userId) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`filters:${userId}`)) {
        this.cache.delete(key);
      }
    }
  }

  clearCache() {
    this.cache.clear();
    logger.info('Filter cache cleared');
  }
}

module.exports = new MessageFilterService();
