const mongoose = require('mongoose');

const chatNotificationSchema = new mongoose.Schema(
  {
    // User who receives the notification
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Reference to the message
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
    },

    // Reference to the chat
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },

    // Sender of the message
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Notification type
    notificationType: {
      type: String,
      enum: ['message', 'mention', 'reaction', 'groupInvite', 'groupUpdate', 'callMissed'],
      default: 'message',
    },

    // Notification title
    title: {
      type: String,
      required: true,
    },

    // Notification body/preview
    body: {
      type: String,
      sparse: true,
    },

    // Is read
    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      sparse: true,
    },

    // Push notification sent
    isPushSent: {
      type: Boolean,
      default: false,
    },

    pushSentAt: {
      type: Date,
      sparse: true,
    },

    // Sound/vibration
    soundEnabled: {
      type: Boolean,
      default: true,
    },

    vibrationEnabled: {
      type: Boolean,
      default: true,
    },

    // Custom action data
    actionData: {
      type: mongoose.Schema.Types.Mixed,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
chatNotificationSchema.index({ userId: 1, createdAt: -1 });
chatNotificationSchema.index({ userId: 1, isRead: 1 });
chatNotificationSchema.index({ chatId: 1 });
chatNotificationSchema.index({ messageId: 1 });
chatNotificationSchema.index({ senderId: 1 });

// TTL index: auto-delete notifications after 30 days
chatNotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 }
);

module.exports = mongoose.model('ChatNotification', chatNotificationSchema);
