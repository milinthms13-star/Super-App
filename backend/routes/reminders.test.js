const mongoose = require('mongoose');
const remindersRouter = require('./reminders');

describe('reminder route helpers', () => {
  test('normalizes authenticated user ids to strings for reminder queries and stats', () => {
    const { getReminderOwnerId } = remindersRouter.__testables;
    const objectId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');

    expect(getReminderOwnerId({ _id: objectId })).toBe('507f1f77bcf86cd799439011');
    expect(getReminderOwnerId({ id: 'user-42' })).toBe('user-42');
  });

  test('validates partial reminder updates without requiring a full payload', () => {
    const { validateReminderFields, parseReminderDueDate } = remindersRouter.__testables;

    expect(validateReminderFields({ category: 'Other' }, { partial: true })).toBe('Invalid category');
    expect(validateReminderFields({ reminders: [] }, { partial: true })).toBe('Select at least one reminder type');
    expect(validateReminderFields({ title: 'Call customer' }, { partial: true })).toBe('');
    expect(parseReminderDueDate('2030-05-12T00:00:00.000Z')?.toISOString()).toBe('2030-05-12T00:00:00.000Z');
    expect(parseReminderDueDate('not-a-date')).toBeNull();
  });
});
