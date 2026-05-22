const HEALTHCARE_QUEUE_KEY = "healthcare.offline.queue.v1";
const HEALTHCARE_DEAD_LETTER_KEY = "healthcare.offline.deadletter.v1";
const MAX_QUEUE_RETRY_ATTEMPTS = 5;

const canUseLocalStorage = () => {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch (_error) {
    return false;
  }
};

const readQueue = () => {
  if (!canUseLocalStorage()) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(HEALTHCARE_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const writeQueue = (items) => {
  if (!canUseLocalStorage()) {
    return;
  }
  window.localStorage.setItem(HEALTHCARE_QUEUE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
};

const readDeadLetterQueue = () => {
  if (!canUseLocalStorage()) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(HEALTHCARE_DEAD_LETTER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const writeDeadLetterQueue = (items) => {
  if (!canUseLocalStorage()) {
    return;
  }
  window.localStorage.setItem(HEALTHCARE_DEAD_LETTER_KEY, JSON.stringify(Array.isArray(items) ? items : []));
};

export const getQueuedHealthcareActions = () => readQueue();
export const getDeadLetterHealthcareActions = () => readDeadLetterQueue();

export const requeueDeadLetterHealthcareAction = (actionId) => {
  if (!actionId) {
    return { moved: false };
  }
  const queue = readQueue();
  const deadLetterQueue = readDeadLetterQueue();
  const index = deadLetterQueue.findIndex((item) => item.id === actionId);
  if (index === -1) {
    return { moved: false };
  }
  const [action] = deadLetterQueue.splice(index, 1);
  queue.push({
    ...action,
    attempts: 0,
    lastError: "",
    requeuedAt: new Date().toISOString(),
  });
  writeQueue(queue);
  writeDeadLetterQueue(deadLetterQueue);
  return { moved: true };
};

export const requeueAllDeadLetterHealthcareActions = () => {
  const queue = readQueue();
  const deadLetterQueue = readDeadLetterQueue();
  if (deadLetterQueue.length === 0) {
    return { movedCount: 0 };
  }
  const moved = deadLetterQueue.map((action) => ({
    ...action,
    attempts: 0,
    lastError: "",
    requeuedAt: new Date().toISOString(),
  }));
  writeQueue([...queue, ...moved]);
  writeDeadLetterQueue([]);
  return { movedCount: moved.length };
};

export const enqueueHealthcareAction = (action = {}) => {
  const queue = readQueue();
  const entry = {
    id: `hcq-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type: String(action.type || "unknown"),
    payload: action.payload ?? {},
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: "",
  };
  queue.push(entry);
  writeQueue(queue);
  return entry;
};

const isRetryableError = (error) => {
  const status = Number(error?.response?.status || 0);
  if (!status) {
    return true;
  }
  return status >= 500 || status === 429;
};

export const flushHealthcareQueue = async (executors = {}) => {
  const queue = readQueue();
  if (queue.length === 0) {
    return { processed: 0, failed: 0 };
  }

  const nextQueue = [];
  const deadLetterQueue = readDeadLetterQueue();
  let processed = 0;
  let failed = 0;
  let deadLettered = 0;

  for (const action of queue) {
    const execute = executors[action.type];
    if (typeof execute !== "function") {
      continue;
    }

    try {
      await execute(action.payload);
      processed += 1;
    } catch (error) {
      failed += 1;
      const retryable = isRetryableError(error);
      if (!retryable) {
        deadLetterQueue.push({
          ...action,
          attempts: Number(action.attempts || 0) + 1,
          lastError: String(error?.message || "non_retryable_failure"),
          movedToDeadLetterAt: new Date().toISOString(),
        });
        deadLettered += 1;
        continue;
      }
      const retriedAction = {
        ...action,
        attempts: Number(action.attempts || 0) + 1,
        lastError: String(error?.message || "retry_failed"),
      };
      if (retriedAction.attempts >= MAX_QUEUE_RETRY_ATTEMPTS) {
        deadLetterQueue.push({
          ...retriedAction,
          movedToDeadLetterAt: new Date().toISOString(),
        });
        deadLettered += 1;
      } else {
        nextQueue.push(retriedAction);
      }
    }
  }

  writeQueue(nextQueue);
  writeDeadLetterQueue(deadLetterQueue);
  return { processed, failed, deadLettered };
};
