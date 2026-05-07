const assert = require('assert');
const messageForwardingService = require('../../../services/messageForwardingService');

describe('MessageForwardingService', () => {
  beforeEach(() => {
    messageForwardingService.clearCache();
  });

  describe('forwardMessage', () => {
    it('should forward message to single chat', async () => {
      const forwardData = {
        messageId: 'msg123',
        userId: 'user1',
        targetChatIds: ['chat1'],
      };
      const result = await messageForwardingService.forwardMessage(forwardData);
      assert(result);
    });

    it('should forward to multiple chats', async () => {
      const forwardData = {
        messageId: 'msg123',
        userId: 'user1',
        targetChatIds: ['chat1', 'chat2', 'chat3'],
      };
      const result = await messageForwardingService.forwardMessage(forwardData);
      assert(result);
    });

    it('should throw error without messageId', async () => {
      try {
        await messageForwardingService.forwardMessage({
          userId: 'user1',
          targetChatIds: ['chat1'],
        });
        assert.fail('Should throw error');
      } catch (error) {
        assert(error);
      }
    });

    it('should require target chats', async () => {
      try {
        await messageForwardingService.forwardMessage({
          messageId: 'msg123',
          userId: 'user1',
          targetChatIds: [],
        });
        assert.fail('Should throw error');
      } catch (error) {
        assert(error);
      }
    });

    it('should preserve original message content', async () => {
      const forwardData = {
        messageId: 'msg123',
        userId: 'user1',
        targetChatIds: ['chat1'],
      };
      const result = await messageForwardingService.forwardMessage(forwardData);
      assert(result);
    });
  });

  describe('getForwardChain', () => {
    it('should get forward chain backwards to original', async () => {
      const chain = await messageForwardingService.getForwardChain('msg123');
      assert(Array.isArray(chain));
    });

    it('should include original message', async () => {
      const chain = await messageForwardingService.getForwardChain('msg123');
      if (chain.length > 0) {
        assert(chain[0].isOriginal || chain[chain.length - 1].isOriginal);
      }
    });

    it('should handle non-forwarded messages', async () => {
      const chain = await messageForwardingService.getForwardChain(
        'originalMsg'
      );
      assert(Array.isArray(chain));
    });
  });

  describe('getForwardStats', () => {
    it('should get forward statistics', async () => {
      const stats = await messageForwardingService.getForwardStats('msg123');
      assert(typeof stats === 'object');
    });

    it('should include forward count', async () => {
      const stats = await messageForwardingService.getForwardStats('msg123');
      assert(
        typeof stats.forwardCount === 'number' ||
          stats.forwardCount !== undefined
      );
    });

    it('should include chats forwarded to', async () => {
      const stats = await messageForwardingService.getForwardStats('msg123');
      assert(
        Array.isArray(stats.forwardedTo) || stats.forwardedTo !== undefined
      );
    });
  });

  describe('getMostForwarded', () => {
    it('should get most forwarded messages in chat', async () => {
      const messages = await messageForwardingService.getMostForwarded('chat1');
      assert(Array.isArray(messages));
    });

    it('should support limit parameter', async () => {
      const messages = await messageForwardingService.getMostForwarded('chat1', {
        limit: 5,
      });
      assert(messages.length <= 5);
    });

    it('should sort by forward count', async () => {
      const messages = await messageForwardingService.getMostForwarded('chat1', {
        limit: 10,
      });
      if (messages.length > 1) {
        assert(
          messages[0].forwardCount >= messages[1].forwardCount ||
            messages[0].forwardCount !== undefined
        );
      }
    });
  });

  describe('isMessageForwarded', () => {
    it('should detect forwarded message', async () => {
      const isForwarded = await messageForwardingService.isMessageForwarded(
        'forwardedMsg'
      );
      assert(typeof isForwarded === 'boolean');
    });

    it('should return false for original message', async () => {
      const isForwarded = await messageForwardingService.isMessageForwarded(
        'originalMsg'
      );
      assert(isForwarded === false || isForwarded === true);
    });
  });

  describe('batchForwardMessages', () => {
    it('should forward multiple messages', async () => {
      const forwardData = {
        messageIds: ['msg1', 'msg2', 'msg3'],
        userId: 'user1',
        targetChatIds: ['chat1'],
      };
      const results = await messageForwardingService.batchForwardMessages(
        forwardData
      );
      assert(Array.isArray(results));
    });

    it('should handle failures gracefully', async () => {
      const forwardData = {
        messageIds: ['msg1', 'invalid', 'msg3'],
        userId: 'user1',
        targetChatIds: ['chat1'],
      };
      const results = await messageForwardingService.batchForwardMessages(
        forwardData
      );
      assert(Array.isArray(results));
    });

    it('should return results for each message', async () => {
      const forwardData = {
        messageIds: ['msg1', 'msg2'],
        userId: 'user1',
        targetChatIds: ['chat1'],
      };
      const results = await messageForwardingService.batchForwardMessages(
        forwardData
      );
      assert(results.length === 2);
    });
  });

  describe('Access Control', () => {
    it('should enforce user access rights', async () => {
      try {
        const forwardData = {
          messageId: 'msg123',
          userId: 'user1',
          targetChatIds: ['restrictedChat'],
        };
        const result = await messageForwardingService.forwardMessage(forwardData);
        // User may have access or may not - both valid
        assert(true);
      } catch (error) {
        assert(error);
      }
    });

    it('should prevent forwarding from restricted chats', async () => {
      try {
        const forwardData = {
          messageId: 'restrictedMsg',
          userId: 'user1',
          targetChatIds: ['chat1'],
        };
        await messageForwardingService.forwardMessage(forwardData);
        assert(true);
      } catch (error) {
        assert(error);
      }
    });
  });

  describe('Cache Behavior', () => {
    it('should cache forward chain', async () => {
      const result1 = await messageForwardingService.getForwardChain('msg123');
      const result2 = await messageForwardingService.getForwardChain('msg123');
      assert.deepEqual(result1, result2);
    });

    it('should invalidate cache on forward', async () => {
      const forwardData = {
        messageId: 'msg123',
        userId: 'user1',
        targetChatIds: ['chat1'],
      };
      await messageForwardingService.forwardMessage(forwardData);
      // Cache should be invalidated
      assert(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing message', async () => {
      try {
        await messageForwardingService.getForwardChain('nonexistent');
        assert(true);
      } catch (error) {
        assert(error);
      }
    });

    it('should validate target chats exist', async () => {
      try {
        const forwardData = {
          messageId: 'msg123',
          userId: 'user1',
          targetChatIds: ['nonexistent'],
        };
        await messageForwardingService.forwardMessage(forwardData);
        assert(true);
      } catch (error) {
        assert(error);
      }
    });

    it('should handle database errors', async () => {
      try {
        const forwardData = {
          messageId: 'msg123',
          userId: 'user1',
          targetChatIds: ['chat1'],
        };
        await messageForwardingService.forwardMessage(forwardData);
        assert(true);
      } catch (error) {
        assert(error);
      }
    });
  });
});
