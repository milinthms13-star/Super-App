const Joi = require('joi');

// Allowed HTML tags for ReactQuill content (matches toolbar config)
const ALLOWED_HTML_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'blockquote',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ol', 'ul', 'li',
  'a', 'img',
  'div', 'span'
];

const ALLOWED_HTML_ATTRS = {
  a: ['href', 'title', 'target'],
  img: ['src', 'alt', 'width', 'height'],
  '*': ['style', 'class']
};

const VALID_MOODS = ['very_sad', 'sad', 'neutral', 'happy', 'very_happy'];
const VALID_CATEGORIES = ['Personal', 'Work', 'Travel', 'Health', 'Relationships', 'Other'];
const VALID_ATTACHMENT_TYPES = ['image', 'audio', 'video'];

/**
 * Sanitize HTML content by removing dangerous tags and attributes
 * This is a lightweight sanitizer - for production, consider sanitize-html package
 * @param {string} html - Raw HTML content
 * @returns {string} - Sanitized HTML
 */
const sanitizeHtml = (html = '') => {
  if (!html || typeof html !== 'string') return '';

  // Remove script tags and their contents completely
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/(href|src)\s*=\s*["']\s*(javascript|data):[^"']*["']/gi, '');

  // Remove iframe, object, embed tags
  sanitized = sanitized.replace(/<(iframe|object|embed|form|input|textarea|button)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1\s*>/gi, '');
  sanitized = sanitized.replace(/<(iframe|object|embed|form|input|textarea|button)\b[^>]*\/?>/gi, '');

  return sanitized;
};

/**
 * Strip all HTML tags (for plain text operations)
 * @param {string} html - HTML content
 * @returns {string} - Plain text
 */
const stripHtml = (html = '') => {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
};

// Diary Entry Validation Schema
const diaryEntrySchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Title is required',
    'string.min': 'Title cannot be empty',
    'string.max': 'Title must be at most 200 characters',
    'any.required': 'Title is required'
  }),
  content: Joi.string().trim().min(1).max(50000).required().custom((value, helpers) => {
    const plainText = stripHtml(value);
    if (!plainText || plainText.length === 0) {
      return helpers.error('content.empty');
    }
    return value;
  }).messages({
    'string.empty': 'Content is required',
    'string.min': 'Content cannot be empty',
    'string.max': 'Content must be at most 50000 characters',
    'any.required': 'Content is required',
    'content.empty': 'Content cannot be empty after stripping HTML'
  }),
  mood: Joi.string().valid(...VALID_MOODS).default('neutral').messages({
    'any.only': `Mood must be one of: ${VALID_MOODS.join(', ')}`
  }),
  category: Joi.string().valid(...VALID_CATEGORIES).default('Personal').messages({
    'any.only': `Category must be one of: ${VALID_CATEGORIES.join(', ')}`
  }),
  tags: Joi.array().items(
    Joi.string().trim().lowercase().min(1).max(50)
  ).max(20).default([]).messages({
    'array.max': 'Maximum 20 tags allowed',
    'string.max': 'Each tag must be at most 50 characters'
  }),
  isDraft: Joi.boolean().default(false),
  entryDate: Joi.date().iso().max('now').default(() => new Date()).messages({
    'date.max': 'Entry date cannot be in the future'
  })
});

// Diary Entry Update Schema (all fields optional)
const diaryEntryUpdateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).messages({
    'string.min': 'Title cannot be empty',
    'string.max': 'Title must be at most 200 characters'
  }),
  content: Joi.string().trim().min(1).max(50000).custom((value, helpers) => {
    const plainText = stripHtml(value);
    if (!plainText || plainText.length === 0) {
      return helpers.error('content.empty');
    }
    return value;
  }).messages({
    'string.max': 'Content must be at most 50000 characters',
    'content.empty': 'Content cannot be empty after stripping HTML'
  }),
  mood: Joi.string().valid(...VALID_MOODS).messages({
    'any.only': `Mood must be one of: ${VALID_MOODS.join(', ')}`
  }),
  category: Joi.string().valid(...VALID_CATEGORIES).messages({
    'any.only': `Category must be one of: ${VALID_CATEGORIES.join(', ')}`
  }),
  tags: Joi.array().items(
    Joi.string().trim().lowercase().min(1).max(50)
  ).max(20).messages({
    'array.max': 'Maximum 20 tags allowed',
    'string.max': 'Each tag must be at most 50 characters'
  }),
  isDraft: Joi.boolean(),
  entryDate: Joi.date().iso().max('now').messages({
    'date.max': 'Entry date cannot be in the future'
  })
}).min(1);

// Calendar Item Validation Schema
const calendarItemSchema = Joi.object({
  date: Joi.date().iso().required().messages({
    'date.base': 'A valid calendar date is required',
    'any.required': 'Date is required'
  }),
  type: Joi.string().valid('note', 'reminder').default('note').messages({
    'any.only': 'Type must be either note or reminder'
  }),
  title: Joi.string().trim().min(1).max(120).required().messages({
    'string.empty': 'Title is required',
    'string.min': 'Title cannot be empty',
    'string.max': 'Title must be at most 120 characters',
    'any.required': 'Title is required'
  }),
  note: Joi.string().trim().max(1500).allow('').default('').messages({
    'string.max': 'Note must be at most 1500 characters'
  }),
  reminderAt: Joi.when('type', {
    is: 'reminder',
    then: Joi.date().iso().required().messages({
      'date.base': 'Reminder time is required',
      'any.required': 'Reminder time is required for reminders'
    }),
    otherwise: Joi.date().iso().allow(null).default(null)
  }),
  isCompleted: Joi.boolean().default(false)
});

// Calendar Item Update Schema
const calendarItemUpdateSchema = Joi.object({
  date: Joi.date().iso().messages({
    'date.base': 'A valid calendar date is required'
  }),
  type: Joi.string().valid('note', 'reminder').messages({
    'any.only': 'Type must be either note or reminder'
  }),
  title: Joi.string().trim().min(1).max(120).messages({
    'string.min': 'Title cannot be empty',
    'string.max': 'Title must be at most 120 characters'
  }),
  note: Joi.string().trim().max(1500).allow('').messages({
    'string.max': 'Note must be at most 1500 characters'
  }),
  reminderAt: Joi.date().iso().allow(null),
  isCompleted: Joi.boolean()
}).min(1);

// Query Params Validation Schema
const diaryQuerySchema = Joi.object({
  category: Joi.string().valid(...VALID_CATEGORIES, 'All').allow(''),
  mood: Joi.string().valid(...VALID_MOODS, 'All').allow(''),
  search: Joi.string().trim().max(200).allow(''),
  limit: Joi.number().integer().min(1).max(100).default(20),
  skip: Joi.number().integer().min(0).default(0),
  sortBy: Joi.string().valid('-createdAt', 'createdAt', '-entryDate', 'entryDate', '-updatedAt', 'updatedAt').default('-createdAt')
});

const calendarQuerySchema = Joi.object({
  date: Joi.date().iso(),
  month: Joi.string().pattern(/^\d{4}-\d{2}$/),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(1000).default(500)
});

const moodStatsQuerySchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).default(30)
});

const upcomingRemindersQuerySchema = Joi.object({
  daysAhead: Joi.number().integer().min(1).max(90).default(7),
  startDate: Joi.date().iso(),
  timezoneOffsetMinutes: Joi.number().integer().min(-720).max(720)
});

/**
 * Validate diary entry creation
 * @param {Object} data - Request body
 * @returns {Object} - { error, value }
 */
const validateDiaryEntry = (data) => {
  const sanitizedData = {
    ...data,
    title: typeof data.title === 'string' ? data.title.trim() : data.title,
    content: sanitizeHtml(data.content)
  };
  return diaryEntrySchema.validate(sanitizedData, { abortEarly: false, stripUnknown: true });
};

/**
 * Validate diary entry update
 * @param {Object} data - Request body
 * @returns {Object} - { error, value }
 */
const validateDiaryEntryUpdate = (data) => {
  const sanitizedData = { ...data };
  if (typeof data.title === 'string') {
    sanitizedData.title = data.title.trim();
  }
  if (typeof data.content === 'string') {
    sanitizedData.content = sanitizeHtml(data.content);
  }
  return diaryEntryUpdateSchema.validate(sanitizedData, { abortEarly: false, stripUnknown: true });
};

/**
 * Validate calendar item creation
 * @param {Object} data - Request body
 * @returns {Object} - { error, value }
 */
const validateCalendarItem = (data) => {
  return calendarItemSchema.validate(data, { abortEarly: false, stripUnknown: true });
};

/**
 * Validate calendar item update
 * @param {Object} data - Request body
 * @returns {Object} - { error, value }
 */
const validateCalendarItemUpdate = (data) => {
  return calendarItemUpdateSchema.validate(data, { abortEarly: false, stripUnknown: true });
};

/**
 * Validate query parameters
 * @param {Object} query - Request query
 * @param {string} type - Query type ('diary', 'calendar', 'moodStats', 'upcomingReminders')
 * @returns {Object} - { error, value }
 */
const validateQuery = (query, type = 'diary') => {
  const schemas = {
    diary: diaryQuerySchema,
    calendar: calendarQuerySchema,
    moodStats: moodStatsQuerySchema,
    upcomingReminders: upcomingRemindersQuerySchema
  };

  const schema = schemas[type] || diaryQuerySchema;
  return schema.validate(query, { abortEarly: false, stripUnknown: true });
};

/**
 * Format Joi validation errors into a user-friendly message
 * @param {Object} error - Joi error object
 * @returns {string} - Formatted error message
 */
const formatValidationErrors = (error) => {
  if (!error || !error.details) return 'Validation failed';
  return error.details.map(d => d.message).join('; ');
};

module.exports = {
  sanitizeHtml,
  stripHtml,
  validateDiaryEntry,
  validateDiaryEntryUpdate,
  validateCalendarItem,
  validateCalendarItemUpdate,
  validateQuery,
  formatValidationErrors,
  VALID_MOODS,
  VALID_CATEGORIES,
  VALID_ATTACHMENT_TYPES
};

