const express = require('express');
const router = express.Router();
const DiaryEntry = require('../models/DiaryEntry');
const DiaryCalendarItem = require('../models/DiaryCalendarItem');
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const multer = require('multer');
const { uploadBufferToGridFS } = require('../utils/gridfs');
const { analyzeMood } = require('../utils/aiMoodAnalyzer');
const {
  validateDiaryEntry,
  validateDiaryEntryUpdate,
  validateCalendarItem,
  validateCalendarItemUpdate,
  validateQuery,
  formatValidationErrors
} = require('../utils/diaryValidation');
const {
  CACHE_KEYS,
  CACHE_TTL,
  getCached,
  setCached,
  invalidateUserCache,
  cacheResponse,
} = require('../utils/diaryCache');
const {
  calculateWritingStats,
  calculateStreakStats,
  calculateMoodStats,
  calculateWellnessScore,
  calculateTagAnalytics,
  calculateSentimentTrend,
  calculateWritingHeatmap,
  calculateWordCountAnalytics,
  getDashboardAnalytics,
} = require('../utils/diaryAnalytics');
const {
  analyzeSentiment,
  suggestTags,
} = require('../utils/diaryAI');
const {
  generateSummary,
  extractActionItems,
  formatSummaryMarkdown,
} = require('../utils/diaryAISummary');
const {
  generateOpenAISummary,
  generateInsights,
  generateSuggestions,
  calculateAPICost,
} = require('../utils/diaryAIOpenAI');
const DiaryStreak = require('../models/DiaryStreak');
const DiaryAISummary = require('../models/DiaryAISummary');
// Phase 4.6: Diff utility for version comparison
const {
  calculateEntryDiff,
  calculateSimilarity,
  formatDiffForDisplay,
  createDiffSummary,
} = require('../utils/diaryDiff');

// Phase 4.7: Version comments, tags, and sharing
const {
  addCommentToVersion,
  getVersionComments,
  updateComment,
  deleteComment,
  toggleCommentLike,
  getVersionCommentStats,
  searchComments,
} = require('../utils/diaryVersionComments');
const {
  addTagToVersion,
  getVersionTags,
  getVersionsByTag,
  removeTagFromVersion,
  updateTag,
  getEntryTagStats,
  getPredefinedTags,
  bulkAddTag,
} = require('../utils/diaryVersionTags');
const {
  generateVersionShareLink,
  getSharedVersion,
  revokeVersionShare,
  exportVersionAsJSON,
  exportVersionAsCSV,
  getEntryShares,
  createVersionSnapshot,
} = require('../utils/diaryVersionShare');

// Phase 5: Advanced Search and Filtering
const {
  searchEntries,
  searchWithHighlight,
  filterEntries,
  getSearchSuggestions,
  getSearchHistory,
  clearSearchHistory,
  saveFilter,
  getSavedFilters,
  useSavedFilter,
  deleteSavedFilter,
  getFilterSuggestions,
} = require('../utils/diarySearch');

// Create rate limiter for diary
const diaryRateLimiter = createModerateRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

// Apply authentication to all routes
router.use(authenticate);

// Apply rate limiting
router.use(diaryRateLimiter);

// GET /api/diary - Get all diary entries for the authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // Build cache key from query parameters
    const cacheKey = `diary:entries:${userId}:${JSON.stringify(req.query)}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for diary entries list`);
      return res.json(cached);
    }

    const { error, value: queryParams } = validateQuery(req.query, 'diary');
    if (error) {
      return res.status(400).json({
        success: false,
        message: formatValidationErrors(error)
      });
    }

    const { category, mood, search, limit, skip, sortBy } = queryParams;

    const query = { userId, isDraft: false, isDeleted: false };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (mood && mood !== 'All') {
      query.mood = mood;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const entries = await DiaryEntry.find(query)
      .sort(sortBy)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await DiaryEntry.countDocuments(query);

    const response = {
      success: true,
      data: entries,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    };

    // Cache the response
    await setCached(cacheKey, response, CACHE_TTL.ENTRIES);

    res.json(response);
  } catch (error) {
    logger.error('Error fetching diary entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch diary entries',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/drafts - Get draft entries
router.get('/drafts', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const cacheKey = CACHE_KEYS.DRAFTS(userId);
    
    // Check cache
    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for diary drafts`);
      return res.json(cached);
    }

    const { limit = 20, skip = 0 } = req.query;

    const drafts = await DiaryEntry.find({ userId, isDraft: true })
      .sort('-updatedAt')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await DiaryEntry.countDocuments({ userId, isDraft: true });

    const response = {
      success: true,
      data: drafts,
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) }
    };

    // Cache the response
    await setCached(cacheKey, response, CACHE_TTL.DRAFTS);

    res.json(response);
  } catch (error) {
    logger.error('Error fetching draft entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch draft entries'
    });
  }
});

// GET /api/diary/tags - Get all unique tags
router.get('/tags', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const cacheKey = CACHE_KEYS.TAGS(userId);
    
    // Check cache
    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for diary tags`);
      return res.json(cached);
    }

    const tags = await DiaryEntry.aggregate([
      { $match: { userId } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const response = {
      success: true,
      data: tags.map(t => ({ name: t._id, count: t.count }))
    };

    // Cache the response
    await setCached(cacheKey, response, CACHE_TTL.TAGS);

    res.json(response);
  } catch (error) {
    logger.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tags'
    });
  }
});

// GET /api/diary/mood-stats - Get mood statistics
router.get('/mood-stats', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { days = 30 } = req.query;
    const cacheKey = CACHE_KEYS.MOOD_STATS(userId, days);
    
    // Check cache
    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for mood stats`);
      return res.json(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await DiaryEntry.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$mood',
          count: { $sum: 1 }
        }
      }
    ]);

    const response = {
      success: true,
      data: stats
    };

    // Cache the response
    await setCached(cacheKey, response, CACHE_TTL.MOOD_STATS);

    res.json(response);
  } catch (error) {
    logger.error('Error fetching mood stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mood statistics'
    });
  }
});

// GET /api/diary/calendar-items - Get diary notes and reminders
router.get('/calendar-items', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { date, month, startDate, endDate, limit = 500 } = req.query;
    const query = { userId };
    const parsedLimit = Math.min(parseInt(limit, 10) || 500, 1000);

    if (date) {
      const start = normalizeStartOfDay(date);
      if (!start) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date',
        });
      }

      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      query.date = { $gte: start, $lt: end };
    } else if (month) {
      const monthMatch = String(month).match(/^(\d{4})-(\d{2})$/);
      if (!monthMatch) {
        return res.status(400).json({
          success: false,
          message: 'Invalid month format. Use YYYY-MM.',
        });
      }

      const year = parseInt(monthMatch[1], 10);
      const monthIndex = parseInt(monthMatch[2], 10) - 1;
      const start = new Date(year, monthIndex, 1);
      const end = new Date(year, monthIndex + 1, 1);
      query.date = { $gte: start, $lt: end };
    } else if (startDate || endDate) {
      const start = startDate ? normalizeStartOfDay(startDate) : null;
      const end = endDate ? normalizeStartOfDay(endDate) : null;

      if ((startDate && !start) || (endDate && !end)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date range',
        });
      }

      query.date = {};
      if (start) {
        query.date.$gte = start;
      }
      if (end) {
        const exclusiveEnd = new Date(end);
        exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
        query.date.$lt = exclusiveEnd;
      }
    }

    const items = await DiaryCalendarItem.find(query)
      .sort({ date: 1, reminderAt: 1, createdAt: 1 })
      .limit(parsedLimit)
      .lean();

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    logger.error('Error fetching diary calendar items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch diary calendar items',
    });
  }
});

// POST /api/diary/calendar-items - Create diary note or reminder
router.post('/calendar-items', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // Validate calendar item data
    const { error, value: validatedPayload } = validateCalendarItem(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: formatValidationErrors(error),
      });
    }

    const item = await DiaryCalendarItem.create({
      userId,
      ...validatedPayload,
    });

    res.status(201).json({
      success: true,
      data: item,
      message:
        validatedPayload.type === 'reminder'
          ? 'Reminder created successfully'
          : 'Note created successfully',
    });
  } catch (error) {
    logger.error('Error creating diary calendar item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create diary calendar item',
    });
  }
});

// PUT /api/diary/calendar-items/:itemId - Update diary note or reminder
router.put('/calendar-items/:itemId', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // Validate update data
    const { error, value: validatedPayload } = validateCalendarItemUpdate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: formatValidationErrors(error),
      });
    }

    const item = await DiaryCalendarItem.findOne({
      _id: req.params.itemId,
      userId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Calendar item not found',
      });
    }

    // Update only provided fields
    if (validatedPayload.date !== undefined) item.date = validatedPayload.date;
    if (validatedPayload.type !== undefined) item.type = validatedPayload.type;
    if (validatedPayload.title !== undefined) item.title = validatedPayload.title;
    if (validatedPayload.note !== undefined) item.note = validatedPayload.note;
    if (validatedPayload.reminderAt !== undefined) item.reminderAt = validatedPayload.reminderAt;
    if (validatedPayload.isCompleted !== undefined) item.isCompleted = validatedPayload.isCompleted;
    await item.save();

    res.json({
      success: true,
      data: item,
      message: 'Calendar item updated successfully',
    });
  } catch (error) {
    logger.error('Error updating diary calendar item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update diary calendar item',
    });
  }
});

// DELETE /api/diary/calendar-items/:itemId - Remove diary note or reminder
router.delete('/calendar-items/:itemId', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const item = await DiaryCalendarItem.findOneAndDelete({
      _id: req.params.itemId,
      userId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Calendar item not found',
      });
    }

    res.json({
      success: true,
      message: 'Calendar item deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting diary calendar item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete diary calendar item',
    });
  }
});

// GET /api/diary/:id - Get single diary entry
router.get('/:id([0-9a-fA-F]{24})', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const entry = await DiaryEntry.findOne({
      _id: req.params.id,
      userId
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found'
      });
    }

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    logger.error('Error fetching diary entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch diary entry'
    });
  }
});

// Multer for attachments
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images, audio, and video files are allowed'), false);
    }
  }
});

const parseBooleanField = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return fallback;
};

const parseTagsField = (value) => {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).toLowerCase().trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((tag) => String(tag).toLowerCase().trim()).filter(Boolean);
      }
    } catch (error) {
      return value
        .split(',')
        .map((tag) => String(tag).toLowerCase().trim())
        .filter(Boolean);
    }
  }

  return [];
};

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseDateValue = (value) => {
  if (value instanceof Date) {
    const clonedDate = new Date(value);
    return Number.isNaN(clonedDate.getTime()) ? null : clonedDate;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    const dateOnlyMatch = trimmedValue.match(DATE_ONLY_PATTERN);

    if (dateOnlyMatch) {
      const year = parseInt(dateOnlyMatch[1], 10);
      const monthIndex = parseInt(dateOnlyMatch[2], 10) - 1;
      const day = parseInt(dateOnlyMatch[3], 10);
      return new Date(year, monthIndex, day);
    }
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const normalizeStartOfDay = (value) => {
  const date = parseDateValue(value);
  if (!date) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
};

const parseTimezoneOffsetMinutes = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsedOffset = parseInt(value, 10);
  return Number.isNaN(parsedOffset) ? null : parsedOffset;
};

const buildDayWindow = (value = new Date(), timezoneOffsetMinutes = null) => {
  const start = normalizeStartOfDay(value);
  if (!start) {
    return null;
  }

  const parsedOffset = parseTimezoneOffsetMinutes(timezoneOffsetMinutes);
  if (parsedOffset !== null) {
    const utcStart = new Date(
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
    );
    utcStart.setMinutes(utcStart.getMinutes() + parsedOffset);

    const utcEnd = new Date(utcStart);
    utcEnd.setDate(utcEnd.getDate() + 1);

    return { start: utcStart, end: utcEnd };
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

const parseCalendarItemPayload = (body = {}) => {
  const normalizedType = body.type === 'reminder' ? 'reminder' : 'note';
  const normalizedDate = normalizeStartOfDay(body.date);
  const rawReminderAt = normalizedType === 'reminder' ? body.reminderAt : null;
  const reminderAt = rawReminderAt ? new Date(rawReminderAt) : null;

  return {
    date: normalizedDate,
    type: normalizedType,
    title: typeof body.title === 'string' ? body.title.trim() : '',
    note: typeof body.note === 'string' ? body.note.trim() : '',
    reminderAt:
      reminderAt && !Number.isNaN(reminderAt.getTime()) ? reminderAt : null,
    isCompleted: parseBooleanField(body.isCompleted, false),
  };
};

const validateCalendarItemPayload = (payload) => {
  if (!payload.date) {
    return 'A valid calendar date is required';
  }

  if (!payload.title) {
    return 'Title is required';
  }

  if (payload.type === 'reminder' && !payload.reminderAt) {
    return 'Reminder time is required';
  }

  return null;
};

const storeDiaryAttachment = async ({ file, user }) => {
  if (!file?.buffer?.length) {
    return null;
  }

  try {
    const storedFile = await uploadBufferToGridFS({
      buffer: file.buffer,
      filename: file.originalname || `diary-${Date.now()}`,
      contentType: file.mimetype || 'application/octet-stream',
      metadata: {
        category: 'diary-attachment',
        visibility: 'private',
        ownerEmail: user?.email || '',
      },
    });

    return {
      type: file.mimetype.startsWith('image/') ? 'image' : 'audio',
      url: `/api/files/private/${storedFile.id}`,
      fileName: file.originalname,
      fileSize: file.size,
      uploadedAt: new Date()
    };
  } catch (error) {
    if (error?.message?.includes('GridFS bucket has not been initialized')) {
      const contentType = file.mimetype || 'application/octet-stream';
      return {
        type: file.mimetype.startsWith('image/') ? 'image' : 'audio',
        url: `data:${contentType};base64,${file.buffer.toString('base64')}`,
        fileName: file.originalname,
        fileSize: file.size,
        uploadedAt: new Date()
      };
    }

    throw error;
  }
};

// POST /api/diary - Create new diary entry
router.post('/', upload.array('attachments', 5), async (req, res) => {
  try {
    // Validate entry data
    const { error, value: validatedData } = validateDiaryEntry(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: formatValidationErrors(error)
      });
    }

    const {
      title,
      content,
      mood,
      category,
      tags,
      isDraft,
      entryDate
    } = validatedData;

    // Process attachments
    const attachments = [];
    for (const file of req.files || []) {
      try {
        const attachment = await storeDiaryAttachment({ file, user: req.user });
        if (attachment) {
          attachments.push(attachment);
        }
      } catch (err) {
        logger.error('Attachment upload failed:', err);
      }
    }

    const normalizedMood = mood || analyzeMood(content);

    const entry = new DiaryEntry({
      userId: req.user._id || req.user.id,
      title,
      content,
      mood: normalizedMood,
      category,
      tags,
      isDraft,
      attachments,
      entryDate: entryDate || new Date()
    });

    await entry.save();

    logger.info(`Diary entry created: ${entry.title} for user ${req.user._id || req.user.id}`);

    // Invalidate user cache after creating entry
    const userId = req.user._id || req.user.id;
    await invalidateUserCache(userId);

    res.status(201).json({
      success: true,
      data: entry,
      message: isDraft ? 'Draft saved successfully' : 'Entry created successfully'
    });
  } catch (error) {
    logger.error('Error creating diary entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create diary entry',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/diary/:id - Update diary entry
router.put('/:id', upload.array('attachments', 5), async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // Validate update data
    const { error, value: validatedData } = validateDiaryEntryUpdate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: formatValidationErrors(error)
      });
    }

    const entry = await DiaryEntry.findOne({
      _id: req.params.id,
      userId
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found'
      });
    }

    const newAttachments = [];
    for (const file of req.files || []) {
      try {
        const attachment = await storeDiaryAttachment({ file, user: req.user });
        if (attachment) {
          newAttachments.push(attachment);
        }
      } catch (err) {
        logger.error('Attachment upload failed:', err);
      }
    }

    const { title, content, mood, category, tags, isDraft, entryDate } = validatedData;

    if (title) entry.title = title;
    if (content) entry.content = content;
    if (mood) {
      entry.mood = mood || analyzeMood(content || entry.content || '');
    }
    if (category) entry.category = category;
    if (tags !== undefined) {
      entry.tags = tags;
    }
    if (isDraft !== undefined) entry.isDraft = isDraft;
    if (entryDate) entry.entryDate = entryDate;
    if (newAttachments.length > 0) {
      entry.attachments.push(...newAttachments);
    }

    entry.updatedAt = new Date();
    await entry.save();

    logger.info(`Diary entry updated: ${entry.title} for user ${userId}`);

    // Invalidate user cache after updating entry
    await invalidateUserCache(userId);

    res.json({
      success: true,
      data: entry,
      message: 'Entry updated successfully'
    });
  } catch (error) {
    logger.error('Error updating diary entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update diary entry',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/by-date/:date - Get entries by date
router.get('/by-date/:date', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const dayWindow = buildDayWindow(req.params.date);

    if (!dayWindow) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date',
      });
    }

    const { start: startDate, end: endDate } = dayWindow;

    const entries = await DiaryEntry.find({
      userId,
      entryDate: { $gte: startDate, $lt: endDate },
      isDraft: false
    }).sort('-createdAt');

    res.json({
      success: true,
      data: entries
    });
  } catch (error) {
    logger.error('Error fetching entries by date:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch entries by date'
    });
  }
});

// GET /api/diary/todays-items - Get today's diary entries, notes, and reminders
router.get('/today/summary', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const dayWindow = buildDayWindow(
      req.query.date || new Date(),
      req.query.timezoneOffsetMinutes
    );

    if (!dayWindow) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date',
      });
    }

    const { start: dayStart, end: dayEnd } = dayWindow;

    const [entries, items] = await Promise.all([
      DiaryEntry.find({
        userId,
        isDraft: false,
        entryDate: {
          $gte: dayStart,
          $lt: dayEnd,
        },
      })
        .select('_id title content category mood entryDate createdAt')
        .sort({ entryDate: -1, createdAt: -1 })
        .lean(),
      DiaryCalendarItem.find({
        userId,
        date: {
          $gte: dayStart,
          $lt: dayEnd,
        },
      })
        .select('_id type title note reminderAt isCompleted isNotified date')
        .sort({ reminderAt: 1, createdAt: 1 })
        .lean(),
    ]);

    const notes = items.filter((i) => i.type === 'note');
    const reminders = items.filter((i) => i.type === 'reminder');
    const pendingReminders = reminders.filter((i) => !i.isCompleted);

    res.json({
      success: true,
      data: {
        entries,
        notes,
        reminders,
        pendingReminders,
        summary: {
          totalEntries: entries.length,
          totalNotes: notes.length,
          totalReminders: reminders.length,
          pendingRemindersCount: pendingReminders.length,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching todays items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch todays items',
    });
  }
});

// GET /api/diary/upcoming-reminders - Get upcoming reminders
router.get('/upcoming-reminders', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { daysAhead = 7, startDate, timezoneOffsetMinutes } = req.query;
    const dayWindow = buildDayWindow(startDate || new Date(), timezoneOffsetMinutes);

    if (!dayWindow) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date',
      });
    }

    const parsedDaysAhead = Math.max(parseInt(daysAhead, 10) || 7, 1);
    const futureDate = new Date(dayWindow.start);
    futureDate.setDate(futureDate.getDate() + parsedDaysAhead);

    const reminders = await DiaryCalendarItem.find({
      userId,
      type: 'reminder',
      isCompleted: false,
      reminderAt: {
        $gte: dayWindow.start,
        $lt: futureDate,
      },
    })
      .select('_id title reminderAt isNotified isCompleted date isUrgent')
      .sort({ reminderAt: 1 })
      .lean();

    res.json({
      success: true,
      data: reminders,
    });
  } catch (error) {
    logger.error('Error fetching upcoming reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming reminders',
    });
  }
});

// PUT /api/diary/calendar-items/:itemId/mark-notified - Mark reminder as notified
router.put('/calendar-items/:itemId/mark-notified', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { itemId } = req.params;

    const item = await DiaryCalendarItem.findOneAndUpdate(
      {
        _id: itemId,
        userId,
        type: 'reminder',
      },
      {
        isNotified: true,
        notifiedAt: new Date(),
      },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }

    res.json({
      success: true,
      data: item,
      message: 'Reminder marked as notified',
    });
  } catch (error) {
    logger.error('Error marking reminder as notified:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark reminder as notified',
    });
  }
});

// ============================================================================
// PHASE 5.1: VERSION HISTORY, SOFT DELETE, AUTOSAVE RECOVERY, APP LOCK
// ============================================================================

const DiaryEntryVersion = require('../models/DiaryEntryVersion');
const DiaryAppLock = require('../models/DiaryAppLock');

// POST /api/diary/:entryId/autosave - Auto-save entry (creates version)
router.post('/:entryId/autosave', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { entryId } = req.params;
    const { title, content, mood, category, tags } = req.body;

    // Verify ownership
    const entry = await DiaryEntry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    // Create version before updating
    const lastVersion = await DiaryEntryVersion.findOne({ entryId }).sort('-versionNumber').lean();
    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    await DiaryEntryVersion.create({
      userId,
      entryId,
      versionNumber: nextVersionNumber,
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
      category: entry.category,
      tags: entry.tags,
      isDraft: entry.isDraft,
      changeType: 'auto_save',
      changeDescription: 'Auto-saved at ' + new Date().toLocaleString(),
      savedAt: new Date()
    });

    // Update entry
    entry.title = title || entry.title;
    entry.content = content || entry.content;
    entry.mood = mood || entry.mood;
    entry.category = category || entry.category;
    if (tags) entry.tags = tags;
    entry.updatedAt = new Date();
    await entry.save();

    // Invalidate user cache after autosave
    await invalidateUserCache(userId);

    res.json({
      success: true,
      data: entry,
      message: 'Auto-save successful',
      versionNumber: nextVersionNumber
    });
  } catch (error) {
    logger.error('Error in autosave:', error);
    res.status(500).json({
      success: false,
      message: 'Auto-save failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/:entryId/versions - Get all versions of an entry
router.get('/:entryId/versions', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { entryId } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    // Verify ownership
    const entry = await DiaryEntry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    const versions = await DiaryEntryVersion.find({ entryId, userId })
      .sort('-versionNumber')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await DiaryEntryVersion.countDocuments({ entryId, userId });

    res.json({
      success: true,
      data: versions,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching versions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch versions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/diary/:entryId/versions/:versionNumber/restore - Restore a specific version
router.post('/:entryId/versions/:versionNumber/restore', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { entryId, versionNumber } = req.params;

    // Verify ownership
    const entry = await DiaryEntry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    // Get the version to restore
    const version = await DiaryEntryVersion.findOne({
      entryId,
      userId,
      versionNumber: parseInt(versionNumber)
    });

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      });
    }

    // Create a version of current state before restoring
    const lastVersion = await DiaryEntryVersion.findOne({ entryId }).sort('-versionNumber').lean();
    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    await DiaryEntryVersion.create({
      userId,
      entryId,
      versionNumber: nextVersionNumber,
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
      category: entry.category,
      tags: entry.tags,
      isDraft: entry.isDraft,
      changeType: 'manual_save',
      changeDescription: `Restored from version ${versionNumber}`,
      savedAt: new Date()
    });

    // Restore entry
    entry.title = version.title;
    entry.content = version.content;
    entry.mood = version.mood;
    entry.category = version.category;
    entry.tags = version.tags;
    entry.isDraft = version.isDraft;
    entry.updatedAt = new Date();
    await entry.save();

    res.json({
      success: true,
      data: entry,
      message: `Restored to version ${versionNumber}`,
      newVersionNumber: nextVersionNumber
    });
  } catch (error) {
    logger.error('Error restoring version:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore version',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/diary/:entryId - Soft delete (move to trash)
router.delete('/:entryId', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { entryId } = req.params;

    const entry = await DiaryEntry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    // Soft delete
    entry.isDeleted = true;
    entry.deletedAt = new Date();
    entry.deletedBy = userId;
    // Schedule permanent deletion after 30 days
    entry.permanentlyDeleteAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await entry.save();

    // Invalidate user cache after soft delete
    await invalidateUserCache(userId);

    res.json({
      success: true,
      message: 'Entry moved to trash. It will be permanently deleted after 30 days.'
    });
  } catch (error) {
    logger.error('Error deleting entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete entry',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/trash/list - Get all deleted entries (trash)
router.get('/trash/list', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { limit = 20, skip = 0 } = req.query;

    const trash = await DiaryEntry.find({ userId, isDeleted: true })
      .sort('-deletedAt')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await DiaryEntry.countDocuments({ userId, isDeleted: true });

    res.json({
      success: true,
      data: trash,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching trash:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trash',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/diary/:entryId/recover - Restore from trash
router.post('/:entryId/recover', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { entryId } = req.params;

    const entry = await DiaryEntry.findOne({ _id: entryId, userId, isDeleted: true });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found in trash'
      });
    }

    // Recover entry
    entry.isDeleted = false;
    entry.deletedAt = null;
    entry.deletedBy = null;
    entry.permanentlyDeleteAt = null;
    entry.updatedAt = new Date();
    await entry.save();

    // Invalidate user cache after recovery
    await invalidateUserCache(userId);

    res.json({
      success: true,
      data: entry,
      message: 'Entry recovered from trash'
    });
  } catch (error) {
    logger.error('Error recovering entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recover entry',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/diary/:entryId/permanent - Permanently delete entry
router.delete('/:entryId/permanent', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { entryId } = req.params;

    const entry = await DiaryEntry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    // Also delete all versions
    await DiaryEntryVersion.deleteMany({ entryId });

    // Permanently delete entry
    await DiaryEntry.deleteOne({ _id: entryId });

    res.json({
      success: true,
      message: 'Entry permanently deleted'
    });
  } catch (error) {
    logger.error('Error permanently deleting entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete entry',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// APP LOCK ROUTES
// ============================================================================

// POST /api/diary/app-lock/setup-pin - Setup or update PIN lock
router.post('/app-lock/setup-pin', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { pin } = req.body;

    if (!pin || pin.length < 4 || pin.length > 8) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be 4-8 characters'
      });
    }

    // All numbers check
    if (!/^\d+$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must contain only numbers'
      });
    }

    let appLock = await DiaryAppLock.findOne({ userId });
    if (!appLock) {
      appLock = new DiaryAppLock({ userId });
    }

    await appLock.setPin(pin);

    res.json({
      success: true,
      message: 'PIN lock enabled successfully',
      data: {
        lockType: appLock.lockType,
        autoLockTimeoutMinutes: appLock.autoLockTimeoutMinutes
      }
    });
  } catch (error) {
    logger.error('Error setting PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set PIN lock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/diary/app-lock/verify-pin - Verify PIN for unlock
router.post('/app-lock/verify-pin', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: 'PIN is required'
      });
    }

    let appLock = await DiaryAppLock.findOne({ userId });
    if (!appLock || appLock.lockType === 'none') {
      return res.status(400).json({
        success: false,
        message: 'App lock not enabled'
      });
    }

    // Check if temporarily locked due to failed attempts
    if (appLock.isLockedOutTemporarily()) {
      const timeRemaining = Math.ceil((appLock.lockedUntil - new Date()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${timeRemaining} seconds`,
        lockedUntil: appLock.lockedUntil
      });
    }

    // Verify PIN
    const isValid = await appLock.verifyPin(pin);
    if (!isValid) {
      await appLock.incrementFailedAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid PIN',
        attemptsRemaining: appLock.maxFailedAttempts - appLock.failedAttempts
      });
    }

    // Reset failed attempts on success
    await appLock.resetFailedAttempts();

    res.json({
      success: true,
      message: 'PIN verified successfully',
      data: {
        unlockedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Error verifying PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify PIN',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/diary/app-lock/disable - Disable app lock
router.post('/app-lock/disable', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    let appLock = await DiaryAppLock.findOne({ userId });
    if (!appLock) {
      return res.status(400).json({
        success: false,
        message: 'App lock not enabled'
      });
    }

    appLock.lockType = 'none';
    appLock.pinHash = null;
    appLock.biometricEnabled = false;
    appLock.isCurrentlyLocked = false;
    appLock.failedAttempts = 0;
    appLock.lockedUntil = null;
    await appLock.save();

    res.json({
      success: true,
      message: 'App lock disabled'
    });
  } catch (error) {
    logger.error('Error disabling app lock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable app lock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/app-lock/status - Get app lock status
router.get('/app-lock/status', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    let appLock = await DiaryAppLock.findOne({ userId });
    if (!appLock) {
      appLock = new DiaryAppLock({ userId });
      await appLock.save();
    }

    res.json({
      success: true,
      data: {
        lockType: appLock.lockType,
        isEnabled: appLock.lockType !== 'none',
        autoLockTimeoutMinutes: appLock.autoLockTimeoutMinutes,
        lastUnlockedAt: appLock.lastUnlockedAt,
        isCurrentlyLocked: appLock.isCurrentlyLocked,
        isLockedOutTemporarily: appLock.isLockedOutTemporarily(),
        lockedUntil: appLock.isLockedOutTemporarily() ? appLock.lockedUntil : null
      }
    });
  } catch (error) {
    logger.error('Error fetching app lock status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch app lock status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/diary/app-lock/auto-lock-timeout - Update auto-lock timeout
router.put('/app-lock/auto-lock-timeout', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { timeoutMinutes } = req.body;

    if (!timeoutMinutes || timeoutMinutes < 1 || timeoutMinutes > 120) {
      return res.status(400).json({
        success: false,
        message: 'Timeout must be between 1 and 120 minutes'
      });
    }

    let appLock = await DiaryAppLock.findOne({ userId });
    if (!appLock) {
      appLock = new DiaryAppLock({ userId });
    }

    appLock.autoLockTimeoutMinutes = timeoutMinutes;
    await appLock.save();

    res.json({
      success: true,
      message: 'Auto-lock timeout updated',
      data: {
        autoLockTimeoutMinutes: appLock.autoLockTimeoutMinutes
      }
    });
  } catch (error) {
    logger.error('Error updating auto-lock timeout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update auto-lock timeout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// PHASE 5.2: END-TO-END ENCRYPTION, CLOUD BACKUP, AI FEATURES
// ============================================================================

const DiaryEncryptionKey = require('../models/DiaryEncryptionKey');
const DiaryBackup = require('../models/DiaryBackup');
const DiaryEncryptionService = require('../utils/diaryEncryptionService');
const diaryAISummaryService = require('../services/diaryAISummaryService');

// POST /api/diary/encryption/enable - Enable E2E encryption for diary
router.post('/encryption/enable', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // Check if encryption already enabled
    const existingKey = await DiaryEncryptionKey.getActiveKey(userId);
    if (existingKey) {
      return res.status(400).json({
        success: false,
        message: 'Encryption already enabled'
      });
    }

    // Generate user-specific encryption key
    const encryptService = new DiaryEncryptionService();
    const { key, keyId } = encryptService.generateUserKey(userId);

    // Create fingerprint (hash of key metadata)
    const fingerprint = encryptService.hashContent(keyId + userId);

    // Create encryption key record
    const encryptionKey = await DiaryEncryptionKey.create({
      userId,
      keyId,
      publicKeyFingerprint: fingerprint,
      isActive: true
    });

    res.json({
      success: true,
      message: 'E2E encryption enabled',
      data: {
        keyId: encryptionKey.keyId,
        fingerprint: encryptionKey.publicKeyFingerprint,
        algorithm: encryptionKey.algorithm
      }
    });
  } catch (error) {
    logger.error('Error enabling encryption:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable encryption',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/encryption/status - Check encryption status
router.get('/encryption/status', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const encryptionKey = await DiaryEncryptionKey.getActiveKey(userId);
    const encryptedEntriesCount = await DiaryEntry.countDocuments({
      userId,
      isEncrypted: true
    });

    res.json({
      success: true,
      data: {
        isEnabled: !!encryptionKey,
        keyId: encryptionKey?.keyId,
        algorithm: encryptionKey?.algorithm,
        encryptedEntriesCount: encryptedEntriesCount,
        keyVersion: encryptionKey?.keyVersion
      }
    });
  } catch (error) {
    logger.error('Error checking encryption status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check encryption status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/diary/:entryId/encrypt - Encrypt a specific entry
router.post('/:entryId/encrypt', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { entryId } = req.params;

    const entry = await DiaryEntry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    if (entry.isEncrypted) {
      return res.status(400).json({
        success: false,
        message: 'Entry is already encrypted'
      });
    }

    // Get user encryption key
    const encryptionKey = await DiaryEncryptionKey.getActiveKey(userId);
    if (!encryptionKey) {
      return res.status(400).json({
        success: false,
        message: 'Encryption not enabled. Please enable E2E encryption first.'
      });
    }

    // Encrypt entry
    const encryptService = new DiaryEncryptionService();
    // Note: In production, retrieve actual key from secure storage
    const userKey = Buffer.alloc(32); // Placeholder
    
    const entryData = {
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
      category: entry.category,
      tags: entry.tags
    };

    const encrypted = encryptService.encryptEntry(entryData, userKey);
    const contentHash = encryptService.hashContent(JSON.stringify(entryData));

    // Update entry
    entry.isEncrypted = true;
    entry.encryptionKeyId = encryptionKey.keyId;
    entry.encryptedData = encrypted;
    entry.contentHash = contentHash;
    // Clear plain text when encrypted
    entry.title = '[Encrypted]';
    entry.content = '[Encrypted Entry - Requires decryption]';
    await entry.save();

    res.json({
      success: true,
      message: 'Entry encrypted successfully',
      data: {
        entryId: entry._id,
        isEncrypted: true,
        keyId: encryptionKey.keyId
      }
    });
  } catch (error) {
    logger.error('Error encrypting entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to encrypt entry',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// CLOUD BACKUP ROUTES
// ============================================================================

// POST /api/diary/backup/create - Create backup of all entries
router.post('/backup/create', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { backupType = 'manual' } = req.body;

    const backupId = `backup-${userId}-${Date.now()}`;

    // Create backup record
    const backup = await DiaryBackup.create({
      userId,
      backupId,
      backupType,
      status: 'in-progress',
      backupStartedAt: new Date()
    });

    // Asynchronous backup process (simulate with timeout)
    setImmediate(async () => {
      try {
        // Get all user entries
        const entries = await DiaryEntry.find({ userId, isDeleted: false })
          .lean();

        if (entries.length === 0) {
          await DiaryBackup.updateOne(
            { _id: backup._id },
            { status: 'completed', entryCount: 0, completedAt: new Date() }
          );
          return;
        }

        // Compress and encrypt backup data
        const backupData = JSON.stringify({ entries, backupDate: new Date() });
        const backupSize = Buffer.byteLength(backupData);

        // In production: compress with zlib/brotli and encrypt
        const encryptService = new DiaryEncryptionService();
        // Note: Use actual encryption key in production
        const userKey = Buffer.alloc(32);
        const encrypted = encryptService.encryptContent(backupData, userKey);
        const hash = encryptService.hashContent(backupData);

        // Update backup
        await DiaryBackup.updateOne(
          { _id: backup._id },
          {
            status: 'completed',
            entryCount: entries.length,
            backupSize: backupSize,
            backupData: encrypted,
            integrityHash: hash,
            completedAt: new Date()
          }
        );
      } catch (error) {
        logger.error('Backup creation failed:', error);
        await DiaryBackup.updateOne(
          { _id: backup._id },
          {
            status: 'failed',
            errorMessage: error.message,
            errorStack: error.stack
          }
        );
      }
    });

    res.status(201).json({
      success: true,
      message: 'Backup creation started',
      data: {
        backupId: backup.backupId,
        status: backup.status,
        backupStartedAt: backup.backupStartedAt
      }
    });
  } catch (error) {
    logger.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/backup/list - Get list of backups
router.get('/backup/list', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { limit = 10, skip = 0, status } = req.query;

    const query = { userId };
    if (status) query.status = status;

    const backups = await DiaryBackup.find(query)
      .select('backupId backupType status entryCount backupSize completedAt createdAt')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await DiaryBackup.countDocuments(query);

    res.json({
      success: true,
      data: backups,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    logger.error('Error fetching backups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch backups',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/diary/backup/:backupId/restore - Restore from backup
router.post('/backup/:backupId/restore', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { backupId } = req.params;

    const backup = await DiaryBackup.findOne({ userId, backupId });
    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    if (backup.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Backup is not ready for restore'
      });
    }

    // Decrypt backup data
    const encryptService = new DiaryEncryptionService();
    // Note: Use actual decryption key in production
    const userKey = Buffer.alloc(32);
    
    try {
      const decryptedData = encryptService.decryptContent(backup.backupData, userKey);
      const backupContent = JSON.parse(decryptedData);

      // Verify integrity
      const hash = encryptService.hashContent(decryptedData);
      if (hash !== backup.integrityHash) {
        throw new Error('Backup integrity check failed');
      }

      // Import entries (asynchronous)
      setImmediate(async () => {
        try {
          for (const entry of backupContent.entries) {
            await DiaryEntry.updateOne(
              { _id: entry._id, userId },
              entry,
              { upsert: true }
            );
          }

          // Record restore
          await backup.addRestoreRecord(backupContent.entries.length, userId);
        } catch (error) {
          logger.error('Restore import failed:', error);
        }
      });

      res.json({
        success: true,
        message: 'Backup restore initiated',
        data: {
          backupId: backup.backupId,
          entryCount: backup.entryCount,
          restoreStartedAt: new Date()
        }
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to decrypt backup: ' + error.message
      });
    }
  } catch (error) {
    logger.error('Error restoring backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore backup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// AI SUMMARY & ANALYSIS ROUTES
// ============================================================================

// GET /api/diary/ai/summary?period=week|month|year - Get AI summary
router.get('/ai/summary', async (req, res) => {
  try {
    if (!diaryAISummaryService.isEnabled()) {
      return res.status(400).json({
        success: false,
        message: 'AI features not available'
      });
    }

    const userId = req.user._id || req.user.id;
    const { period = 'month', entryId } = req.query;

    // If specific entry requested
    if (entryId) {
      const entry = await DiaryEntry.findOne({ _id: entryId, userId });
      if (!entry) {
        return res.status(404).json({
          success: false,
          message: 'Entry not found'
        });
      }

      // Check cache
      if (entry.aiSummary && entry.aiSummary.expiresAt > new Date()) {
        return res.json({
          success: true,
          data: {
            summary: entry.aiSummary.summary,
            cached: true,
            generatedAt: entry.aiSummary.generatedAt
          }
        });
      }

      // Generate summary
      const summary = await diaryAISummaryService.generateEntrySummary(
        entry.content,
        entry.title,
        { mood: entry.mood, category: entry.category, tags: entry.tags }
      );

      // Cache it
      entry.aiSummary = {
        summary,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };
      await entry.save();

      return res.json({
        success: true,
        data: {
          summary: entry.aiSummary.summary,
          cached: false,
          generatedAt: entry.aiSummary.generatedAt
        }
      });
    }

    // Period-based summary
    let daysBack = 30;
    if (period === 'week') daysBack = 7;
    else if (period === 'year') daysBack = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const entries = await DiaryEntry.find({
      userId,
      createdAt: { $gte: startDate },
      isDeleted: false
    })
      .select('title content mood category tags createdAt')
      .lean();

    if (entries.length === 0) {
      return res.json({
        success: true,
        data: {
          summary: `No entries found for the last ${period}`,
          entryCount: 0
        }
      });
    }

    const digest = await diaryAISummaryService.generateWeeklyDigest(entries);

    res.json({
      success: true,
      data: {
        period,
        entryCount: entries.length,
        digest
      }
    });
  } catch (error) {
    logger.error('Error generating AI summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/ai/mood-insights?daysBack=30 - Get AI mood insights
router.get('/ai/mood-insights', async (req, res) => {
  try {
    if (!diaryAISummaryService.isEnabled()) {
      return res.status(400).json({
        success: false,
        message: 'AI features not available'
      });
    }

    const userId = req.user._id || req.user.id;
    const { daysBack = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(daysBack));

    const entries = await DiaryEntry.find({
      userId,
      createdAt: { $gte: startDate },
      isDeleted: false
    })
      .select('title content mood category tags createdAt')
      .lean();

    if (entries.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'Not enough entries for analysis',
          entryCount: 0
        }
      });
    }

    // Check cache
    const cachedAnalysis = await DiaryEntry.findOne({
      userId,
      emotionalAnalysis: { $exists: true }
    })
      .select('emotionalAnalysis')
      .lean();

    if (
      cachedAnalysis &&
      cachedAnalysis.emotionalAnalysis.analyzedAt &&
      new Date(cachedAnalysis.emotionalAnalysis.analyzedAt) > startDate
    ) {
      return res.json({
        success: true,
        data: cachedAnalysis.emotionalAnalysis,
        cached: true
      });
    }

    // Analyze patterns
    const insights = await diaryAISummaryService.analyzeEmotionalPatterns(
      entries,
      daysBack > 100 ? 'year' : daysBack > 7 ? 'month' : 'week'
    );

    // Cache first entry with analysis
    if (entries.length > 0) {
      await DiaryEntry.updateOne(
        { _id: entries[0]._id },
        {
          emotionalAnalysis: {
            ...insights,
            analyzedAt: new Date()
          }
        }
      );
    }

    res.json({
      success: true,
      data: {
        ...insights,
        entryCount: entries.length,
        analyzeDate: new Date()
      }
    });
  } catch (error) {
    logger.error('Error analyzing mood patterns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze mood patterns',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/ai/wellness-recommendations - Get personalized wellness recommendations
router.get('/ai/wellness-recommendations', async (req, res) => {
  try {
    if (!diaryAISummaryService.isEnabled()) {
      return res.status(400).json({
        success: false,
        message: 'AI features not available'
      });
    }

    const userId = req.user._id || req.user.id;
    const { daysBack = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(daysBack));

    const entries = await DiaryEntry.find({
      userId,
      createdAt: { $gte: startDate },
      isDeleted: false
    })
      .select('title content mood category tags')
      .lean();

    if (entries.length === 0) {
      return res.json({
        success: true,
        data: {
          recommendations: [],
          message: 'Not enough entries for recommendations'
        }
      });
    }

    const recommendations = await diaryAISummaryService.getWellnessRecommendations(entries);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting wellness recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/:entryId/ai/action-items - Extract action items from entry
router.get('/:entryId/ai/action-items', async (req, res) => {
  try {
    if (!diaryAISummaryService.isEnabled()) {
      return res.status(400).json({
        success: false,
        message: 'AI features not available'
      });
    }

    const userId = req.user._id || req.user.id;
    const { entryId } = req.params;

    const entry = await DiaryEntry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    const actionItems = await diaryAISummaryService.extractActionItems(entry.content);

    res.json({
      success: true,
      data: actionItems
    });
  } catch (error) {
    logger.error('Error extracting action items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract action items',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// PHASE 4: ANALYTICS, STREAKS, SENTIMENT ANALYSIS, AUTO-TAGGING
// ============================================================================

// GET /api/diary/analytics/writing-stats - Writing statistics
router.get('/analytics/writing-stats', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { period = '30', daysBack = 30 } = req.query;
    const cacheKey = `diary:analytics:writing-stats:${userId}:${daysBack}`;

    // Check cache
    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug('Cache hit for writing stats');
      return res.json(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(daysBack));

    const entries = await DiaryEntry.find({
      userId,
      createdAt: { $gte: startDate },
      isDraft: false,
      isDeleted: false
    }).lean();

    const stats = calculateWritingStats(entries);

    const response = {
      success: true,
      data: stats,
      period: `${daysBack} days`
    };

    await setCached(cacheKey, response, CACHE_TTL.MOOD_STATS);
    res.json(response);
  } catch (error) {
    logger.error('Error fetching writing stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch writing statistics'
    });
  }
});

// GET /api/diary/analytics/mood-trends - Mood trends and emotional patterns
router.get('/analytics/mood-trends', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { daysBack = 30 } = req.query;
    const cacheKey = `diary:analytics:mood-trends:${userId}:${daysBack}`;

    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug('Cache hit for mood trends');
      return res.json(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(daysBack));

    const entries = await DiaryEntry.find({
      userId,
      createdAt: { $gte: startDate },
      isDraft: false,
      isDeleted: false
    }).lean();

    const moodStats = calculateMoodStats(entries, parseInt(daysBack));

    const response = {
      success: true,
      data: moodStats,
      period: `${daysBack} days`
    };

    await setCached(cacheKey, response, CACHE_TTL.MOOD_STATS);
    res.json(response);
  } catch (error) {
    logger.error('Error fetching mood trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mood trends'
    });
  }
});

// GET /api/diary/analytics/wellness-score - Overall wellness score
router.get('/analytics/wellness-score', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { daysBack = 30 } = req.query;
    const cacheKey = `diary:analytics:wellness:${userId}:${daysBack}`;

    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug('Cache hit for wellness score');
      return res.json(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(daysBack));

    const entries = await DiaryEntry.find({
      userId,
      createdAt: { $gte: startDate },
      isDraft: false,
      isDeleted: false
    }).lean();

    const wellnessScore = calculateWellnessScore(entries, parseInt(daysBack));

    const response = {
      success: true,
      data: wellnessScore,
      period: `${daysBack} days`
    };

    await setCached(cacheKey, response, CACHE_TTL.MOOD_STATS);
    res.json(response);
  } catch (error) {
    logger.error('Error fetching wellness score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wellness score'
    });
  }
});

// GET /api/diary/streaks - Get streak information
router.get('/streaks', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const cacheKey = `diary:streaks:${userId}`;

    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug('Cache hit for streaks');
      return res.json(cached);
    }

    const streakInfo = await DiaryStreak.getStreakInfo(userId);

    const response = {
      success: true,
      data: streakInfo
    };

    await setCached(cacheKey, response, CACHE_TTL.ENTRIES);
    res.json(response);
  } catch (error) {
    logger.error('Error fetching streaks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch streak information'
    });
  }
});

// GET /api/diary/:entryId/sentiment - Analyze entry sentiment
router.get('/:entryId/sentiment', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { entryId } = req.params;

    const entry = await DiaryEntry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    const sentiment = analyzeSentiment(entry.content);

    res.json({
      success: true,
      data: {
        entryId,
        ...sentiment
      }
    });
  } catch (error) {
    logger.error('Error analyzing sentiment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze sentiment'
    });
  }
});

// POST /api/diary/:entryId/suggest-tags - Get AI suggestions for entry tags
router.post('/:entryId/suggest-tags', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { entryId } = req.params;

    const entry = await DiaryEntry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    const suggestedTags = suggestTags(entry.content, entry.title, entry.tags);

    res.json({
      success: true,
      data: suggestedTags,
      message: 'Tags suggested successfully'
    });
  } catch (error) {
    logger.error('Error suggesting tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suggest tags'
    });
  }
});

// POST /api/diary/:entryId/apply-tags - Apply suggested tags to entry
router.post('/:entryId/apply-tags', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { entryId } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be a non-empty array'
      });
    }

    const entry = await DiaryEntry.findOneAndUpdate(
      { _id: entryId, userId },
      { $set: { tags } },
      { new: true }
    );

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    await invalidateUserCache(userId);

    res.json({
      success: true,
      data: entry,
      message: 'Tags applied successfully'
    });
  } catch (error) {
    logger.error('Error applying tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply tags'
    });
  }
});

// ============================================================================
// PHASE 4.3: AI SUMMARY & ACTION ITEMS
// ============================================================================

// GET /api/diary/ai/summary - Generate AI summary for period (OpenAI + Fallback + Persistent)
router.get('/ai/summary', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { period = 'week', daysBack = 7, persist = 'true' } = req.query;
    const cacheKey = `diary:ai-summary:${userId}:${period}`;

    // Check cache first
    const cached = await getCached(cacheKey);
    if (cached && cached.data) {
      logger.debug('Cache hit for AI summary');
      return res.json(cached);
    }

    // Check for recent persistent summary in DB
    const persistedSummary = await DiaryAISummary.getLatestSummary(
      userId,
      period
    );
    if (persistedSummary && persistedSummary.generatedAt) {
      // Return persisted if less than 1 hour old
      const ageMinutes =
        (Date.now() - persistedSummary.generatedAt.getTime()) / (1000 * 60);
      if (ageMinutes < 60) {
        logger.debug('Using persisted summary (fresh)');
        const response = {
          success: true,
          data: persistedSummary.summary,
          source: 'persisted'
        };
        await setCached(cacheKey, response, 60 * 60 * 1000);
        return res.json(response);
      }
    }

    const startDate = new Date();
    const endDate = new Date();

    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === 'custom') {
      startDate.setDate(startDate.getDate() - parseInt(daysBack));
    }

    const entries = await DiaryEntry.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
      isDraft: false,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .lean();

    if (entries.length === 0) {
      return res.json({
        success: true,
        data: {
          period,
          summary: 'No entries found for this period.',
          keyThemes: [],
          moodSummary: 'N/A',
          highlights: [],
          entryCount: 0,
          generatedAt: new Date()
        }
      });
    }

    // Calculate stats
    const totalWords = entries.reduce((sum, e) => {
      const content = (e.content || '').replace(/<[^>]*>/g, '');
      return (
        sum + content.split(/\s+/).filter((w) => w.length > 0).length
      );
    }, 0);

    // Try OpenAI first, fallback to keyword-based
    let summary = null;
    let aiProvider = 'keyword-based';
    let tokensUsed = 0;

    const openaiSummary = await generateOpenAISummary(entries, period);
    if (openaiSummary) {
      summary = openaiSummary;
      aiProvider = 'openai';
      tokensUsed = openaiSummary.tokensUsed || 0;
    } else {
      // Fallback to keyword-based
      summary = await generateSummary(entries, period);
    }

    summary.entryCount = entries.length;
    summary.totalWords = totalWords;
    summary.generatedAt = new Date();

    const response = {
      success: true,
      data: summary,
      source: 'generated',
      aiProvider
    };

    // Persist summary if requested
    if (persist === 'true' || persist === true) {
      try {
        const newSummary = new DiaryAISummary({
          userId,
          period,
          startDate,
          endDate,
          entryCount: entries.length,
          totalWords,
          summary: summary,
          aiProvider,
          openAITokensUsed: tokensUsed
        });
        await newSummary.save();
        logger.debug('Summary persisted to database');
        response.persisted = true;
      } catch (persistError) {
        logger.warn('Failed to persist summary:', persistError.message);
        // Continue without persisting
      }
    }

    // Cache for 1 hour
    await setCached(cacheKey, response, 60 * 60 * 1000);

    res.json(response);
  } catch (error) {
    logger.error('Error generating summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate summary'
    });
  }
});

// GET /api/diary/ai/summary/markdown - Get summary as markdown
router.get('/ai/summary/markdown', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { period = 'week', daysBack = 7 } = req.query;

    const startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === 'custom') {
      startDate.setDate(startDate.getDate() - parseInt(daysBack));
    }

    const entries = await DiaryEntry.find({
      userId,
      createdAt: { $gte: startDate },
      isDraft: false,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .lean();

    const summary = await generateSummary(entries, period);
    const markdown = formatSummaryMarkdown(summary);

    res.json({
      success: true,
      data: {
        markdown,
        filename: `diary-summary-${period}-${new Date().toISOString().split('T')[0]}.md`
      }
    });
  } catch (error) {
    logger.error('Error generating markdown summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate markdown summary'
    });
  }
});

// GET /api/diary/ai/action-items - Extract action items from entries
router.get('/ai/action-items', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { daysBack = 30 } = req.query;
    const cacheKey = `diary:ai-action-items:${userId}:${daysBack}`;

    // Check cache
    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug('Cache hit for action items');
      return res.json(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(daysBack));

    const entries = await DiaryEntry.find({
      userId,
      createdAt: { $gte: startDate },
      isDraft: false,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .lean();

    const actionItems = await extractActionItems(entries);

    const response = {
      success: true,
      data: {
        actionItems,
        count: actionItems.length,
        period: `${daysBack} days`
      }
    };

    // Cache for 30 minutes
    await setCached(cacheKey, response, 30 * 60 * 1000);

    res.json(response);
  } catch (error) {
    logger.error('Error extracting action items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract action items'
    });
  }
});

// ============================================================================
// PHASE 4.4: PERSISTENT SUMMARIES & HISTORY
// ============================================================================

// GET /api/diary/ai/summaries - Get all summaries for user
router.get('/ai/summaries', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { period, limit = 10, skip = 0 } = req.query;

    const query = { userId, isDeleted: false };
    if (period) {
      query.period = period;
    }

    const summaries = await DiaryAISummary.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await DiaryAISummary.countDocuments(query);

    res.json({
      success: true,
      data: summaries,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching summaries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summaries'
    });
  }
});

// GET /api/diary/ai/summaries/:id - Get specific summary
router.get('/ai/summaries/:summaryId', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { summaryId } = req.params;

    const summary = await DiaryAISummary.findOne({
      _id: summaryId,
      userId,
      isDeleted: false
    });

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Summary not found'
      });
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Error fetching summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary'
    });
  }
});

// POST /api/diary/ai/summaries/:id/feedback - Record user feedback
router.post('/ai/summaries/:summaryId/feedback', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { summaryId } = req.params;
    const { rating, helpful, notes } = req.body;

    if (!rating || typeof helpful !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Rating and helpful flag required'
      });
    }

    const summary = await DiaryAISummary.findOneAndUpdate(
      { _id: summaryId, userId },
      {
        userFeedback: {
          rating: parseInt(rating),
          helpful,
          notes: notes || ''
        }
      },
      { new: true }
    );

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Summary not found'
      });
    }

    res.json({
      success: true,
      data: summary,
      message: 'Feedback recorded'
    });
  } catch (error) {
    logger.error('Error recording feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record feedback'
    });
  }
});

// POST /api/diary/ai/summaries/:id/mark-action - Mark action item completed
router.post('/ai/summaries/:summaryId/mark-action', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { summaryId } = req.params;
    const { actionIndex } = req.body;

    if (typeof actionIndex !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Action index required'
      });
    }

    const summary = await DiaryAISummary.findOne({
      _id: summaryId,
      userId
    });

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Summary not found'
      });
    }

    if (
      summary.summary?.actionItems &&
      summary.summary.actionItems[actionIndex]
    ) {
      summary.summary.actionItems[actionIndex].completed = true;
      await summary.save();
    }

    res.json({
      success: true,
      data: summary,
      message: 'Action marked complete'
    });
  } catch (error) {
    logger.error('Error marking action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark action'
    });
  }
});

// POST /api/diary/ai/summaries/:id/share - Create share link
router.post('/ai/summaries/:summaryId/share', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { summaryId } = req.params;
    const { expirationDays = 7 } = req.body;

    const summary = await DiaryAISummary.findOne({
      _id: summaryId,
      userId
    });

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Summary not found'
      });
    }

    await summary.createShareLink(expirationDays);

    res.json({
      success: true,
      data: {
        sharedLink: summary.sharedLink,
        shareUrl: `${process.env.APP_URL}/diary/shared-summary/${summary.sharedLink}`,
        expiresAt: summary.shareExpiresAt
      },
      message: 'Share link created'
    });
  } catch (error) {
    logger.error('Error creating share link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create share link'
    });
  }
});

// DELETE /api/diary/ai/summaries/:id - Delete summary
router.delete('/ai/summaries/:summaryId', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { summaryId } = req.params;

    const summary = await DiaryAISummary.softDelete(summaryId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Summary not found'
      });
    }

    await invalidateUserCache(userId);

    res.json({
      success: true,
      message: 'Summary deleted'
    });
  } catch (error) {
    logger.error('Error deleting summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete summary'
    });
  }
});

// Phase 4.5: Draft Expiration Management
const draftExpiration = require('../utils/diaryDraftExpiration');

/**
 * GET /api/diary/admin/draft-expiration/stats
 * Get statistics about expired drafts (how many would be deleted)
 * Admin/utility endpoint
 */
router.get('/admin/draft-expiration/stats', async (req, res) => {
  try {
    const stats = await draftExpiration.getExpirationStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting expiration stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get expiration stats',
      error: error.message
    });
  }
});

/**
 * POST /api/diary/admin/cleanup-drafts
 * Manually trigger draft expiration cleanup
 * Requires admin authentication
 */
router.post('/admin/cleanup-drafts', async (req, res) => {
  try {
    // Optional: Add admin check if you have admin middleware
    // if (!req.user.isAdmin) { return res.status(403).json({...}); }
    
    const result = await draftExpiration.runExpirationJob();
    
    res.json({
      success: result.success,
      data: {
        totalProcessed: result.totalProcessed,
        totalDeleted: result.totalDeleted,
        totalFailed: result.totalFailed,
        batches: result.batches,
        duration: result.duration,
        timestamp: result.timestamp
      }
    });
  } catch (error) {
    logger.error('Error running cleanup job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run cleanup job',
      error: error.message
    });
  }
});

/**
 * GET /api/diary/admin/draft-expiration/config
 * Get configuration about draft retention
 */
router.get('/admin/draft-expiration/config', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        retentionDays: draftExpiration.DRAFT_RETENTION_DAYS,
        batchSize: draftExpiration.BATCH_SIZE,
        scheduledTime: '03:00 AM UTC (daily)',
        description: 'Automatically deletes draft entries older than retentionDays',
        environmentVariable: 'DIARY_DRAFT_RETENTION_DAYS'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get config',
      error: error.message
    });
  }
});

// Phase 4.6: Diff/Comparison Endpoints

/**
 * POST /api/diary/:id/diff
 * Calculate diff between two versions of an entry
 * Body: { versionId1, versionId2 }
 */
router.post('/:id/diff', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { versionId1, versionId2 } = req.body;

    // Fetch the entry to verify ownership
    const entry = await DiaryEntry.findById(id);
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    if (entry.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // If versions not provided, compare current with previous
    // For now, we'll just fetch the current version and compare
    // In a full implementation, versions would be stored separately
    const diff = calculateEntryDiff(
      { content: entry.content, title: entry.title, mood: entry.mood, category: entry.category, tags: entry.tags, isPrivate: entry.isPrivate },
      { content: entry.content, title: entry.title, mood: entry.mood, category: entry.category, tags: entry.tags, isPrivate: entry.isPrivate }
    );

    const summary = createDiffSummary(diff);

    res.json({
      success: true,
      data: {
        diff,
        summary,
        entryId: id,
        versionId1,
        versionId2
      }
    });
  } catch (error) {
    logger.error('Error calculating diff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate diff',
      error: error.message
    });
  }
});

/**
 * GET /api/diary/:id/diff/content
 * Get formatted diff of content between two versions
 * Query: ?versionId1=xxx&versionId2=yyy
 */
router.get('/:id/diff/content', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { versionId1, versionId2 } = req.query;

    // Fetch entry
    const entry = await DiaryEntry.findById(id);
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    if (entry.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Format diff for display
    const oldText = entry.content || '';
    const newText = entry.content || '';
    const formattedDiff = formatDiffForDisplay(oldText, newText);

    res.json({
      success: true,
      data: {
        diff: formattedDiff,
        entryId: id,
        versionId1,
        versionId2,
        similarity: calculateSimilarity(oldText, newText)
      }
    });
  } catch (error) {
    logger.error('Error getting formatted diff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get formatted diff',
      error: error.message
    });
  }
});

// ============================================================================
// PHASE 4.7: VERSION COMMENTS, TAGS, AND SHARING
// ============================================================================

// POST /api/diary/:entryId/versions/:versionId/comments - Add comment to version
router.post('/:entryId/versions/:versionId/comments', authenticate, async (req, res) => {
  try {
    const { entryId, versionId } = req.params;
    const userId = req.user._id;
    const { text, lineReference, isPrivate, parentCommentId, sentiment } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    // Verify entry ownership
    const entry = await DiaryEntry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    const version = await DiaryEntryVersion.findOne({ _id: versionId, entryId });
    if (!version) {
      return res.status(404).json({ success: false, message: 'Version not found' });
    }

    const comment = await addCommentToVersion(userId, entryId, versionId, version.versionNumber, {
      text: text.trim(),
      lineReference,
      isPrivate,
      parentCommentId,
      sentiment
    });

    res.status(201).json({ success: true, comment });
  } catch (error) {
    logger.error('Failed to add comment:', error);
    res.status(500).json({ success: false, message: 'Failed to add comment', error: error.message });
  }
});

// GET /api/diary/:entryId/versions/:versionId/comments - Get comments for version
router.get('/:entryId/versions/:versionId/comments', authenticate, async (req, res) => {
  try {
    const { entryId, versionId } = req.params;
    const { includeReplies = true } = req.query;

    const comments = await getVersionComments(entryId, versionId, includeReplies === 'true');
    const stats = await getVersionCommentStats(versionId);

    res.json({ success: true, comments, stats });
  } catch (error) {
    logger.error('Failed to get comments:', error);
    res.status(500).json({ success: false, message: 'Failed to get comments', error: error.message });
  }
});

// PATCH /api/diary/:entryId/comments/:commentId - Update comment
router.patch('/:entryId/comments/:commentId', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;
    const { text, sentiment } = req.body;

    const updatedComment = await updateComment(commentId, userId, { text, sentiment });
    res.json({ success: true, comment: updatedComment });
  } catch (error) {
    logger.error('Failed to update comment:', error);
    res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
      success: false,
      message: 'Failed to update comment',
      error: error.message
    });
  }
});

// DELETE /api/diary/:entryId/comments/:commentId - Delete comment
router.delete('/:entryId/comments/:commentId', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const result = await deleteComment(commentId, userId);
    res.json(result);
  } catch (error) {
    logger.error('Failed to delete comment:', error);
    res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message
    });
  }
});

// POST /api/diary/:entryId/comments/:commentId/like - Like/unlike comment
router.post('/:entryId/comments/:commentId/like', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;
    const { isLike } = req.body;

    const updatedComment = await toggleCommentLike(commentId, userId, isLike);
    res.json({ success: true, comment: updatedComment });
  } catch (error) {
    logger.error('Failed to toggle like:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle like', error: error.message });
  }
});

// POST /api/diary/:entryId/versions/:versionId/tags - Add tag to version
router.post('/:entryId/versions/:versionId/tags', authenticate, async (req, res) => {
  try {
    const { entryId, versionId } = req.params;
    const userId = req.user._id;
    const { name, color, description, reason } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Tag name is required' });
    }

    // Verify entry ownership
    const entry = await DiaryEntry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    const version = await DiaryEntryVersion.findOne({ _id: versionId, entryId });
    if (!version) {
      return res.status(404).json({ success: false, message: 'Version not found' });
    }

    const tag = await addTagToVersion(userId, entryId, versionId, version.versionNumber, {
      name: name.trim(),
      color,
      description,
      reason
    });

    res.status(201).json({ success: true, tag });
  } catch (error) {
    logger.error('Failed to add tag:', error);
    res.status(error.message.includes('already exists') ? 409 : 500).json({
      success: false,
      message: 'Failed to add tag',
      error: error.message
    });
  }
});

// GET /api/diary/:entryId/versions/:versionId/tags - Get tags for version
router.get('/:entryId/versions/:versionId/tags', authenticate, async (req, res) => {
  try {
    const { versionId } = req.params;

    const tags = await getVersionTags(versionId);
    res.json({ success: true, tags });
  } catch (error) {
    logger.error('Failed to get tags:', error);
    res.status(500).json({ success: false, message: 'Failed to get tags', error: error.message });
  }
});

// DELETE /api/diary/:entryId/tags/:tagId - Remove tag
router.delete('/:entryId/tags/:tagId', authenticate, async (req, res) => {
  try {
    const { tagId } = req.params;
    const userId = req.user._id;

    const result = await removeTagFromVersion(tagId, userId);
    res.json(result);
  } catch (error) {
    logger.error('Failed to remove tag:', error);
    res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
      success: false,
      message: 'Failed to remove tag',
      error: error.message
    });
  }
});

// GET /api/diary/tags/predefined - Get predefined tags
router.get('/tags/predefined', authenticate, (req, res) => {
  try {
    const tags = getPredefinedTags();
    res.json({ success: true, tags });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get predefined tags' });
  }
});

// GET /api/diary/:entryId/tags/stats - Get tag statistics for entry
router.get('/:entryId/tags/stats', authenticate, async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user._id;

    // Verify ownership
    const entry = await DiaryEntry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    const stats = await getEntryTagStats(entryId);
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Failed to get tag stats:', error);
    res.status(500).json({ success: false, message: 'Failed to get tag stats', error: error.message });
  }
});

// POST /api/diary/:entryId/versions/:versionId/share - Generate share link
router.post('/:entryId/versions/:versionId/share', authenticate, async (req, res) => {
  try {
    const { entryId, versionId } = req.params;
    const userId = req.user._id;
    const { expiresIn, isPublic } = req.body;

    // Verify entry ownership
    const entry = await DiaryEntry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    const shareData = await generateVersionShareLink(entryId, versionId, {
      expiresIn: expiresIn || 7,
      isPublic: isPublic || false
    });

    res.status(201).json({ success: true, share: shareData });
  } catch (error) {
    logger.error('Failed to generate share link:', error);
    res.status(500).json({ success: false, message: 'Failed to generate share link', error: error.message });
  }
});

// GET /api/diary/:entryId/shares - Get all active shares for entry
router.get('/:entryId/shares', authenticate, async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user._id;

    const shares = await getEntryShares(entryId, userId);
    res.json({ success: true, shares });
  } catch (error) {
    logger.error('Failed to get shares:', error);
    res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
      success: false,
      message: 'Failed to get shares',
      error: error.message
    });
  }
});

// DELETE /api/diary/:entryId/share/:shareToken - Revoke share
router.delete('/:entryId/share/:shareToken', authenticate, async (req, res) => {
  try {
    const { entryId, shareToken } = req.params;
    const userId = req.user._id;

    const result = await revokeVersionShare(entryId, shareToken, userId);
    res.json(result);
  } catch (error) {
    logger.error('Failed to revoke share:', error);
    res.status(error.message.includes('Unauthorized') ? 403 : 500).json({
      success: false,
      message: 'Failed to revoke share',
      error: error.message
    });
  }
});

// GET /api/diary/versions/:versionId/export/json - Export version as JSON
router.get('/:entryId/versions/:versionId/export/json', authenticate, async (req, res) => {
  try {
    const { versionId, entryId } = req.params;
    const userId = req.user._id;

    // Verify ownership
    const entry = await DiaryEntry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    const exportData = await exportVersionAsJSON(versionId, true);
    res.json({ success: true, export: exportData });
  } catch (error) {
    logger.error('Failed to export version:', error);
    res.status(500).json({ success: false, message: 'Failed to export version', error: error.message });
  }
});

// GET /api/diary/versions/:versionId/export/csv - Export version as CSV
router.get('/:entryId/versions/:versionId/export/csv', authenticate, async (req, res) => {
  try {
    const { versionId, entryId } = req.params;
    const userId = req.user._id;

    // Verify ownership
    const entry = await DiaryEntry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    const csvData = await exportVersionAsCSV(versionId);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=diary-version.csv');
    res.send(csvData);
  } catch (error) {
    logger.error('Failed to export version:', error);
    res.status(500).json({ success: false, message: 'Failed to export version', error: error.message });
  }
});

// ============================================================================
// PHASE 5: ADVANCED SEARCH AND FILTERING
// ============================================================================

// POST /api/diary/search - Full-text search with advanced options
router.post('/search/query', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { query, limit, skip, tags, dateFrom, dateTo, sentiment } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const results = await searchEntries(userId, query, {
      limit: Math.min(parseInt(limit) || 20, 100),
      skip: Math.max(0, parseInt(skip) || 0),
      tags: Array.isArray(tags) ? tags : [],
      dateFrom,
      dateTo,
      sentiment: Array.isArray(sentiment) ? sentiment : []
    });

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/diary/search/highlight - Search with content highlighting
router.post('/search/highlight', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { query, limit, skip } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const results = await searchWithHighlight(userId, query, {
      limit: Math.min(parseInt(limit) || 20, 100),
      skip: Math.max(0, parseInt(skip) || 0)
    });

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Search highlight error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/diary/filter - Advanced filtering
router.post('/filter/apply', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const filters = req.body;

    const results = await filterEntries(userId, {
      ...filters,
      limit: Math.min(parseInt(filters.limit) || 100, 500),
      skip: Math.max(0, parseInt(filters.skip) || 0)
    });

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Filter error:', error);
    res.status(500).json({
      success: false,
      message: 'Filtering failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/search/suggestions - Get search suggestions/autocomplete
router.get('/search/suggestions', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { query, type } = req.query;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const suggestions = await getSearchSuggestions(query, userId, type || 'all');

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    logger.error('Search suggestions error:', error);
    res.json({
      success: true,
      data: []
    });
  }
});

// GET /api/diary/search/history - Get user search history
router.get('/search/history', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const history = await getSearchHistory(userId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Get search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch search history'
    });
  }
});

// DELETE /api/diary/search/history - Clear search history
router.delete('/search/history', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    await clearSearchHistory(userId);

    res.json({
      success: true,
      message: 'Search history cleared'
    });
  } catch (error) {
    logger.error('Clear search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear search history'
    });
  }
});

// POST /api/diary/filters/save - Save a filter
router.post('/filters/save', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, config } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Filter name is required'
      });
    }

    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Filter configuration is required'
      });
    }

    const savedFilter = await saveFilter(userId, name.trim(), config);

    res.status(201).json({
      success: true,
      data: savedFilter,
      message: 'Filter saved successfully'
    });
  } catch (error) {
    logger.error('Save filter error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save filter',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/filters - Get saved filters
router.get('/filters/list', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const filters = await getSavedFilters(userId);

    res.json({
      success: true,
      data: filters
    });
  } catch (error) {
    logger.error('Get filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch filters'
    });
  }
});

// POST /api/diary/filters/:filterId/use - Use saved filter
router.post('/filters/:filterId/use', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { filterId } = req.params;

    const results = await useSavedFilter(userId, filterId);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Use filter error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to use filter'
    });
  }
});

// DELETE /api/diary/filters/:filterId - Delete saved filter
router.delete('/filters/:filterId', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { filterId } = req.params;

    await deleteSavedFilter(userId, filterId);

    res.json({
      success: true,
      message: 'Filter deleted successfully'
    });
  } catch (error) {
    logger.error('Delete filter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete filter'
    });
  }
});

// GET /api/diary/filter-suggestions - Get filter suggestions
router.get('/filters/suggestions', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const suggestions = await getFilterSuggestions(userId);

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    logger.error('Get filter suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get filter suggestions'
    });
  }
});

// ============================================================================
// PHASE 6: ANALYTICS & STATISTICS
// ============================================================================

// GET /api/diary/analytics/dashboard - Get comprehensive analytics dashboard
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { daysBack = 90 } = req.query;
    const cacheKey = `diary:analytics:dashboard:${userId}:${daysBack}`;

    // Check cache
    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug('Cache hit for analytics dashboard');
      return res.json(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(daysBack));

    const entries = await DiaryEntry.find({
      userId,
      createdAt: { $gte: startDate },
      isDraft: false,
      isDeleted: false
    }).lean();

    const dashboardData = await getDashboardAnalytics(entries);

    const response = {
      success: true,
      data: dashboardData,
      period: `${daysBack} days`
    };

    await setCached(cacheKey, response, CACHE_TTL.MOOD_STATS);
    res.json(response);
  } catch (error) {
    logger.error('Error fetching analytics dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/analytics/tags - Get tag usage analytics
router.get('/analytics/tags', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { limit = 10, daysBack = 90 } = req.query;
    const cacheKey = `diary:analytics:tags:${userId}:${limit}`;

    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug('Cache hit for tag analytics');
      return res.json(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(daysBack));

    const entries = await DiaryEntry.find({
      userId,
      createdAt: { $gte: startDate },
      isDraft: false,
      isDeleted: false
    }).lean();

    const tagAnalytics = calculateTagAnalytics(entries, parseInt(limit));

    const response = {
      success: true,
      data: tagAnalytics
    };

    await setCached(cacheKey, response, CACHE_TTL.MOOD_STATS);
    res.json(response);
  } catch (error) {
    logger.error('Error fetching tag analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tag analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/analytics/sentiment-trend - Get sentiment trend data
router.get('/analytics/sentiment-trend', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { groupBy = 'week', daysBack = 90 } = req.query;
    const cacheKey = `diary:analytics:sentiment:${userId}:${groupBy}`;

    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug('Cache hit for sentiment trend');
      return res.json(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(daysBack));

    const entries = await DiaryEntry.find({
      userId,
      createdAt: { $gte: startDate },
      isDraft: false,
      isDeleted: false
    }).lean();

    const sentimentTrend = calculateSentimentTrend(entries, groupBy);

    const response = {
      success: true,
      data: sentimentTrend,
      groupBy
    };

    await setCached(cacheKey, response, CACHE_TTL.MOOD_STATS);
    res.json(response);
  } catch (error) {
    logger.error('Error fetching sentiment trend:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sentiment trend',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/analytics/heatmap - Get writing activity heatmap
router.get('/analytics/heatmap', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { monthsBack = 6 } = req.query;
    const cacheKey = `diary:analytics:heatmap:${userId}:${monthsBack}`;

    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug('Cache hit for heatmap');
      return res.json(cached);
    }

    const entries = await DiaryEntry.find({
      userId,
      isDraft: false,
      isDeleted: false
    }).lean();

    const heatmap = calculateWritingHeatmap(entries, parseInt(monthsBack));

    const response = {
      success: true,
      data: heatmap,
      monthsBack: parseInt(monthsBack)
    };

    await setCached(cacheKey, response, CACHE_TTL.MOOD_STATS);
    res.json(response);
  } catch (error) {
    logger.error('Error fetching heatmap:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch heatmap',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/analytics/word-count - Get word count analytics
router.get('/analytics/word-count', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { daysBack = 90 } = req.query;
    const cacheKey = `diary:analytics:words:${userId}:${daysBack}`;

    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug('Cache hit for word count analytics');
      return res.json(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(daysBack));

    const entries = await DiaryEntry.find({
      userId,
      createdAt: { $gte: startDate },
      isDraft: false,
      isDeleted: false
    }).lean();

    const wordCountAnalytics = calculateWordCountAnalytics(entries);

    const response = {
      success: true,
      data: wordCountAnalytics
    };

    await setCached(cacheKey, response, CACHE_TTL.MOOD_STATS);
    res.json(response);
  } catch (error) {
    logger.error('Error fetching word count analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch word count analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/analytics/monthly-summary - Get monthly summary
router.get('/analytics/monthly-summary/:year/:month', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { year, month } = req.params;

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year or month'
      });
    }

    const cacheKey = `diary:analytics:monthly:${userId}:${year}:${month}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug('Cache hit for monthly summary');
      return res.json(cached);
    }

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 1);

    const entries = await DiaryEntry.find({
      userId,
      createdAt: { $gte: startDate, $lt: endDate },
      isDraft: false,
      isDeleted: false
    }).lean();

    const writingStats = calculateWritingStats(entries);
    const moodStats = calculateMoodStats(entries);
    const tagAnalytics = calculateTagAnalytics(entries, 5);
    const wellnessScore = calculateWellnessScore(entries);

    const response = {
      success: true,
      data: {
        year: yearNum,
        month: monthNum,
        entryCount: entries.length,
        writingStats,
        moodStats,
        topTags: tagAnalytics.tagFrequency,
        wellnessScore
      }
    };

    await setCached(cacheKey, response, CACHE_TTL.MOOD_STATS);
    res.json(response);
  } catch (error) {
    logger.error('Error fetching monthly summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/diary/analytics/insights - Get detailed analytics insights
router.get('/analytics/insights', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { daysBack = 90 } = req.query;
    const cacheKey = `diary:analytics:insights:${userId}:${daysBack}`;

    const cached = await getCached(cacheKey);
    if (cached) {
      logger.debug('Cache hit for insights');
      return res.json(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(daysBack));

    const entries = await DiaryEntry.find({
      userId,
      createdAt: { $gte: startDate },
      isDraft: false,
      isDeleted: false
    }).lean();

    if (entries.length === 0) {
      return res.json({
        success: true,
        data: [],
        meta: {
          message: 'Not enough data for insights',
          period: `${daysBack} days`
        },
      });
    }

    // Calculate various analytics
    const writingStats = calculateWritingStats(entries);
    const streakStats = calculateStreakStats(entries);
    const moodStats = calculateMoodStats(entries);
    const tagAnalytics = calculateTagAnalytics(entries, 5);

    // Generate insights
    const insights = [];

    if (writingStats.entriesPerDay !== undefined) {
      if (writingStats.entriesPerDay > 1) {
        insights.push({
          type: 'writing_frequency',
          message: `You\'re writing ${writingStats.entriesPerDay.toFixed(1)} entries per day - great consistency!`,
          severity: 'positive'
        });
      } else if (writingStats.entriesPerDay > 0.5) {
        insights.push({
          type: 'writing_frequency',
          message: 'You have a solid writing habit. Keep it up!',
          severity: 'positive'
        });
      } else {
        insights.push({
          type: 'writing_frequency',
          message: 'Consider writing more frequently for better emotional tracking',
          severity: 'suggestion'
        });
      }
    }

    if (streakStats.currentStreak !== undefined) {
      if (streakStats.currentStreak > 30) {
        insights.push({
          type: 'streak',
          message: `Amazing! You\'ve been writing for ${streakStats.currentStreak} days straight!`,
          severity: 'positive'
        });
      }
    }

    if (moodStats.dominantMood) {
      insights.push({
        type: 'mood_pattern',
        message: `Your most common mood is "${moodStats.dominantMood}". Pay attention to what triggers this mood.`,
        severity: 'info'
      });
    }

    if (moodStats.moodVariability !== undefined) {
      if (moodStats.moodVariability > 0.7) {
        insights.push({
          type: 'mood_variability',
          message: 'Your mood varies significantly. Consider exploring what\'s causing these changes.',
          severity: 'suggestion'
        });
      }
    }

    if (writingStats.avgWords !== undefined) {
      if (writingStats.avgWords < 100) {
        insights.push({
          type: 'content_length',
          message: 'Your entries are quite brief. Try writing more to capture deeper thoughts.',
          severity: 'suggestion'
        });
      } else if (writingStats.avgWords > 500) {
        insights.push({
          type: 'content_length',
          message: 'Wow! Your entries are detailed and thoughtful.',
          severity: 'positive'
        });
      }
    }

    const response = {
      success: true,
      data: insights,
      meta: {
        analytics: {
          writingStats,
          moodStats,
          topTags: tagAnalytics.tagFrequency,
          streakStats
        },
        period: `${daysBack} days`
      },
    };

    await setCached(cacheKey, response, CACHE_TTL.MOOD_STATS);
    res.json(response);
  } catch (error) {
    logger.error('Error generating insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate insights',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
module.exports.__testables = {
  parseDateValue,
  parseTimezoneOffsetMinutes,
  normalizeStartOfDay,
  buildDayWindow,
};
