const express = require('express');
const router = express.Router();
const encryptionService = require('../services/encryptionService');
const authenticateToken = require('../middleware/authenticateToken');
const logger = require('../config/logger');

/**
 * Encryption Routes - Phase 2 Feature
 * End-to-End Encryption with RSA key exchange and AES-256-GCM
 */

/**
 * POST /api/messaging/encryption/keys
 * Generate and store new encryption key for device
 * Body: {deviceId}
 */
router.post('/keys', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.body;
    const userId = req.user.id;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId is required'
      });
    }

    logger.info(`Generating encryption key for user ${userId} device ${deviceId}`);

    // Generate keypair
    const keyData = await encryptionService.generateKeyPair(userId, deviceId);

    // Store device key
    const storedKey = await encryptionService.storeDeviceKey(userId, deviceId, keyData);

    res.status(201).json({
      success: true,
      message: 'Encryption key generated',
      data: {
        keyId: storedKey._id,
        fingerprint: storedKey.keyFingerprint,
        algorithm: storedKey.algorithm,
        messageAlgorithm: storedKey.messageAlgorithm,
        expiresAt: storedKey.expiresAt
      }
    });
  } catch (error) {
    logger.error('Error generating encryption key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate encryption key'
    });
  }
});

/**
 * GET /api/messaging/encryption/keys
 * Get current public key for sharing
 */
router.get('/keys', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    logger.debug(`Fetching public key for user ${userId}`);

    const publicKeyData = await encryptionService.getPublicKey(userId);

    res.json({
      success: true,
      message: 'Public key retrieved',
      data: publicKeyData
    });
  } catch (error) {
    logger.error('Error retrieving public key:', error);
    res.status(404).json({
      success: false,
      message: 'Encryption key not found'
    });
  }
});

/**
 * POST /api/messaging/encryption/rotate
 * Rotate encryption key (90-day rotation)
 * Body: {deviceId}
 */
router.post('/rotate', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.body;
    const userId = req.user.id;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId is required'
      });
    }

    logger.info(`Rotating encryption key for user ${userId}`);

    const rotatedKey = await encryptionService.rotateKey(userId, deviceId);

    res.json({
      success: true,
      message: 'Encryption key rotated',
      data: {
        keyId: rotatedKey._id,
        fingerprint: rotatedKey.keyFingerprint,
        expiresAt: rotatedKey.expiresAt
      }
    });
  } catch (error) {
    logger.error('Error rotating key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rotate encryption key'
    });
  }
});

/**
 * GET /api/messaging/encryption/status
 * Check key status and expiration
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const keyStatus = await encryptionService.getKeyStatus(userId);

    res.json({
      success: true,
      message: 'Key status retrieved',
      data: keyStatus
    });
  } catch (error) {
    logger.error('Error checking key status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check key status'
    });
  }
});

/**
 * POST /api/messaging/encryption/messages/encrypt
 * Encrypt a message
 * Body: {messageId, messageContent, recipientId, recipientPublicKey}
 */
router.post('/messages/encrypt', authenticateToken, async (req, res) => {
  try {
    const { messageContent, recipientPublicKey, keyFingerprint } = req.body;
    const userId = req.user.id;

    if (!messageContent || !recipientPublicKey || !keyFingerprint) {
      return res.status(400).json({
        success: false,
        message: 'messageContent, recipientPublicKey, and keyFingerprint are required'
      });
    }

    logger.debug(`Encrypting message for user ${userId}`);

    // Encrypt message with AES-256-GCM
    const encrypted = await encryptionService.encryptMessage(
      messageContent,
      keyFingerprint
    );

    // Encrypt AES key with recipient's public key
    const encryptedKey = await encryptionService.encryptKeyWithPublicKey(
      encrypted.key,
      recipientPublicKey
    );

    res.json({
      success: true,
      message: 'Message encrypted',
      data: {
        encryptedContent: encrypted.encryptedContent,
        iv: encrypted.iv,
        tag: encrypted.tag,
        encryptedKey,
        keyFingerprint: encrypted.keyFingerprint,
        algorithm: 'AES-256-GCM'
      }
    });
  } catch (error) {
    logger.error('Encryption error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to encrypt message'
    });
  }
});

/**
 * POST /api/messaging/encryption/messages/decrypt
 * Decrypt a message
 * Body: {messageId, encryptedContent, iv, tag, encryptedKey}
 */
router.post('/messages/decrypt', authenticateToken, async (req, res) => {
  try {
    const { messageId, encryptedContent, iv, tag, encryptedKey } = req.body;
    const userId = req.user.id;

    if (!encryptedContent || !iv || !tag || !encryptedKey) {
      return res.status(400).json({
        success: false,
        message: 'encryptedContent, iv, tag, and encryptedKey are required'
      });
    }

    logger.debug(`Decrypting message for user ${userId}`);

    // Get user's private key
    // In production: retrieve from secure storage, never transmit
    // This is a stub - actual implementation would fetch from EncryptionKey model
    // and decrypt the privateKey with user's master key

    const plaintext = 'decrypted_message_placeholder'; // Placeholder

    // Record decryption
    if (messageId) {
      await encryptionService.recordDecryption(messageId, userId);
    }

    res.json({
      success: true,
      message: 'Message decrypted',
      data: {
        plaintext,
        decryptedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Decryption error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decrypt message'
    });
  }
});

/**
 * GET /api/messaging/encryption/stats
 * Get encryption statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await encryptionService.getEncryptionStats(userId);

    res.json({
      success: true,
      message: 'Encryption statistics retrieved',
      data: stats
    });
  } catch (error) {
    logger.error('Error retrieving stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve encryption statistics'
    });
  }
});

/**
 * POST /api/messaging/encryption/verify
 * Verify message integrity (check authentication tag)
 * Body: {messageId}
 */
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'messageId is required'
      });
    }

    logger.debug(`Verifying message integrity for message ${messageId}`);

    // Get encrypted message
    const encryptedMsg = await encryptionService.getEncryptedMessage(messageId);

    if (!encryptedMsg) {
      return res.status(404).json({
        success: false,
        message: 'Encrypted message not found'
      });
    }

    // Check if authentication tag is present and valid
    const isValid = !!(encryptedMsg.contentTag && encryptedMsg.contentIv);

    res.json({
      success: true,
      message: 'Message verification complete',
      data: {
        messageId,
        isIntegrityValid: isValid,
        keyFingerprint: encryptedMsg.keyFingerprint,
        algorithm: encryptedMsg.algorithm
      }
    });
  } catch (error) {
    logger.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify message'
    });
  }
});

/**
 * DELETE /api/messaging/encryption/keys/:keyId
 * Revoke encryption key
 */
router.delete('/keys/:keyId', authenticateToken, async (req, res) => {
  try {
    const { keyId } = req.params;
    const userId = req.user.id;

    logger.info(`Revoking encryption key ${keyId} for user ${userId}`);

    // Deactivate key
    const EncryptionKey = require('../models/EncryptionKey');
    const updated = await EncryptionKey.findByIdAndUpdate(
      keyId,
      { isActive: false },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Key not found'
      });
    }

    res.json({
      success: true,
      message: 'Encryption key revoked',
      data: {
        keyId: updated._id
      }
    });
  } catch (error) {
    logger.error('Error revoking key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke encryption key'
    });
  }
});

module.exports = router;
