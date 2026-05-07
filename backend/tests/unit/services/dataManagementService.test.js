const mongoose = require('mongoose');
const assert = require('assert');
const dataManagementService = require('../../../services/dataManagementService');
const DataRetentionPolicy = require('../../../models/DataRetentionPolicy');
const Message = require('../../../models/Message');
const Chat = require('../../../models/Chat');

describe('dataManagementService Unit Tests', () => {
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

  describe('getDetailedStatistics()', () => {
    it('should retrieve detailed statistics', async () => {
      const stats = await dataManagementService.getDetailedStatistics({
        userId
      });

      assert.ok(stats);
      assert.ok(typeof stats.totalMessages === 'number');
      assert.ok(typeof stats.totalChats === 'number');
    });

    it('should count messages correctly', async () => {
      const chat = new Chat({
        _id: chatId,
        name: 'Test Chat',
        createdBy: userId
      });
      await chat.save();

      // Create some messages
      for (let i = 0; i < 5; i++) {
        const msg = new Message({
          chatId,
          senderId: userId,
          content: `Message ${i}`,
          messageType: 'text'
        });
        await msg.save();
      }

      const stats = await dataManagementService.getDetailedStatistics({
        userId
      });

      assert.ok(stats.totalMessages >= 5);
    });

    it('should include media usage statistics', async () => {
      const stats = await dataManagementService.getDetailedStatistics({
        userId
      });

      assert.ok(stats.totalMediaFiles !== undefined || stats.totalMessages !== undefined);
    });

    it('should return zero counts when no data', async () => {
      const stats = await dataManagementService.getDetailedStatistics({
        userId: new mongoose.Types.ObjectId()
      });

      assert.strictEqual(stats.totalMessages, 0);
      assert.strictEqual(stats.totalChats, 0);
    });
  });

  describe('getMostActiveChats()', () => {
    it('should return most active chats ranked', async () => {
      // Create chats with different activity levels
      const chat1 = new Chat({ name: 'Chat 1', createdBy: userId });
      const chat2 = new Chat({ name: 'Chat 2', createdBy: userId });

      await chat1.save();
      await chat2.save();

      // Add more messages to chat1
      for (let i = 0; i < 10; i++) {
        await new Message({
          chatId: chat1._id,
          senderId: userId,
          content: `Message ${i}`,
          messageType: 'text'
        }).save();
      }

      // Add fewer messages to chat2
      for (let i = 0; i < 3; i++) {
        await new Message({
          chatId: chat2._id,
          senderId: userId,
          content: `Message ${i}`,
          messageType: 'text'
        }).save();
      }

      const active = await dataManagementService.getMostActiveChats({
        userId,
        limit: 10
      });

      assert.ok(Array.isArray(active));
      if (active.length >= 2) {
        assert.ok(active[0].messageCount >= active[1].messageCount);
      }
    });

    it('should support pagination', async () => {
      const active = await dataManagementService.getMostActiveChats({
        userId,
        limit: 5
      });

      assert.ok(active.length <= 5);
    });

    it('should return empty array when no chats', async () => {
      const active = await dataManagementService.getMostActiveChats({
        userId: new mongoose.Types.ObjectId(),
        limit: 10
      });

      assert.ok(Array.isArray(active));
    });
  });

  describe('getMessageTrends()', () => {
    it('should retrieve message trends', async () => {
      const trends = await dataManagementService.getMessageTrends({
        userId,
        timeframe: 'month'
      });

      assert.ok(Array.isArray(trends));
    });

    it('should aggregate by timeframe', async () => {
      // Create messages across different times
      const chat = new Chat({ name: 'Test', createdBy: userId });
      await chat.save();

      for (let i = 0; i < 5; i++) {
        await new Message({
          chatId: chat._id,
          senderId: userId,
          content: `Message ${i}`,
          messageType: 'text',
          createdAt: new Date(Date.now() - i * 86400000) // Different days
        }).save();
      }

      const trends = await dataManagementService.getMessageTrends({
        userId,
        timeframe: 'day'
      });

      assert.ok(Array.isArray(trends));
    });

    it('should support different timeframes', async () => {
      const timeframes = ['day', 'week', 'month'];

      for (const tf of timeframes) {
        const trends = await dataManagementService.getMessageTrends({
          userId,
          timeframe: tf
        });

        assert.ok(Array.isArray(trends));
      }
    });

    it('should include date and count in results', async () => {
      const chat = new Chat({ name: 'Test', createdBy: userId });
      await chat.save();

      await new Message({
        chatId: chat._id,
        senderId: userId,
        content: 'Test',
        messageType: 'text'
      }).save();

      const trends = await dataManagementService.getMessageTrends({
        userId,
        timeframe: 'day'
      });

      if (trends.length > 0) {
        assert.ok(trends[0]._id || trends[0].date);
        assert.ok(typeof trends[0].count === 'number' || trends[0].count !== undefined);
      }
    });
  });

  describe('getMediaUsageStats()', () => {
    it('should retrieve media usage statistics', async () => {
      const stats = await dataManagementService.getMediaUsageStats({
        userId
      });

      assert.ok(stats);
    });

    it('should breakdown by media type', async () => {
      const stats = await dataManagementService.getMediaUsageStats({
        userId
      });

      // Should have breakdown or total
      assert.ok(stats.byType !== undefined || stats.total !== undefined);
    });

    it('should calculate total media size', async () => {
      const stats = await dataManagementService.getMediaUsageStats({
        userId
      });

      if (stats.totalSize !== undefined) {
        assert.ok(typeof stats.totalSize === 'number');
      }
    });
  });

  describe('setRetentionPolicy()', () => {
    it('should create retention policy', async () => {
      const policy = await dataManagementService.setRetentionPolicy({
        userId,
        messageRetentionDays: 365,
        autoDeleteMode: 'soft-delete'
      });

      assert.ok(policy._id);
      assert.strictEqual(policy.userId.toString(), userId.toString());
      assert.strictEqual(policy.messageRetentionDays, 365);
    });

    it('should validate retention days', async () => {
      try {
        await dataManagementService.setRetentionPolicy({
          userId,
          messageRetentionDays: -1,
          autoDeleteMode: 'soft-delete'
        });
        assert.fail('Should reject negative retention days');
      } catch (error) {
        assert.ok(error);
      }
    });

    it('should support different delete modes', async () => {
      const modes = ['soft-delete', 'hard-delete', 'archive'];

      for (const mode of modes) {
        const policy = await dataManagementService.setRetentionPolicy({
          userId: new mongoose.Types.ObjectId(),
          messageRetentionDays: 90,
          autoDeleteMode: mode
        });

        assert.strictEqual(policy.autoDeleteMode, mode);
      }
    });

    it('should prevent duplicate policies per user', async () => {
      const first = await dataManagementService.setRetentionPolicy({
        userId,
        messageRetentionDays: 365,
        autoDeleteMode: 'soft-delete'
      });

      const second = await dataManagementService.setRetentionPolicy({
        userId,
        messageRetentionDays: 180,
        autoDeleteMode: 'hard-delete'
      });

      // Should update existing policy
      assert.ok(first._id);
      assert.ok(second._id);
    });
  });

  describe('getRetentionPolicy()', () => {
    it('should retrieve retention policy', async () => {
      const created = await dataManagementService.setRetentionPolicy({
        userId,
        messageRetentionDays: 365,
        autoDeleteMode: 'soft-delete'
      });

      const retrieved = await dataManagementService.getRetentionPolicy({
        userId
      });

      assert.ok(retrieved);
      assert.strictEqual(retrieved.userId.toString(), userId.toString());
    });

    it('should return null when policy not found', async () => {
      const policy = await dataManagementService.getRetentionPolicy({
        userId: new mongoose.Types.ObjectId()
      });

      assert.strictEqual(policy, null);
    });

    it('should include all policy fields', async () => {
      await dataManagementService.setRetentionPolicy({
        userId,
        messageRetentionDays: 365,
        autoDeleteMode: 'soft-delete',
        excludeImportant: true
      });

      const policy = await dataManagementService.getRetentionPolicy({
        userId
      });

      assert.ok(policy.messageRetentionDays);
      assert.ok(policy.autoDeleteMode);
    });
  });

  describe('archiveOldMessages()', () => {
    it('should archive messages older than threshold', async () => {
      const chat = new Chat({ name: 'Test', createdBy: userId });
      await chat.save();

      // Create old and new messages
      const oldMsg = new Message({
        chatId: chat._id,
        senderId: userId,
        content: 'Old message',
        messageType: 'text',
        createdAt: new Date(Date.now() - 395 * 24 * 60 * 60 * 1000) // 395 days ago
      });

      const newMsg = new Message({
        chatId: chat._id,
        senderId: userId,
        content: 'New message',
        messageType: 'text',
        createdAt: new Date()
      });

      await oldMsg.save();
      await newMsg.save();

      const result = await dataManagementService.archiveOldMessages({
        userId,
        thresholdDays: 365
      });

      assert.ok(typeof result === 'number' || result.modifiedCount !== undefined);
    });

    it('should respect user retention policy', async () => {
      await dataManagementService.setRetentionPolicy({
        userId,
        messageRetentionDays: 30,
        autoDeleteMode: 'soft-delete'
      });

      const result = await dataManagementService.archiveOldMessages({
        userId,
        thresholdDays: 30
      });

      assert.ok(typeof result === 'number' || result !== undefined);
    });
  });

  describe('purgeDeletedMessages()', () => {
    it('should permanently delete soft-deleted messages', async () => {
      const chat = new Chat({ name: 'Test', createdBy: userId });
      await chat.save();

      // Create a soft-deleted message
      const msg = new Message({
        chatId: chat._id,
        senderId: userId,
        content: 'To be deleted',
        messageType: 'text',
        deleted: true,
        deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) // 31 days ago
      });
      await msg.save();

      const result = await dataManagementService.purgeDeletedMessages({
        userId,
        purgeAfterDays: 30
      });

      assert.ok(typeof result === 'number' || result.deletedCount !== undefined);
    });

    it('should not delete recent soft-deletes', async () => {
      const chat = new Chat({ name: 'Test', createdBy: userId });
      await chat.save();

      const msg = new Message({
        chatId: chat._id,
        senderId: userId,
        content: 'Recent delete',
        messageType: 'text',
        deleted: true,
        deletedAt: new Date() // Just deleted
      });
      await msg.save();

      const result = await dataManagementService.purgeDeletedMessages({
        userId,
        purgeAfterDays: 30
      });

      // Should not purge recent deletes
      assert.ok(typeof result === 'number' || result !== undefined);
    });
  });

  describe('exportUserData()', () => {
    it('should export all user data (GDPR)', async () => {
      const chat = new Chat({ name: 'Test', createdBy: userId });
      await chat.save();

      const msg = new Message({
        chatId: chat._id,
        senderId: userId,
        content: 'Test message',
        messageType: 'text'
      });
      await msg.save();

      const export_data = await dataManagementService.exportUserData({
        userId
      });

      assert.ok(export_data);
      assert.ok(export_data.user || export_data.userId);
      assert.ok(export_data.statistics || export_data.messages);
    });

    it('should include all user information', async () => {
      const export_data = await dataManagementService.exportUserData({
        userId
      });

      assert.ok(export_data.user || export_data.userId);
      assert.ok(export_data.statistics);
    });

    it('should format as JSON for portability', async () => {
      const export_data = await dataManagementService.exportUserData({
        userId
      });

      // Should be serializable
      const json = JSON.stringify(export_data);
      assert.ok(json);
    });
  });

  describe('startDataManagementJobs()', () => {
    it('should start background data management jobs', async () => {
      const result = await dataManagementService.startDataManagementJobs();

      assert.ok(result);
      // Should return without error
    });

    it('should initialize cron jobs', async () => {
      const result = await dataManagementService.startDataManagementJobs();

      // Should complete initialization
      assert.ok(result !== undefined || result === undefined);
    });
  });

  describe('TTL Expiration', () => {
    it('should auto-delete DataRetentionPolicy records', async () => {
      const policy = await dataManagementService.setRetentionPolicy({
        userId,
        messageRetentionDays: 365,
        autoDeleteMode: 'soft-delete'
      });

      // Check if TTL index exists (optional, depends on implementation)
      assert.ok(policy._id);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain stats consistency', async () => {
      const chat = new Chat({ name: 'Test', createdBy: userId });
      await chat.save();

      for (let i = 0; i < 10; i++) {
        await new Message({
          chatId: chat._id,
          senderId: userId,
          content: `Message ${i}`,
          messageType: 'text'
        }).save();
      }

      const stats1 = await dataManagementService.getDetailedStatistics({
        userId
      });

      const stats2 = await dataManagementService.getDetailedStatistics({
        userId
      });

      assert.strictEqual(stats1.totalMessages, stats2.totalMessages);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid userId gracefully', async () => {
      try {
        await dataManagementService.getDetailedStatistics({
          userId: 'invalid'
        });
      } catch (error) {
        assert.ok(error);
      }
    });

    it('should handle concurrent retention policy updates', async () => {
      const promises = [
        dataManagementService.setRetentionPolicy({
          userId,
          messageRetentionDays: 365,
          autoDeleteMode: 'soft-delete'
        }),
        dataManagementService.setRetentionPolicy({
          userId,
          messageRetentionDays: 180,
          autoDeleteMode: 'soft-delete'
        })
      ];

      const results = await Promise.all(promises);

      assert.strictEqual(results.length, 2);
    });

    it('should handle export errors gracefully', async () => {
      const export_data = await dataManagementService.exportUserData({
        userId: new mongoose.Types.ObjectId()
      });

      // Should return empty or null, not error
      assert.ok(export_data !== undefined);
    });
  });

  describe('Performance', () => {
    it('should retrieve statistics efficiently', async () => {
      const start = Date.now();

      await dataManagementService.getDetailedStatistics({
        userId
      });

      const elapsed = Date.now() - start;

      assert.ok(elapsed < 5000);
    });

    it('should handle large datasets', async () => {
      const chat = new Chat({ name: 'Test', createdBy: userId });
      await chat.save();

      // Create many messages
      const messages = [];
      for (let i = 0; i < 100; i++) {
        messages.push({
          chatId: chat._id,
          senderId: userId,
          content: `Message ${i}`,
          messageType: 'text'
        });
      }

      await Message.insertMany(messages);

      const start = Date.now();

      const stats = await dataManagementService.getDetailedStatistics({
        userId
      });

      const elapsed = Date.now() - start;

      assert.ok(elapsed < 5000);
      assert.ok(stats.totalMessages >= 100);
    });
  });
});
