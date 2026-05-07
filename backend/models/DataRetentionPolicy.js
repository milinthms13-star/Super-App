const mongoose = require('mongoose');

const dataRetentionPolicySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    messageRetentionDays: {
      type: Number,
      default: 365,
      min: 1,
      max: 2555, // 7 years
    },
    mediaRetentionDays: {
      type: Number,
      default: 90,
      min: 1,
      max: 2555,
    },
    deletedMessageRetentionDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 365,
    },
    autoArchiveAfterDays: {
      type: Number,
      default: 180,
    },
    autoDeleteMode: {
      type: String,
      enum: ['disabled', 'soft-delete', 'hard-delete'],
      default: 'soft-delete',
    },
    policyStatus: {
      type: String,
      enum: ['active', 'paused', 'suspended'],
      default: 'active',
    },
    dataCategories: {
      includePersonalChats: {
        type: Boolean,
        default: true,
      },
      includeGroupChats: {
        type: Boolean,
        default: true,
      },
      includeChannels: {
        type: Boolean,
        default: true,
      },
      includeMedia: {
        type: Boolean,
        default: true,
      },
      includeReactions: {
        type: Boolean,
        default: false,
      },
    },
    notificationSettings: {
      notifyBeforeDeletion: {
        type: Boolean,
        default: true,
      },
      notificationDaysBefore: {
        type: Number,
        default: 7,
      },
      notificationEmail: String,
    },
    exclusions: {
      pinnedChats: [mongoose.Schema.Types.ObjectId],
      starredMessages: {
        type: Boolean,
        default: true,
      },
    },
    executionSchedule: {
      enabled: {
        type: Boolean,
        default: true,
      },
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6,
        default: 0, // Sunday
      },
      timeOfDay: {
        type: String,
        default: '02:00', // 2 AM
      },
      timezone: String,
    },
    statistics: {
      totalMessagesDeleted: {
        type: Number,
        default: 0,
      },
      totalMediaDeleted: {
        type: Number,
        default: 0,
      },
      totalDataFreed: {
        type: Number,
        default: 0,
      },
      lastExecutionAt: Date,
      nextExecutionAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for user lookup
dataRetentionPolicySchema.index({ userId: 1 }, { unique: true });

// Index for scheduled execution
dataRetentionPolicySchema.index(
  { 'executionSchedule.enabled': 1, 'statistics.nextExecutionAt': 1 },
  { partialFilterExpression: { 'executionSchedule.enabled': true } }
);

module.exports = mongoose.model('DataRetentionPolicy', dataRetentionPolicySchema);
