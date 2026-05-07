import {
  getMessagingOutboxStorageKey,
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
});
