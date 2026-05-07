const mongoose = require('mongoose');

/**
 * MessageTrendData Schema
 * Stores trending topics, keywords, and usage patterns
 * Purpose: Track what's trending, popular keywords, emerging patterns
 * 
 * Indexed by: date, trendScore
 * TTL: 90 days (keep trending data recent for relevance)
 */
const messageTrendDataSchema = new mongoose.Schema(
  {
    // Time period
    date: {
      type: Date,
      required: true,
      index: true,
    },
    period: {
      type: String, // 'hourly', 'daily', 'weekly'
      enum: ['hourly', 'daily', 'weekly'],
      required: true,
      index: true,
    },

    // Trending keywords
    topKeywords: [
      {
        keyword: {
          type: String,
          required: true,
        },
        frequency: {
          type: Number,
          required: true,
        },
        growth: {
          type: Number, // percentage change from previous period
          default: 0,
        },
        trendScore: {
          type: Number, // 0-100, based on frequency and growth
          default: 0,
        },
        lastMentioned: {
          type: Date,
          default: Date.now,
        },
        regions: [String], // geographic regions where trending
      },
    ],

    // Trending hashtags
    trendingHashtags: [
      {
        hashtag: {
          type: String,
          required: true,
        },
        frequency: {
          type: Number,
          required: true,
        },
        uniqueUsers: {
          type: Number,
          default: 0,
        },
        growth: {
          type: Number,
          default: 0,
        },
        trendScore: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Trending topics (grouped keywords)
    trendingTopics: [
      {
        topic: {
          type: String,
          required: true,
        },
        relatedKeywords: [String],
        mentionCount: {
          type: Number,
          default: 0,
        },
        uniqueUsers: {
          type: Number,
          default: 0,
        },
        trendScore: {
          type: Number,
          default: 0,
        },
        category: String, // 'entertainment', 'sports', 'news', 'tech', etc
      },
    ],

    // Trending hashtags globally
    globalTrendingHashtags: [
      {
        hashtag: String,
        rank: Number, // 1-10
        mentionCount: Number,
        trendScore: Number,
      },
    ],

    // Conversation patterns
    conversationPatterns: {
      avgConversationLength: {
        type: Number, // average messages per conversation
        default: 0,
      },
      avgConversationDuration: {
        type: Number, // minutes
        default: 0,
      },
      peakConversationTime: {
        type: String, // 'morning', 'afternoon', 'evening', 'night'
        default: null,
      },
      mostCommonConversationType: {
        type: String, // '1-on-1', 'group', 'broadcast'
        default: '1-on-1',
      },
    },

    // User behavior patterns
    userBehavior: {
      averageResponseTime: {
        type: Number, // milliseconds
        default: 0,
      },
      messageFrequencyTrend: {
        type: String, // 'increasing', 'decreasing', 'stable'
        default: 'stable',
      },
      twoFourHourMessageVolume: {
        type: Number, // percentage of daily messages in 2-4 hour window
        default: 0,
      },
    },

    // Content type trends
    contentTrends: {
      textMessagePercentage: { type: Number, default: 0 },
      mediaPercentage: { type: Number, default: 0 },
      emojiUsagePercentage: { type: Number, default: 0 },
      linkSharePercentage: { type: Number, default: 0 },
      reactionPercentage: { type: Number, default: 0 },
    },

    // Device trends
    deviceTrends: {
      mobilePercentage: { type: Number, default: 0 },
      webPercentage: { type: Number, default: 0 },
      tabletPercentage: { type: Number, default: 0 },
      emergingDevices: [
        {
          device: String,
          percentage: Number,
        },
      ],
    },

    // Regional trends
    regionalTrends: [
      {
        region: String,
        topKeywords: [String],
        messageVolume: Number,
        activeUsers: Number,
        trendScore: Number,
      },
    ],

    // Emerging trends (new or growing fast)
    emergingTrends: [
      {
        trend: String,
        growthRate: Number, // percentage increase
        firstSeen: Date,
        estimatedPeakDate: Date, // predicted when trend peaks
        confidence: Number, // 0-100
      },
    ],

    // Declining trends
    decliningTrends: [
      {
        trend: String,
        declineRate: Number, // percentage decrease
        lastMentioned: Date,
      },
    ],

    // Sentiment trends
    sentimentTrends: {
      overallSentiment: {
        type: Number, // -1 to 1
        default: 0,
      },
      positivePercentage: { type: Number, default: 0 },
      negativePercentage: { type: Number, default: 0 },
      neutralPercentage: { type: Number, default: 0 },
      sentimentShift: {
        type: String, // 'improving', 'declining', 'stable'
        default: 'stable',
      },
    },

    // Metadata
    dataQuality: {
      samplingRate: {
        type: Number, // percentage of messages analyzed
        default: 100,
      },
      confidence: {
        type: Number, // 0-100, confidence in trends
        default: 100,
      },
    },

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
  { collection: 'message_trend_data', timestamps: false }
);

// TTL index: delete after 90 days (keep only recent trends)
messageTrendDataSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Indexes for efficient queries
messageTrendDataSchema.index({ date: 1, period: 1 });
messageTrendDataSchema.index({ 'topKeywords.trendScore': -1 });
messageTrendDataSchema.index({ 'trendingHashtags.trendScore': -1 });

module.exports = mongoose.model('MessageTrendData', messageTrendDataSchema);
