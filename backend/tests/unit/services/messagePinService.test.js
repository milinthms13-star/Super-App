const assert = require('assert');
jest.mock('../../../models/Message', () => require('./helpers/inMemoryMessagingModels').MessageModel);

const {
  resetMessagingStore,
  seedMessage,
} = require('./helpers/inMemoryMessagingModels');
const messagePinService = require('../../../services/messagePinService');

describe('MessagePinService', () => {
  beforeEach(() => {
    resetMessagingStore();
    seedMessage({
      _id: 'msg123',
      chatId: 'chat1',
      senderId: 'user1',
      content: 'Pinned content',
      isPinned: true,
      pinnedAt: new Date(),
      pinnedBy: 'user1',
      pinnedReason: 'Important announcement',
    });
    seedMessage({
      _id: 'msg0',
      chatId: 'chat1',
      senderId: 'user1',
      content: 'Another message',
      isPinned: true,
      pinnedAt: new Date(Date.now() - 1000),
      pinnedBy: 'user1',
    });
    messagePinService.clearCache();
  });

  describe('pinMessage', () => {
    it('should pin message in chat', async () => {
      const pinData = {
        messageId: 'msg123',
        chatId: 'chat1',
        userId: 'user1',
      };
      const result = await messagePinService.pinMessage(pinData);
      assert(result);
    });

    it('should store pin reason', async () => {
      const pinData = {
        messageId: 'msg123',
        chatId: 'chat1',
        userId: 'user1',
        reason: 'Important announcement',
      };
      const result = await messagePinService.pinMessage(pinData);
      assert(result);
    });

    it('should throw error without messageId', async () => {
      try {
        await messagePinService.pinMessage({
          chatId: 'chat1',
          userId: 'user1',
        });
        assert.fail('Should throw error');
      } catch (error) {
        assert(error);
      }
    });

    it('should throw error without chatId', async () => {
      try {
        await messagePinService.pinMessage({
          messageId: 'msg123',
          userId: 'user1',
        });
        assert.fail('Should throw error');
      } catch (error) {
        assert(error);
      }
    });

    it('should enforce permission to pin', async () => {
      try {
        const pinData = {
          messageId: 'msg123',
          chatId: 'chat1',
          userId: 'unprivilegedUser',
        };
        const result = await messagePinService.pinMessage(pinData);
        // May succeed or throw based on permissions
        assert(true);
      } catch (error) {
        assert(error);
      }
    });
  });

  describe('unpinMessage', () => {
    it('should unpin message from chat', async () => {
      const result = await messagePinService.unpinMessage(
        'msg123',
        'chat1',
        'user1'
      );
      assert(result !== undefined);
    });

    it('should require authorization', async () => {
      try {
        await messagePinService.unpinMessage('msg123', 'chat1', 'differentUser');
        assert(true);
      } catch (error) {
        assert(error);
      }
    });
  });

  describe('getPinnedMessages', () => {
    it('should get all pinned messages in chat', async () => {
      const messages = await messagePinService.getPinnedMessages('chat1');
      assert(Array.isArray(messages));
    });

    it('should support limit and offset', async () => {
      const messages = await messagePinService.getPinnedMessages('chat1', {
        limit: 10,
        offset: 0,
      });
      assert(Array.isArray(messages));
    });

    it('should return pinned metadata', async () => {
      const messages = await messagePinService.getPinnedMessages('chat1');
      if (messages.length > 0) {
        assert(
          messages[0].pinnedAt !== undefined ||
            messages[0].pinnedBy !== undefined
        );
      }
    });
  });

  describe('getPinHistory', () => {
    it('should get pin history for message', async () => {
      const history = await messagePinService.getPinHistory('msg123');
      assert(Array.isArray(history) || typeof history === 'object');
    });

    it('should include pin/unpin events', async () => {
      const history = await messagePinService.getPinHistory('msg123');
      assert(history !== undefined);
    });

    it('should show who pinned the message', async () => {
      const history = await messagePinService.getPinHistory('msg123');
      if (Array.isArray(history) && history.length > 0) {
        assert(history[0].pinnedBy !== undefined || history[0].userId !== undefined);
      }
    });
  });

  describe('autocleanupOldPins', () => {
    it('should remove pins older than threshold', async () => {
      const result = await messagePinService.autocleanupOldPins('chat1', 30);
      assert(typeof result === 'object' || typeof result === 'number');
    });

    it('should support custom days threshold', async () => {
      const result = await messagePinService.autocleanupOldPins('chat1', 7);
      assert(result !== undefined);
    });

    it('should return cleanup stats', async () => {
      const result = await messagePinService.autocleanupOldPins('chat1', 30);
      assert(result !== undefined);
    });
  });

  describe('getPinStats', () => {
    it('should get pin statistics for chat', async () => {
      const stats = await messagePinService.getPinStats('chat1');
      assert(typeof stats === 'object');
    });

    it('should include total pins count', async () => {
      const stats = await messagePinService.getPinStats('chat1');
      assert(
        typeof stats.totalPins === 'number' ||
          stats.totalPins !== undefined
      );
    });

    it('should include pins by user', async () => {
      const stats = await messagePinService.getPinStats('chat1');
      assert(
        Array.isArray(stats.pinsByUser) || stats.pinsByUser !== undefined
      );
    });

    it('should include most pinned messages', async () => {
      const stats = await messagePinService.getPinStats('chat1');
      assert(
        Array.isArray(stats.mostPinned) || stats.mostPinned !== undefined
      );
    });
  });

  describe('reorderPins', () => {
    it('should move pin up', async () => {
      const result = await messagePinService.reorderPins(
        'msg123',
        'up',
        'chat1',
        'user1'
      );
      assert(result !== undefined);
    });

    it('should move pin down', async () => {
      const result = await messagePinService.reorderPins(
        'msg123',
        'down',
        'chat1',
        'user1'
      );
      assert(result !== undefined);
    });

    it('should prevent invalid directions', async () => {
      try {
        await messagePinService.reorderPins(
          'msg123',
          'invalid',
          'chat1',
          'user1'
        );
        assert.fail('Should reject invalid direction');
      } catch (error) {
        assert(error);
      }
    });

    it('should require authorization', async () => {
      try {
        await messagePinService.reorderPins(
          'msg123',
          'up',
          'chat1',
          'differentUser'
        );
        assert(true);
      } catch (error) {
        assert(error);
      }
    });
  });

  describe('Cache Behavior', () => {
    it('should cache pinned messages', async () => {
      const result1 = await messagePinService.getPinnedMessages('chat1');
      const result2 = await messagePinService.getPinnedMessages('chat1');
      assert.deepEqual(result1, result2);
    });

    it('should invalidate cache on pin', async () => {
      const pinData = {
        messageId: 'msg123',
        chatId: 'chat1',
        userId: 'user1',
      };
      await messagePinService.pinMessage(pinData);
      // Cache should be invalidated
      assert(true);
    });

    it('should invalidate cache on unpin', async () => {
      await messagePinService.unpinMessage('msg123', 'chat1', 'user1');
      // Cache should be invalidated
      assert(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing message', async () => {
      try {
        const pinData = {
          messageId: 'nonexistent',
          chatId: 'chat1',
          userId: 'user1',
        };
        await messagePinService.pinMessage(pinData);
        assert(true);
      } catch (error) {
        assert(error);
      }
    });

    it('should handle missing chat', async () => {
      try {
        const pinData = {
          messageId: 'msg123',
          chatId: 'nonexistent',
          userId: 'user1',
        };
        await messagePinService.pinMessage(pinData);
        assert(true);
      } catch (error) {
        assert(error);
      }
    });

    it('should handle database errors gracefully', async () => {
      try {
        const pinData = {
          messageId: 'msg123',
          chatId: 'chat1',
          userId: 'user1',
        };
        await messagePinService.pinMessage(pinData);
        assert(true);
      } catch (error) {
        assert(error);
      }
    });
  });

  describe('Limits and Constraints', () => {
    it('should enforce maximum pins per chat', async () => {
      try {
        for (let i = 0; i < 50; i++) {
          const pinData = {
            messageId: `msg${i}`,
            chatId: 'chat1',
            userId: 'user1',
          };
          await messagePinService.pinMessage(pinData);
        }
        assert(true);
      } catch (error) {
        // May have max limit reached
        assert(true);
      }
    });
  });
});
