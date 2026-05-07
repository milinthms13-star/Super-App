const mongoose = require('mongoose');

/**
 * Channel Schema
 * Represents topic-based messaging channels
 * Used for organized group discussions around specific topics
 */
const channelSchema = new mongoose.Schema(
  {
    // Basic info
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 50,
      match: /^[a-z0-9_-]+$/,
    },
    displayName: {
      type: String,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    topic: {
      type: String,
      required: true,
      enum: [
        'general',
        'announcements',
        'support',
        'feedback',
        'random',
        'custom',
      ],
    },

    // Ownership
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    moderators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Access control
    isPublic: {
      type: Boolean,
      default: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },

    // Channel settings
    allowThreads: {
      type: Boolean,
      default: true,
    },
    allowReactions: {
      type: Boolean,
      default: true,
    },
    allowAttachments: {
      type: Boolean,
      default: true,
    },
    requireApprovalToJoin: {
      type: Boolean,
      default: false,
    },

    // Moderation
    autoModeration: {
      enabled: { type: Boolean, default: false },
      bannedWords: [String],
      allowLinks: { type: Boolean, default: true },
      spamFilterLevel: {
        type: String,
        enum: ['off', 'low', 'medium', 'high'],
        default: 'medium',
      },
    },

    // Subscription & member counts
    subscriberCount: {
      type: Number,
      default: 0,
    },
    messageCount: {
      type: Number,
      default: 0,
    },

    // Activity tracking
    lastMessageAt: {
      type: Date,
      default: null,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },

    // Retention policy
    messageRetentionDays: {
      type: Number,
      default: null, // null means indefinite
    },
    autoDeleteAfter: {
      type: Number,
      default: null,
    },

    // Metadata
    tags: [String],
    icon: String,
    color: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'channels',
  }
);

// Indexes
channelSchema.index({ name: 1 });
channelSchema.index({ createdBy: 1, createdAt: -1 });
channelSchema.index({ isPublic: 1, isArchived: 1 });
channelSchema.index({ lastActivityAt: -1 });
channelSchema.index({ topic: 1 });

// Methods
channelSchema.methods.addModerator = async function (userId) {
  if (!this.moderators.includes(userId)) {
    this.moderators.push(userId);
    return this.save();
  }
};

channelSchema.methods.removeModerator = async function (userId) {
  this.moderators = this.moderators.filter(
    (mod) => mod.toString() !== userId.toString()
  );
  return this.save();
};

channelSchema.methods.isModerator = function (userId) {
  return (
    this.createdBy.toString() === userId.toString() ||
    this.moderators.some((mod) => mod.toString() === userId.toString())
  );
};

channelSchema.methods.archive = async function () {
  this.isArchived = true;
  return this.save();
};

channelSchema.methods.unarchive = async function () {
  this.isArchived = false;
  return this.save();
};

module.exports = mongoose.model('Channel', channelSchema);
