const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * DiaryAISummary - Stores generated AI summaries for diary entries
 * Enables: Historical comparison, scheduled summaries, trend analysis
 */

const diaryAISummarySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Summary metadata
    period: {
      type: String,
      enum: ['week', 'month', 'quarter', 'year', 'custom'],
      required: true
    },

    // Date range
    startDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      required: true
    },

    // Entry count in this summary
    entryCount: {
      type: Number,
      default: 0
    },

    // Total words analyzed
    totalWords: {
      type: Number,
      default: 0
    },

    // AI Summary content
    summary: {
      // Main narrative summary
      narrative: {
        type: String,
        required: true
      },

      // Key themes/topics
      keyThemes: [String],

      // Mood analysis
      moodSummary: String,
      moodDistribution: {
        happy: Number,
        sad: Number,
        peaceful: Number,
        anxious: Number,
        angry: Number,
        grateful: Number,
        energetic: Number,
        neutral: Number
      },

      // Highlights
      highlights: [
        {
          entryId: Schema.Types.ObjectId,
          date: Date,
          title: String,
          excerpt: String,
          type: {
            type: String,
            enum: ['detailed', 'positive', 'multi-topic']
          }
        }
      ],

      // Action items
      actionItems: [
        {
          item: String,
          priority: {
            type: String,
            enum: ['high', 'medium', 'low'],
            default: 'medium'
          },
          completed: {
            type: Boolean,
            default: false
          },
          sourceEntry: Schema.Types.ObjectId
        }
      ],

      // Wellness metrics
      wellnessScore: Number, // 0-100
      consistencyScore: Number, // Writing frequency consistency
      emotionalStability: Number // Mood variance
    },

    // AI model used
    aiProvider: {
      type: String,
      enum: ['gemini', 'keyword-based'],
      default: 'keyword-based'
    },

    // AI model metadata
    aiModel: {
      type: String,
      default: 'gemini-2.5-flash'
    },

    aiTokensUsed: {
      type: Number,
      default: 0
    },

    // User feedback
    userFeedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      helpful: Boolean,
      notes: String
    },

    // Sharing metadata
    isShared: {
      type: Boolean,
      default: false
    },

    sharedLink: String,

    shareExpiresAt: Date,

    // Metadata
    generatedAt: {
      type: Date,
      default: Date.now
    },

    // For tracking updates
    updatedAt: {
      type: Date,
      default: Date.now
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },

    deletedAt: Date
  },
  {
    timestamps: true,
    indexes: [
      { userId: 1, period: 1, startDate: 1 }, // Find summaries by user and period
      { userId: 1, createdAt: -1 }, // Recent summaries first
      { userId: 1, isDeleted: 1 } // Active summaries only
    ]
  }
);

/**
 * Get most recent summary for a period
 */
diaryAISummarySchema.statics.getLatestSummary = async function (
  userId,
  period
) {
  return this.findOne({
    userId,
    period,
    isDeleted: false
  })
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Get all summaries for user within date range
 */
diaryAISummarySchema.statics.getSummariesInRange = async function (
  userId,
  startDate,
  endDate
) {
  return this.find({
    userId,
    startDate: { $gte: startDate },
    endDate: { $lte: endDate },
    isDeleted: false
  })
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Soft delete a summary
 */
diaryAISummarySchema.statics.softDelete = async function (summaryId) {
  return this.findByIdAndUpdate(
    summaryId,
    {
      isDeleted: true,
      deletedAt: new Date()
    },
    { new: true }
  );
};

/**
 * Record user feedback
 */
diaryAISummarySchema.methods.recordFeedback = async function (
  rating,
  helpful,
  notes
) {
  this.userFeedback = {
    rating,
    helpful,
    notes
  };
  return this.save();
};

/**
 * Mark action item as completed
 */
diaryAISummarySchema.methods.markActionItemCompleted = async function (
  actionIndex
) {
  if (
    this.summary.actionItems &&
    this.summary.actionItems[actionIndex]
  ) {
    this.summary.actionItems[actionIndex].completed = true;
    return this.save();
  }
  return this;
};

/**
 * Create share link
 */
diaryAISummarySchema.methods.createShareLink = async function (
  expirationDays = 7
) {
  const crypto = require('crypto');
  this.isShared = true;
  this.sharedLink = crypto.randomBytes(16).toString('hex');
  this.shareExpiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);
  return this.save();
};

/**
 * Invalidate share link
 */
diaryAISummarySchema.methods.invalidateShareLink = async function () {
  this.isShared = false;
  this.sharedLink = null;
  this.shareExpiresAt = null;
  return this.save();
};

/**
 * Calculate word count average
 */
diaryAISummarySchema.virtual('avgWordsPerEntry').get(function () {
  if (this.entryCount === 0) return 0;
  return Math.round(this.totalWords / this.entryCount);
});

/**
 * Determine wellness category
 */
diaryAISummarySchema.virtual('wellnessCategory').get(function () {
  const score = this.summary?.wellnessScore || 0;
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Improvement';
});

module.exports = mongoose.model('DiaryAISummary', diaryAISummarySchema);
