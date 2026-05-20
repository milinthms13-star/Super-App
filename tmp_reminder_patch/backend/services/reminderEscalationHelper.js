// Add this file: backend/services/reminderEscalationHelper.js

const getNextNotificationTimes = (reminder) => {
  const dueDate = reminder.dueDate instanceof Date ? reminder.dueDate : new Date(reminder.dueDate);
  const dueTime = reminder.dueTime || '09:00';
  const [hour = 9, minute = 0] = String(dueTime).split(':').map(Number);
  const dueAt = new Date(dueDate);
  dueAt.setHours(hour, minute, 0, 0);

  const offsets = Array.isArray(reminder.reminderBeforeOffsets) && reminder.reminderBeforeOffsets.length
    ? reminder.reminderBeforeOffsets
    : [5];

  return offsets
    .map((offsetMinutes) => ({
      offsetMinutes: Number(offsetMinutes),
      notifyAt: new Date(dueAt.getTime() - Number(offsetMinutes) * 60000),
    }))
    .filter((item) => item.notifyAt.getTime() >= Date.now())
    .sort((a, b) => a.notifyAt - b.notifyAt);
};

const getLeadStatus = (reminder) => {
  if (reminder.completed) return 'Completed';
  const dueAt = new Date(reminder.dueDate);
  const [hour = 9, minute = 0] = String(reminder.dueTime || '09:00').split(':').map(Number);
  dueAt.setHours(hour, minute, 0, 0);

  if (dueAt.getTime() < Date.now()) return 'Missed';
  if ((reminder.reminders || []).length > 1 || (reminder.sharedWithTrustedContacts || []).length > 0) {
    return 'Escalation armed';
  }
  return 'Reminder scheduled';
};

module.exports = {
  getNextNotificationTimes,
  getLeadStatus,
};
