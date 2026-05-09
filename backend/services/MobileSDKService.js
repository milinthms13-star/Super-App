/**
 * MobileSDKService.js
 * Mobile app integration, push notifications, offline sync
 */

const logger = require('../config/logger');

class MobileSDKService {
  /**
   * Register mobile device
   */
  static async registerDevice(userId, deviceData) {
    try {
      const User = require('../models/User');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      if (!user.deviceTokens) {
        user.deviceTokens = [];
      }

      const existingDevice = user.deviceTokens.find(
        d => d.deviceId === deviceData.deviceId
      );

      if (!existingDevice) {
        user.deviceTokens.push({
          deviceId: deviceData.deviceId,
          pushToken: deviceData.pushToken,
          platform: deviceData.platform, // ios, android, web
          appVersion: deviceData.appVersion,
          osVersion: deviceData.osVersion,
          registeredAt: new Date(),
        });
      }

      await user.save();

      logger.info(`Device registered for user ${userId}`);

      return {
        success: true,
        message: 'Device registered',
      };
    } catch (error) {
      logger.error('Error registering device:', error);
      throw error;
    }
  }

  /**
   * Send push notification
   */
  static async sendPushNotification(userId, notification) {
    try {
      const User = require('../models/User');

      const user = await User.findById(userId);
      if (!user || !user.deviceTokens) throw new Error('User not found');

      // Mock push notification sending
      const results = user.deviceTokens.map(device => ({
        deviceId: device.deviceId,
        platform: device.platform,
        status: 'sent',
        timestamp: new Date(),
      }));

      logger.info(`Push notifications sent to ${results.length} devices for user ${userId}`);

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      logger.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Get mobile app configuration
   */
  static async getMobileAppConfig(appVersion) {
    try {
      const config = {
        appVersion,
        apiEndpoint: process.env.API_URL || 'https://api.malabarbazaar.com',
        wsEndpoint: process.env.WS_URL || 'wss://ws.malabarbazaar.com',
        features: {
          offlineMode: true,
          pushNotifications: true,
          biometric: true,
          darkMode: true,
        },
        cache: {
          productTTL: 3600,
          cartTTL: 86400,
          userTTL: 1800,
        },
        updateRequired: this._isUpdateRequired(appVersion),
      };

      return config;
    } catch (error) {
      logger.error('Error getting app config:', error);
      throw error;
    }
  }

  /**
   * Sync offline changes
   */
  static async syncOfflineData(userId, offlineData) {
    try {
      const Cart = require('../models/Cart');
      const Order = require('../models/Order');

      let syncResult = {
        cartItems: 0,
        orders: 0,
        conflicts: [],
      };

      // Sync cart items
      if (offlineData.cartItems?.length > 0) {
        for (const item of offlineData.cartItems) {
          await Cart.updateOne(
            { userId, 'items.productId': item.productId },
            { $set: { 'items.$.quantity': item.quantity } },
            { upsert: true }
          );
          syncResult.cartItems++;
        }
      }

      // Sync orders
      if (offlineData.orders?.length > 0) {
        for (const order of offlineData.orders) {
          const existing = await Order.findOne({ offlineId: order.offlineId });
          if (existing) {
            syncResult.conflicts.push(order.offlineId);
          } else {
            const newOrder = new Order({
              userId,
              items: order.items,
              totalAmount: order.totalAmount,
              offlineId: order.offlineId,
              syncedAt: new Date(),
            });
            await newOrder.save();
            syncResult.orders++;
          }
        }
      }

      logger.info(`Offline data synced for user ${userId}`);

      return {
        success: true,
        syncResult,
      };
    } catch (error) {
      logger.error('Error syncing offline data:', error);
      throw error;
    }
  }

  /**
   * Get app updates
   */
  static async checkForAppUpdates(currentVersion, platform) {
    try {
      const latestVersions = {
        ios: '2.5.0',
        android: '2.5.0',
        web: '2.5.0',
      };

      const latestVersion = latestVersions[platform] || latestVersions.web;

      const needsUpdate = this._compareVersions(currentVersion, latestVersion) < 0;

      return {
        currentVersion,
        latestVersion,
        updateAvailable: needsUpdate,
        releaseNotes: 'Bug fixes and performance improvements',
        downloadUrl: `${process.env.CDN_URL}/apps/${platform}-${latestVersion}.apk`,
      };
    } catch (error) {
      logger.error('Error checking for updates:', error);
      throw error;
    }
  }

  /**
   * Track app analytics
   */
  static async trackAnalytics(userId, eventData) {
    try {
      const AppAnalytics = require('../models/AppAnalytics');

      const analytics = new AppAnalytics({
        userId,
        eventType: eventData.eventType,
        screen: eventData.screen,
        metadata: eventData.metadata || {},
        deviceInfo: eventData.deviceInfo,
        timestamp: new Date(),
      });

      await analytics.save();

      logger.info(`App analytics tracked: ${eventData.eventType}`);

      return { success: true };
    } catch (error) {
      logger.error('Error tracking analytics:', error);
      throw error;
    }
  }

  /**
   * Check if update required
   */
  static _isUpdateRequired(appVersion) {
    // Mock version checking
    const requiredVersion = '2.4.0';
    return this._compareVersions(appVersion, requiredVersion) < 0;
  }

  /**
   * Compare versions
   */
  static _compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }
}

module.exports = MobileSDKService;
