jest.mock('../models/Reminder', () => ({
  find: jest.fn().mockResolvedValue([]),
}));

jest.mock('../models/User', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../models/Chat', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../models/Call', () => ({
  create: jest.fn(),
}));

jest.mock('./voiceCallService', () => ({
  formatPhoneNumber: jest.fn((value) => value),
  initiateVoiceCall: jest.fn(),
}));

jest.mock('../config/websocket', () => ({
  emitToUser: jest.fn(),
}));

const Reminder = require('../models/Reminder');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Call = require('../models/Call');
const voiceCallService = require('./voiceCallService');
const { emitToUser } = require('../config/websocket');
const voiceCallScheduler = require('./voiceCallScheduler');

describe('VoiceCallScheduler', () => {
  beforeEach(() => {
    Reminder.find.mockClear();
    User.findById.mockReset();
    User.findOne.mockReset();
    Chat.findOne.mockReset();
    Chat.create.mockReset();
    Call.create.mockReset();
    voiceCallService.formatPhoneNumber.mockClear();
    voiceCallService.initiateVoiceCall.mockReset();
    emitToUser.mockReset();
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

  test('uses chat-module call for registered numbers before mobile fallback', async () => {
    const reminder = {
      _id: 'rem-1',
      title: 'Medicine reminder',
      userId: '507f1f77bcf86cd799439011',
      recipientId: '',
      recipientPhoneNumber: '+919876543210',
      voiceMessage: 'Take your medicine now',
      messageType: 'text',
      senderName: 'Dhanya',
      voiceNoteUrl: '',
      recordCallAttempt: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const recipientUser = { _id: '507f1f77bcf86cd799439012' };
    const chat = { _id: '507f1f77bcf86cd799439013' };
    const call = { _id: '507f1f77bcf86cd799439014', status: 'ringing' };

    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(recipientUser),
    });
    Chat.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(chat),
    });
    Call.create.mockResolvedValue(call);
    voiceCallService.initiateVoiceCall.mockResolvedValue({
      status: 'ringing',
      callId: 'mobile-call-1',
    });

    await voiceCallScheduler.processReminder(reminder);

    expect(User.findOne).toHaveBeenCalled();
    expect(Call.create).toHaveBeenCalledTimes(1);
    expect(emitToUser).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      'call:incoming',
      expect.objectContaining({
        reminderId: 'rem-1',
        messageType: 'text',
      })
    );
    expect(voiceCallService.initiateVoiceCall).not.toHaveBeenCalled();
    expect(reminder.recordCallAttempt).toHaveBeenCalledWith('ringing', '507f1f77bcf86cd799439014', null);
  });

  test('falls back to mobile voice call when number is not registered in chat module', async () => {
    const reminder = {
      _id: 'rem-2',
      title: 'Water reminder',
      userId: '507f1f77bcf86cd799439011',
      recipientId: '',
      recipientPhoneNumber: '+919900112233',
      voiceMessage: 'Please drink water',
      messageType: 'text',
      senderName: 'Dhanya',
      voiceNoteUrl: '',
      recordCallAttempt: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };

    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });
    voiceCallService.initiateVoiceCall.mockResolvedValue({
      status: 'ringing',
      callId: 'mobile-call-2',
    });

    await voiceCallScheduler.processReminder(reminder);

    expect(Call.create).not.toHaveBeenCalled();
    expect(voiceCallService.initiateVoiceCall).toHaveBeenCalledTimes(1);
    expect(reminder.recordCallAttempt).toHaveBeenCalledWith('ringing', 'mobile-call-2', null);
  });
});
