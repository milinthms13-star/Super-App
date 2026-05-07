const mongoose = require('mongoose');

/**
 * DiaryEncryptionKey Schema
 * Stores user encryption keys for E2EE
 * Each user has a unique key derived from master key + userId
 */
const diaryEncryptionKeySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    keyId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    // We don't store the actual key material here
    // keyId is used to identify which key version was used
    publicKeyFingerprint: {
      type: String, // SHA-256 hash of public key metadata
      required: true,
      index: true
    },
    keyVersion: {
      type: Number,
      default: 1,
      min: 1
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    rotatedAt: Date,
    rotatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // Backup of key for recovery (encrypted with user's master password)
    encryptedKeyBackup: {
      iv: String,
      authTag: String,
      encryptedContent: String
    },
    algorithm: {
      type: String,
      default: 'aes-256-gcm'
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    lastUsedAt: Date
  },
  { timestamps: true }
);

// Index for finding active keys
diaryEncryptionKeySchema.index({ userId: 1, isActive: 1 });

// Pre-save hook to update updatedAt
diaryEncryptionKeySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

/**
 * Mark previous keys as inactive when rotating
 */
diaryEncryptionKeySchema.statics.rotateKey = async function (userId, newKeyId, newFingerprint, newKeyBackup) {
  // Deactivate old keys
  await this.updateMany(
    { userId, isActive: true },
    { isActive: false, rotatedAt: Date.now() }
  );

  // Create new active key
  return this.create({
    userId,
    keyId: newKeyId,
    publicKeyFingerprint: newFingerprint,
    isActive: true,
    encryptedKeyBackup: newKeyBackup
  });
};

/**
 * Get active key for user
 */
diaryEncryptionKeySchema.statics.getActiveKey = async function (userId) {
  return this.findOne({ userId, isActive: true });
};

module.exports = mongoose.model('DiaryEncryptionKey', diaryEncryptionKeySchema);
