const Notification = require('../models/FoodDeliveryNotification');
const FoodDeliveryOrder = require('../models/FoodDeliveryOrder');

class NotificationService {
  /**
   * Create and send notification
   */
  static async createNotification(
    notificationType,
    title,
    body,
    recipientIds = {},
    orderId = null,
    data = {},
    channels = ['push']
  ) {
    try {
      const notification = new Notification({
        notificationType,
        title,
        body,
        orderId,
        data: {
          orderId,
          ...data,
        },
      });

      // Add channels
      channels.forEach((channel) => {
        let details = {};

        if (channel === 'push' && recipientIds.deviceToken) {
          details = { deviceToken: recipientIds.deviceToken };
        } else if (channel === 'sms' && recipientIds.phone) {
          details = { phoneNumber: recipientIds.phone };
        } else if (channel === 'email' && recipientIds.email) {
          details = { email: recipientIds.email };
        }

        notification.addChannel(channel, details);
      });

      // Set recipient
      if (recipientIds.userId) {
        notification.userId = recipientIds.userId;
      } else if (recipientIds.deliveryPersonId) {
        notification.deliveryPersonId = recipientIds.deliveryPersonId;
      } else if (recipientIds.restaurantId) {
        notification.restaurantId = recipientIds.restaurantId;
      }

      await notification.save();

      // Send immediately if not scheduled
      if (!notification.scheduledFor) {
        await this._sendNotification(notification);
      }

      return notification;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send order confirmation notification
   */
  static async sendOrderConfirmation(orderId, userDetails) {
    try {
      const order = await FoodDeliveryOrder.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      return await this.createNotification(
        'order_confirmed',
        'Order Confirmed! 🎉',
        `Your order from ${order.restaurantName} has been confirmed. Order ID: ${order.orderId}`,
        {
          userId: order.userId,
          deviceToken: userDetails.deviceToken,
          phone: userDetails.phone,
        },
        orderId,
        {
          screen: 'order_tracking',
          action: 'view_order',
        },
        ['push', 'sms']
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send order status update
   */
  static async sendOrderStatusUpdate(orderId, status, userDetails) {
    try {
      const order = await FoodDeliveryOrder.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const statusMessages = {
        confirmed: {
          title: 'Order Confirmed ✓',
          body: 'Your order has been confirmed by the restaurant',
        },
        preparing: {
          title: 'Order Being Prepared 👨‍🍳',
          body: 'Your order is being prepared in the restaurant',
        },
        ready: {
          title: 'Order Ready! 📦',
          body: 'Your order is ready and waiting for pickup',
        },
        out_for_delivery: {
          title: 'Order On The Way 🚴',
          body: 'Your delivery person is on the way with your order',
        },
        delivered: {
          title: 'Order Delivered ✅',
          body: 'Your order has been delivered. Thank you!',
        },
        cancelled: {
          title: 'Order Cancelled ❌',
          body: 'Your order has been cancelled',
        },
      };

      const message = statusMessages[status] || {
        title: 'Order Update',
        body: `Your order status: ${status}`,
      };

      return await this.createNotification(
        'order_preparing' + (status === 'preparing' ? '' : '_' + status),
        message.title,
        message.body,
        {
          userId: order.userId,
          deviceToken: userDetails.deviceToken,
          phone: userDetails.phone,
        },
        orderId,
        {
          screen: 'order_tracking',
          previousStatus: order.status,
          newStatus: status,
        },
        ['push', 'sms']
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send rider assigned notification
   */
  static async sendRiderAssignedNotification(orderId, riderDetails, userDetails) {
    try {
      const order = await FoodDeliveryOrder.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      return await this.createNotification(
        'rider_assigned',
        'Rider Assigned 🏍️',
        `${riderDetails.name} is on the way to pick up your order. Rating: ${riderDetails.rating}⭐`,
        {
          userId: order.userId,
          deviceToken: userDetails.deviceToken,
          phone: userDetails.phone,
        },
        orderId,
        {
          screen: 'order_tracking',
          action: 'view_order',
        },
        ['push']
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send delivery delay notification
   */
  static async sendDeliveryDelayNotification(orderId, delayMinutes, userDetails) {
    try {
      const order = await FoodDeliveryOrder.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      return await this.createNotification(
        'delivery_delayed',
        'Order Delayed ⏱️',
        `Your order will be delayed by approximately ${delayMinutes} minutes due to traffic.`,
        {
          userId: order.userId,
          deviceToken: userDetails.deviceToken,
          phone: userDetails.phone,
        },
        orderId,
        {
          screen: 'order_tracking',
          delayMinutes,
        },
        ['push', 'sms']
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send refund notification
   */
  static async sendRefundNotification(orderId, refundAmount, userDetails) {
    try {
      const order = await FoodDeliveryOrder.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      return await this.createNotification(
        'refund_processed',
        'Refund Processed ✅',
        `₹${refundAmount} has been refunded to your wallet for cancelled order ${order.orderId}`,
        {
          userId: order.userId,
          deviceToken: userDetails.deviceToken,
          email: userDetails.email,
        },
        orderId,
        {
          screen: 'order_details',
          refundAmount,
        },
        ['push', 'email']
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send promotional notification
   */
  static async sendPromotionalNotification(userId, title, body, promoCode, userDetails) {
    try {
      return await this.createNotification(
        'promotional',
        title,
        body,
        {
          userId,
          deviceToken: userDetails.deviceToken,
        },
        null,
        {
          promoCode,
          discount: promoCode, // code contains discount info
        },
        ['push']
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send new message notification
   */
  static async sendMessageNotification(orderId, senderName, messagePreview, recipientDetails) {
    try {
      return await this.createNotification(
        'new_message',
        `New Message from ${senderName}`,
        messagePreview,
        {
          userId: recipientDetails.userId || recipientDetails.deliveryPersonId,
          deviceToken: recipientDetails.deviceToken,
        },
        orderId,
        {
          screen: 'chat',
          action: 'open_chat',
        },
        ['push']
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send incoming call notification
   */
  static async sendIncomingCallNotification(orderId, callerName, recipientDetails) {
    try {
      return await this.createNotification(
        'call_incoming',
        `Call from ${callerName}`,
        'You have an incoming call',
        {
          userId: recipientDetails.userId || recipientDetails.deliveryPersonId,
          deviceToken: recipientDetails.deviceToken,
        },
        orderId,
        {
          screen: 'chat',
          action: 'accept_call',
        },
        ['push']
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(userId, limit = 20, skip = 0) {
    try {
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return notifications;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get unread notifications count
   */
  static async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        userId,
        isRead: false,
      });

      return count;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      notification.markAsRead();
      await notification.save();

      return notification;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId) {
    try {
      await Notification.findByIdAndDelete(notificationId);
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  static async getPreferences(userId) {
    try {
      // This would typically come from a User profile
      // For now, return defaults
      return {
        muteNotifications: false,
        doNotDisturb: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
        },
        notificationSettings: {
          orderUpdates: true,
          deliveryUpdates: true,
          messages: true,
          promotions: true,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(userId, preferences) {
    try {
      // This would update user profile
      // For now, just validate and return
      return preferences;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  static async sendBulkNotification(userIds, notificationType, title, body, data = {}) {
    try {
      const notifications = await Promise.all(
        userIds.map((userId) =>
          this.createNotification(
            notificationType,
            title,
            body,
            { userId },
            null,
            data,
            ['push']
          )
        )
      );

      return notifications;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retry failed notifications
   */
  static async retryFailedNotifications() {
    try {
      const failedNotifications = await Notification.find({
        status: 'failed',
        nextRetryAt: { $lte: new Date() },
      });

      for (const notification of failedNotifications) {
        if (notification.shouldRetry()) {
          await this._sendNotification(notification);
        }
      }

      return failedNotifications.length;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Internal: Send notification via configured channels
   */
  static async _sendNotification(notification) {
    try {
      if (!notification.channels) return;

      for (const channel of notification.channels) {
        try {
          if (channel.type === 'push') {
            // Integration with Firebase Cloud Messaging (FCM) or similar
            // await sendPushNotification(channel.deviceToken, notification);
            notification.markChannelSent('push');
            notification.markChannelDelivered('push');
          } else if (channel.type === 'sms') {
            // Integration with SMS provider (Twilio, AWS SNS, etc.)
            // await sendSMS(channel.phoneNumber, notification.body);
            notification.markChannelSent('sms');
            notification.markChannelDelivered('sms');
          } else if (channel.type === 'email') {
            // Integration with email provider (SendGrid, AWS SES, etc.)
            // await sendEmail(channel.email, notification.title, notification.body);
            notification.markChannelSent('email');
            notification.markChannelDelivered('email');
          }
        } catch (error) {
          notification.markChannelFailed(channel.type, error.message);
        }
      }

      notification.status = 'sent';
      await notification.save();

      return notification;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get notification analytics (for admin)
   */
  static async getAnalytics(startDate, endDate) {
    try {
      const analytics = await Notification.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: '$notificationType',
            totalSent: { $sum: 1 },
            delivered: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
            },
            read: {
              $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
          },
        },
      ]);

      return analytics;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = NotificationService;
