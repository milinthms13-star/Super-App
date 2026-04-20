const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    // Chat type: 'direct' for 1-to-1, 'group' for group chats
    type: {
      type: String,
      enum: ['direct', 'group'],
      required: true,
      default: 'direct',
    },

    // For direct chats: array with exactly 2 users
    // For group chats: array of all participants
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],

    // Group-specific fields
    groupName: {
      type: String,
      sparse: true, // Only required for group chats
    },

    groupIcon: {
      type: String, // URL to group icon/image
      sparse: true,
    },

    // Admin users for group chats
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Group description
    groupDescription: {
      type: String,
      sparse: true,
    },

    // Last message details for preview
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      sparse: true,
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },

    // Muted notifications per user
    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Archived by users
    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Pinned messages
    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],

    // Chat settings
    settings: {
      allowFileSharing: {
        type: Boolean,
        default: true,
      },
      allowMediaSharing: {
        type: Boolean,
        default: true,
      },
    },

    // For group chats: member list with join dates
    membersList: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        role: {
          type: String,
          enum: ['admin', 'member'],
          default: 'member',
        },
      },
    ],

    // Deletion soft delete - still visible but marked as deleted
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
chatSchema.index({ participants: 1 });
chatSchema.index({ 'participants._id': 1 });
chatSchema.index({ lastMessageAt: -1 });
chatSchema.index({ createdAt: -1 });
chatSchema.index({ type: 1 });

// Text search index for group names
chatSchema.index({ groupName: 'text' });

module.exports = mongoose.model('Chat', chatSchema);
