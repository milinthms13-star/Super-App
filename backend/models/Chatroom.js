const mongoose = require('mongoose');

const chatroomSchema = new mongoose.Schema(
  {
    // Chatroom name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Chatroom description
    description: {
      type: String,
      trim: true,
    },

    // Chatroom icon/avatar
    icon: {
      type: String, // URL to icon/image
      sparse: true,
    },

    // Visibility: 'public' or 'private'
    isPrivate: {
      type: Boolean,
      default: false,
    },

    // Room creator (admin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Admins who can approve members in private rooms
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Current members in the chatroom
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Pending approval requests (for private chatrooms)
    pendingRequests: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
      },
    ],

    // Blocked members (cannot join or re-join)
    blockedMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Last message for preview
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      sparse: true,
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },

    // Room settings
    settings: {
      allowMemberInvites: {
        type: Boolean,
        default: false,
      },
      allowMemberMessages: {
        type: Boolean,
        default: true,
      },
      moderationRequired: {
        type: Boolean,
        default: false,
      },
      allowFileSharing: {
        type: Boolean,
        default: true,
      },
    },

    // Muted by specific users
    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Tags/categories for discovery
    tags: [
      {
        type: String,
        lowercase: true,
      },
    ],

    // Max members allowed (-1 for unlimited)
    maxMembers: {
      type: Number,
      default: -1,
    },

    // Member count (for quick lookup)
    memberCount: {
      type: Number,
      default: 1,
    },

    // Is room active (soft delete)
    isActive: {
      type: Boolean,
      default: true,
    },

    // Statistics
    stats: {
      totalMessages: {
        type: Number,
        default: 0,
      },
      totalJoinRequests: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
chatroomSchema.index({ createdBy: 1 });
chatroomSchema.index({ isPrivate: 1, isActive: 1 });
chatroomSchema.index({ members: 1 });
chatroomSchema.index({ tags: 1 });
chatroomSchema.index({ name: 'text', description: 'text' });

// Ensure creator is in admins and members
chatroomSchema.pre('save', function (next) {
  if (!this.admins.includes(this.createdBy)) {
    this.admins.push(this.createdBy);
  }
  if (!this.members.includes(this.createdBy)) {
    this.members.push(this.createdBy);
  }
  this.memberCount = this.members.length;
  next();
});

module.exports = mongoose.model('Chatroom', chatroomSchema);
