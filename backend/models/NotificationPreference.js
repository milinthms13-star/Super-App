/**
 * Notification Preference Model
 * User preferences for email, SMS, WhatsApp, push notifications
 */

const mongoose = require('mongoose');

const NotificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true,
      index: true,
    },
    email: {
      enabled: { type: Boolean, default: true },
      newMatch: { type: Boolean, default: true },
      interestReceived: { type: Boolean, default: true },
      interestAccepted: { type: Boolean, default: true },
      messageReceived: { type: Boolean, default: true },
      profileViewed: { type: Boolean, default: false },
      dailyDigest: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
    },
    sms: {
      enabled: { type: Boolean, default: true },
      interestReceived: { type: Boolean, default: true },
      interestAccepted: { type: Boolean, default: true },
      messageReceived: { type: Boolean, default: true },
      importantUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
    },
    whatsapp: {
      enabled: { type: Boolean, default: true },
      newMatch: { type: Boolean, default: true },
      interestReceived: { type: Boolean, default: true },
      interestAccepted: { type: Boolean, default: true },
      messageReceived: { type: Boolean, default: false },
      dailyDigest: { type: Boolean, default: false },
      promotions: { type: Boolean, default: false },
    },
    push: {
      enabled: { type: Boolean, default: true },
      newMatch: { type: Boolean, default: true },
      interestReceived: { type: Boolean, default: true },
      interestAccepted: { type: Boolean, default: true },
      messageReceived: { type: Boolean, default: true },
      profileViewed: { type: Boolean, default: true },
    },
    inApp: {
      enabled: { type: Boolean, default: true },
      all: { type: Boolean, default: true },
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: '22:00' }, // HH:mm format
      endTime: { type: String, default: '08:00' },
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
  },
  {
    timestamps: true,
    collection: 'matrimonial_notification_preferences',
  }
);

module.exports = mongoose.model('NotificationPreference', NotificationPreferenceSchema);
