/**
 * Phase 6 Analytics Utilities Tests
 * Tests for all analytics functions: tag, sentiment, heatmap, word count, and dashboard analytics
 */

const {
  calculateWritingStats,
  calculateStreakStats,
  calculateMoodStats,
  calculateWellnessScore,
  calculateTagAnalytics,
  calculateSentimentTrend,
  calculateWritingHeatmap,
  calculateWordCountAnalytics,
  getDashboardAnalytics
} = require('../utils/diaryAnalytics');

describe('Phase 6: Analytics Utilities', () => {
  // Sample data for testing
  const mockEntries = [
    {
      _id: '1',
      title: 'Happy Day',
      content: 'This is a great day! I feel amazing. ' + 'word '.repeat(50),
      mood: 'positive',
      sentiment: 'positive',
      tags: ['happiness', 'reflection'],
      createdAt: new Date('2024-05-01')
    },
    {
      _id: '2',
      title: 'Regular Entry',
      content: 'Just a normal day. ' + 'word '.repeat(30),
      mood: 'neutral',
      sentiment: 'neutral',
      tags: ['daily', 'routine'],
      createdAt: new Date('2024-05-02')
    },
    {
      _id: '3',
      title: 'Sad Reflections',
      content: 'Feeling a bit down today. ' + 'word '.repeat(40),
      mood: 'negative',
      sentiment: 'negative',
      tags: ['sadness', 'reflection'],
      createdAt: new Date('2024-05-03')
    },
    {
      _id: '4',
      title: 'Happy Again',
      content: 'Things are looking up! ' + 'word '.repeat(60),
      mood: 'positive',
      sentiment: 'positive',
      tags: ['happiness', 'progress'],
      createdAt: new Date('2024-05-04')
    },
    {
      _id: '5',
      title: 'Anxious Day',
      content: 'Feeling worried about tomorrow. ' + 'word '.repeat(45),
      mood: 'anxious',
      sentiment: 'negative',
      tags: ['anxiety', 'future'],
      createdAt: new Date('2024-05-05')
    }
  ];

  const emptyEntries = [];
  const singleEntry = [mockEntries[0]];

  // =========================================================================
  // TAG ANALYTICS TESTS
  // =========================================================================

  describe('calculateTagAnalytics', () => {
    test('should return empty object with no entries', () => {
      const result = calculateTagAnalytics(emptyEntries);
      expect(result.uniqueTags).toBe(0);
      expect(result.tagFrequency).toEqual([]);
      expect(result.totalTagUsages).toBe(0);
    });

    test('should calculate tag frequency correctly', () => {
      const result = calculateTagAnalytics(mockEntries);
      expect(result.uniqueTags).toBe(5);
      expect(result.totalTagUsages).toBe(9);
      expect(result.tagFrequency.length).toBeGreaterThan(0);
    });

    test('should respect limit parameter', () => {
      const result = calculateTagAnalytics(mockEntries, 3);
      expect(result.tagFrequency.length).toBeLessThanOrEqual(3);
    });

    test('should include tag trend data', () => {
      const result = calculateTagAnalytics(mockEntries);
      result.tagFrequency.forEach((tag) => {
        expect(tag).toHaveProperty('tag');
        expect(tag).toHaveProperty('frequency');
        expect(tag).toHaveProperty('trend');
      });
    });

    test('should sort tags by frequency descending', () => {
      const result = calculateTagAnalytics(mockEntries);
      const frequencies = result.tagFrequency.map(t => t.frequency);
      for (let i = 0; i < frequencies.length - 1; i++) {
        expect(frequencies[i]).toBeGreaterThanOrEqual(frequencies[i + 1]);
      }
    });

    test('should handle single entry', () => {
      const result = calculateTagAnalytics(singleEntry);
      expect(result.uniqueTags).toBe(2);
      expect(result.totalTagUsages).toBe(2);
    });
  });

  // =========================================================================
  // SENTIMENT TREND TESTS
  // =========================================================================

  describe('calculateSentimentTrend', () => {
    test('should return empty array with no entries', () => {
      const result = calculateSentimentTrend(emptyEntries);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    test('should calculate sentiment by day', () => {
      const result = calculateSentimentTrend(mockEntries, 'day');
      expect(Array.isArray(result)).toBe(true);
      result.forEach((period) => {
        expect(period).toHaveProperty('period');
        expect(period).toHaveProperty('positive');
        expect(period).toHaveProperty('neutral');
        expect(period).toHaveProperty('negative');
        expect(period).toHaveProperty('entries');
        expect(period.positive + period.neutral + period.negative).toBe(100);
      });
    });

    test('should calculate sentiment by week', () => {
      const result = calculateSentimentTrend(mockEntries, 'week');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should calculate sentiment by month', () => {
      const result = calculateSentimentTrend(mockEntries, 'month');
      expect(Array.isArray(result)).toBe(true);
    });

    test('should have percentages that sum to 100', () => {
      const result = calculateSentimentTrend(mockEntries, 'day');
      result.forEach((period) => {
        const total = period.positive + period.neutral + period.negative;
        expect(total).toBe(100);
      });
    });

    test('should sort periods chronologically', () => {
      const result = calculateSentimentTrend(mockEntries, 'day');
      for (let i = 0; i < result.length - 1; i++) {
        expect(new Date(result[i].period) <= new Date(result[i + 1].period)).toBe(true);
      }
    });
  });

  // =========================================================================
  // WRITING HEATMAP TESTS
  // =========================================================================

  describe('calculateWritingHeatmap', () => {
    test('should return empty object with no entries', () => {
      const result = calculateWritingHeatmap(emptyEntries);
      expect(typeof result).toBe('object');
      expect(Object.keys(result).length).toBe(0);
    });

    test('should create heatmap data for entries', () => {
      const result = calculateWritingHeatmap(mockEntries);
      expect(Object.keys(result).length).toBeGreaterThan(0);
      Object.values(result).forEach((count) => {
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(1);
      });
    });

    test('should respect monthsBack parameter', () => {
      const result = calculateWritingHeatmap(mockEntries, 1);
      const dates = Object.keys(result).map(d => new Date(d));
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      
      dates.forEach((date) => {
        expect(date >= cutoffDate).toBe(true);
      });
    });

    test('should count multiple entries on same day', () => {
      const entriesWithDuplicates = [
        { ...mockEntries[0], createdAt: new Date('2024-05-01T08:00:00') },
        { ...mockEntries[0], createdAt: new Date('2024-05-01T14:00:00') },
        { ...mockEntries[0], createdAt: new Date('2024-05-01T20:00:00') }
      ];
      
      const result = calculateWritingHeatmap(entriesWithDuplicates);
      expect(result['2024-05-01']).toBe(3);
    });

    test('should return dates in YYYY-MM-DD format', () => {
      const result = calculateWritingHeatmap(mockEntries);
      Object.keys(result).forEach((date) => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  // =========================================================================
  // WORD COUNT ANALYTICS TESTS
  // =========================================================================

  describe('calculateWordCountAnalytics', () => {
    test('should return zeros with no entries', () => {
      const result = calculateWordCountAnalytics(emptyEntries);
      expect(result.totalWords).toBe(0);
      expect(result.avgWords).toBe(0);
      expect(result.minWords).toBe(0);
      expect(result.maxWords).toBe(0);
    });

    test('should calculate word count stats', () => {
      const result = calculateWordCountAnalytics(mockEntries);
      expect(result.totalWords).toBeGreaterThan(0);
      expect(result.avgWords).toBeGreaterThan(0);
      expect(result.minWords).toBeGreaterThanOrEqual(0);
      expect(result.maxWords).toBeGreaterThanOrEqual(result.minWords);
      expect(result.median).toBeGreaterThanOrEqual(0);
    });

    test('should calculate correct average', () => {
      const entries = [
        { content: 'word ' + 'word '.repeat(9) }, // 10 words
        { content: 'word ' + 'word '.repeat(19) }, // 20 words
        { content: 'word ' + 'word '.repeat(29) }  // 30 words
      ];
      const result = calculateWordCountAnalytics(entries);
      expect(result.avgWords).toBe(20);
    });

    test('should categorize word distribution', () => {
      const result = calculateWordCountAnalytics(mockEntries);
      const distribution = result.wordDistribution;
      expect(distribution).toHaveProperty('veryShort');
      expect(distribution).toHaveProperty('short');
      expect(distribution).toHaveProperty('medium');
      expect(distribution).toHaveProperty('long');
      expect(distribution).toHaveProperty('veryLong');
      
      const total = Object.values(distribution).reduce((a, b) => a + b, 0);
      expect(total).toBe(mockEntries.length);
    });

    test('should calculate median correctly', () => {
      const entries = [
        { content: 'a' }, // 1 word
        { content: 'a b c' }, // 3 words
        { content: 'a b c d e' }  // 5 words
      ];
      const result = calculateWordCountAnalytics(entries);
      expect(result.median).toBe(3);
    });

    test('should handle entries with HTML tags', () => {
      const entriesWithHTML = [
        { content: '<p>Hello world</p>' },
        { content: '<h1>Title</h1><p>Content here</p>' }
      ];
      const result = calculateWordCountAnalytics(entriesWithHTML);
      expect(result.totalWords).toBeGreaterThan(0);
      expect(result.avgWords).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // DASHBOARD ANALYTICS TESTS
  // =========================================================================

  describe('getDashboardAnalytics', () => {
    test('should return empty dashboard with no entries', async () => {
      const result = await getDashboardAnalytics(emptyEntries);
      expect(result).toHaveProperty('writing');
      expect(result).toHaveProperty('streak');
      expect(result).toHaveProperty('mood');
      expect(result).toHaveProperty('wellness');
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('words');
      expect(result).toHaveProperty('heatmap');
    });

    test('should aggregate all analytics', async () => {
      const result = await getDashboardAnalytics(mockEntries);
      
      // Check all components are present
      expect(result.writing).toBeDefined();
      expect(result.streak).toBeDefined();
      expect(result.mood).toBeDefined();
      expect(result.wellness).toBeDefined();
      expect(result.tags).toBeDefined();
      expect(result.sentiment).toBeDefined();
      expect(result.words).toBeDefined();
      expect(result.heatmap).toBeDefined();

      // Check writing stats
      expect(result.writing.entryCount).toBe(mockEntries.length);
      
      // Check tags
      expect(result.tags.uniqueTags).toBeGreaterThan(0);
      
      // Check sentiment
      expect(Array.isArray(result.sentiment)).toBe(true);
      
      // Check words
      expect(result.words.totalWords).toBeGreaterThan(0);
      
      // Check heatmap
      expect(typeof result.heatmap).toBe('object');
    });

    test('should include complete analytics for dashboard display', async () => {
      const result = await getDashboardAnalytics(mockEntries);
      
      // All main sections should be present
      const mainSections = ['writing', 'streak', 'mood', 'wellness', 'tags', 'sentiment', 'words', 'heatmap'];
      mainSections.forEach((section) => {
        expect(result).toHaveProperty(section);
      });
    });
  });

  // =========================================================================
  // INTEGRATION TESTS
  // =========================================================================

  describe('Analytics Integration', () => {
    test('should work with realistic diary data', () => {
      const realisticData = Array.from({ length: 30 }, (_, i) => ({
        _id: String(i),
        title: `Day ${i + 1}`,
        content: 'word '.repeat(Math.random() * 200 + 50),
        mood: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
        sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
        tags: [
          ['work', 'productivity'],
          ['family', 'love'],
          ['health', 'exercise'],
          ['learning', 'growth'],
          ['hobby', 'fun']
        ][Math.floor(Math.random() * 5)],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      }));

      expect(() => {
        calculateTagAnalytics(realisticData);
        calculateSentimentTrend(realisticData);
        calculateWritingHeatmap(realisticData);
        calculateWordCountAnalytics(realisticData);
      }).not.toThrow();
    });

    test('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        _id: String(i),
        content: 'word '.repeat(100),
        mood: 'positive',
        sentiment: 'positive',
        tags: ['tag1', 'tag2'],
        createdAt: new Date()
      }));

      const startTime = Date.now();
      calculateTagAnalytics(largeDataset);
      calculateWordCountAnalytics(largeDataset);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete in < 5s
    });

    test('should handle edge cases with mixed data', () => {
      const mixedData = [
        { content: '', tags: [], mood: 'positive' },
        { content: 'a', tags: ['tag'], mood: 'neutral' },
        { content: null, tags: null, mood: null },
        { content: 'word '.repeat(500), tags: ['a', 'b', 'c'], mood: 'negative' }
      ];

      expect(() => {
        calculateTagAnalytics(mixedData);
        calculateWordCountAnalytics(mixedData);
      }).not.toThrow();
    });
  });

  // =========================================================================
  // DATA CONSISTENCY TESTS
  // =========================================================================

  describe('Data Consistency', () => {
    test('sentiment percentages should always sum to 100', () => {
      const result = calculateSentimentTrend(mockEntries, 'day');
      result.forEach((period) => {
        const sum = period.positive + period.neutral + period.negative;
        expect(sum).toBe(100);
      });
    });

    test('word distribution should sum to total entries', () => {
      const result = calculateWordCountAnalytics(mockEntries);
      const sum = Object.values(result.wordDistribution).reduce((a, b) => a + b, 0);
      expect(sum).toBe(mockEntries.length);
    });

    test('tag frequency should match unique tags count', () => {
      const result = calculateTagAnalytics(mockEntries);
      const sumFrequency = result.tagFrequency.reduce((sum, tag) => sum + tag.frequency, 0);
      expect(sumFrequency).toBe(result.totalTagUsages);
    });

    test('heatmap counts should match entry dates', () => {
      const result = calculateWritingHeatmap(mockEntries);
      const totalFromHeatmap = Object.values(result).reduce((a, b) => a + b, 0);
      expect(totalFromHeatmap).toBe(mockEntries.length);
    });
  });
});
