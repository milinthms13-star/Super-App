const mongoose = require('mongoose');

const SocialNotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notificationType: {
      type: String,
      enum: [
        'like',
        'comment',
        'follow',
        'message',
        'mention',
        'share',
        'tag',
        'friendRequest',
        'system',
        'achievement',
      ],
      required: true,
      index: true,
    },
    relatedObject: {
      type: {
        type: String,
        enum: ['post', 'comment', 'user', 'message', 'conversation'],
      },
      id: mongoose.Schema.Types.ObjectId,
    },
    title: String,
    description: {
      type: String,
      trim: true,
    },
    actionUrl: String,
    icon: {
      type: String,
      default: '',
    },
    image: String,
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,
    isArchived: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 2592000 }, // 30 days TTL
    },
  },
  {
    timestamps: true,
    index: [
      { recipient: 1, isRead: 1, createdAt: -1 },
      { recipient: 1, createdAt: -1 },
    ],
  }
);

module.exports = mongoose.model('SocialNotification', SocialNotificationSchema);
