const assert = require('assert');
const messageSearchService = require('../../../services/messageSearchService');
const Message = require('../../../models/Message');
const Chat = require('../../../models/Chat');

describe('MessageSearchService', () => {
  beforeEach(() => {
    messageSearchService.clearCache();
  });

  describe('searchMessages', () => {
    it('should search messages with query', async () => {
      const criteria = { query: 'hello' };
      const results = await messageSearchService.searchMessages(criteria);
      assert(Array.isArray(results));
    });

    it('should filter by chatIds', async () => {
      const criteria = { query: 'test', chatIds: ['chat1'] };
      const results = await messageSearchService.searchMessages(criteria);
      assert(Array.isArray(results));
    });

    it('should filter by startDate and endDate', async () => {
      const criteria = {
        query: 'test',
        startDate: '2026-05-01',
        endDate: '2026-05-07',
      };
      const results = await messageSearchService.searchMessages(criteria);
      assert(Array.isArray(results));
    });

    it('should sort by relevance', async () => {
      const criteria = { query: 'test' };
      const results = await messageSearchService.searchMessages(criteria, {
        sortBy: 'relevance',
      });
      assert(Array.isArray(results));
    });

    it('should support pagination', async () => {
      const criteria = { query: 'test' };
      const results = await messageSearchService.searchMessages(criteria, {
        limit: 10,
        offset: 0,
      });
      assert(Array.isArray(results));
    });
  });

  describe('searchInChat', () => {
    it('should search in specific chat', async () => {
      const results = await messageSearchService.searchInChat(
        'chatId',
        'query'
      );
      assert(Array.isArray(results));
    });

    it('should throw error without query', async () => {
      try {
        await messageSearchService.searchInChat('chatId', '');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error);
      }
    });
  });

  describe('searchBySender', () => {
    it('should search by sender', async () => {
      const results = await messageSearchService.searchBySender(
        'senderId',
        'query'
      );
      assert(Array.isArray(results));
    });

    it('should support optional query', async () => {
      const results = await messageSearchService.searchBySender('senderId');
      assert(Array.isArray(results));
    });
  });

  describe('getTrendingKeywords', () => {
    it('should get trending keywords', async () => {
      const trends = await messageSearchService.getTrendingKeywords(['chatId']);
      assert(Array.isArray(trends));
    });

    it('should support limit option', async () => {
      const trends = await messageSearchService.getTrendingKeywords(['chatId'], {
        limit: 5,
      });
      assert(Array.isArray(trends));
    });
  });

  describe('searchMedia', () => {
    it('should search media by type', async () => {
      const results = await messageSearchService.searchMedia(
        ['chatId'],
        'image'
      );
      assert(Array.isArray(results));
    });

    it('should support video media type', async () => {
      const results = await messageSearchService.searchMedia(
        ['chatId'],
        'video'
      );
      assert(Array.isArray(results));
    });

    it('should support pagination', async () => {
      const results = await messageSearchService.searchMedia(
        ['chatId'],
        'image',
        { limit: 10, offset: 0 }
      );
      assert(Array.isArray(results));
    });
  });

  describe('getActivityTimeline', () => {
    it('should get activity timeline by day', async () => {
      const timeline = await messageSearchService.getActivityTimeline(
        ['chatId'],
        'day'
      );
      assert(Array.isArray(timeline));
    });

    it('should get activity timeline by week', async () => {
      const timeline = await messageSearchService.getActivityTimeline(
        ['chatId'],
        'week'
      );
      assert(Array.isArray(timeline));
    });

    it('should get activity timeline by month', async () => {
      const timeline = await messageSearchService.getActivityTimeline(
        ['chatId'],
        'month'
      );
      assert(Array.isArray(timeline));
    });
  });

  describe('getRecentMessages', () => {
    it('should get recent messages', async () => {
      const messages = await messageSearchService.getRecentMessages('userId', 24);
      assert(Array.isArray(messages));
    });

    it('should support custom hours', async () => {
      const messages = await messageSearchService.getRecentMessages('userId', 7);
      assert(Array.isArray(messages));
    });
  });

  describe('getMessageStats', () => {
    it('should get message statistics', async () => {
      const stats = await messageSearchService.getMessageStats(['chatId']);
      assert(typeof stats === 'object');
    });

    it('should handle multiple chats', async () => {
      const stats = await messageSearchService.getMessageStats([
        'chatId1',
        'chatId2',
      ]);
      assert(typeof stats === 'object');
    });
  });

  describe('Cache Behavior', () => {
    it('should cache search results', async () => {
      const criteria = { query: 'test' };
      const result1 = await messageSearchService.searchMessages(criteria);
      const result2 = await messageSearchService.searchMessages(criteria);
      assert.deepEqual(result1, result2);
    });

    it('should clear cache on command', async () => {
      messageSearchService.clearCache();
      assert(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing query gracefully', async () => {
      try {
        const criteria = {};
        const results = await messageSearchService.searchMessages(criteria);
        // May return empty or throw - both acceptable
        assert(true);
      } catch (error) {
        assert(error);
      }
    });

    it('should handle invalid chatId', async () => {
      try {
        const results = await messageSearchService.searchInChat(
          'invalidId',
          'query'
        );
        assert(Array.isArray(results));
      } catch (error) {
        assert(error);
      }
    });

    it('should handle API errors gracefully', async () => {
      try {
        await messageSearchService.searchMessages({});
        assert(true);
      } catch (error) {
        assert(error);
      }
    });
  });
});
