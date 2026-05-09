const Message = require('../models/Message');
const Chat = require('../models/Chat');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Enhanced Read Receipts Service
 * Advanced message delivery and read tracking
 * Singleton pattern
 */

class ReadReceiptService {
  constructor() {
    if (ReadReceiptService.instance) {
      return ReadReceiptService.instance;
    }
    this.receiptCache = new Map();
    this.batchSize = 100;
    ReadReceiptService.instance = this;
  }

  /**
   * Mark message as read
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID reading
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Updated message
   */
  async markAsRead(messageId, userId, metadata = {}) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Add to readBy array if not already present
      const isAlreadyRead = message.readBy?.some(
        (r) => r.userId.toString() === userId.toString()
      );

      if (isAlreadyRead) {
        return message;
      }

      const updated = await Message.findByIdAndUpdate(
        messageId,
        {
          $push: {
            readBy: {
              userId,
              readAt: new Date(),
              platform: metadata.platform,
              deviceId: metadata.deviceId,
            },
          },
          $inc: { readCount: 1 },
        },
        { new: true }
      ).select('-media'); // Exclude heavy fields

      this.receiptCache.delete(messageId);

      logger.info(`Message ${messageId} read by user ${userId}`);
      return updated;
    } catch (error) {
      logger.error('Error marking message as read', { error });
      throw error;
    }
  }

  /**
   * Mark messages as delivered
   * @param {Array<string>} messageIds - Message IDs
   * @param {string} userId - User ID
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Update result
   */
  async markAsDelivered(messageIds, userId, metadata = {}) {
    try {
      const result = await Message.updateMany(
        { _id: { $in: messageIds } },
        {
          deliveryStatus: 'delivered',
          deliveredAt: new Date(),
          deliveredTo: userId,
        }
      );

      messageIds.forEach((id) => this.receiptCache.delete(id));

      logger.info(`${messageIds.length} messages marked as delivered`);
      return result;
    } catch (error) {
      logger.error('Error marking as delivered', { error });
      throw error;
    }
  }

  /**
   * Get read receipt info for message
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Read receipt data
   */
  async getReadReceipt(messageId) {
    try {
      // Check cache
      if (this.receiptCache.has(messageId)) {
        return this.receiptCache.get(messageId);
      }

      const message = await Message.findById(messageId)
        .select('readBy readCount deliveryStatus')
        .populate('readBy.userId', 'username avatar')
        .lean();

      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      const receipt = {
        messageId,
        totalReads: message.readCount || 0,
        readers: message.readBy || [],
        deliveryStatus: message.deliveryStatus,
      };

      // Cache for 2 minutes
      this.receiptCache.set(messageId, receipt);
      const cacheExpiryTimer = setTimeout(
        () => this.receiptCache.delete(messageId),
        2 * 60 * 1000
      );
      cacheExpiryTimer.unref?.();

      return receipt;
    } catch (error) {
      logger.error('Error getting read receipt', { error });
      throw error;
    }
  }

  /**
   * Get read receipts for multiple messages
   * @param {Array<string>} messageIds - Message IDs
   * @returns {Promise<Object>} Receipts by message
   */
  async getBatchReadReceipts(messageIds) {
    try {
      const receipts = await Message.find({ _id: { $in: messageIds } })
        .select('_id readBy readCount deliveryStatus')
        .lean();

      const result = {};
      receipts.forEach((msg) => {
        result[msg._id] = {
          readCount: msg.readCount || 0,
          readers: msg.readBy || [],
          deliveryStatus: msg.deliveryStatus,
        };
      });

      return result;
    } catch (error) {
      logger.error('Error getting batch read receipts', { error });
      throw error;
    }
  }

  /**
   * Get read statistics for chat
   * @param {string} chatId - Chat ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Chat read statistics
   */
  async getChatReadStats(chatId, options = {}) {
    try {
      const { daysBack = 7 } = options;

      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      const stats = await Message.aggregate([
        {
          $match: {
            chatId: new mongoose.Types.ObjectId(chatId),
            createdAt: { $gte: startDate },
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            totalReads: { $sum: '$readCount' },
            avgReadTime: {
              $avg: {
                $subtract: [new Date(), '$createdAt'],
              },
            },
            unreadCount: {
              $sum: {
                $cond: [{ $eq: ['$readCount', 0] }, 1, 0],
              },
            },
          },
        },
      ]);

      return stats[0] || {
        totalMessages: 0,
        totalReads: 0,
        unreadCount: 0,
      };
    } catch (error) {
      logger.error('Error getting chat read stats', { error });
      throw error;
    }
  }

  /**
   * Get unread messages for user in chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Unread messages
   */
  async getUnreadMessages(chatId, userId) {
    try {
      const unread = await Message.find({
        chatId,
        'readBy.userId': { $ne: userId },
        isDeleted: { $ne: true },
      })
        .select('_id content senderId createdAt')
        .populate('senderId', 'username avatar')
        .sort({ createdAt: -1 })
        .lean();

      return unread;
    } catch (error) {
      logger.error('Error getting unread messages', { error });
      throw error;
    }
  }

  /**
   * Get unread count for user
   * @param {string} userId - User ID
   * @param {Array<string>} chatIds - Chat IDs (optional)
   * @returns {Promise<number>} Total unread count
   */
  async getUnreadCount(userId, chatIds = null) {
    try {
      const query = {
        'readBy.userId': { $ne: userId },
        isDeleted: { $ne: true },
      };

      if (chatIds && chatIds.length > 0) {
        query.chatId = { $in: chatIds };
      }

      const count = await Message.countDocuments(query);
      return count;
    } catch (error) {
      logger.error('Error getting unread count', { error });
      throw error;
    }
  }

  /**
   * Get read progress in chat (percentage of messages read)
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @returns {Promise<number>} Read percentage
   */
  async getReadProgress(chatId, userId) {
    try {
      const totalMessages = await Message.countDocuments({
        chatId,
        isDeleted: { $ne: true },
      });

      const readMessages = await Message.countDocuments({
        chatId,
        'readBy.userId': userId,
        isDeleted: { $ne: true },
      });

      return totalMessages > 0 ? Math.round((readMessages / totalMessages) * 100) : 100;
    } catch (error) {
      logger.error('Error getting read progress', { error });
      throw error;
    }
  }

  /**
   * Get readers for message (who read it)
   * @param {string} messageId - Message ID
   * @returns {Promise<Array>} List of readers
   */
  async getReaders(messageId) {
    try {
      const message = await Message.findById(messageId)
        .select('readBy')
        .populate('readBy.userId', 'username avatar status')
        .lean();

      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      return message.readBy?.map((r) => ({
        user: r.userId,
        readAt: r.readAt,
        platform: r.platform,
      })) || [];
    } catch (error) {
      logger.error('Error getting readers', { error });
      throw error;
    }
  }

  /**
   * Get typing indicators (real-time status)
   * @param {string} chatId - Chat ID
   * @returns {Promise<Array>} Users currently typing
   */
  async getTypingStatus(chatId) {
    try {
      // This would typically come from WebSocket/Redis
      // Placeholder for integration
      const typingUsers = [];
      return typingUsers;
    } catch (error) {
      logger.error('Error getting typing status', { error });
      throw error;
    }
  }

  /**
   * Batch mark messages as read
   * @param {Array<string>} messageIds - Message IDs
   * @param {string} userId - User ID
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Batch update result
   */
  async batchMarkAsRead(messageIds, userId, metadata = {}) {
    try {
      const result = await Message.updateMany(
        {
          _id: { $in: messageIds },
          'readBy.userId': { $ne: userId },
        },
        {
          $push: {
            readBy: {
              userId,
              readAt: new Date(),
              platform: metadata.platform,
            },
          },
          $inc: { readCount: 1 },
        }
      );

      messageIds.forEach((id) => this.receiptCache.delete(id));

      logger.info(`Batch marked ${result.modifiedCount} messages as read`);
      return result;
    } catch (error) {
      logger.error('Error batch marking as read', { error });
      throw error;
    }
  }

  /**
   * Clear read receipt cache
   */
  clearCache() {
    this.receiptCache.clear();
    logger.info('Read receipt cache cleared');
  }
}

module.exports = new ReadReceiptService();
