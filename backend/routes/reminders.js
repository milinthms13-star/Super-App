const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Reminder = require('../models/Reminder');
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const voiceCallService = require('../services/voiceCallService');
const voiceCallScheduler = require('../services/voiceCallScheduler');
const multer = require('multer');
const path = require('path');

const S3 = require('../config/s3');
const { uploadToS3, generateSignedUrl } = require('../utils/s3Storage');

const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv'
]);

const getFileTypeFromMime = (mimetype) => {
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  return 'document';
};

const VALID_CATEGORIES = ['Work', 'Personal', 'Urgent'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_REMINDERS = ['In-app', 'SMS', 'Call'];
const VALID_RECURRING = ['none', 'daily', 'weekly', 'monthly'];
const VALID_FILE_TYPES = ['voice', 'image', 'document', 'video', 'audio'];
const VALID_TRUSTED_CONTACT_RELATIONSHIPS = ['family', 'friend', 'caregiver', 'colleague', 'other'];
const TRUSTED_CONTACT_DEFAULT_MESSAGE = 'I would like to add you as a trusted contact for my reminders';
const PUBLIC_REMINDER_PATHS = new Set(['/voice/callback', '/voice/acknowledge']);
const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

const getReminderOwnerId = (user = {}) => String(user?._id || user?.id || '');

const parseReminderDueDate = (value) => {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const buildReminderScheduleTime = (dueDateValue, dueTime = '') => {
  if (!dueDateValue) {
    return null;
  }

  const normalizedDueDate =
    typeof dueDateValue === 'string' ? dueDateValue.trim() : '';

  let scheduleTime = null;

  // Date-only inputs like "2026-04-25" need to stay on that local calendar day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedDueDate)) {
    const [year, month, day] = normalizedDueDate.split('-').map((part) => parseInt(part, 10));
    scheduleTime = new Date(year, month - 1, day, 0, 0, 0, 0);
  } else {
    const parsedDate = parseReminderDueDate(dueDateValue);
    if (!parsedDate) {
      return null;
    }

    scheduleTime = new Date(parsedDate);
  }

  if (!dueTime) {
    scheduleTime.setHours(0, 0, 0, 0);
    return scheduleTime;
  }

  const [hours, minutes] = String(dueTime)
    .split(':')
    .map((part) => parseInt(part, 10));

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    scheduleTime.setHours(0, 0, 0, 0);
    return scheduleTime;
  }

  scheduleTime.setHours(hours, minutes, 0, 0);
  return scheduleTime;
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

const normalizeTrustedContactIdentifier = (value) => String(value || '').trim();

const resolveTrustedContactRecipient = async (UserModel, recipientIdentifier) => {
  const normalizedIdentifier = normalizeTrustedContactIdentifier(recipientIdentifier);

  if (!normalizedIdentifier) {
    return null;
  }

  if (mongoose.Types.ObjectId.isValid(normalizedIdentifier)) {
    const userById = await UserModel.findById(normalizedIdentifier);
    if (userById) {
      return userById;
    }
  }

  const normalizedLookup = normalizedIdentifier.toLowerCase();
  const lookupField = normalizedLookup.includes('@') ? 'email' : 'username';

  return UserModel.findOne({ [lookupField]: normalizedLookup });
};

const sanitizeFileName = (fileName = '') =>
  path.basename(String(fileName || 'attachment'))
    .replace(/[^a-zA-Z0-9._-]/g, '_');

const buildReminderAttachmentStorageKey = (reminderId, fileName) =>
  `reminders/${String(reminderId)}/attachments/${Date.now()}-${sanitizeFileName(fileName)}`;

const serializeSharedReminderForContact = (reminder, contactId) => {
  const reminderObject =
    typeof reminder?.toObject === 'function' ? reminder.toObject() : { ...(reminder || {}) };
  const matchingAcknowledgment = (reminderObject.trustedContactAcknowledgments || []).find(
    (entry) => String(entry.contactId) === String(contactId)
  );

  return {
    ...reminderObject,
    viewerAcknowledged: Boolean(matchingAcknowledgment?.acknowledged),
    viewerAcknowledgedAt: matchingAcknowledgment?.acknowledgedAt || null,
  };
};

// Create rate limiter for reminders
const reminderRateLimiter = createModerateRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

// Apply authentication to all non-webhook routes
router.use((req, res, next) => {
  if (PUBLIC_REMINDER_PATHS.has(req.path)) {
    return next();
  }

  return authenticate(req, res, next);
});

// Apply rate limiting
router.use(reminderRateLimiter);

// GET /api/reminders - Get all reminders for the authenticated user
const { cacheReminders: cacheRemindersList } = require('../middleware/redisCache');
router.get('/', cacheRemindersList, async (req, res) => {
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
      completed,
      recipientPhoneNumber,
      voiceMessage,
      messageType,
      voiceNoteUrl
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
    if (recipientPhoneNumber !== undefined) {
      const formattedPhoneNumber = String(recipientPhoneNumber || "").trim();
      reminder.recipientPhoneNumber = formattedPhoneNumber
        ? voiceCallService.formatPhoneNumber(formattedPhoneNumber)
        : '';
    }
    if (voiceMessage !== undefined) {
      reminder.voiceMessage = String(voiceMessage || "").trim();
    }
    if (messageType !== undefined && ['text', 'audio'].includes(messageType)) {
      reminder.messageType = messageType;
    }
    if (voiceNoteUrl !== undefined) {
      reminder.voiceNoteUrl = String(voiceNoteUrl || '').trim();
    }

    if (reminder.messageType === 'text') {
      reminder.voiceNoteUrl = '';
    }

    if (reminder.messageType === 'audio') {
      reminder.voiceMessage = reminder.voiceMessage || '';
    }

    if (reminders !== undefined && !reminders.includes('Call')) {
      reminder.recipientPhoneNumber = '';
      reminder.voiceMessage = '';
      reminder.voiceNoteUrl = '';
      reminder.messageType = 'text';
      reminder.callStatus = 'pending';
      reminder.lastCallTime = undefined;
      reminder.nextCallTime = undefined;
      reminder.callAttempts = 0;
      reminder.callHistory = [];
    }

    const hasCallReminder = Array.isArray(reminder.reminders) && reminder.reminders.includes('Call');
    const hasPlayableVoiceContent =
      reminder.messageType === 'audio'
        ? Boolean(String(reminder.voiceNoteUrl || '').trim())
        : Boolean(String(reminder.voiceMessage || '').trim());

    if (hasCallReminder) {
      if (!String(reminder.recipientPhoneNumber || '').trim()) {
        return res.status(400).json({
          success: false,
          message: 'Recipient phone number is required for voice call reminders'
        });
      }

      if (!hasPlayableVoiceContent) {
        return res.status(400).json({
          success: false,
          message:
            reminder.messageType === 'audio'
              ? 'Voice note URL is required for audio reminders'
              : 'Voice message is required'
        });
      }
    }

    const shouldResetVoiceSchedule =
      completed === false ||
      [
        dueDate,
        dueTime,
        reminders,
        recurring,
        recipientPhoneNumber,
        voiceMessage,
        messageType,
        voiceNoteUrl,
      ].some((value) => value !== undefined);

    // Handle completion
    if (completed !== undefined && completed !== reminder.completed) {
      reminder.completed = completed;
      if (completed) {
        reminder.completedAt = new Date();
        reminder.status = 'Completed';
        reminder.nextCallTime = undefined;
      } else {
        reminder.completedAt = undefined;
        reminder.status = reminder.reminders.length > 1 ? 'Escalation armed' : 'Reminder scheduled';
      }
    }

    // Update status based on reminders
    if (!reminder.completed && reminders) {
      reminder.status = reminders.length > 1 ? 'Escalation armed' : 'Reminder scheduled';
    }

    if (
      hasCallReminder &&
      !reminder.completed &&
      reminder.recipientPhoneNumber &&
      hasPlayableVoiceContent &&
      shouldResetVoiceSchedule
    ) {
      reminder.callStatus = 'pending';
      reminder.lastCallTime = undefined;
      reminder.nextCallTime = buildReminderScheduleTime(reminder.dueDate, reminder.dueTime);
      reminder.callAttempts = 0;
      reminder.callHistory = [];
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
const { cacheReminderStats: cacheReminderStatsSummary } = require('../middleware/redisCache');
router.get('/stats/summary', cacheReminderStatsSummary, async (req, res) => {
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
      voiceNoteUrl,
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

    if (messageType === 'text' && (!voiceMessage || voiceMessage.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Voice message is required'
      });
    }

    if (messageType === 'audio' && !String(voiceNoteUrl || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Voice note URL is required for audio reminders'
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
      voiceMessage: messageType === 'text' ? voiceMessage.trim() : '',
      messageType,
      voiceNoteUrl: messageType === 'audio' ? String(voiceNoteUrl || '').trim() : '',
      callStatus: 'pending',
      maxCallAttempts,
      senderName: req.user.name || 'Reminder Service'
    });

    // The first automatic call should happen at this reminder's actual due date/time.
    reminder.nextCallTime = buildReminderScheduleTime(dueDate, dueTime);

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

    if (!reminder.recipientPhoneNumber) {
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
        voiceMessage:
          reminder.messageType === 'audio'
            ? 'Pre-recorded audio configured'
            : `${String(reminder.voiceMessage || '').substring(0, 100)}...`,
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

    const hasVoiceContent =
      reminder.messageType === 'audio'
        ? Boolean(String(reminder.voiceNoteUrl || '').trim())
        : Boolean(String(reminder.voiceMessage || '').trim());

    if (!reminder.recipientPhoneNumber || !hasVoiceContent) {
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
      const hasFutureRecurringCall =
        reminder.recurring !== 'none' &&
        reminder.nextCallTime instanceof Date &&
        reminder.nextCallTime > new Date();

      reminder.lastCallTime = new Date();
      reminder.callStatus = hasFutureRecurringCall ? 'pending' : callData.status;

      const callHistoryEntry = reminder.callHistory.find(
        (entry) => entry.callId === callData.callId
      );

      if (callHistoryEntry) {
        callHistoryEntry.status = callData.status;

        if (callData.recordingDuration !== undefined && callData.recordingDuration !== null) {
          const parsedDuration = parseInt(callData.recordingDuration, 10);
          if (!Number.isNaN(parsedDuration)) {
            callHistoryEntry.duration = parsedDuration;
          }
        }
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
    const { Digits, CallSid } = req.body;

    logger.info(`Voice call acknowledgment received: ${Digits}`);

    if (CallSid && Digits) {
      const reminder = await Reminder.findOne({
        'callHistory.callId': CallSid
      });

      if (reminder) {
        reminder.callStatus = 'answered';
        reminder.lastCallTime = new Date();

        const callHistoryEntry = reminder.callHistory.find(
          (entry) => entry.callId === CallSid
        );

        if (callHistoryEntry) {
          callHistoryEntry.status = 'answered';
        }

        await reminder.save();
      }
    }

    res
      .type('text/xml')
      .send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you. This reminder has been acknowledged.</Say></Response>');
  } catch (error) {
    logger.error('Error processing acknowledgment:', error);
    res
      .status(200)
      .type('text/xml')
      .send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>We could not record your acknowledgment right now.</Say></Response>');
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

// ============ TRUSTED CONTACTS ENDPOINTS ============

// Import TrustedReminderContact model
const TrustedReminderContact = require('../models/TrustedReminderContact');

// POST /api/reminders/trusted-contacts/invite - Send invite to become trusted contact
router.post('/trusted-contacts/invite', async (req, res) => {
  try {
    const senderId = getReminderOwnerId(req.user);
    const { recipientId, message, relationship = 'other' } = req.body;
    const recipientIdentifier = normalizeTrustedContactIdentifier(recipientId);

    if (!recipientIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Email, username, or user ID is required'
      });
    }

    if (!VALID_TRUSTED_CONTACT_RELATIONSHIPS.includes(relationship)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid relationship'
      });
    }

    const User = require('../models/User');
    const recipient = await resolveTrustedContactRecipient(User, recipientIdentifier);

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'No user found for that email, username, or user ID'
      });
    }

    const resolvedRecipientId = String(recipient._id);

    if (senderId === resolvedRecipientId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add yourself as a trusted contact'
      });
    }

    const existing = await TrustedReminderContact.findOne({
      senderId,
      recipientId: resolvedRecipientId
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'This user is already your trusted contact'
        });
      }

      if (existing.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'An invite is already pending for this user'
        });
      }

      if (existing.status === 'blocked') {
        return res.status(403).json({
          success: false,
          message: 'This trusted contact request is blocked'
        });
      }

      existing.status = 'pending';
      existing.relationship = relationship;
      existing.message = String(message || TRUSTED_CONTACT_DEFAULT_MESSAGE).trim() || TRUSTED_CONTACT_DEFAULT_MESSAGE;
      existing.acceptedAt = undefined;
      existing.rejectedAt = undefined;
      existing.blockedAt = undefined;
      existing.lastInteractionAt = new Date();
      await existing.save();

      logger.info(`Trusted contact invite re-sent from ${senderId} to ${resolvedRecipientId}`);

      return res.status(201).json({
        success: true,
        data: existing,
        message: 'Invite sent successfully'
      });
    }

    const trustedContact = new TrustedReminderContact({
      senderId,
      recipientId: resolvedRecipientId,
      message: String(message || TRUSTED_CONTACT_DEFAULT_MESSAGE).trim() || TRUSTED_CONTACT_DEFAULT_MESSAGE,
      relationship
    });

    await trustedContact.save();

    logger.info(`Trusted contact invite sent from ${senderId} to ${resolvedRecipientId}`);

    res.status(201).json({
      success: true,
      data: trustedContact,
      message: 'Invite sent successfully'
    });
  } catch (error) {
    logger.error('Error sending trusted contact invite:', error);

    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This user is already your trusted contact or already has a pending invite'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to send invite',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/reminders/trusted-contacts/sent - Get sent invites
router.get('/trusted-contacts/sent', async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);

    const invites = await TrustedReminderContact.find({
      senderId: userId
    })
      .populate('recipientId', 'username email name profilePicture')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: invites
    });
  } catch (error) {
    logger.error('Error fetching sent invites:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invites',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/reminders/trusted-contacts/received - Get received invites
router.get('/trusted-contacts/received', async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);

    const invites = await TrustedReminderContact.find({
      recipientId: userId,
      status: 'pending'
    })
      .populate('senderId', 'username email name profilePicture')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: invites
    });
  } catch (error) {
    logger.error('Error fetching received invites:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invites',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/reminders/trusted-contacts/accepted - Get accepted trusted contacts
router.get('/trusted-contacts/accepted', async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);

    const accepted = await TrustedReminderContact.find({
      senderId: userId,
      status: 'accepted'
    })
      .populate('recipientId', 'username email name profilePicture')
      .sort({ acceptedAt: -1 });

    res.json({
      success: true,
      data: accepted
    });
  } catch (error) {
    logger.error('Error fetching accepted trusted contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trusted contacts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/reminders/trusted-contacts/:id/accept - Accept invite
router.post('/trusted-contacts/:id/accept', async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const inviteId = req.params.id;

    const invite = await TrustedReminderContact.findOne({
      _id: inviteId,
      recipientId: userId,
      status: 'pending'
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found'
      });
    }

    invite.status = 'accepted';
    invite.acceptedAt = new Date();
    invite.lastInteractionAt = new Date();
    await invite.save();

    logger.info(`Trusted contact invite accepted from ${userId}`);

    res.json({
      success: true,
      data: invite,
      message: 'Invite accepted'
    });
  } catch (error) {
    logger.error('Error accepting invite:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept invite',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/reminders/trusted-contacts/:id/reject - Reject invite
router.post('/trusted-contacts/:id/reject', async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const inviteId = req.params.id;

    const invite = await TrustedReminderContact.findOne({
      _id: inviteId,
      recipientId: userId,
      status: 'pending'
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found'
      });
    }

    invite.status = 'rejected';
    invite.rejectedAt = new Date();
    await invite.save();

    logger.info(`Trusted contact invite rejected by ${userId}`);

    res.json({
      success: true,
      data: invite,
      message: 'Invite rejected'
    });
  } catch (error) {
    logger.error('Error rejecting invite:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject invite',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/reminders/trusted-contacts/:id - Remove trusted contact
router.delete('/trusted-contacts/:id', async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const contactId = req.params.id;

    const contact = await TrustedReminderContact.findOne({
      _id: contactId,
      senderId: userId
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Trusted contact not found'
      });
    }

    await TrustedReminderContact.deleteOne({ _id: contactId });

    // Remove from shared reminders
    await Reminder.updateMany(
      { userId, sharedWithTrustedContacts: contact.recipientId },
      { $pull: { sharedWithTrustedContacts: contact.recipientId } }
    );

    logger.info(`Trusted contact removed by ${userId}`);

    res.json({
      success: true,
      message: 'Trusted contact removed'
    });
  } catch (error) {
    logger.error('Error removing trusted contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove trusted contact',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/reminders/:id/share-with-contacts - Share reminder with trusted contacts
router.put('/:id/share-with-contacts', async (req, res) => {
  try {
    const ownerId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;
    const { contactIds = [] } = req.body;

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: ownerId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    // Validate that all contact IDs are accepted trusted contacts
    const validContacts = await TrustedReminderContact.find({
      senderId: ownerId,
      recipientId: { $in: contactIds },
      status: 'accepted'
    });

    if (validContacts.length !== contactIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more contacts are not accepted trusted contacts'
      });
    }

    const existingAcknowledgments = new Map(
      (reminder.trustedContactAcknowledgments || []).map((entry) => [
        String(entry.contactId),
        entry
      ])
    );

    reminder.sharedWithTrustedContacts = contactIds;
    reminder.trustedContactAcknowledgments = contactIds.map(id => {
      const existingEntry = existingAcknowledgments.get(String(id));

      if (existingEntry) {
        return {
          contactId: id,
          acknowledged: Boolean(existingEntry.acknowledged),
          acknowledgedAt: existingEntry.acknowledgedAt || undefined
        };
      }

      return {
        contactId: id,
        acknowledged: false
      };
    });

    await reminder.save();

    logger.info(`Reminder ${reminderId} shared with ${contactIds.length} trusted contacts`);

    res.json({
      success: true,
      data: reminder,
      message: 'Reminder shared successfully'
    });
  } catch (error) {
    logger.error('Error sharing reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/reminders/shared-with-me - Get reminders shared with me
const { cacheReminders: cacheRemindersShared } = require('../middleware/redisCache');
router.get('/shared-with-me/list', cacheRemindersShared, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);

    const reminders = await Reminder.find({
      sharedWithTrustedContacts: userId
    })
      .populate('userId', 'username email name profilePicture')
      .sort({ dueDate: 1, createdAt: -1 });

    res.json({
      success: true,
      data: reminders.map((reminder) => serializeSharedReminderForContact(reminder, userId))
    });
  } catch (error) {
    logger.error('Error fetching shared reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shared reminders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/reminders/shared-with-me/:id/acknowledge - Acknowledge a shared reminder
router.post('/shared-with-me/:id/acknowledge', async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      sharedWithTrustedContacts: userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Shared reminder not found'
      });
    }

    const acknowledgment = reminder.trustedContactAcknowledgments.find(
      (entry) => String(entry.contactId) === userId
    );

    if (!acknowledgment) {
      return res.status(400).json({
        success: false,
        message: 'This reminder is not assigned to the current trusted contact'
      });
    }

    acknowledgment.acknowledged = true;
    acknowledgment.acknowledgedAt = new Date();
    await reminder.save();

    res.json({
      success: true,
      data: serializeSharedReminderForContact(reminder, userId),
      message: 'Reminder acknowledged successfully'
    });
  } catch (error) {
    logger.error('Error acknowledging shared reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge shared reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============ FILE ATTACHMENT ENDPOINTS ============

// POST /api/reminders/:id/attachments/presign - Get pre-signed S3 upload URL
router.post('/:id/attachments/presign', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;
    const { fileName, fileType, mimeType, fileSize } = req.body;

    if (!fileName || !mimeType) {
      return res.status(400).json({
        success: false,
        message: 'fileName and mimeType are required'
      });
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only audio, image, video, and document files allowed.'
      });
    }

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    const presigned = await S3.getPresignedUploadUrl(fileName, mimeType, fileSize || 50 * 1024 * 1024);

    res.status(200).json({
      success: true,
      data: {
        uploadUrl: presigned.url,
        fields: presigned.fields,
        s3Key: presigned.fields.key,
        downloadUrl: await S3.getPresignedDownloadUrl(presigned.fields.key)
      }
    });
  } catch (error) {
    logger.error('Error generating presigned URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate upload URL',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/reminders/:id/attachments - Upload attachment directly or register an S3 upload
router.post('/:id/attachments', attachmentUpload.single('file'), async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;
    const { s3Key, fileName, mimeType, fileSize, description, duration } = req.body;

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    let attachment = null;

    if (req.file) {
      const uploadedMimeType = req.file.mimetype || 'application/octet-stream';

      if (!ALLOWED_MIME_TYPES.has(uploadedMimeType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Only audio, image, video, and document files allowed.'
        });
      }

      const safeFileName = sanitizeFileName(req.file.originalname || `attachment-${Date.now()}`);
      const storageKey = buildReminderAttachmentStorageKey(reminderId, safeFileName);
      const uploadResult = await uploadToS3(req.file.buffer, storageKey, {
        contentType: uploadedMimeType
      });
      const storedKey = uploadResult.s3Key || storageKey;
      const fileUrl = uploadResult.s3Url || generateSignedUrl(storedKey);

      attachment = {
        fileName: safeFileName,
        fileType: getFileTypeFromMime(uploadedMimeType),
        mimeType: uploadedMimeType,
        s3Key: storedKey,
        fileUrl,
        fileSize: req.file.size,
        uploadedBy: req.user?._id || userId,
        uploadedByName: req.user?.name || req.user?.username || 'User',
        description: description || '',
        ...(duration && { duration: parseInt(duration, 10) })
      };

      logger.info(`Attachment uploaded directly for reminder ${reminderId}: ${storedKey}`);
    } else {
      if (!s3Key || !fileName || !mimeType || !fileSize) {
        return res.status(400).json({
          success: false,
          message: 's3Key, fileName, mimeType, and fileSize are required'
        });
      }

      const fileType = getFileTypeFromMime(mimeType);
      const downloadUrl = await S3.getPresignedDownloadUrl(s3Key, 3600);

      attachment = {
        fileName,
        fileType,
        mimeType,
        s3Key,
        fileUrl: downloadUrl,
        fileSize: parseInt(fileSize, 10),
        uploadedBy: req.user?._id || userId,
        uploadedByName: req.user?.name || req.user?.username || 'User',
        description: description || '',
        ...(duration && { duration: parseInt(duration, 10) })
      };

      logger.info(`S3 attachment registered for reminder ${reminderId}: ${s3Key}`);
    }

    reminder.addAttachment(attachment);
    await reminder.save();

    res.status(201).json({
      success: true,
      data: {
        reminderId,
        attachment
      },
      message: 'Attachment registered successfully'
    });
  } catch (error) {
    logger.error('Error registering S3 attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register attachment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/reminders/:id/attachments - Get all attachments for a reminder
router.get('/:id/attachments', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;

    const reminder = await Reminder.findOne({
      $or: [
        { _id: reminderId, userId: userId },
        { _id: reminderId, sharedWithTrustedContacts: userId }
      ]
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    res.json({
      success: true,
      data: reminder.attachments || []
    });
  } catch (error) {
    logger.error('Error fetching attachments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attachments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/reminders/:id/attachments/:attachmentId - Delete attachment from reminder & S3
router.delete('/:id/attachments/:attachmentId', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;
    const attachmentId = req.params.attachmentId;

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    // Find attachment
    const attachmentIndex = reminder.attachments.findIndex(
      (att) => att._id.toString() === attachmentId
    );

    if (attachmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    const attachment = reminder.attachments[attachmentIndex];

    // Delete from S3 if s3Key exists
    if (attachment.s3Key) {
      await S3.deleteFromS3(attachment.s3Key);
    }

    reminder.removeAttachment(attachmentId);
    await reminder.save();

    logger.info(`S3 attachment deleted from reminder ${reminderId}: ${attachment.s3Key || 'local'}`);

    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting S3 attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete attachment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/reminders/:id/attachments/type/:type - Get attachments by type
router.get('/:id/attachments/type/:type', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;
    const fileType = req.params.type;

    if (!VALID_FILE_TYPES.includes(fileType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file type. Must be one of: ${VALID_FILE_TYPES.join(', ')}`
      });
    }

    const reminder = await Reminder.findOne({
      $or: [
        { _id: reminderId, userId: userId },
        { _id: reminderId, sharedWithTrustedContacts: userId }
      ]
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    const attachments = reminder.getAttachmentsByType(fileType);

    res.json({
      success: true,
      data: attachments
    });
  } catch (error) {
    logger.error('Error fetching attachments by type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attachments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== PHASE 1: SNOOZE FUNCTIONALITY ====================

// POST /api/reminders/:id/snooze - Snooze a reminder
router.post('/:id/snooze', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;
    const { minutesToSnooze } = req.body;

    if (!minutesToSnooze || minutesToSnooze < 1 || minutesToSnooze > 10080) {
      return res.status(400).json({
        success: false,
        message: 'minutesToSnooze must be between 1 and 10080 (7 days)'
      });
    }

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    reminder.snooze(minutesToSnooze);
    await reminder.save();

    logger.info(`Reminder ${reminderId} snoozed for ${minutesToSnooze} minutes`);

    res.json({
      success: true,
      data: {
        snoozedUntil: reminder.snoozedUntil,
        snoozeCount: reminder.snoozeCount,
        nextNotificationAt: reminder.snoozedUntil
      },
      message: `Reminder snoozed until ${reminder.snoozedUntil.toLocaleString()}`
    });
  } catch (error) {
    logger.error('Error snoozing reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to snooze reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== PHASE 1: MISSED REMINDER TRACKING ====================

// GET /api/reminders/missed - Get all missed reminders for user
router.get('/missed', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { limit = 20, skip = 0 } = req.query;

    const missedReminders = await Reminder.find({
      userId: userId,
      missedAt: { $exists: true, $ne: null },
      completed: false
    })
      .sort({ missedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const totalCount = await Reminder.countDocuments({
      userId: userId,
      missedAt: { $exists: true, $ne: null },
      completed: false
    });

    res.json({
      success: true,
      data: missedReminders,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    logger.error('Error fetching missed reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch missed reminders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/reminders/:id/mark-missed - Manually mark reminder as missed
router.post('/:id/mark-missed', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    if (reminder.completed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark completed reminder as missed'
      });
    }

    reminder.recordMissedReminder();
    reminder.status = 'Missed';
    await reminder.save();

    logger.info(`Reminder ${reminderId} marked as missed`);

    res.json({
      success: true,
      data: {
        missedAt: reminder.missedAt,
        status: reminder.status,
        missedCount: reminder.missedHistory ? reminder.missedHistory.length : 1
      },
      message: 'Reminder marked as missed'
    });
  } catch (error) {
    logger.error('Error marking reminder as missed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark reminder as missed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/reminders/:id/resend - Resend/reschedule a missed reminder
router.post('/:id/resend', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;
    const { rescheduleFor, channels = ['In-app'] } = req.body;

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    if (reminder.completed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot resend completed reminder'
      });
    }

    // If rescheduling for a different time
    if (rescheduleFor) {
      const newDueDate = new Date(rescheduleFor);
      if (newDueDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot reschedule to a past date'
        });
      }
      reminder.dueDate = newDueDate;
    }

    // Record resend in missed history
    if (reminder.missedHistory && reminder.missedHistory.length > 0) {
      const lastMissed = reminder.missedHistory[reminder.missedHistory.length - 1];
      lastMissed.resendAt = new Date();
      lastMissed.status = 'resent';
    }

    // Clear snooze if any
    reminder.snoozedUntil = null;

    // Record notification sent
    for (const channel of channels) {
      reminder.recordNotificationSent(reminder.reminderBeforeOffsets?.[0] || 5, channel);
    }

    await reminder.save();

    logger.info(`Reminder ${reminderId} resent with channels: ${channels.join(', ')}`);

    res.json({
      success: true,
      data: {
        id: reminder._id,
        dueDate: reminder.dueDate,
        channels: channels,
        resendAt: new Date()
      },
      message: 'Reminder resent successfully'
    });
  } catch (error) {
    logger.error('Error resending reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== PHASE 1: REMIND-BEFORE OFFSETS ====================

// GET /api/reminders/:id/notification-offsets - Get reminder notification offsets
router.get('/:id/notification-offsets', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: userId
    }).select('reminderBeforeOffsets notificationLog dueDate dueTime');

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    const offsets = reminder.reminderBeforeOffsets || [5];
    const notificationStatus = (reminder.notificationLog || []).reduce((acc, log) => {
      acc[log.offsetMinutes] = {
        status: log.status,
        firedAt: log.firedAt,
        channel: log.channel
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        reminderBeforeOffsets: offsets,
        availableOffsets: [5, 15, 30, 60, 1440],  // 5min, 15min, 30min, 1hr, 1day
        notificationStatus: notificationStatus,
        dueDateTime: {
          date: reminder.dueDate,
          time: reminder.dueTime
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching notification offsets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification offsets',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/reminders/:id/notification-offsets - Update reminder notification offsets
router.put('/:id/notification-offsets', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;
    const { reminderBeforeOffsets } = req.body;

    if (!Array.isArray(reminderBeforeOffsets) || reminderBeforeOffsets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'reminderBeforeOffsets must be a non-empty array of numbers'
      });
    }

    // Validate offsets
    const validOffsets = [5, 15, 30, 60, 1440];  // 5min, 15min, 30min, 1hr, 1day
    const validatedOffsets = reminderBeforeOffsets.filter(offset => {
      return Number.isInteger(offset) && offset > 0 && offset <= 10080;  // Max 7 days
    }).sort((a, b) => a - b);

    if (validatedOffsets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid offset is required'
      });
    }

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    reminder.reminderBeforeOffsets = validatedOffsets;
    reminder.notificationLog = [];  // Reset notification log when offsets change
    await reminder.save();

    logger.info(`Reminder ${reminderId} notification offsets updated to: ${validatedOffsets.join(', ')}`);

    res.json({
      success: true,
      data: {
        reminderBeforeOffsets: reminder.reminderBeforeOffsets,
        message: `Notification reminders set for ${validatedOffsets.join(', ')} minutes before due time`
      }
    });
  } catch (error) {
    logger.error('Error updating notification offsets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification offsets',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== PHASE 2: SMS DELIVERY ====================

// GET /api/reminders/:id/sms-delivery-status - Check SMS delivery status for a reminder
router.get('/:id/sms-delivery-status', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: userId
    }).select('notificationLog reminders recipientPhoneNumber');

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    if (!reminder.reminders || !reminder.reminders.includes('SMS')) {
      return res.status(400).json({
        success: false,
        message: 'This reminder does not have SMS enabled'
      });
    }

    // Filter SMS logs from notification log
    const smsLogs = (reminder.notificationLog || []).filter(log => log.channel === 'SMS');

    res.json({
      success: true,
      data: {
        reminderId: reminder._id,
        phoneNumber: reminder.recipientPhoneNumber,
        smsEnabled: true,
        deliveryStatus: smsLogs.map(log => ({
          offsetMinutes: log.offsetMinutes,
          sentAt: log.firedAt,
          status: log.status,
          message: log.status === 'sent' ? 'SMS sent successfully' : 'SMS delivery pending'
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching SMS delivery status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS delivery status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/reminders/:id/resend-sms - Manually trigger SMS resend for a reminder
router.post('/:id/resend-sms', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    if (!reminder.reminders || !reminder.reminders.includes('SMS')) {
      return res.status(400).json({
        success: false,
        message: 'This reminder does not have SMS enabled'
      });
    }

    if (!reminder.recipientPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number not configured for this reminder'
      });
    }

    if (reminder.completed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot resend SMS for completed reminder'
      });
    }

    // Clear previous SMS logs to force resend
    reminder.notificationLog = (reminder.notificationLog || []).filter(log => log.channel !== 'SMS');
    
    await reminder.save();

    logger.info(`Reminder ${reminderId} SMS marked for resend`);

    res.json({
      success: true,
      data: {
        reminderId: reminder._id,
        phoneNumber: reminder.recipientPhoneNumber,
        message: 'SMS will be resent within the next 5 minutes'
      }
    });
  } catch (error) {
    logger.error('Error triggering SMS resend:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend SMS',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/reminders/:id/sms-config - Configure SMS phone number for a reminder
router.put('/:id/sms-config', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;
    const { phoneNumber } = req.body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid phone number is required'
      });
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    reminder.recipientPhoneNumber = phoneNumber;

    // Ensure SMS is in reminders channels if setting phone number
    if (!reminder.reminders || !reminder.reminders.includes('SMS')) {
      reminder.reminders = reminder.reminders || [];
      if (!reminder.reminders.includes('SMS')) {
        reminder.reminders.push('SMS');
      }
    }

    await reminder.save();

    logger.info(`SMS config updated for reminder ${reminderId}`);

    res.json({
      success: true,
      data: {
        reminderId: reminder._id,
        phoneNumber: reminder.recipientPhoneNumber,
        channels: reminder.reminders,
        message: 'SMS configuration updated successfully'
      }
    });
  } catch (error) {
    logger.error('Error updating SMS config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update SMS configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== PHASE 3: EMAIL DELIVERY ====================

// GET /api/reminders/:id/email-delivery-status - Check email delivery status for a reminder
router.get('/:id/email-delivery-status', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: userId
    }).select('notificationLog reminders email');

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    if (!reminder.reminders || !reminder.reminders.includes('Email')) {
      return res.status(400).json({
        success: false,
        message: 'This reminder does not have Email enabled'
      });
    }

    // Filter email logs from notification log
    const emailLogs = (reminder.notificationLog || []).filter(log => log.channel === 'Email');

    res.json({
      success: true,
      data: {
        reminderId: reminder._id,
        email: reminder.email,
        emailEnabled: true,
        deliveryStatus: emailLogs.map(log => ({
          offsetMinutes: log.offsetMinutes,
          sentAt: log.firedAt,
          status: log.status,
          message: log.status === 'sent' ? 'Email sent successfully' : 'Email delivery pending'
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching email delivery status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email delivery status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/reminders/:id/resend-email - Manually trigger email resend for a reminder
router.post('/:id/resend-email', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    if (!reminder.reminders || !reminder.reminders.includes('Email')) {
      return res.status(400).json({
        success: false,
        message: 'This reminder does not have Email enabled'
      });
    }

    if (!reminder.email) {
      return res.status(400).json({
        success: false,
        message: 'Email address not configured for this reminder'
      });
    }

    if (reminder.completed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot resend email for completed reminder'
      });
    }

    // Clear previous email logs to force resend
    reminder.notificationLog = (reminder.notificationLog || []).filter(log => log.channel !== 'Email');
    
    await reminder.save();

    logger.info(`Reminder ${reminderId} email marked for resend`);

    res.json({
      success: true,
      data: {
        reminderId: reminder._id,
        email: reminder.email,
        message: 'Email will be resent within the next 5 minutes'
      }
    });
  } catch (error) {
    logger.error('Error triggering email resend:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/reminders/:id/email-config - Configure email address for a reminder
router.put('/:id/email-config', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid email address is required'
      });
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format'
      });
    }

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: userId
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    reminder.email = email.toLowerCase();

    // Ensure Email is in reminders channels if setting email address
    if (!reminder.reminders || !reminder.reminders.includes('Email')) {
      reminder.reminders = reminder.reminders || [];
      if (!reminder.reminders.includes('Email')) {
        reminder.reminders.push('Email');
      }
    }

    await reminder.save();

    logger.info(`Email config updated for reminder ${reminderId}`);

    res.json({
      success: true,
      data: {
        reminderId: reminder._id,
        email: reminder.email,
        channels: reminder.reminders,
        message: 'Email configuration updated successfully'
      }
    });
  } catch (error) {
    logger.error('Error updating email config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update email configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== PHASE 4: WHATSAPP DELIVERY ====================

// GET /api/reminders/:id/whatsapp-delivery-status
router.get('/:id/whatsapp-delivery-status', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminder = await Reminder.findOne({ _id: req.params.id, userId }).select('notificationLog reminders whatsappPhoneNumber');
    
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    
    const whatsappLogs = (reminder.notificationLog || []).filter(log => log.channel === 'WhatsApp');
    
    res.json({
      success: true,
      data: {
        reminderId: reminder._id,
        whatsappPhoneNumber: reminder.whatsappPhoneNumber,
        whatsappEnabled: reminder.reminders?.includes('WhatsApp'),
        deliveryStatus: whatsappLogs.map(log => ({
          offsetMinutes: log.offsetMinutes,
          sentAt: log.firedAt,
          status: log.status
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching WhatsApp delivery status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch WhatsApp delivery status' });
  }
});

// POST /api/reminders/:id/resend-whatsapp
router.post('/:id/resend-whatsapp', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminder = await Reminder.findOne({ _id: req.params.id, userId });
    
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    if (!reminder.whatsappPhoneNumber) return res.status(400).json({ success: false, message: 'WhatsApp phone not configured' });
    
    reminder.notificationLog = (reminder.notificationLog || []).filter(log => log.channel !== 'WhatsApp');
    await reminder.save();
    
    res.json({ success: true, data: { reminderId: reminder._id, message: 'WhatsApp will be resent within 5 minutes' } });
  } catch (error) {
    logger.error('Error resending WhatsApp:', error);
    res.status(500).json({ success: false, message: 'Failed to resend WhatsApp' });
  }
});

// PUT /api/reminders/:id/whatsapp-config
router.put('/:id/whatsapp-config', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { whatsappPhoneNumber } = req.body;
    
    if (!whatsappPhoneNumber || !/^\+?[\d\s-]{10,}$/.test(whatsappPhoneNumber.replace(/\s/g, ''))) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }
    
    const reminder = await Reminder.findOne({ _id: req.params.id, userId });
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    
    reminder.whatsappPhoneNumber = whatsappPhoneNumber;
    if (!reminder.reminders?.includes('WhatsApp')) reminder.reminders.push('WhatsApp');
    await reminder.save();
    
    res.json({ success: true, data: { reminderId: reminder._id, whatsappPhoneNumber: reminder.whatsappPhoneNumber } });
  } catch (error) {
    logger.error('Error updating WhatsApp config:', error);
    res.status(500).json({ success: false, message: 'Failed to update WhatsApp configuration' });
  }
});

// ==================== PHASE 4: TELEGRAM DELIVERY ====================

// GET /api/reminders/:id/telegram-delivery-status
router.get('/:id/telegram-delivery-status', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminder = await Reminder.findOne({ _id: req.params.id, userId }).select('notificationLog reminders telegramChatId');
    
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    
    const telegramLogs = (reminder.notificationLog || []).filter(log => log.channel === 'Telegram');
    
    res.json({
      success: true,
      data: {
        reminderId: reminder._id,
        telegramChatId: reminder.telegramChatId,
        telegramEnabled: reminder.reminders?.includes('Telegram'),
        deliveryStatus: telegramLogs.map(log => ({
          offsetMinutes: log.offsetMinutes,
          sentAt: log.firedAt,
          status: log.status
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching Telegram delivery status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch Telegram delivery status' });
  }
});

// POST /api/reminders/:id/resend-telegram
router.post('/:id/resend-telegram', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminder = await Reminder.findOne({ _id: req.params.id, userId });
    
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    if (!reminder.telegramChatId) return res.status(400).json({ success: false, message: 'Telegram chat ID not configured' });
    
    reminder.notificationLog = (reminder.notificationLog || []).filter(log => log.channel !== 'Telegram');
    await reminder.save();
    
    res.json({ success: true, data: { reminderId: reminder._id, message: 'Telegram will be resent within 5 minutes' } });
  } catch (error) {
    logger.error('Error resending Telegram:', error);
    res.status(500).json({ success: false, message: 'Failed to resend Telegram' });
  }
});

// PUT /api/reminders/:id/telegram-config
router.put('/:id/telegram-config', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { telegramChatId } = req.body;
    
    if (!telegramChatId || !/^-?\d+$/.test(String(telegramChatId).trim())) {
      return res.status(400).json({ success: false, message: 'Invalid Telegram chat ID' });
    }
    
    const reminder = await Reminder.findOne({ _id: req.params.id, userId });
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    
    reminder.telegramChatId = String(telegramChatId);
    if (!reminder.reminders?.includes('Telegram')) reminder.reminders.push('Telegram');
    await reminder.save();
    
    res.json({ success: true, data: { reminderId: reminder._id, telegramChatId: reminder.telegramChatId } });
  } catch (error) {
    logger.error('Error updating Telegram config:', error);
    res.status(500).json({ success: false, message: 'Failed to update Telegram configuration' });
  }
});

// ==================== PHASE 4: PUSH NOTIFICATIONS ====================

// GET /api/reminders/:id/push-delivery-status
router.get('/:id/push-delivery-status', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminder = await Reminder.findOne({ _id: req.params.id, userId }).select('notificationLog reminders pushEnabled');
    
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    
    const pushLogs = (reminder.notificationLog || []).filter(log => log.channel === 'Push');
    
    res.json({
      success: true,
      data: {
        reminderId: reminder._id,
        pushEnabled: reminder.pushEnabled,
        deliveryStatus: pushLogs.map(log => ({
          offsetMinutes: log.offsetMinutes,
          sentAt: log.firedAt,
          status: log.status,
          devicesReached: log.metadata?.devicesReached || 0
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching push delivery status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch push delivery status' });
  }
});

// PUT /api/reminders/:id/push-config
router.put('/:id/push-config', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { pushEnabled } = req.body;
    
    const reminder = await Reminder.findOne({ _id: req.params.id, userId });
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    
    reminder.pushEnabled = Boolean(pushEnabled);
    if (pushEnabled && !reminder.reminders?.includes('Push')) reminder.reminders.push('Push');
    else if (!pushEnabled) reminder.reminders = reminder.reminders?.filter(r => r !== 'Push') || [];
    
    await reminder.save();
    
    res.json({ success: true, data: { reminderId: reminder._id, pushEnabled: reminder.pushEnabled } });
  } catch (error) {
    logger.error('Error updating push config:', error);
    res.status(500).json({ success: false, message: 'Failed to update push configuration' });
  }
});

// ==================== PHASE 4: DELIVERY ANALYTICS ====================

// GET /api/reminders/analytics/delivery-stats
router.get('/analytics/delivery-stats', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { daysBack = 30, channel } = req.query;
    
    const ReminderDeliveryLog = require('../models/ReminderDeliveryLog');
    
    if (channel) {
      const stats = await ReminderDeliveryLog.aggregate([
        {
          $match: {
            userId,
            channel,
            createdAt: { $gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const total = stats.reduce((sum, s) => sum + s.count, 0);
      const sent = stats.find(s => s._id === 'sent')?.count || 0;
      
      res.json({
        success: true,
        data: {
          channel,
          period: `${daysBack} days`,
          total,
          sent,
          failed: stats.find(s => s._id === 'failed')?.count || 0,
          successRate: total > 0 ? ((sent / total) * 100).toFixed(2) + '%' : '0%'
        }
      });
    } else {
      const analytics = await ReminderDeliveryLog.getAnalytics(userId, daysBack);
      res.json({ success: true, data: analytics });
    }
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// GET /api/reminders/analytics/failed-deliveries
router.get('/analytics/failed-deliveries', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { channel, limit = 10 } = req.query;
    
    const ReminderDeliveryLog = require('../models/ReminderDeliveryLog');
    const query = { userId, status: 'failed', isRetry: false };
    if (channel) query.channel = channel;
    
    const failed = await ReminderDeliveryLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('reminderId', 'title dueDate');
    
    res.json({
      success: true,
      data: failed.map(log => ({
        logId: log._id,
        reminderId: log.reminderId,
        channel: log.channel,
        error: log.errorMessage,
        failedAt: log.createdAt,
        canRetry: log.retryCount < log.maxRetries
      }))
    });
  } catch (error) {
    logger.error('Error fetching failed deliveries:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch failed deliveries' });
  }
});

// POST /api/reminders/analytics/retry/:logId
router.post('/analytics/retry/:logId', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const ReminderDeliveryLog = require('../models/ReminderDeliveryLog');
    
    const log = await ReminderDeliveryLog.findById(req.params.logId);
    if (!log || log.userId !== userId) return res.status(404).json({ success: false, message: 'Log not found' });
    
    const result = await log.retry();
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error retrying delivery:', error);
    res.status(500).json({ success: false, message: 'Failed to retry delivery' });
  }
});

// ==================== PHASE 4: TEMPLATE CUSTOMIZATION ====================

// POST /api/reminders/templates - Create template
router.post('/templates', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const templateService = require('../services/reminderTemplateService');
    
    const template = await templateService.createTemplate(userId, req.body);
    
    res.status(201).json({
      success: true,
      data: { id: template._id, name: template.name, message: 'Template created successfully' }
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    res.status(500).json({ success: false, message: 'Failed to create template' });
  }
});

// GET /api/reminders/templates - List templates
router.get('/templates', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const templateService = require('../services/reminderTemplateService');
    
    const templates = await templateService.getUserTemplates(userId);
    
    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
});

// GET /api/reminders/templates/:templateId - Get single template
router.get('/templates/:templateId', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const templateService = require('../services/reminderTemplateService');
    
    const template = await templateService.getTemplate(req.params.templateId, userId);
    
    res.json({ success: true, data: template });
  } catch (error) {
    logger.error('Error fetching template:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch template' });
  }
});

// PUT /api/reminders/templates/:templateId - Update template
router.put('/templates/:templateId', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const templateService = require('../services/reminderTemplateService');
    
    const template = await templateService.updateTemplate(req.params.templateId, userId, req.body);
    
    res.json({ success: true, data: { id: template._id, message: 'Template updated successfully' } });
  } catch (error) {
    logger.error('Error updating template:', error);
    res.status(500).json({ success: false, message: 'Failed to update template' });
  }
});

// DELETE /api/reminders/templates/:templateId - Delete template
router.delete('/templates/:templateId', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const templateService = require('../services/reminderTemplateService');
    
    await templateService.deleteTemplate(req.params.templateId, userId);
    
    res.json({ success: true, data: { message: 'Template deleted successfully' } });
  } catch (error) {
    logger.error('Error deleting template:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete template' });
  }
});

// POST /api/reminders/templates/:templateId/clone - Clone template
router.post('/templates/:templateId/clone', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { newName } = req.body;
    const templateService = require('../services/reminderTemplateService');
    
    const clone = await templateService.cloneTemplate(req.params.templateId, userId, newName);
    
    res.status(201).json({ success: true, data: { id: clone._id, message: 'Template cloned successfully' } });
  } catch (error) {
    logger.error('Error cloning template:', error);
    res.status(500).json({ success: false, message: 'Failed to clone template' });
  }
});

// ==================== PHASE 5: ANALYTICS DASHBOARD ====================

// GET /api/reminders/analytics/dashboard - Get full dashboard overview
router.get('/analytics/dashboard', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const daysBack = parseInt(req.query.daysBack) || 30;
    const analyticsDashboardService = require('../services/analyticsDashboardService');
    
    const dashboardData = await analyticsDashboardService.getDashboardOverview(userId, daysBack);
    
    res.json({ success: true, data: dashboardData });
  } catch (error) {
    logger.error('Error fetching analytics dashboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics dashboard' });
  }
});

// GET /api/reminders/analytics/channel-comparison - Compare channels
router.get('/analytics/channel-comparison', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const daysBack = parseInt(req.query.daysBack) || 30;
    const analyticsDashboardService = require('../services/analyticsDashboardService');
    
    const comparison = await analyticsDashboardService.getChannelComparison(userId, daysBack);
    
    res.json({ success: true, data: comparison });
  } catch (error) {
    logger.error('Error fetching channel comparison:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch channel comparison' });
  }
});

// GET /api/reminders/analytics/reminder-types - Analyze by reminder type
router.get('/analytics/reminder-types', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const daysBack = parseInt(req.query.daysBack) || 30;
    const analyticsDashboardService = require('../services/analyticsDashboardService');
    
    const analysis = await analyticsDashboardService.getReminderTypeAnalysis(userId, daysBack);
    
    res.json({ success: true, data: analysis });
  } catch (error) {
    logger.error('Error fetching reminder type analysis:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reminder type analysis' });
  }
});

// GET /api/reminders/analytics/priority-impact - Analyze priority impact
router.get('/analytics/priority-impact', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const daysBack = parseInt(req.query.daysBack) || 30;
    const analyticsDashboardService = require('../services/analyticsDashboardService');
    
    const impact = await analyticsDashboardService.getPriorityImpactAnalysis(userId, daysBack);
    
    res.json({ success: true, data: impact });
  } catch (error) {
    logger.error('Error fetching priority impact analysis:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch priority impact analysis' });
  }
});

// GET /api/reminders/analytics/template-usage - Template usage stats
router.get('/analytics/template-usage', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const daysBack = parseInt(req.query.daysBack) || 30;
    const analyticsDashboardService = require('../services/analyticsDashboardService');
    
    const usage = await analyticsDashboardService.getTemplateUsageAnalytics(userId, daysBack);
    
    res.json({ success: true, data: usage });
  } catch (error) {
    logger.error('Error fetching template usage analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch template usage analytics' });
  }
});

// ==================== PHASE 5: BULK TEMPLATE MANAGEMENT ====================

// POST /api/reminders/bulk/apply-template - Apply template to multiple reminders
router.post('/bulk/apply-template', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { templateId, reminderIds } = req.body;
    
    if (!templateId || !Array.isArray(reminderIds) || reminderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Template ID and reminder IDs required' });
    }

    const bulkService = require('../services/bulkTemplateManagementService');
    const result = await bulkService.applyTemplateToReminders(userId, templateId, reminderIds);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error applying template in bulk:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to apply template' });
  }
});

// POST /api/reminders/bulk/snooze - Snooze multiple reminders
router.post('/bulk/snooze', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { reminderIds, snoozeMinutes } = req.body;
    
    if (!Array.isArray(reminderIds) || !snoozeMinutes) {
      return res.status(400).json({ success: false, message: 'Reminder IDs and snooze duration required' });
    }

    const bulkService = require('../services/bulkTemplateManagementService');
    const result = await bulkService.bulkSnooze(userId, reminderIds, snoozeMinutes);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error snooping reminders in bulk:', error);
    res.status(500).json({ success: false, message: 'Failed to snooze reminders' });
  }
});

// POST /api/reminders/bulk/delete - Delete multiple reminders
router.post('/bulk/delete', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { reminderIds } = req.body;
    
    if (!Array.isArray(reminderIds) || reminderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Reminder IDs required' });
    }

    const bulkService = require('../services/bulkTemplateManagementService');
    const result = await bulkService.bulkDelete(userId, reminderIds);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error deleting reminders in bulk:', error);
    res.status(500).json({ success: false, message: 'Failed to delete reminders' });
  }
});

// POST /api/reminders/bulk/update-priority - Update priority for multiple reminders
router.post('/bulk/update-priority', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { reminderIds, priority } = req.body;
    
    if (!Array.isArray(reminderIds) || !priority) {
      return res.status(400).json({ success: false, message: 'Reminder IDs and priority required' });
    }

    const bulkService = require('../services/bulkTemplateManagementService');
    const result = await bulkService.bulkUpdatePriority(userId, reminderIds, priority);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error updating priority in bulk:', error);
    res.status(500).json({ success: false, message: 'Failed to update priority' });
  }
});

// GET /api/reminders/bulk/group-summary - Get reminders grouped by field
router.get('/bulk/group-summary', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const groupBy = req.query.groupBy || 'priority';
    
    const bulkService = require('../services/bulkTemplateManagementService');
    const summary = await bulkService.getReminderGroupSummary(userId, groupBy);
    
    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Error getting group summary:', error);
    res.status(500).json({ success: false, message: 'Failed to get group summary' });
  }
});

// ==================== PHASE 5: AI TEMPLATE SUGGESTIONS ====================

// POST /api/reminders/ai-suggestions/generate - Generate AI template suggestions
router.post('/ai-suggestions/generate', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { title, description, category, priority } = req.body;
    
    if (!title || !category) {
      return res.status(400).json({ success: false, message: 'Title and category required' });
    }

    const aiService = require('../services/aiTemplateSuggestionsService');
    const suggestions = await aiService.generateSuggestions(userId, {
      title,
      description,
      category,
      priority: priority || 'medium'
    });
    
    res.json({ success: true, data: suggestions });
  } catch (error) {
    logger.error('Error generating AI suggestions:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate suggestions' });
  }
});

// POST /api/reminders/ai-suggestions/accept - Accept AI suggestion as template
router.post('/ai-suggestions/accept', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { suggestion, customName } = req.body;
    
    if (!suggestion) {
      return res.status(400).json({ success: false, message: 'Suggestion required' });
    }

    const aiService = require('../services/aiTemplateSuggestionsService');
    const result = await aiService.acceptSuggestion(userId, suggestion, customName);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error accepting suggestion:', error);
    res.status(500).json({ success: false, message: 'Failed to accept suggestion' });
  }
});

// POST /api/reminders/ai-suggestions/enhance - Enhance existing template
router.post('/ai-suggestions/enhance', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { templateId } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ success: false, message: 'Template ID required' });
    }

    const aiService = require('../services/aiTemplateSuggestionsService');
    const result = await aiService.enhanceTemplate(userId, templateId);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error enhancing template:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to enhance template' });
  }
});

// ==================== PHASE 5: TEMPLATE LIBRARY ====================

// GET /api/reminders/library/templates - Browse library templates
router.get('/library/templates', authenticate, async (req, res) => {
  try {
    const query = req.query.query || '';
    const category = req.query.category || null;
    const tags = req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) : [];
    
    const libraryService = require('../services/templateLibraryService');
    const templates = await libraryService.searchLibrary(query, category, tags);
    
    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error('Error fetching library templates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch library templates' });
  }
});

// GET /api/reminders/library/categories - Get template categories
router.get('/library/categories', authenticate, async (req, res) => {
  try {
    const libraryService = require('../services/templateLibraryService');
    const categories = await libraryService.getLibraryCategories();
    
    res.json({ success: true, data: categories });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// GET /api/reminders/library/tags - Get popular tags
router.get('/library/tags', authenticate, async (req, res) => {
  try {
    const libraryService = require('../services/templateLibraryService');
    const tags = await libraryService.getLibraryTags();
    
    res.json({ success: true, data: tags });
  } catch (error) {
    logger.error('Error fetching tags:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tags' });
  }
});

// POST /api/reminders/library/install - Install library template
router.post('/library/install', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { libraryTemplateId, customName } = req.body;
    
    if (!libraryTemplateId) {
      return res.status(400).json({ success: false, message: 'Library template ID required' });
    }

    const libraryService = require('../services/templateLibraryService');
    const result = await libraryService.installTemplate(userId, libraryTemplateId, customName);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error installing library template:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to install template' });
  }
});

// ==================== PHASE 5: WHATSAPP GROUPS ====================

// PUT /api/reminders/:id/whatsapp-group-config - Configure WhatsApp group delivery
router.put('/:id/whatsapp-group-config', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const { whatsappGroupId, whatsappGroupName } = req.body;
    
    if (!whatsappGroupId) {
      return res.status(400).json({ success: false, message: 'WhatsApp group ID required' });
    }

    const reminder = await Reminder.findOne({ _id: req.params.id, userId });
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    reminder.whatsappGroupId = whatsappGroupId;
    reminder.whatsappGroupName = whatsappGroupName || 'Default Group';
    await reminder.save();

    logger.info(`WhatsApp group configured for reminder ${req.params.id}`);

    res.json({
      success: true,
      data: {
        reminderId: reminder._id,
        whatsappGroupId,
        whatsappGroupName: reminder.whatsappGroupName,
        message: 'WhatsApp group configured successfully'
      }
    });
  } catch (error) {
    logger.error('Error configuring WhatsApp group:', error);
    res.status(500).json({ success: false, message: 'Failed to configure WhatsApp group' });
  }
});

// GET /api/reminders/:id/whatsapp-group-status - Check group delivery status
router.get('/:id/whatsapp-group-status', authenticate, async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminder = await Reminder.findOne({ _id: req.params.id, userId })
      .select('whatsappGroupId whatsappGroupName notificationLog');
    
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    const groupLogs = (reminder.notificationLog || []).filter(log => log.channel === 'whatsapp-group');

    res.json({
      success: true,
      data: {
        reminderId: reminder._id,
        whatsappGroupId: reminder.whatsappGroupId,
        whatsappGroupName: reminder.whatsappGroupName,
        deliveryStatus: groupLogs.map(log => ({
          offsetMinutes: log.offsetMinutes,
          sentAt: log.firedAt,
          status: log.status
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching WhatsApp group status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch group status' });
  }
});

module.exports = router;
module.exports.__testables = {
  getReminderOwnerId,
  parseReminderDueDate,
  buildReminderScheduleTime,
  validateReminderFields,
  normalizeTrustedContactIdentifier,
  resolveTrustedContactRecipient,
};
