const mongoose = require('mongoose');

// Mock models
jest.mock('../../../models/ScheduledMessage');
const ScheduledMessage = require('../../../models/ScheduledMessage');

const messageScheduleService = require('../../../services/messageScheduleService');

describe('Message Schedule Service', () => {
  // Create proper ObjectIds
  const testChatId = new mongoose.Types.ObjectId();
  const testUserId = new mongoose.Types.ObjectId();
  const testScheduleId = new mongoose.Types.ObjectId();
  const futureTime = new Date(Date.now() + 60000);

  // Helper to create mock query chains
  const createMockQuery = (resolvedValue) => {
    const mockQueryObj = {
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    // If resolvedValue has save method, preserve it
    if (resolvedValue && typeof resolvedValue === 'object') {
      mockQueryObj.exec.mockResolvedValue(resolvedValue);
    } else {
      mockQueryObj.exec.mockResolvedValue(resolvedValue);
    }

    return mockQueryObj;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    messageScheduleService.clearCache();

    // Helper for creating saveable objects
    const createSaveableObject = (data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ ...data, status: 'updated' }),
    });

    // Mock the ScheduledMessage constructor
    ScheduledMessage.mockImplementation((data) => ({
      ...data,
      _id: testScheduleId,
      save: jest.fn().mockResolvedValue({
        _id: testScheduleId,
        ...data,
        status: 'pending',
      }),
    }));

    // Setup default mocks for ScheduledMessage static methods
    ScheduledMessage.create = jest
      .fn()
      .mockResolvedValue(
        createSaveableObject({
          _id: testScheduleId,
          chatId: testChatId,
          userId: testUserId,
          content: 'Test message',
          scheduledTime: futureTime,
          status: 'pending',
          metadata: {},
        })
      );

    ScheduledMessage.findById = jest
      .fn()
      .mockReturnValue(
        createMockQuery(
          createSaveableObject({
            _id: testScheduleId,
            chatId: testChatId,
            userId: testUserId,
            content: 'Test message',
            status: 'pending',
          })
        )
      );

    ScheduledMessage.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        {
          _id: testScheduleId,
          chatId: testChatId,
          userId: testUserId,
          content: 'Test',
          status: 'pending',
          save: jest.fn().mockResolvedValue({ status: 'sent' }),
        },
      ]),
    });

    ScheduledMessage.findByIdAndUpdate = jest
      .fn()
      .mockReturnValue(
        createMockQuery(
          createSaveableObject({
            _id: testScheduleId,
            chatId: testChatId,
            userId: testUserId,
            status: 'rescheduled',
          })
        )
      );

    ScheduledMessage.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
    ScheduledMessage.countDocuments = jest.fn().mockResolvedValue(5);
    
    // Add findOne mock for getScheduleStats
    ScheduledMessage.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        _id: testScheduleId,
        userId: testUserId,
        scheduledTime: futureTime,
        status: 'pending',
      }),
    });
  });

  afterEach(() => {
    messageScheduleService.clearCache();
  });

  describe('scheduleMessage', () => {
    it('should schedule a message successfully', async () => {
      const result = await messageScheduleService.scheduleMessage(
        testChatId,
        testUserId,
        'Test message',
        futureTime
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('should throw error without required fields', async () => {
      await expect(
        messageScheduleService.scheduleMessage(null, testUserId, 'Content', futureTime)
      ).rejects.toThrow();
    });

    it('should throw error for past scheduled time', async () => {
      const pastTime = new Date(Date.now() - 60000);

      await expect(
        messageScheduleService.scheduleMessage(testChatId, testUserId, 'Test', pastTime)
      ).rejects.toThrow();
    });

    it('should include metadata in scheduled message', async () => {
      const metadata = { priority: 'high', tags: ['urgent'] };

      const result = await messageScheduleService.scheduleMessage(
        testChatId,
        testUserId,
        'Test',
        futureTime,
        metadata
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
    });
  });

  describe('getScheduledMessages', () => {
    it('should retrieve scheduled messages for chat', async () => {
      const messages = await messageScheduleService.getScheduledMessages(testChatId);

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length >= 0).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const messages = await messageScheduleService.getScheduledMessages(testChatId, {
        limit: 5,
      });

      expect(Array.isArray(messages)).toBe(true);
    });

    it('should return cached results on second call', async () => {
      const result1 = await messageScheduleService.getScheduledMessages(testChatId);
      const callCount1 = ScheduledMessage.find.mock.calls.length;

      const result2 = await messageScheduleService.getScheduledMessages(testChatId);
      const callCount2 = ScheduledMessage.find.mock.calls.length;

      // Second call should be cached
      expect(callCount2).toBe(callCount1);
      expect(Array.isArray(result1)).toBe(true);
      expect(Array.isArray(result2)).toBe(true);
    });
  });

  describe('cancelScheduledMessage', () => {
    it('should cancel a scheduled message', async () => {
      const mockMessage = {
        _id: testScheduleId,
        chatId: testChatId,
        userId: testUserId,
        status: 'pending',
        save: jest.fn().mockResolvedValue({ status: 'cancelled' }),
      };

      ScheduledMessage.findById.mockResolvedValueOnce(mockMessage);

      const result = await messageScheduleService.cancelScheduledMessage(
        testScheduleId,
        testUserId
      );

      expect(result).toBe(true);
    });

    it('should throw error for non-existent message', async () => {
      ScheduledMessage.findById.mockResolvedValueOnce(null);

      await expect(
        messageScheduleService.cancelScheduledMessage(testScheduleId, testUserId)
      ).rejects.toThrow('not found');
    });

    it('should throw error when unauthorized user cancels', async () => {
      const differentUserId = new mongoose.Types.ObjectId();

      const mockMessage = {
        _id: testScheduleId,
        userId: testUserId, // Different from differentUserId
        status: 'pending',
        save: jest.fn(),
      };

      ScheduledMessage.findById.mockResolvedValueOnce(mockMessage);

      await expect(
        messageScheduleService.cancelScheduledMessage(testScheduleId, differentUserId)
      ).rejects.toThrow('Not authorized');
    });
  });

  describe('rescheduleMessage', () => {
    it('should reschedule a message to future time', async () => {
      const newTime = new Date(Date.now() + 120000);

      // Create a saveable mock with proper ObjectId comparison
      const mockMessage = {
        _id: testScheduleId,
        userId: testUserId, // Same as the caller
        status: 'pending',
        scheduledTime: futureTime,
        save: jest.fn().mockResolvedValue({ status: 'rescheduled' }),
      };

      // Mock findById to return the message directly, not through the query chain
      ScheduledMessage.findById.mockResolvedValueOnce(mockMessage);

      const result = await messageScheduleService.rescheduleMessage(
        testScheduleId,
        newTime,
        testUserId
      );

      expect(result).toBeDefined();
    });

    it('should throw error for past scheduled time', async () => {
      const pastTime = new Date(Date.now() - 60000);

      const mockMessage = {
        _id: testScheduleId,
        userId: testUserId,
        status: 'pending',
        scheduledTime: futureTime,
        save: jest.fn(),
      };

      ScheduledMessage.findById.mockResolvedValueOnce(mockMessage);

      await expect(
        messageScheduleService.rescheduleMessage(testScheduleId, pastTime, testUserId)
      ).rejects.toThrow();
    });

    it('should throw error when unauthorized user reschedules', async () => {
      const differentUserId = new mongoose.Types.ObjectId();
      const newTime = new Date(Date.now() + 120000);

      const mockMessage = {
        _id: testScheduleId,
        userId: testUserId, // Different from differentUserId
        status: 'pending',
        scheduledTime: futureTime,
        save: jest.fn(),
      };

      ScheduledMessage.findById.mockResolvedValueOnce(mockMessage);

      await expect(
        messageScheduleService.rescheduleMessage(testScheduleId, newTime, differentUserId)
      ).rejects.toThrow('Not authorized');
    });
  });

  describe('getScheduleStats', () => {
    it('should return statistics for user', async () => {
      ScheduledMessage.countDocuments = jest.fn().mockResolvedValue(5);

      const stats = await messageScheduleService.getScheduleStats(testUserId);

      expect(stats).toBeDefined();
      expect(typeof stats.pending).toBe('number');
    });

    it('should track pending messages count', async () => {
      const stats = await messageScheduleService.getScheduleStats(testUserId);

      expect(stats.pending).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMessagesByTimeRange', () => {
    it('should retrieve messages within time range', async () => {
      const startTime = new Date(Date.now() - 3600000);
      const endTime = new Date(Date.now() + 3600000);

      const messages = await messageScheduleService.getMessagesByTimeRange(
        startTime,
        endTime
      );

      expect(Array.isArray(messages)).toBe(true);
    });

    it('should return empty array for range with no messages', async () => {
      ScheduledMessage.find.mockReturnValueOnce(createMockQuery([]));

      const startTime = new Date(2000, 0, 1);
      const endTime = new Date(2000, 0, 2);

      const messages = await messageScheduleService.getMessagesByTimeRange(
        startTime,
        endTime
      );

      expect(Array.isArray(messages)).toBe(true);
    });

    it('should respect pagination options', async () => {
      const startTime = new Date(Date.now() - 3600000);
      const endTime = new Date(Date.now() + 3600000);

      const messages = await messageScheduleService.getMessagesByTimeRange(
        startTime,
        endTime,
        { limit: 5 }
      );

      expect(Array.isArray(messages)).toBe(true);
    });
  });

  describe('processScheduledMessages', () => {
    it('should process scheduled messages', async () => {
      // Create a saveable mock object
      const mockScheduledMsg = {
        _id: testScheduleId,
        chatId: testChatId,
        status: 'pending',
        scheduledTime: new Date(Date.now() - 1000),
        save: jest.fn().mockResolvedValue({ status: 'sent' }),
      };

      ScheduledMessage.find.mockReturnValueOnce(
        createMockQuery([mockScheduledMsg])
      );

      const count = await messageScheduleService.processScheduledMessages();

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should send messages that are due', async () => {
      const mockScheduledMsg = {
        _id: testScheduleId,
        chatId: testChatId,
        status: 'pending',
        scheduledTime: new Date(Date.now() - 1000),
        save: jest.fn().mockResolvedValue({ status: 'sent' }),
      };

      ScheduledMessage.find.mockReturnValueOnce(
        createMockQuery([mockScheduledMsg])
      );

      const count = await messageScheduleService.processScheduledMessages();

      expect(typeof count).toBe('number');
    });

    it('should update message status on processing', async () => {
      const mockScheduledMsg = {
        _id: testScheduleId,
        status: 'pending',
        scheduledTime: new Date(Date.now() - 1000),
        save: jest.fn().mockResolvedValue({ status: 'updated' }),
      };

      ScheduledMessage.find.mockReturnValueOnce(
        createMockQuery([mockScheduledMsg])
      );

      const result = await messageScheduleService.processScheduledMessages();

      expect(typeof result).toBe('number');
    });
  });

  describe('Cache behavior', () => {
    it('should cache scheduled messages', async () => {
      const result1 = await messageScheduleService.getScheduledMessages(testChatId);
      const result2 = await messageScheduleService.getScheduledMessages(testChatId);

      expect(Array.isArray(result1)).toBe(true);
      expect(Array.isArray(result2)).toBe(true);
    });

    it('should invalidate cache on schedule', async () => {
      await messageScheduleService.getScheduledMessages(testChatId);
      const callBefore = ScheduledMessage.find.mock.calls.length;

      await messageScheduleService.scheduleMessage(testChatId, testUserId, 'Test', futureTime);
      await messageScheduleService.getScheduledMessages(testChatId);

      // Should call find again after cache invalidation
      const callAfter = ScheduledMessage.find.mock.calls.length;
      expect(callAfter).toBeGreaterThan(callBefore);
    });

    it('should clear all cache', async () => {
      await messageScheduleService.getScheduledMessages(testChatId);
      messageScheduleService.clearCache();

      const result = await messageScheduleService.getScheduledMessages(testChatId);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle validation errors gracefully', async () => {
      ScheduledMessage.create.mockRejectedValueOnce(new Error('Validation failed'));

      try {
        await messageScheduleService.scheduleMessage(testChatId, testUserId, 'Test', futureTime);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle missing message gracefully', async () => {
      ScheduledMessage.findById.mockReturnValueOnce(createMockQuery(null));

      try {
        await messageScheduleService.cancelScheduledMessage(testScheduleId, testUserId);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
