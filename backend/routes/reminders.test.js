const remindersRoute = require('./reminders');

const {
  buildReminderScheduleTime,
  resolveTrustedContactRecipient,
  validateReminderFields,
} = remindersRoute.__testables;

describe('reminders route helpers', () => {
  test('buildReminderScheduleTime keeps date-only inputs on the intended local day', () => {
    const scheduledTime = buildReminderScheduleTime('2026-04-25', '14:30');

    expect(scheduledTime).toBeInstanceOf(Date);
    expect(scheduledTime.getFullYear()).toBe(2026);
    expect(scheduledTime.getMonth()).toBe(3);
    expect(scheduledTime.getDate()).toBe(25);
    expect(scheduledTime.getHours()).toBe(14);
    expect(scheduledTime.getMinutes()).toBe(30);
  });

  test('buildReminderScheduleTime falls back to midnight when no due time is supplied', () => {
    const scheduledTime = buildReminderScheduleTime('2026-04-25');

    expect(scheduledTime).toBeInstanceOf(Date);
    expect(scheduledTime.getFullYear()).toBe(2026);
    expect(scheduledTime.getMonth()).toBe(3);
    expect(scheduledTime.getDate()).toBe(25);
    expect(scheduledTime.getHours()).toBe(0);
    expect(scheduledTime.getMinutes()).toBe(0);
  });

  test('buildReminderScheduleTime falls back to midnight when due time is invalid', () => {
    const scheduledTime = buildReminderScheduleTime('2026-04-25', 'bad-time');

    expect(scheduledTime).toBeInstanceOf(Date);
    expect(scheduledTime.getFullYear()).toBe(2026);
    expect(scheduledTime.getMonth()).toBe(3);
    expect(scheduledTime.getDate()).toBe(25);
    expect(scheduledTime.getHours()).toBe(0);
    expect(scheduledTime.getMinutes()).toBe(0);
  });

  test('validateReminderFields rejects invalid reminder types', () => {
    const validationMessage = validateReminderFields({
      title: 'Follow up',
      dueDate: '2026-04-25',
      reminders: ['WhatsApp'],
    });

    expect(validationMessage).toBe('Invalid reminder types');
  });

  test('validateReminderFields allows partial updates without title when not provided', () => {
    const validationMessage = validateReminderFields(
      {
        completed: true,
      },
      { partial: true }
    );

    expect(validationMessage).toBe('');
  });

  test('validateReminderFields rejects invalid due dates during partial updates', () => {
    const validationMessage = validateReminderFields(
      {
        dueDate: 'not-a-date',
      },
      { partial: true }
    );

    expect(validationMessage).toBe('Invalid due date');
  });

  test('resolveTrustedContactRecipient normalizes email lookups', async () => {
    const UserModel = {
      findById: jest.fn(),
      findOne: jest.fn().mockResolvedValue({ _id: 'contact-1', email: 'friend@example.com' }),
    };

    const result = await resolveTrustedContactRecipient(UserModel, 'Friend@Example.com');

    expect(UserModel.findById).not.toHaveBeenCalled();
    expect(UserModel.findOne).toHaveBeenCalledWith({ email: 'friend@example.com' });
    expect(result).toEqual({ _id: 'contact-1', email: 'friend@example.com' });
  });

  test('resolveTrustedContactRecipient returns null for blank identifiers', async () => {
    const UserModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
    };

    const result = await resolveTrustedContactRecipient(UserModel, '   ');

    expect(result).toBeNull();
    expect(UserModel.findById).not.toHaveBeenCalled();
    expect(UserModel.findOne).not.toHaveBeenCalled();
  });
});
