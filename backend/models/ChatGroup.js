const mongoose = require('mongoose');

/**
 * ChatGroup Schema
 * Represents group chat conversations with multiple members
 * Supports admin roles, permissions, and group-wide E2EE
 */
const chatGroupSchema = new mongoose.Schema(
  {
    // Basic info
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    avatar: {
      type: String,
      default: null,
    },

    // Ownership and admin
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Group settings
    isPublic: {
      type: Boolean,
      default: false,
    },
    maxMembers: {
      type: Number,
      default: 1000,
    },
    joinApprovalRequired: {
      type: Boolean,
      default: false,
    },

    // Members metadata
    memberCount: {
      type: Number,
      default: 0,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },

    // Encryption settings for group
    e2eeEnabled: {
      type: Boolean,
      default: true,
    },
    groupEncryptionKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EncryptionKey',
      default: null,
    },
    keyRotationSchedule: {
      type: String,
      enum: ['never', '7days', '30days', '90days'],
      default: '90days',
    },

    // Notification preferences
    allowNotifications: {
      type: Boolean,
      default: true,
    },
    muteAllMembers: {
      type: Boolean,
      default: false,
    },

    // Archive and status
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },

    // Moderation
    moderationEnabled: {
      type: Boolean,
      default: true,
    },
    pinMessage: {
      messageId: mongoose.Schema.Types.ObjectId,
      pinnedBy: mongoose.Schema.Types.ObjectId,
      pinnedAt: Date,
    },

    // Metadata
    tags: [String],
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'chat_groups',
  }
);

// Indexes
chatGroupSchema.index({ createdBy: 1, createdAt: -1 });
chatGroupSchema.index({ admins: 1 });
chatGroupSchema.index({ isPublic: 1, createdAt: -1 });
chatGroupSchema.index({ lastActivityAt: -1 });
chatGroupSchema.index({ memberCount: 1 });
chatGroupSchema.index({ isArchived: 1 });

// Methods
chatGroupSchema.methods.addAdmin = async function (userId) {
  if (!this.admins.includes(userId)) {
    this.admins.push(userId);
    return this.save();
  }
};

chatGroupSchema.methods.removeAdmin = async function (userId) {
  this.admins = this.admins.filter((admin) => admin.toString() !== userId.toString());
  return this.save();
};

chatGroupSchema.methods.isAdmin = function (userId) {
  return (
    this.createdBy.toString() === userId.toString() ||
    this.admins.some((admin) => admin.toString() === userId.toString())
  );
};

chatGroupSchema.methods.archive = async function () {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

chatGroupSchema.methods.unarchive = async function () {
  this.isArchived = false;
  this.archivedAt = null;
  return this.save();
};

module.exports = mongoose.model('ChatGroup', chatGroupSchema);
