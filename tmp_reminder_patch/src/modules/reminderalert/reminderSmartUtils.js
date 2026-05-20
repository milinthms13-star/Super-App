// Smart helper utilities for ReminderAlert module
// Add this file: src/modules/reminderalert/reminderSmartUtils.js

export const REMINDER_TEMPLATES = [
  { id: 'medicine', label: 'Medicine', icon: '💊', category: 'Personal', priority: 'High', title: 'Take medicine', reminders: ['In-app', 'SMS'], reminderBeforeOffsets: [0, 10] },
  { id: 'bill', label: 'Bill Payment', icon: '💳', category: 'Personal', priority: 'High', title: 'Pay bill', reminders: ['In-app'], reminderBeforeOffsets: [1440, 60] },
  { id: 'meeting', label: 'Meeting', icon: '📞', category: 'Work', priority: 'Medium', title: 'Attend meeting', reminders: ['In-app'], reminderBeforeOffsets: [15] },
  { id: 'followup', label: 'Follow up', icon: '✅', category: 'Work', priority: 'Medium', title: 'Follow up', reminders: ['In-app'], reminderBeforeOffsets: [60] },
  { id: 'birthday', label: 'Birthday', icon: '🎂', category: 'Personal', priority: 'Medium', title: 'Wish birthday', reminders: ['In-app'], reminderBeforeOffsets: [1440, 60] },
  { id: 'court', label: 'Signing / Office', icon: '📝', category: 'Urgent', priority: 'High', title: 'Weekly signing / office visit', reminders: ['In-app', 'SMS'], reminderBeforeOffsets: [1440, 120, 30] },
];

const pad = (value) => String(value).padStart(2, '0');

export const toLocalDateValue = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const toLocalTimeValue = (date = new Date()) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const addMinutes = (date, minutes) => {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
};

export const getReminderDateTime = (dueDate, dueTime = '09:00') => {
  if (!dueDate) return null;
  const [year, month, day] = String(dueDate).split('-').map(Number);
  const [hour = 9, minute = 0] = String(dueTime || '09:00').split(':').map(Number);
  if ([year, month, day, hour, minute].some(Number.isNaN)) return null;
  return new Date(year, month - 1, day, hour, minute, 0, 0);
};

export const getReminderUrgency = (reminder) => {
  if (reminder.completed) return { key: 'completed', label: 'Completed', className: 'completed' };

  const dueAt = getReminderDateTime(reminder.dueDate, reminder.dueTime);
  if (!dueAt) return { key: 'unknown', label: 'No time', className: 'neutral' };

  const diffMinutes = Math.round((dueAt.getTime() - Date.now()) / 60000);
  if (diffMinutes < 0) return { key: 'overdue', label: 'Overdue', className: 'danger' };
  if (diffMinutes <= 30) return { key: 'soon', label: 'Due soon', className: 'warning' };
  if (diffMinutes <= 24 * 60) return { key: 'today', label: 'Today', className: 'info' };
  return { key: 'upcoming', label: 'Upcoming', className: 'neutral' };
};

export const buildQuickReminder = (minutes, title = '') => {
  const dueAt = addMinutes(new Date(), minutes);
  return {
    title: title || `Reminder in ${minutes} minutes`,
    description: '',
    category: minutes <= 30 ? 'Urgent' : 'Personal',
    priority: minutes <= 30 ? 'High' : 'Medium',
    dueDate: toLocalDateValue(dueAt),
    dueTime: toLocalTimeValue(dueAt),
    reminders: ['In-app'],
    recurring: 'none',
    reminderBeforeOffsets: [0],
  };
};

export const parseNaturalReminder = (input = '') => {
  const text = String(input).trim();
  if (!text) return null;

  const lower = text.toLowerCase();
  let dueAt = new Date();
  let matched = false;

  const minutesMatch = lower.match(/(?:in|after)\s+(\d+)\s*(minute|min|minutes|mins)/);
  const hoursMatch = lower.match(/(?:in|after)\s+(\d+)\s*(hour|hr|hours|hrs)/);
  const tomorrowMatch = lower.match(/tomorrow/);
  const todayMatch = lower.match(/today/);
  const timeMatch = lower.match(/(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);

  if (minutesMatch) {
    dueAt = addMinutes(new Date(), Number(minutesMatch[1]));
    matched = true;
  } else if (hoursMatch) {
    dueAt = addMinutes(new Date(), Number(hoursMatch[1]) * 60);
    matched = true;
  } else if (tomorrowMatch) {
    dueAt.setDate(dueAt.getDate() + 1);
    dueAt.setHours(9, 0, 0, 0);
    matched = true;
  } else if (todayMatch) {
    dueAt.setHours(18, 0, 0, 0);
    matched = true;
  }

  if (timeMatch && !minutesMatch && !hoursMatch) {
    let hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2] || 0);
    const meridian = timeMatch[3];
    if (meridian === 'pm' && hour < 12) hour += 12;
    if (meridian === 'am' && hour === 12) hour = 0;
    dueAt.setHours(hour, minute, 0, 0);
    if (!todayMatch && !tomorrowMatch && dueAt.getTime() < Date.now()) {
      dueAt.setDate(dueAt.getDate() + 1);
    }
    matched = true;
  }

  const cleanedTitle = text
    .replace(/\b(remind me to|remind me|set reminder to|set reminder|today|tomorrow)\b/gi, '')
    .replace(/\b(in|after)\s+\d+\s*(minute|min|minutes|mins|hour|hr|hours|hrs)\b/gi, '')
    .replace(/\bat\s*\d{1,2}(:\d{2})?\s*(am|pm)?\b/gi, '')
    .trim();

  return {
    title: cleanedTitle || text,
    description: text,
    category: lower.includes('pay') || lower.includes('bill') ? 'Personal' : lower.includes('call') || lower.includes('meeting') ? 'Work' : 'Personal',
    priority: lower.includes('urgent') || lower.includes('medicine') || lower.includes('court') ? 'High' : 'Medium',
    dueDate: toLocalDateValue(dueAt),
    dueTime: toLocalTimeValue(dueAt),
    reminders: ['In-app'],
    recurring: 'none',
    reminderBeforeOffsets: matched ? [0, 10] : [10],
  };
};

export const buildRecurringLabel = (recurring, customRepeat) => {
  if (recurring && recurring !== 'none') return recurring;
  if (!customRepeat?.enabled) return 'none';
  return `${customRepeat.frequency || 'weekly'} ${customRepeat.days?.join(', ') || ''}`.trim();
};
