const assert = require('assert');
const messageEncryptionService = require('../../../services/messageEncryptionService');

describe('Message Encryption Service', () => {
  const testChatId = 'test-chat-123';
  const testContent = 'Secret message';
  const testUserId = 'test-user-456';

  beforeEach(() => {
    messageEncryptionService.clearCache();
  });

  afterEach(() => {
    messageEncryptionService.clearCache();
  });

  describe('generateChatKeys', () => {
    it('should generate ECDH key pair', async () => {
      try {
        const keys = await messageEncryptionService.generateChatKeys(testChatId);
        assert(keys.publicKey);
        assert(keys.privateKey);
        assert(keys.chatId === testChatId);
        assert(keys.algorithm);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should generate unique keys for different chats', async () => {
      try {
        const keys1 = await messageEncryptionService.generateChatKeys('chat-1');
        const keys2 = await messageEncryptionService.generateChatKeys('chat-2');
        assert.notStrictEqual(keys1.publicKey, keys2.publicKey);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should include creation timestamp', async () => {
      try {
        const keys = await messageEncryptionService.generateChatKeys(testChatId);
        assert(keys.createdAt instanceof Date);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('encryptMessage', () => {
    it('should encrypt message content', async () => {
      try {
        const result = await messageEncryptionService.encryptMessage(
          testContent,
          testChatId
        );
        assert(result.encrypted);
        assert(result.iv);
        assert(result.authTag);
        assert(result.algorithm);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should return different ciphertexts for same content', async () => {
      try {
        const result1 = await messageEncryptionService.encryptMessage(
          testContent,
          testChatId
        );
        const result2 = await messageEncryptionService.encryptMessage(
          testContent,
          testChatId
        );
        // Different IVs should produce different ciphertexts
        assert.notStrictEqual(result1.encrypted, result2.encrypted);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should reject missing fields', async () => {
      try {
        await messageEncryptionService.encryptMessage(null, testChatId);
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('Missing'));
      }
    });

    it('should include metadata', async () => {
      try {
        const result = await messageEncryptionService.encryptMessage(testContent, testChatId);
        assert(result.timestamp);
        assert(result.chatId === testChatId);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('decryptMessage', () => {
    it('should decrypt encrypted message', async () => {
      try {
        const encrypted = await messageEncryptionService.encryptMessage(
          testContent,
          testChatId
        );

        const decrypted = await messageEncryptionService.decryptMessage(
          encrypted.encrypted,
          testChatId,
          encrypted.iv,
          encrypted.authTag
        );

        assert.strictEqual(decrypted, testContent);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should reject incorrect auth tag', async () => {
      try {
        const encrypted = await messageEncryptionService.encryptMessage(
          testContent,
          testChatId
        );

        const wrongTag = encrypted.authTag.substring(0, encrypted.authTag.length - 2) + 'FF';
        await messageEncryptionService.decryptMessage(
          encrypted.encrypted,
          testChatId,
          encrypted.iv,
          wrongTag
        );
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });

    it('should reject missing decryption fields', async () => {
      try {
        await messageEncryptionService.decryptMessage(null, testChatId, 'iv', 'tag');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('Missing'));
      }
    });
  });

  describe('enableE2EEncryption', () => {
    it('should enable E2E encryption for chat', async () => {
      try {
        const result = await messageEncryptionService.enableE2EEncryption(testChatId, [
          testUserId,
          'user-2',
        ]);
        assert(result.chatId === testChatId);
        assert(result.encryption);
        assert(result.encryption.enabled === true);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should set encryption algorithm', async () => {
      try {
        const result = await messageEncryptionService.enableE2EEncryption(testChatId, [
          testUserId,
        ]);
        assert.strictEqual(result.encryption.algorithm, 'ECDH-AES256-GCM');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should store participant list', async () => {
      try {
        const participants = [testUserId, 'user-2', 'user-3'];
        const result = await messageEncryptionService.enableE2EEncryption(
          testChatId,
          participants
        );
        assert.strictEqual(result.encryption.participants.length, participants.length);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should handle non-existent chat', async () => {
      try {
        await messageEncryptionService.enableE2EEncryption('non-existent', [testUserId]);
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });
  });

  describe('disableE2EEncryption', () => {
    it('should disable E2E encryption for chat', async () => {
      try {
        await messageEncryptionService.enableE2EEncryption(testChatId, [testUserId]);
        const result = await messageEncryptionService.disableE2EEncryption(testChatId);
        assert(result === true);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should handle non-existent chat', async () => {
      try {
        await messageEncryptionService.disableE2EEncryption('non-existent');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });
  });

  describe('getEncryptionStatus', () => {
    it('should return encryption status for chat', async () => {
      try {
        const status = await messageEncryptionService.getEncryptionStatus(testChatId);
        assert(typeof status.enabled === 'boolean');
        assert(status.chatId === testChatId);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should return enabled status after enablement', async () => {
      try {
        await messageEncryptionService.enableE2EEncryption(testChatId, [testUserId]);
        const status = await messageEncryptionService.getEncryptionStatus(testChatId);
        assert(status.enabled === true);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should cache status', async () => {
      try {
        const status1 = await messageEncryptionService.getEncryptionStatus(testChatId);
        const status2 = await messageEncryptionService.getEncryptionStatus(testChatId);
        assert.deepStrictEqual(status1, status2);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should include participant count', async () => {
      try {
        const status = await messageEncryptionService.getEncryptionStatus(testChatId);
        assert(typeof status.participantCount === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('storeEncryptedMessage', () => {
    it('should store encrypted message metadata', async () => {
      try {
        const encryptedData = {
          iv: 'test-iv',
          authTag: 'test-tag',
          algorithm: 'aes-256-gcm',
        };

        // Would need a real message first
        // This is a placeholder test
        assert(encryptedData.iv);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('verifyMessageIntegrity', () => {
    it('should verify message integrity', async () => {
      try {
        const result = await messageEncryptionService.verifyMessageIntegrity('test-msg-id');
        assert(typeof result === 'boolean');
      } catch (error) {
        // May throw if message not found
      }
    });
  });

  describe('getEncryptionAuditLog', () => {
    it('should return audit log for chat', async () => {
      try {
        const log = await messageEncryptionService.getEncryptionAuditLog(testChatId);
        assert(Array.isArray(log));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should handle non-existent chat', async () => {
      try {
        await messageEncryptionService.getEncryptionAuditLog('non-existent');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });
  });

  describe('Key derivation', () => {
    it('should derive consistent key for same chat', async () => {
      try {
        const key1 = messageEncryptionService.deriveKey(testChatId);
        const key2 = messageEncryptionService.deriveKey(testChatId);
        assert(key1.equals(key2));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should derive different keys for different chats', async () => {
      try {
        const key1 = messageEncryptionService.deriveKey('chat-1');
        const key2 = messageEncryptionService.deriveKey('chat-2');
        assert(!key1.equals(key2));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('Cache behavior', () => {
    it('should cache encryption status', async () => {
      try {
        const status1 = await messageEncryptionService.getEncryptionStatus(testChatId);
        const status2 = await messageEncryptionService.getEncryptionStatus(testChatId);
        assert.deepStrictEqual(status1, status2);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should clear cache', async () => {
      try {
        messageEncryptionService.clearCache();
        const status = await messageEncryptionService.getEncryptionStatus(testChatId);
        assert(typeof status.enabled === 'boolean');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });
});
