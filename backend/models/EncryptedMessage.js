const mongoose = require('mongoose');

/**
 * EncryptedMessage Model - Phase 2 Feature
 * Stores encrypted message content with authentication tags
 * 
 * Fields:
 * - messageId: Reference to original Message
 * - senderId: Who sent this encrypted message
 * - recipientId: Who should decrypt this
 * - encryptedContent: AES-256-GCM encrypted message body
 * - contentIv: Initialization vector for encryption
 * - contentTag: Authentication tag (prevents tampering)
 * - keyFingerprint: Which encryption key was used
 * - algorithm: Encryption algorithm (AES-256-GCM)
 */

const encryptedMessageSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      unique: true,
      index: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // AES-256-GCM encryption
    encryptedContent: {
      type: String,
      required: true,
      description: 'Base64 encoded encrypted message body'
    },
    contentIv: {
      type: String,
      required: true,
      description: 'Base64 encoded initialization vector'
    },
    contentTag: {
      type: String,
      required: true,
      description: 'Base64 encoded authentication tag for integrity verification'
    },
    // Metadata for decryption
    keyFingerprint: {
      type: String,
      required: true,
      index: true,
      description: 'Fingerprint of key used for encryption'
    },
    algorithm: {
      type: String,
      enum: ['AES-256-GCM', 'ChaCha20-Poly1305'],
      default: 'AES-256-GCM',
      required: true
    },
    keyDerivation: {
      type: String,
      enum: ['PBKDF2', 'Argon2'],
      default: 'PBKDF2',
      description: 'KDF used for key derivation from passphrase (if applicable)'
    },
    // Metadata for end-to-end scenarios
    metadata: {
      senderDeviceId: mongoose.Schema.Types.ObjectId,
      recipientDeviceId: mongoose.Schema.Types.ObjectId,
      messageType: String, // 'text', 'media', 'reaction'
      isForwardedSecure: Boolean, // Message can be forwarded with key
      requiresAcknowledgment: Boolean
    },
    // Verification & integrity
    isVerified: {
      type: Boolean,
      default: false,
      description: 'Whether authentication tag was verified'
    },
    verifiedAt: Date,
    decryptedBy: [{
      userId: mongoose.Schema.Types.ObjectId,
      decryptedAt: Date,
      _id: false
    }],
    // Expiration for ephemeral encryption
    ephemeralUntil: Date,
    isEphemeral: {
      type: Boolean,
      default: false
    },
    // Phase 2 Statistics
    decryptionAttempts: {
      type: Number,
      default: 0
    },
    failedDecryptionAttempts: {
      type: Number,
      default: 0
    },
    lastDecryptAttemptAt: Date
  },
  {
    timestamps: true,
    collection: 'encrypted_messages'
  }
);

// Indexes
encryptedMessageSchema.index({ messageId: 1 });
encryptedMessageSchema.index({ senderId: 1, recipientId: 1 });
encryptedMessageSchema.index({ keyFingerprint: 1 });
encryptedMessageSchema.index({ createdAt: -1 });
encryptedMessageSchema.index({ ephemeralUntil: 1 }, { expireAfterSeconds: 0 });

// Phase 2 Static Methods

/**
 * Create encrypted message
 */
encryptedMessageSchema.statics.createEncrypted = async function(messageId, senderData) {
  try {
    const encrypted = new this({
      messageId: messageId,
      senderId: senderData.senderId,
      recipientId: senderData.recipientId,
      encryptedContent: senderData.encryptedContent,
      contentIv: senderData.contentIv,
      contentTag: senderData.contentTag,
      keyFingerprint: senderData.keyFingerprint,
      algorithm: senderData.algorithm || 'AES-256-GCM',
      metadata: senderData.metadata || {}
    });

    await encrypted.save();
    return encrypted;
  } catch (error) {
    throw error;
  }
};

/**
 * Find encrypted message by ID
 */
encryptedMessageSchema.statics.findEncrypted = async function(messageId) {
  return this.findOne({ messageId }).select('+encryptedContent');
};

/**
 * Get decryption data (IV, tag, content)
 */
encryptedMessageSchema.statics.getDecryptionData = async function(messageId) {
  const msg = await this.findOne({ messageId })
    .select('encryptedContent contentIv contentTag keyFingerprint algorithm');

  if (!msg) {
    return null;
  }

  return {
    encryptedContent: msg.encryptedContent,
    contentIv: msg.contentIv,
    contentTag: msg.contentTag,
    keyFingerprint: msg.keyFingerprint,
    algorithm: msg.algorithm
  };
};

/**
 * Record successful decryption
 */
encryptedMessageSchema.statics.recordDecryption = async function(messageId, userId) {
  return this.findOneAndUpdate(
    { messageId },
    {
      $inc: { decryptionAttempts: 1 },
      $set: {
        isVerified: true,
        verifiedAt: new Date(),
        lastDecryptAttemptAt: new Date()
      },
      $push: {
        decryptedBy: {
          userId,
          decryptedAt: new Date()
        }
      }
    },
    { new: true }
  );
};

/**
 * Record failed decryption
 */
encryptedMessageSchema.statics.recordFailedDecryption = async function(messageId) {
  return this.findOneAndUpdate(
    { messageId },
    {
      $inc: { failedDecryptionAttempts: 1 },
      $set: { lastDecryptAttemptAt: new Date() }
    },
    { new: true }
  );
};

// Phase 2 Instance Methods

/**
 * Check if message has valid authentication tag
 */
encryptedMessageSchema.methods.hasValidTag = function() {
  return !!(this.contentTag && this.contentIv && this.encryptedContent);
};

/**
 * Check if message is ephemeral and expired
 */
encryptedMessageSchema.methods.isExpired = function() {
  if (!this.isEphemeral || !this.ephemeralUntil) {
    return false;
  }
  return new Date() > this.ephemeralUntil;
};

/**
 * Mark as verified after successful decryption
 */
encryptedMessageSchema.methods.markVerified = function(userId) {
  this.isVerified = true;
  this.verifiedAt = new Date();
  this.decryptedBy.push({
    userId,
    decryptedAt: new Date()
  });
  return this.save();
};

/**
 * Get decryption info
 */
encryptedMessageSchema.methods.getDecryptionInfo = function() {
  return {
    encryptedContent: this.encryptedContent,
    contentIv: this.contentIv,
    contentTag: this.contentTag,
    keyFingerprint: this.keyFingerprint,
    algorithm: this.algorithm
  };
};

module.exports = mongoose.model('EncryptedMessage', encryptedMessageSchema);
