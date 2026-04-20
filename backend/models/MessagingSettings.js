const mongoose = require('mongoose');

const messagingSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Encryption settings
    encryption: {
      enabled: {
        type: Boolean,
        default: false,
      },
      algorithm: {
        type: String,
        enum: ['curve25519', 'rsa-4096', 'ed25519'],
        default: 'curve25519',
      },
      autoRotateKeys: {
        type: Boolean,
        default: true,
      },
      rotationIntervalDays: {
        type: Number,
        default: 30,
      },
      lastRotation: Date,
    },
    // File storage settings
    fileStorage: {
      enabled: {
        type: Boolean,
        default: true,
      },
      maxFileSize: Number, // in bytes, default 100MB
      allowedMimeTypes: [String],
      autoCompress: Boolean,
      compressionQuality: Number, // 0-100
      enableVirusScan: {
        type: Boolean,
        default: true,
      },
      retentionDays: {
        type: Number,
        default: 90,
      },
    },
    // AI settings
    ai: {
      enableSmartReplies: {
        type: Boolean,
        default: true,
      },
      suggestionTone: {
        type: String,
        enum: ['professional', 'casual', 'friendly', 'formal', 'humorous'],
        default: 'casual',
      },
      suggestionCount: {
        type: Number,
        default: 3,
        min: 1,
        max: 10,
      },
      enableAutoReply: Boolean,
      autoReplyTemplate: String,
      autoReplyContext: String,
    },
    // Call settings
    calls: {
      enableCalls: {
        type: Boolean,
        default: true,
      },
      enableVideoByDefault: Boolean,
      enableScreenShare: Boolean,
      enableRecording: Boolean,
      videoQuality: {
        type: String,
        enum: ['low', 'standard', 'high', 'hd'],
        default: 'standard',
      },
      enableCallHistory: {
        type: Boolean,
        default: true,
      },
      missedCallNotifications: {
        type: Boolean,
        default: true,
      },
    },
    // Notification settings
    notifications: {
      enableNotifications: {
        type: Boolean,
        default: true,
      },
      soundEnabled: Boolean,
      vibrationEnabled: Boolean,
      desktopNotifications: Boolean,
      mutedChats: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Chat',
        },
      ],
      notificationSound: {
        type: String,
        enum: ['default', 'chime', 'ping', 'pop', 'vibration'],
        default: 'default',
      },
    },
    // Privacy settings
    privacy: {
      showTypingIndicator: {
        type: Boolean,
        default: true,
      },
      showReadReceipts: {
        type: Boolean,
        default: true,
      },
      showLastSeen: {
        type: Boolean,
        default: true,
      },
      showOnlineStatus: {
        type: Boolean,
        default: true,
      },
      allowScreenCapture: {
        type: Boolean,
        default: false,
      },
    },
    // Performance settings
    performance: {
      enableMessageCaching: {
        type: Boolean,
        default: true,
      },
      cacheSizeLimit: Number, // in MB
      imagePreloading: Boolean,
      videoAutoplay: Boolean,
      reducedMotion: Boolean,
    },
    // Data retention
    dataRetention: {
      autoDeleteMessages: Boolean,
      deleteAfterDays: Number,
      archiveOldChats: Boolean,
      archiveAfterDays: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('MessagingSettings', messagingSettingsSchema);
