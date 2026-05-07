const mongoose = require('mongoose');

/**
 * OfflineQueue Schema
 * Stores messages queued while user was offline for sync on reconnect
 */
const offlineQueueSchema = new mongoose.Schema(
  {
    // User reference
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
    },

    // Message/action data
    action: {
      type: String,
      enum: ['sendMessage', 'editMessage', 'deleteMessage', 'reaction'],
      required: true,
    },
    clientMessageId: {
      type: String,
      required: true,
      unique: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },

    // Payload
    payload: {
      messageContent: String,
      messageId: mongoose.Schema.Types.ObjectId,
      emoji: String,
      metadata: mongoose.Schema.Types.Mixed,
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'synced', 'failed', 'cancelled'],
      default: 'pending',
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 5,
    },
    lastRetryAt: {
      type: Date,
      default: null,
    },
    failureReason: String,

    // Timestamps
    queuedAt: {
      type: Date,
      default: Date.now,
    },
    syncedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },

    // Metadata
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'offline_queue',
  }
);

// TTL index: auto-delete after 24 hours
offlineQueueSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Other indexes
offlineQueueSchema.index({ userId: 1, deviceId: 1, status: 1 });
offlineQueueSchema.index({ conversationId: 1, status: 1 });
offlineQueueSchema.index({ clientMessageId: 1 });
offlineQueueSchema.index({ queuedAt: -1 });

// Methods
offlineQueueSchema.methods.markSynced = async function () {
  this.status = 'synced';
  this.syncedAt = new Date();
  return this.save();
};

offlineQueueSchema.methods.markFailed = async function (reason) {
  this.status = 'failed';
  this.failureReason = reason;
  return this.save();
};

offlineQueueSchema.methods.incrementRetry = async function () {
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  if (this.retryCount >= this.maxRetries) {
    this.status = 'failed';
    this.failureReason = 'Max retries exceeded';
  }
  return this.save();
};

offlineQueueSchema.methods.cancel = async function () {
  this.status = 'cancelled';
  return this.save();
};

// Statics
offlineQueueSchema.statics.getPendingForDevice = async function (
  userId,
  deviceId
) {
  const pending = await this.find({
    userId,
    deviceId,
    status: 'pending',
  }).sort({ queuedAt: 1 });
  return pending;
};

offlineQueueSchema.statics.getFailedMessages = async function (userId) {
  const failed = await this.find({
    userId,
    status: 'failed',
  }).sort({ queuedAt: -1 });
  return failed;
};

module.exports = mongoose.model('OfflineQueue', offlineQueueSchema);
