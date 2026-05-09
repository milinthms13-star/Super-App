/**
 * PreferencesService.js
 * Manages user preferences for notifications, privacy, display, and shopping
 */

const UserPreferences = require('../models/UserPreferences');

class PreferencesService {
  static instance;

  constructor() {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new PreferencesService();
    }
    return this.instance;
  }

  // Get or create preferences
  async getPreferences(userId) {
    let preferences = await UserPreferences.findOne({ userId });

    if (!preferences) {
      preferences = await UserPreferences.create({ userId });
    }

    return preferences;
  }

  // Update preferences
  async updatePreferences(userId, preferencesData) {
    let preferences = await this.getPreferences(userId);

    // Deep merge nested objects
    Object.keys(preferencesData).forEach((key) => {
      if (typeof preferencesData[key] === 'object' && !Array.isArray(preferencesData[key])) {
        preferences[key] = {
          ...preferences[key],
          ...preferencesData[key]
        };
      } else {
        preferences[key] = preferencesData[key];
      }
    });

    preferences.lastUpdatedAt = new Date();
    await preferences.save();

    return preferences;
  }

  // Get notification preferences
  async getNotificationPreferences(userId) {
    const preferences = await UserPreferences.getNotificationPreferences(userId);
    return {
      notifications: preferences.notifications,
      notificationChannels: preferences.notificationChannels,
      smsPreferences: preferences.smsPreferences,
      emailFrequency: preferences.emailFrequency
    };
  }

  // Update notification preferences
  async updateNotificationPreferences(userId, notificationData) {
    const preferences = await this.getPreferences(userId);

    if (notificationData.notifications) {
      preferences.notifications = {
        ...preferences.notifications,
        ...notificationData.notifications
      };
    }

    if (notificationData.notificationChannels) {
      preferences.notificationChannels = {
        ...preferences.notificationChannels,
        ...notificationData.notificationChannels
      };
    }

    if (notificationData.smsPreferences) {
      preferences.smsPreferences = {
        ...preferences.smsPreferences,
        ...notificationData.smsPreferences
      };
    }

    if (notificationData.emailFrequency) {
      preferences.emailFrequency = notificationData.emailFrequency;
    }

    preferences.lastUpdatedAt = new Date();
    await preferences.save();

    return preferences;
  }

  // Disable notification type
  async disableNotification(userId, notificationType, channel = null) {
    const preferences = await this.getPreferences(userId);
    await preferences.disallNotification(notificationType, channel);
    return preferences;
  }

  // Enable notification type
  async enableNotification(userId, notificationType, channel = null) {
    const preferences = await this.getPreferences(userId);
    await preferences.enableNotification(notificationType, channel);
    return preferences;
  }

  // Check if should send notification
  async shouldSendNotification(userId, notificationType, channel = 'email') {
    const preferences = await this.getPreferences(userId);
    return preferences.shouldSendNotification(notificationType, channel);
  }

  // Get privacy preferences
  async getPrivacyPreferences(userId) {
    const preferences = await this.getPreferences(userId);
    return preferences.privacy;
  }

  // Update privacy preferences
  async updatePrivacyPreferences(userId, privacyData) {
    const preferences = await this.getPreferences(userId);
    preferences.privacy = { ...preferences.privacy, ...privacyData };
    preferences.lastUpdatedAt = new Date();
    await preferences.save();
    return preferences.privacy;
  }

  // Get shopping preferences
  async getShoppingPreferences(userId) {
    const preferences = await this.getPreferences(userId);
    return preferences.shopping;
  }

  // Update shopping preferences
  async updateShoppingPreferences(userId, shoppingData) {
    const preferences = await this.getPreferences(userId);
    preferences.shopping = { ...preferences.shopping, ...shoppingData };
    preferences.lastUpdatedAt = new Date();
    await preferences.save();
    return preferences.shopping;
  }

  // Add preferred brand
  async addPreferredBrand(userId, brandId) {
    const preferences = await this.getPreferences(userId);
    await preferences.addPreferredBrand(brandId);
    return preferences.shopping.preferredBrands;
  }

  // Remove preferred brand
  async removePreferredBrand(userId, brandId) {
    const preferences = await this.getPreferences(userId);
    await preferences.removePreferredBrand(brandId);
    return preferences.shopping.preferredBrands;
  }

  // Block seller
  async blockSeller(userId, sellerId) {
    const preferences = await this.getPreferences(userId);
    await preferences.blockSeller(sellerId);
    return preferences.shopping.blockedSellers;
  }

  // Unblock seller
  async unblockSeller(userId, sellerId) {
    const preferences = await this.getPreferences(userId);
    await preferences.unblockSeller(sellerId);
    return preferences.shopping.blockedSellers;
  }

  // Get display preferences
  async getDisplayPreferences(userId) {
    const preferences = await this.getPreferences(userId);
    return preferences.display;
  }

  // Update display preferences
  async updateDisplayPreferences(userId, displayData) {
    const preferences = await this.getPreferences(userId);
    preferences.display = { ...preferences.display, ...displayData };
    preferences.lastUpdatedAt = new Date();
    await preferences.save();
    return preferences.display;
  }

  // Give consent
  async giveConsent(userId, consentType) {
    const preferences = await this.getPreferences(userId);
    await preferences.giveConsent(consentType);
    return preferences.consentGiven;
  }

  // Revoke consent
  async revokeConsent(userId, consentType) {
    const preferences = await this.getPreferences(userId);
    await preferences.revokeConsent(consentType);
    return preferences.consentGiven;
  }

  // Get all preferences
  async getAllPreferences(userId) {
    return this.getPreferences(userId);
  }

  // Reset to defaults
  async resetToDefaults(userId) {
    const preferences = await this.getPreferences(userId);

    // Reset to model defaults
    const defaultPreferences = new UserPreferences({ userId });
    await UserPreferences.deleteOne({ userId });

    return await this.getPreferences(userId);
  }

  // Batch update multiple users (admin function)
  async batchUpdatePreferences(userIds, preferencesData) {
    const result = await UserPreferences.updateMany(
      { userId: { $in: userIds } },
      { $set: preferencesData, lastUpdatedAt: new Date() }
    );

    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    };
  }

  // Get users by notification preference (for sending campaigns)
  async getUsersByNotificationPreference(notificationType, channel = 'email', limit = 1000) {
    return UserPreferences.find(
      {
        [`notifications.${notificationType}`]: true,
        [`notificationChannels.${channel}`]: true,
        consentGiven: { [notificationType]: true }
      },
      { userId: 1 }
    )
      .limit(limit)
      .lean();
  }
}

module.exports = PreferencesService.getInstance();
