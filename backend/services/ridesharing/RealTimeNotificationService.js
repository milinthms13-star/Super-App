/**
 * RealTimeNotificationService.js
 * Phase 12: Real-Time Notifications for Payment Events
 * WebSocket-based notifications, email alerts, push notifications
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

class RealTimeNotificationService {
  /**
   * Send payment notification
   */
  static async sendPaymentNotification(notificationData) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('notifications');

      const notificationId = `notif_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      // Determine notification type and channels
      const channels = this._determineChannels(notificationData.eventType, notificationData.priority);
      
      const notification = {
        notificationId,
        userId: notificationData.userId,
        eventType: notificationData.eventType,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || {},
        channels,
        priority: notificationData.priority,
        status: 'pending',
        createdAt: new Date(),
        sentAt: null,
        readAt: null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

      await collection.insertOne(notification);

      // Queue for sending
      const sendResults = {};
      for (const channel of channels) {
        sendResults[channel] = await this._sendViaChannel(channel, notification);
      }

      return {
        success: true,
        message: 'Notification queued for sending',
        data: {
          notificationId,
          channels,
          sendResults
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Send bulk notifications
   */
  static async sendBulkNotifications(bulkData) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('notifications');

      const bulkId = `bulk_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const notifications = [];
      let successCount = 0;

      for (const userId of bulkData.userIds) {
        const notificationId = `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        
        const notification = {
          notificationId,
          bulkId,
          userId,
          eventType: bulkData.eventType,
          title: bulkData.title,
          message: bulkData.message,
          data: bulkData.data || {},
          channels: this._determineChannels(bulkData.eventType, bulkData.priority),
          priority: bulkData.priority,
          status: 'pending',
          createdAt: new Date(),
          sentAt: null,
          readAt: null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };

        notifications.push(notification);
        successCount++;
      }

      await collection.insertMany(notifications);

      return {
        success: true,
        message: 'Bulk notifications queued for sending',
        data: {
          bulkId,
          totalCount: notifications.length,
          queuedCount: successCount
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(userId, filters = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('notifications');

      const query = { userId };

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.eventType) {
        query.eventType = filters.eventType;
      }

      if (filters.unreadOnly) {
        query.readAt = null;
      }

      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 50;
      const skip = (page - 1) * limit;

      const notifications = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const totalCount = await collection.countDocuments(query);
      const unreadCount = await collection.countDocuments({ 
        userId, 
        readAt: null 
      });

      return {
        success: true,
        message: 'User notifications retrieved successfully',
        data: {
          notifications,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit)
          },
          unreadCount
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId, userId) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('notifications');

      const result = await collection.updateOne(
        { notificationId, userId },
        { 
          $set: { 
            readAt: new Date(),
            status: 'read'
          } 
        }
      );

      if (result.matchedCount === 0) {
        throw new Error('Notification not found');
      }

      return {
        success: true,
        message: 'Notification marked as read',
        data: { notificationId }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllNotificationsAsRead(userId) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('notifications');

      const result = await collection.updateMany(
        { userId, readAt: null },
        { 
          $set: { 
            readAt: new Date(),
            status: 'read'
          } 
        }
      );

      return {
        success: true,
        message: 'All notifications marked as read',
        data: { 
          modifiedCount: result.modifiedCount 
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Create notification preference
   */
  static async createNotificationPreference(userId, preferences) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('notification_preferences');

      const existingPref = await collection.findOne({ userId });

      const prefData = {
        userId,
        emailNotifications: preferences.emailNotifications !== false,
        pushNotifications: preferences.pushNotifications !== false,
        smsNotifications: preferences.smsNotifications || false,
        inAppNotifications: preferences.inAppNotifications !== false,
        eventPreferences: {
          paymentProcessed: preferences.paymentProcessed !== false,
          paymentFailed: preferences.paymentFailed !== false,
          refundInitiated: preferences.refundInitiated !== false,
          fraudAlert: preferences.fraudAlert !== false,
          settlementProcessed: preferences.settlementProcessed !== false,
          commissionUpdate: preferences.commissionUpdate !== false
        },
        quietHours: {
          enabled: preferences.quietHours?.enabled || false,
          startTime: preferences.quietHours?.startTime || '22:00',
          endTime: preferences.quietHours?.endTime || '08:00'
        },
        updatedAt: new Date()
      };

      if (existingPref) {
        await collection.updateOne(
          { userId },
          { $set: prefData }
        );
      } else {
        prefData.createdAt = new Date();
        await collection.insertOne(prefData);
      }

      return {
        success: true,
        message: 'Notification preferences saved successfully',
        data: prefData
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get notification preference
   */
  static async getNotificationPreference(userId) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('notification_preferences');

      const preference = await collection.findOne({ userId });

      if (!preference) {
        // Return default preferences
        return {
          success: true,
          message: 'Default notification preferences',
          data: {
            userId,
            emailNotifications: true,
            pushNotifications: true,
            smsNotifications: false,
            inAppNotifications: true,
            eventPreferences: {
              paymentProcessed: true,
              paymentFailed: true,
              refundInitiated: true,
              fraudAlert: true,
              settlementProcessed: true,
              commissionUpdate: true
            },
            quietHours: {
              enabled: false,
              startTime: '22:00',
              endTime: '08:00'
            }
          }
        };
      }

      return {
        success: true,
        message: 'Notification preferences retrieved successfully',
        data: preference
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStatistics(filters = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('notifications');

      const query = {};

      if (filters.startDate) {
        query.createdAt = { $gte: new Date(filters.startDate) };
      }

      if (filters.endDate) {
        query.createdAt = query.createdAt || {};
        query.createdAt.$lte = new Date(filters.endDate);
      }

      const notifications = await collection.find(query).toArray();

      // Calculate statistics
      const stats = {
        totalSent: notifications.length,
        byStatus: {},
        byEventType: {},
        byChannel: {},
        byPriority: {},
        readRate: 0,
        deliveryTime: 0
      };

      notifications.forEach(n => {
        // By status
        stats.byStatus[n.status] = (stats.byStatus[n.status] || 0) + 1;

        // By event type
        stats.byEventType[n.eventType] = (stats.byEventType[n.eventType] || 0) + 1;

        // By priority
        stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1;

        // By channels
        n.channels.forEach(ch => {
          stats.byChannel[ch] = (stats.byChannel[ch] || 0) + 1;
        });
      });

      // Calculate read rate
      const readNotifications = notifications.filter(n => n.readAt !== null);
      if (notifications.length > 0) {
        stats.readRate = Math.round((readNotifications.length / notifications.length) * 100);
      }

      return {
        success: true,
        message: 'Notification statistics retrieved successfully',
        data: stats
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Helper: Determine notification channels
   */
  static _determineChannels(eventType, priority) {
    const channels = ['in_app'];

    // High priority events get multiple channels
    if (priority === 'high' || priority === 'critical') {
      channels.push('email');
      channels.push('push');
    } else if (priority === 'medium') {
      channels.push('email');
    }

    // Critical fraud alerts always include all channels
    if (eventType === 'fraud_alert') {
      return ['email', 'push', 'sms', 'in_app'];
    }

    return channels;
  }

  /**
   * Helper: Send via channel
   */
  static async _sendViaChannel(channel, notification) {
    try {
      switch (channel) {
        case 'email':
          return await this._sendEmail(notification);
        case 'push':
          return await this._sendPushNotification(notification);
        case 'sms':
          return await this._sendSMS(notification);
        case 'in_app':
          return { success: true, channel, queued: true };
        default:
          return { success: false, channel, error: 'Unknown channel' };
      }
    } catch (error) {
      return { success: false, channel, error: error.message };
    }
  }

  /**
   * Helper: Send email
   */
  static async _sendEmail(notification) {
    // Placeholder for email service integration
    return {
      success: true,
      channel: 'email',
      queued: true,
      messageId: `email_${crypto.randomBytes(8).toString('hex')}`
    };
  }

  /**
   * Helper: Send push notification
   */
  static async _sendPushNotification(notification) {
    // Placeholder for push notification service integration
    return {
      success: true,
      channel: 'push',
      queued: true,
      messageId: `push_${crypto.randomBytes(8).toString('hex')}`
    };
  }

  /**
   * Helper: Send SMS
   */
  static async _sendSMS(notification) {
    // Placeholder for SMS service integration
    return {
      success: true,
      channel: 'sms',
      queued: true,
      messageId: `sms_${crypto.randomBytes(8).toString('hex')}`
    };
  }
}

module.exports = RealTimeNotificationService;
