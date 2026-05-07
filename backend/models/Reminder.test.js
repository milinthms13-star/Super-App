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

  test('does not notify while a reminder is snoozed', () => {
    const reminder = new Reminder({
      userId: 'user-2',
      title: 'Submit report',
      dueDate: new Date(Date.now() + 4 * 60 * 1000),
      reminders: ['In-app'],
      snoozedUntil: new Date(Date.now() + 30 * 60 * 1000),
    });

    expect(reminder.needsNotification()).toBe(false);
    expect(reminder.getNextNotificationOffset()).toBeNull();
  });

  test('tracks which notification offset is still pending', () => {
    const reminder = new Reminder({
      userId: 'user-3',
      title: 'Team check-in',
      dueDate: new Date(Date.now() + 4 * 60 * 1000),
      reminders: ['In-app'],
      reminderBeforeOffsets: [30, 5],
      notificationLog: [
        {
          offsetMinutes: 30,
          firedAt: new Date(),
          channel: 'In-app',
          status: 'sent',
        },
      ],
    });

    expect(reminder.needsNotification()).toBe(true);
    expect(reminder.getNextNotificationOffset()).toBe(5);

    reminder.recordNotificationSent(5, 'In-app');

    expect(reminder.notificationCount).toBe(1);
    expect(reminder.getNextNotificationOffset()).toBeNull();
  });

  test('marks voice call reminders as due only when recipient data is present and attempts remain', () => {
    const reminder = new Reminder({
      userId: 'user-4',
      title: 'Call parent',
      dueDate: new Date(Date.now() - 60 * 1000),
      reminders: ['Call'],
      recipientId: 'user-parent',
      recipientPhoneNumber: '+15551234567',
      nextCallTime: new Date(Date.now() - 60 * 1000),
      callAttempts: 1,
      maxCallAttempts: 3,
      callStatus: 'pending',
    });

    expect(reminder.isVoiceCallDue()).toBe(true);

    reminder.callAttempts = 3;

    expect(reminder.isVoiceCallDue()).toBe(false);
  });
});
