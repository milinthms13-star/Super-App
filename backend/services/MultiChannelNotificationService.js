/**
 * MultiChannelNotificationService.js
 * Handles notifications across multiple channels: Email, SMS, WhatsApp, Push
 */

const logger = require('../config/logger');
const EmailNotificationService = require('./EmailNotificationService');

class MultiChannelNotificationService {
  /**
   * Send notification through multiple channels
   */
  static async sendMultiChannelNotification(userId, notification) {
    try {
      const { title, message, type, channels, data } = notification;
      const User = require('../models/User');

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const userPreferences = user.preferences?.notificationPreferences || {};
      const results = {};

      // Send via Email
      if (channels.includes('email') && userPreferences.emailNotifications !== false) {
        results.email = await this._sendEmailNotification(
          user.email,
          title,
          message,
          data
        );
      }

      // Send via SMS
      if (channels.includes('sms') && userPreferences.smsNotifications !== false && user.phoneNumber) {
        results.sms = await this._sendSmsNotification(
          user.phoneNumber,
          message
        );
      }

      // Send via WhatsApp
      if (channels.includes('whatsapp') && userPreferences.whatsappNotifications !== false && user.phoneNumber) {
        results.whatsapp = await this._sendWhatsAppNotification(
          user.phoneNumber,
          title,
          message,
          data
        );
      }

      // Send via Push Notification
      if (channels.includes('push') && userPreferences.pushNotifications !== false) {
        results.push = await this._sendPushNotification(
          userId,
          title,
          message,
          data
        );
      }

      // Store notification in database
      await this._storeNotification(userId, {
        title,
        message,
        type,
        channels: Object.keys(results),
        data,
        sentAt: new Date(),
      });

      logger.info(`Multi-channel notification sent to user ${userId}`, results);
      return results;
    } catch (error) {
      logger.error('Error sending multi-channel notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  static async _sendEmailNotification(email, title, message, data) {
    try {
      await EmailNotificationService.sendNotificationEmail(
        email,
        title,
        message,
        data
      );
      return { success: true, channel: 'email' };
    } catch (error) {
      logger.error(`Email notification failed for ${email}:`, error);
      return { success: false, channel: 'email', error: error.message };
    }
  }

  /**
   * Send SMS notification
   */
  static async _sendSmsNotification(phoneNumber, message) {
    try {
      // Integration with SMS provider (Twilio, AWS SNS, etc.)
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const smsMessage = await client.messages.create({
        body: message.substring(0, 160),
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });

      logger.info(`SMS notification sent: ${smsMessage.sid}`);
      return { success: true, channel: 'sms', messageId: smsMessage.sid };
    } catch (error) {
      logger.error(`SMS notification failed for ${phoneNumber}:`, error);
      return { success: false, channel: 'sms', error: error.message };
    }
  }

  /**
   * Send WhatsApp notification
   */
  static async _sendWhatsAppNotification(phoneNumber, title, message, data) {
    try {
      // Integration with WhatsApp Business API (Twilio, MessageBird, etc.)
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const whatsappMessage = await client.messages.create({
        body: `*${title}*\n${message}`,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${phoneNumber}`,
      });

      logger.info(`WhatsApp notification sent: ${whatsappMessage.sid}`);
      return { success: true, channel: 'whatsapp', messageId: whatsappMessage.sid };
    } catch (error) {
      logger.error(`WhatsApp notification failed for ${phoneNumber}:`, error);
      return { success: false, channel: 'whatsapp', error: error.message };
    }
  }

  /**
   * Send push notification
   */
  static async _sendPushNotification(userId, title, message, data) {
    try {
      const PushSubscription = require('../models/PushSubscription');
      const subscriptions = await PushSubscription.find({ userId, active: true });

      if (subscriptions.length === 0) {
        return { success: false, channel: 'push', error: 'No active push subscriptions' };
      }

      // Use Firebase Cloud Messaging or Web Push API
      const admin = require('firebase-admin');

      const tokens = subscriptions.map(s => s.deviceToken);
      const payload = {
        notification: {
          title,
          body: message,
        },
        data: data || {},
      };

      const response = await admin.messaging().sendMulticast({
        tokens,
        notification: payload.notification,
        data: payload.data,
      });

      logger.info(`Push notifications sent: ${response.successCount} success`);
      return {
        success: true,
        channel: 'push',
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      logger.error(`Push notification failed for user ${userId}:`, error);
      return { success: false, channel: 'push', error: error.message };
    }
  }

  /**
   * Store notification in database
   */
  static async _storeNotification(userId, notificationData) {
    try {
      const Notification = require('../models/Notification');
      const notification = new Notification({
        userId,
        ...notificationData,
      });
      await notification.save();
    } catch (error) {
      logger.error('Error storing notification:', error);
    }
  }

  /**
   * Get user notification preferences
   */
  static async getNotificationPreferences(userId) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);

      return user?.preferences?.notificationPreferences || {
        emailNotifications: true,
        smsNotifications: true,
        whatsappNotifications: true,
        pushNotifications: true,
        orderNotifications: true,
        promotionalNotifications: true,
        accountNotifications: true,
      };
    } catch (error) {
      logger.error('Error getting notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  static async updateNotificationPreferences(userId, preferences) {
    try {
      const User = require('../models/User');
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: { 'preferences.notificationPreferences': preferences },
        },
        { new: true }
      );

      logger.info(`Updated notification preferences for user ${userId}`);
      return user.preferences.notificationPreferences;
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Send promotional notification to user segment
   */
  static async sendBulkNotification(userIds, notification) {
    try {
      const results = [];

      for (const userId of userIds) {
        try {
          const result = await this.sendMultiChannelNotification(
            userId,
            notification
          );
          results.push({ userId, result });
        } catch (error) {
          logger.error(`Failed to send notification to user ${userId}:`, error);
          results.push({ userId, error: error.message });
        }
      }

      logger.info(`Bulk notification sent to ${userIds.length} users`);
      return results;
    } catch (error) {
      logger.error('Error sending bulk notification:', error);
      throw error;
    }
  }

  /**
   * Register push notification subscription
   */
  static async registerPushSubscription(userId, subscription) {
    try {
      const PushSubscription = require('../models/PushSubscription');

      const existingSubscription = await PushSubscription.findOne({
        userId,
        deviceToken: subscription.deviceToken,
      });

      if (existingSubscription) {
        return existingSubscription;
      }

      const pushSubscription = new PushSubscription({
        userId,
        ...subscription,
        active: true,
        createdAt: new Date(),
      });

      await pushSubscription.save();
      logger.info(`Registered push subscription for user ${userId}`);
      return pushSubscription;
    } catch (error) {
      logger.error('Error registering push subscription:', error);
      throw error;
    }
  }

  /**
   * Send automated call notification
   */
  static async _sendAutomatedCallNotification(phoneNumber, message) {
    try {
      // Integration with Twilio or similar service
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const call = await client.calls.create({
        twiml: `<Response><Say>${message}</Say></Response>`,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
      });

      logger.info(`Automated call sent: ${call.sid}`);
      return { success: true, channel: 'call', callId: call.sid };
    } catch (error) {
      logger.error(`Automated call failed for ${phoneNumber}:`, error);
      return { success: false, channel: 'call', error: error.message };
    }
  }
}

module.exports = MultiChannelNotificationService;
