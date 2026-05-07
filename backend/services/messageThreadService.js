const Message = require('../models/Message');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Message Threading Service
 * Handles replies and threaded conversations
 * Singleton pattern
 */

class MessageThreadService {
  constructor() {
    if (MessageThreadService.instance) {
      return MessageThreadService.instance;
    }
    this.threadCache = new Map();
    MessageThreadService.instance = this;
  }

  /**
   * Create reply to message (thread)
   * @param {string} parentMessageId - Parent message ID
   * @param {string} senderId - Sender User ID
   * @param {string} content - Reply content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Created reply message
   */
  async createReply(parentMessageId, senderId, content, options = {}) {
    try {
      const parentMessage = await Message.findById(parentMessageId);
      if (!parentMessage) {
        throw new Error(`Parent message ${parentMessageId} not found`);
      }

      if (parentMessage.isDeleted) {
        throw new Error('Cannot reply to deleted message');
      }

      // Create reply message
      const reply = await Message.create({
        senderId,
        chatId: parentMessage.chatId,
        parentMessageId,
        content,
        type: options.type || 'reply',
        media: options.media,
        mentions: options.mentions,
        metadata: {
          ...options.metadata,
          isReply: true,
          threadDepth: (parentMessage.metadata?.threadDepth || 0) + 1,
        },
      });

      // Update parent message reply count
      await Message.findByIdAndUpdate(
        parentMessageId,
        {
          $inc: { replyCount: 1 },
          lastReplyAt: new Date(),
        }
      );

      // Clear cache
      this.threadCache.delete(parentMessageId);

      logger.info(`Reply created for message ${parentMessageId}`, {
        replyId: reply._id,
        senderId,
      });

      return await reply.populate('senderId', 'username avatar');
    } catch (error) {
      logger.error('Error creating reply', { error, parentMessageId });
      throw error;
    }
  }

  /**
   * Get thread of replies
   * @param {string} messageId - Parent message ID
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Object>} Thread with replies
   */
  async getThread(messageId, options = {}) {
    try {
      // Check cache
      if (this.threadCache.has(messageId)) {
        return this.threadCache.get(messageId);
      }

      const { limit = 50, offset = 0 } = options;

      // Get parent message
      const parentMessage = await Message.findById(messageId)
        .populate('senderId', 'username avatar')
        .lean();

      if (!parentMessage) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Get replies
      const replies = await Message.find({ parentMessageId: messageId })
        .populate('senderId', 'username avatar')
        .populate('mentions.userId', 'username')
        .sort({ createdAt: 1 })
        .limit(limit)
        .skip(offset)
        .lean();

      const thread = {
        parent: parentMessage,
        replies,
        totalReplies: await Message.countDocuments({ parentMessageId: messageId }),
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < parentMessage.replyCount,
        },
      };

      // Cache for 5 minutes
      this.threadCache.set(messageId, thread);
      setTimeout(() => this.threadCache.delete(messageId), 5 * 60 * 1000);

      return thread;
    } catch (error) {
      logger.error('Error getting thread', { error, messageId });
      throw error;
    }
  }

  /**
   * Get conversation chain (parent + all descendants)
   * @param {string} messageId - Message ID
   * @returns {Promise<Array>} Conversation chain
   */
  async getConversationChain(messageId) {
    try {
      const chain = [];

      // Find root message
      let current = await Message.findById(messageId).lean();
      if (!current) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Traverse up to root
      while (current.parentMessageId) {
        current = await Message.findById(current.parentMessageId).lean();
        chain.unshift(current);
      }

      // Add original message
      chain.push(current);

      // Get all descendants
      const descendants = await this.getAllDescendants(current._id);
      chain.push(...descendants);

      return chain;
    } catch (error) {
      logger.error('Error getting conversation chain', { error, messageId });
      throw error;
    }
  }

  /**
   * Get all descendants (recursive replies)
   * @private
   */
  async getAllDescendants(messageId, depth = 0, maxDepth = 10) {
    if (depth > maxDepth) return [];

    const replies = await Message.find({ parentMessageId: messageId })
      .sort({ createdAt: 1 })
      .lean();

    let allDescendants = [...replies];

    for (const reply of replies) {
      const descendants = await this.getAllDescendants(
        reply._id,
        depth + 1,
        maxDepth
      );
      allDescendants.push(...descendants);
    }

    return allDescendants;
  }

  /**
   * Get thread statistics
   * @param {string} messageId - Parent message ID
   * @returns {Promise<Object>} Thread stats
   */
  async getThreadStats(messageId) {
    try {
      const message = await Message.findById(messageId).lean();
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      const stats = await Message.aggregate([
        {
          $match: {
            $or: [
              { _id: mongoose.Types.ObjectId(messageId) },
              { parentMessageId: mongoose.Types.ObjectId(messageId) },
            ],
          },
        },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            uniqueSenders: { $addToSet: '$senderId' },
            avgContentLength: { $avg: { $strLenCP: '$content' } },
            mediaCount: {
              $sum: { $cond: [{ $ne: ['$media', null] }, 1, 0] },
            },
          },
        },
      ]);

      return stats[0] || {
        totalMessages: 0,
        uniqueSenders: [],
        avgContentLength: 0,
        mediaCount: 0,
      };
    } catch (error) {
      logger.error('Error getting thread stats', { error, messageId });
      throw error;
    }
  }

  /**
   * Delete thread (message + all replies)
   * @param {string} messageId - Parent message ID
   * @param {string} userId - User ID (must be original sender)
   * @returns {Promise<number>} Deleted count
   */
  async deleteThread(messageId, userId) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      if (message.senderId.toString() !== userId.toString()) {
        throw new Error('Only message owner can delete thread');
      }

      // Get all messages in thread
      const allMessages = [message, ...(await this.getAllDescendants(messageId))];

      // Soft delete all messages
      const result = await Message.updateMany(
        { _id: { $in: allMessages.map((m) => m._id) } },
        {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
        }
      );

      this.threadCache.delete(messageId);

      logger.info(`Thread deleted: ${allMessages.length} messages`);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error deleting thread', { error, messageId });
      throw error;
    }
  }

  /**
   * Get popular threads in chat
   * @param {string} chatId - Chat ID
   * @param {Object} options - Query options (limit)
   * @returns {Promise<Array>} Popular threads
   */
  async getPopularThreads(chatId, options = {}) {
    try {
      const { limit = 20, daysBack = 7 } = options;

      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      const threads = await Message.aggregate([
        {
          $match: {
            chatId: mongoose.Types.ObjectId(chatId),
            parentMessageId: { $exists: false },
            createdAt: { $gte: startDate },
            isDeleted: { $ne: true },
          },
        },
        {
          $addFields: {
            activity: {
              $add: [
                { $ifNull: ['$replyCount', 0] },
                { $ifNull: ['$reactionCount', 0] },
              ],
            },
          },
        },
        { $sort: { activity: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'messages',
            localField: '_id',
            foreignField: 'parentMessageId',
            as: 'replies',
          },
        },
      ]);

      return threads;
    } catch (error) {
      logger.error('Error getting popular threads', { error, chatId });
      throw error;
    }
  }

  /**
   * Resolve a thread (mark as resolved/answered)
   * @param {string} messageId - Parent message ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated message
   */
  async markThreadResolved(messageId, userId) {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        {
          $set: {
            'metadata.threadResolved': true,
            'metadata.resolvedAt': new Date(),
            'metadata.resolvedBy': userId,
          },
        },
        { new: true }
      );

      this.threadCache.delete(messageId);

      logger.info(`Thread marked as resolved: ${messageId}`);
      return message;
    } catch (error) {
      logger.error('Error resolving thread', { error, messageId });
      throw error;
    }
  }

  /**
   * Clear thread cache
   */
  clearCache() {
    this.threadCache.clear();
    logger.info('Thread cache cleared');
  }
}

module.exports = new MessageThreadService();
