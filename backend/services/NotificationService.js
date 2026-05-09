/**
 * NotificationService.js
 * Real-time notifications across email, SMS, push, and in-app
 */

const logger = require('../config/logger');

class NotificationService {
  /**
   * Send notification to user
   */
  static async sendNotification(userId, notificationData) {
    try {
      const User = require('../models/User');
      const Notification = require('../models/Notification');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const notification = new Notification({
        userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        icon: notificationData.icon,
        data: notificationData.data || {},
        channels: notificationData.channels || ['in-app'], // in-app, email, sms, push
        read: false,
        createdAt: new Date(),
      });

      await notification.save();

      // Send through specified channels
      if (notification.channels.includes('email')) {
        await this._sendEmail(user.email, notification);
      }

      if (notification.channels.includes('sms') && user.phone) {
        await this._sendSMS(user.phone, notification);
      }

      if (notification.channels.includes('push') && user.deviceTokens?.length > 0) {
        await this._sendPushNotification(user.deviceTokens, notification);
      }

      logger.info(`Notification sent to user ${userId}`);

      return {
        success: true,
        data: notification,
        message: 'Notification sent',
      };
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send bulk notification
   */
  static async sendBulkNotification(userIds, notificationData) {
    try {
      const results = await Promise.all(
        userIds.map(userId => this.sendNotification(userId, notificationData))
      );

      logger.info(`Bulk notification sent to ${userIds.length} users`);

      return {
        success: true,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      };
    } catch (error) {
      logger.error('Error sending bulk notification:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(userId, filters = {}) {
    try {
      const Notification = require('../models/Notification');

      const { page = 1, limit = 20, unreadOnly = false } = filters;
      const skip = (page - 1) * limit;

      let query = { userId };
      if (unreadOnly) {
        query.read = false;
      }

      const total = await Notification.countDocuments(query);

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        unreadCount: await Notification.countDocuments({
          userId,
          read: false,
        }),
      };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId) {
    try {
      const Notification = require('../models/Notification');

      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { read: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) throw new Error('Notification not found');

      return {
        success: true,
        data: notification,
      };
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId) {
    try {
      const Notification = require('../models/Notification');

      await Notification.updateMany(
        { userId, read: false },
        { read: true, readAt: new Date() }
      );

      logger.info(`All notifications marked as read for user ${userId}`);

      return {
        success: true,
        message: 'All notifications marked as read',
      };
    } catch (error) {
      logger.error('Error marking all as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId) {
    try {
      const Notification = require('../models/Notification');

      await Notification.findByIdAndDelete(notificationId);

      return {
        success: true,
        message: 'Notification deleted',
      };
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Set notification preferences
   */
  static async setNotificationPreferences(userId, preferences) {
    try {
      const User = require('../models/User');

      const user = await User.findByIdAndUpdate(
        userId,
        { notificationPreferences: preferences },
        { new: true }
      );

      if (!user) throw new Error('User not found');

      logger.info(`Notification preferences updated for user ${userId}`);

      return {
        success: true,
        data: preferences,
        message: 'Preferences updated',
      };
    } catch (error) {
      logger.error('Error setting notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  static async getNotificationPreferences(userId) {
    try {
      const User = require('../models/User');

      const user = await User.findById(userId).select('notificationPreferences');
      if (!user) throw new Error('User not found');

      const defaultPreferences = {
        email: {
          orders: true,
          reviews: true,
          promotions: false,
          newsletters: true,
        },
        sms: {
          orders: true,
          urgent: true,
          promotions: false,
        },
        push: {
          orders: true,
          messages: true,
          promotions: false,
        },
        inApp: {
          all: true,
        },
      };

      return {
        preferences: user.notificationPreferences || defaultPreferences,
      };
    } catch (error) {
      logger.error('Error getting notification preferences:', error);
      throw error;
    }
  }

  /**
   * Send order notification
   */
  static async sendOrderNotification(orderId, eventType) {
    try {
      const Order = require('../models/Order');

      const order = await Order.findById(orderId).populate('userId');
      if (!order) throw new Error('Order not found');

      const notificationMap = {
        order_confirmed: {
          title: '✅ Order Confirmed!',
          message: `Your order #${order.orderNumber} has been confirmed. Expected delivery: ${order.expectedDelivery}`,
          type: 'order_confirmed',
        },
        order_shipped: {
          title: '📦 Order Shipped!',
          message: `Your order #${order.orderNumber} has been shipped. Track your package.`,
          type: 'order_shipped',
        },
        order_delivered: {
          title: '🎉 Delivered!',
          message: `Your order #${order.orderNumber} has been delivered. Thank you for shopping!`,
          type: 'order_delivered',
        },
        order_cancelled: {
          title: '❌ Order Cancelled',
          message: `Your order #${order.orderNumber} has been cancelled. Refund will be processed.`,
          type: 'order_cancelled',
        },
      };

      const notifData = notificationMap[eventType];
      if (!notifData) throw new Error('Invalid event type');

      await this.sendNotification(order.userId._id, {
        ...notifData,
        data: { orderId, orderNumber: order.orderNumber },
        channels: ['in-app', 'email', 'push'],
      });

      return { success: true, message: 'Order notification sent' };
    } catch (error) {
      logger.error('Error sending order notification:', error);
      throw error;
    }
  }

  /**
   * Send promotional notification
   */
  static async sendPromotionalNotification(userIds, promotionData) {
    try {
      const notification = {
        title: promotionData.title,
        message: promotionData.message,
        type: 'promotion',
        icon: promotionData.icon,
        data: {
          promotionId: promotionData.promotionId,
          discount: promotionData.discount,
          code: promotionData.code,
        },
        channels: ['in-app', 'email', 'push'],
      };

      await this.sendBulkNotification(userIds, notification);

      logger.info(`Promotional notification sent to ${userIds.length} users`);

      return {
        success: true,
        message: 'Promotional notification sent',
      };
    } catch (error) {
      logger.error('Error sending promotional notification:', error);
      throw error;
    }
  }

  /**
   * Send email (mock)
   */
  static async _sendEmail(email, notification) {
    try {
      logger.info(`Email sent to ${email}: ${notification.title}`);
      // In production: use Nodemailer or SendGrid
      return true;
    } catch (error) {
      logger.error('Error sending email:', error);
    }
  }

  /**
   * Send SMS (mock)
   */
  static async _sendSMS(phone, notification) {
    try {
      logger.info(`SMS sent to ${phone}: ${notification.message.substring(0, 50)}...`);
      // In production: use Twilio
      return true;
    } catch (error) {
      logger.error('Error sending SMS:', error);
    }
  }

  /**
   * Send push notification (mock)
   */
  static async _sendPushNotification(deviceTokens, notification) {
    try {
      logger.info(`Push sent to ${deviceTokens.length} devices: ${notification.title}`);
      // In production: use Firebase Cloud Messaging
      return true;
    } catch (error) {
      logger.error('Error sending push notification:', error);
    }
  }
}

module.exports = NotificationService;
