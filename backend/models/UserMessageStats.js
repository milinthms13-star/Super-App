const mongoose = require('mongoose');

/**
 * UserMessageStats Schema
 * Stores per-user messaging statistics
 * Purpose: Track individual user activity, patterns, engagement
 * 
 * Indexed by: userId, updatedAt
 * TTL: 365 days (keep historical data for analytics)
 */
const userMessageStatsSchema = new mongoose.Schema(
  {
    // User reference
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Message counts
    totalMessagesSent: {
      type: Number,
      default: 0,
    },
    totalMessagesReceived: {
      type: Number,
      default: 0,
    },
    totalMessagesDeleted: {
      type: Number,
      default: 0,
    },
    totalMessagesEdited: {
      type: Number,
      default: 0,
    },

    // Engagement metrics
    totalConversations: {
      type: Number,
      default: 0,
    },
    activeConversations: {
      type: Number,
      default: 0,
    },
    averageMessagesPerConversation: {
      type: Number,
      default: 0,
    },

    // Response time metrics (in milliseconds)
    averageResponseTime: {
      type: Number,
      default: 0,
    },
    p50ResponseTime: { type: Number, default: 0 },
    p95ResponseTime: { type: Number, default: 0 },
    p99ResponseTime: { type: Number, default: 0 },

    // Message read statistics
    messagesRead: {
      type: Number,
      default: 0,
    },
    messagesUnread: {
      type: Number,
      default: 0,
    },
    readRate: {
      type: Number, // percentage 0-100
      default: 0,
    },

    // Activity window
    firstMessageDate: {
      type: Date,
      default: null,
    },
    lastMessageDate: {
      type: Date,
      default: null,
    },
    lastActiveAt: {
      type: Date,
      default: null,
    },

    // Time-based patterns
    preferredTimeOfDay: {
      type: String, // 'morning', 'afternoon', 'evening', 'night'
      default: null,
    },
    preferredDayOfWeek: {
      type: String,
      default: null,
    },
    averageMessagesPerDay: {
      type: Number,
      default: 0,
    },

    // Message types
    messageTypes: {
      text: { type: Number, default: 0 },
      media: { type: Number, default: 0 },
      sticker: { type: Number, default: 0 },
      reaction: { type: Number, default: 0 },
      link: { type: Number, default: 0 },
    },

    // Device information
    deviceStats: {
      totalDevices: { type: Number, default: 0 },
      mobileMessages: { type: Number, default: 0 },
      webMessages: { type: Number, default: 0 },
      tabletMessages: { type: Number, default: 0 },
      primaryDevice: {
        type: String,
        default: 'mobile',
      },
    },

    // Messaging quality
    encryptedMessagePercentage: {
      type: Number, // 0-100
      default: 100,
    },
    failedMessageCount: {
      type: Number,
      default: 0,
    },
    retryCount: {
      type: Number,
      default: 0,
    },

    // Social metrics
    totalContactsMessaged: {
      type: Number,
      default: 0,
    },
    frequentContacts: [
      {
        contactId: mongoose.Schema.Types.ObjectId,
        messageCount: Number,
        lastMessageDate: Date,
      },
    ],

    // Engagement score (0-100)
    engagementScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // Scoring factors
    scoreFactors: {
      messageFrequency: { type: Number, default: 0 }, // 0-30
      readRate: { type: Number, default: 0 }, // 0-20
      responseTime: { type: Number, default: 0 }, // 0-20
      messageQuality: { type: Number, default: 0 }, // 0-20
      accountAge: { type: Number, default: 0 }, // 0-10
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },

    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { collection: 'user_message_stats', timestamps: false }
);

// Indexes
userMessageStatsSchema.index({ updatedAt: 1, engagementScore: -1 });
userMessageStatsSchema.index({ lastMessageDate: 1 });
userMessageStatsSchema.index({ totalMessagesSent: -1 });

module.exports = mongoose.model('UserMessageStats', userMessageStatsSchema);
