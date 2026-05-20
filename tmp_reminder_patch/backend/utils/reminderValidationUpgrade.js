// Add this file: backend/utils/reminderValidationUpgrade.js

const VALID_CATEGORIES = ['Work', 'Personal', 'Urgent'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_REMINDERS = ['Email', 'In-app', 'SMS', 'Call', 'WhatsApp', 'Telegram', 'Push'];
const VALID_RECURRING = ['none', 'daily', 'weekly', 'monthly'];

const sanitizeText = (value = '', max = 1000) =>
  String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const isValidTime = (value = '') => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));

const parseDueDateTime = (dueDate, dueTime = '09:00') => {
  if (!dueDate) return null;
  const dateOnly = String(dueDate).slice(0, 10);
  const [year, month, day] = dateOnly.split('-').map(Number);
  const [hour, minute] = String(dueTime || '09:00').split(':').map(Number);
  if ([year, month, day, hour, minute].some(Number.isNaN)) return null;
  return new Date(year, month - 1, day, hour, minute, 0, 0);
};

const validateReminderPayload = (payload = {}, options = {}) => {
  const partial = Boolean(options.partial);
  const errors = {};

  if (!partial || payload.title !== undefined) {
    const title = sanitizeText(payload.title, 120);
    if (!title) errors.title = 'Title is required';
    if (title.length < 2) errors.title = 'Title must contain at least 2 characters';
  }

  if (!partial || payload.dueDate !== undefined) {
    const dueAt = parseDueDateTime(payload.dueDate, payload.dueTime || '09:00');
    if (!dueAt) errors.dueDate = 'Valid due date is required';
  }

  if (payload.dueTime !== undefined && payload.dueTime && !isValidTime(payload.dueTime)) {
    errors.dueTime = 'Use 24-hour time format HH:mm';
  }

  if (payload.category !== undefined && !VALID_CATEGORIES.includes(payload.category)) {
    errors.category = 'Invalid category';
  }

  if (payload.priority !== undefined && !VALID_PRIORITIES.includes(payload.priority)) {
    errors.priority = 'Invalid priority';
  }

  if (payload.reminders !== undefined) {
    if (!Array.isArray(payload.reminders) || payload.reminders.length === 0) {
      errors.reminders = 'Select at least one reminder channel';
    } else if (!payload.reminders.every((item) => VALID_REMINDERS.includes(item))) {
      errors.reminders = 'Invalid reminder channel';
    }
  }

  if (payload.recurring !== undefined && !VALID_RECURRING.includes(payload.recurring)) {
    errors.recurring = 'Invalid repeat option';
  }

  if (payload.reminderBeforeOffsets !== undefined) {
    const offsets = payload.reminderBeforeOffsets;
    if (!Array.isArray(offsets) || offsets.some((n) => !Number.isInteger(Number(n)) || Number(n) < 0 || Number(n) > 10080)) {
      errors.reminderBeforeOffsets = 'Reminder offsets must be 0 to 10080 minutes';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      title: sanitizeText(payload.title, 120),
      description: sanitizeText(payload.description, 1000),
    },
  };
};

module.exports = {
  VALID_REMINDERS,
  sanitizeText,
  parseDueDateTime,
  validateReminderPayload,
};
