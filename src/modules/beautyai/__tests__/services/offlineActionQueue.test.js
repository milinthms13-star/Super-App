import {
  enqueueOfflineAction,
  dequeueAction,
  getQueue,
  saveQueue,
  getPendingActions,
  syncOfflineActions,
  getQueueStats,
  clearAllActions,
} from '../../services/offlineActionQueue';

describe('offlineActionQueue', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('enqueueOfflineAction', () => {
    it('adds action to queue', () => {
      const action = {
        type: 'DELETE_PLAN',
        endpoint: '/beauty-ai/plans/plan123',
        method: 'DELETE',
        planId: 'plan123',
      };

      const actionId = enqueueOfflineAction(action);

      expect(actionId).toBeTruthy();
      expect(actionId).toContain('offline-');

      const queue = getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('DELETE_PLAN');
      expect(queue[0].status).toBe('pending');
    });

    it('assigns unique IDs to actions', () => {
      const action1 = { type: 'ACTION_1', endpoint: '/test1', method: 'POST' };
      const action2 = { type: 'ACTION_2', endpoint: '/test2', method: 'POST' };

      const id1 = enqueueOfflineAction(action1);
      const id2 = enqueueOfflineAction(action2);

      expect(id1).not.toBe(id2);
    });
  });

  describe('dequeueAction', () => {
    it('removes action from queue', () => {
      const action = { type: 'TEST', endpoint: '/test', method: 'POST' };
      const actionId = enqueueOfflineAction(action);

      dequeueAction(actionId);

      const queue = getQueue();
      expect(queue).toHaveLength(0);
    });
  });

  describe('getPendingActions', () => {
    it('returns only pending actions', () => {
      enqueueOfflineAction({ type: 'ACTION_1', endpoint: '/test1', method: 'POST' });
      const actionId2 = enqueueOfflineAction({ type: 'ACTION_2', endpoint: '/test2', method: 'POST' });

      // Manually mark one as completed
      const queue = getQueue();
      queue[1].status = 'completed';
      saveQueue(queue);

      const pending = getPendingActions();
      expect(pending).toHaveLength(1);
      expect(pending[0].type).toBe('ACTION_1');
    });

    it('returns failed actions under retry limit', () => {
      const action = { type: 'FAILED_ACTION', endpoint: '/test', method: 'POST' };
      const actionId = enqueueOfflineAction(action);

      // Mark as failed with 2 attempts (under limit of 3)
      const queue = getQueue();
      queue[0].status = 'failed';
      queue[0].attempts = 2;
      saveQueue(queue);

      const pending = getPendingActions();
      expect(pending).toHaveLength(1);
    });

    it('excludes failed actions over retry limit', () => {
      const action = { type: 'FAILED_ACTION', endpoint: '/test', method: 'POST' };
      enqueueOfflineAction(action);

      // Mark as failed with 3 attempts (at limit)
      const queue = getQueue();
      queue[0].status = 'failed';
      queue[0].attempts = 3;
      saveQueue(queue);

      const pending = getPendingActions();
      expect(pending).toHaveLength(0);
    });
  });

  describe('getQueueStats', () => {
    it('returns correct statistics', () => {
      enqueueOfflineAction({ type: 'ACTION_1', endpoint: '/test1', method: 'POST' });
      enqueueOfflineAction({ type: 'ACTION_2', endpoint: '/test2', method: 'POST' });
      enqueueOfflineAction({ type: 'ACTION_3', endpoint: '/test3', method: 'POST' });

      // Mark one as completed and one as failed
      const queue = getQueue();
      queue[0].status = 'completed';
      queue[1].status = 'failed';
      saveQueue(queue);

      const stats = getQueueStats();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.needsSync).toBe(2); // pending + failed
    });
  });

  describe('clearAllActions', () => {
    it('clears the entire queue', () => {
      enqueueOfflineAction({ type: 'ACTION_1', endpoint: '/test1', method: 'POST' });
      enqueueOfflineAction({ type: 'ACTION_2', endpoint: '/test2', method: 'POST' });

      clearAllActions();

      const queue = getQueue();
      expect(queue).toHaveLength(0);
    });
  });

  describe('syncOfflineActions', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('returns early when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const result = await syncOfflineActions();

      expect(result.success).toBe(false);
      expect(result.message).toContain('offline');
    });

    it('returns early when no pending actions', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      const result = await syncOfflineActions();

      expect(result.success).toBe(true);
      expect(result.synced).toBe(0);
      expect(result.message).toContain('No pending');
    });
  });

  describe('localStorage handling', () => {
    it('handles corrupted localStorage data', () => {
      localStorage.setItem('beautyai_offline_queue_v1', 'invalid json');

      const queue = getQueue();

      expect(queue).toEqual([]);
    });

    it('filters out expired actions', () => {
      const oldAction = {
        id: 'old-action',
        type: 'OLD',
        endpoint: '/test',
        method: 'POST',
        timestamp: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(), // 31 days ago
        status: 'pending',
      };

      saveQueue([oldAction]);

      const queue = getQueue();
      expect(queue).toHaveLength(0);
    });
  });
});
