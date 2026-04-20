const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    // Reference to the chat
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },

    // Sender of the message
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Message content types
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'file', 'audio', 'voice', 'location', 'contact'],
      default: 'text',
    },

    // Message content
    content: {
      type: String,
      sparse: true, // Not required for media messages
    },

    // Media information
    media: {
      type: {
        type: String, // mime type
      },
      url: String, // URL to media file
      size: Number, // File size in bytes
      duration: Number, // For audio/video
      thumbnail: String, // Thumbnail URL for images/videos
    },

    // Delivery status tracking per participant
    deliveryStatus: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['sent', 'delivered', 'seen'],
          default: 'sent',
        },
        seenAt: {
          type: Date,
          sparse: true,
        },
        deliveredAt: {
          type: Date,
          sparse: true,
        },
      },
    ],

    // Reactions to message (emoji reactions)
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        emoji: String,
        reactedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Reply to another message
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      sparse: true,
    },

    // Forwarded from another message
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      sparse: true,
    },

    // Mentions in message
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Hashtags
    hashtags: [String],

    // Message edit history
    edits: [
      {
        content: String,
        editedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Is message deleted (soft delete)
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      sparse: true,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },

    // Reported as spam/abuse
    isReported: {
      type: Boolean,
      default: false,
    },

    reports: [
      {
        reportedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reason: String,
        reportedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Expiring message (self-destructing)
    expiresAt: {
      type: Date,
      sparse: true,
      index: { expireAfterSeconds: 0 }, // TTL index
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ 'mentions._id': 1 });
messageSchema.index({ isDeleted: 1 });

// Text search index for content
messageSchema.index({ content: 'text' });

module.exports = mongoose.model('Message', messageSchema);
