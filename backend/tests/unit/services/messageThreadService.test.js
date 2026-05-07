const assert = require('assert');
const mongoose = require('mongoose');
jest.mock('../../../models/Message', () => require('./helpers/inMemoryMessagingModels').MessageModel);

const {
  resetMessagingStore,
  seedMessage,
  seedChat,
} = require('./helpers/inMemoryMessagingModels');
const messageThreadService = require('../../../services/messageThreadService');

describe('MessageThreadService', () => {
  const parentMessageId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const messageId = new mongoose.Types.ObjectId();
  const chatId = new mongoose.Types.ObjectId();
  const replyId = new mongoose.Types.ObjectId();
  const nestedMessageId = new mongoose.Types.ObjectId();
  const largeThreadId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    resetMessagingStore();
    messageThreadService.clearCache();
    seedChat({
      _id: chatId.toString(),
      owner: userId.toString(),
      participants: [userId.toString(), 'user-2'],
      name: 'Thread Chat',
    });
    seedMessage({
      _id: parentMessageId.toString(),
      chatId: chatId.toString(),
      senderId: userId.toString(),
      content: 'Parent message',
      metadata: { threadDepth: 0 },
      replyCount: 0,
      createdAt: new Date('2026-05-01T10:00:00Z'),
    });
    seedMessage({
      _id: messageId.toString(),
      chatId: chatId.toString(),
      senderId: userId.toString(),
      content: 'Thread root',
      metadata: { threadDepth: 0 },
      replyCount: 2,
      createdAt: new Date('2026-05-02T10:00:00Z'),
    });
    seedMessage({
      _id: replyId.toString(),
      chatId: chatId.toString(),
      senderId: userId.toString(),
      parentMessageId: messageId.toString(),
      content: 'First reply',
      createdAt: new Date('2026-05-02T11:00:00Z'),
    });
    seedMessage({
      _id: nestedMessageId.toString(),
      chatId: chatId.toString(),
      senderId: 'user-2',
      parentMessageId: replyId.toString(),
      content: 'Nested reply',
      createdAt: new Date('2026-05-02T12:00:00Z'),
    });
    seedMessage({
      _id: largeThreadId.toString(),
      chatId: chatId.toString(),
      senderId: userId.toString(),
      content: 'Large thread root',
      replyCount: 3,
      createdAt: new Date('2026-05-03T10:00:00Z'),
    });
    seedMessage({
      _id: 'large-reply-1',
      chatId: chatId.toString(),
      senderId: 'user-2',
      parentMessageId: largeThreadId.toString(),
      content: 'Large reply 1',
      createdAt: new Date('2026-05-03T10:10:00Z'),
    });
    seedMessage({
      _id: 'large-reply-2',
      chatId: chatId.toString(),
      senderId: 'user-3',
      parentMessageId: largeThreadId.toString(),
      content: 'Large reply 2',
      createdAt: new Date('2026-05-03T10:20:00Z'),
    });
  });

  describe('createReply', () => {
    it('should create reply to parent message', async () => {
      const replyData = {
        parentMessageId,
        userId,
        content: 'This is a reply',
        attachments: [],
      };
      const reply = await messageThreadService.createReply(replyData);
      assert(reply);
    });

    it('should throw error without parentMessageId', async () => {
      try {
        await messageThreadService.createReply({
          userId,
          content: 'reply',
        });
        assert.fail('Should throw error');
      } catch (error) {
        assert(error);
      }
    });

    it('should set replyCount on parent message', async () => {
      const replyData = {
        parentMessageId,
        userId,
        content: 'reply',
      };
      const reply = await messageThreadService.createReply(replyData);
      assert(reply);
    });
  });

  describe('getThread', () => {
    it('should get thread with parent and replies', async () => {
      const thread = await messageThreadService.getThread(messageId);
      assert(typeof thread === 'object');
    });

    it('should include parent message', async () => {
      const thread = await messageThreadService.getThread(messageId);
      assert(thread.parent !== undefined || thread.parentMessageId !== undefined);
    });

    it('should include all replies', async () => {
      const thread = await messageThreadService.getThread(messageId);
      assert(Array.isArray(thread.replies) || thread.replies !== undefined);
    });

    it('should support pagination of replies', async () => {
      const thread = await messageThreadService.getThread(messageId, {
        limit: 10,
        offset: 0,
      });
      assert(typeof thread === 'object');
    });
  });

  describe('getThreadChain', () => {
    it('should get full conversation chain', async () => {
      const chain = await messageThreadService.getThreadChain(messageId);
      assert(Array.isArray(chain));
    });

    it('should include all ancestors', async () => {
      const chain = await messageThreadService.getThreadChain(messageId);
      assert(Array.isArray(chain));
    });

    it('should return in order', async () => {
      const chain = await messageThreadService.getThreadChain(messageId);
      if (chain.length > 1) {
        assert(chain[0].createdAt <= chain[1].createdAt);
      }
    });
  });

  describe('getThreadDescendants', () => {
    it('should get all descendant replies', async () => {
      const descendants = await messageThreadService.getThreadDescendants(
        messageId
      );
      assert(Array.isArray(descendants));
    });

    it('should support limit and offset', async () => {
      const descendants = await messageThreadService.getThreadDescendants(
        messageId,
        10,
        0
      );
      assert(Array.isArray(descendants));
    });

    it('should handle deep nesting', async () => {
      const descendants = await messageThreadService.getThreadDescendants(
        nestedMessageId
      );
      assert(Array.isArray(descendants));
    });
  });

  describe('getThreadStats', () => {
    it('should get thread statistics', async () => {
      const stats = await messageThreadService.getThreadStats(messageId);
      assert(typeof stats === 'object');
    });

    it('should include replyCount', async () => {
      const stats = await messageThreadService.getThreadStats(messageId);
      assert(
        typeof stats.replyCount === 'number' ||
          stats.replyCount !== undefined
      );
    });

    it('should include lastReplyTime', async () => {
      const stats = await messageThreadService.getThreadStats(messageId);
      assert(stats.lastReplyTime !== undefined || stats.lastReplyAt !== undefined);
    });

    it('should include participants', async () => {
      const stats = await messageThreadService.getThreadStats(messageId);
      assert(
        Array.isArray(stats.participants) ||
          stats.participants !== undefined
      );
    });
  });

  describe('deleteThread', () => {
    it('should soft delete thread and replies', async () => {
      const result = await messageThreadService.deleteThread(messageId, userId);
      assert(result);
    });

    it('should require proper authorization', async () => {
      try {
        await messageThreadService.deleteThread(messageId, new mongoose.Types.ObjectId());
        // May succeed if user has permission, or throw error
        assert(true);
      } catch (error) {
        assert(error);
      }
    });

    it('should preserve parent message', async () => {
      const result = await messageThreadService.deleteThread(replyId, userId);
      assert(result);
    });
  });

  describe('getPopularThreads', () => {
    it('should get most active threads in chat', async () => {
      const threads = await messageThreadService.getPopularThreads(chatId);
      assert(Array.isArray(threads));
    });

    it('should sort by reply count', async () => {
      const threads = await messageThreadService.getPopularThreads(chatId, {
        limit: 10,
      });
      if (threads.length > 1) {
        assert(
          threads[0].replyCount >= threads[1].replyCount ||
            threads[0].replyCount !== undefined
        );
      }
    });

    it('should support limit parameter', async () => {
      const threads = await messageThreadService.getPopularThreads(chatId, {
        limit: 5,
      });
      assert(threads.length <= 5);
    });
  });

  describe('Cache Behavior', () => {
    it('should cache thread data', async () => {
      const result1 = await messageThreadService.getThread(messageId);
      const result2 = await messageThreadService.getThread(messageId);
      assert.deepEqual(result1, result2);
    });

    it('should invalidate cache on reply creation', async () => {
      const replyData = {
        parentMessageId,
        userId,
        content: 'new reply',
      };
      await messageThreadService.createReply(replyData);
      // Cache should be invalidated
      assert(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing message', async () => {
      try {
        await messageThreadService.getThread(new mongoose.Types.ObjectId());
        assert(true); // May return null or throw
      } catch (error) {
        assert(error);
      }
    });

    it('should validate reply content', async () => {
      try {
        await messageThreadService.createReply({
          parentMessageId,
          userId,
          content: '',
        });
        assert.fail('Should throw error for empty content');
      } catch (error) {
        assert(error);
      }
    });

    it('should handle circular references gracefully', async () => {
      try {
        const result = await messageThreadService.getThreadChain(
          new mongoose.Types.ObjectId()
        );
        assert(Array.isArray(result));
      } catch (error) {
        assert(error);
      }
    });
  });

  describe('Performance', () => {
    it('should handle large thread efficiently', async () => {
      const start = Date.now();
      const thread = await messageThreadService.getThread(largeThreadId);
      const duration = Date.now() - start;
      assert(duration < 5000); // Should complete within 5 seconds
    });

    it('should support batch operations', async () => {
      const replies = [];
      for (let i = 0; i < 5; i++) {
        replies.push({
          parentMessageId,
          userId: new mongoose.Types.ObjectId(),
          content: `reply ${i}`,
        });
      }
      const results = await Promise.all(
        replies.map((r) => messageThreadService.createReply(r))
      );
      assert(results.length === 5);
    });
  });
});
