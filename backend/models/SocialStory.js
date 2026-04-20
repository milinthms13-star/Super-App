const mongoose = require('mongoose');

const SocialStorySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'text'],
      default: 'image',
    },
    mediaUrl: {
      type: String,
      trim: true,
    },
    mediaFileId: String,
    thumbnail: String,
    duration: Number,
    privacy: {
      type: String,
      enum: ['public', 'private', 'friends', 'custom'],
      default: 'public',
    },
    allowedViewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    hiddenFrom: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    views: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    viewCount: {
      type: Number,
      default: 0,
    },
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
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SocialMessage',
      },
    ],
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 }, // Removes document when current time passes this date
    },
    allowReplies: {
      type: Boolean,
      default: true,
    },
    allowSharing: {
      type: Boolean,
      default: true,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    index: [{ author: 1, expiresAt: 1 }],
  }
);

module.exports = mongoose.model('SocialStory', SocialStorySchema);
