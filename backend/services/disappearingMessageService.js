const logger = require('../utils/logger');
const Message = require('../models/Message');
const DisappearingMessage = require('../models/DisappearingMessage');

class DisappearingMessageService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 2 * 60 * 1000; // 2 minutes
  }

  /**
   * Create disappearing message
   * @param {string} chatId - Chat ID
   * @param {string} userId - Sender user ID
   * @param {string} content - Message content
   * @param {string} disappearType - 'timer' or 'view' based
   * @param {number} duration - Duration in seconds
   * @param {Object} options - Additional options
   * @returns {Object} Message object
   */
  async createDisappearingMessage(chatId, userId, content, disappearType, duration, options = {}) {
    try {
      if (
        !chatId ||
        !userId ||
        !content ||
        !disappearType ||
        duration === undefined ||
        duration === null
      ) {
        throw new Error('Missing required fields');
      }

      if (!['timer', 'view'].includes(disappearType)) {
        throw new Error('Invalid disappear type. Must be "timer" or "view"');
      }

      const isViewBased = disappearType === 'view';
      const minimumDuration = isViewBased ? 0 : 1;
      if (duration < minimumDuration || duration > 86400) {
        throw new Error('Duration must be between 1 second and 24 hours');
      }

      const message = new Message({
        chatId,
        senderId: userId,
        content,
        isDisappearing: true,
        disappearingMessage: {
          type: disappearType,
          duration,
          readBy: [],
          viewCount: 0,
        },
        attachments: options.attachments || [],
        metadata: options.metadata || {},
        createdAt: new Date(),
      });

      await message.save();

      const disappearing = new DisappearingMessage({
        messageId: message._id,
        chatId,
        userId,
        disappearType,
        duration,
        disappearsAt: duration > 0 ? new Date(Date.now() + duration * 1000) : null,
        status: 'active',
      });

      await disappearing.save();
      this.invalidateCache(chatId);

      logger.info(`Disappearing message created: ${message._id} (${disappearType})`);
      return message;
    } catch (error) {
      logger.error(`Error creating disappearing message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark message as viewed
   * @param {string} messageId - Message ID
   * @param {string} userId - Viewer user ID
   * @returns {Object} Updated message
   */
  async markAsViewed(messageId, userId) {
    try {
      const message = await Message.findById(messageId);
      if (!message || !message.isDisappearing) {
        throw new Error('Message not found or is not disappearing');
      }

      if (!message.disappearingMessage.readBy.includes(userId)) {
        message.disappearingMessage.readBy.push(userId);
        message.disappearingMessage.viewCount += 1;
        await message.save();
      }

      // If view-based disappearing, check if all users have viewed
      if (message.disappearingMessage.type === 'view') {
        const disappearing = await DisappearingMessage.findOne({ messageId });
        if (disappearing && message.disappearingMessage.viewCount >= this.getExpectedViewCount()) {
          await this.deleteDisappearingMessage(messageId);
        }
      }

      return message;
    } catch (error) {
      logger.error(`Error marking message as viewed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process expired disappearing messages
   * @returns {number} Count of deleted messages
   */
  async processExpiredMessages() {
    try {
      const now = new Date();
      const expiredMessages = await DisappearingMessage.find({
        status: 'active',
        disappearsAt: { $lte: now },
      }).exec();

      let deletedCount = 0;
      for (const disappearing of expiredMessages) {
        try {
          await this.deleteDisappearingMessage(disappearing.messageId);
          deletedCount++;
        } catch (error) {
          logger.error(`Error deleting expired message ${disappearing.messageId}: ${error.message}`);
        }
      }

      logger.info(`Processed ${deletedCount} expired disappearing messages`);
      return deletedCount;
    } catch (error) {
      logger.error(`Error processing expired messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete disappearing message
   * @param {string} messageId - Message ID
   * @returns {boolean} Success
   */
  async deleteDisappearingMessage(messageId) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Soft delete
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();

      // Update disappearing record
      const disappearing = await DisappearingMessage.findOne({ messageId });
      if (disappearing) {
        disappearing.status = 'disappeared';
        disappearing.disappearedAt = new Date();
        await disappearing.save();

        this.invalidateCache(disappearing.chatId);
      }

      logger.info(`Disappearing message deleted: ${messageId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting disappearing message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get disappearing messages in chat
   * @param {string} chatId - Chat ID
   * @param {Object} options - Filtering options
   * @returns {Array} Messages
   */
  async getDisappearingMessages(chatId, options = {}) {
    try {
      const { limit = 20, offset = 0, status = 'active' } = options;

      const cacheKey = `disappearing:${chatId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }

      const disappearingRecords = await DisappearingMessage.find({
        chatId,
        status,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec();

      const messageIds = disappearingRecords.map((d) => d.messageId);
      const messages = await Message.find({ _id: { $in: messageIds } });

      this.cache.set(cacheKey, { data: messages, timestamp: Date.now() });
      return messages;
    } catch (error) {
      logger.error(`Error getting disappearing messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get disappearing message stats
   * @param {string} chatId - Chat ID
   * @returns {Object} Statistics
   */
  async getDisappearingStats(chatId) {
    try {
      const active = await DisappearingMessage.countDocuments({
        chatId,
        status: 'active',
      });

      const disappeared = await DisappearingMessage.countDocuments({
        chatId,
        status: 'disappeared',
      });

      const expired = await DisappearingMessage.countDocuments({
        chatId,
        status: 'expired',
      });

      return {
        active,
        disappeared,
        expired,
        total: active + disappeared + expired,
      };
    } catch (error) {
      logger.error(`Error getting disappearing stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set chat-level disappearing message default
   * @param {string} chatId - Chat ID
   * @param {string} disappearType - Default type
   * @param {number} duration - Default duration
   * @returns {Object} Chat settings
   */
  async setChatDisappearingDefault(chatId, disappearType, duration) {
    try {
      // Save to chat settings (implementation depends on Chat model)
      const Chat = require('../models/Chat');
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      chat.settings = chat.settings || {};
      chat.settings.disappearingMessages = {
        enabled: true,
        defaultType: disappearType,
        defaultDuration: duration,
      };

      await chat.save();
      this.invalidateCache(chatId);

      logger.info(`Disappearing message defaults set for chat ${chatId}`);
      return chat;
    } catch (error) {
      logger.error(`Error setting disappearing defaults: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get message view status
   * @param {string} messageId - Message ID
   * @returns {Object} View information
   */
  async getMessageViewStatus(messageId) {
    try {
      const message = await Message.findById(messageId);
      if (!message || !message.isDisappearing) {
        throw new Error('Message not found or is not disappearing');
      }

      const disappearing = await DisappearingMessage.findOne({ messageId });
      const disappearsAt = disappearing?.disappearsAt
        ? new Date(disappearing.disappearsAt).getTime()
        : 0;

      const fallbackRemaining =
        message.disappearingMessage.type === 'timer'
          ? Number(message.disappearingMessage.duration || 0) * 1000
          : 0;

      return {
        messageId,
        type: message.disappearingMessage.type,
        viewCount: message.disappearingMessage.viewCount,
        readBy: message.disappearingMessage.readBy,
        timeRemaining: disappearsAt
          ? Math.max(0, disappearsAt - Date.now())
          : fallbackRemaining,
        status: disappearing?.status || 'unknown',
      };
    } catch (error) {
      logger.error(`Error getting message view status: ${error.message}`);
      throw error;
    }
  }

  getExpectedViewCount() {
    // In production, get from chat member count
    return 10;
  }

  invalidateCache(chatId) {
    this.cache.delete(`disappearing:${chatId}`);
  }

  clearCache() {
    this.cache.clear();
    logger.info('Disappearing message cache cleared');
  }
}

module.exports = new DisappearingMessageService();
