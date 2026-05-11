export const getEntityId = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (value._id) {
    return getEntityId(value._id);
  }

  if (value.id) {
    return getEntityId(value.id);
  }

  return "";
};

export const getEntityEmail = (value) => {
  if (!value || typeof value === "string") {
    return "";
  }

  if (value.email) {
    return String(value.email).trim().toLowerCase();
  }

  return "";
};

export const isSameEntity = (left, right) => {
  const leftId = getEntityId(left);
  const rightId = getEntityId(right);

  if (leftId && rightId && leftId === rightId) {
    return true;
  }

  const leftEmail = getEntityEmail(left);
  const rightEmail = getEntityEmail(right);

  return Boolean(leftEmail && rightEmail && leftEmail === rightEmail);
};

const isUrlLike = (value = "") => /^(https?:\/\/|data:)/i.test(String(value || "").trim());

export const getAvatarLabel = (...values) => {
  for (const value of values) {
    const normalizedValue = String(value || "").trim();

    if (!normalizedValue || isUrlLike(normalizedValue)) {
      continue;
    }

    if (normalizedValue.length <= 2) {
      return normalizedValue.toUpperCase();
    }

    const initials = normalizedValue
      .replace(/[_@.+-]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((segment) => segment[0])
      .slice(0, 2)
      .join("");

    if (initials) {
      return initials.toUpperCase();
    }

    const compactValue = normalizedValue.replace(/[^a-zA-Z0-9]/g, "");
    if (compactValue) {
      return compactValue.slice(0, 2).toUpperCase();
    }

    return normalizedValue.slice(0, 2).toUpperCase();
  }

  return "U";
};

const CLEARED_CHATS_STORAGE_KEY = "linkup-cleared-chats";
const OUTBOX_STORAGE_KEY_PREFIX = "linkup-message-outbox";

const toTimestamp = (value) => {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const loadClearedChats = () => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(CLEARED_CHATS_STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : {};
    return parsedValue && typeof parsedValue === "object" ? parsedValue : {};
  } catch (error) {
    return {};
  }
};

export const saveClearedChats = (clearedChats = {}) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CLEARED_CHATS_STORAGE_KEY, JSON.stringify(clearedChats));
  } catch (error) {
    // Ignore storage failures and keep the chat usable.
  }
};

export const getMessagingOutboxStorageKey = (userId) => {
  const resolvedUserId = getEntityId(userId);
  return resolvedUserId ? `${OUTBOX_STORAGE_KEY_PREFIX}:${resolvedUserId}` : OUTBOX_STORAGE_KEY_PREFIX;
};

export const loadMessagingOutbox = (userId) => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(getMessagingOutboxStorageKey(userId));
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    return [];
  }
};

export const saveMessagingOutbox = (userId, queue = []) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getMessagingOutboxStorageKey(userId),
      JSON.stringify(Array.isArray(queue) ? queue : [])
    );
  } catch (error) {
    // Ignore storage failures and keep messaging usable.
  }
};

export const mergeOutboxEntriesIntoMessages = (messages = [], outboxEntries = []) => {
  const baseMessages = Array.isArray(messages) ? messages : [];
  const queuedMessages = (Array.isArray(outboxEntries) ? outboxEntries : [])
    .map((entry) => {
      if (!entry?.clientMessageId) {
        return null;
      }

      return {
        _id: entry.tempMessageId || entry.clientMessageId,
        clientMessageId: entry.clientMessageId,
        chatId: entry.chatId,
        senderId: entry.senderId,
        content: entry.content || "",
        messageType: entry.messageType || "text",
        media: entry.media || null,
        replyTo: entry.replyTo || null,
        createdAt: entry.createdAt || new Date().toISOString(),
        isFailed: true,
        errorMessage: entry.errorMessage || "Waiting to retry",
        deliveryStatus: Array.isArray(entry.deliveryStatus) ? entry.deliveryStatus : [],
      };
    })
    .filter(Boolean);

  return mergePagedMessages(baseMessages, queuedMessages);
};

export const getChatClearTimestamp = (chatId, clearedChats = {}) => {
  const resolvedChatId = getEntityId(chatId);
  if (!resolvedChatId) {
    return 0;
  }

  return toTimestamp(clearedChats[resolvedChatId]);
};

export const isMessageHiddenByClear = (message, clearedAt) => {
  const clearedTimestamp = toTimestamp(clearedAt);
  if (!clearedTimestamp) {
    return false;
  }

  return toTimestamp(message?.createdAt) <= clearedTimestamp;
};

export const filterMessagesByClearTimestamp = (messages = [], clearedAt) =>
  (Array.isArray(messages) ? messages : []).filter(
    (message) => !isMessageHiddenByClear(message, clearedAt)
  );

export const mergePagedMessages = (olderMessages = [], newerMessages = []) => {
  const seenMessageIds = new Set();

  return [...olderMessages, ...newerMessages].filter((message) => {
    const messageKey =
      getEntityId(message) ||
      [
        message?.createdAt || "",
        message?.messageType || "",
        message?.content || "",
        getEntityId(message?.senderId) || "",
      ].join("::");

    if (!messageKey || seenMessageIds.has(messageKey)) {
      return false;
    }

    seenMessageIds.add(messageKey);
    return true;
  });
};

export const inferMessageTypeFromMimeType = (mimeType = "", { preferVoice = false } = {}) => {
  const normalizedMimeType = String(mimeType || "").toLowerCase();

  if (preferVoice && normalizedMimeType.startsWith("audio/")) {
    return "voice";
  }

  if (normalizedMimeType.startsWith("image/")) {
    return "image";
  }

  if (normalizedMimeType.startsWith("video/")) {
    return "video";
  }

  if (normalizedMimeType.startsWith("audio/")) {
    return "audio";
  }

  return "file";
};

const WEEKDAY_INDEX = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const normalizePermissionMode = (value) => {
  const mode = String(value || "none").trim().toLowerCase();
  return mode || "none";
};

const parseTimeToMinutes = (value, fallbackMinutes) => {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return fallbackMinutes;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return fallbackMinutes;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return fallbackMinutes;
  }

  return hours * 60 + minutes;
};

const getLocalizedTimeParts = (referenceDate, timezone = "Asia/Kolkata") => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(referenceDate);
    const weekday = String(parts.find((part) => part.type === "weekday")?.value || "")
      .slice(0, 3)
      .toLowerCase();
    const hours = Number(parts.find((part) => part.type === "hour")?.value || "0");
    const minutes = Number(parts.find((part) => part.type === "minute")?.value || "0");

    return {
      weekdayIndex: Number.isInteger(WEEKDAY_INDEX[weekday]) ? WEEKDAY_INDEX[weekday] : referenceDate.getDay(),
      minutesOfDay: (Number.isInteger(hours) ? hours : 0) * 60 + (Number.isInteger(minutes) ? minutes : 0),
    };
  } catch (error) {
    return {
      weekdayIndex: referenceDate.getDay(),
      minutesOfDay: referenceDate.getHours() * 60 + referenceDate.getMinutes(),
    };
  }
};

const isWithinTimeWindow = (minutesOfDay, startMinutes, endMinutes) => {
  if (startMinutes === endMinutes) {
    return true;
  }

  if (startMinutes < endMinutes) {
    return minutesOfDay >= startMinutes && minutesOfDay <= endMinutes;
  }

  return minutesOfDay >= startMinutes || minutesOfDay <= endMinutes;
};

export const isFamilyPermissionActive = (permission = {}, referenceDate = new Date()) => {
  const mode = normalizePermissionMode(permission?.mode);

  if (mode === "none") {
    return false;
  }

  if (mode === "permanent") {
    return true;
  }

  if (mode === "temporary") {
    const expiryTime = new Date(permission?.expiresAt).getTime();
    return Number.isFinite(expiryTime) && expiryTime > referenceDate.getTime();
  }

  if (mode === "time_restricted") {
    const restrictions = permission?.timeRestrictions || {};
    const timezone = restrictions?.timezone || "Asia/Kolkata";
    const daysOfWeek = Array.isArray(restrictions?.daysOfWeek)
      ? restrictions.daysOfWeek
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : [0, 1, 2, 3, 4, 5, 6];

    if (!daysOfWeek.length) {
      return false;
    }

    const { weekdayIndex, minutesOfDay } = getLocalizedTimeParts(referenceDate, timezone);
    if (!daysOfWeek.includes(weekdayIndex)) {
      return false;
    }

    const startMinutes = parseTimeToMinutes(restrictions?.startTime, 0);
    const endMinutes = parseTimeToMinutes(restrictions?.endTime, 23 * 60 + 59);
    return isWithinTimeWindow(minutesOfDay, startMinutes, endMinutes);
  }

  return false;
};

export const getFamilyPermissionSnapshot = (permission = {}, referenceDate = new Date()) => {
  const mode = normalizePermissionMode(permission?.mode);

  return {
    mode,
    expiresAt: permission?.expiresAt || "",
    note: permission?.note || "",
    timeRestrictions: permission?.timeRestrictions || {},
    active: isFamilyPermissionActive(permission, referenceDate),
  };
};
