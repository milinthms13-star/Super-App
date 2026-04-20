const mongoose = require('mongoose');

const encryptionKeySchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    keyType: {
      type: String,
      enum: ['public', 'private'],
      required: true,
    },
    keyFormat: {
      type: String,
      enum: ['base64', 'hex', 'pem'],
      default: 'base64',
    },
    encryptedKey: {
      type: String,
      required: true,
    },
    keyFingerprint: {
      type: String,
      index: true,
    },
    algorithm: {
      type: String,
      enum: ['curve25519', 'rsa-4096', 'ed25519'],
      default: 'curve25519',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    rotatedAt: Date,
    expiresAt: Date,
    deviceId: String,
    // Metadata for key management
    metadata: {
      keyType: String, // e.g., 'ephemeral', 'long-term'
      version: Number,
      backupHash: String,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: one active key per user per chat
encryptionKeySchema.index({ userId: 1, chatId: 1, isActive: 1 });
encryptionKeySchema.index({ keyFingerprint: 1 });

// TTL index - auto delete expired keys after 1 year
encryptionKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 31536000 });

module.exports = mongoose.model('EncryptionKey', encryptionKeySchema);
