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
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      description: 'Phase 2: Device-specific keys'
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
      enum: ['curve25519', 'rsa-4096', 'ed25519', 'RSA-4096', 'ECDH-P256'],
      default: 'curve25519',
    },
    messageAlgorithm: {
      type: String,
      enum: ['AES-256-GCM', 'ChaCha20-Poly1305'],
      default: 'AES-256-GCM',
      description: 'Phase 2: Algorithm for message encryption'
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isPrimary: {
      type: Boolean,
      default: false,
      index: true,
      description: 'Phase 2: Primary key for user'
    },
    rotatedAt: Date,
    expiresAt: {
      type: Date,
      index: true,
      description: 'Phase 2: Key expiration (90 days)'
    },
    // Metadata for key management
    metadata: {
      keyType: String, // e.g., 'ephemeral', 'long-term'
      version: Number,
      backupHash: String,
      deviceName: String,
      osType: String
    },
    // Phase 2: Key sharing and rotation
    previousKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EncryptionKey'
    },
    // Phase 2: Usage statistics
    messagesEncrypted: {
      type: Number,
      default: 0
    },
    messagesDecrypted: {
      type: Number,
      default: 0
    },
    lastUsedAt: Date
  },
  {
    timestamps: true,
  }
);

// Unique index: one active key per user per chat
encryptionKeySchema.index({ userId: 1, chatId: 1, isActive: 1 });
// Phase 2: Index for device-specific keys
encryptionKeySchema.index({ userId: 1, deviceId: 1, isPrimary: 1 });
encryptionKeySchema.index({ keyFingerprint: 1 });

// TTL index - auto delete expired keys after 1 year
encryptionKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 31536000 });

// Phase 2 Static Methods

/**
 * Get active encryption key for user
 */
encryptionKeySchema.statics.getActiveKey = async function(userId, chatId) {
  return this.findOne({
    userId,
    chatId,
    isActive: true,
    $or: [
      { expiresAt: { $gt: new Date() } },
      { expiresAt: null }
    ]
  });
};

/**
 * Get primary device key for user
 */
encryptionKeySchema.statics.getPrimaryDeviceKey = async function(userId, deviceId) {
  return this.findOne({
    userId,
    deviceId,
    isPrimary: true,
    isActive: true,
    keyType: 'public'
  });
};

/**
 * Rotate encryption key
 */
encryptionKeySchema.statics.rotateKey = async function(userId, chatId, newKeyData) {
  try {
    // Get old primary key
    const oldKey = await this.findOne({
      userId,
      chatId,
      isPrimary: true
    });

    // Create new key
    const newKey = new this({
      userId,
      chatId,
      deviceId: newKeyData.deviceId,
      keyType: newKeyData.keyType,
      keyFormat: newKeyData.keyFormat,
      encryptedKey: newKeyData.encryptedKey,
      keyFingerprint: newKeyData.keyFingerprint,
      algorithm: newKeyData.algorithm,
      messageAlgorithm: newKeyData.messageAlgorithm || 'AES-256-GCM',
      isActive: true,
      isPrimary: true,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      previousKeyId: oldKey?._id,
      metadata: newKeyData.metadata
    });

    await newKey.save();

    // Deactivate old key
    if (oldKey) {
      oldKey.isPrimary = false;
      oldKey.rotatedAt = new Date();
      await oldKey.save();
    }

    return newKey;
  } catch (error) {
    throw error;
  }
};

// Phase 2 Instance Methods

/**
 * Check if key is expired
 */
encryptionKeySchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

/**
 * Get days until expiration
 */
encryptionKeySchema.methods.getDaysUntilExpiration = function() {
  if (!this.expiresAt) return null;
  const daysLeft = (this.expiresAt - new Date()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.floor(daysLeft));
};

/**
 * Record encryption usage
 */
encryptionKeySchema.methods.recordEncryption = function() {
  this.messagesEncrypted = (this.messagesEncrypted || 0) + 1;
  this.lastUsedAt = new Date();
};

/**
 * Record decryption usage
 */
encryptionKeySchema.methods.recordDecryption = function() {
  this.messagesDecrypted = (this.messagesDecrypted || 0) + 1;
  this.lastUsedAt = new Date();
};

module.exports = mongoose.model('EncryptionKey', encryptionKeySchema);
