const mongoose = require('mongoose');

const messageBookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    senderName: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    messageContent: String,
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'document', 'link'],
    },
    mediaUrl: String,
    tag: {
      type: String,
      default: 'general',
    },
    notes: String,
    star: {
      type: Boolean,
      default: false,
      index: true,
    },
    folder: {
      type: String,
      default: 'bookmarks',
    },
  },
  {
    timestamps: true,
  }
);

// Unique constraint on userId + messageId to prevent duplicate bookmarks
messageBookmarkSchema.index({ userId: 1, messageId: 1 }, { unique: true });

// Index for efficient queries
messageBookmarkSchema.index({ userId: 1, tag: 1 });
messageBookmarkSchema.index({ userId: 1, createdAt: -1 });
messageBookmarkSchema.index({ userId: 1, star: 1 });
messageBookmarkSchema.index({ userId: 1, folder: 1 });

module.exports = mongoose.model('MessageBookmark', messageBookmarkSchema);
