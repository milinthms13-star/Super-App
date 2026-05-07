const {
  calculateTagAnalytics,
  calculateSentimentTrend,
  calculateWritingHeatmap,
  calculateWordCountAnalytics,
  getDashboardAnalytics,
} = require('./diaryAnalytics');

const daysAgo = (count) => {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return date;
};

describe('diaryAnalytics utilities', () => {
  const mockEntries = [
    {
      _id: '1',
      content: 'Happy thoughts ' + 'word '.repeat(20),
      mood: 'positive',
      sentiment: 'positive',
      tags: ['happiness', 'reflection'],
      createdAt: daysAgo(5),
    },
    {
      _id: '2',
      content: 'Routine update ' + 'word '.repeat(12),
      mood: 'neutral',
      sentiment: 'neutral',
      tags: ['daily', 'routine'],
      createdAt: daysAgo(4),
    },
    {
      _id: '3',
      content: 'Hard day ' + 'word '.repeat(15),
      mood: 'negative',
      sentiment: 'negative',
      tags: ['sadness', 'reflection'],
      createdAt: daysAgo(3),
    },
    {
      _id: '4',
      content: 'Things improved ' + 'word '.repeat(30),
      mood: 'positive',
      sentiment: 'positive',
      tags: ['happiness', 'progress'],
      createdAt: daysAgo(2),
    },
    {
      _id: '5',
      content: 'Feeling anxious ' + 'word '.repeat(18),
      mood: 'anxious',
      sentiment: 'negative',
      tags: ['anxiety', 'future'],
      createdAt: daysAgo(1),
    },
  ];

  test('calculates tag analytics from the current fixture set', () => {
    const result = calculateTagAnalytics(mockEntries);

    expect(result.uniqueTags).toBe(8);
    expect(result.totalTagUsages).toBe(10);
    expect(result.tagFrequency[0]).toEqual(
      expect.objectContaining({
        tag: expect.any(String),
        frequency: expect.any(Number),
        trend: expect.any(Object),
      })
    );
  });

  test('builds sentiment trend percentages that always sum to 100', () => {
    const result = calculateSentimentTrend(mockEntries, 'day');

    expect(result.length).toBeGreaterThan(0);
    result.forEach((period) => {
      expect(period.positive + period.neutral + period.negative).toBe(100);
    });
  });

  test('counts daily writing activity in the heatmap', () => {
    const sameDay = [
      { ...mockEntries[0], createdAt: daysAgo(0) },
      { ...mockEntries[1], createdAt: daysAgo(0) },
      { ...mockEntries[2], createdAt: daysAgo(0) },
    ];

    const result = calculateWritingHeatmap(sameDay, 1);
    const dateKey = new Date(daysAgo(0)).toISOString().split('T')[0];

    expect(result[dateKey]).toBe(3);
  });

  test('calculates word count statistics and a complete distribution', () => {
    const result = calculateWordCountAnalytics(mockEntries);
    const distributionTotal = Object.values(result.wordDistribution).reduce(
      (sum, count) => sum + count,
      0
    );

    expect(result.totalWords).toBeGreaterThan(0);
    expect(result.avgWords).toBeGreaterThan(0);
    expect(distributionTotal).toBe(mockEntries.length);
  });

  test('returns a complete dashboard payload', async () => {
    const result = await getDashboardAnalytics(mockEntries);

    expect(result).toHaveProperty('writing');
    expect(result).toHaveProperty('streak');
    expect(result).toHaveProperty('mood');
    expect(result).toHaveProperty('wellness');
    expect(result).toHaveProperty('tags');
    expect(result).toHaveProperty('sentiment');
    expect(result).toHaveProperty('words');
    expect(result).toHaveProperty('heatmap');
    expect(result.writing.entryCount).toBe(mockEntries.length);
  });

  test('ignores invalid dates instead of throwing', () => {
    const mixedEntries = [
      { content: '', tags: [], mood: 'positive' },
      { content: 'hello world', tags: ['tag'], mood: 'neutral', createdAt: 'not-a-date' },
      { content: 'word '.repeat(10), tags: ['tag-two'], mood: 'negative', createdAt: daysAgo(1) },
    ];

    expect(() => calculateTagAnalytics(mixedEntries)).not.toThrow();
    expect(() => calculateWritingHeatmap(mixedEntries, 1)).not.toThrow();
  });
});
