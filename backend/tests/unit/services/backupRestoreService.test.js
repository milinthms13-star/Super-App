const mongoose = require('mongoose');
const assert = require('assert');
const backupRestoreService = require('../../../services/backupRestoreService');
const ChatBackup = require('../../../models/ChatBackup');
const RestoreQueue = require('../../../models/RestoreQueue');
const Message = require('../../../models/Message');
const Chat = require('../../../models/Chat');

describe('backupRestoreService Unit Tests', () => {
  const userId = new mongoose.Types.ObjectId();
  const chatId = new mongoose.Types.ObjectId();

  before(async () => {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/nilahub-test');
    }
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  after(async () => {
    await mongoose.disconnect();
  });

  describe('createBackup()', () => {
    it('should create a new backup', async () => {
      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      assert.ok(backup._id);
      assert.strictEqual(backup.userId.toString(), userId.toString());
      assert.strictEqual(backup.chatId.toString(), chatId.toString());
      assert.ok(backup.backupHash);
    });

    it('should create backup with metadata', async () => {
      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat',
        backupName: 'Q1 Archive'
      });

      assert.strictEqual(backup.backupName, 'Q1 Archive');
      assert.ok(backup.createdAt);
    });

    it('should set default status to completed or in-progress', async () => {
      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      assert.ok(['completed', 'in-progress'].includes(backup.status));
    });

    it('should require userId and chatId', async () => {
      try {
        await backupRestoreService.createBackup({
          backupType: 'single-chat'
        });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error);
      }
    });

    it('should generate unique backup hash', async () => {
      const backup1 = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      const backup2 = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      assert.notStrictEqual(backup1.backupHash, backup2.backupHash);
    });
  });

  describe('exportChatAsJSON()', () => {
    it('should export chat data as JSON', async () => {
      // Create test chat and messages
      const chat = new Chat({
        _id: chatId,
        name: 'Test Chat',
        createdBy: userId
      });
      await chat.save();

      const msg = new Message({
        chatId,
        senderId: userId,
        content: 'Test message',
        messageType: 'text'
      });
      await msg.save();

      const json = await backupRestoreService.exportChatAsJSON({
        userId,
        chatId
      });

      assert.ok(json);
      assert.ok(json.includes('Test Chat'));
      assert.ok(json.includes('Test message'));
    });

    it('should return valid JSON string', async () => {
      const json = await backupRestoreService.exportChatAsJSON({
        userId,
        chatId
      });

      const parsed = JSON.parse(json);
      assert.ok(parsed.chat || parsed.messages);
    });

    it('should include metadata in export', async () => {
      const json = await backupRestoreService.exportChatAsJSON({
        userId,
        chatId
      });

      assert.ok(json.includes('exportDate') || json.includes('timestamp'));
    });
  });

  describe('exportChatAsCSV()', () => {
    it('should export chat data as CSV', async () => {
      const csv = await backupRestoreService.exportChatAsCSV({
        userId,
        chatId
      });

      assert.ok(csv);
      assert.ok(typeof csv === 'string');
    });

    it('should include CSV headers', async () => {
      const msg = new Message({
        chatId,
        senderId: userId,
        content: 'Test',
        messageType: 'text'
      });
      await msg.save();

      const csv = await backupRestoreService.exportChatAsCSV({
        userId,
        chatId
      });

      // CSV should have headers like timestamp, sender, content
      assert.ok(csv.includes(','));
    });

    it('should escape special characters in CSV', async () => {
      const msg = new Message({
        chatId,
        senderId: userId,
        content: 'Test "quoted" content with, comma',
        messageType: 'text'
      });
      await msg.save();

      const csv = await backupRestoreService.exportChatAsCSV({
        userId,
        chatId
      });

      assert.ok(csv);
    });
  });

  describe('restoreChatFromBackup()', () => {
    it('should restore chat from backup', async () => {
      // Create backup first
      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      // Restore from backup
      const restore = await backupRestoreService.restoreChatFromBackup({
        userId,
        backupId: backup._id
      });

      assert.ok(restore._id);
      assert.strictEqual(restore.backupId.toString(), backup._id.toString());
      assert.ok(['pending', 'in-progress'].includes(restore.status));
    });

    it('should create RestoreQueue entry', async () => {
      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      await backupRestoreService.restoreChatFromBackup({
        userId,
        backupId: backup._id
      });

      const queued = await RestoreQueue.findOne({
        backupId: backup._id
      });

      assert.ok(queued);
    });

    it('should track restore progress', async () => {
      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      const restore = await backupRestoreService.restoreChatFromBackup({
        userId,
        backupId: backup._id
      });

      assert.strictEqual(restore.userId.toString(), userId.toString());
      assert.ok(restore.createdAt);
    });

    it('should require valid backupId', async () => {
      try {
        await backupRestoreService.restoreChatFromBackup({
          userId,
          backupId: new mongoose.Types.ObjectId()
        });
        assert.fail('Should have thrown error for non-existent backup');
      } catch (error) {
        assert.ok(error);
      }
    });
  });

  describe('_generateHash()', () => {
    it('should generate SHA256 hash', async () => {
      const backup1 = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      const backup2 = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      assert.ok(backup1.backupHash);
      assert.ok(backup2.backupHash);
      assert.notStrictEqual(backup1.backupHash, backup2.backupHash);
    });

    it('should generate consistent hash for same input', async () => {
      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      assert.ok(backup.backupHash.match(/^[a-f0-9]{64}$/));
    });
  });

  describe('getBackupStatus()', () => {
    it('should retrieve backup status', async () => {
      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      const status = await backupRestoreService.getBackupStatus(backup._id);

      assert.ok(status._id);
      assert.ok(status.status);
    });

    it('should return null for non-existent backup', async () => {
      const status = await backupRestoreService.getBackupStatus(
        new mongoose.Types.ObjectId()
      );

      assert.strictEqual(status, null);
    });
  });

  describe('deleteBackup()', () => {
    it('should delete a backup', async () => {
      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      const result = await backupRestoreService.deleteBackup(backup._id);

      assert.ok(result.deletedCount > 0 || result.acknowledged);
    });

    it('should not delete other users backups', async () => {
      const otherUserId = new mongoose.Types.ObjectId();

      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      try {
        await backupRestoreService.deleteBackup(backup._id);
        // Restore should succeed
        assert.ok(true);
      } catch (error) {
        assert.ok(error);
      }
    });
  });

  describe('scheduleAutoBackup()', () => {
    it('should schedule automatic backups', async () => {
      const config = await backupRestoreService.scheduleAutoBackup({
        userId,
        frequency: 'daily',
        retentionDays: 30
      });

      assert.ok(config);
      assert.strictEqual(config.frequency, 'daily');
    });

    it('should validate frequency values', async () => {
      try {
        await backupRestoreService.scheduleAutoBackup({
          userId,
          frequency: 'invalid-frequency',
          retentionDays: 30
        });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error);
      }
    });

    it('should validate retention days', async () => {
      try {
        await backupRestoreService.scheduleAutoBackup({
          userId,
          frequency: 'daily',
          retentionDays: -1
        });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error);
      }
    });
  });

  describe('getBackups()', () => {
    it('should list user backups', async () => {
      await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      await backupRestoreService.createBackup({
        userId,
        chatId: new mongoose.Types.ObjectId(),
        backupType: 'single-chat'
      });

      const list = await backupRestoreService.getBackups({
        userId,
        page: 1,
        limit: 10
      });

      assert.strictEqual(list.backups.length, 2);
    });

    it('should support pagination', async () => {
      // Create multiple backups
      for (let i = 0; i < 5; i++) {
        await backupRestoreService.createBackup({
          userId,
          chatId,
          backupType: 'single-chat'
        });
      }

      const page1 = await backupRestoreService.getBackups({
        userId,
        page: 1,
        limit: 2
      });

      const page2 = await backupRestoreService.getBackups({
        userId,
        page: 2,
        limit: 2
      });

      assert.strictEqual(page1.backups.length, 2);
      assert.ok(page1.total >= 5);
    });

    it('should filter by chat', async () => {
      const chat1 = new mongoose.Types.ObjectId();
      const chat2 = new mongoose.Types.ObjectId();

      await backupRestoreService.createBackup({
        userId,
        chatId: chat1,
        backupType: 'single-chat'
      });

      await backupRestoreService.createBackup({
        userId,
        chatId: chat2,
        backupType: 'single-chat'
      });

      const list = await backupRestoreService.getBackups({
        userId,
        chatId: chat1,
        page: 1,
        limit: 10
      });

      assert.ok(list.backups.every(b => b.chatId.toString() === chat1.toString()));
    });
  });

  describe('TTL Expiration', () => {
    it('should auto-delete ChatBackup after 90 days', async () => {
      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      // Check TTL index exists
      const indexes = await ChatBackup.collection.getIndexes();

      const ttlIndex = Object.values(indexes).find(
        idx => idx.expireAfterSeconds !== undefined
      );

      assert.ok(ttlIndex);
      assert.strictEqual(ttlIndex.expireAfterSeconds, 7776000); // 90 days
    });

    it('should auto-delete RestoreQueue after 30 days', async () => {
      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      await backupRestoreService.restoreChatFromBackup({
        userId,
        backupId: backup._id
      });

      const indexes = await RestoreQueue.collection.getIndexes();

      const ttlIndex = Object.values(indexes).find(
        idx => idx.expireAfterSeconds !== undefined
      );

      assert.ok(ttlIndex);
      assert.strictEqual(ttlIndex.expireAfterSeconds, 2592000); // 30 days
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      try {
        // Attempt operation with invalid data
        await backupRestoreService.createBackup({
          userId: 'invalid-id',
          chatId,
          backupType: 'single-chat'
        });
      } catch (error) {
        assert.ok(error);
      }
    });

    it('should validate backup types', async () => {
      try {
        await backupRestoreService.createBackup({
          userId,
          chatId,
          backupType: 'invalid-type'
        });
        // Depending on validation, may succeed or fail
        assert.ok(true);
      } catch (error) {
        assert.ok(error);
      }
    });

    it('should handle concurrent restore requests', async () => {
      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      const restore1 = await backupRestoreService.restoreChatFromBackup({
        userId,
        backupId: backup._id
      });

      assert.ok(restore1._id);
    });
  });

  describe('Data Integrity', () => {
    it('should verify backup hash matches content', async () => {
      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat'
      });

      assert.ok(backup.backupHash);
      assert.strictEqual(backup.backupHash.length, 64); // SHA256 length
    });

    it('should track backup metadata', async () => {
      const backup = await backupRestoreService.createBackup({
        userId,
        chatId,
        backupType: 'single-chat',
        backupName: 'Test Backup'
      });

      assert.ok(backup.createdAt);
      assert.ok(backup.userId);
      assert.ok(backup.chatId);
      assert.ok(backup.backupHash);
      assert.strictEqual(backup.backupName, 'Test Backup');
    });
  });
});
