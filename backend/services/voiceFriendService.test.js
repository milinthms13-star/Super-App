const voiceFriendService = require('./voiceFriendService');

describe('VoiceFriendService', () => {
  const mockAiClient = {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'I am here with you.' } }],
        }),
      },
    },
  };

  beforeEach(() => {
    voiceFriendService.setOpenAIClient(mockAiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('createSession returns a new session object', () => {
    const session = voiceFriendService.createSession({ userId: 'user123', persona: 'supportive', mood: 'neutral', language: 'en' });
    expect(session).toHaveProperty('sessionId');
    expect(session.userId).toBe('user123');
    expect(session.persona).toBe('supportive');
    expect(session.mood).toBe('neutral');
    expect(session.language).toBe('en');
    expect(session.messages).toEqual([]);
  });

  test('sendMessage returns AI response and stores conversation history', async () => {
    const session = voiceFriendService.createSession({ userId: 'user123', persona: 'mindful', mood: 'anxious', language: 'en' });
    const result = await voiceFriendService.sendMessage({ sessionId: session.sessionId, message: 'Hello', persona: 'mindful', mood: 'anxious', language: 'en' });

    expect(result.sessionId).toBe(session.sessionId);
    expect(result.response).toBe('I am here with you.');
    expect(session.messages.length).toBe(2);
    expect(session.messages[0]).toMatchObject({ role: 'user', content: 'Hello' });
    expect(session.messages[1]).toMatchObject({ role: 'assistant', content: 'I am here with you.' });
  });

  test('sendMessage throws when the session is missing', async () => {
    await expect(
      voiceFriendService.sendMessage({ sessionId: 'invalid-session', message: 'Hi', persona: 'supportive', mood: 'happy', language: 'en' })
    ).rejects.toThrow('Voice friend session not found');
  });
});
