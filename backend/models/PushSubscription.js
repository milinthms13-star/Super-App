/**
 * PushSubscription.js
 * Mongoose schema for push notification subscriptions
 */

const mongoose = require('mongoose');

const PushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceToken: {
      type: String,
      required: true,
    },
    deviceName: {
      type: String,
      default: '',
    },
    subscription: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient lookups
PushSubscriptionSchema.index({ userId: 1, deviceToken: 1 }, { unique: true });
PushSubscriptionSchema.index({ userId: 1, active: 1 });

module.exports = mongoose.model('PushSubscription', PushSubscriptionSchema);
