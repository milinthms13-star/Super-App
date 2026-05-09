/**
 * NotificationsService.js
 * Purpose: Real-time notifications engine, in-app messaging, delivery tracking
 * Phase 15 - Real-time Communications
 */

const db = require('../../config/database');

class NotificationsService {

  /**
   * Send Notification
   * Multi-channel notification delivery (in-app, email, SMS, push)
   */
  static async sendNotification(notificationData) {
    try {
      const {
        userId,
        title,
        body,
        type,
        priority = 'normal',
        channels = ['in_app', 'push'],
        data = {},
        scheduledFor = null
      } = notificationData;
      
      const notification = {
        userId,
        title,
        body,
        type, // ride_update, offer, promo, system, support
        priority, // low, normal, high, urgent
        channels,
        data,
        status: scheduledFor ? 'scheduled' : 'sent',
        read: false,
        createdAt: new Date(),
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        sentAt: scheduledFor ? null : new Date(),
        deliveryStatus: {
          in_app: channels.includes('in_app') ? 'delivered' : null,
          push: channels.includes('push') ? 'pending' : null,
          email: channels.includes('email') ? 'pending' : null,
          sms: channels.includes('sms') ? 'pending' : null
        }
      };
      
      const result = await db.collection('notifications').insertOne(notification);
      
      // Async delivery to all channels
      this._deliverToChannels(notification, result.insertedId);
      
      return {
        success: true,
        message: 'Notification queued for delivery',
        data: {
          notificationId: result.insertedId,
          status: notification.status,
          channels: channels
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error sending notification: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Get User Notifications
   * Paginated notification inbox
   */
  static async getUserNotifications(userId, page = 1, limit = 20, filter = 'all') {
    try {
      const skip = (page - 1) * limit;
      const matchStage = { userId };
      
      if (filter === 'unread') {
        matchStage.read = false;
      } else if (filter === 'archived') {
        matchStage.archived = true;
      }
      
      const notifications = await db.collection('notifications')
        .find(matchStage)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      const total = await db.collection('notifications').countDocuments(matchStage);
      const unreadCount = await db.collection('notifications').countDocuments({ userId, read: false });
      
      return {
        success: true,
        message: 'Notifications retrieved',
        data: {
          notifications: notifications.map(n => ({
            id: n._id,
            title: n.title,
            body: n.body,
            type: n.type,
            priority: n.priority,
            read: n.read,
            createdAt: n.createdAt,
            data: n.data
          })),
          pagination: {
            page,
            limit,
            total,
            unread_count: unreadCount
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching notifications: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Mark Notification as Read
   */
  static async markAsRead(notificationId, userId) {
    try {
      const result = await db.collection('notifications').updateOne(
        { _id: notificationId, userId },
        { $set: { read: true, readAt: new Date() } }
      );
      
      if (result.matchedCount === 0) {
        return {
          success: false,
          message: 'Notification not found',
          data: null
        };
      }
      
      return {
        success: true,
        message: 'Notification marked as read',
        data: { notificationId }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error marking notification: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Mark All Notifications as Read
   */
  static async markAllAsRead(userId) {
    try {
      const result = await db.collection('notifications').updateMany(
        { userId, read: false },
        { $set: { read: true, readAt: new Date() } }
      );
      
      return {
        success: true,
        message: 'All notifications marked as read',
        data: {
          updated_count: result.modifiedCount
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error marking all notifications: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Send In-App Message
   * Direct messaging between users/platform
   */
  static async sendMessage(messageData) {
    try {
      const {
        fromUserId,
        toUserId,
        conversationId,
        messageText,
        messageType = 'text', // text, system, offer
        attachments = []
      } = messageData;
      
      // Create or get conversation
      let conversation = await db.collection('conversations').findOne({
        participants: { $all: [fromUserId, toUserId] }
      });
      
      if (!conversation && !conversationId) {
        const convResult = await db.collection('conversations').insertOne({
          participants: [fromUserId, toUserId],
          createdAt: new Date(),
          updatedAt: new Date()
        });
        conversation = { _id: convResult.insertedId };
      }
      
      const message = {
        conversationId: conversation?._id || conversationId,
        fromUserId,
        toUserId,
        messageText,
        messageType,
        attachments,
        read: false,
        delivered: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('messages').insertOne(message);
      
      // Update conversation timestamp
      await db.collection('conversations').updateOne(
        { _id: message.conversationId },
        { $set: { updatedAt: new Date() } }
      );
      
      return {
        success: true,
        message: 'Message sent',
        data: {
          messageId: result.insertedId,
          conversationId: message.conversationId,
          status: 'sent'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error sending message: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Get Conversation Thread
   * Messages in a conversation
   */
  static async getConversation(conversationId, userId, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      
      const messages = await db.collection('messages')
        .find({
          conversationId,
          $or: [
            { fromUserId: userId },
            { toUserId: userId }
          ]
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      const total = await db.collection('messages').countDocuments({ conversationId });
      
      // Mark messages as read
      await db.collection('messages').updateMany(
        {
          conversationId,
          toUserId: userId,
          read: false
        },
        {
          $set: { read: true, readAt: new Date() }
        }
      );
      
      return {
        success: true,
        message: 'Conversation retrieved',
        data: {
          messages: messages.map(m => ({
            id: m._id,
            from: m.fromUserId,
            to: m.toUserId,
            text: m.messageText,
            type: m.messageType,
            attachments: m.attachments,
            read: m.read,
            createdAt: m.createdAt
          })),
          pagination: {
            page,
            limit,
            total
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching conversation: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Get Conversations List
   * User's active conversations
   */
  static async getConversationsList(userId, limit = 20) {
    try {
      const conversations = await db.collection('conversations')
        .find({ participants: userId })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .toArray();
      
      // Get last message and unread count for each
      const conversationsWithMetadata = await Promise.all(
        conversations.map(async (conv) => {
          const lastMessage = await db.collection('messages')
            .findOne(
              { conversationId: conv._id },
              { sort: { createdAt: -1 } }
            );
          
          const unreadCount = await db.collection('messages').countDocuments({
            conversationId: conv._id,
            toUserId: userId,
            read: false
          });
          
          return {
            conversationId: conv._id,
            participants: conv.participants,
            lastMessage: lastMessage?.messageText || '',
            lastMessageTime: lastMessage?.createdAt,
            unreadCount
          };
        })
      );
      
      return {
        success: true,
        message: 'Conversations list retrieved',
        data: {
          conversations: conversationsWithMetadata
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching conversations: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Send Bulk Notifications
   * Broadcast to multiple users with filters
   */
  static async sendBulkNotification(bulkData) {
    try {
      const {
        title,
        body,
        type,
        targetSegment = 'all', // all, active, churned, premium, etc.
        channels = ['in_app', 'push'],
        data = {}
      } = bulkData;
      
      // Get target users
      let userFilter = {};
      if (targetSegment === 'active') {
        userFilter = { lastActiveAt: { $gte: new Date(Date.now() - 604800000) } };
      } else if (targetSegment === 'premium') {
        userFilter = { tier: 'platinum' };
      }
      
      const targetUsers = await db.collection('users')
        .find(userFilter)
        .project({ _id: 1 })
        .toArray();
      
      // Create notifications for each user
      const notifications = targetUsers.map(user => ({
        userId: user._id,
        title,
        body,
        type,
        priority: 'normal',
        channels,
        data,
        status: 'sent',
        read: false,
        createdAt: new Date(),
        deliveryStatus: {
          in_app: 'delivered',
          push: 'pending'
        }
      }));
      
      const result = await db.collection('notifications').insertMany(notifications);
      
      return {
        success: true,
        message: 'Bulk notification sent',
        data: {
          targeted_users: targetUsers.length,
          notifications_created: result.insertedIds.length,
          segment: targetSegment
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error sending bulk notification: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Get Notification Delivery Status
   * Track notification delivery across channels
   */
  static async getDeliveryStatus(notificationId) {
    try {
      const notification = await db.collection('notifications').findOne({ _id: notificationId });
      
      if (!notification) {
        return {
          success: false,
          message: 'Notification not found',
          data: null
        };
      }
      
      return {
        success: true,
        message: 'Delivery status retrieved',
        data: {
          notificationId,
          status: notification.status,
          delivery_breakdown: {
            in_app: notification.deliveryStatus.in_app,
            push: notification.deliveryStatus.push,
            email: notification.deliveryStatus.email,
            sms: notification.deliveryStatus.sms
          },
          sent_at: notification.sentAt,
          read_at: notification.readAt || null,
          read: notification.read
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting delivery status: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Get Notification Preferences
   * User's notification settings
   */
  static async getNotificationPreferences(userId) {
    try {
      let prefs = await db.collection('notification_preferences').findOne({ userId });
      
      if (!prefs) {
        prefs = {
          userId,
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
          in_app_notifications: true,
          ride_updates: true,
          promotions: true,
          safety_alerts: true,
          support_messages: true,
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00'
        };
        
        await db.collection('notification_preferences').insertOne(prefs);
      }
      
      return {
        success: true,
        message: 'Notification preferences retrieved',
        data: prefs
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching preferences: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Update Notification Preferences
   */
  static async updateNotificationPreferences(userId, preferences) {
    try {
      const result = await db.collection('notification_preferences').updateOne(
        { userId },
        { $set: preferences },
        { upsert: true }
      );
      
      return {
        success: true,
        message: 'Notification preferences updated',
        data: { preferences }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error updating preferences: ${error.message}`,
        data: null
      };
    }
  }

  // ===== HELPER METHODS =====

  static async _deliverToChannels(notification, notificationId) {
    // Async delivery - don't wait
    setImmediate(async () => {
      for (const channel of notification.channels) {
        try {
          if (channel === 'push') {
            // Send push notification via Firebase or similar
            await this._sendPushNotification(notification);
          } else if (channel === 'email') {
            // Send email
            await this._sendEmailNotification(notification);
          } else if (channel === 'sms') {
            // Send SMS
            await this._sendSMSNotification(notification);
          }
          
          // Update delivery status
          const updateField = `deliveryStatus.${channel}`;
          await db.collection('notifications').updateOne(
            { _id: notificationId },
            { $set: { [updateField]: 'delivered' } }
          );
        } catch (error) {
          console.error(`Error delivering ${channel} notification:`, error);
        }
      }
    });
  }

  static async _sendPushNotification(notification) {
    // Integration with Firebase Cloud Messaging or similar
    // Placeholder for actual implementation
    return true;
  }

  static async _sendEmailNotification(notification) {
    // Integration with email service
    // Placeholder for actual implementation
    return true;
  }

  static async _sendSMSNotification(notification) {
    // Integration with SMS service
    // Placeholder for actual implementation
    return true;
  }
}

module.exports = NotificationsService;
