const test = require('node:test');
const assert = require('node:assert/strict');

const remindersRoute = require('./reminders');

const { buildReminderScheduleTime } = remindersRoute.__testables;

test('buildReminderScheduleTime keeps date-only inputs on the intended local day', () => {
  const scheduledTime = buildReminderScheduleTime('2026-04-25', '14:30');

  assert.ok(scheduledTime instanceof Date);
  assert.equal(scheduledTime.getFullYear(), 2026);
  assert.equal(scheduledTime.getMonth(), 3);
  assert.equal(scheduledTime.getDate(), 25);
  assert.equal(scheduledTime.getHours(), 14);
  assert.equal(scheduledTime.getMinutes(), 30);
});

test('buildReminderScheduleTime falls back to midnight when no due time is supplied', () => {
  const scheduledTime = buildReminderScheduleTime('2026-04-25');

  assert.ok(scheduledTime instanceof Date);
  assert.equal(scheduledTime.getFullYear(), 2026);
  assert.equal(scheduledTime.getMonth(), 3);
  assert.equal(scheduledTime.getDate(), 25);
  assert.equal(scheduledTime.getHours(), 0);
  assert.equal(scheduledTime.getMinutes(), 0);
});
