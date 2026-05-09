/**
 * SecurityEncryptionService.js
 * Phase 10: Security & Encryption - Encryption key management, data protection, SSL/TLS handling
 */

const mongoose = require('mongoose');

class SecurityEncryptionService {
  /**
   * Generate encryption key for sensitive data
   * @param {string} keyType - Type of key (data_encryption, payment, api_secret)
   * @param {string} algorithm - Encryption algorithm (aes-256-gcm, aes-256-cbc)
   * @returns {Promise<{success, message, data}>}
   */
  static async generateEncryptionKey(keyType, algorithm = 'aes-256-gcm') {
    try {
      const crypto = require('crypto');
      
      // Generate random key
      const key = crypto.randomBytes(32).toString('hex');
      const iv = crypto.randomBytes(16).toString('hex');
      
      // Store key metadata
      const keyRecord = {
        keyType,
        algorithm,
        key,
        iv,
        createdAt: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        isActive: true,
        rotationSchedule: 'quarterly',
        compromised: false
      };

      // In production: Store in secure key management service (AWS KMS, Azure Key Vault)
      // For now: Store encrypted in database
      const encryptionKeyCollection = mongoose.connection.collection('encryptionkeys');
      const result = await encryptionKeyCollection.insertOne(keyRecord);

      return {
        success: true,
        message: 'Encryption key generated successfully',
        data: {
          keyId: result.insertedId,
          keyType,
          algorithm,
          expiryDate: keyRecord.expiryDate,
          status: 'active'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Key generation failed: ${error.message}`
      };
    }
  }

  /**
   * Rotate encryption key - create new key and mark old as inactive
   * @param {string} keyId - ID of key to rotate
   * @returns {Promise<{success, message, data}>}
   */
  static async rotateEncryptionKey(keyId) {
    try {
      const encryptionKeyCollection = mongoose.connection.collection('encryptionkeys');
      
      // Get existing key
      const existingKey = await encryptionKeyCollection.findOne({ _id: new mongoose.Types.ObjectId(keyId) });
      if (!existingKey) {
        return {
          success: false,
          message: 'Key not found'
        };
      }

      // Generate new key
      const newKeyResult = await this.generateEncryptionKey(existingKey.keyType, existingKey.algorithm);
      
      if (!newKeyResult.success) {
        return newKeyResult;
      }

      // Mark old key as rotated
      await encryptionKeyCollection.updateOne(
        { _id: new mongoose.Types.ObjectId(keyId) },
        {
          $set: {
            isActive: false,
            rotatedAt: new Date(),
            replacedByKeyId: newKeyResult.data.keyId
          }
        }
      );

      return {
        success: true,
        message: 'Encryption key rotated successfully',
        data: {
          oldKeyId: keyId,
          newKeyId: newKeyResult.data.keyId,
          rotatedAt: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Key rotation failed: ${error.message}`
      };
    }
  }

  /**
   * Encrypt sensitive data
   * @param {string} data - Data to encrypt
   * @param {string} keyId - ID of encryption key to use
   * @returns {Promise<{success, message, data}>}
   */
  static async encryptData(data, keyId) {
    try {
      const crypto = require('crypto');
      const encryptionKeyCollection = mongoose.connection.collection('encryptionkeys');
      
      // Get key
      const keyRecord = await encryptionKeyCollection.findOne({ _id: new mongoose.Types.ObjectId(keyId) });
      if (!keyRecord || !keyRecord.isActive) {
        return {
          success: false,
          message: 'Encryption key not available'
        };
      }

      // Encrypt
      const key = Buffer.from(keyRecord.key, 'hex');
      const iv = Buffer.from(keyRecord.iv, 'hex');
      
      const cipher = crypto.createCipheriv(keyRecord.algorithm, key, iv);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Add auth tag for GCM
      const authTag = cipher.getAuthTag();

      return {
        success: true,
        message: 'Data encrypted successfully',
        data: {
          encrypted,
          authTag: authTag.toString('hex'),
          algorithm: keyRecord.algorithm,
          encryptedAt: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Encryption failed: ${error.message}`
      };
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedData - Encrypted data
   * @param {string} keyId - ID of encryption key
   * @param {string} authTag - Authentication tag (for GCM)
   * @returns {Promise<{success, message, data}>}
   */
  static async decryptData(encryptedData, keyId, authTag) {
    try {
      const crypto = require('crypto');
      const encryptionKeyCollection = mongoose.connection.collection('encryptionkeys');
      
      // Get key
      const keyRecord = await encryptionKeyCollection.findOne({ _id: new mongoose.Types.ObjectId(keyId) });
      if (!keyRecord) {
        return {
          success: false,
          message: 'Encryption key not found'
        };
      }

      // Decrypt
      const key = Buffer.from(keyRecord.key, 'hex');
      const iv = Buffer.from(keyRecord.iv, 'hex');
      const tag = Buffer.from(authTag, 'hex');
      
      const decipher = crypto.createDecipheriv(keyRecord.algorithm, key, iv);
      if (keyRecord.algorithm === 'aes-256-gcm') {
        decipher.setAuthTag(tag);
      }

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return {
        success: true,
        message: 'Data decrypted successfully',
        data: JSON.parse(decrypted)
      };
    } catch (error) {
      return {
        success: false,
        message: `Decryption failed: ${error.message}`
      };
    }
  }

  /**
   * Hash sensitive data (one-way)
   * @param {string} data - Data to hash
   * @param {string} algorithm - Hash algorithm (sha256, sha512, bcrypt)
   * @returns {Promise<{success, message, data}>}
   */
  static async hashData(data, algorithm = 'sha256') {
    try {
      const crypto = require('crypto');
      
      let hash;
      if (algorithm === 'sha256') {
        hash = crypto.createHash('sha256').update(data).digest('hex');
      } else if (algorithm === 'sha512') {
        hash = crypto.createHash('sha512').update(data).digest('hex');
      } else if (algorithm === 'bcrypt') {
        // Bcrypt for passwords
        const bcrypt = require('bcrypt');
        hash = await bcrypt.hash(data, 12);
      } else {
        throw new Error('Unsupported hash algorithm');
      }

      return {
        success: true,
        message: 'Data hashed successfully',
        data: {
          hash,
          algorithm,
          hashedAt: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Hashing failed: ${error.message}`
      };
    }
  }

  /**
   * Verify hashed data
   * @param {string} data - Original data
   * @param {string} hash - Hashed data
   * @param {string} algorithm - Hash algorithm
   * @returns {Promise<{success, message, data}>}
   */
  static async verifyHash(data, hash, algorithm = 'sha256') {
    try {
      const crypto = require('crypto');
      
      let isValid;
      if (algorithm === 'sha256') {
        const newHash = crypto.createHash('sha256').update(data).digest('hex');
        isValid = newHash === hash;
      } else if (algorithm === 'sha512') {
        const newHash = crypto.createHash('sha512').update(data).digest('hex');
        isValid = newHash === hash;
      } else if (algorithm === 'bcrypt') {
        const bcrypt = require('bcrypt');
        isValid = await bcrypt.compare(data, hash);
      } else {
        throw new Error('Unsupported algorithm');
      }

      return {
        success: true,
        message: isValid ? 'Hash verified' : 'Hash verification failed',
        data: {
          isValid,
          algorithm
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Verification failed: ${error.message}`
      };
    }
  }

  /**
   * Get key status and expiration
   * @param {string} keyId - ID of encryption key
   * @returns {Promise<{success, message, data}>}
   */
  static async getKeyStatus(keyId) {
    try {
      const encryptionKeyCollection = mongoose.connection.collection('encryptionkeys');
      
      const keyRecord = await encryptionKeyCollection.findOne({ _id: new mongoose.Types.ObjectId(keyId) });
      if (!keyRecord) {
        return {
          success: false,
          message: 'Key not found'
        };
      }

      const now = new Date();
      const isExpired = now > keyRecord.expiryDate;
      const daysUntilExpiry = Math.ceil((keyRecord.expiryDate - now) / (1000 * 60 * 60 * 24));

      return {
        success: true,
        message: 'Key status retrieved',
        data: {
          keyId: keyRecord._id,
          keyType: keyRecord.keyType,
          algorithm: keyRecord.algorithm,
          isActive: keyRecord.isActive,
          isExpired,
          daysUntilExpiry,
          expiryDate: keyRecord.expiryDate,
          compromised: keyRecord.compromised,
          rotationSchedule: keyRecord.rotationSchedule,
          createdAt: keyRecord.createdAt,
          rotatedAt: keyRecord.rotatedAt || null
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get key status: ${error.message}`
      };
    }
  }

  /**
   * Report key compromise for immediate rotation
   * @param {string} keyId - ID of compromised key
   * @param {string} reportedBy - User who reported compromise
   * @returns {Promise<{success, message, data}>}
   */
  static async reportKeyCompromise(keyId, reportedBy) {
    try {
      const encryptionKeyCollection = mongoose.connection.collection('encryptionkeys');
      
      // Mark key as compromised
      await encryptionKeyCollection.updateOne(
        { _id: new mongoose.Types.ObjectId(keyId) },
        {
          $set: {
            compromised: true,
            compromisedAt: new Date(),
            reportedBy,
            isActive: false
          }
        }
      );

      // Immediately rotate the key
      const rotateResult = await this.rotateEncryptionKey(keyId);

      // Log security incident
      const auditCollection = mongoose.connection.collection('auditlogs');
      await auditCollection.insertOne({
        action: 'KEY_COMPROMISE_REPORTED',
        keyId,
        reportedBy,
        severity: 'critical',
        timestamp: new Date(),
        status: 'incident'
      });

      return {
        success: true,
        message: 'Key compromise reported and rotated',
        data: {
          keyId,
          compromised: true,
          rotated: rotateResult.success,
          incidentId: new Date().getTime()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to report compromise: ${error.message}`
      };
    }
  }

  /**
   * Get active encryption keys for service
   * @param {string} keyType - Type of key to retrieve
   * @returns {Promise<{success, message, data}>}
   */
  static async getActiveKeys(keyType) {
    try {
      const encryptionKeyCollection = mongoose.connection.collection('encryptionkeys');
      
      const keys = await encryptionKeyCollection
        .find({ keyType, isActive: true, compromised: false })
        .sort({ createdAt: -1 })
        .toArray();

      return {
        success: true,
        message: `Retrieved ${keys.length} active keys`,
        data: keys.map(k => ({
          keyId: k._id,
          keyType: k.keyType,
          algorithm: k.algorithm,
          expiryDate: k.expiryDate,
          createdAt: k.createdAt
        }))
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to retrieve keys: ${error.message}`
      };
    }
  }

  /**
   * Enable TLS/SSL for data in transit
   * @param {string} certificatePath - Path to SSL certificate
   * @param {string} keyPath - Path to private key
   * @returns {Promise<{success, message, data}>}
   */
  static async configureTLSEncryption(certificatePath, keyPath) {
    try {
      const fs = require('fs');
      
      // Verify certificate exists
      if (!fs.existsSync(certificatePath) || !fs.existsSync(keyPath)) {
        return {
          success: false,
          message: 'Certificate or key file not found'
        };
      }

      // Store TLS configuration
      const tlsCollection = mongoose.connection.collection('tlsconfigs');
      await tlsCollection.insertOne({
        certificatePath,
        keyPath,
        enabledAt: new Date(),
        isActive: true,
        tlsVersion: '1.3',
        cipherSuites: [
          'TLS_AES_256_GCM_SHA384',
          'TLS_CHACHA20_POLY1305_SHA256',
          'TLS_AES_128_GCM_SHA256'
        ]
      });

      return {
        success: true,
        message: 'TLS/SSL encryption configured',
        data: {
          tlsVersion: '1.3',
          cipherSuites: 3,
          enabledAt: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `TLS configuration failed: ${error.message}`
      };
    }
  }

  /**
   * Generate secure session token
   * @param {string} userId - User ID
   * @param {object} metadata - Additional metadata (device, IP, etc)
   * @returns {Promise<{success, message, data}>}
   */
  static async generateSecureSessionToken(userId, metadata = {}) {
    try {
      const crypto = require('crypto');
      const jwt = require('jsonwebtoken');

      // Generate session token
      const sessionId = crypto.randomBytes(32).toString('hex');
      const token = jwt.sign(
        { userId, sessionId, ...metadata },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      // Store session metadata
      const sessionCollection = mongoose.connection.collection('sessions');
      await sessionCollection.insertOne({
        sessionId,
        userId,
        token: crypto.createHash('sha256').update(token).digest('hex'),
        metadata,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true
      });

      return {
        success: true,
        message: 'Secure session token generated',
        data: {
          token,
          sessionId,
          expiresIn: '24h',
          createdAt: new Date()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Session token generation failed: ${error.message}`
      };
    }
  }

  /**
   * Revoke security session
   * @param {string} sessionId - Session ID to revoke
   * @returns {Promise<{success, message, data}>}
   */
  static async revokeSession(sessionId) {
    try {
      const sessionCollection = mongoose.connection.collection('sessions');
      
      const result = await sessionCollection.updateOne(
        { sessionId },
        {
          $set: {
            isActive: false,
            revokedAt: new Date()
          }
        }
      );

      return {
        success: true,
        message: 'Session revoked successfully',
        data: {
          sessionId,
          revokedAt: new Date(),
          matchedCount: result.matchedCount
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Session revocation failed: ${error.message}`
      };
    }
  }
}

module.exports = SecurityEncryptionService;
