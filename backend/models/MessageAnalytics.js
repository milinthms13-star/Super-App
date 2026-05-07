const mongoose = require('mongoose');

/**
 * MessageAnalytics Schema
 * Stores platform-wide messaging statistics and trends
 * Purpose: Track messaging volume, user engagement, peak times, patterns
 * 
 * Indexed by: timestamp (for time-range queries)
 * TTL: 365 days (configurable for retention policies)
 */
const messageAnalyticsSchema = new mongoose.Schema(
  {
    // Time period
    date: {
      type: Date,
      required: true,
      index: true,
    },
    period: {
      type: String, // 'hourly', 'daily', 'weekly', 'monthly'
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
      required: true,
      index: true,
    },

    // Volume metrics
    totalMessages: {
      type: Number,
      default: 0,
    },
    totalUsers: {
      type: Number,
      default: 0,
    },
    activeUsers: {
      type: Number,
      default: 0,
    },
    newUsers: {
      type: Number,
      default: 0,
    },

    // Message breakdown
    messageTypes: {
      text: { type: Number, default: 0 },
      media: { type: Number, default: 0 },
      sticker: { type: Number, default: 0 },
      reaction: { type: Number, default: 0 },
      edit: { type: Number, default: 0 },
      delete: { type: Number, default: 0 },
    },

    // Engagement metrics
    averageResponseTime: {
      type: Number, // milliseconds
      default: 0,
    },
    messageReadRate: {
      type: Number, // percentage 0-100
      default: 0,
    },
    conversationCount: {
      type: Number,
      default: 0,
    },
    averageConversationLength: {
      type: Number, // avg messages per conversation
      default: 0,
    },

    // Performance metrics
    p50ResponseTime: { type: Number, default: 0 },
    p95ResponseTime: { type: Number, default: 0 },
    p99ResponseTime: { type: Number, default: 0 },

    // Peak activity
    peakHour: {
      type: Number, // 0-23
      default: null,
    },
    peakMessageCount: {
      type: Number,
      default: 0,
    },

    // Device breakdown
    deviceMetrics: {
      mobile: { type: Number, default: 0 },
      web: { type: Number, default: 0 },
      tablet: { type: Number, default: 0 },
    },

    // Geographic distribution (optional)
    topRegions: [
      {
        region: String,
        messageCount: Number,
        userCount: Number,
      },
    ],

    // Quality metrics
    encryptedMessages: { type: Number, default: 0 },
    deliveredMessages: { type: Number, default: 0 },
    failedMessages: { type: Number, default: 0 },
    bounceRate: {
      type: Number, // percentage
      default: 0,
    },

    // Moderation stats
    reportedMessages: { type: Number, default: 0 },
    deletedMessages: { type: Number, default: 0 },
    suspendedAccounts: { type: Number, default: 0 },

    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'message_analytics', timestamps: false }
);

// TTL index: automatically delete docs after 365 days
messageAnalyticsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Compound index for efficient time-range queries
messageAnalyticsSchema.index({ date: 1, period: 1 });

module.exports = mongoose.model('MessageAnalytics', messageAnalyticsSchema);
