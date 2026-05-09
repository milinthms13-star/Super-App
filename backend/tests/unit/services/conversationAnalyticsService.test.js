const mongoose = require('mongoose');

jest.mock('../../../models/Message');
jest.mock('../../../models/Chat');
jest.mock('../../../models/User');
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const Message = require('../../../models/Message');
const Chat = require('../../../models/Chat');
const conversationAnalyticsService = require('../../../services/conversationAnalyticsService');

const createQuery = (resolvedValue) => ({
  select: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(resolvedValue),
});

describe('ConversationAnalyticsService', () => {
  const chatId = new mongoose.Types.ObjectId().toString();
  const userOneId = new mongoose.Types.ObjectId().toString();
  const userTwoId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
    conversationAnalyticsService.clearCache();

    Chat.findById = jest.fn().mockReturnValue(
      createQuery({
        _id: chatId,
        name: 'Messaging Analytics Chat',
        participants: [{ userId: userOneId }, { userId: userTwoId }],
        createdAt: new Date('2026-05-01T10:00:00Z'),
      })
    );

    Message.aggregate = jest.fn();
    Message.find = jest.fn();
    Message.countDocuments = jest.fn();
    Message.distinct = jest.fn();
  });

  it('builds a conversation overview and caches the result', async () => {
    Message.aggregate
      .mockResolvedValueOnce([
        {
          totalMessages: 24,
          totalWords: 180,
          avgMessageLength: 18,
          messagesWithMedia: 4,
          messagesWithReactions: 6,
        },
      ])
      .mockResolvedValueOnce([
        {
          _id: userOneId,
          messageCount: 14,
          avgResponseTime: 120000,
          user: [{ _id: userOneId, username: 'alice' }],
        },
      ])
      .mockResolvedValueOnce([
        { _id: '2026-05-06', count: 10 },
        { _id: '2026-05-07', count: 14 },
      ]);

    const firstResult = await conversationAnalyticsService.getConversationOverview(chatId, {
      daysBack: 7,
    });
    const secondResult = await conversationAnalyticsService.getConversationOverview(chatId, {
      daysBack: 7,
    });

    expect(firstResult.chat.name).toBe('Messaging Analytics Chat');
    expect(firstResult.chat.participantCount).toBe(2);
    expect(firstResult.messageStats.totalMessages).toBe(24);
    expect(firstResult.activityTimeline).toHaveLength(2);
    expect(secondResult).toEqual(firstResult);
    expect(Message.aggregate).toHaveBeenCalledTimes(3);
  });

  it('returns engagement metrics from aggregate data', async () => {
    Message.aggregate.mockResolvedValueOnce([
      {
        messageCount: 12,
        totalReactions: 8,
        avgReactions: 2,
        repliesGenerated: 3,
        forwards: 1,
        engagement: 12,
      },
    ]);

    const result = await conversationAnalyticsService.getEngagementMetrics(chatId, userOneId);

    expect(result.messageCount).toBe(12);
    expect(result.totalReactions).toBe(8);
    expect(result.engagement).toBe(12);
  });

  it('summarizes sentiment from message content', async () => {
    Message.find.mockReturnValueOnce(
      createQuery([
        {
          _id: new mongoose.Types.ObjectId().toString(),
          content: 'This is great and wonderful',
          senderId: userOneId,
          createdAt: new Date('2026-05-06T09:00:00Z'),
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          content: 'This is awful and bad',
          senderId: userTwoId,
          createdAt: new Date('2026-05-06T09:05:00Z'),
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          content: 'Checking in with the team',
          senderId: userOneId,
          createdAt: new Date('2026-05-06T09:10:00Z'),
        },
      ])
    );

    const result = await conversationAnalyticsService.getSentimentAnalysis(chatId, { limit: 10 });

    expect(result.sentiments).toHaveLength(3);
    expect(result.summary.positive).toBe(1);
    expect(result.summary.negative).toBe(1);
    expect(result.summary.neutral).toBe(1);
  });

  it('maps trend analysis periods into response objects', async () => {
    Message.aggregate.mockResolvedValueOnce([
      {
        _id: '2026-05-01',
        messageCount: 6,
        uniqueParticipants: [userOneId, userTwoId],
        engagementScore: 9,
      },
      {
        _id: '2026-05-02',
        messageCount: 4,
        uniqueParticipants: [userOneId],
        engagementScore: 4,
      },
    ]);

    const result = await conversationAnalyticsService.getTrendAnalysis(chatId, {
      daysBack: 14,
      interval: 'day',
    });

    expect(result).toEqual([
      {
        period: '2026-05-01',
        messageCount: 6,
        participants: 2,
        engagementScore: 9,
      },
      {
        period: '2026-05-02',
        messageCount: 4,
        participants: 1,
        engagementScore: 4,
      },
    ]);
  });

  it('calculates conversation health from message volume, participation, and engagement', async () => {
    Message.countDocuments.mockResolvedValueOnce(120);
    Message.distinct.mockResolvedValueOnce([userOneId, userTwoId]);
    Message.aggregate.mockResolvedValueOnce([
      {
        messageCount: 120,
        totalReactions: 20,
        engagement: 36,
      },
    ]);

    const result = await conversationAnalyticsService.getConversationHealth(chatId);

    expect(typeof result.healthScore).toBe('number');
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
    expect(result.metrics).toBeDefined();
    expect(result.status).toMatch(/excellent|good|needs_attention/);
  });

  it('generates a composed analytics report from the sub-analyses', async () => {
    jest
      .spyOn(conversationAnalyticsService, 'getConversationOverview')
      .mockResolvedValueOnce({ chat: { id: chatId }, messageStats: { totalMessages: 20 } });
    jest
      .spyOn(conversationAnalyticsService, 'getEngagementMetrics')
      .mockResolvedValueOnce({ engagement: 11 });
    jest
      .spyOn(conversationAnalyticsService, 'getSentimentAnalysis')
      .mockResolvedValueOnce({ summary: { positive: 2, neutral: 1, negative: 0 } });
    jest
      .spyOn(conversationAnalyticsService, 'getTrendAnalysis')
      .mockResolvedValueOnce([{ period: '2026-05-01', messageCount: 20, participants: 2, engagementScore: 11 }]);
    jest
      .spyOn(conversationAnalyticsService, 'getConversationHealth')
      .mockResolvedValueOnce({ healthScore: 78, status: 'excellent', metrics: {} });

    const report = await conversationAnalyticsService.generateAnalyticsReport(chatId, {
      daysBack: 30,
    });

    expect(report.chatId).toBe(chatId);
    expect(report.overview.messageStats.totalMessages).toBe(20);
    expect(report.engagement.engagement).toBe(11);
    expect(report.sentiment.positive).toBe(2);
    expect(report.trends).toHaveLength(1);
    expect(report.health.healthScore).toBe(78);
  });

  it('returns active hours ranked by message count', async () => {
    Message.aggregate.mockResolvedValueOnce([
      { _id: 9, count: 18 },
      { _id: 14, count: 9 },
    ]);

    const result = await conversationAnalyticsService.getMostActiveHours(chatId);

    expect(result).toEqual([
      { hour: 9, messageCount: 18 },
      { hour: 14, messageCount: 9 },
    ]);
  });

  it('extracts conversation topics from repeated keywords', async () => {
    Message.find.mockReturnValueOnce(
      createQuery([
        { content: 'Payment gateway failure and payment retry needed' },
        { content: 'Retry the payment flow before checkout closes' },
        { content: 'Gateway dashboard shows payment pending' },
      ])
    );

    const result = await conversationAnalyticsService.getConversationTopics(chatId, 5);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('keyword');
    expect(result[0]).toHaveProperty('frequency');
  });

  it('clears cached overview entries when requested', async () => {
    Message.aggregate
      .mockResolvedValueOnce([
        {
          totalMessages: 5,
          totalWords: 20,
          avgMessageLength: 4,
          messagesWithMedia: 0,
          messagesWithReactions: 0,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await conversationAnalyticsService.getConversationOverview(chatId, { daysBack: 3 });
    expect(conversationAnalyticsService.analyticsCache.size).toBe(1);

    conversationAnalyticsService.clearCache();

    expect(conversationAnalyticsService.analyticsCache.size).toBe(0);
  });
});
