const mongoose = require('mongoose');

const MessageQueueSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      index: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'retry'],
      default: 'pending',
      index: true,
    },
    deliveryStatus: [
      {
        recipientId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'seen', 'failed'],
          default: 'pending',
        },
        sentAt: Date,
        deliveredAt: Date,
        seenAt: Date,
        failedAt: Date,
        failureReason: String,
        retryCount: { type: Number, default: 0 },
        nextRetryAt: Date,
      },
    ],
    retryAttempts: {
      type: Number,
      default: 0,
      max: 10,
    },
    maxRetryAttempts: {
      type: Number,
      default: 5,
    },
    lastRetryAt: Date,
    nextRetryAt: {
      type: Date,
      index: true,
    },
    retryBackoffMs: {
      type: Number,
      default: 1000, // Start with 1 second, exponential increase
    },
    maxRetryBackoffMs: {
      type: Number,
      default: 3600000, // Max 1 hour between retries
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal',
      index: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'voice', 'location', 'contact'],
      required: true,
    },
    contentPreview: String,
    encryption: {
      isEncrypted: { type: Boolean, default: false },
      encryptionAlgorithm: String,
    },
    offlineSync: {
      isOfflineMessage: Boolean,
      syncedAt: Date,
    },
    clientMessageId: {
      type: String,
      description: 'For deduplication on offline sync',
    },
    errors: [
      {
        timestamp: Date,
        recipientId: mongoose.Schema.Types.ObjectId,
        error: String,
        code: String,
        retryable: Boolean,
      },
    ],
    warnings: [String],
    metadata: {
      processingTimeMs: Number,
      totalRetryTimeMs: Number,
      failureType: {
        type: String,
        enum: ['network', 'service', 'client', 'unknown'],
      },
    },
    processedAt: Date,
    completedAt: {
      type: Date,
    },
    scheduledFor: {
      type: Date,
      description: 'For scheduled messages',
    },
    deviceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
      },
    ],
  },
  {
    timestamps: true,
    collection: 'message_queue',
  }
);

// Indexes for efficient queries
MessageQueueSchema.index({ chatId: 1, createdAt: -1 });
MessageQueueSchema.index({ senderId: 1, status: 1 });
MessageQueueSchema.index({ status: 1, nextRetryAt: 1 });
MessageQueueSchema.index({ priority: -1, createdAt: 1 });
MessageQueueSchema.index({
  completedAt: 1,
}, { expireAfterSeconds: 2592000 }); // TTL: 30 days

// Compound indexes
MessageQueueSchema.index({ status: 1, priority: -1, nextRetryAt: 1 });
MessageQueueSchema.index({ senderId: 1, chatId: 1, createdAt: -1 });

// Static methods
MessageQueueSchema.statics.enqueue = async function (
  messageData,
  options = {}
) {
  const queueEntry = await this.create({
    messageId: messageData.messageId,
    chatId: messageData.chatId,
    senderId: messageData.senderId,
    recipientIds: messageData.recipientIds || [],
    status: options.status || 'pending',
    messageType: messageData.messageType,
    contentPreview: messageData.contentPreview,
    priority: options.priority || 'normal',
    clientMessageId: messageData.clientMessageId,
    encryption: messageData.encryption,
    offlineSync: options.offlineSync,
    deviceIds: options.deviceIds || [],
    deliveryStatus: (messageData.recipientIds || []).map((recipientId) => ({
      recipientId,
      status: 'pending',
    })),
  });

  return queueEntry;
};

MessageQueueSchema.statics.getRetryQueue = async function (limit = 50) {
  const now = new Date();
  return await this.find({
    status: { $in: ['pending', 'retry'] },
    nextRetryAt: { $lte: now },
    retryAttempts: { $lt: 10 },
  })
    .sort({ priority: -1, nextRetryAt: 1 })
    .limit(limit)
    .lean();
};

MessageQueueSchema.statics.getFailedMessages = async function (
  daysOld = 7,
  limit = 100
) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return await this.find({
    status: 'failed',
    createdAt: { $lte: cutoffDate },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

MessageQueueSchema.statics.getPendingMessagesByChat = async function (
  chatId,
  limit = 100
) {
  return await this.find({
    chatId,
    status: { $in: ['pending', 'retry'] },
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit)
    .lean();
};

// Instance methods
MessageQueueSchema.methods.markSent = async function (recipientId) {
  const delivery = this.deliveryStatus.find(
    (d) => d.recipientId.toString() === recipientId.toString()
  );
  if (delivery) {
    delivery.status = 'sent';
    delivery.sentAt = new Date();
    delivery.retryCount = 0;
  }

  // Check if all recipients have sent
  if (this.deliveryStatus.every((d) => d.status !== 'pending')) {
    this.status = 'sent';
    this.processedAt = new Date();
  }

  return this.save();
};

MessageQueueSchema.methods.markDelivered = async function (recipientId) {
  const delivery = this.deliveryStatus.find(
    (d) => d.recipientId.toString() === recipientId.toString()
  );
  if (delivery) {
    delivery.status = 'delivered';
    delivery.deliveredAt = new Date();
  }

  if (this.deliveryStatus.every((d) => d.status !== 'pending')) {
    this.status = 'delivered';
  }

  return this.save();
};

MessageQueueSchema.methods.markSeen = async function (recipientId) {
  const delivery = this.deliveryStatus.find(
    (d) => d.recipientId.toString() === recipientId.toString()
  );
  if (delivery) {
    delivery.status = 'seen';
    delivery.seenAt = new Date();
  }

  if (
    this.status !== 'completed' &&
    this.deliveryStatus.every((d) => d.status === 'seen')
  ) {
    this.status = 'completed';
    this.completedAt = new Date();
  }

  return this.save();
};

MessageQueueSchema.methods.scheduleRetry = function (backoffMultiplier = 2) {
  this.retryAttempts += 1;
  this.status = 'retry';
  this.lastRetryAt = new Date();

  // Exponential backoff with jitter
  const jitter = Math.random() * 1000; // 0-1 second jitter
  const nextBackoff = Math.min(
    this.retryBackoffMs * backoffMultiplier + jitter,
    this.maxRetryBackoffMs
  );

  this.nextRetryAt = new Date(Date.now() + nextBackoff);
  this.retryBackoffMs = nextBackoff;

  return this.save();
};

MessageQueueSchema.methods.markFailed = async function (
  recipientId,
  errorReason,
  errorCode = 'UNKNOWN',
  retryable = false
) {
  const delivery = this.deliveryStatus.find(
    (d) => d.recipientId?.toString() === recipientId?.toString()
  );

  if (delivery) {
    delivery.status = 'failed';
    delivery.failedAt = new Date();
    delivery.failureReason = errorReason;
    delivery.retryCount += 1;
  }

  this.errors.push({
    timestamp: new Date(),
    recipientId,
    error: errorReason,
    code: errorCode,
    retryable,
  });

  // Decide if entire message should fail
  if (retryable && this.retryAttempts < this.maxRetryAttempts) {
    await this.scheduleRetry();
  } else {
    this.status = 'failed';
    this.completedAt = new Date();
  }

  return this.save();
};

MessageQueueSchema.methods.addWarning = function (warning) {
  this.warnings.push(warning);
  return this.save();
};

module.exports = mongoose.model('MessageQueue', MessageQueueSchema);
