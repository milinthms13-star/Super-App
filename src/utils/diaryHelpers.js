/**
 * Diary Module Shared Helpers
 * Centralized utility functions to eliminate code duplication across diary components
 */

/**
 * Strip HTML tags and decode common entities to plain text
 * @param {string} html - HTML content
 * @returns {string} - Plain text
 */
export const stripHtml = (html = "") => {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Get plain text content length (useful for character counts)
 * @param {string} html - HTML content
 * @returns {number} - Character count
 */
export const getPlainTextLength = (html = "") => {
  return stripHtml(html).length;
};

/**
 * Format a date to locale string
 * @param {string|Date} date - Date value
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  const defaultOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  };

  return d.toLocaleDateString("en-IN", defaultOptions);
};

/**
 * Format a time to locale string
 * @param {string|Date} date - Date value
 * @returns {string} - Formatted time string
 */
export const formatTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Format date and time together
 * @param {string|Date} date - Date value
 * @returns {string} - Formatted date-time string
 */
export const formatDateTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Truncate text to a specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} - Truncated text
 */
export const truncateText = (text = "", length = 150) => {
  const plainText = stripHtml(text);
  if (plainText.length <= length) return plainText;
  return plainText.substring(0, length).trim() + "...";
};

/**
 * Build a preview snippet from HTML content
 * @param {string} content - HTML content
 * @param {number} maxLength - Maximum preview length
 * @returns {string} - Preview text
 */
export const buildPreview = (content = "", maxLength = 140) => {
  const plainText = stripHtml(content);

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.slice(0, maxLength).trim()}...`;
};

/**
 * Build a date key string (YYYY-MM-DD) from a date value
 * @param {string|Date} value - Date value
 * @returns {string} - Date key
 */
export const buildDateKey = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

/**
 * Pad a number with leading zeros
 * @param {number} value - Number to pad
 * @returns {string} - Padded string
 */
export const padNumber = (value) => String(value).padStart(2, "0");

/**
 * Format a date for datetime-local input
 * @param {string|Date} value - Date value
 * @returns {string} - Formatted datetime-local string
 */
export const formatReminderInputValue = (value) => {
  const baseDate = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(baseDate.getTime())) {
    return "";
  }

  return [
    buildDateKey(baseDate),
    `${padNumber(baseDate.getHours())}:${padNumber(baseDate.getMinutes())}`,
  ].join("T");
};

/**
 * Calculate reading time in minutes
 * @param {string} content - HTML content
 * @param {number} wordsPerMinute - Reading speed (default: 200)
 * @returns {number} - Reading time in minutes
 */
export const calculateReadingTime = (content = "", wordsPerMinute = 200) => {
  const plainText = stripHtml(content);
  const wordCount = plainText.split(/\s+/).filter((w) => w.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

/**
 * Calculate word count
 * @param {string} content - HTML content
 * @returns {number} - Word count
 */
export const calculateWordCount = (content = "") => {
  const plainText = stripHtml(content);
  return plainText.split(/\s+/).filter((w) => w.length > 0).length;
};

/**
 * Mood configuration constants
 */
export const MOOD_CONFIG = {
  very_sad: { label: "😭 Very Sad", emoji: "😭", color: "#ff4757" },
  sad: { label: "😢 Sad", emoji: "😢", color: "#ff7675" },
  neutral: { label: "😐 Neutral", emoji: "😐", color: "#ffa502" },
  happy: { label: "😊 Happy", emoji: "😊", color: "#1dd1a1" },
  very_happy: { label: "😄 Very Happy", emoji: "😄", color: "#00b894" },
};

/**
 * Category options
 */
export const CATEGORIES = [
  "All",
  "Personal",
  "Work",
  "Travel",
  "Health",
  "Relationships",
  "Other",
];

/**
 * Get mood emoji
 * @param {string} mood - Mood ID
 * @returns {string} - Emoji
 */
export const getMoodEmoji = (mood) => MOOD_CONFIG[mood]?.emoji || "😐";

/**
 * Get mood color
 * @param {string} mood - Mood ID
 * @returns {string} - Color hex
 */
export const getMoodColor = (mood) => MOOD_CONFIG[mood]?.color || "#95a5a6";

/**
 * Get mood label
 * @param {string} mood - Mood ID
 * @returns {string} - Label
 */
export const getMoodLabel = (mood) => MOOD_CONFIG[mood]?.label || "Neutral";

/**
 * Sort calendar items by date/reminder time
 * @param {Array} items - Calendar items
 * @returns {Array} - Sorted items
 */
export const sortCalendarItems = (items = []) =>
  [...items].sort((leftItem, rightItem) => {
    const leftDate = new Date(
      leftItem.reminderAt || leftItem.date || leftItem.createdAt || 0
    ).getTime();
    const rightDate = new Date(
      rightItem.reminderAt || rightItem.date || rightItem.createdAt || 0
    ).getTime();
    return leftDate - rightDate;
  });

/**
 * Debounce function for performance
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * LocalStorage key for diary draft autosave
 */
export const AUTOSAVE_KEY = "diary_draft_autosave";

/**
 * Save draft to localStorage
 * @param {Object} draft - Draft data
 */
export const saveDraftToStorage = (draft) => {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
      ...draft,
      savedAt: new Date().toISOString(),
    }));
  } catch (e) {
    console.warn("Failed to save draft to localStorage:", e);
  }
};

/**
 * Load draft from localStorage
 * @returns {Object|null} - Draft data or null
 */
export const loadDraftFromStorage = () => {
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch (e) {
    console.warn("Failed to load draft from localStorage:", e);
    return null;
  }
};

/**
 * Clear draft from localStorage
 */
export const clearDraftFromStorage = () => {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch (e) {
    console.warn("Failed to clear draft from localStorage:", e);
  }
};

