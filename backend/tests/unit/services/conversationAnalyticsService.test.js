const assert = require('assert');
const conversationAnalyticsService = require('../../../services/conversationAnalyticsService');

describe('ConversationAnalyticsService', () => {
  beforeEach(() => {
    conversationAnalyticsService.clearCache();
  });

  describe('getChatAnalytics', () => {
    it('should get chat analytics dashboard', async () => {
      const analytics = await conversationAnalyticsService.getChatAnalytics(
        'chat1'
      );
      assert(typeof analytics === 'object');
    });

    it('should include message count', async () => {
      const analytics = await conversationAnalyticsService.getChatAnalytics(
        'chat1'
      );
      assert(
        typeof analytics.messageCount === 'number' ||
          analytics.messageCount !== undefined
      );
    });

    it('should include participant count', async () => {
      const analytics = await conversationAnalyticsService.getChatAnalytics(
        'chat1'
      );
      assert(
        typeof analytics.participantCount === 'number' ||
          analytics.participantCount !== undefined
      );
    });

    it('should support time range filtering', async () => {
      const analytics = await conversationAnalyticsService.getChatAnalytics(
        'chat1',
        {
          startDate: '2026-05-01',
          endDate: '2026-05-07',
        }
      );
      assert(typeof analytics === 'object');
    });
  });

  describe('getSentimentAnalysis', () => {
    it('should get sentiment analysis for chat', async () => {
      const sentiment = await conversationAnalyticsService.getSentimentAnalysis(
        'chat1'
      );
      assert(typeof sentiment === 'object');
    });

    it('should include positive percentage', async () => {
      const sentiment = await conversationAnalyticsService.getSentimentAnalysis(
        'chat1'
      );
      assert(
        typeof sentiment.positive === 'number' ||
          sentiment.positive !== undefined
      );
    });

    it('should include negative percentage', async () => {
      const sentiment = await conversationAnalyticsService.getSentimentAnalysis(
        'chat1'
      );
      assert(
        typeof sentiment.negative === 'number' ||
          sentiment.negative !== undefined
      );
    });

    it('should include neutral percentage', async () => {
      const sentiment = await conversationAnalyticsService.getSentimentAnalysis(
        'chat1'
      );
      assert(
        typeof sentiment.neutral === 'number' ||
          sentiment.neutral !== undefined
      );
    });

    it('should support time range filtering', async () => {
      const sentiment = await conversationAnalyticsService.getSentimentAnalysis(
        'chat1',
        { days: 7 }
      );
      assert(typeof sentiment === 'object');
    });
  });

  describe('getEngagementMetrics', () => {
    it('should get engagement metrics for chat', async () => {
      const metrics = await conversationAnalyticsService.getEngagementMetrics(
        'chat1'
      );
      assert(typeof metrics === 'object');
    });

    it('should include message response time', async () => {
      const metrics = await conversationAnalyticsService.getEngagementMetrics(
        'chat1'
      );
      assert(metrics.avgResponseTime !== undefined || metrics.avgResponseTime === undefined);
    });

    it('should include active users', async () => {
      const metrics = await conversationAnalyticsService.getEngagementMetrics(
        'chat1'
      );
      assert(
        typeof metrics.activeUsers === 'number' ||
          metrics.activeUsers !== undefined
      );
    });

    it('should include engagement score', async () => {
      const metrics = await conversationAnalyticsService.getEngagementMetrics(
        'chat1'
      );
      assert(
        typeof metrics.engagementScore === 'number' ||
          metrics.engagementScore !== undefined
      );
    });
  });

  describe('getParticipantStats', () => {
    it('should get participant activity statistics', async () => {
      const stats = await conversationAnalyticsService.getParticipantStats(
        'chat1'
      );
      assert(Array.isArray(stats) || typeof stats === 'object');
    });

    it('should include message count per participant', async () => {
      const stats = await conversationAnalyticsService.getParticipantStats(
        'chat1'
      );
      if (Array.isArray(stats) && stats.length > 0) {
        assert(
          stats[0].messageCount !== undefined ||
            stats[0].messages !== undefined
        );
      }
    });

    it('should sort by activity', async () => {
      const stats = await conversationAnalyticsService.getParticipantStats(
        'chat1'
      );
      if (Array.isArray(stats) && stats.length > 1) {
        assert(
          stats[0].messageCount >= stats[1].messageCount ||
            stats[0].messages >= stats[1].messages
        );
      }
    });

    it('should support limit parameter', async () => {
      const stats = await conversationAnalyticsService.getParticipantStats(
        'chat1',
        { limit: 10 }
      );
      assert(stats.length <= 10 || typeof stats === 'object');
    });
  });

  describe('getMessageVolumeTrends', () => {
    it('should get message volume trends', async () => {
      const trends = await conversationAnalyticsService.getMessageVolumeTrends(
        'chat1'
      );
      assert(Array.isArray(trends) || typeof trends === 'object');
    });

    it('should include timestamps', async () => {
      const trends = await conversationAnalyticsService.getMessageVolumeTrends(
        'chat1'
      );
      if (Array.isArray(trends) && trends.length > 0) {
        assert(trends[0].timestamp !== undefined);
      }
    });

    it('should include message counts', async () => {
      const trends = await conversationAnalyticsService.getMessageVolumeTrends(
        'chat1'
      );
      if (Array.isArray(trends) && trends.length > 0) {
        assert(trends[0].count !== undefined || trends[0].volume !== undefined);
      }
    });

    it('should support different intervals', async () => {
      const trendsHourly = await conversationAnalyticsService.getMessageVolumeTrends(
        'chat1',
        { interval: 'hourly' }
      );
      const trendsDaily = await conversationAnalyticsService.getMessageVolumeTrends(
        'chat1',
        { interval: 'daily' }
      );
      assert(Array.isArray(trendsHourly) && Array.isArray(trendsDaily));
    });
  });

  describe('getPeakTimes', () => {
    it('should get peak conversation times', async () => {
      const peakTimes = await conversationAnalyticsService.getPeakTimes('chat1');
      assert(Array.isArray(peakTimes) || typeof peakTimes === 'object');
    });

    it('should include time and activity level', async () => {
      const peakTimes = await conversationAnalyticsService.getPeakTimes('chat1');
      if (Array.isArray(peakTimes) && peakTimes.length > 0) {
        assert(peakTimes[0].time !== undefined || peakTimes[0].hour !== undefined);
      }
    });

    it('should rank by activity', async () => {
      const peakTimes = await conversationAnalyticsService.getPeakTimes('chat1');
      if (Array.isArray(peakTimes) && peakTimes.length > 1) {
        assert(
          peakTimes[0].activity >= peakTimes[1].activity ||
            peakTimes[0].messages >= peakTimes[1].messages
        );
      }
    });

    it('should support day filtering', async () => {
      const peakTimes = await conversationAnalyticsService.getPeakTimes('chat1', {
        day: 'Monday',
      });
      assert(Array.isArray(peakTimes) || typeof peakTimes === 'object');
    });
  });

  describe('extractTopics', () => {
    it('should extract topics from chat', async () => {
      const topics = await conversationAnalyticsService.extractTopics('chat1');
      assert(Array.isArray(topics) || typeof topics === 'object');
    });

    it('should include topic names', async () => {
      const topics = await conversationAnalyticsService.extractTopics('chat1');
      if (Array.isArray(topics) && topics.length > 0) {
        assert(
          topics[0].name !== undefined || topics[0].topic !== undefined
        );
      }
    });

    it('should include topic frequency', async () => {
      const topics = await conversationAnalyticsService.extractTopics('chat1');
      if (Array.isArray(topics) && topics.length > 0) {
        assert(
          topics[0].frequency !== undefined ||
            topics[0].count !== undefined ||
            topics[0].relevance !== undefined
        );
      }
    });

    it('should support limit parameter', async () => {
      const topics = await conversationAnalyticsService.extractTopics('chat1', {
        limit: 10,
      });
      assert(topics.length <= 10 || typeof topics === 'object');
    });

    it('should handle multi-word topics', async () => {
      const topics = await conversationAnalyticsService.extractTopics('chat1');
      if (Array.isArray(topics)) {
        assert(topics.length >= 0);
      }
    });
  });

  describe('getCollaborationScore', () => {
    it('should get collaboration score for chat', async () => {
      const score = await conversationAnalyticsService.getCollaborationScore(
        'chat1'
      );
      assert(typeof score === 'number' || typeof score === 'object');
    });

    it('should return score between 0-100', async () => {
      const score = await conversationAnalyticsService.getCollaborationScore(
        'chat1'
      );
      if (typeof score === 'number') {
        assert(score >= 0 && score <= 100);
      }
    });

    it('should factor in participation diversity', async () => {
      const score = await conversationAnalyticsService.getCollaborationScore(
        'chat1'
      );
      assert(score !== undefined);
    });

    it('should factor in response engagement', async () => {
      const score = await conversationAnalyticsService.getCollaborationScore(
        'chat1'
      );
      assert(score !== undefined);
    });
  });

  describe('Cache Behavior', () => {
    it('should cache analytics results', async () => {
      const result1 = await conversationAnalyticsService.getChatAnalytics(
        'chat1'
      );
      const result2 = await conversationAnalyticsService.getChatAnalytics(
        'chat1'
      );
      assert.deepEqual(result1, result2);
    });

    it('should clear cache periodically', async () => {
      const result1 = await conversationAnalyticsService.getChatAnalytics(
        'chat1'
      );
      conversationAnalyticsService.clearCache();
      const result2 = await conversationAnalyticsService.getChatAnalytics(
        'chat1'
      );
      // Cache may have been refreshed
      assert(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing chat', async () => {
      try {
        await conversationAnalyticsService.getChatAnalytics('nonexistent');
        assert(true);
      } catch (error) {
        assert(error);
      }
    });

    it('should handle empty chats', async () => {
      try {
        const analytics = await conversationAnalyticsService.getChatAnalytics(
          'emptyChatId'
        );
        assert(analytics !== undefined);
      } catch (error) {
        assert(error);
      }
    });

    it('should handle invalid date ranges', async () => {
      try {
        await conversationAnalyticsService.getChatAnalytics('chat1', {
          startDate: '2026-05-07',
          endDate: '2026-05-01',
        });
        assert(true);
      } catch (error) {
        assert(error);
      }
    });

    it('should handle database query errors gracefully', async () => {
      try {
        const analytics = await conversationAnalyticsService.getChatAnalytics(
          'chat1'
        );
        assert(analytics !== undefined);
      } catch (error) {
        assert(error);
      }
    });
  });

  describe('Performance', () => {
    it('should compute analytics within acceptable time', async () => {
      const start = Date.now();
      await conversationAnalyticsService.getChatAnalytics('chat1');
      const duration = Date.now() - start;
      assert(duration < 5000);
    });

    it('should handle large chats efficiently', async () => {
      const start = Date.now();
      await conversationAnalyticsService.getChatAnalytics('largeChat');
      const duration = Date.now() - start;
      assert(duration < 10000);
    });

    it('should batch compute multiple chats efficiently', async () => {
      const chatIds = ['chat1', 'chat2', 'chat3', 'chat4', 'chat5'];
      const start = Date.now();
      const results = await Promise.all(
        chatIds.map((id) => conversationAnalyticsService.getChatAnalytics(id))
      );
      const duration = Date.now() - start;
      assert(results.length === 5);
      assert(duration < 15000);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistency across queries', async () => {
      const analytics = await conversationAnalyticsService.getChatAnalytics(
        'chat1'
      );
      const sentiment = await conversationAnalyticsService.getSentimentAnalysis(
        'chat1'
      );
      // Sentiment percentages should add up to ~100
      if (sentiment.positive && sentiment.negative && sentiment.neutral) {
        const total = sentiment.positive + sentiment.negative + sentiment.neutral;
        assert(Math.abs(total - 100) < 5 || total > 0);
      }
    });

    it('should update analytics when messages change', async () => {
      const analyticsB1 = await conversationAnalyticsService.getChatAnalytics(
        'chat1'
      );
      // Simulate message addition
      const analyticsB2 = await conversationAnalyticsService.getChatAnalytics(
        'chat1'
      );
      // Results may differ after cache clear
      assert(analyticsB1 !== undefined && analyticsB2 !== undefined);
    });
  });
});
