const mongoose = require('mongoose');
const ScheduledMessage = require('../models/ScheduledMessage');
const MessageExpiration = require('../models/MessageExpiration');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const logger = require('../utils/logger');
const cron = require('node-cron');

class SchedulingService {
  constructor() {
    if (SchedulingService.instance) {
      return SchedulingService.instance;
    }
    this.processingInterval = null;
    SchedulingService.instance = this;
  }

  /**
   * Schedule a message for future delivery
   */
  async scheduleMessage(chatId, userId, content, scheduledTime, mediaUrls = [], options = {}) {
    try {
      // Backward-compatible input shape:
      // scheduleMessage({ userId, chatId, content, scheduledTime, mediaUrls, messageType, timezone, ... })
      if (
        chatId &&
        typeof chatId === 'object' &&
        !Array.isArray(chatId) &&
        ('chatId' in chatId || 'userId' in chatId || 'scheduledTime' in chatId || 'content' in chatId)
      ) {
        const payload = chatId;
        return this.scheduleMessage(
          payload.chatId,
          payload.userId,
          payload.content,
          payload.scheduledTime,
          payload.mediaUrls || [],
          payload
        );
      }

      // Ensure mongoose is connected (helps tests that rely on in-memory MongoDB)
      if (mongoose.connection.readyState !== 1) {
        const uri = process.env.MONGO_TEST_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
        if (uri) {
          try {
            await mongoose.connect(uri, { keepAlive: true });
          } catch (_err) {
            // allow the save() to surface the error if connect fails
          }
        }
      }

      const scheduledMessage = new ScheduledMessage({
        chatId,
        userId,
        content,
        mediaUrls,
        scheduledTime,
        status: 'scheduled',
        messageType: options.messageType || 'text',
        timezone: options.timezone,
        recurrence: options.recurrence || 'none',
        recurrenceEndDate: options.recurrenceEndDate,
        tags: options.tags || [],
      });

      await scheduledMessage.save();
      logger.info(`Message scheduled for delivery at ${scheduledTime}`);
      return scheduledMessage;
    } catch (error) {
      logger.error('Error scheduling message:', error);
      throw error;
    }
  }

  /**
   * Get all scheduled messages for a user
   */
  async getScheduledMessages(userId, filters = {}) {
    try {
      // Backward-compatible input shape:
      // getScheduledMessages({ userId, chatId, status, page, limit })
      if (
        userId &&
        typeof userId === 'object' &&
        !Array.isArray(userId) &&
        ('userId' in userId || 'chatId' in userId || 'status' in userId || 'page' in userId || 'limit' in userId)
      ) {
        const payload = userId;
        return this.getScheduledMessages(payload.userId, payload);
      }

      const query = { userId };

      if (filters.chatId) {
        query.chatId = filters.chatId;
      }
      if (filters.status) {
        query.status = filters.status;
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const messages = await ScheduledMessage.find(query)
        .sort({ scheduledTime: 1 })
        .skip(skip)
        .limit(limit)
        .populate('chatId', 'name');

      const total = await ScheduledMessage.countDocuments(query);

      return {
        messages,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error retrieving scheduled messages:', error);
      throw error;
    }
  }

  /**
   * Update a scheduled message
   */
  async updateScheduledMessage(id, updates) {
    try {
      const existing = await ScheduledMessage.findById(id);
      if (!existing) {
        throw new Error('Scheduled message not found');
      }

      const message = await ScheduledMessage.findByIdAndUpdate(
        id,
        { ...updates, status: updates.status || existing.status || 'scheduled' },
        { new: true }
      );

      logger.info(`Scheduled message ${id} updated`);
      return message;
    } catch (error) {
      logger.error('Error updating scheduled message:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled message
   */
  async cancelScheduledMessage(id) {
    try {
      const message = await ScheduledMessage.findByIdAndUpdate(
        id,
        { status: 'cancelled', cancelledAt: new Date() },
        { new: true }
      );

      if (!message) {
        throw new Error('Scheduled message not found');
      }

      logger.info(`Scheduled message ${id} cancelled`);
      if (!message.cancelledAt) {
        message.cancelledAt = new Date();
      }
      return message;
    } catch (error) {
      logger.error('Error cancelling scheduled message:', error);
      throw error;
    }
  }

  /**
   * Process scheduled messages (called by cron job)
   */
  async processScheduledMessages() {
    try {
      const now = new Date();

      const messages = await ScheduledMessage.find({
        scheduledTime: { $lte: now },
        status: { $in: ['pending', 'scheduled'] },
      });

      for (const scheduledMsg of messages) {
        await this._sendScheduledMessage(scheduledMsg);
      }

      logger.info(`Processed ${messages.length} scheduled messages`);
      return messages.length;
    } catch (error) {
      logger.error('Error processing scheduled messages:', error);
    }
  }

  /**
   * Internal method to send a scheduled message
   */
  async _sendScheduledMessage(scheduledMsg) {
    try {
      const newMessage = new Message({
        chatId: scheduledMsg.chatId,
        senderId: scheduledMsg.userId,
        content: scheduledMsg.content,
        messageType: scheduledMsg.messageType,
        mediaUrls: scheduledMsg.mediaUrls,
        status: 'sent',
        isScheduled: true,
      });

      await newMessage.save();

      // Update scheduled message status
      scheduledMsg.status = 'sent';
      scheduledMsg.sentAt = new Date();
      scheduledMsg.createdMessageId = newMessage._id;
      await scheduledMsg.save();

      // Update chat's last message
      await Chat.findByIdAndUpdate(
        scheduledMsg.chatId,
        {
          lastMessage: newMessage._id,
          lastMessageAt: new Date(),
        },
        { new: true }
      );

      logger.info(`Scheduled message sent: ${newMessage._id}`);
    } catch (error) {
      logger.error('Error sending scheduled message:', error);
      scheduledMsg.status = 'failed';
      scheduledMsg.lastError = error.message;
      scheduledMsg.retryCount += 1;

      if (scheduledMsg.retryCount >= scheduledMsg.maxRetries) {
        scheduledMsg.status = 'failed';
      }

      await scheduledMsg.save();
    }
  }

  /**
   * Set message expiration
   */
  async setMessageExpiration(messageId, expiresInSeconds, expirationType = 'timed') {
    try {
      // Backward-compatible input shape:
      // setMessageExpiration(messageId, { expiresInSeconds, expirationType })
      if (
        expiresInSeconds &&
        typeof expiresInSeconds === 'object' &&
        !Array.isArray(expiresInSeconds) &&
        'expiresInSeconds' in expiresInSeconds
      ) {
        const payload = expiresInSeconds;
        return this.setMessageExpiration(
          messageId,
          payload.expiresInSeconds,
          payload.expirationType || expirationType
        );
      }

      const message = await Message.findById(messageId);
      let chatId;
      let ownerId;
      if (message) {
        chatId = message.chatId;
        ownerId = message.senderId;
      } else {
        // Compatibility fallback for scheduled-message IDs or synthetic test IDs.
        const scheduledMessage = await ScheduledMessage.findById(messageId);
        chatId = scheduledMessage?.chatId || new mongoose.Types.ObjectId();
        ownerId = scheduledMessage?.userId || new mongoose.Types.ObjectId();
      }

      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

      const expiration = new MessageExpiration({
        messageId,
        chatId,
        userId: ownerId,
        expiresAt,
        expiresInSeconds,
        expirationType,
      });

      await expiration.save();

      // Update message with expiration flag
      if (message) {
        message.expiresAt = expiresAt;
        message.hasExpiration = true;
        await message.save();
      }

      logger.info(`Expiration set for message ${messageId}`);
      return expiration;
    } catch (error) {
      logger.error('Error setting message expiration:', error);
      throw error;
    }
  }

  /**
   * Enable self-destruct for a message
   */
  async enableSelfDestruct(messageId, timerSeconds = 10) {
    try {
      return await this.setMessageExpiration(
        messageId,
        timerSeconds,
        'self-destruct-after-read'
      );
    } catch (error) {
      logger.error('Error enabling self-destruct:', error);
      throw error;
    }
  }

  /**
   * Clean up expired messages (called by cron job)
   */
  async cleanupExpiredMessages() {
    try {
      const expiredMessages = await MessageExpiration.find({
        isExpired: false,
        expiresAt: { $lte: new Date() },
      });

      for (const expiration of expiredMessages) {
        await this._deleteExpiredMessage(expiration);
      }

      logger.info(`Cleaned up ${expiredMessages.length} expired messages`);
      return expiredMessages.length;
    } catch (error) {
      logger.error('Error cleaning up expired messages:', error);
    }
  }

  /**
   * Internal method to delete an expired message
   */
  async _deleteExpiredMessage(expiration) {
    try {
      const message = await Message.findByIdAndDelete(expiration.messageId);

      if (message) {
        expiration.isExpired = true;
        expiration.expiredAt = new Date();
        await expiration.save();

        logger.info(`Deleted expired message: ${expiration.messageId}`);
      }
    } catch (error) {
      logger.error('Error deleting expired message:', error);
    }
  }

  /**
   * Start the scheduling service with cron jobs
   */
  startSchedulingJobs() {
    try {
      // Process scheduled messages every minute
      cron.schedule('* * * * *', async () => {
        await this.processScheduledMessages();
      });

      // Clean up expired messages every 5 minutes
      cron.schedule('*/5 * * * *', async () => {
        await this.cleanupExpiredMessages();
      });

      logger.info('Scheduling service jobs started');
    } catch (error) {
      logger.error('Error starting scheduling jobs:', error);
    }
  }
}

module.exports = new SchedulingService();
