const mongoose = require('mongoose');

const scheduledMessageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    mediaUrls: [
      {
        url: String,
        type: {
          type: String,
          enum: ['image', 'video', 'audio', 'document'],
        },
        size: Number,
      },
    ],
    scheduledTime: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'sent', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'document', 'link'],
      default: 'text',
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    lastError: String,
    sentAt: Date,
    createdMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    tags: [String],
    timezone: String,
    recurrence: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none',
    },
    recurrenceEndDate: Date,
  },
  {
    timestamps: true,
  }
);

// Compound indexes
scheduledMessageSchema.index({ userId: 1, scheduledTime: 1, status: 1 });
scheduledMessageSchema.index({ chatId: 1, status: 1 });
scheduledMessageSchema.index({ scheduledTime: 1, status: 1 });

// TTL index - remove failed messages after 30 days
scheduledMessageSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 2592000,
    partialFilterExpression: { status: { $in: ['failed', 'cancelled'] } },
  }
);

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);
