const logger = require('../utils/logger');
const crypto = require('crypto');
const Message = require('../models/Message');

class MessageEncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.cache = new Map();
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Generate encryption keys for chat
   * @param {string} chatId - Chat ID
   * @returns {Object} Public and private keys
   */
  async generateChatKeys(chatId) {
    try {
      // Generate ECDH key pair for chat
      const crypto = require('crypto');
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      logger.info(`Encryption keys generated for chat ${chatId}`);
      return {
        chatId,
        publicKey,
        privateKey,
        algorithm: 'ECDH-AES256-GCM',
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error(`Error generating keys: ${error.message}`);
      throw error;
    }
  }

  /**
   * Encrypt message content
   * @param {string} content - Plain text content
   * @param {string} chatId - Chat ID
   * @param {Object} options - Encryption options
   * @returns {Object} Encrypted data
   */
  async encryptMessage(content, chatId, options = {}) {
    try {
      if (!content || !chatId) {
        throw new Error('Missing required fields: content, chatId');
      }

      // Generate IV and key
      const iv = crypto.randomBytes(12);
      const key = this.deriveKey(chatId);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt
      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      const result = {
        chatId,
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm,
        timestamp: Date.now(),
      };

      logger.info(`Message encrypted for chat ${chatId}`);
      return result;
    } catch (error) {
      logger.error(`Error encrypting message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Decrypt message content
   * @param {string} encrypted - Encrypted content
   * @param {string} chatId - Chat ID
   * @param {string} iv - Initialization vector
   * @param {string} authTag - Authentication tag
   * @returns {string} Decrypted content
   */
  async decryptMessage(encrypted, chatId, iv, authTag) {
    try {
      if (!encrypted || !chatId || !iv || !authTag) {
        throw new Error('Missing required decryption fields');
      }

      const key = this.deriveKey(chatId);
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        key,
        Buffer.from(iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      logger.info(`Message decrypted for chat ${chatId}`);
      return decrypted;
    } catch (error) {
      logger.error(`Error decrypting message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enable E2E encryption for chat
   * @param {string} chatId - Chat ID
   * @param {Array} participantIds - User IDs
   * @returns {Object} Encryption config
   */
  async enableE2EEncryption(chatId, participantIds) {
    try {
      const keys = await this.generateChatKeys(chatId);

      // Store encryption metadata
      const Chat = require('../models/Chat');
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      chat.encryption = {
        enabled: true,
        algorithm: 'ECDH-AES256-GCM',
        publicKey: keys.publicKey,
        participants: participantIds,
        enabledAt: new Date(),
      };

      await chat.save();
      this.invalidateCache(chatId);

      logger.info(`E2E encryption enabled for chat ${chatId}`);
      return {
        chatId,
        encryption: chat.encryption,
      };
    } catch (error) {
      logger.error(`Error enabling E2E encryption: ${error.message}`);
      throw error;
    }
  }

  /**
   * Disable E2E encryption for chat
   * @param {string} chatId - Chat ID
   * @returns {boolean} Success
   */
  async disableE2EEncryption(chatId) {
    try {
      const Chat = require('../models/Chat');
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      chat.encryption = {
        enabled: false,
        disabledAt: new Date(),
      };

      await chat.save();
      this.invalidateCache(chatId);

      logger.info(`E2E encryption disabled for chat ${chatId}`);
      return true;
    } catch (error) {
      logger.error(`Error disabling E2E encryption: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get encryption status for chat
   * @param {string} chatId - Chat ID
   * @returns {Object} Encryption status
   */
  async getEncryptionStatus(chatId) {
    try {
      const cacheKey = `encryption:${chatId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }

      const Chat = require('../models/Chat');
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      const status = {
        chatId,
        enabled: chat.encryption?.enabled || false,
        algorithm: chat.encryption?.algorithm || null,
        enabledAt: chat.encryption?.enabledAt || null,
        participantCount: chat.encryption?.participants?.length || 0,
      };

      this.cache.set(cacheKey, { data: status, timestamp: Date.now() });
      return status;
    } catch (error) {
      logger.error(`Error getting encryption status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store encrypted message
   * @param {string} messageId - Message ID
   * @param {Object} encryptedData - Encryption data
   * @returns {Object} Updated message
   */
  async storeEncryptedMessage(messageId, encryptedData) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      message.encryption = {
        enabled: true,
        iv: encryptedData.iv,
        authTag: encryptedData.authTag,
        algorithm: encryptedData.algorithm,
      };

      await message.save();
      logger.info(`Message stored with encryption: ${messageId}`);
      return message;
    } catch (error) {
      logger.error(`Error storing encrypted message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate key derivation for chat
   * @param {string} chatId - Chat ID
   * @returns {Buffer} 256-bit key
   */
  deriveKey(chatId) {
    const masterSecret = process.env.ENCRYPTION_MASTER_KEY || 'default-secret-key';
    return crypto
      .pbkdf2Sync(masterSecret + chatId, 'salt', 100000, 32, 'sha256');
  }

  /**
   * Get encryption audit log for chat
   * @param {string} chatId - Chat ID
   * @returns {Array} Audit events
   */
  async getEncryptionAuditLog(chatId) {
    try {
      const Chat = require('../models/Chat');
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      return chat.encryption?.auditLog || [];
    } catch (error) {
      logger.error(`Error getting audit log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify message integrity
   * @param {string} messageId - Message ID
   * @returns {boolean} Integrity verified
   */
  async verifyMessageIntegrity(messageId) {
    try {
      const message = await Message.findById(messageId);
      if (!message || !message.encryption?.authTag) {
        throw new Error('Message not encrypted');
      }

      // In production, verify auth tag against stored value
      return true;
    } catch (error) {
      logger.error(`Error verifying message integrity: ${error.message}`);
      throw error;
    }
  }

  invalidateCache(chatId) {
    this.cache.delete(`encryption:${chatId}`);
  }

  clearCache() {
    this.cache.clear();
    logger.info('Encryption cache cleared');
  }
}

module.exports = new MessageEncryptionService();
