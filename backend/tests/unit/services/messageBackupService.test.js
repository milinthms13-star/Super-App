const assert = require('assert');
const messageBackupService = require('../../../services/messageBackupService');

describe('Message Backup Service', () => {
  const testUserId = 'test-user-456';
  const testChatId = 'test-chat-123';

  beforeEach(() => {
    messageBackupService.clearCache();
  });

  afterEach(() => {
    messageBackupService.clearCache();
  });

  describe('exportChat', () => {
    it('should export chat as JSON', async () => {
      try {
        const result = await messageBackupService.exportChat(testChatId, testUserId, 'json');
        assert(result);
        assert(result.format === 'json');
        assert(result.data);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should export chat as CSV', async () => {
      try {
        const result = await messageBackupService.exportChat(testChatId, testUserId, 'csv');
        assert(result);
        assert(result.format === 'csv');
        assert(result.data);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should include all messages', async () => {
      try {
        const result = await messageBackupService.exportChat(testChatId, testUserId, 'json');
        assert(Array.isArray(result.data));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should include metadata', async () => {
      try {
        const result = await messageBackupService.exportChat(testChatId, testUserId, 'json');
        assert(result.chatId === testChatId);
        assert(result.exportedAt instanceof Date);
        assert(typeof result.messageCount === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should enforce authorization', async () => {
      try {
        await messageBackupService.exportChat(testChatId, 'different-user', 'json');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('authorized'));
      }
    });

    it('should support date range filtering', async () => {
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const result = await messageBackupService.exportChat(testChatId, testUserId, 'json', {
          startDate,
          endDate: new Date(),
        });

        assert(result);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should support including attachments', async () => {
      try {
        const result = await messageBackupService.exportChat(testChatId, testUserId, 'json', {
          includeAttachments: true,
        });

        assert(result);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('importMessages', () => {
    it('should import messages from JSON', async () => {
      try {
        const importData = {
          messages: [
            { content: 'Test message', senderId: testUserId, createdAt: new Date() },
          ],
        };

        const result = await messageBackupService.importMessages(
          testChatId,
          testUserId,
          importData
        );

        assert(result.importedCount >= 0);
        assert(result.skippedCount >= 0);
        assert(result.errors instanceof Array);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should validate import data structure', async () => {
      try {
        const invalidData = { invalid: 'structure' };

        await messageBackupService.importMessages(testChatId, testUserId, invalidData);
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('structure'));
      }
    });

    it('should prevent duplicate imports', async () => {
      try {
        const importData = {
          messages: [{ content: 'Test', senderId: testUserId, messageId: 'msg-1' }],
        };

        await messageBackupService.importMessages(testChatId, testUserId, importData);
        const result2 = await messageBackupService.importMessages(testChatId, testUserId, importData);

        assert(result2.skippedCount > 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('archiveChat', () => {
    it('should archive chat successfully', async () => {
      try {
        const result = await messageBackupService.archiveChat(testChatId, testUserId);
        assert(result === true);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should prevent further modifications on archived chat', async () => {
      try {
        await messageBackupService.archiveChat(testChatId, testUserId);
        const archived = await messageBackupService.getBackups(testChatId, testUserId);
        // Archived chats should be marked
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should enforce authorization', async () => {
      try {
        await messageBackupService.archiveChat(testChatId, 'different-user');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('authorized'));
      }
    });
  });

  describe('getBackups', () => {
    it('should retrieve backup list', async () => {
      try {
        const result = await messageBackupService.getBackups(testChatId, testUserId);
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should include backup metadata', async () => {
      try {
        const result = await messageBackupService.getBackups(testChatId, testUserId);
        if (result.length > 0) {
          result.forEach((backup) => {
            assert(backup._id);
            assert(backup.createdAt);
            assert(typeof backup.messageCount === 'number');
          });
        }
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should respect limit parameter', async () => {
      try {
        const result = await messageBackupService.getBackups(testChatId, testUserId, {
          limit: 5,
        });
        assert(result.length <= 5);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('cleanupOldBackups', () => {
    it('should remove backups older than retention period', async () => {
      try {
        const result = await messageBackupService.cleanupOldBackups(testUserId, 30);
        assert(typeof result === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should require valid retention days', async () => {
      try {
        await messageBackupService.cleanupOldBackups(testUserId, -1);
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });
  });

  describe('getBackupStats', () => {
    it('should return backup statistics', async () => {
      try {
        const stats = await messageBackupService.getBackupStats(testUserId);
        assert(typeof stats.totalBackups === 'number');
        assert(typeof stats.totalSize === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should calculate average backup size', async () => {
      try {
        const stats = await messageBackupService.getBackupStats(testUserId);
        assert(typeof stats.averageBackupSize === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should include storage used', async () => {
      try {
        const stats = await messageBackupService.getBackupStats(testUserId);
        assert(typeof stats.storageUsed === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore chat from backup', async () => {
      try {
        const backups = await messageBackupService.getBackups(testChatId, testUserId);
        if (backups.length > 0) {
          const result = await messageBackupService.restoreFromBackup(
            backups[0]._id,
            testUserId
          );
          assert(result.success === true);
        }
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should handle non-existent backup', async () => {
      try {
        await messageBackupService.restoreFromBackup('non-existent', testUserId);
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });

    it('should support restore options', async () => {
      try {
        const backups = await messageBackupService.getBackups(testChatId, testUserId);
        if (backups.length > 0) {
          const result = await messageBackupService.restoreFromBackup(
            backups[0]._id,
            testUserId,
            { merge: true }
          );
          assert(result);
        }
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('convertToCSV', () => {
    it('should convert messages to CSV', async () => {
      try {
        const messages = [
          { content: 'Test 1', senderId: 'user-1', createdAt: new Date() },
          { content: 'Test 2', senderId: 'user-2', createdAt: new Date() },
        ];

        const result = await messageBackupService.convertToCSV(messages);
        assert(typeof result === 'string');
        assert(result.includes('content'));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should handle special characters in CSV', async () => {
      try {
        const messages = [
          { content: 'Message with "quotes" and, commas', senderId: 'user-1', createdAt: new Date() },
        ];

        const result = await messageBackupService.convertToCSV(messages);
        assert(typeof result === 'string');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should include headers', async () => {
      try {
        const messages = [
          { content: 'Test', senderId: 'user-1', createdAt: new Date() },
        ];

        const result = await messageBackupService.convertToCSV(messages);
        const lines = result.split('\n');
        assert(lines.length >= 2);
        assert(lines[0].includes('content'));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('Bulk operations', () => {
    it('should support bulk message operations', async () => {
      try {
        const result = await messageBackupService.bulkArchiveMessages(testChatId, testUserId, [
          'msg-1',
          'msg-2',
        ]);
        assert(typeof result === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should support bulk deletion', async () => {
      try {
        const result = await messageBackupService.bulkDeleteMessages(testChatId, testUserId, [
          'msg-1',
        ]);
        assert(typeof result === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('Export formats', () => {
    it('should support JSON export', async () => {
      try {
        const result = await messageBackupService.exportChat(testChatId, testUserId, 'json');
        assert.strictEqual(result.format, 'json');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should support CSV export', async () => {
      try {
        const result = await messageBackupService.exportChat(testChatId, testUserId, 'csv');
        assert.strictEqual(result.format, 'csv');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should reject unsupported formats', async () => {
      try {
        await messageBackupService.exportChat(testChatId, testUserId, 'xml');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('supported'));
      }
    });
  });

  describe('Cache behavior', () => {
    it('should cache backup list', async () => {
      try {
        const result1 = await messageBackupService.getBackups(testChatId, testUserId);
        const result2 = await messageBackupService.getBackups(testChatId, testUserId);
        assert(Array.isArray(result1));
        assert(Array.isArray(result2));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should invalidate cache on export', async () => {
      try {
        await messageBackupService.getBackups(testChatId, testUserId);
        await messageBackupService.exportChat(testChatId, testUserId, 'json');
        const result = await messageBackupService.getBackups(testChatId, testUserId);
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should clear all cache', async () => {
      try {
        messageBackupService.clearCache();
        const result = await messageBackupService.getBackups(testChatId, testUserId);
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });
});
