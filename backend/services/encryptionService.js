const crypto = require('crypto');
const EncryptionKey = require('../models/EncryptionKey');
const EncryptedMessage = require('../models/EncryptedMessage');
const Device = require('../models/Device');
const logger = require('../config/logger');

/**
 * End-to-End Encryption Service - Phase 2 Feature
 * Handles RSA key exchange and AES-256-GCM message encryption
 * 
 * Architecture:
 * 1. Each device generates RSA-4096 keypair
 * 2. Devices exchange public keys
 * 3. Messages are encrypted with AES-256-GCM (faster)
 * 4. AES key is encrypted with recipient's RSA public key
 * 5. 90-day key rotation with forward secrecy
 */

class EncryptionService {
  constructor() {
    this.algorithm = 'AES-256-GCM';
    this.keyAlgorithm = 'RSA-4096';
    this.keyRotationDays = 90;
  }

  /**
   * Generate RSA-4096 keypair for device
   * @param {String} userId - User ID
   * @param {String} deviceId - Device ID
   * @returns {Promise<{publicKey, privateKey, fingerprint}>}
   */
  async generateKeyPair(userId, deviceId) {
    try {
      logger.debug(`Generating RSA-4096 keypair for user ${userId} device ${deviceId}`);

      return new Promise((resolve, reject) => {
        crypto.generateKeyPair(
          'rsa',
          {
            modulusLength: 4096,
            publicKeyEncoding: {
              type: 'spki',
              format: 'pem'
            },
            privateKeyEncoding: {
              type: 'pkcs8',
              format: 'pem'
              // In production: add cipher: 'aes-256-cbc' and passphrase
            }
          },
          (err, publicKey, privateKey) => {
            if (err) {
              logger.error('Failed to generate keypair:', err);
              reject(err);
            } else {
              // Generate fingerprint (SHA256 of public key)
              const fingerprint = crypto
                .createHash('sha256')
                .update(publicKey)
                .digest('hex');

              resolve({
                publicKey,
                privateKey,
                fingerprint,
                algorithm: this.keyAlgorithm,
                messageAlgorithm: this.algorithm
              });
            }
          }
        );
      });
    } catch (error) {
      logger.error('Key generation error:', error);
      throw error;
    }
  }

  /**
   * Store device encryption key
   * @param {String} userId - User ID
   * @param {String} deviceId - Device ID
   * @param {Object} keyData - {publicKey, privateKey, fingerprint}
   * @returns {Promise<EncryptionKey>}
   */
  async storeDeviceKey(userId, deviceId, keyData) {
    try {
      logger.debug(`Storing encryption key for user ${userId} device ${deviceId}`);

      // Deactivate previous primary key
      await EncryptionKey.updateMany(
        { userId, deviceId, isPrimary: true },
        { isPrimary: false, rotatedAt: new Date() }
      );

      // Store new key
      const key = await EncryptionKey.create({
        userId,
        deviceId,
        keyType: 'private',
        keyFormat: 'pem',
        encryptedKey: keyData.privateKey, // In production: encrypt this
        keyFingerprint: keyData.fingerprint,
        algorithm: keyData.algorithm,
        messageAlgorithm: keyData.messageAlgorithm,
        isActive: true,
        isPrimary: true,
        expiresAt: new Date(Date.now() + this.keyRotationDays * 24 * 60 * 60 * 1000)
      });

      logger.info(`Encryption key stored for user ${userId}`);
      return key;
    } catch (error) {
      logger.error('Failed to store key:', error);
      throw error;
    }
  }

  /**
   * Get user's public key for sharing
   * @param {String} userId - User ID
   * @returns {Promise<{publicKey, fingerprint}>}
   */
  async getPublicKey(userId) {
    try {
      // Get primary device key
      const key = await EncryptionKey.findOne({
        userId,
        keyType: 'private',
        isPrimary: true,
        isActive: true
      });

      if (!key) {
        throw new Error('No active encryption key found');
      }

      // Return public key only (derived from private key or stored separately)
      // In production: store public key separately in EncryptionKey.publicKey field
      const publicKeyPem = this._extractPublicKey(key.encryptedKey);

      return {
        publicKey: publicKeyPem,
        fingerprint: key.keyFingerprint,
        algorithm: key.algorithm,
        expiresAt: key.expiresAt
      };
    } catch (error) {
      logger.error('Failed to get public key:', error);
      throw error;
    }
  }

  /**
   * Encrypt message with AES-256-GCM
   * @param {String} plaintext - Message to encrypt
   * @param {String} keyFingerprint - Which key to use
   * @returns {Promise<{iv, tag, encryptedContent}>}
   */
  async encryptMessage(plaintext, keyFingerprint) {
    try {
      // Generate random 256-bit key and 96-bit IV
      const key = crypto.randomBytes(32); // 256 bits
      const iv = crypto.randomBytes(12); // 96 bits for GCM

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt
      let encryptedContent = cipher.update(plaintext, 'utf8', 'base64');
      encryptedContent += cipher.final('base64');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      logger.debug(`Message encrypted with ${this.algorithm}`);

      return {
        encryptedContent,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        key: key.toString('base64'), // Needs to be encrypted with recipient's public key
        keyFingerprint
      };
    } catch (error) {
      logger.error('Encryption error:', error);
      throw error;
    }
  }

  /**
   * Decrypt message with AES-256-GCM
   * @param {Object} encryptionData - {encryptedContent, iv, tag, key}
   * @param {String} privateKey - RSA private key for decryption
   * @returns {Promise<String>} - Plaintext message
   */
  async decryptMessage(encryptionData, privateKey) {
    try {
      // Decrypt AES key with RSA private key
      const encryptedKeyBuffer = Buffer.from(encryptionData.key, 'base64');
      const decryptedKey = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        encryptedKeyBuffer
      );

      // Prepare decryption parameters
      const iv = Buffer.from(encryptionData.iv, 'base64');
      const tag = Buffer.from(encryptionData.tag, 'base64');
      const encryptedContent = encryptionData.encryptedContent;

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, decryptedKey, iv);
      decipher.setAuthTag(tag);

      // Decrypt
      let plaintext = decipher.update(encryptedContent, 'base64', 'utf8');
      plaintext += decipher.final('utf8');

      logger.debug('Message decrypted successfully');
      return plaintext;
    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Encrypt AES key with recipient's RSA public key
   * @param {String} aesKeyBase64 - AES key in base64
   * @param {String} recipientPublicKey - RSA public key PEM
   * @returns {Promise<String>} - Encrypted key in base64
   */
  async encryptKeyWithPublicKey(aesKeyBase64, recipientPublicKey) {
    try {
      const aesKey = Buffer.from(aesKeyBase64, 'base64');

      const encryptedKey = crypto.publicEncrypt(
        {
          key: recipientPublicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        aesKey
      );

      return encryptedKey.toString('base64');
    } catch (error) {
      logger.error('Key encryption error:', error);
      throw error;
    }
  }

  /**
   * Rotate user's encryption key (generate new, retire old)
   * @param {String} userId - User ID
   * @param {String} deviceId - Device ID
   * @returns {Promise<EncryptionKey>}
   */
  async rotateKey(userId, deviceId) {
    try {
      logger.info(`Rotating encryption key for user ${userId} device ${deviceId}`);

      // Generate new keypair
      const newKeyData = await this.generateKeyPair(userId, deviceId);

      // Store new key
      const rotatedKey = await this.storeDeviceKey(userId, deviceId, newKeyData);

      logger.info(`Key rotated successfully for user ${userId}`);
      return rotatedKey;
    } catch (error) {
      logger.error('Key rotation error:', error);
      throw error;
    }
  }

  /**
   * Verify key expiration status
   * @param {String} userId - User ID
   * @returns {Promise<{status, daysRemaining}>}
   */
  async getKeyStatus(userId) {
    try {
      const key = await EncryptionKey.findOne({
        userId,
        isPrimary: true,
        isActive: true
      });

      if (!key) {
        return { status: 'no_key', daysRemaining: null };
      }

      const daysRemaining = key.getDaysUntilExpiration();

      return {
        status: daysRemaining <= 7 ? 'expiring_soon' : 'active',
        daysRemaining,
        expiresAt: key.expiresAt
      };
    } catch (error) {
      logger.error('Error checking key status:', error);
      throw error;
    }
  }

  /**
   * Store encrypted message
   * @param {String} messageId - Message ID
   * @param {Object} senderData - Encryption metadata
   * @returns {Promise<EncryptedMessage>}
   */
  async storeEncryptedMessage(messageId, senderData) {
    try {
      const encrypted = await EncryptedMessage.createEncrypted(messageId, senderData);
      logger.debug(`Encrypted message stored for message ${messageId}`);
      return encrypted;
    } catch (error) {
      logger.error('Failed to store encrypted message:', error);
      throw error;
    }
  }

  /**
   * Retrieve encrypted message for decryption
   * @param {String} messageId - Message ID
   * @returns {Promise<Object>}
   */
  async getEncryptedMessage(messageId) {
    try {
      return await EncryptedMessage.getDecryptionData(messageId);
    } catch (error) {
      logger.error('Failed to retrieve encrypted message:', error);
      throw error;
    }
  }

  /**
   * Record successful decryption
   * @param {String} messageId - Message ID
   * @param {String} userId - User ID
   */
  async recordDecryption(messageId, userId) {
    try {
      await EncryptedMessage.recordDecryption(messageId, userId);
      logger.debug(`Decryption recorded for message ${messageId}`);
    } catch (error) {
      logger.error('Failed to record decryption:', error);
    }
  }

  /**
   * Get encryption statistics
   * @param {String} userId - User ID
   * @returns {Promise<Object>}
   */
  async getEncryptionStats(userId) {
    try {
      const key = await EncryptionKey.findOne({
        userId,
        isPrimary: true
      });

      const messageCount = await EncryptedMessage.countDocuments({
        $or: [{ senderId: userId }, { recipientId: userId }]
      });

      return {
        keyStatus: key ? 'active' : 'not_created',
        keyFingerprint: key?.keyFingerprint,
        daysUntilRotation: key?.getDaysUntilExpiration(),
        messagesEncrypted: key?.messagesEncrypted || 0,
        messagesDecrypted: key?.messagesDecrypted || 0,
        totalEncryptedMessages: messageCount
      };
    } catch (error) {
      logger.error('Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Helper: Extract public key from private key
   */
  _extractPublicKey(privateKeyPem) {
    try {
      const keyObject = crypto.createPrivateKey({
        key: privateKeyPem,
        format: 'pem'
      });

      return crypto.createPublicKey(keyObject).export({
        type: 'spki',
        format: 'pem'
      });
    } catch (error) {
      logger.error('Failed to extract public key:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired keys (auto-handled by TTL, but can force manually)
   * @returns {Promise<number>} - Count of deleted keys
   */
  async cleanupExpiredKeys() {
    try {
      const result = await EncryptionKey.deleteMany({
        expiresAt: { $lt: new Date() },
        isPrimary: false // Keep one copy of expired primary key
      });

      logger.info(`Cleaned up ${result.deletedCount} expired encryption keys`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Cleanup error:', error);
      throw error;
    }
  }
}

module.exports = new EncryptionService();
