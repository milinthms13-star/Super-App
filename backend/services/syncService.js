const logger = require('../utils/logger');
const OfflineQueue = require('../models/OfflineQueue');
const Message = require('../models/Message');

/**
 * SyncService
 * Manages offline message queuing and background synchronization
 */
class SyncService {
  constructor() {
    this.name = 'SyncService';
    this.MAX_RETRIES = 5;
    this.RETRY_DELAY_MS = 1000; // Start with 1 second
  }

  /**
   * Queue message for sending (when user is offline)
   */
  async queueMessage(userId, deviceId, conversationId, messageContent, clientMessageId) {
    try {
      const queueItem = new OfflineQueue({
        userId,
        deviceId,
        action: 'sendMessage',
        clientMessageId,
        conversationId,
        payload: {
          messageContent,
        },
        status: 'pending',
      });

      await queueItem.save();

      logger.info(
        `Message queued for offline sync: ${clientMessageId} for user ${userId}`
      );
      return queueItem;
    } catch (error) {
      logger.error('Error queuing message:', error);
      throw error;
    }
  }

  /**
   * Get pending messages for device
   */
  async getPendingMessages(userId, deviceId) {
    try {
      const pending = await OfflineQueue.getPendingForDevice(userId, deviceId);
      return pending;
    } catch (error) {
      logger.error('Error getting pending messages:', error);
      throw error;
    }
  }

  /**
   * Mark queued message as synced
   */
  async markMessageAsSynced(clientMessageId, serverMessageId) {
    try {
      const queueItem = await OfflineQueue.findOne({ clientMessageId });
      if (!queueItem) {
        throw new Error('Queue item not found');
      }

      queueItem.status = 'synced';
      queueItem.syncedAt = new Date();
      queueItem.payload.serverMessageId = serverMessageId;

      await queueItem.save();

      logger.info(`Message marked as synced: ${clientMessageId}`);
      return queueItem;
    } catch (error) {
      logger.error('Error marking message as synced:', error);
      throw error;
    }
  }

  /**
   * Mark queued message as failed
   */
  async markMessageAsFailed(clientMessageId, reason) {
    try {
      const queueItem = await OfflineQueue.findOne({ clientMessageId });
      if (!queueItem) {
        throw new Error('Queue item not found');
      }

      await queueItem.markFailed(reason);

      logger.warn(
        `Message marked as failed: ${clientMessageId} - ${reason}`
      );
      return queueItem;
    } catch (error) {
      logger.error('Error marking message as failed:', error);
      throw error;
    }
  }

  /**
   * Retry failed message
   */
  async retryMessage(clientMessageId) {
    try {
      const queueItem = await OfflineQueue.findOne({ clientMessageId });
      if (!queueItem) {
        throw new Error('Queue item not found');
      }

      if (queueItem.retryCount >= queueItem.maxRetries) {
        throw new Error('Max retries exceeded');
      }

      await queueItem.incrementRetry();

      logger.info(`Message retry #${queueItem.retryCount}: ${clientMessageId}`);
      return queueItem;
    } catch (error) {
      logger.error('Error retrying message:', error);
      throw error;
    }
  }

  /**
   * Get failed messages for user
   */
  async getFailedMessages(userId) {
    try {
      const failed = await OfflineQueue.getFailedMessages(userId);
      return failed;
    } catch (error) {
      logger.error('Error getting failed messages:', error);
      throw error;
    }
  }

  /**
   * Cancel queued message
   */
  async cancelMessage(clientMessageId) {
    try {
      const queueItem = await OfflineQueue.findOne({ clientMessageId });
      if (!queueItem) {
        throw new Error('Queue item not found');
      }

      await queueItem.cancel();

      logger.info(`Message cancelled: ${clientMessageId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error cancelling message:', error);
      throw error;
    }
  }

  /**
   * Sync messages from server (incremental pull)
   */
  async syncMessagesFromServer(userId, lastSyncTimestamp, limit = 100) {
    try {
      const newMessages = await Message.find({
        $or: [{ recipientId: userId }, { conversationId: { $exists: true } }],
        createdAt: { $gte: lastSyncTimestamp },
      })
        .populate('senderId', 'username avatar')
        .sort({ createdAt: 1 })
        .limit(limit)
        .lean();

      const syncToken = new Date().getTime();

      return {
        messages: newMessages,
        syncToken,
        hasMore: newMessages.length === limit,
      };
    } catch (error) {
      logger.error('Error syncing messages:', error);
      throw error;
    }
  }

  /**
   * Sync message status (read/delivered)
   */
  async syncMessageStatus(messageStatuses) {
    try {
      // Update multiple message statuses
      const updates = messageStatuses.map((status) =>
        Message.findByIdAndUpdate(
          status.messageId,
          {
            status: status.status, // 'sent', 'delivered', 'read'
            deliveredAt:
              status.status === 'delivered' ? new Date() : undefined,
            readAt: status.status === 'read' ? new Date() : undefined,
          },
          { new: true }
        )
      );

      const results = await Promise.all(updates);

      logger.info(`Synced status for ${messageStatuses.length} messages`);
      return results;
    } catch (error) {
      logger.error('Error syncing message status:', error);
      throw error;
    }
  }

  /**
   * Get sync metadata for client
   */
  async getSyncMetadata(userId) {
    try {
      const pendingCount = await OfflineQueue.countDocuments({
        userId,
        status: 'pending',
      });

      const failedCount = await OfflineQueue.countDocuments({
        userId,
        status: 'failed',
      });

      // Get last sync timestamp from last synced message
      const lastSyncedMessage = await Message.findOne({
        $or: [{ recipientId: userId }, { senderId: userId }],
      })
        .sort({ createdAt: -1 })
        .lean();

      return {
        pendingCount,
        failedCount,
        lastSyncTimestamp: lastSyncedMessage?.createdAt || Date.now(),
        isSyncing: false,
      };
    } catch (error) {
      logger.error('Error getting sync metadata:', error);
      throw error;
    }
  }

  /**
   * Batch sync operations
   */
  async batchSync(userId, deviceId, operations) {
    try {
      const results = {
        succeeded: [],
        failed: [],
      };

      for (const op of operations) {
        try {
          if (op.type === 'sendMessage') {
            const queueItem = await this.queueMessage(
              userId,
              deviceId,
              op.conversationId,
              op.content,
              op.clientMessageId
            );
            results.succeeded.push(queueItem);
          } else if (op.type === 'updateStatus') {
            const updated = await this.syncMessageStatus([
              {
                messageId: op.messageId,
                status: op.status,
              },
            ]);
            results.succeeded.push(...updated);
          }
        } catch (error) {
          logger.error(`Error in batch operation:`, error);
          results.failed.push({
            operation: op,
            error: error.message,
          });
        }
      }

      logger.info(
        `Batch sync completed: ${results.succeeded.length} succeeded, ${results.failed.length} failed`
      );
      return results;
    } catch (error) {
      logger.error('Error in batch sync:', error);
      throw error;
    }
  }

  /**
   * Clean up expired offline queue items
   */
  async cleanupExpiredItems() {
    try {
      const now = new Date();
      const result = await OfflineQueue.deleteMany({
        expiresAt: { $lt: now },
      });

      logger.info(`Cleaned up ${result.deletedCount} expired offline items`);
      return result;
    } catch (error) {
      logger.error('Error cleaning up expired items:', error);
      throw error;
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics(userId) {
    try {
      const stats = await OfflineQueue.aggregate([
        {
          $match: { userId },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const formatted = {
        pending: 0,
        synced: 0,
        failed: 0,
        cancelled: 0,
      };

      stats.forEach((stat) => {
        formatted[stat._id] = stat.count;
      });

      return formatted;
    } catch (error) {
      logger.error('Error getting sync statistics:', error);
      throw error;
    }
  }

  /**
   * Export offline queue for debugging
   */
  async exportOfflineQueue(userId) {
    try {
      const items = await OfflineQueue.find({ userId })
        .sort({ queuedAt: -1 })
        .lean();

      return items;
    } catch (error) {
      logger.error('Error exporting offline queue:', error);
      throw error;
    }
  }
}

module.exports = new SyncService();
