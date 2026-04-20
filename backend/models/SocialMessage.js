const mongoose = require('mongoose');

const SocialMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialConversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'file', 'audio', 'emoji'],
      default: 'text',
    },
    content: {
      type: String,
      trim: true,
    },
    mediaUrl: String,
    mediaFileId: String,
    fileName: String,
    fileSize: Number,
    thumbnailUrl: String,
    duration: Number,
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    isDeleted: {
      type: Boolean,
      default: false,
    },
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        emoji: String,
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialMessage',
      default: null,
    },
    forwarded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    index: [{ conversationId: 1, createdAt: 1 }],
  }
);

module.exports = mongoose.model('SocialMessage', SocialMessageSchema);
