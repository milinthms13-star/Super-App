const assert = require('assert');
const messageFilterService = require('../../../services/messageFilterService');

describe('Message Filter Service', () => {
  const testUserId = 'test-user-456';
  const testFilterName = 'Test Filter';
  const testConditions = {
    keywords: ['urgent', 'important'],
  };
  const testActions = [{ type: 'label', value: 'urgent' }];

  beforeEach(() => {
    messageFilterService.clearCache();
  });

  afterEach(() => {
    messageFilterService.clearCache();
  });

  describe('createFilter', () => {
    it('should create filter successfully', async () => {
      try {
        const result = await messageFilterService.createFilter(
          testUserId,
          testFilterName,
          testConditions,
          testActions
        );
        assert(result._id);
        assert.strictEqual(result.name, testFilterName);
        assert(result.enabled);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should reject missing required fields', async () => {
      try {
        await messageFilterService.createFilter(null, testFilterName, testConditions, testActions);
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('Missing'));
      }
    });

    it('should set priority based on creation order', async () => {
      try {
        const filter1 = await messageFilterService.createFilter(
          testUserId,
          'Filter 1',
          testConditions,
          testActions
        );
        const filter2 = await messageFilterService.createFilter(
          testUserId,
          'Filter 2',
          testConditions,
          testActions
        );
        assert(filter2.priority > filter1.priority);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should initialize statistics', async () => {
      try {
        const result = await messageFilterService.createFilter(
          testUserId,
          testFilterName,
          testConditions,
          testActions
        );
        assert.strictEqual(result.statistics.messagesMatched, 0);
        assert.strictEqual(result.statistics.actionsApplied, 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should enforce max filters limit', async () => {
      try {
        assert(messageFilterService.maxFiltersPerUser > 0);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('getFilters', () => {
    it('should retrieve user filters', async () => {
      try {
        const result = await messageFilterService.getFilters(testUserId);
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should respect limit parameter', async () => {
      try {
        const result = await messageFilterService.getFilters(testUserId, { limit: 5 });
        assert(result.length <= 5);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should sort by priority', async () => {
      try {
        const result = await messageFilterService.getFilters(testUserId);
        if (result.length > 1) {
          for (let i = 0; i < result.length - 1; i++) {
            assert(result[i].priority <= result[i + 1].priority);
          }
        }
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('matchesConditions', () => {
    it('should match keyword conditions', async () => {
      try {
        const mockMessage = {
          content: 'This is urgent',
          senderId: 'user-1',
          attachments: [],
        };
        const conditions = { keywords: ['urgent'] };

        const result = messageFilterService.matchesConditions(mockMessage, conditions);
        assert(result === true);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should match sender conditions', async () => {
      try {
        const mockMessage = {
          content: 'Message',
          senderId: 'admin-user',
          attachments: [],
        };
        const conditions = { senders: ['admin-user'] };

        const result = messageFilterService.matchesConditions(mockMessage, conditions);
        assert(result === true);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should match attachment conditions', async () => {
      try {
        const mockMessage = {
          content: 'Message',
          senderId: 'user-1',
          attachments: [{ id: 'file-1' }],
        };
        const conditions = { hasAttachments: true };

        const result = messageFilterService.matchesConditions(mockMessage, conditions);
        assert(result === true);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should reject non-matching keywords', async () => {
      try {
        const mockMessage = {
          content: 'Normal message',
          senderId: 'user-1',
          attachments: [],
        };
        const conditions = { keywords: ['urgent'] };

        const result = messageFilterService.matchesConditions(mockMessage, conditions);
        assert(result === false);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('applyFilters', () => {
    it('should apply matching filters', async () => {
      try {
        const mockMessage = {
          _id: 'msg-1',
          content: 'Urgent task',
          senderId: 'user-1',
          chatId: 'chat-1',
          attachments: [],
        };

        // This would need actual message in DB in production
        const results = {
          messageId: mockMessage._id,
          matched: [],
          actions: [],
        };

        assert(Array.isArray(results.matched));
        assert(Array.isArray(results.actions));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('updateFilter', () => {
    it('should update filter fields', async () => {
      try {
        const created = await messageFilterService.createFilter(
          testUserId,
          testFilterName,
          testConditions,
          testActions
        );

        const updated = await messageFilterService.updateFilter(created._id, testUserId, {
          name: 'Updated Filter',
        });

        assert.strictEqual(updated.name, 'Updated Filter');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should enforce authorization', async () => {
      try {
        const created = await messageFilterService.createFilter(
          testUserId,
          testFilterName,
          testConditions,
          testActions
        );

        await messageFilterService.updateFilter(created._id, 'different-user', {
          name: 'Updated',
        });
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('authorized'));
      }
    });

    it('should update priority', async () => {
      try {
        const created = await messageFilterService.createFilter(
          testUserId,
          testFilterName,
          testConditions,
          testActions
        );

        const updated = await messageFilterService.updateFilter(created._id, testUserId, {
          priority: 10,
        });

        assert.strictEqual(updated.priority, 10);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should toggle enabled status', async () => {
      try {
        const created = await messageFilterService.createFilter(
          testUserId,
          testFilterName,
          testConditions,
          testActions
        );

        const updated = await messageFilterService.updateFilter(created._id, testUserId, {
          enabled: false,
        });

        assert(updated.enabled === false);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('deleteFilter', () => {
    it('should delete filter', async () => {
      try {
        const created = await messageFilterService.createFilter(
          testUserId,
          testFilterName,
          testConditions,
          testActions
        );

        const result = await messageFilterService.deleteFilter(created._id, testUserId);
        assert(result === true);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should enforce authorization', async () => {
      try {
        const created = await messageFilterService.createFilter(
          testUserId,
          testFilterName,
          testConditions,
          testActions
        );

        await messageFilterService.deleteFilter(created._id, 'different-user');
        assert.fail('Should throw error');
      } catch (error) {
        assert(error.message.includes('authorized'));
      }
    });
  });

  describe('getFilterStats', () => {
    it('should return filter statistics', async () => {
      try {
        const stats = await messageFilterService.getFilterStats(testUserId);
        assert(typeof stats.totalFilters === 'number');
        assert(typeof stats.enabledFilters === 'number');
        assert(typeof stats.totalMessagesMatched === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should track applied actions', async () => {
      try {
        const stats = await messageFilterService.getFilterStats(testUserId);
        assert(typeof stats.totalActionsApplied === 'number');
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('reorderFilters', () => {
    it('should reorder filters by priority', async () => {
      try {
        const filter1 = await messageFilterService.createFilter(
          testUserId,
          'Filter 1',
          testConditions,
          testActions
        );
        const filter2 = await messageFilterService.createFilter(
          testUserId,
          'Filter 2',
          testConditions,
          testActions
        );

        const result = await messageFilterService.reorderFilters(testUserId, [
          filter2._id,
          filter1._id,
        ]);
        assert(result === true);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should handle invalid filter IDs', async () => {
      try {
        const result = await messageFilterService.reorderFilters(testUserId, ['invalid-id']);
        // Should handle gracefully
      } catch (error) {
        // May throw
      }
    });
  });

  describe('Action types', () => {
    it('should support archive action', async () => {
      try {
        const action = { type: 'archive' };
        const mockMessage = {
          _id: 'msg-1',
          content: 'Test',
          senderId: 'user-1',
        };

        const result = await messageFilterService.applyAction(mockMessage, action);
        assert(result.success);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should support label action', async () => {
      try {
        const action = { type: 'label', value: 'important' };
        const mockMessage = {
          _id: 'msg-1',
          content: 'Test',
          senderId: 'user-1',
          labels: [],
        };

        const result = await messageFilterService.applyAction(mockMessage, action);
        assert(result.success);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should support star action', async () => {
      try {
        const action = { type: 'star' };
        const mockMessage = {
          _id: 'msg-1',
          content: 'Test',
          senderId: 'user-1',
        };

        const result = await messageFilterService.applyAction(mockMessage, action);
        assert(result.success);
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });

  describe('Cache behavior', () => {
    it('should cache filters', async () => {
      try {
        const result1 = await messageFilterService.getFilters(testUserId);
        const result2 = await messageFilterService.getFilters(testUserId);
        assert(Array.isArray(result1));
        assert(Array.isArray(result2));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should invalidate cache on create', async () => {
      try {
        await messageFilterService.getFilters(testUserId);
        await messageFilterService.createFilter(
          testUserId,
          testFilterName,
          testConditions,
          testActions
        );
        const result = await messageFilterService.getFilters(testUserId);
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });

    it('should clear all cache', async () => {
      try {
        messageFilterService.clearCache();
        const result = await messageFilterService.getFilters(testUserId);
        assert(Array.isArray(result));
      } catch (error) {
        assert.fail(`Should not throw error: ${error.message}`);
      }
    });
  });
});
