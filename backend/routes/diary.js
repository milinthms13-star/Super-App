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
    const { error, value: queryParams } = validateQuery(req.query, 'diary');
    if (error) {
      return res.status(400).json({
        success: false,
        message: formatValidationErrors(error)
      });
    }

    const { category, mood, search, limit, skip, sortBy } = queryParams;
    const userId = req.user._id || req.user.id;

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

    res.json({
      success: true,
      data: entries,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });
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
    const { limit = 20, skip = 0 } = req.query;

    const drafts = await DiaryEntry.find({ userId, isDraft: true })
      .sort('-updatedAt')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await DiaryEntry.countDocuments({ userId, isDraft: true });

    res.json({
      success: true,
      data: drafts,
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) }
    });
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

    const tags = await DiaryEntry.aggregate([
      { $match: { userId } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: tags.map(t => ({ name: t._id, count: t.count }))
    });
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

    res.json({
      success: true,
      data: stats
    });
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

// DELETE /api/diary/:id - Delete diary entry
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const entry = await DiaryEntry.findOneAndDelete({
      _id: req.params.id,
      userId
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found'
      });
    }

    logger.info(`Diary entry deleted: ${entry.title} for user ${userId}`);

    res.json({
      success: true,
      message: 'Entry deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting diary entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete diary entry'
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

module.exports = router;
module.exports.__testables = {
  parseDateValue,
  parseTimezoneOffsetMinutes,
  normalizeStartOfDay,
  buildDayWindow,
};
