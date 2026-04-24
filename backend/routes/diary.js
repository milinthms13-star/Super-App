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
    const { category, mood, search, limit = 20, skip = 0, sortBy = '-createdAt' } = req.query;
    const userId = req.user._id || req.user.id;

    const query = { userId, isDraft: false };

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
    const payload = parseCalendarItemPayload(req.body);
    const validationError = validateCalendarItemPayload(payload);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const item = await DiaryCalendarItem.create({
      userId,
      ...payload,
    });

    res.status(201).json({
      success: true,
      data: item,
      message:
        payload.type === 'reminder'
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
    const payload = parseCalendarItemPayload(req.body);
    const validationError = validateCalendarItemPayload(payload);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
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

    item.date = payload.date;
    item.type = payload.type;
    item.title = payload.title;
    item.note = payload.note;
    item.reminderAt = payload.reminderAt;
    item.isCompleted = payload.isCompleted;
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
router.get('/:id', async (req, res) => {
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
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and audio allowed'), false);
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

const normalizeStartOfDay = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
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
    const {
      title,
      content,
      mood,
      category = 'Personal',
      tags,
      isDraft,
      entryDate
    } = req.body;

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

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const validMoods = ['very_sad', 'sad', 'neutral', 'happy', 'very_happy'];
    const validCategories = ['Personal', 'Work', 'Travel', 'Health', 'Relationships', 'Other'];
    const normalizedMood = validMoods.includes(mood) ? mood : analyzeMood(content);

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    const parsedIsDraft = parseBooleanField(isDraft, false);

    const entry = new DiaryEntry({
      userId: req.user._id || req.user.id,
      title: title.trim(),
      content: content.trim(),
      mood: normalizedMood,
      category,
      tags: parseTagsField(tags),
      isDraft: parsedIsDraft,
      attachments,
      entryDate: entryDate ? new Date(entryDate) : new Date()
    });

    await entry.save();

    logger.info(`Diary entry created: ${entry.title} for user ${req.user._id || req.user.id}`);

    res.status(201).json({
      success: true,
      data: entry,
      message: parsedIsDraft ? 'Draft saved successfully' : 'Entry created successfully'
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
    const { title, content, mood, category, tags, isDraft, entryDate } = req.body;

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

    if (title) entry.title = title.trim();
    if (content) entry.content = content.trim();
    if (mood) {
      const validMoods = ['very_sad', 'sad', 'neutral', 'happy', 'very_happy'];
      entry.mood = validMoods.includes(mood) ? mood : analyzeMood(content || entry.content || '');
    }
    if (category) entry.category = category;
    if (tags !== undefined) {
      entry.tags = parseTagsField(tags);
    }
    if (isDraft !== undefined) entry.isDraft = parseBooleanField(isDraft, entry.isDraft);
    if (entryDate) entry.entryDate = new Date(entryDate);
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
    const date = new Date(req.params.date);
    const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

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

// GET /api/diary/todays-items - Get today's notes and reminders
router.get('/today/summary', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const items = await DiaryCalendarItem.find({
      userId,
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    })
      .select('_id type title note reminderAt isCompleted isNotified date')
      .sort({ reminderAt: 1, createdAt: 1 })
      .lean();

    const notes = items.filter((i) => i.type === 'note');
    const reminders = items.filter((i) => i.type === 'reminder');
    const pendingReminders = reminders.filter((i) => !i.isCompleted);

    res.json({
      success: true,
      data: {
        notes,
        reminders,
        pendingReminders,
        summary: {
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
    const { daysAhead = 7 } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + parseInt(daysAhead));

    const reminders = await DiaryCalendarItem.find({
      userId,
      type: 'reminder',
      isCompleted: false,
      reminderAt: {
        $gte: today,
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

module.exports = router;
