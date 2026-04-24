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
const fs = require('fs');

// File upload configuration
const uploadDir = path.join(__dirname, '../uploads/reminders');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'reminder-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow specific file types
  const allowedMimes = [
    'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio, image, video, and document files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
});

const VALID_CATEGORIES = ['Work', 'Personal', 'Urgent'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_REMINDERS = ['In-app', 'SMS', 'Call'];
const VALID_RECURRING = ['none', 'daily', 'weekly', 'monthly'];
const VALID_FILE_TYPES = ['voice', 'image', 'document', 'video', 'audio'];

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
      completed,
      recipientPhoneNumber,
      voiceMessage,
      messageType
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
      reminder.recipientPhoneNumber = String(recipientPhoneNumber || "").trim();
    }
    if (voiceMessage !== undefined) {
      reminder.voiceMessage = String(voiceMessage || "").trim();
    }
    if (messageType !== undefined && ['text', 'audio'].includes(messageType)) {
      reminder.messageType = messageType;
    }

    if (reminders !== undefined && !reminders.includes('Call')) {
      reminder.recipientPhoneNumber = '';
      reminder.voiceMessage = '';
      reminder.messageType = 'text';
      reminder.callStatus = 'pending';
      reminder.lastCallTime = undefined;
      reminder.nextCallTime = undefined;
    }

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

// ============ TRUSTED CONTACTS ENDPOINTS ============

// Import TrustedReminderContact model
const TrustedReminderContact = require('../models/TrustedReminderContact');

// POST /api/reminders/trusted-contacts/invite - Send invite to become trusted contact
router.post('/trusted-contacts/invite', async (req, res) => {
  try {
    const senderId = getReminderOwnerId(req.user);
    const { recipientId, message, relationship = 'other' } = req.body;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required'
      });
    }

    if (senderId === recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add yourself as a trusted contact'
      });
    }

    // Check if User exists
    const User = require('../models/User');
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found'
      });
    }

    // Check if relationship already exists
    const existing = await TrustedReminderContact.findOne({
      senderId,
      recipientId,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This user is already a trusted contact or invite is pending'
      });
    }

    const trustedContact = new TrustedReminderContact({
      senderId,
      recipientId,
      message: message || 'I would like to add you as a trusted contact for my reminders',
      relationship
    });

    await trustedContact.save();

    logger.info(`Trusted contact invite sent from ${senderId} to ${recipientId}`);

    res.status(201).json({
      success: true,
      data: trustedContact,
      message: 'Invite sent successfully'
    });
  } catch (error) {
    logger.error('Error sending trusted contact invite:', error);
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

    reminder.sharedWithTrustedContacts = contactIds;
    reminder.trustedContactAcknowledgments = contactIds.map(id => ({
      contactId: id,
      acknowledged: false
    }));

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
router.get('/shared-with-me/list', async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);

    const reminders = await Reminder.find({
      sharedWithTrustedContacts: userId
    })
      .populate('userId', 'username email name profilePicture')
      .sort({ dueDate: 1, createdAt: -1 });

    res.json({
      success: true,
      data: reminders
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

// ============ FILE ATTACHMENT ENDPOINTS ============

// POST /api/reminders/:id/attachments - Upload file attachment to reminder
router.post('/:id/attachments', authenticate, upload.single('file'), async (req, res) => {
  try {
    const userId = getReminderOwnerId(req.user);
    const reminderId = req.params.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const reminder = await Reminder.findOne({
      _id: reminderId,
      userId: userId
    });

    if (!reminder) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    // Determine file type based on MIME type
    let fileType = 'document';
    if (req.file.mimetype.startsWith('audio/')) {
      fileType = 'audio';
    } else if (req.file.mimetype.startsWith('image/')) {
      fileType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      fileType = 'video';
    }

    // Construct file URL (assuming files are served from /uploads/reminders/)
    const fileUrl = `/uploads/reminders/${req.file.filename}`;

    // Extract metadata
    const { description, duration } = req.body;

    const attachment = {
      fileName: req.file.originalname,
      fileType,
      mimeType: req.file.mimetype,
      fileUrl,
      fileSize: req.file.size,
      uploadedBy: userId,
      uploadedByName: req.user?.name || req.user?.username || 'User',
      description: description || '',
      ...(duration && { duration: parseInt(duration) })
    };

    reminder.addAttachment(attachment);
    await reminder.save();

    logger.info(`File attachment added to reminder ${reminderId}`);

    res.status(201).json({
      success: true,
      data: {
        reminderId,
        attachment: reminder.attachments[reminder.attachments.length - 1]
      },
      message: 'File uploaded successfully'
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    logger.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
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

// DELETE /api/reminders/:id/attachments/:attachmentId - Delete attachment from reminder
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

    // Find and remove attachment
    const attachment = reminder.attachments.find(
      (att) => att._id.toString() === attachmentId
    );

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Delete file from disk
    const filePath = path.join(__dirname, '..', attachment.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    reminder.removeAttachment(attachmentId);
    await reminder.save();

    logger.info(`Attachment deleted from reminder ${reminderId}`);

    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting attachment:', error);
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

module.exports = router;
module.exports.__testables = {
  getReminderOwnerId,
  parseReminderDueDate,
  validateReminderFields,
};
