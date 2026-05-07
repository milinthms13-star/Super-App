const express = require('express');
const router = express.Router();
const messageEncryptionService = require('../services/messageEncryptionService');
const authMiddleware = require('../middleware/authMiddleware');

// Generate encryption keys for chat
router.post('/keys/generate', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.body;

    const keys = await messageEncryptionService.generateChatKeys(chatId);

    res.status(201).json({
      success: true,
      message: 'Encryption keys generated',
      data: keys,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Encrypt message
router.post('/encrypt', authMiddleware, async (req, res) => {
  try {
    const { content, chatId, options } = req.body;

    const encrypted = await messageEncryptionService.encryptMessage(
      content,
      chatId,
      options
    );

    res.json({
      success: true,
      message: 'Message encrypted',
      data: encrypted,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Decrypt message
router.post('/decrypt', authMiddleware, async (req, res) => {
  try {
    const { encrypted, chatId, iv, authTag } = req.body;

    const decrypted = await messageEncryptionService.decryptMessage(
      encrypted,
      chatId,
      iv,
      authTag
    );

    res.json({
      success: true,
      message: 'Message decrypted',
      data: { content: decrypted },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Enable E2E encryption for chat
router.post('/:chatId/enable', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { participantIds } = req.body;

    const config = await messageEncryptionService.enableE2EEncryption(
      chatId,
      participantIds
    );

    res.json({
      success: true,
      message: 'E2E encryption enabled',
      data: config,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Disable E2E encryption for chat
router.post('/:chatId/disable', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;

    const result = await messageEncryptionService.disableE2EEncryption(chatId);

    res.json({
      success: true,
      message: 'E2E encryption disabled',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get encryption status
router.get('/:chatId/status', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;

    const status = await messageEncryptionService.getEncryptionStatus(chatId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Store encrypted message metadata
router.post('/:messageId/store', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { encryptedData } = req.body;

    const message = await messageEncryptionService.storeEncryptedMessage(
      messageId,
      encryptedData
    );

    res.json({
      success: true,
      message: 'Encrypted message stored',
      data: message,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get encryption audit log
router.get('/:chatId/audit', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;

    const log = await messageEncryptionService.getEncryptionAuditLog(chatId);

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Verify message integrity
router.post('/:messageId/verify', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    const verified = await messageEncryptionService.verifyMessageIntegrity(
      messageId
    );

    res.json({
      success: true,
      verified,
      message: verified ? 'Message integrity verified' : 'Integrity check failed',
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
