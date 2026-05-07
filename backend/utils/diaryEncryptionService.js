const crypto = require('crypto');

/**
 * Encryption utility for diary entries
 * Uses AES-256-GCM for authenticated encryption
 */

class DiaryEncryptionService {
  constructor(masterKey) {
    // Master key should be 32 bytes for AES-256
    // In production, store securely in environment or key management service
    this.masterKey = masterKey || process.env.DIARY_MASTER_KEY;
    if (!this.masterKey) {
      throw new Error('DIARY_MASTER_KEY not configured');
    }
    // Ensure key is 32 bytes
    this.masterKeyBuffer = crypto.scryptSync(this.masterKey, 'salt', 32);
  }

  /**
   * Generate a user-specific encryption key
   * @param {string} userId - User ID
   * @returns {Object} - { key: Buffer, keyId: string }
   */
  generateUserKey(userId) {
    const keyId = crypto.randomBytes(8).toString('hex');
    // Derive user key from master key + userId
    const userKey = crypto.scryptSync(
      this.masterKey + userId,
      'user-salt-' + userId,
      32
    );
    return { key: userKey, keyId };
  }

  /**
   * Encrypt content using AES-256-GCM
   * @param {string} content - Plain text content
   * @param {Buffer} userKey - User encryption key
   * @returns {Object} - { iv: hex, authTag: hex, encryptedContent: hex, algorithm: string }
   */
  encryptContent(content, userKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', userKey, iv);

    let encryptedContent = cipher.update(content, 'utf8', 'hex');
    encryptedContent += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encryptedContent: encryptedContent,
      algorithm: 'aes-256-gcm'
    };
  }

  /**
   * Decrypt content using AES-256-GCM
   * @param {Object} encrypted - { iv, authTag, encryptedContent }
   * @param {Buffer} userKey - User encryption key
   * @returns {string} - Decrypted content
   */
  decryptContent(encrypted, userKey) {
    try {
      const { iv, authTag, encryptedContent } = encrypted;

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        userKey,
        Buffer.from(iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt entire entry object
   * @param {Object} entryData - { title, content, mood, category, tags }
   * @param {Buffer} userKey - User encryption key
   * @returns {Object} - Encrypted entry data
   */
  encryptEntry(entryData, userKey) {
    const entryJson = JSON.stringify(entryData);
    const encrypted = this.encryptContent(entryJson, userKey);
    return encrypted;
  }

  /**
   * Decrypt entire entry object
   * @param {Object} encrypted - Encrypted entry data
   * @param {Buffer} userKey - User encryption key
   * @returns {Object} - Decrypted entry data
   */
  decryptEntry(encrypted, userKey) {
    const decrypted = this.decryptContent(encrypted, userKey);
    return JSON.parse(decrypted);
  }

  /**
   * Hash content for integrity checking (without encryption)
   * @param {string} content - Content to hash
   * @returns {string} - SHA-256 hash
   */
  hashContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Verify content integrity
   * @param {string} content - Content to verify
   * @param {string} hash - Expected hash
   * @returns {boolean} - True if hash matches
   */
  verifyContentHash(content, hash) {
    return this.hashContent(content) === hash;
  }
}

module.exports = DiaryEncryptionService;
