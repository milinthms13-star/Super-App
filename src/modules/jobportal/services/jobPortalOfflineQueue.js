const STORAGE_KEY = "jobportal_offline_queue_v1";
const MAX_ITEMS = 80;

const readQueue = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const writeQueue = (items = []) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch (_error) {
    // Ignore persistence errors to avoid breaking UX.
  }
};

const createQueueItem = ({ type, payload = {} } = {}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  type: String(type || "").trim(),
  payload,
  createdAt: new Date().toISOString(),
  attempts: 0,
});

export const jobPortalOfflineQueue = {
  list: () => readQueue(),
  size: () => readQueue().length,
  enqueue: ({ type, payload = {} } = {}) => {
    const item = createQueueItem({ type, payload });
    const queue = readQueue();
    queue.push(item);
    writeQueue(queue);
    return item;
  },
  clear: () => writeQueue([]),
  drain: async (executor) => {
    const queue = readQueue();
    if (!queue.length) {
      return { processed: 0, failed: 0, remaining: 0 };
    }
    const remaining = [];
    let processed = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await executor(item);
        processed += 1;
      } catch (_error) {
        failed += 1;
        const attempts = Number(item.attempts || 0) + 1;
        if (attempts < 5) {
          remaining.push({ ...item, attempts });
        }
      }
    }

    writeQueue(remaining);
    return { processed, failed, remaining: remaining.length };
  },
};

export default jobPortalOfflineQueue;
