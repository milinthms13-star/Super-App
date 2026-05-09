/**
 * Data Encryption Key Service - Phase 10 Business Logic
 * Encryption key management and rotation
 */

const DataEncryptionKey = require('../models/DataEncryptionKey');

class DataEncryptionKeyService {
  async createEncryptionKey(keyName, keyType, algorithm, keySize, purpose) {
    try {
      const keyId = `KEY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const key = new DataEncryptionKey({
        keyId,
        keyName,
        keyType,
        algorithm,
        keySize,
        purpose,
        status: 'active',
      });

      await key.save();

      return {
        success: true,
        data: { keyId },
        message: 'Encryption key created',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create encryption key',
        errors: [error.message],
      };
    }
  }

  async getKeyDetails(keyId) {
    try {
      const key = await DataEncryptionKey.findOne({ keyId }).select('-keyMaterial');

      if (!key) {
        return { success: false, message: 'Encryption key not found', statusCode: 404 };
      }

      return {
        success: true,
        data: key,
        message: 'Key details retrieved',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve key details',
        errors: [error.message],
      };
    }
  }

  async scheduleKeyRotation(keyId, rotationDate) {
    try {
      const key = await DataEncryptionKey.findOne({ keyId });

      if (!key) {
        return { success: false, message: 'Encryption key not found', statusCode: 404 };
      }

      key.scheduleRotation(new Date(rotationDate));
      await key.save();

      return {
        success: true,
        data: { keyId },
        message: 'Key rotation scheduled',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to schedule key rotation',
        errors: [error.message],
      };
    }
  }

  async rotateKey(keyId) {
    try {
      const oldKey = await DataEncryptionKey.findOne({ keyId });

      if (!oldKey) {
        return { success: false, message: 'Encryption key not found', statusCode: 404 };
      }

      // Mark old key as rotated
      oldKey.rotateKey();
      await oldKey.save();

      // Create new key with same properties
      const newKeyId = `KEY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newKey = new DataEncryptionKey({
        keyId: newKeyId,
        keyName: `${oldKey.keyName} (rotated)`,
        keyType: oldKey.keyType,
        algorithm: oldKey.algorithm,
        keySize: oldKey.keySize,
        purpose: oldKey.purpose,
        status: 'active',
      });

      await newKey.save();

      return {
        success: true,
        data: { oldKeyId: keyId, newKeyId },
        message: 'Key rotated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to rotate key',
        errors: [error.message],
      };
    }
  }

  async markKeyAsCompromised(keyId, reason, revokedBy) {
    try {
      const key = await DataEncryptionKey.findOne({ keyId });

      if (!key) {
        return { success: false, message: 'Encryption key not found', statusCode: 404 };
      }

      key.markAsCompromised(reason, revokedBy);
      await key.save();

      return {
        success: true,
        data: { keyId },
        message: 'Key marked as compromised',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to mark key as compromised',
        errors: [error.message],
      };
    }
  }

  async logKeyUsage(keyId, operation, dataType, status, userId, ipAddress) {
    try {
      const key = await DataEncryptionKey.findOne({ keyId });

      if (!key) {
        return { success: false, message: 'Encryption key not found', statusCode: 404 };
      }

      key.logUsage(operation, dataType, status, userId, ipAddress);
      await key.save();

      return {
        success: true,
        data: { keyId },
        message: 'Key usage logged',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to log key usage',
        errors: [error.message],
      };
    }
  }

  async getExpiringKeys(daysThreshold = 30) {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysThreshold);

      const keys = await DataEncryptionKey.find({
        expiryDate: { $lte: expiryDate },
        status: 'active',
      }).select('-keyMaterial');

      return {
        success: true,
        data: { keys, count: keys.length },
        message: 'Expiring keys retrieved',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve expiring keys',
        errors: [error.message],
      };
    }
  }

  async listAllKeys(filters = {}) {
    try {
      const query = {};

      if (filters.status) query.status = filters.status;
      if (filters.purpose) query.purpose = filters.purpose;
      if (filters.keyType) query.keyType = filters.keyType;

      const keys = await DataEncryptionKey.find(query)
        .select('-keyMaterial')
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);

      const total = await DataEncryptionKey.countDocuments(query);

      return {
        success: true,
        data: { keys, total },
        message: 'Encryption keys retrieved',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve keys',
        errors: [error.message],
      };
    }
  }
}

module.exports = new DataEncryptionKeyService();
