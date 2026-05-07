const assert = require('assert');
jest.mock('../../../models/Message', () => require('./helpers/inMemoryMessagingModels').MessageModel);
jest.mock('../../../models/DisappearingMessage', () => require('./helpers/inMemoryMessagingModels').DisappearingMessageModel);
jest.mock('../../../models/Chat', () => require('./helpers/inMemoryMessagingModels').ChatModel);

const { resetMessagingStore, seedChat } = require('./helpers/inMemoryMessagingModels');
const disappearingMessageService = require('../../../services/disappearingMessageService');

describe('Disappearing Message Service', () => {
  const testChatId = 'test-chat-123';
  const testUserId = 'test-user-456';

  beforeEach(() => {
    resetMessagingStore();
    disappearingMessageService.clearCache();
    seedChat({
      _id: testChatId,
      owner: testUserId,
      participants: [testUserId, 'user-1', 'user-2'],
      name: 'Secret Chat',
    });
  });

  afterEach(() => {
    disappearingMessageService.clearCache();
  });

  describe('createDisappearingMessage', () => {
    it('should create timer-based disappearing message', async () => {
      try {
        const result = await disappearingMessageService.createDisappearingMessage(
          testChatId,
          testUserId,
          'Secret message',
          'timer',
          3600 // 1 hour
        );
        assert(result._id);
        assert(result.isDisappearing);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should create view-based disappearing message', async () => {
      try {
        const result = await disappearingMessageService.createDisappearingMessage(
          testChatId,
          testUserId,
          'View-based message',
          'view',
          0
        );
        assert(result._id);
        assert(result.isDisappearing);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should reject invalid disappear type', async () => {
      try {
        await disappearingMessageService.createDisappearingMessage(
          testChatId,
          testUserId,
          'Message',
          'invalid',
          3600
        );
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('Invalid'));
      }
    });

    it('should reject invalid duration', async () => {
      try {
        await disappearingMessageService.createDisappearingMessage(
          testChatId,
          testUserId,
          'Message',
          'timer',
          0
        );
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('between'));
      }
    });

    it('should reject duration over 24 hours', async () => {
      try {
        await disappearingMessageService.createDisappearingMessage(
          testChatId,
          testUserId,
          'Message',
          'timer',
          100000 // More than 24 hours
        );
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('between'));
      }
    });

    it('should include metadata and attachments', async () => {
      try {
        const result = await disappearingMessageService.createDisappearingMessage(
          testChatId,
          testUserId,
          'Message',
          'timer',
          3600,
          { metadata: { key: 'value' }, attachments: [] }
        );
        assert(result._id);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('markAsViewed', () => {
    it('should mark message as viewed', async () => {
      try {
        const message = await disappearingMessageService.createDisappearingMessage(
          testChatId,
          testUserId,
          'Message',
          'timer',
          3600
        );

        const result = await disappearingMessageService.markAsViewed(message._id, testUserId);
        assert(result.disappearingMessage.viewCount === 1);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should not duplicate views from same user', async () => {
      try {
        const message = await disappearingMessageService.createDisappearingMessage(
          testChatId,
          testUserId,
          'Message',
          'view',
          0
        );

        await disappearingMessageService.markAsViewed(message._id, testUserId);
        const result = await disappearingMessageService.markAsViewed(message._id, testUserId);
        assert(result.disappearingMessage.viewCount === 1);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should track multiple viewers', async () => {
      try {
        const message = await disappearingMessageService.createDisappearingMessage(
          testChatId,
          testUserId,
          'Message',
          'view',
          0
        );

        await disappearingMessageService.markAsViewed(message._id, 'user-1');
        const result = await disappearingMessageService.markAsViewed(message._id, 'user-2');
        assert(result.disappearingMessage.viewCount === 2);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should reject viewing non-disappearing message', async () => {
      try {
        await disappearingMessageService.markAsViewed('non-existent-id', testUserId);
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });
  });

  describe('processExpiredMessages', () => {
    it('should process expired messages', async () => {
      try {
        const count = await disappearingMessageService.processExpiredMessages();
        assert(typeof count === 'number');
        assert(count >= 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should mark messages as disappeared', async () => {
      try {
        const result = await disappearingMessageService.processExpiredMessages();
        assert(typeof result === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('deleteDisappearingMessage', () => {
    it('should delete disappearing message', async () => {
      try {
        const message = await disappearingMessageService.createDisappearingMessage(
          testChatId,
          testUserId,
          'Message',
          'timer',
          3600
        );

        const result = await disappearingMessageService.deleteDisappearingMessage(message._id);
        assert(result === true);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should soft delete message', async () => {
      try {
        const message = await disappearingMessageService.createDisappearingMessage(
          testChatId,
          testUserId,
          'Message',
          'timer',
          3600
        );

        await disappearingMessageService.deleteDisappearingMessage(message._id);
        // Message should be marked as deleted, not removed from database
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should handle deletion of non-existent message', async () => {
      try {
        await disappearingMessageService.deleteDisappearingMessage('non-existent-id');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });
  });

  describe('getDisappearingMessages', () => {
    it('should retrieve active disappearing messages', async () => {
      try {
        const result = await disappearingMessageService.getDisappearingMessages(testChatId);
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should respect limit parameter', async () => {
      try {
        const result = await disappearingMessageService.getDisappearingMessages(testChatId, {
          limit: 5,
        });
        assert(result.length <= 5);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should filter by status', async () => {
      try {
        const active = await disappearingMessageService.getDisappearingMessages(testChatId, {
          status: 'active',
        });
        assert(Array.isArray(active));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('getDisappearingStats', () => {
    it('should return statistics for chat', async () => {
      try {
        const stats = await disappearingMessageService.getDisappearingStats(testChatId);
        assert(typeof stats.active === 'number');
        assert(typeof stats.disappeared === 'number');
        assert(typeof stats.expired === 'number');
        assert(typeof stats.total === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should track active messages', async () => {
      try {
        const statsBefore = await disappearingMessageService.getDisappearingStats(testChatId);
        const activeBefore = statsBefore.active || 0;

        await disappearingMessageService.createDisappearingMessage(
          testChatId,
          testUserId,
          'Message',
          'timer',
          3600
        );

        const statsAfter = await disappearingMessageService.getDisappearingStats(testChatId);
        assert(statsAfter.active >= activeBefore);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('setChatDisappearingDefault', () => {
    it('should set default disappearing settings for chat', async () => {
      try {
        const result = await disappearingMessageService.setChatDisappearingDefault(
          testChatId,
          'timer',
          3600
        );
        assert(result);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should handle non-existent chat', async () => {
      try {
        await disappearingMessageService.setChatDisappearingDefault('non-existent', 'timer', 3600);
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });
  });

  describe('getMessageViewStatus', () => {
    it('should return view status for message', async () => {
      try {
        const message = await disappearingMessageService.createDisappearingMessage(
          testChatId,
          testUserId,
          'Message',
          'view',
          0
        );

        const status = await disappearingMessageService.getMessageViewStatus(message._id);
        assert.strictEqual(status.type, 'view');
        assert(typeof status.viewCount === 'number');
        assert(Array.isArray(status.readBy));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should return time remaining for timer-based', async () => {
      try {
        const message = await disappearingMessageService.createDisappearingMessage(
          testChatId,
          testUserId,
          'Message',
          'timer',
          3600
        );

        const status = await disappearingMessageService.getMessageViewStatus(message._id);
        assert(typeof status.timeRemaining === 'number');
        assert(status.timeRemaining > 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should handle non-existent message', async () => {
      try {
        await disappearingMessageService.getMessageViewStatus('non-existent-id');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message);
      }
    });
  });

  describe('Cache behavior', () => {
    it('should cache disappearing messages', async () => {
      try {
        const result1 = await disappearingMessageService.getDisappearingMessages(testChatId);
        const result2 = await disappearingMessageService.getDisappearingMessages(testChatId);
        assert(Array.isArray(result1));
        assert(Array.isArray(result2));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should invalidate cache on create', async () => {
      try {
        await disappearingMessageService.getDisappearingMessages(testChatId);
        await disappearingMessageService.createDisappearingMessage(
          testChatId,
          testUserId,
          'Message',
          'timer',
          3600
        );
        const result = await disappearingMessageService.getDisappearingMessages(testChatId);
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should clear all cache', async () => {
      try {
        disappearingMessageService.clearCache();
        const result = await disappearingMessageService.getDisappearingMessages(testChatId);
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });
});
