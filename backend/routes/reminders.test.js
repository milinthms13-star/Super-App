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

  test('resolves trusted contact recipients by id, email, and username safely', async () => {
    const { normalizeTrustedContactIdentifier, resolveTrustedContactRecipient } = remindersRouter.__testables;
    const objectId = '507f1f77bcf86cd799439011';
    const userById = { _id: objectId };
    const userByEmail = { _id: 'email-user' };
    const userByUsername = { _id: 'username-user' };
    const UserModel = {
      findById: jest.fn().mockResolvedValue(userById),
      findOne: jest.fn().mockResolvedValueOnce(userByEmail).mockResolvedValueOnce(userByUsername),
    };

    expect(normalizeTrustedContactIdentifier('  Friend@Email.com  ')).toBe('Friend@Email.com');
    await expect(resolveTrustedContactRecipient(UserModel, objectId)).resolves.toBe(userById);
    await expect(resolveTrustedContactRecipient(UserModel, 'Friend@Email.com')).resolves.toBe(userByEmail);
    await expect(resolveTrustedContactRecipient(UserModel, 'Friend_User')).resolves.toBe(userByUsername);

    expect(UserModel.findById).toHaveBeenCalledTimes(1);
    expect(UserModel.findById).toHaveBeenCalledWith(objectId);
    expect(UserModel.findOne).toHaveBeenNthCalledWith(1, { email: 'friend@email.com' });
    expect(UserModel.findOne).toHaveBeenNthCalledWith(2, { username: 'friend_user' });
  });
});
