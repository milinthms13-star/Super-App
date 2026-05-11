import {
  getFamilyPermissionSnapshot,
  getMessagingOutboxStorageKey,
  isFamilyPermissionActive,
  loadMessagingOutbox,
  mergeOutboxEntriesIntoMessages,
  saveMessagingOutbox,
} from './utils';

describe('messaging utils', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('persists outbox entries per user', () => {
    const queue = [
      {
        clientMessageId: 'client-1',
        chatId: 'chat-1',
        content: 'Queued message',
      },
    ];

    saveMessagingOutbox('user-1', queue);

    expect(window.localStorage.getItem(getMessagingOutboxStorageKey('user-1'))).toContain('client-1');
    expect(loadMessagingOutbox('user-1')).toEqual(queue);
    expect(loadMessagingOutbox('user-2')).toEqual([]);
  });

  test('merges failed outbox entries into the message list for rendering', () => {
    const mergedMessages = mergeOutboxEntriesIntoMessages(
      [
        {
          _id: 'message-1',
          content: 'Delivered message',
          createdAt: '2026-05-07T08:00:00.000Z',
          messageType: 'text',
          senderId: 'user-2',
        },
      ],
      [
        {
          clientMessageId: 'client-queued-1',
          tempMessageId: 'temp-queued-1',
          chatId: 'chat-1',
          senderId: 'user-1',
          content: 'Queued retry',
          createdAt: '2026-05-07T08:05:00.000Z',
          messageType: 'text',
          errorMessage: 'Offline',
        },
      ]
    );

    expect(mergedMessages).toHaveLength(2);
    expect(mergedMessages[1]).toEqual(expect.objectContaining({
      _id: 'temp-queued-1',
      clientMessageId: 'client-queued-1',
      isFailed: true,
      errorMessage: 'Offline',
      content: 'Queued retry',
    }));
  });

  test('treats temporary family permission as active until expiry', () => {
    const active = isFamilyPermissionActive(
      { mode: 'temporary', expiresAt: '2026-05-20T12:00:00.000Z' },
      new Date('2026-05-20T11:45:00.000Z')
    );
    const expired = isFamilyPermissionActive(
      { mode: 'temporary', expiresAt: '2026-05-20T12:00:00.000Z' },
      new Date('2026-05-20T12:05:00.000Z')
    );

    expect(active).toBe(true);
    expect(expired).toBe(false);
  });

  test('evaluates time-restricted family permission using timezone and day', () => {
    const permission = {
      mode: 'time_restricted',
      timeRestrictions: {
        timezone: 'Asia/Kolkata',
        startTime: '09:00',
        endTime: '18:00',
        daysOfWeek: [1], // Monday
      },
    };

    const mondayDuringWindow = isFamilyPermissionActive(
      permission,
      new Date('2026-05-11T07:00:00.000Z') // Monday 12:30 IST
    );
    const mondayOutsideWindow = isFamilyPermissionActive(
      permission,
      new Date('2026-05-11T02:00:00.000Z') // Monday 07:30 IST
    );
    const tuesdayDuringClockWindow = isFamilyPermissionActive(
      permission,
      new Date('2026-05-12T07:00:00.000Z') // Tuesday 12:30 IST
    );

    expect(mondayDuringWindow).toBe(true);
    expect(mondayOutsideWindow).toBe(false);
    expect(tuesdayDuringClockWindow).toBe(false);
  });

  test('returns a normalized family permission snapshot', () => {
    const snapshot = getFamilyPermissionSnapshot(
      { mode: 'PERMANENT', note: 'Parent approved' },
      new Date('2026-05-11T07:00:00.000Z')
    );

    expect(snapshot).toEqual(expect.objectContaining({
      mode: 'permanent',
      note: 'Parent approved',
      active: true,
    }));
  });
});
