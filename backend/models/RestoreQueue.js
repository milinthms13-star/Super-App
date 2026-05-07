const mongoose = require('mongoose');

const restoreQueueSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    backupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBackup',
      required: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
    },
    restoreType: {
      type: String,
      enum: ['full-restore', 'merge', 'replace'],
      default: 'full-restore',
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    processedMessages: {
      type: Number,
      default: 0,
    },
    totalMessages: {
      type: Number,
      default: 0,
    },
    startedAt: Date,
    completedAt: Date,
    errorMessage: String,
    errorDetails: mongoose.Schema.Types.Mixed,
    estimatedTimeRemaining: Number,
    restoredAt: Date,
    verificationResults: {
      messagesVerified: Number,
      messagesCorrupted: Number,
      mediaFilesRestored: Number,
      mediaFilesFailed: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
restoreQueueSchema.index({ userId: 1, status: 1 });
restoreQueueSchema.index({ backupId: 1, status: 1 });
restoreQueueSchema.index({ createdAt: -1, status: 1 });

// TTL index - auto-delete completed restores after 30 days
restoreQueueSchema.index(
  { completedAt: 1 },
  {
    expireAfterSeconds: 2592000,
    partialFilterExpression: { status: 'completed' },
  }
);

module.exports = mongoose.model('RestoreQueue', restoreQueueSchema);
