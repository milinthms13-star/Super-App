/**
 * Message Retry Handler Service
 * Manages retry logic for failed messages with exponential backoff
 * Handles offline sync, delivery tracking, and conflict resolution
 */

const MessageQueue = require('../models/MessageQueue');
const Message = require('../models/Message');
const Device = require('../models/Device');
const DeviceSession = require('../models/DeviceSession');
const logger = require('../utils/logger'); // Assuming you have a logger

class MessageRetryHandler {
  constructor() {
    this.maxRetryAttempts = 5;
    this.baseBackoffMs = 1000; // 1 second
    this.maxBackoffMs = 3600000; // 1 hour
    this.processingInterval = 30000; // Check queue every 30 seconds
  }

  /**
   * Enqueue message for delivery
   */
  async enqueueMessage(message, options = {}) {
    try {
      const queueEntry = await MessageQueue.enqueue(
        {
          messageId: message._id,
          chatId: message.chatId,
          senderId: message.senderId,
          recipientIds: options.recipientIds || [],
          messageType: message.messageType,
          contentPreview: this.getPreview(message),
          clientMessageId: message.clientMessageId,
          encryption: {
            isEncrypted: options.isEncrypted || false,
            encryptionAlgorithm: options.encryptionAlgorithm,
          },
        },
        {
          status: options.offline ? 'pending' : 'sent',
          priority: options.priority || 'normal',
          offlineSync: { isOfflineMessage: options.offline === true },
          deviceIds: options.deviceIds,
        }
      );

      logger.info(`Message enqueued: ${queueEntry._id}`);
      return queueEntry;
    } catch (error) {
      logger.error('Error enqueuing message:', error);
      throw error;
    }
  }

  /**
   * Process retry queue - called by a scheduled job
   */
  async processRetryQueue(limit = 50) {
    try {
      const retryMessages = await MessageQueue.getRetryQueue(limit);

      if (retryMessages.length === 0) {
        return { processed: 0, failed: 0, success: 0 };
      }

      logger.info(`Processing ${retryMessages.length} messages from retry queue`);

      let stats = { processed: 0, failed: 0, success: 0 };

      for (const queueEntry of retryMessages) {
        const result = await this.processQueueEntry(queueEntry);
        stats.processed++;
        if (result.success) {
          stats.success++;
        } else {
          stats.failed++;
        }
      }

      logger.info(`Retry queue processing complete: ${JSON.stringify(stats)}`);
      return stats;
    } catch (error) {
      logger.error('Error processing retry queue:', error);
      throw error;
    }
  }

  /**
   * Process single queue entry
   */
  async processQueueEntry(queueEntry) {
    try {
      const message = await Message.findById(queueEntry.messageId);
      if (!message) {
        await MessageQueue.findByIdAndUpdate(queueEntry._id, {
          status: 'failed',
          completedAt: new Date(),
        });
        return { success: false };
      }

      // Get active devices for recipients
      const devices = await this.getActiveDevicesForRecipients(
        queueEntry.recipientIds
      );

      if (devices.length === 0) {
        // No active devices, reschedule
        await this.scheduleRetry(queueEntry._id);
        return { success: false };
      }

      // Attempt delivery to each device
      let hasSuccessfulDelivery = false;

      for (const device of devices) {
        const success = await this.deliverToDevice(message, device);
        if (success) {
          hasSuccessfulDelivery = true;
        }
      }

      if (hasSuccessfulDelivery) {
        // Update message as sent
        await Message.updateOne(
          { _id: message._id },
          { $set: { 'deliveryStatus.$[].status': 'sent' } }
        );

        // Update queue
        const entry = await MessageQueue.findById(queueEntry._id);
        for (const recipient of queueEntry.recipientIds) {
          await entry.markSent(recipient);
        }

        return { success: true };
      } else {
        // Schedule retry if max attempts not reached
        if (queueEntry.retryAttempts < this.maxRetryAttempts) {
          await this.scheduleRetry(queueEntry._id);
        } else {
          // Mark as failed
          await MessageQueue.findByIdAndUpdate(queueEntry._id, {
            status: 'failed',
            completedAt: new Date(),
          });
        }
        return { success: false };
      }
    } catch (error) {
      logger.error(`Error processing queue entry ${queueEntry._id}:`, error);
      await this.scheduleRetry(queueEntry._id);
      return { success: false };
    }
  }

  /**
   * Deliver message to specific device
   */
  async deliverToDevice(message, device) {
    try {
      // Verify device connection
      if (
        device.connectionStatus !== 'online' &&
        device.connectionStatus !== 'idle'
      ) {
        return false;
      }

      // In production, this would emit Socket.IO event or push notification
      // For now, returning success if device is online
      if (device.socketId) {
        // Socket.IO delivery would happen here
        // socket.to(device.socketId).emit('message:new', message);
        return true;
      }

      // Fallback to push notification
      if (device.pushToken) {
        // Push notification would happen here
        // await sendPushNotification(device.pushToken, message);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error delivering to device ${device._id}:`, error);
      return false;
    }
  }

  /**
   * Get active devices for recipients
   */
  async getActiveDevicesForRecipients(recipientIds) {
    try {
      const devices = await Device.find({
        userId: { $in: recipientIds },
        isActive: true,
        $or: [
          { connectionStatus: 'online' },
          { connectionStatus: 'idle' },
          { pushToken: { $exists: true, $ne: null } },
        ],
      });

      return devices;
    } catch (error) {
      logger.error('Error getting active devices:', error);
      return [];
    }
  }

  /**
   * Schedule message for retry with exponential backoff
   */
  async scheduleRetry(queueEntryId, backoffMultiplier = 2) {
    try {
      const entry = await MessageQueue.findById(queueEntryId);
      if (!entry) return;

      await entry.scheduleRetry(backoffMultiplier);
      logger.info(
        `Message retry scheduled: ${queueEntryId}, attempts: ${entry.retryAttempts}, next retry: ${entry.nextRetryAt}`
      );
    } catch (error) {
      logger.error(`Error scheduling retry for ${queueEntryId}:`, error);
      throw error;
    }
  }

  /**
   * Handle message delivery confirmation
   */
  async handleDeliveryConfirmation(messageId, recipientId, status) {
    try {
      const queueEntry = await MessageQueue.findOne({ messageId });
      if (!queueEntry) return;

      if (status === 'delivered') {
        await queueEntry.markDelivered(recipientId);
      } else if (status === 'seen') {
        await queueEntry.markSeen(recipientId);
      }

      logger.info(
        `Delivery confirmation: ${messageId} -> ${recipientId}: ${status}`
      );
    } catch (error) {
      logger.error('Error handling delivery confirmation:', error);
    }
  }

  /**
   * Handle message failure
   */
  async handleDeliveryFailure(
    messageId,
    recipientId,
    errorReason,
    errorCode = 'UNKNOWN'
  ) {
    try {
      const queueEntry = await MessageQueue.findOne({ messageId });
      if (!queueEntry) return;

      const retryable = this.isRetryableError(errorCode);
      await queueEntry.markFailed(recipientId, errorReason, errorCode, retryable);

      logger.warn(
        `Delivery failure: ${messageId} -> ${recipientId}: ${errorReason} (retryable: ${retryable})`
      );
    } catch (error) {
      logger.error('Error handling delivery failure:', error);
    }
  }

  /**
   * Determine if error is retryable
   */
  isRetryableError(errorCode) {
    const retryableErrors = [
      'DEVICE_OFFLINE',
      'NETWORK_ERROR',
      'TIMEOUT',
      'SERVICE_UNAVAILABLE',
      'RATE_LIMITED',
      'TEMPORARY_FAILURE',
    ];

    return retryableErrors.includes(errorCode);
  }

  /**
   * Get message retry status
   */
  async getRetryStatus(messageId) {
    try {
      const queueEntry = await MessageQueue.findOne({ messageId });
      if (!queueEntry) {
        return { found: false };
      }

      return {
        found: true,
        status: queueEntry.status,
        retryAttempts: queueEntry.retryAttempts,
        nextRetryAt: queueEntry.nextRetryAt,
        deliveryStatus: queueEntry.deliveryStatus,
        errors: queueEntry.errors,
      };
    } catch (error) {
      logger.error('Error getting retry status:', error);
      throw error;
    }
  }

  /**
   * Sync offline messages when device comes online
   */
  async syncOfflineMessages(userId, deviceId, fromTimestamp = null) {
    try {
      // Get all pending messages for this user since offline
      const query = {
        recipientIds: userId,
        status: { $in: ['pending', 'retry'] },
        createdAt: { $gte: fromTimestamp || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      };

      const pendingMessages = await MessageQueue.find(query)
        .sort({ createdAt: 1 })
        .limit(1000);

      logger.info(
        `Syncing ${pendingMessages.length} offline messages for user ${userId}`
      );

      // Retry each pending message
      const syncResults = {
        total: pendingMessages.length,
        synced: 0,
        failed: 0,
      };

      for (const queueEntry of pendingMessages) {
        const result = await this.processQueueEntry(queueEntry);
        if (result.success) {
          syncResults.synced++;
        } else {
          syncResults.failed++;
        }
      }

      // Update device last sync timestamp
      await Device.findByIdAndUpdate(deviceId, {
        lastSyncAt: new Date(),
        syncState: 'synced',
      });

      return syncResults;
    } catch (error) {
      logger.error('Error syncing offline messages:', error);
      throw error;
    }
  }

  /**
   * Handle duplicate message detection
   */
  async handleDuplicate(clientMessageId, messageData) {
    try {
      // Check if message with same clientMessageId already exists
      const existingQueueEntry = await MessageQueue.findOne({
        clientMessageId,
      });

      if (existingQueueEntry) {
        logger.info(`Duplicate detected: ${clientMessageId}`);
        return {
          isDuplicate: true,
          existingMessageId: existingQueueEntry.messageId,
          status: existingQueueEntry.status,
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      logger.error('Error handling duplicate:', error);
      throw error;
    }
  }

  /**
   * Clean up old completed messages from queue
   */
  async cleanupOldMessages(daysOld = 30) {
    try {
      const cutoffDate = new Date(
        Date.now() - daysOld * 24 * 60 * 60 * 1000
      );

      const result = await MessageQueue.deleteMany({
        status: { $in: ['delivered', 'completed'] },
        completedAt: { $lte: cutoffDate },
      });

      logger.info(`Cleaned up ${result.deletedCount} old messages from queue`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old messages:', error);
      throw error;
    }
  }

  /**
   * Get retry statistics
   */
  async getRetryStats(hours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const stats = await MessageQueue.aggregate([
        {
          $match: {
            createdAt: { $gte: cutoffTime },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgRetries: { $avg: '$retryAttempts' },
          },
        },
      ]);

      return stats;
    } catch (error) {
      logger.error('Error getting retry stats:', error);
      throw error;
    }
  }

  /**
   * Get preview of message content
   */
  getPreview(message) {
    if (message.messageType === 'text') {
      return message.content?.substring(0, 100) || 'Text message';
    } else if (message.messageType === 'image') {
      return '[Image]';
    } else if (message.messageType === 'video') {
      return '[Video]';
    } else if (message.messageType === 'file') {
      return `[File: ${message.media?.fileName || 'unknown'}]`;
    } else if (message.messageType === 'audio' || message.messageType === 'voice') {
      return '[Audio/Voice]';
    } else if (message.messageType === 'location') {
      return '[Location]';
    } else if (message.messageType === 'contact') {
      return '[Contact]';
    }
    return `[${message.messageType}]`;
  }
}

module.exports = new MessageRetryHandler();
