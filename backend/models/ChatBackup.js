const mongoose = require('mongoose');

const chatBackupSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
    },
    backupType: {
      type: String,
      enum: ['single-chat', 'all-chats', 'archive'],
      default: 'single-chat',
    },
    backupName: String,
    backupDescription: String,
    messageCount: {
      type: Number,
      default: 0,
    },
    mediaCount: {
      type: Number,
      default: 0,
    },
    backupSize: {
      type: Number,
      default: 0,
    },
    storageLocation: {
      type: String,
      required: true,
    },
    storageProvider: {
      type: String,
      enum: ['local', 's3', 'gcs', 'azure'],
      default: 'local',
    },
    backupFormat: {
      type: String,
      enum: ['json', 'csv', 'zip', 'encrypted-zip'],
      default: 'json',
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    encryptionMethod: {
      type: String,
      enum: ['aes-256-gcm', 'aes-256-cbc'],
    },
    compressionMethod: {
      type: String,
      enum: ['gzip', 'bzip2', 'xz'],
    },
    metadata: {
      sourceChats: [mongoose.Schema.Types.ObjectId],
      dateRange: {
        from: Date,
        to: Date,
      },
      includeMedia: Boolean,
      includeReactions: Boolean,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'failed', 'archived'],
      default: 'pending',
      index: true,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    completedAt: Date,
    expiresAt: {
      type: Date,
      index: true,
    },
    autoBackup: {
      enabled: Boolean,
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
      },
    },
    retentionDays: {
      type: Number,
      default: 90,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationHash: String,
  },
  {
    timestamps: true,
  }
);

// TTL index - auto-delete old backups based on retention policy
chatBackupSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 7776000, // 90 days default
    partialFilterExpression: { status: 'archived' },
  }
);

// Additional indexes
chatBackupSchema.index({ userId: 1, createdAt: -1 });
chatBackupSchema.index({ userId: 1, status: 1 });
chatBackupSchema.index({ chatId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatBackup', chatBackupSchema);
