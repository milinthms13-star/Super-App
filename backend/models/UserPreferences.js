/**
 * UserPreferences.js
 * User settings and preferences for notifications, privacy, language, theme
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserPreferencesSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    // Notification Preferences
    notifications: {
      orderConfirmation: { type: Boolean, default: true },
      orderShipped: { type: Boolean, default: true },
      orderDelivered: { type: Boolean, default: true },
      orderCancelled: { type: Boolean, default: true },
      orderReturned: { type: Boolean, default: true },
      paymentFailed: { type: Boolean, default: true },
      refund: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      newArrivals: { type: Boolean, default: true },
      flash_sale: { type: Boolean, default: true },
      personalized: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: true },
      reviews: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true }
    },
    notificationChannels: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
      inApp: { type: Boolean, default: true }
    },
    smsPreferences: {
      verificationCodes: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
      reviews: { type: Boolean, default: false }
    },
    emailFrequency: {
      type: String,
      enum: ['never', 'daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    // Privacy Preferences
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'friends_only', 'private'],
        default: 'private'
      },
      showReviews: { type: Boolean, default: true },
      showOrders: { type: Boolean, default: false },
      showFollowing: { type: Boolean, default: false },
      allowMessagesFromStrangers: { type: Boolean, default: false },
      allowDataSharing: { type: Boolean, default: false }
    },
    // Display Preferences
    display: {
      language: {
        type: String,
        enum: ['en', 'hi', 'es', 'fr', 'de', 'zh', 'ja'],
        default: 'en'
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata'
      },
      dateFormat: {
        type: String,
        enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
        default: 'DD/MM/YYYY'
      },
      timeFormat: {
        type: String,
        enum: ['12h', '24h'],
        default: '24h'
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto'
      },
      compactMode: { type: Boolean, default: false }
    },
    // Shopping Preferences
    shopping: {
      currency: {
        type: String,
        enum: ['INR', 'USD', 'EUR', 'GBP'],
        default: 'INR'
      },
      minPrice: { type: Number, default: 0 },
      maxPrice: { type: Number, default: 1000000 },
      preferredCategories: [String],
      preferredBrands: [String],
      preferredSellers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      blockedSellers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      autoApplyCoupons: { type: Boolean, default: true },
      saveForLater: { type: Boolean, default: true },
      trackPrice: { type: Boolean, default: true },
      wishlistNotifications: { type: Boolean, default: true }
    },
    // Payment Preferences
    payment: {
      preferredMethod: {
        type: String,
        enum: ['card', 'upi', 'wallet', 'netbanking', 'paypal', 'none'],
        default: 'none'
      },
      savePaymentMethods: { type: Boolean, default: false },
      oneClickCheckout: { type: Boolean, default: false },
      autoPaySubscriptions: { type: Boolean, default: false }
    },
    // Delivery Preferences
    delivery: {
      preferredDeliverySpeed: {
        type: String,
        enum: ['standard', 'express', 'priority'],
        default: 'standard'
      },
      preferredDeliveryTime: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'anytime'],
        default: 'anytime'
      },
      giftWrap: { type: Boolean, default: false },
      handoverPreference: {
        type: String,
        enum: ['hand_to_recipient', 'leave_at_door', 'no_preference'],
        default: 'no_preference'
      }
    },
    // Marketing Preferences
    marketing: {
      personalized: { type: Boolean, default: true },
      aiRecommendations: { type: Boolean, default: true },
      behavioralTracking: { type: Boolean, default: false },
      retargeting: { type: Boolean, default: false },
      researchParticipation: { type: Boolean, default: false }
    },
    // Social Preferences
    social: {
      allowFriendRequests: { type: Boolean, default: true },
      showInSearch: { type: Boolean, default: true },
      shareActivityFeed: { type: Boolean, default: false },
      allowComments: { type: Boolean, default: true },
      allowReviews: { type: Boolean, default: true }
    },
    // Security Preferences
    security: {
      twoFactorEnabled: { type: Boolean, default: false },
      loginAlerts: { type: Boolean, default: true },
      suspiciousActivityAlerts: { type: Boolean, default: true },
      deviceTrustRequired: { type: Boolean, default: false },
      sessionTimeout: {
        type: Number,
        default: 1800 // 30 minutes in seconds
      }
    },
    // Content Preferences
    content: {
      maturityRating: {
        type: String,
        enum: ['all', 'teen', 'adult'],
        default: 'all'
      },
      violenceContent: { type: Boolean, default: true },
      adultContent: { type: Boolean, default: false },
      explicitLanguage: { type: Boolean, default: true }
    },
    // Accessibility
    accessibility: {
      screenReader: { type: Boolean, default: false },
      highContrast: { type: Boolean, default: false },
      largeText: { type: Boolean, default: false },
      reduceMotion: { type: Boolean, default: false },
      captions: { type: Boolean, default: false }
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now
    },
    consentGiven: {
      marketing: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      thirdParty: { type: Boolean, default: false }
    },
    consentGivenAt: Date,
    consentVersion: String
  },
  { timestamps: true }
);

// Indexes
UserPreferencesSchema.index({ userId: 1 });
UserPreferencesSchema.index({ 'shopping.preferredCategories': 1 });
UserPreferencesSchema.index({ 'display.language': 1 });

// Methods
UserPreferencesSchema.methods.disallNotification = function (notificationType, channel = null) {
  if (channel) {
    this.notificationChannels[channel] = false;
  } else if (this.notifications[notificationType] !== undefined) {
    this.notifications[notificationType] = false;
  }
  return this.save();
};

UserPreferencesSchema.methods.enableNotification = function (notificationType, channel = null) {
  if (channel) {
    this.notificationChannels[channel] = true;
  } else if (this.notifications[notificationType] !== undefined) {
    this.notifications[notificationType] = true;
  }
  return this.save();
};

UserPreferencesSchema.methods.shouldSendNotification = function (notificationType, channel = 'email') {
  const notificationEnabled = this.notifications[notificationType];
  const channelEnabled = this.notificationChannels[channel];
  return notificationEnabled && channelEnabled;
};

UserPreferencesSchema.methods.addPreferredBrand = function (brandId) {
  if (!this.shopping.preferredBrands.includes(brandId)) {
    this.shopping.preferredBrands.push(brandId);
    return this.save();
  }
  return Promise.resolve(this);
};

UserPreferencesSchema.methods.removePreferredBrand = function (brandId) {
  this.shopping.preferredBrands = this.shopping.preferredBrands.filter(
    (b) => b.toString() !== brandId.toString()
  );
  return this.save();
};

UserPreferencesSchema.methods.blockSeller = function (sellerId) {
  if (!this.shopping.blockedSellers.includes(sellerId)) {
    this.shopping.blockedSellers.push(sellerId);
    return this.save();
  }
  return Promise.resolve(this);
};

UserPreferencesSchema.methods.unblockSeller = function (sellerId) {
  this.shopping.blockedSellers = this.shopping.blockedSellers.filter(
    (s) => s.toString() !== sellerId.toString()
  );
  return this.save();
};

UserPreferencesSchema.methods.giveConsent = function (consentType) {
  this.consentGiven[consentType] = true;
  this.consentGivenAt = new Date();
  return this.save();
};

UserPreferencesSchema.methods.revokeConsent = function (consentType) {
  this.consentGiven[consentType] = false;
  return this.save();
};

// Statics
UserPreferencesSchema.statics.findOrCreate = function (userId) {
  return this.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, new: true }
  );
};

UserPreferencesSchema.statics.getNotificationPreferences = function (userId) {
  return this.findOne(
    { userId },
    {
      notifications: 1,
      notificationChannels: 1,
      smsPreferences: 1,
      emailFrequency: 1
    }
  );
};

module.exports = mongoose.model('UserPreferences', UserPreferencesSchema);
