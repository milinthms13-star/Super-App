const logger = require('../utils/logger');
const Message = require('../models/Message');
const ScheduledMessage = require('../models/ScheduledMessage');

class MessageScheduleService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Schedule message to send later
   * @param {string} chatId - Target chat ID
   * @param {string} userId - Sender user ID
   * @param {string} content - Message content
   * @param {Date} scheduledTime - When to send
   * @param {Object} options - Optional settings (attachments, mentions, etc.)
   * @returns {Object} Scheduled message object
   */
  async scheduleMessage(chatId, userId, content, scheduledTime, options = {}) {
    try {
      if (!chatId || !userId || !content || !scheduledTime) {
        throw new Error('Missing required fields: chatId, userId, content, scheduledTime');
      }

      if (new Date(scheduledTime) <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      const scheduledMessage = new ScheduledMessage({
        chatId,
        userId,
        content,
        scheduledTime: new Date(scheduledTime),
        status: 'pending',
        attachments: options.attachments || [],
        mentions: options.mentions || [],
        metadata: options.metadata || {},
        createdAt: new Date(),
      });

      await scheduledMessage.save();
      this.invalidateCache(chatId);

      logger.info(`Message scheduled: ${scheduledMessage._id} for ${scheduledTime}`);
      return scheduledMessage;
    } catch (error) {
      logger.error(`Error scheduling message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get scheduled messages for chat
   * @param {string} chatId - Chat ID
   * @param {Object} options - Pagination options
   * @returns {Array} Scheduled messages
   */
  async getScheduledMessages(chatId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;

      const cacheKey = `scheduled:${chatId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }

      const messages = await ScheduledMessage.find({
        chatId,
        status: 'pending',
      })
        .sort({ scheduledTime: 1 })
        .limit(limit)
        .skip(offset)
        .exec();

      this.cache.set(cacheKey, { data: messages, timestamp: Date.now() });
      return messages;
    } catch (error) {
      logger.error(`Error getting scheduled messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel scheduled message
   * @param {string} messageId - Scheduled message ID
   * @param {string} userId - User ID (for authorization)
   * @returns {boolean} Success
   */
  async cancelScheduledMessage(messageId, userId) {
    try {
      const message = await ScheduledMessage.findById(messageId);
      if (!message) {
        throw new Error('Scheduled message not found');
      }

      if (message.userId !== userId) {
        throw new Error('Not authorized to cancel this message');
      }

      message.status = 'cancelled';
      message.cancelledAt = new Date();
      await message.save();

      this.invalidateCache(message.chatId);
      logger.info(`Scheduled message cancelled: ${messageId}`);
      return true;
    } catch (error) {
      logger.error(`Error cancelling scheduled message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process and send scheduled messages that are due
   * @returns {number} Count of sent messages
   */
  async processScheduledMessages() {
    try {
      const now = new Date();
      const dueMessages = await ScheduledMessage.find({
        status: 'pending',
        scheduledTime: { $lte: now },
      }).exec();

      let sentCount = 0;
      for (const scheduledMsg of dueMessages) {
        try {
          // Create actual message
          const message = new Message({
            chatId: scheduledMsg.chatId,
            senderId: scheduledMsg.userId,
            content: scheduledMsg.content,
            attachments: scheduledMsg.attachments,
            mentions: scheduledMsg.mentions,
            metadata: { scheduledMessageId: scheduledMsg._id },
            createdAt: new Date(),
          });

          await message.save();
          scheduledMsg.status = 'sent';
          scheduledMsg.sentAt = new Date();
          await scheduledMsg.save();

          this.invalidateCache(scheduledMsg.chatId);
          sentCount++;

          logger.info(`Scheduled message sent: ${scheduledMsg._id}`);
        } catch (error) {
          logger.error(`Error sending scheduled message ${scheduledMsg._id}: ${error.message}`);
          scheduledMsg.status = 'failed';
          scheduledMsg.error = error.message;
          await scheduledMsg.save();
        }
      }

      return sentCount;
    } catch (error) {
      logger.error(`Error processing scheduled messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get schedule stats for user
   * @param {string} userId - User ID
   * @returns {Object} Statistics
   */
  async getScheduleStats(userId) {
    try {
      const pending = await ScheduledMessage.countDocuments({
        userId,
        status: 'pending',
      });

      const sent = await ScheduledMessage.countDocuments({
        userId,
        status: 'sent',
      });

      const cancelled = await ScheduledMessage.countDocuments({
        userId,
        status: 'cancelled',
      });

      const failed = await ScheduledMessage.countDocuments({
        userId,
        status: 'failed',
      });

      const nextScheduled = await ScheduledMessage.findOne({
        userId,
        status: 'pending',
      }).sort({ scheduledTime: 1 });

      return {
        pending,
        sent,
        cancelled,
        failed,
        total: pending + sent + cancelled + failed,
        nextScheduledTime: nextScheduled ? nextScheduled.scheduledTime : null,
      };
    } catch (error) {
      logger.error(`Error getting schedule stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reschedule message
   * @param {string} messageId - Scheduled message ID
   * @param {Date} newTime - New scheduled time
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Updated message
   */
  async rescheduleMessage(messageId, newTime, userId) {
    try {
      const message = await ScheduledMessage.findById(messageId);
      if (!message) {
        throw new Error('Scheduled message not found');
      }

      if (message.userId !== userId) {
        throw new Error('Not authorized to reschedule this message');
      }

      if (message.status !== 'pending') {
        throw new Error('Can only reschedule pending messages');
      }

      if (new Date(newTime) <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      message.scheduledTime = new Date(newTime);
      await message.save();

      this.invalidateCache(message.chatId);
      logger.info(`Message rescheduled: ${messageId} to ${newTime}`);
      return message;
    } catch (error) {
      logger.error(`Error rescheduling message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get messages scheduled for time range
   * @param {Date} startTime - Start of range
   * @param {Date} endTime - End of range
   * @param {Object} options - Optional filters
   * @returns {Array} Messages in range
   */
  async getMessagesByTimeRange(startTime, endTime, options = {}) {
    try {
      const { chatIds, userId, status = 'pending' } = options;

      const query = {
        status,
        scheduledTime: {
          $gte: new Date(startTime),
          $lte: new Date(endTime),
        },
      };

      if (chatIds && chatIds.length > 0) {
        query.chatId = { $in: chatIds };
      }

      if (userId) {
        query.userId = userId;
      }

      const messages = await ScheduledMessage.find(query)
        .sort({ scheduledTime: 1 })
        .exec();

      return messages;
    } catch (error) {
      logger.error(`Error getting messages by time range: ${error.message}`);
      throw error;
    }
  }

  invalidateCache(chatId) {
    this.cache.delete(`scheduled:${chatId}`);
  }

  clearCache() {
    this.cache.clear();
    logger.info('Schedule cache cleared');
  }
}

module.exports = new MessageScheduleService();
