const mongoose = require('mongoose');

const SocialPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    images: [
      {
        url: {
          type: String,
          trim: true,
        },
        fileId: {
          type: String,
          default: null,
        },
        caption: {
          type: String,
          default: '',
        },
      },
    ],
    videos: [
      {
        url: {
          type: String,
          trim: true,
        },
        fileId: {
          type: String,
          default: null,
        },
        thumbnail: String,
        duration: Number,
      },
    ],
    privacy: {
      type: String,
      enum: ['public', 'private', 'friends', 'custom'],
      default: 'public',
    },
    allowedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    likes: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reactionType: {
          type: String,
          enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'],
          default: 'like',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    likeCount: {
      type: Number,
      default: 0,
      index: true,
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SocialComment',
      },
    ],
    commentCount: {
      type: Number,
      default: 0,
    },
    shares: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    shareCount: {
      type: Number,
      default: 0,
    },
    saves: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        savedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    hashtags: [String],
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    location: {
      type: String,
      default: '',
    },
    tags: [String],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    isDeleted: {
      type: Boolean,
      default: false,
    },
    reports: [
      {
        userId: {
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
    reportCount: {
      type: Number,
      default: 0,
    },
    visibility: {
      type: String,
      enum: ['visible', 'hidden', 'archived'],
      default: 'visible',
    },
    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    sharedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialPost',
      default: null,
    },
  },
  {
    timestamps: true,
    index: [
      { author: 1, createdAt: -1 },
      { createdAt: -1 },
      { hashtags: 1 },
    ],
  }
);

module.exports = mongoose.model('SocialPost', SocialPostSchema);
