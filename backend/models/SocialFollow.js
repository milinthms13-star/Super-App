const mongoose = require('mongoose');

const SocialFollowSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['following', 'pending', 'blocked'],
      default: 'following',
    },
    blockedBy: {
      type: String,
      enum: ['follower', 'following', 'none'],
      default: 'none',
    },
    notifications: {
      enabled: {
        type: Boolean,
        default: true,
      },
      postNotifications: {
        type: Boolean,
        default: true,
      },
      storyNotifications: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    index: [
      { follower: 1, following: 1, unique: true },
      { follower: 1 },
      { following: 1 },
    ],
  }
);

module.exports = mongoose.model('SocialFollow', SocialFollowSchema);
