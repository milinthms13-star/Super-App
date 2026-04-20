const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const DiaryEntry = require('../models/DiaryEntry');
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

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

// POST /api/diary - Create new diary entry
router.post('/', async (req, res) => {
  try {
    const {
      title,
      content,
      mood = 'neutral',
      category = 'Personal',
      tags = [],
      isDraft = false,
      entryDate
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const validMoods = ['very_sad', 'sad', 'neutral', 'happy', 'very_happy'];
    const validCategories = ['Personal', 'Work', 'Travel', 'Health', 'Relationships', 'Other'];

    if (!validMoods.includes(mood)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mood'
      });
    }

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    const entry = new DiaryEntry({
      userId: req.user._id || req.user.id,
      title: title.trim(),
      content: content.trim(),
      mood,
      category,
      tags: Array.isArray(tags) ? tags.map(t => String(t).toLowerCase().trim()).filter(Boolean) : [],
      isDraft,
      entryDate: entryDate ? new Date(entryDate) : new Date()
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
router.put('/:id', async (req, res) => {
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

    if (title) entry.title = title.trim();
    if (content) entry.content = content.trim();
    if (mood) entry.mood = mood;
    if (category) entry.category = category;
    if (Array.isArray(tags)) {
      entry.tags = tags.map(t => String(t).toLowerCase().trim()).filter(Boolean);
    }
    if (isDraft !== undefined) entry.isDraft = isDraft;
    if (entryDate) entry.entryDate = new Date(entryDate);

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

module.exports = router;
