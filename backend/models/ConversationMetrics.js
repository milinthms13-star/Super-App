const mongoose = require('mongoose');

/**
 * ConversationMetrics Schema
 * Stores per-conversation analytics and engagement metrics
 * Purpose: Track conversation health, activity, patterns
 * 
 * Indexed by: conversationId, updatedAt
 * TTL: 365 days
 */
const conversationMetricsSchema = new mongoose.Schema(
  {
    // Conversation reference
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    participantCount: {
      type: Number,
      default: 2,
    },

    // Message statistics
    totalMessages: {
      type: Number,
      default: 0,
    },
    totalMessagesRead: {
      type: Number,
      default: 0,
    },
    totalMessagesUnread: {
      type: Number,
      default: 0,
    },

    // Per-participant breakdown
    participantStats: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        messagesSent: Number,
        messagesRead: Number,
        averageResponseTime: Number,
      },
    ],

    // Engagement metrics
    engagementLevel: {
      type: String, // 'high', 'medium', 'low', 'inactive'
      enum: ['high', 'medium', 'low', 'inactive'],
      default: 'medium',
    },
    engagementScore: {
      type: Number, // 0-100
      default: 0,
    },

    // Activity patterns
    firstMessageDate: {
      type: Date,
      default: null,
    },
    lastMessageDate: {
      type: Date,
      default: null,
    },
    conversationDuration: {
      type: Number, // days between first and last message
      default: 0,
    },

    // Time between messages
    averageMessageGap: {
      type: Number, // milliseconds
      default: 0,
    },
    maxMessageGap: {
      type: Number, // milliseconds
      default: 0,
    },

    // Response time metrics
    averageResponseTime: {
      type: Number, // milliseconds
      default: 0,
    },
    p50ResponseTime: { type: Number, default: 0 },
    p95ResponseTime: { type: Number, default: 0 },

    // Message content analysis
    messageTypes: {
      text: { type: Number, default: 0 },
      media: { type: Number, default: 0 },
      sticker: { type: Number, default: 0 },
      reaction: { type: Number, default: 0 },
    },

    // Conversation health
    isActive: {
      type: Boolean,
      default: true,
    },
    inactivityDays: {
      type: Number,
      default: 0,
    },

    // Sentiment (optional, for future NLP integration)
    sentimentAnalysis: {
      positiveMessages: { type: Number, default: 0 },
      negativeMessages: { type: Number, default: 0 },
      neutralMessages: { type: Number, default: 0 },
      averageSentiment: { type: Number, default: 0 }, // -1 to 1
    },

    // Keywords and topics (optional)
    topKeywords: [
      {
        keyword: String,
        frequency: Number,
        lastMentioned: Date,
      },
    ],

    // Interaction patterns
    totalInteractions: {
      type: Number,
      default: 0,
    },
    interactionFrequency: {
      type: String, // 'daily', 'weekly', 'monthly', 'sporadic'
      default: 'sporadic',
    },

    // Media statistics
    mediaCount: {
      type: Number,
      default: 0,
    },
    averageMediaPerMessage: {
      type: Number,
      default: 0,
    },

    // Encryption and security
    encryptedMessages: {
      type: Number,
      default: 0,
    },
    encryptionRate: {
      type: Number, // 0-100
      default: 100,
    },

    // Moderation
    reportCount: {
      type: Number,
      default: 0,
    },
    deletedMessageCount: {
      type: Number,
      default: 0,
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
  { collection: 'conversation_metrics', timestamps: false }
);

// Indexes
conversationMetricsSchema.index({ conversationId: 1, updatedAt: -1 });
conversationMetricsSchema.index({ engagementScore: -1 });
conversationMetricsSchema.index({ isActive: 1, lastMessageDate: -1 });
conversationMetricsSchema.index({ participantCount: 1 });

module.exports = mongoose.model('ConversationMetrics', conversationMetricsSchema);
