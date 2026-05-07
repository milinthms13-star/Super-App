const mongoose = require('mongoose');

/**
 * ChannelSubscription Schema
 * Tracks user subscriptions to channels
 */
const channelSubscriptionSchema = new mongoose.Schema(
  {
    // Channel and user
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Subscription status
    isSubscribed: {
      type: Boolean,
      default: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
      default: null,
    },

    // Notification preferences
    notificationLevel: {
      type: String,
      enum: ['all', 'mentions', 'important', 'none'],
      default: 'all',
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    mutedUntil: {
      type: Date,
      default: null,
    },

    // Activity tracking
    lastReadAt: {
      type: Date,
      default: null,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },

    // Display preferences
    favorited: {
      type: Boolean,
      default: false,
    },
    pinnedPosition: {
      type: Number,
      default: null,
    },

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'channel_subscriptions',
  }
);

// Unique index: one subscription per user per channel
channelSubscriptionSchema.index(
  { channelId: 1, userId: 1 },
  { unique: true }
);
channelSubscriptionSchema.index({ userId: 1, isSubscribed: 1 });
channelSubscriptionSchema.index({ channelId: 1, isSubscribed: 1 });
channelSubscriptionSchema.index({ favorited: 1, userId: 1 });

// Methods
channelSubscriptionSchema.methods.mute = async function (durationMs = null) {
  this.isMuted = true;
  if (durationMs) {
    this.mutedUntil = new Date(Date.now() + durationMs);
  }
  return this.save();
};

channelSubscriptionSchema.methods.unmute = async function () {
  this.isMuted = false;
  this.mutedUntil = null;
  return this.save();
};

channelSubscriptionSchema.methods.unsubscribe = async function () {
  this.isSubscribed = false;
  this.unsubscribedAt = new Date();
  return this.save();
};

channelSubscriptionSchema.methods.resubscribe = async function () {
  this.isSubscribed = true;
  this.unsubscribedAt = null;
  this.unreadCount = 0;
  return this.save();
};

channelSubscriptionSchema.methods.markAllRead = async function () {
  this.lastReadAt = new Date();
  this.unreadCount = 0;
  return this.save();
};

module.exports = mongoose.model('ChannelSubscription', channelSubscriptionSchema);
