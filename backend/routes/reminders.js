const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Reminder = require('../models/Reminder');
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

// Create rate limiter for reminders
const reminderRateLimiter = createModerateRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

// Apply authentication to all routes
router.use(authenticate);

// Apply rate limiting
router.use(reminderRateLimiter);

// GET /api/reminders - Get all reminders for the authenticated user
router.get('/', async (req, res) => {
  try {
    const { category, completed, limit = 50, skip = 0 } = req.query;

    const query = { userId: req.user._id || req.user.id };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (completed !== undefined) {
      query.completed = completed === 'true';
    }

    const reminders = await Reminder.find(query)
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Reminder.countDocuments(query);

    res.json({
      success: true,
      data: reminders,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reminders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/reminders - Create a new reminder
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      category = 'Work',
      priority = 'Medium',
      dueDate,
      dueTime,
      reminders = ['In-app'],
      recurring = 'none'
    } = req.body;

    // Validate required fields
    if (!title || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Title and due date are required'
      });
    }

    // Validate category and priority
    const validCategories = ['Work', 'Personal', 'Urgent'];
    const validPriorities = ['Low', 'Medium', 'High'];
    const validReminders = ['In-app', 'SMS', 'Call'];
    const validRecurring = ['none', 'daily', 'weekly', 'monthly'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority'
      });
    }

    if (!reminders.every(r => validReminders.includes(r))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reminder types'
      });
    }

    if (!validRecurring.includes(recurring)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recurring option'
      });
    }

    const reminder = new Reminder({
      userId: req.user._id || req.user.id,
      title: title.trim(),
      description: description?.trim(),
      category,
      priority,
      dueDate: new Date(dueDate),
      dueTime,
      reminders,
      recurring,
      status: reminders.length > 1 ? 'Escalation armed' : 'Reminder scheduled'
    });

    await reminder.save();

    logger.info(`Reminder created: ${reminder.title} for user ${req.user.id}`);

    res.status(201).json({
      success: true,
      data: reminder,
      message: 'Reminder created successfully'
    });
  } catch (error) {
    logger.error('Error creating reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/reminders/:id - Update a reminder
router.put('/:id', async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: req.user._id || req.user.id
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    const {
      title,
      description,
      category,
      priority,
      dueDate,
      dueTime,
      reminders,
      recurring,
      completed
    } = req.body;

    // Update fields if provided
    if (title !== undefined) reminder.title = title.trim();
    if (description !== undefined) reminder.description = description?.trim();
    if (category !== undefined) reminder.category = category;
    if (priority !== undefined) reminder.priority = priority;
    if (dueDate !== undefined) reminder.dueDate = new Date(dueDate);
    if (dueTime !== undefined) reminder.dueTime = dueTime;
    if (reminders !== undefined) reminder.reminders = reminders;
    if (recurring !== undefined) reminder.recurring = recurring;

    // Handle completion
    if (completed !== undefined && completed !== reminder.completed) {
      reminder.completed = completed;
      if (completed) {
        reminder.completedAt = new Date();
        reminder.status = 'Completed';
      } else {
        reminder.completedAt = undefined;
        reminder.status = reminder.reminders.length > 1 ? 'Escalation armed' : 'Reminder scheduled';
      }
    }

    // Update status based on reminders
    if (!reminder.completed && reminders) {
      reminder.status = reminders.length > 1 ? 'Escalation armed' : 'Reminder scheduled';
    }

    await reminder.save();

    logger.info(`Reminder updated: ${reminder.title} for user ${req.user.id}`);

    res.json({
      success: true,
      data: reminder,
      message: 'Reminder updated successfully'
    });
  } catch (error) {
    logger.error('Error updating reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/reminders/:id - Delete a reminder
router.delete('/:id', async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id || req.user.id
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    logger.info(`Reminder deleted: ${reminder.title} for user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Reminder deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/reminders/stats - Get reminder statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const stats = await Reminder.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: ['$completed', 1, 0] } },
          pending: { $sum: { $cond: ['$completed', 0, 1] } },
          urgent: { $sum: { $cond: [{ $and: [{ $eq: ['$category', 'Urgent'] }, { $eq: ['$completed', false] }] }, 1, 0] } },
          dueToday: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$completed', false] },
                    { $gte: ['$dueDate', new Date(new Date().setHours(0, 0, 0, 0))] },
                    { $lt: ['$dueDate', new Date(new Date().setHours(23, 59, 59, 999))] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      completed: 0,
      pending: 0,
      urgent: 0,
      dueToday: 0
    };

    result.completionRate = result.total > 0 ? Math.round((result.completed / result.total) * 100) : 0;

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error fetching reminder stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reminder statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;