const mongoose = require('mongoose');

const messageExpirationSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      unique: true,
      index: true,
    },
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
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    expirationType: {
      type: String,
      enum: ['timed', 'self-destruct-after-read', 'self-destruct-after-view'],
      default: 'timed',
    },
    expiresInSeconds: {
      type: Number,
      required: true,
    },
    readAt: Date,
    viewedAt: Date,
    isExpired: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiredAt: Date,
    notifyBeforeExpiry: {
      enabled: {
        type: Boolean,
        default: true,
      },
      secondsBefore: {
        type: Number,
        default: 60,
      },
      notifiedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index - automatically delete expired messages
messageExpirationSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
  }
);

// Additional indexes for queries
messageExpirationSchema.index({ userId: 1, isExpired: 1 });
messageExpirationSchema.index({ expirationType: 1, isExpired: 1 });

module.exports = mongoose.model('MessageExpiration', messageExpirationSchema);
