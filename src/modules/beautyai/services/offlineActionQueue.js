import axios from "axios";
import { buildApiUrl } from "../../../utils/api";
import { getStoredAuthToken } from "../../../utils/auth";

/**
 * Offline Action Queue Service
 * Manages actions when the user is offline and syncs them when back online
 */

const QUEUE_STORAGE_KEY = "beautyai_offline_queue_v1";
const MAX_QUEUE_SIZE = 100;
const MAX_RETRY_ATTEMPTS = 3;

// ==================== Queue Management ====================

export const getQueue = () => {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    const queue = stored ? JSON.parse(stored) : [];
    return Array.isArray(queue) ? queue : [];
  } catch (error) {
    console.error("Failed to parse offline queue:", error);
    return [];
  }
};

export const saveQueue = (queue) => {
  if (typeof window === "undefined") return;
  try {
    const limited = queue.slice(-MAX_QUEUE_SIZE);
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error("Failed to save offline queue:", error);
  }
};

export const enqueueOfflineAction = (action) => {
  const queue = getQueue();
  const newAction = {
    ...action,
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    attempts: 0,
    status: "pending",
  };
  queue.push(newAction);
  saveQueue(queue);
  return newAction.id;
};

export const dequeueAction = (actionId) => {
  const queue = getQueue();
  const filtered = queue.filter((action) => action.id !== actionId);
  saveQueue(filtered);
};

export const markActionFailed = (actionId, error) => {
  const queue = getQueue();
  const updated = queue.map((action) => {
    if (action.id === actionId) {
      return {
        ...action,
        attempts: (action.attempts || 0) + 1,
        status: "failed",
        lastError: error,
        lastAttempt: new Date().toISOString(),
      };
    }
    return action;
  });
  saveQueue(updated);
};

export const markActionCompleted = (actionId) => {
  const queue = getQueue();
  const updated = queue.map((action) => {
    if (action.id === actionId) {
      return {
        ...action,
        status: "completed",
        completedAt: new Date().toISOString(),
      };
    }
    return action;
  });
  saveQueue(updated);
};

export const clearCompletedActions = () => {
  const queue = getQueue();
  const filtered = queue.filter((action) => action.status !== "completed");
  saveQueue(filtered);
};

export const clearAllActions = () => {
  saveQueue([]);
};

export const getPendingActions = () => {
  const queue = getQueue();
  return queue.filter(
    (action) =>
      action.status === "pending" ||
      (action.status === "failed" && (action.attempts || 0) < MAX_RETRY_ATTEMPTS)
  );
};

// ==================== Sync Engine ====================

const executeAction = async (action) => {
  const token = getStoredAuthToken();
  const request = axios.create({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const { method, endpoint, payload } = action;

  switch (method) {
    case "POST":
      return await request.post(buildApiUrl(endpoint), payload);
    case "PUT":
      return await request.put(buildApiUrl(endpoint), payload);
    case "DELETE":
      return await request.delete(buildApiUrl(endpoint));
    case "PATCH":
      return await request.patch(buildApiUrl(endpoint), payload);
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
};

export const syncOfflineActions = async (onProgress) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      success: false,
      message: "Cannot sync while offline",
    };
  }

  const pendingActions = getPendingActions();

  if (pendingActions.length === 0) {
    return {
      success: true,
      message: "No pending actions to sync",
      synced: 0,
      failed: 0,
    };
  }

  let synced = 0;
  let failed = 0;
  const errors = [];

  for (const action of pendingActions) {
    try {
      onProgress?.({
        current: synced + failed + 1,
        total: pendingActions.length,
        action,
      });

      await executeAction(action);
      markActionCompleted(action.id);
      synced++;
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Unknown error";
      markActionFailed(action.id, errorMessage);
      failed++;
      errors.push({
        actionId: action.id,
        type: action.type,
        error: errorMessage,
      });
    }
  }

  // Clean up completed actions after a short delay
  setTimeout(() => {
    clearCompletedActions();
  }, 5000);

  return {
    success: failed === 0,
    message: `Synced ${synced} actions, ${failed} failed`,
    synced,
    failed,
    errors,
  };
};

// ==================== Auto-Sync ====================

let autoSyncInterval = null;
let isSyncing = false;

export const startAutoSync = (intervalMs = 30000, onProgress) => {
  if (autoSyncInterval) {
    return;
  }

  const syncIfNeeded = async () => {
    if (isSyncing) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const pendingCount = getPendingActions().length;
    if (pendingCount === 0) return;

    isSyncing = true;
    try {
      await syncOfflineActions(onProgress);
    } catch (error) {
      console.error("Auto-sync failed:", error);
    } finally {
      isSyncing = false;
    }
  };

  // Initial sync
  syncIfNeeded();

  // Periodic sync
  autoSyncInterval = setInterval(syncIfNeeded, intervalMs);

  // Sync when coming back online
  if (typeof window !== "undefined") {
    window.addEventListener("online", syncIfNeeded);
  }
};

export const stopAutoSync = () => {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }

  if (typeof window !== "undefined") {
    window.removeEventListener("online", syncIfNeeded);
  }
};

// ==================== Status & Stats ====================

export const getQueueStats = () => {
  const queue = getQueue();
  const pending = queue.filter((a) => a.status === "pending").length;
  const failed = queue.filter((a) => a.status === "failed").length;
  const completed = queue.filter((a) => a.status === "completed").length;

  return {
    total: queue.length,
    pending,
    failed,
    completed,
    needsSync: pending + failed,
  };
};

export const isQueueEmpty = () => {
  return getPendingActions().length === 0;
};

// ==================== Export for testing ====================

export const __test__ = {
  QUEUE_STORAGE_KEY,
  MAX_QUEUE_SIZE,
  MAX_RETRY_ATTEMPTS,
};
