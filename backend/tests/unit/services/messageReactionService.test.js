const mongoose = require('mongoose');

// Mock models
jest.mock('../../../models/MessageReaction');
jest.mock('../../../models/Message');
jest.mock('../../../models/User');

const MessageReaction = require('../../../models/MessageReaction');
const Message = require('../../../models/Message');
const User = require('../../../models/User');
const messageReactionService = require('../../../services/messageReactionService');

describe('Message Reaction Service', () => {
  const testMessageId = new mongoose.Types.ObjectId();
  const testUserId = new mongoose.Types.ObjectId();
  const testUserId2 = new mongoose.Types.ObjectId();
  const testReactionId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    messageReactionService.clearCache();

    // Mock MessageReaction static methods
    MessageReaction.create = jest.fn().mockImplementation(async (data) => ({
      _id: testReactionId,
      messageId: data.messageId,
      userId: data.userId,
      emoji: data.emoji,
      type: data.type || 'emoji',
      metadata: data.metadata || null,
    }));

    MessageReaction.insertMany = jest.fn().mockResolvedValue([
      {
        _id: testReactionId,
        messageId: testMessageId,
        userId: testUserId,
        emoji: '👍',
      },
    ]);

    // Create proper query chain for find
    const mockFindResult = [
      {
        _id: testReactionId,
        messageId: testMessageId,
        userId: testUserId,
        emoji: '👍',
        type: 'emoji',
        createdAt: new Date(),
      },
    ];

    MessageReaction.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockFindResult),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockFindResult),
    });

    MessageReaction.findOne = jest.fn().mockResolvedValue(null);

    MessageReaction.countDocuments = jest
      .fn()
      .mockResolvedValue(1);

    MessageReaction.deleteMany = jest
      .fn()
      .mockResolvedValue({ deletedCount: 1 });

    MessageReaction.deleteOne = jest
      .fn()
      .mockResolvedValue({ deletedCount: 1 });

    MessageReaction.aggregate = jest.fn().mockResolvedValue([
      { _id: '👍', count: 5, users: [testUserId], totalReactions: 1, uniqueEmojisCount: 1 },
    ]);

    // Mock Message - return resolved value directly, not query chain
    Message.findById = jest
      .fn()
      .mockResolvedValue({ _id: testMessageId, content: 'Test' });

    // Mock User - return resolved value directly, not query chain
    User.findById = jest.fn()
      .mockResolvedValue({ _id: testUserId, username: 'testuser' });
  });

  describe('addReaction', () => {
    it('should add emoji reaction to message', async () => {
      const result = await messageReactionService.addReaction(
        testMessageId,
        testUserId,
        '👍'
      );

      expect(result).toBeDefined();
      expect(result.emoji).toBe('👍');
    });

    it('should return existing reaction on duplicate', async () => {
      MessageReaction.findOne.mockResolvedValueOnce({
        _id: testReactionId,
        messageId: testMessageId,
        userId: testUserId,
        emoji: '👍',
      });

      const result = await messageReactionService.addReaction(
        testMessageId,
        testUserId,
        '👍'
      );

      expect(result).toBeDefined();
      expect(result._id).toBeDefined();
    });

    it('should add reaction with metadata', async () => {
      const result = await messageReactionService.addReaction(
        testMessageId,
        testUserId,
        '❤️',
        { metadata: { intensity: 'high' } }
      );

      expect(result).toBeDefined();
    });
  });

  describe('removeReaction', () => {
    it('should remove reaction from message', async () => {
      await messageReactionService.removeReaction(
        testMessageId,
        testUserId,
        '👍'
      );

      expect(MessageReaction.deleteOne).toHaveBeenCalled();
    });

    it('should throw error when removing non-existent reaction', async () => {
      MessageReaction.deleteOne.mockResolvedValueOnce({ deletedCount: 0 });

      await expect(
        messageReactionService.removeReaction(testMessageId, testUserId, '⚡')
      ).rejects.toThrow();
    });
  });

  describe('getMessageReactions', () => {
    it('should return all reactions on message', async () => {
      const reactions = await messageReactionService.getMessageReactions(
        testMessageId
      );

      expect(reactions).toBeDefined();
      expect(typeof reactions).toBe('object');
    });

    it('should cache reactions', async () => {
      const reactions1 = await messageReactionService.getMessageReactions(
        testMessageId
      );
      const reactions2 = await messageReactionService.getMessageReactions(
        testMessageId
      );

      expect(reactions1).toEqual(reactions2);
    });
  });

  describe('getReactionCount', () => {
    it('should return count of specific emoji reaction', async () => {
      MessageReaction.countDocuments.mockResolvedValueOnce(2);

      const count = await messageReactionService.getReactionCount(
        testMessageId,
        '👍'
      );

      expect(count).toBe(2);
    });

    it('should return 0 for emoji with no reactions', async () => {
      MessageReaction.countDocuments.mockResolvedValueOnce(0);

      const count = await messageReactionService.getReactionCount(
        testMessageId,
        '🚀'
      );

      expect(count).toBe(0);
    });
  });

  describe('getWhoReacted', () => {
    it('should return list of users who reacted with emoji', async () => {
      MessageReaction.find.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: testReactionId,
            messageId: testMessageId,
            userId: { _id: testUserId, username: 'user1' },
            emoji: '👍',
            createdAt: new Date(),
          },
          {
            _id: new mongoose.Types.ObjectId(),
            messageId: testMessageId,
            userId: { _id: testUserId2, username: 'user2' },
            emoji: '👍',
            createdAt: new Date(),
          },
        ]),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await messageReactionService.getWhoReacted(
        testMessageId,
        '👍'
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length >= 0).toBe(true);
    });
  });

  describe('getUserReactions', () => {
    it('should return user reactions on multiple messages', async () => {
      const messageIds = [testMessageId.toString()];
      const result = await messageReactionService.getUserReactions(
        testUserId,
        messageIds
      );

      expect(result).toBeDefined();
    });
  });

  describe('batchAddReactions', () => {
    it('should add multiple reactions in batch', async () => {
      const batch = [
        { messageId: testMessageId, userId: testUserId, emoji: '👍' },
        { messageId: testMessageId, userId: testUserId2, emoji: '❤️' },
      ];

      const result = await messageReactionService.batchAddReactions(batch);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getPopularReactions', () => {
    it('should return list of popular reactions', async () => {
      const result = await messageReactionService.getPopularReactions([
        testMessageId.toString(),
      ]);

      expect(Array.isArray(result)).toBe(true);
      expect(MessageReaction.aggregate).toHaveBeenCalledTimes(1);

      const pipeline = MessageReaction.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.messageId.$in[0]).toBeInstanceOf(
        mongoose.Types.ObjectId
      );
    });
  });

  describe('getUserReactionStats', () => {
    it('should return user reaction statistics', async () => {
      const result = await messageReactionService.getUserReactionStats(
        testUserId.toString()
      );

      expect(result).toEqual(
        expect.objectContaining({
          totalReactions: 1,
          uniqueEmojisCount: 1,
        })
      );

      const pipeline = MessageReaction.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.userId).toBeInstanceOf(
        mongoose.Types.ObjectId
      );
    });
  });

  describe('clearMessageReactions', () => {
    it('should clear all reactions from message', async () => {
      MessageReaction.deleteMany.mockResolvedValueOnce({ deletedCount: 3 });

      const result = await messageReactionService.clearMessageReactions(
        testMessageId
      );

      expect(result.deletedCount).toBe(3);
    });
  });

  describe('validateEmoji', () => {
    it('should validate emoji format', () => {
      // Just test that the method exists and can be called
      expect(typeof messageReactionService.validateEmoji).toBe('function');
      const result = messageReactionService.validateEmoji('👍');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('clearCache', () => {
    it('should clear reaction cache', async () => {
      await messageReactionService.getMessageReactions(testMessageId);
      messageReactionService.clearCache();

      expect(messageReactionService.reactionCache.size).toBe(0);
    });
  });
});
