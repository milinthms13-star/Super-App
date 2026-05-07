const mongoose = require('mongoose');

/**
 * GroupMember Schema
 * Tracks membership in chat groups with roles and permissions
 */
const groupMemberSchema = new mongoose.Schema(
  {
    // Group and user
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatGroup',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Role and permissions
    role: {
      type: String,
      enum: ['owner', 'admin', 'moderator', 'member'],
      default: 'member',
    },
    permissions: {
      canPostMessages: { type: Boolean, default: true },
      canDeleteOwnMessages: { type: Boolean, default: true },
      canDeleteAnyMessages: { type: Boolean, default: false },
      canEditOwnMessages: { type: Boolean, default: true },
      canEditAnyMessages: { type: Boolean, default: false },
      canInviteMembers: { type: Boolean, default: false },
      canRemoveMembers: { type: Boolean, default: false },
      canManageGroup: { type: Boolean, default: false },
      canChangeGroupSettings: { type: Boolean, default: false },
      canMuteMembers: { type: Boolean, default: false },
      canPinMessages: { type: Boolean, default: false },
    },

    // Member status
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    invitedAt: {
      type: Date,
      default: null,
    },
    invitationAcceptedAt: {
      type: Date,
      default: null,
    },

    // Activity tracking
    lastSeenAt: {
      type: Date,
      default: null,
    },
    lastMessageReadAt: {
      type: Date,
      default: null,
    },
    unreadMessageCount: {
      type: Number,
      default: 0,
    },

    // Notification preferences
    muteNotifications: {
      type: Boolean,
      default: false,
    },
    muteUntil: {
      type: Date,
      default: null,
    },
    notificationLevel: {
      type: String,
      enum: ['all', 'mentions', 'important', 'none'],
      default: 'all',
    },

    // Status
    isMuted: {
      type: Boolean,
      default: false,
    },
    mutedAt: {
      type: Date,
      default: null,
    },
    mutedReason: String,
    isBanned: {
      type: Boolean,
      default: false,
    },
    bannedAt: {
      type: Date,
      default: null,
    },
    bannedReason: String,
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Left/Removed
    leftAt: {
      type: Date,
      default: null,
    },
    removedAt: {
      type: Date,
      default: null,
    },
    removedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'group_members',
  }
);

// Unique index: one member record per user per group
groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupMemberSchema.index({ userId: 1, groupId: 1 });
groupMemberSchema.index({ groupId: 1, isBanned: 1 });
groupMemberSchema.index({ groupId: 1, role: 1 });
groupMemberSchema.index({ lastSeenAt: -1 });

// Methods
groupMemberSchema.methods.isMember = function () {
  return !this.leftAt && !this.removedAt && !this.isBanned;
};

groupMemberSchema.methods.canPostMessages = function () {
  return this.isMember() && this.permissions.canPostMessages;
};

groupMemberSchema.methods.mute = async function (reason, durationMs = null) {
  this.isMuted = true;
  this.mutedAt = new Date();
  this.mutedReason = reason;
  if (durationMs) {
    this.muteUntil = new Date(Date.now() + durationMs);
  }
  return this.save();
};

groupMemberSchema.methods.unmute = async function () {
  this.isMuted = false;
  this.mutedAt = null;
  this.mutedUntil = null;
  this.mutedReason = null;
  return this.save();
};

groupMemberSchema.methods.ban = async function (reason, bannedBy) {
  this.isBanned = true;
  this.bannedAt = new Date();
  this.bannedReason = reason;
  this.bannedBy = bannedBy;
  return this.save();
};

groupMemberSchema.methods.unban = async function () {
  this.isBanned = false;
  this.bannedAt = null;
  this.bannedReason = null;
  this.bannedBy = null;
  return this.save();
};

groupMemberSchema.methods.leave = async function () {
  this.leftAt = new Date();
  return this.save();
};

groupMemberSchema.methods.remove = async function (removedBy) {
  this.removedAt = new Date();
  this.removedBy = removedBy;
  return this.save();
};

module.exports = mongoose.model('GroupMember', groupMemberSchema);
