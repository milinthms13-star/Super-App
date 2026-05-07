const Message = require('../models/Message');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Message Pinning Service
 * Manages pinned messages in chats
 * Singleton pattern
 */

class MessagePinService {
  constructor() {
    if (MessagePinService.instance) {
      return MessagePinService.instance;
    }
    this.maxPinnedPerChat = 10;
    this.pinCache = new Map();
    MessagePinService.instance = this;
  }

  /**
   * Pin message in chat
   * @param {string} messageId - Message to pin
   * @param {string} userId - User pinning (must be admin)
   * @param {string} chatId - Chat ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Pinned message
   */
  async pinMessage(messageId, userId, chatId, options = {}) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      if (message.isDeleted) {
        throw new Error('Cannot pin deleted message');
      }

      if (message.isPinned) {
        logger.info(`Message ${messageId} already pinned`);
        return message;
      }

      // Check pin limit
      const pinnedCount = await Message.countDocuments({
        chatId,
        isPinned: true,
      });

      if (pinnedCount >= this.maxPinnedPerChat) {
        throw new Error(
          `Chat has reached maximum pinned messages (${this.maxPinnedPerChat})`
        );
      }

      // Update message
      const pinned = await Message.findByIdAndUpdate(
        messageId,
        {
          isPinned: true,
          pinnedAt: new Date(),
          pinnedBy: userId,
          pinnedReason: options.reason,
          metadata: {
            ...message.metadata,
            pinnedNotes: options.notes,
          },
        },
        { new: true }
      );

      this.pinCache.delete(chatId);

      logger.info(`Message ${messageId} pinned in chat ${chatId}`);
      return pinned;
    } catch (error) {
      logger.error('Error pinning message', { error });
      throw error;
    }
  }

  /**
   * Unpin message
   * @param {string} messageId - Message to unpin
   * @param {string} userId - User unpinning
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Unpinned message
   */
  async unpinMessage(messageId, userId, chatId) {
    try {
      const unpinned = await Message.findByIdAndUpdate(
        messageId,
        {
          isPinned: false,
          pinnedAt: null,
          pinnedBy: null,
          metadata: {},
        },
        { new: true }
      );

      this.pinCache.delete(chatId);

      logger.info(`Message ${messageId} unpinned`);
      return unpinned;
    } catch (error) {
      logger.error('Error unpinning message', { error });
      throw error;
    }
  }

  /**
   * Get pinned messages in chat
   * @param {string} chatId - Chat ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Pinned messages
   */
  async getPinnedMessages(chatId, options = {}) {
    try {
      // Check cache
      if (this.pinCache.has(chatId)) {
        return this.pinCache.get(chatId);
      }

      const pinned = await Message.find({
        chatId,
        isPinned: true,
        isDeleted: { $ne: true },
      })
        .populate('senderId', 'username avatar')
        .populate('pinnedBy', 'username')
        .sort({ pinnedAt: -1 })
        .lean();

      // Cache for 5 minutes
      this.pinCache.set(chatId, pinned);
      setTimeout(() => this.pinCache.delete(chatId), 5 * 60 * 1000);

      return pinned;
    } catch (error) {
      logger.error('Error getting pinned messages', { error });
      throw error;
    }
  }

  /**
   * Get pin history for message
   * @param {string} messageId - Message ID
   * @returns {Promise<Array>} Pin events
   */
  async getPinHistory(messageId) {
    try {
      const message = await Message.findById(messageId)
        .select('isPinned pinnedAt pinnedBy pinnedReason')
        .lean();

      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      return {
        messageId,
        isPinned: message.isPinned,
        pinnedAt: message.pinnedAt,
        pinnedBy: message.pinnedBy,
        pinnedReason: message.pinnedReason,
      };
    } catch (error) {
      logger.error('Error getting pin history', { error });
      throw error;
    }
  }

  /**
   * Auto-unpin old messages
   * @param {string} chatId - Chat ID
   * @param {number} daysOld - Unpin messages older than X days
   * @returns {Promise<number>} Unpinned count
   */
  async autopinCleanup(chatId, daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await Message.updateMany(
        {
          chatId,
          isPinned: true,
          pinnedAt: { $lt: cutoffDate },
        },
        {
          isPinned: false,
          pinnedAt: null,
          pinnedBy: null,
        }
      );

      this.pinCache.delete(chatId);

      logger.info(`Auto-unpinned ${result.modifiedCount} old messages`);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error in autopin cleanup', { error });
      throw error;
    }
  }

  /**
   * Get pin statistics for chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Pin stats
   */
  async getPinStats(chatId) {
    try {
      const stats = await Message.aggregate([
        {
          $match: {
            chatId: mongoose.Types.ObjectId(chatId),
            isPinned: true,
          },
        },
        {
          $group: {
            _id: null,
            totalPinned: { $sum: 1 },
            uniquePinners: { $addToSet: '$pinnedBy' },
            avgPinDuration: {
              $avg: {
                $subtract: [new Date(), '$pinnedAt'],
              },
            },
          },
        },
      ]);

      return stats[0] || {
        totalPinned: 0,
        uniquePinners: [],
      };
    } catch (error) {
      logger.error('Error getting pin stats', { error });
      throw error;
    }
  }

  /**
   * Move pinned message up/down
   * @param {string} messageId - Message ID
   * @param {string} direction - 'up' or 'down'
   * @param {string} chatId - Chat ID
   * @returns {Promise<Array>} New pin order
   */
  async reorderPin(messageId, direction, chatId) {
    try {
      const pinned = await this.getPinnedMessages(chatId);
      const currentIndex = pinned.findIndex(
        (m) => m._id.toString() === messageId.toString()
      );

      if (currentIndex === -1) {
        throw new Error('Message not found in pinned');
      }

      let newIndex = currentIndex;
      if (direction === 'up' && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (direction === 'down' && currentIndex < pinned.length - 1) {
        newIndex = currentIndex + 1;
      }

      // Update pinnedAt to reflect order
      await Message.findByIdAndUpdate(messageId, {
        pinnedAt: new Date(
          Date.now() + (pinned.length - newIndex) * 1000
        ),
      });

      this.pinCache.delete(chatId);

      return await this.getPinnedMessages(chatId);
    } catch (error) {
      logger.error('Error reordering pin', { error });
      throw error;
    }
  }

  /**
   * Search pinned messages
   * @param {string} chatId - Chat ID
   * @param {string} query - Search query
   * @returns {Promise<Array>} Matching pinned messages
   */
  async searchPinned(chatId, query) {
    try {
      const results = await Message.find({
        chatId,
        isPinned: true,
        $text: { $search: query },
        isDeleted: { $ne: true },
      })
        .sort({ pinnedAt: -1 })
        .populate('senderId', 'username avatar')
        .lean();

      return results;
    } catch (error) {
      logger.error('Error searching pinned', { error });
      throw error;
    }
  }

  /**
   * Clear pin cache
   */
  clearCache() {
    this.pinCache.clear();
    logger.info('Pin cache cleared');
  }
}

module.exports = new MessagePinService();
