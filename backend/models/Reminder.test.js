const Reminder = require('./Reminder');

describe('Reminder model voice-call scheduling', () => {
  test('advances recurring nextCallTime from the current scheduled occurrence', () => {
    const reminder = new Reminder({
      userId: 'user-1',
      title: 'Medicine reminder',
      dueDate: new Date('2026-05-01T09:00:00.000Z'),
      dueTime: '09:00',
      reminders: ['Call'],
      recurring: 'weekly',
      recipientPhoneNumber: '+15551234567',
      voiceMessage: 'Take your medicine now.',
      nextCallTime: new Date('2026-05-08T09:00:00.000Z'),
    });

    reminder.recordCallAttempt('ringing', 'call-1');

    expect(reminder.callAttempts).toBe(1);
    expect(reminder.nextCallTime).toBeInstanceOf(Date);
    expect(reminder.nextCallTime.getFullYear()).toBe(2026);
    expect(reminder.nextCallTime.getMonth()).toBe(4);
    expect(reminder.nextCallTime.getDate()).toBe(15);
    expect(reminder.nextCallTime.getHours()).toBe(9);
    expect(reminder.nextCallTime.getMinutes()).toBe(0);
  });
});
