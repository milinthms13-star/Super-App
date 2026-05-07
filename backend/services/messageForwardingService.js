const Message = require('../models/Message');
const Chat = require('../models/Chat');
const logger = require('../utils/logger');

/**
 * Message Forwarding Service
 * Handles forwarding messages to other chats
 * Singleton pattern
 */

class MessageForwardingService {
  constructor() {
    if (MessageForwardingService.instance) {
      return MessageForwardingService.instance;
    }
    this.forwardCache = new Map();
    MessageForwardingService.instance = this;
  }

  /**
   * Forward message to another chat
   * @param {string} messageId - Message to forward
   * @param {string} userId - User forwarding
   * @param {Array<string>} targetChatIds - Target chat IDs
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Forwarded messages
   */
  async forwardMessage(messageId, userId, targetChatIds, options = {}) {
    try {
      const originalMessage = await Message.findById(messageId).populate(
        'senderId',
        'username'
      );

      if (!originalMessage) {
        throw new Error(`Message ${messageId} not found`);
      }

      if (originalMessage.isDeleted) {
        throw new Error('Cannot forward deleted message');
      }

      const forwardedMessages = [];

      for (const chatId of targetChatIds) {
        // Verify user has access to target chat
        const chat = await Chat.findOne({
          _id: chatId,
          'participants.userId': userId,
        });

        if (!chat) {
          logger.warn(
            `User ${userId} does not have access to chat ${chatId}`
          );
          continue;
        }

        // Create forwarded message
        const forwarded = await Message.create({
          senderId: userId,
          chatId,
          content: originalMessage.content,
          type: originalMessage.type,
          media: originalMessage.media,
          forwardedFrom: {
            originalMessageId: messageId,
            originalSenderId: originalMessage.senderId._id,
            originalSenderName: originalMessage.senderId.username,
            originalChatId: originalMessage.chatId,
            forwardedAt: new Date(),
          },
          metadata: {
            ...options.metadata,
            isForwarded: true,
            forwardedBy: userId,
          },
        });

        forwardedMessages.push({
          chatId,
          forwardedMessage: forwarded,
        });

        // Update forward count on original
        await Message.findByIdAndUpdate(messageId, {
          $inc: { forwardCount: 1 },
        });
      }

      logger.info(`Message ${messageId} forwarded to ${targetChatIds.length} chats`);

      return forwardedMessages;
    } catch (error) {
      logger.error('Error forwarding message', { error, messageId });
      throw error;
    }
  }

  /**
   * Get forward chain (trace forwards)
   * @param {string} messageId - Message ID
   * @returns {Promise<Array>} Forward chain
   */
  async getForwardChain(messageId) {
    try {
      const chain = [];
      let current = await Message.findById(messageId).lean();

      while (current && current.forwardedFrom) {
        chain.push({
          messageId: current._id,
          chatId: current.chatId,
          forwardedAt: current.forwardedFrom.forwardedAt,
          forwardedBy: current.forwardedFrom.forwardedBy,
        });

        current = await Message.findById(
          current.forwardedFrom.originalMessageId
        ).lean();
      }

      if (current) {
        chain.push({
          messageId: current._id,
          chatId: current.chatId,
          isOriginal: true,
        });
      }

      return chain.reverse();
    } catch (error) {
      logger.error('Error getting forward chain', { error });
      throw error;
    }
  }

  /**
   * Get forward statistics
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Forward stats
   */
  async getForwardStats(messageId) {
    try {
      const message = await Message.findById(messageId).lean();
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Find all forwards of this message
      const forwards = await Message.find({
        'forwardedFrom.originalMessageId': messageId,
      })
        .select('chatId forwardedFrom')
        .lean();

      const uniqueChats = new Set(forwards.map((f) => f.chatId.toString()));

      return {
        originalMessageId: messageId,
        totalForwards: message.forwardCount || 0,
        uniqueChats: uniqueChats.size,
        forwards,
      };
    } catch (error) {
      logger.error('Error getting forward stats', { error });
      throw error;
    }
  }

  /**
   * Get most forwarded messages in chat
   * @param {string} chatId - Chat ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Most forwarded messages
   */
  async getMostForwardedInChat(chatId, options = {}) {
    try {
      const { limit = 20, daysBack = 30 } = options;

      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      const messages = await Message.find({
        chatId,
        createdAt: { $gte: startDate },
        forwardCount: { $gt: 0 },
        isDeleted: { $ne: true },
      })
        .sort({ forwardCount: -1 })
        .limit(limit)
        .populate('senderId', 'username avatar')
        .lean();

      return messages;
    } catch (error) {
      logger.error('Error getting most forwarded', { error });
      throw error;
    }
  }

  /**
   * Check if message is a forward
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Forward info or null
   */
  async isMessageForwarded(messageId) {
    try {
      const message = await Message.findById(messageId)
        .select('forwardedFrom')
        .lean();

      return message?.forwardedFrom || null;
    } catch (error) {
      logger.error('Error checking if forwarded', { error });
      throw error;
    }
  }

  /**
   * Batch forward messages
   * @param {Array<string>} messageIds - Message IDs to forward
   * @param {string} userId - User forwarding
   * @param {Array<string>} targetChatIds - Target chats
   * @returns {Promise<Array>} Forwarded messages
   */
  async batchForwardMessages(messageIds, userId, targetChatIds) {
    try {
      const allForwarded = [];

      for (const messageId of messageIds) {
        try {
          const forwarded = await this.forwardMessage(
            messageId,
            userId,
            targetChatIds
          );
          allForwarded.push(...forwarded);
        } catch (error) {
          logger.warn(`Failed to forward message ${messageId}`, { error });
        }
      }

      return allForwarded;
    } catch (error) {
      logger.error('Error batch forwarding', { error });
      throw error;
    }
  }

  /**
   * Clear forward cache
   */
  clearCache() {
    this.forwardCache.clear();
    logger.info('Forward cache cleared');
  }
}

module.exports = new MessageForwardingService();
