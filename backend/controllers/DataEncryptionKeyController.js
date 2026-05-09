/**
 * Data Encryption Key Controller - Phase 10 REST Endpoints
 * Encryption key management endpoints
 */

const { validationResult } = require('express-validator');
const DataEncryptionKeyService = require('../services/DataEncryptionKeyService');

class DataEncryptionKeyController {
  async createKey(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { keyName, keyType, algorithm, keySize, purpose } = req.body;

      const result = await DataEncryptionKeyService.createEncryptionKey(keyName, keyType, algorithm, keySize, purpose);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create encryption key',
        errors: [error.message],
      });
    }
  }

  async getKeyDetails(req, res) {
    try {
      const { keyId } = req.params;

      const result = await DataEncryptionKeyService.getKeyDetails(keyId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve key details',
        errors: [error.message],
      });
    }
  }

  async scheduleRotation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { keyId } = req.params;
      const { rotationDate } = req.body;

      const result = await DataEncryptionKeyService.scheduleKeyRotation(keyId, rotationDate);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to schedule key rotation',
        errors: [error.message],
      });
    }
  }

  async rotateKey(req, res) {
    try {
      const { keyId } = req.params;

      const result = await DataEncryptionKeyService.rotateKey(keyId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to rotate key',
        errors: [error.message],
      });
    }
  }

  async markAsCompromised(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { keyId } = req.params;
      const { reason, revokedBy } = req.body;

      const result = await DataEncryptionKeyService.markKeyAsCompromised(keyId, reason, revokedBy);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to mark key as compromised',
        errors: [error.message],
      });
    }
  }

  async logUsage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { keyId } = req.params;
      const { operation, dataType, status, userId } = req.body;
      const ipAddress = req.ip;

      const result = await DataEncryptionKeyService.logKeyUsage(keyId, operation, dataType, status, userId, ipAddress);

      return res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to log key usage',
        errors: [error.message],
      });
    }
  }

  async getExpiringKeys(req, res) {
    try {
      const daysThreshold = parseInt(req.query.daysThreshold) || 30;

      const result = await DataEncryptionKeyService.getExpiringKeys(daysThreshold);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve expiring keys',
        errors: [error.message],
      });
    }
  }

  async listAllKeys(req, res) {
    try {
      const filters = {
        status: req.query.status,
        purpose: req.query.purpose,
        keyType: req.query.keyType,
        limit: parseInt(req.query.limit) || 50,
        skip: parseInt(req.query.skip) || 0,
      };

      const result = await DataEncryptionKeyService.listAllKeys(filters);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve keys',
        errors: [error.message],
      });
    }
  }
}

module.exports = new DataEncryptionKeyController();
