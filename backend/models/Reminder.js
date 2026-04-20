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
  }
}, {
  timestamps: true
});

// Index for efficient queries
reminderSchema.index({ userId: 1, dueDate: 1 });
reminderSchema.index({ userId: 1, completed: 1 });
reminderSchema.index({ userId: 1, category: 1 });

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

module.exports = mongoose.model('Reminder', reminderSchema);