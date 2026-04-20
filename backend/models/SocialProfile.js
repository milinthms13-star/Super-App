const mongoose = require('mongoose');

const SocialProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    profilePhoto: {
      url: String,
      fileId: String,
      uploadedAt: Date,
    },
    coverPhoto: {
      url: String,
      fileId: String,
      uploadedAt: Date,
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    interests: [String],
    profession: String,
    company: String,
    education: String,
    isVerified: {
      type: Boolean,
      default: false,
    },
    isBusiness: {
      type: Boolean,
      default: false,
    },
    isCreator: {
      type: Boolean,
      default: false,
    },
    followerCount: {
      type: Number,
      default: 0,
      index: true,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    postCount: {
      type: Number,
      default: 0,
    },
    engagementScore: {
      type: Number,
      default: 0,
      index: true,
    },
    creatorStats: {
      totalReach: {
        type: Number,
        default: 0,
      },
      engagementRate: {
        type: Number,
        default: 0,
      },
      totalEarnings: {
        type: Number,
        default: 0,
      },
    },
    socialLinks: [
      {
        platform: {
          type: String,
          enum: [
            'instagram',
            'twitter',
            'facebook',
            'youtube',
            'tiktok',
            'linkedin',
          ],
        },
        url: String,
      },
    ],
    privacySettings: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private', 'friends_only'],
        default: 'public',
      },
      allowMessages: {
        type: Boolean,
        default: true,
      },
      allowComments: {
        type: Boolean,
        default: true,
      },
      showActivity: {
        type: Boolean,
        default: true,
      },
      showOnlineStatus: {
        type: Boolean,
        default: true,
      },
    },
    notificationPreferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
      messageNotifications: {
        type: Boolean,
        default: true,
      },
      followNotifications: {
        type: Boolean,
        default: true,
      },
      likeNotifications: {
        type: Boolean,
        default: true,
      },
      commentNotifications: {
        type: Boolean,
        default: true,
      },
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    badges: [
      {
        name: String,
        icon: String,
        awardedAt: Date,
      },
    ],
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto',
    },
  },
  {
    timestamps: true,
    index: [
      { username: 1 },
      { isVerified: 1, followerCount: -1 },
      { followerCount: -1 },
    ],
  }
);

module.exports = mongoose.model('SocialProfile', SocialProfileSchema);
