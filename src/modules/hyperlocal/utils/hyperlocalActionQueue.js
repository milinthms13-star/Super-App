import { hyperlocalStorage } from "./hyperlocalStorage";

const STORAGE_KEY = "hyperlocal_action_queue_v1";

const readQueue = () => {
  const items = hyperlocalStorage.getJSON(STORAGE_KEY, []);
  return Array.isArray(items) ? items : [];
};

const writeQueue = (items) => {
  hyperlocalStorage.setJSON(STORAGE_KEY, Array.isArray(items) ? items : []);
};

export const hyperlocalActionQueue = {
  getAll() {
    return readQueue();
  },
  push(action) {
    const current = readQueue();
    const next = [
      ...current,
      {
        id: action?.id || `HLQ-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        type: String(action?.type || "").trim(),
        payload: action?.payload || {},
        createdAt: new Date().toISOString(),
      },
    ];
    writeQueue(next);
    return next;
  },
  replace(items) {
    writeQueue(items);
    return readQueue();
  },
  clear() {
    writeQueue([]);
  },
};
