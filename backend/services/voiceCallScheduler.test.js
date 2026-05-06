jest.mock('../models/Reminder', () => ({
  find: jest.fn().mockResolvedValue([]),
}));

jest.mock('./voiceCallService', () => ({
  formatPhoneNumber: jest.fn((value) => value),
  initiateVoiceCall: jest.fn(),
}));

jest.mock('../config/websocket', () => ({
  emitToUser: jest.fn(),
}));

const Reminder = require('../models/Reminder');
const voiceCallScheduler = require('./voiceCallScheduler');

describe('VoiceCallScheduler', () => {
  beforeEach(() => {
    Reminder.find.mockClear();
  });

  test('builds one scheduled-time query that enforces due time, grace window, and attempt limits', async () => {
    await voiceCallScheduler.checkAndProcessReminders();

    expect(Reminder.find).toHaveBeenCalledTimes(1);

    const query = Reminder.find.mock.calls[0][0];
    expect(Array.isArray(query.$and)).toBe(true);
    expect(query.$and).toHaveLength(3);

    expect(query.$and[0].$expr.$lte[0]).toEqual({ $ifNull: ['$nextCallTime', '$dueDate'] });
    expect(query.$and[0].$expr.$lte[1]).toBeInstanceOf(Date);
    expect(query.$and[1].$expr.$gte[0]).toEqual({ $ifNull: ['$nextCallTime', '$dueDate'] });
    expect(query.$and[1].$expr.$gte[1]).toBeInstanceOf(Date);
    expect(query.$and[2].$expr).toEqual({ $lt: ['$callAttempts', '$maxCallAttempts'] });
  });
});
