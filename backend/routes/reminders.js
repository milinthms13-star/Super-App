const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Reminder = require('../models/Reminder');
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const voiceCallService = require('../services/voiceCallService');
const voiceCallScheduler = require('../services/voiceCallScheduler');

const VALID_CATEGORIES = ['Work', 'Personal', 'Urgent'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_REMINDERS = ['In-app', 'SMS', 'Call'];
const VALID_RECURRING = ['none', 'daily', 'weekly', 'monthly'];

const getReminderOwnerId = (user = {}) => String(user?._id || user?.id || '');

const parseReminderDueDate = (value) => {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const validateReminderFields = ({ title, category, priority, reminders, recurring, dueDate }, { partial = false } = {}) => {
  if (!partial || title !== undefined) {
    if (!String(title || '').trim()) {
      return 'Title is required';
    }
  }

  if (!partial || dueDate !== undefined) {
    if (!dueDate) {
      return 'Due date is required';
    }
    if (!parseReminderDueDate(dueDate)) {
      return 'Invalid due date';
    }
  }

  if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
    return 'Invalid category';
  }

  if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
    return 'Invalid priority';
  }

  if (reminders !== undefined) {
    if (!Array.isArray(reminders) || !reminders.length) {
      return 'Select at least one reminder type';
    }

    if (!reminders.every((reminder) => VALID_REMINDERS.includes(reminder))) {
      return 'Invalid reminder types';
    }
  }

  if (recurring !== undefined && !VALID_RECURRING.includes(recurring)) {
    return 'Invalid recurring option';
  }

  return '';
};

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
    const ownerId = getReminderOwnerId(req.user);
    const query = { userId: ownerId };

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

    const validationMessage = validateReminderFields({
      title,
      category,
      priority,
      reminders,
      recurring,
      dueDate,
    });

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage
      });
    }
    const ownerId = getReminderOwnerId(req.user);

    const reminder = new Reminder({
      userId: ownerId,
      title: title.trim(),
      description: description?.trim(),
      category,
      priority,
      dueDate: parseReminderDueDate(dueDate),
      dueTime,
      reminders,
      recurring,
      status: reminders.length > 1 ? 'Escalation armed' : 'Reminder scheduled'
    });

    await reminder.save();

    logger.info(`Reminder created: ${reminder.title} for user ${ownerId}`);

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
    const ownerId = getReminderOwnerId(req.user);
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: ownerId
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

    const validationMessage = validateReminderFields(
      {
        title,
        category,
        priority,
        reminders,
        recurring,
        dueDate,
      },
      { partial: true }
    );

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage
      });
    }

    // Update fields if provided
    if (title !== undefined) reminder.title = title.trim();
    if (description !== undefined) reminder.description = description?.trim();
    if (category !== undefined) reminder.category = category;
    if (priority !== undefined) reminder.priority = priority;
    if (dueDate !== undefined) reminder.dueDate = parseReminderDueDate(dueDate);
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

    logger.info(`Reminder updated: ${reminder.title} for user ${ownerId}`);

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
    const ownerId = getReminderOwnerId(req.user);
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      userId: ownerId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    logger.info(`Reminder deleted: ${reminder.title} for user ${ownerId}`);

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
    const userId = getReminderOwnerId(req.user);

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

// ============ VOICE CALL REMINDER ENDPOINTS ============

// POST /api/reminders/voice-call - Create a reminder with voice call
router.post('/voice-call', async (req, res) => {
  try {
    const {
      title,
      description,
      category = 'Work',
      priority = 'Medium',
      dueDate,
      dueTime,
      reminders = ['Call'],
      recurring = 'none',
      recipientId,
      recipientPhoneNumber,
      voiceMessage,
      messageType = 'text',
      maxCallAttempts = 3
    } = req.body;

    const ownerId = getReminderOwnerId(req.user);

    // Validate voice call specific fields
    if (!recipientPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Recipient phone number is required for voice call reminders'
      });
    }

    if (!voiceMessage || voiceMessage.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Voice message is required'
      });
    }

    // Validate phone number format
    if (!voiceCallService._isValidPhoneNumber(recipientPhoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Validate general reminder fields
    const validationMessage = validateReminderFields({
      title,
      category,
      priority,
      reminders,
      recurring,
      dueDate
    });

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage
      });
    }

    // Create reminder with voice call fields
    const reminder = new Reminder({
      userId: ownerId,
      title: title.trim(),
      description: description?.trim(),
      category,
      priority,
      dueDate: parseReminderDueDate(dueDate),
      dueTime,
      reminders,
      recurring,
      status: 'Reminder scheduled',
      // Voice call fields
      recipientId,
      recipientPhoneNumber: voiceCallService.formatPhoneNumber(recipientPhoneNumber),
      voiceMessage: voiceMessage.trim(),
      messageType,
      callStatus: 'pending',
      maxCallAttempts,
      senderName: req.user.name || 'Reminder Service'
    });

    // Set next call time
    if (recurring !== 'none') {
      reminder.nextCallTime = reminder.calculateNextCallTime();
    } else {
      reminder.nextCallTime = reminder.dueDate;
    }

    await reminder.save();

    logger.info(`Voice call reminder created: ${reminder.title} for user ${ownerId}`);

    res.status(201).json({
      success: true,
      data: reminder,
      message: 'Voice call reminder created successfully'
    });
  } catch (error) {
    logger.error('Error creating voice call reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create voice call reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/reminders/:id/voice-call-status - Get voice call status
router.get('/:id/voice-call-status', async (req, res) => {
  try {
    const ownerId = getReminderOwnerId(req.user);
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: ownerId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    if (!reminder.recipientId || !reminder.recipientPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'This reminder does not have a voice call configured'
      });
    }

    res.json({
      success: true,
      data: {
        reminderId: reminder._id,
        title: reminder.title,
        callStatus: reminder.callStatus,
        recipientPhoneNumber: reminder.recipientPhoneNumber,
        voiceMessage: reminder.voiceMessage.substring(0, 100) + '...',
        lastCallTime: reminder.lastCallTime,
        nextCallTime: reminder.nextCallTime,
        callAttempts: reminder.callAttempts,
        maxCallAttempts: reminder.maxCallAttempts,
        callHistory: reminder.callHistory,
        recurring: reminder.recurring
      }
    });
  } catch (error) {
    logger.error('Error fetching voice call status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch voice call status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/reminders/:id/trigger-call - Manually trigger voice call
router.post('/:id/trigger-call', async (req, res) => {
  try {
    const ownerId = getReminderOwnerId(req.user);
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: ownerId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    if (!reminder.recipientPhoneNumber || !reminder.voiceMessage) {
      return res.status(400).json({
        success: false,
        message: 'Reminder is not configured for voice calls'
      });
    }

    // Trigger the voice call
    const result = await voiceCallScheduler.triggerManualCall(reminder._id);

    res.json({
      success: true,
      data: result,
      message: 'Voice call triggered successfully'
    });
  } catch (error) {
    logger.error('Error triggering voice call:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to trigger voice call',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/reminders/voice/callback - Twilio webhook callback (no auth required)
router.post('/voice/callback', async (req, res) => {
  try {
    const callData = await voiceCallService.handleCallStatusCallback(req.body);
    
    logger.info('Twilio callback received:', callData);

    // Find and update reminder with call status
    const reminder = await Reminder.findOne({
      'callHistory.callId': callData.callId
    });

    if (reminder) {
      reminder.lastCallTime = new Date();
      reminder.callStatus = callData.status;
      if (callData.recordingUrl) {
        reminder.voiceNoteUrl = callData.recordingUrl;
      }
      await reminder.save();
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing Twilio callback:', error);
    res.status(200).json({ success: false }); // Always return 200 to Twilio
  }
});

// POST /api/reminders/voice/acknowledge - Handle voice call acknowledgment
router.post('/voice/acknowledge', async (req, res) => {
  try {
    const { Digits } = req.body;

    logger.info(`Voice call acknowledgment received: ${Digits}`);

    // User pressed a digit, so call was answered
    res.json({ success: true, acknowledged: !!Digits });
  } catch (error) {
    logger.error('Error processing acknowledgment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/reminders/voice/scheduler-status - Get scheduler status
router.get('/voice/scheduler-status', async (req, res) => {
  try {
    // Only allow admins or for development
    const status = voiceCallScheduler.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error fetching scheduler status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduler status'
    });
  }
});

module.exports = router;
module.exports.__testables = {
  getReminderOwnerId,
  parseReminderDueDate,
  validateReminderFields,
};
