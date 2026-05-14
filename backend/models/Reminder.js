const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  category: {
    type: String,
    enum: ['Work', 'Personal', 'Urgent'],
    default: 'Work'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  dueDate: {
    type: Date,
    required: true
  },
  dueTime: {
    type: String,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  reminders: [{
    type: String,
    enum: ['Email', 'In-app', 'SMS', 'Call']
  }],
  recurring: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none'
  },
  status: {
    type: String,
    enum: ['Reminder scheduled', 'Escalation armed', 'Retry enabled', 'Completed'],
    default: 'Reminder scheduled'
  },
  lastNotified: {
    type: Date
  },
  notificationCount: {
    type: Number,
    default: 0
  },
  // Voice call reminder fields
  recipientId: {
    type: String,  // User ID of person receiving the reminder
  },
  recipientPhoneNumber: {
    type: String,  // Phone number to call
  },
  voiceMessage: {
    type: String,  // The message content (text or description)
    maxlength: 2000
  },
  messageType: {
    type: String,
    enum: ['text', 'audio'],  // 'text' for TTS, 'audio' for pre-recorded
    default: 'text'
  },
  voiceNoteUrl: {
    type: String   // S3 URL if using pre-recorded audio
  },
  callStatus: {
    type: String,
    enum: ['pending', 'ringing', 'answered', 'failed', 'completed', 'no-answer'],
    default: 'pending'
  },
  lastCallTime: {
    type: Date
  },
  nextCallTime: {
    type: Date   // Next scheduled call time for recurring reminders
  },
  callHistory: [{
    callTime: Date,
    status: String,  // 'answered', 'no-answer', 'failed'
    duration: Number,  // in seconds
    callId: String,  // Twilio call SID
    error: String
  }],
  callAttempts: {
    type: Number,
    default: 0
  },
  maxCallAttempts: {
    type: Number,
    default: 3  // Maximum number of call attempts
  },
  // Trusted contacts feature - sharing reminders with trusted persons
  sharedWithTrustedContacts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Track which trusted contacts have accepted/acknowledged this reminder
  trustedContactAcknowledgments: [{
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedAt: {
      type: Date,
      sparse: true
    }
  }],
  // File attachments - voice notes, images, documents
  attachments: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      enum: ['voice', 'image', 'document', 'video', 'audio'],
      required: true,
    },
    mimeType: {
      type: String,
      default: 'application/octet-stream',
    },
    fileUrl: {
      type: String,
      required: true, // S3 or cloud storage URL
    },
    s3Key: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number, // Size in bytes
    },
    duration: {
      type: Number, // For audio/video files, duration in seconds
      sparse: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    uploadedByName: {
      type: String, // Store name for quick display
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      sparse: true,
    },
  }],
  // PHASE 1 FEATURES START
  
  // Snooze functionality
  snoozedUntil: {
    type: Date,
    sparse: true  // When snooze expires, reminder becomes active again
  },
  snoozeCount: {
    type: Number,
    default: 0  // How many times user snoozed this reminder
  },
  snoozeHistory: [{
    snoozedAt: {
      type: Date,
      default: Date.now
    },
    snoozedUntil: Date,
    snoozeDuration: Number  // In minutes
  }],
  snoozeOptions: {
    type: [Number],
    default: [5, 10, 15, 30]  // Available snooze durations in minutes
  },
  
  // Configurable remind-before offsets
  reminderBeforeOffsets: {
    type: [Number],
    default: [5]  // Remind X minutes before due time (in minutes)
  },
  notificationLog: [{
    offsetMinutes: Number,  // Which offset triggered this notification
    firedAt: {
      type: Date,
      default: Date.now
    },
    channel: String,  // 'In-app', 'SMS', 'Call'
    status: String    // 'sent', 'failed', 'pending'
  }],
  
  // Missed reminder tracking
  missedAt: {
    type: Date,
    sparse: true  // When marked as missed
  },
  missedHistory: [{
    missedAt: {
      type: Date,
      default: Date.now
    },
    resendAt: Date,  // When it was resent
    status: {
      type: String,
      enum: ['pending', 'resent', 'acknowledged'],
      default: 'pending'
    }
  }],
  // PHASE 1 FEATURES END

  // Phase 3 Email field
  email: {
    type: String,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // Email validation regex
  },

  // Phase 4: WhatsApp, Telegram, Push delivery fields
  whatsappPhoneNumber: {
    type: String  // Phone number for WhatsApp delivery
  },
  telegramChatId: {
    type: String  // Telegram chat ID for delivery
  },
  pushEnabled: {
    type: Boolean,
    default: false  // Push notifications to user devices
  },

  // Phase 4: Template customization
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReminderTemplate'  // Custom template for this reminder
  },

  // Phase 4: Delivery analytics tracking
  deliveryStats: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    successfulDeliveries: {
      type: Number,
      default: 0
    },
    failedDeliveries: {
      type: Number,
      default: 0
    },
    lastDeliveryAttempt: Date,
    lastSuccessfulDelivery: Date
  },

  // Phase 5: WhatsApp Groups support
  whatsappGroupId: {
    type: String  // WhatsApp group ID for bulk group delivery
  },
  whatsappGroupName: {
    type: String  // Display name of the group
  }
}, {
  timestamps: true
});

// Index for efficient queries
reminderSchema.index({ userId: 1, dueDate: 1 });
reminderSchema.index({ userId: 1, completed: 1 });
reminderSchema.index({ userId: 1, category: 1 });
reminderSchema.index({ recipientId: 1, callStatus: 1 });  // For finding pending calls
reminderSchema.index({ nextCallTime: 1, callStatus: 1 });  // For scheduler to find due reminders
reminderSchema.index({ "attachments._id": 1 });  // For finding reminders by attachment ID
// Phase 1 indexes
reminderSchema.index({ userId: 1, snoozedUntil: 1 });  // For snoozed reminders
reminderSchema.index({ userId: 1, missedAt: 1 });  // For missed reminders
reminderSchema.index({ userId: 1, completed: 1, missedAt: 1 });  // For missed reminders list

// Virtual for formatted due date
reminderSchema.virtual('formattedDueDate').get(function() {
  if (!this.dueDate) return '';
  const now = new Date();
  const diffDays = Math.floor((this.dueDate - now) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return `Today${this.dueTime ? `, ${this.dueTime}` : ''}`;
  if (diffDays === 1) return `Tomorrow${this.dueTime ? `, ${this.dueTime}` : ''}`;
  if (diffDays === -1) return `Yesterday${this.dueTime ? `, ${this.dueTime}` : ''}`;
  if (diffDays > 1 && diffDays < 7) {
    return this.dueDate.toLocaleDateString('en-US', { weekday: 'long' }) +
           `${this.dueTime ? `, ${this.dueTime}` : ''}`;
  }
  return this.dueDate.toLocaleDateString() + `${this.dueTime ? `, ${this.dueTime}` : ''}`;
});

// Method to check if reminder is due
reminderSchema.methods.isDue = function() {
  if (this.completed) return false;
  const now = new Date();
  const dueDateTime = this.dueTime ?
    new Date(`${this.dueDate.toISOString().split('T')[0]}T${this.dueTime}`) :
    new Date(this.dueDate);
  return dueDateTime <= now;
};

// Method to check if reminder needs notification (supports multiple offsets)
reminderSchema.methods.needsNotification = function() {
  if (this.completed) return false;
  if (this.snoozedUntil && this.snoozedUntil > new Date()) return false;  // Skip if snoozed
  
  const now = new Date();
  const dueDateTime = this.dueTime ?
    new Date(`${this.dueDate.toISOString().split('T')[0]}T${this.dueTime}`) :
    new Date(this.dueDate);

  // Check each configured remind-before offset
  const offsets = this.reminderBeforeOffsets && this.reminderBeforeOffsets.length > 0
    ? this.reminderBeforeOffsets
    : [5];  // Default to 5 minutes if not configured

  for (const offsetMinutes of offsets) {
    const notifyTime = new Date(dueDateTime.getTime() - offsetMinutes * 60 * 1000);
    
    // Check if we should notify at this offset
    const alreadyNotified = this.notificationLog &&
      this.notificationLog.some(log => log.offsetMinutes === offsetMinutes && log.firedAt);
    
    if (now >= notifyTime && !alreadyNotified) {
      return true;  // Need to notify at this offset
    }
  }
  
  return false;
};

// Method to get next notification offset needed
reminderSchema.methods.getNextNotificationOffset = function() {
  if (this.completed) return null;
  if (this.snoozedUntil && this.snoozedUntil > new Date()) return null;
  
  const now = new Date();
  const dueDateTime = this.dueTime ?
    new Date(`${this.dueDate.toISOString().split('T')[0]}T${this.dueTime}`) :
    new Date(this.dueDate);

  const offsets = this.reminderBeforeOffsets && this.reminderBeforeOffsets.length > 0
    ? this.reminderBeforeOffsets
    : [5];

  for (const offsetMinutes of offsets) {
    const notifyTime = new Date(dueDateTime.getTime() - offsetMinutes * 60 * 1000);
    const alreadyNotified = this.notificationLog &&
      this.notificationLog.some(log => log.offsetMinutes === offsetMinutes && log.firedAt);
    
    if (now >= notifyTime && !alreadyNotified) {
      return offsetMinutes;
    }
  }
  
  return null;
};

// Method to calculate next call time for recurring reminders
reminderSchema.methods.calculateNextCallTime = function(baseDate = null) {
  const reference = baseDate || this.dueDate || new Date();
  const next = new Date(reference);

  switch(this.recurring) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'none':
    default:
      return null; // No recurring, no next call time
  }

  // Apply time if specified
  if (this.dueTime) {
    const [hours, minutes] = this.dueTime.split(':');
    next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }

  return next;
};

// Method to check if voice call reminder is due
reminderSchema.methods.isVoiceCallDue = function() {
  if (this.completed || !this.recipientId || !this.recipientPhoneNumber) return false;
  if (this.callAttempts >= this.maxCallAttempts) return false;
  
  const now = new Date();
  const nextCall = this.nextCallTime || this.dueDate;
  return nextCall && nextCall <= now && this.callStatus !== 'completed';
};

// Method to record a call attempt
reminderSchema.methods.recordCallAttempt = function(status, callId, error = null) {
  const attemptTime = new Date();
  const nextScheduledOccurrence = this.nextCallTime || this.lastCallTime || this.dueDate || attemptTime;

  this.callHistory.push({
    callTime: attemptTime,
    status,
    callId,
    error
  });
  
  this.lastCallTime = attemptTime;
  this.callAttempts += 1;
  this.callStatus = status;

  // Calculate next call time if recurring
  if (this.recurring !== 'none') {
    this.nextCallTime = this.calculateNextCallTime(nextScheduledOccurrence);
    this.callStatus = 'pending';
  } else if (status === 'completed' || this.callAttempts >= this.maxCallAttempts) {
    this.callStatus = 'completed';
  }
};

// Method to add attachment to reminder
reminderSchema.methods.addAttachment = function(attachmentData) {
  if (!this.attachments) {
    this.attachments = [];
  }
  this.attachments.push(attachmentData);
  return this;
};

// Method to remove attachment from reminder
reminderSchema.methods.removeAttachment = function(attachmentId) {
  if (this.attachments) {
    this.attachments = this.attachments.filter(
      (att) => att._id.toString() !== attachmentId.toString()
    );
  }
  return this;
};

// Method to get attachments by type
reminderSchema.methods.getAttachmentsByType = function(fileType) {
  if (!this.attachments) return [];
  return this.attachments.filter((att) => att.fileType === fileType);
};

// PHASE 1: Snooze functionality
reminderSchema.methods.snooze = function(minutesToSnooze) {
  const snoozedUntil = new Date();
  snoozedUntil.setMinutes(snoozedUntil.getMinutes() + minutesToSnooze);
  
  this.snoozedUntil = snoozedUntil;
  this.snoozeCount = (this.snoozeCount || 0) + 1;
  
  this.snoozeHistory.push({
    snoozedAt: new Date(),
    snoozedUntil: snoozedUntil,
    snoozeDuration: minutesToSnooze
  });
  
  return this;
};

// PHASE 1: Check if reminder is snoozed
reminderSchema.methods.isSnoozed = function() {
  return this.snoozedUntil && this.snoozedUntil > new Date();
};

// PHASE 1: Mark reminder as missed
reminderSchema.methods.markAsMissed = function() {
  if (!this.missedAt) {
    this.missedAt = new Date();
    this.status = 'Missed';
  }
  
  if (!this.missedHistory) {
    this.missedHistory = [];
  }
  
  this.missedHistory.push({
    missedAt: new Date(),
    status: 'pending'
  });
  
  return this;
};

// PHASE 1: Record notification sent for specific offset
reminderSchema.methods.recordNotificationSent = function(offsetMinutes, channel) {
  if (!this.notificationLog) {
    this.notificationLog = [];
  }
  
  this.notificationLog.push({
    offsetMinutes: offsetMinutes,
    firedAt: new Date(),
    channel: channel,
    status: 'sent'
  });
  
  this.lastNotified = new Date();
  this.notificationCount = (this.notificationCount || 0) + 1;
  
  return this;
};

// PHASE 1: Mark reminder as missed and record in history
reminderSchema.methods.recordMissedReminder = function() {
  if (!this.missedHistory) {
    this.missedHistory = [];
  }
  
  this.missedHistory.push({
    missedAt: new Date(),
    status: 'pending'
  });
  
  if (!this.missedAt) {
    this.missedAt = new Date();
  }
  
  return this;
};

module.exports = mongoose.model('Reminder', reminderSchema);
