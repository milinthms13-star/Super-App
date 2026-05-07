const mongoose = require('mongoose');

/**
 * DiaryBackup Schema
 * Stores cloud backups of diary entries for recovery
 * Includes encrypted entry snapshots
 */
const diaryBackupSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    backupId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    backupType: {
      type: String,
      enum: ['manual', 'scheduled', 'auto-recovery'],
      default: 'manual'
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'failed', 'archived'],
      default: 'pending',
      index: true
    },
    // Number of entries in backup
    entryCount: {
      type: Number,
      default: 0
    },
    // Total size in bytes (approximate)
    backupSize: {
      type: Number,
      default: 0
    },
    // Compressed backup data (encrypted)
    backupData: {
      iv: String,
      authTag: String,
      encryptedContent: String,
      algorithm: String,
      compressionMethod: {
        type: String,
        enum: ['gzip', 'brotli', 'none'],
        default: 'gzip'
      }
    },
    // Metadata
    backupStartedAt: Date,
    completedAt: Date,
    // Recovery window (when backup can be restored from)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      index: true
    },
    // Hash for integrity verification
    integrityHash: String,
    // Restore history
    restoreHistory: [{
      restoredAt: Date,
      restoredEntryCount: Number,
      restoredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    // Failure details if status is 'failed'
    errorMessage: String,
    errorStack: String,
    // Scheduling info
    isScheduled: {
      type: Boolean,
      default: false
    },
    scheduleFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Index for backup queries
diaryBackupSchema.index({ userId: 1, status: 1, createdAt: -1 });
diaryBackupSchema.index({ userId: 1, backupType: 1 });

// TTL index: auto-delete archived backups after expiry
diaryBackupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save hook
diaryBackupSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

/**
 * Static method to create scheduled backup
 */
diaryBackupSchema.statics.createScheduledBackup = async function (userId, frequency = 'weekly') {
  return this.create({
    userId,
    backupType: 'scheduled',
    isScheduled: true,
    scheduleFrequency: frequency,
    backupId: `backup-${userId}-${Date.now()}`
  });
};

/**
 * Static method to get latest backup
 */
diaryBackupSchema.statics.getLatestBackup = async function (userId) {
  return this.findOne({ userId, status: 'completed' })
    .sort({ completedAt: -1 })
    .limit(1);
};

/**
 * Static method to get active backups (not expired)
 */
diaryBackupSchema.statics.getActiveBackups = async function (userId) {
  return this.find({
    userId,
    status: 'completed',
    expiresAt: { $gt: Date.now() }
  }).sort({ completedAt: -1 });
};

/**
 * Add restore entry to history
 */
diaryBackupSchema.methods.addRestoreRecord = async function (entryCount, restoredBy) {
  this.restoreHistory.push({
    restoredAt: Date.now(),
    restoredEntryCount: entryCount,
    restoredBy: restoredBy
  });
  return this.save();
};

module.exports = mongoose.model('DiaryBackup', diaryBackupSchema);
