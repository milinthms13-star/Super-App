/**
 * Data Encryption Key Model - Phase 10 Feature 9
 * Encryption key management and rotation
 */

const { Schema, model } = require('mongoose');

const DataEncryptionKeySchema = new Schema(
  {
    keyId: {
      type: String,
      unique: true,
      index: true,
      description: 'Unique encryption key ID',
    },
    keyName: {
      type: String,
      required: true,
      description: 'Human-readable name for the key',
    },
    keyType: {
      type: String,
      enum: ['aes-256', 'aes-128', 'rsa-2048', 'rsa-4096', 'ec-256', 'master_key'],
      required: true,
      description: 'Type of encryption key',
    },
    algorithm: {
      type: String,
      enum: ['AES', 'RSA', 'ECC', 'HMAC'],
      description: 'Encryption algorithm',
    },
    keySize: {
      type: Number,
      description: 'Key size in bits',
    },
    purpose: {
      type: String,
      enum: [
        'data_at_rest',
        'data_in_transit',
        'user_authentication',
        'payment_processing',
        'api_signing',
        'backup_encryption',
        'tokenization',
        'master_key',
      ],
      description: 'Purpose of this key',
    },
    keyMaterial: {
      type: String,
      description: 'Encrypted key material (stored securely)',
      select: false, // Don't return in queries by default
    },
    publicKey: {
      type: String,
      description: 'Public key material (for asymmetric algorithms)',
    },
    keyHash: {
      type: String,
      description: 'Hash of key for verification',
    },
    status: {
      type: String,
      enum: ['active', 'deprecated', 'rotated', 'compromised', 'revoked'],
      default: 'active',
      description: 'Current status of the key',
    },
    creationDate: {
      type: Date,
      default: Date.now,
      description: 'When key was created',
    },
    expiryDate: {
      type: Date,
      description: 'When key expires',
      index: true,
    },
    lastRotationDate: {
      type: Date,
      description: 'When key was last rotated',
    },
    nextRotationDate: {
      type: Date,
      description: 'When key is scheduled for next rotation',
      index: true,
    },
    rotationRequired: {
      type: Boolean,
      default: false,
    },
    usageLog: {
      type: [{
        usageDate: Date,
        operation: String, // encrypt, decrypt, sign, verify
        dataType: String, // what was encrypted
        operationStatus: String, // success, failure
        userId: String,
        ipAddress: String,
      }],
      default: [],
    },
    encryptedDataReferences: {
      type: [{
        dataId: String,
        dataType: String, // payment_info, user_data, etc.
        encryptionDate: Date,
        status: String, // encrypted, decrypted, rotated
      }],
      default: [],
    },
    keyUsageStatistics: {
      totalEncryptions: Number,
      totalDecryptions: Number,
      totalSignatures: Number,
      lastUsedDate: Date,
      usageFrequency: String, // high, medium, low, unused
    },
    backupInfo: {
      isBackedUp: Boolean,
      backupLocation: String,
      backupDate: Date,
      backupVerified: Boolean,
      backupEncrypted: Boolean,
    },
    accessControl: {
      allowedRoles: [String], // roles that can use this key
      allowedServices: [String], // services that can use this key
      requiresApproval: Boolean,
      approvalRoles: [String],
    },
    securityMetrics: {
      compromiseRisk: String, // low, medium, high
      lastSecurityAudit: Date,
      auditFinding: String,
      complianceStatus: String,
    },
    createdBy: {
      type: String,
      description: 'Admin who created this key',
    },
    revokedBy: {
      type: String,
      description: 'Admin who revoked this key (if applicable)',
    },
    revocationReason: {
      type: String,
      description: 'Reason for key revocation',
    },
    revocationDate: {
      type: Date,
      description: 'When key was revoked',
    },
    notes: {
      type: String,
      description: 'Additional notes about this key',
    },
  },
  { timestamps: true, collection: 'data_encryption_keys' }
);

// Indexes
DataEncryptionKeySchema.index({ status: 1 });
DataEncryptionKeySchema.index({ expiryDate: 1 });
DataEncryptionKeySchema.index({ nextRotationDate: 1 });
DataEncryptionKeySchema.index({ keyType: 1 });
DataEncryptionKeySchema.index({ purpose: 1 });

// Instance methods
DataEncryptionKeySchema.methods.markAsCompromised = function (reason, revokedBy) {
  this.status = 'compromised';
  this.revocationReason = reason;
  this.revokedBy = revokedBy;
  this.revocationDate = new Date();
};

DataEncryptionKeySchema.methods.rotateKey = function () {
  this.status = 'rotated';
  this.lastRotationDate = new Date();
  // New key should be created as separate document with this as predecessor
};

DataEncryptionKeySchema.methods.scheduleRotation = function (rotationDate) {
  this.nextRotationDate = rotationDate;
  this.rotationRequired = true;
};

DataEncryptionKeySchema.methods.logUsage = function (operation, dataType, status, userId, ipAddress) {
  this.usageLog.push({
    usageDate: new Date(),
    operation,
    dataType,
    operationStatus: status,
    userId,
    ipAddress,
  });
};

DataEncryptionKeySchema.methods.isExpired = function () {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
};

DataEncryptionKeySchema.methods.daysUntilExpiry = function () {
  if (!this.expiryDate) return null;
  const now = new Date();
  const diff = this.expiryDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

module.exports = model('DataEncryptionKey', DataEncryptionKeySchema);
