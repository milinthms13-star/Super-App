const { __testables } = require('./messaging');

describe('messaging route helpers', () => {
  test('normalizes client message ids for dedupe checks', () => {
    expect(__testables.normalizeClientMessageId('  client-123  ')).toBe('client-123');
    expect(__testables.normalizeClientMessageId('')).toBe('');
    expect(__testables.normalizeClientMessageId(null)).toBe('');
  });

  test('builds a stable export payload for chat backups', () => {
    const exportPayload = __testables.buildMessageExportPayload(
      {
        _id: 'chat-1',
        type: 'group',
        groupName: 'Family',
        participants: ['user-1', 'user-2'],
      },
      [
        {
          _id: 'message-1',
          clientMessageId: 'client-1',
          senderId: {
            _id: 'user-1',
            name: 'Current User',
            email: 'current@example.com',
          },
          content: 'Hello there',
          messageType: 'text',
          createdAt: '2026-05-07T09:00:00.000Z',
          reactions: [
            {
              userId: 'user-2',
              emoji: '👍',
              reactedAt: '2026-05-07T09:01:00.000Z',
            },
          ],
          edits: [{ content: 'Hello', editedAt: '2026-05-07T09:00:30.000Z' }],
        },
      ]
    );

    expect(exportPayload).toEqual(expect.objectContaining({
      chat: expect.objectContaining({
        id: 'chat-1',
        type: 'group',
        groupName: 'Family',
        participantCount: 2,
      }),
    }));
    expect(exportPayload.messages).toEqual([
      expect.objectContaining({
        id: 'message-1',
        clientMessageId: 'client-1',
        sender: expect.objectContaining({
          id: 'user-1',
          name: 'Current User',
          email: 'current@example.com',
        }),
        content: 'Hello there',
        messageType: 'text',
        isEdited: true,
        reactions: [
          expect.objectContaining({
            userId: 'user-2',
            emoji: '👍',
          }),
        ],
      }),
    ]);
  });
});
