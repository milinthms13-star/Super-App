const mongoose = require('mongoose');

const normalizeDay = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const diaryCalendarItemSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['note', 'reminder'],
      default: 'note',
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 1500,
      default: '',
    },
    reminderAt: {
      type: Date,
      default: null,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

diaryCalendarItemSchema.pre('validate', function diaryCalendarItemPreValidate(next) {
  if (this.date) {
    this.date = normalizeDay(this.date);
  }

  if (this.type === 'reminder' && !this.reminderAt) {
    return next(new Error('Reminder time is required for reminders'));
  }

  if (this.type !== 'reminder') {
    this.reminderAt = null;
  }

  return next();
});

diaryCalendarItemSchema.index({ userId: 1, date: 1, createdAt: 1 });
diaryCalendarItemSchema.index({ userId: 1, reminderAt: 1 });

module.exports = mongoose.model('DiaryCalendarItem', diaryCalendarItemSchema);
