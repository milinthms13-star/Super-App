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
    enum: ['In-app', 'SMS', 'Call']
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

// Method to check if reminder needs notification
reminderSchema.methods.needsNotification = function() {
  if (this.completed) return false;
  const now = new Date();
  const dueDateTime = this.dueTime ?
    new Date(`${this.dueDate.toISOString().split('T')[0]}T${this.dueTime}`) :
    new Date(this.dueDate);

  // Notify 5 minutes before due time
  const notifyTime = new Date(dueDateTime.getTime() - 5 * 60 * 1000);
  return now >= notifyTime && (!this.lastNotified || this.lastNotified < notifyTime);
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
  this.callHistory.push({
    callTime: new Date(),
    status,
    callId,
    error
  });
  
  this.lastCallTime = new Date();
  this.callAttempts += 1;
  this.callStatus = status;

  // Calculate next call time if recurring
  if (this.recurring !== 'none') {
    this.nextCallTime = this.calculateNextCallTime();
  } else if (status === 'completed' || this.callAttempts >= this.maxCallAttempts) {
    this.callStatus = 'completed';
  }
};

module.exports = mongoose.model('Reminder', reminderSchema);