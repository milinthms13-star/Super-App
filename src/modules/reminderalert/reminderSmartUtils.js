const padDatePart = (value) => String(value).padStart(2, '0');

export const REMINDER_TEMPLATES = [
  {
    id: 'medicine',
    label: 'Medicine',
    category: 'Personal',
    priority: 'High',
    title: 'Take medicine',
    reminders: ['In-app', 'SMS'],
    reminderBeforeOffsets: [10, 0],
  },
  {
    id: 'bill',
    label: 'Bill payment',
    category: 'Personal',
    priority: 'High',
    title: 'Pay bill',
    reminders: ['In-app', 'Email'],
    reminderBeforeOffsets: [1440, 60],
  },
  {
    id: 'meeting',
    label: 'Meeting',
    category: 'Work',
    priority: 'Medium',
    title: 'Attend meeting',
    reminders: ['In-app'],
    reminderBeforeOffsets: [30, 10],
  },
  {
    id: 'birthday',
    label: 'Birthday',
    category: 'Personal',
    priority: 'Medium',
    title: 'Wish birthday',
    reminders: ['In-app', 'WhatsApp'],
    reminderBeforeOffsets: [1440, 60],
  },
  {
    id: 'followup',
    label: 'Follow up',
    category: 'Work',
    priority: 'Medium',
    title: 'Client follow up',
    reminders: ['In-app', 'SMS'],
    reminderBeforeOffsets: [60, 15],
  },
];

export const toLocalDateValue = (date = new Date()) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const toLocalTimeValue = (date = new Date()) =>
  `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;

const addMinutes = (date, minutes) => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + Number(minutes || 0));
  return result;
};

export const buildQuickReminder = (minutes = 10) => {
  const dueAt = addMinutes(new Date(), minutes);
  return {
    title: `Reminder in ${minutes} minutes`,
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
  const text = String(input || '').trim();
  if (!text) return null;

  const lowerText = text.toLowerCase();
  const now = new Date();
  let dueAt = new Date(now);
  let matched = false;

  const minutesMatch = lowerText.match(/(?:in|after)\s+(\d+)\s*(minute|min|minutes|mins)\b/);
  const hoursMatch = lowerText.match(/(?:in|after)\s+(\d+)\s*(hour|hr|hours|hrs)\b/);
  const tomorrowMatch = /\btomorrow\b/.test(lowerText);
  const todayMatch = /\btoday\b/.test(lowerText);
  const timeMatch = lowerText.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);

  if (minutesMatch) {
    dueAt = addMinutes(now, Number(minutesMatch[1]));
    matched = true;
  } else if (hoursMatch) {
    dueAt = addMinutes(now, Number(hoursMatch[1]) * 60);
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
    if (!todayMatch && !tomorrowMatch && dueAt.getTime() < now.getTime()) {
      dueAt.setDate(dueAt.getDate() + 1);
    }
    matched = true;
  }

  const cleanedTitle = text
    .replace(/\b(remind me to|remind me|set reminder to|set reminder)\b/gi, '')
    .replace(/\b(today|tomorrow)\b/gi, '')
    .replace(/\b(in|after)\s+\d+\s*(minute|min|minutes|mins|hour|hr|hours|hrs)\b/gi, '')
    .replace(/\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    title: cleanedTitle || text,
    description: text,
    category: /\b(call|meeting|client)\b/.test(lowerText) ? 'Work' : 'Personal',
    priority: /\b(urgent|medicine|doctor|hospital)\b/.test(lowerText) ? 'High' : 'Medium',
    dueDate: toLocalDateValue(dueAt),
    dueTime: toLocalTimeValue(dueAt),
    reminders: ['In-app'],
    recurring: 'none',
    reminderBeforeOffsets: matched ? [10, 0] : [10],
  };
};

export const getReminderDateTime = (dueDate, dueTime = '') => {
  if (!dueDate) return null;
  const dateText = String(dueDate).slice(0, 10);
  const [year, month, day] = dateText.split('-').map((part) => parseInt(part, 10));
  if ([year, month, day].some((part) => Number.isNaN(part))) return null;

  const result = new Date(year, month - 1, day);
  if (dueTime) {
    const [hour, minute] = String(dueTime).split(':').map((part) => parseInt(part, 10));
    if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
      result.setHours(hour, minute, 0, 0);
      return result;
    }
  }

  result.setHours(0, 0, 0, 0);
  return result;
};

export const getReminderUrgency = (reminder) => {
  if (reminder?.completed) {
    return { key: 'completed', label: 'Completed', className: 'neutral' };
  }

  const dueAt = getReminderDateTime(reminder?.dueDate, reminder?.dueTime);
  if (!dueAt) {
    return { key: 'unknown', label: 'No due time', className: 'neutral' };
  }

  const minutesUntilDue = Math.round((dueAt.getTime() - Date.now()) / 60000);
  if (minutesUntilDue < 0) {
    return { key: 'overdue', label: 'Overdue', className: 'danger' };
  }
  if (minutesUntilDue <= 30) {
    return { key: 'soon', label: 'Due soon', className: 'warning' };
  }
  if (minutesUntilDue <= 24 * 60) {
    return { key: 'today', label: 'Today', className: 'info' };
  }

  return { key: 'upcoming', label: 'Upcoming', className: 'neutral' };
};
