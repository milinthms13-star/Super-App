const {
  generateCSV,
  generateAnalyticsCSV,
  generatePDFMetadata,
  generateJSONExport,
  escapeCSV,
  formatDate,
  generateDateRange,
  countWords,
} = require('./diaryExport');

describe('diaryExport utilities', () => {
  const mockEntries = [
    {
      _id: '1',
      title: 'First Entry',
      content: 'This is the first entry content',
      mood: 'happy',
      category: 'daily',
      tags: ['mood', 'reflection'],
      wordCount: 150,
      isDraft: false,
      sentiment: 'positive',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    },
    {
      _id: '2',
      title: 'Second Entry',
      content: 'This entry has "quotes" and commas, too',
      mood: 'neutral',
      category: 'thoughts',
      tags: ['ideas'],
      wordCount: 120,
      isDraft: true,
      sentiment: 'neutral',
      createdAt: new Date('2024-01-02T00:00:00.000Z'),
    },
  ];

  const mockAnalytics = {
    writing: {
      entryCount: 2,
      totalWords: 270,
      avgWords: 135,
    },
    mood: {
      dominantMood: 'happy',
      moodCounts: { happy: 1, neutral: 1 },
    },
    tags: {
      uniqueTags: 3,
      totalTagUsages: 3,
      tagFrequency: [{ tag: 'mood', frequency: 1 }],
    },
    wellness: {
      score: 75,
      level: 'High',
    },
  };

  test('generates csv with headers and escaped values', () => {
    const result = generateCSV(mockEntries);

    expect(result).toContain('"Date","Title","Content","Mood"');
    expect(result).toContain('First Entry');
    expect(result).toContain('""quotes""');
  });

  test('generates analytics csv from dashboard data', () => {
    const result = generateAnalyticsCSV(mockAnalytics);

    expect(result).toContain('Metric,Value,Details');
    expect(result).toContain('Total Entries,2');
    expect(result).toContain('Wellness Score,75');
  });

  test('builds pdf metadata with entries and analytics summary', () => {
    const result = generatePDFMetadata(mockEntries, mockAnalytics);

    expect(result.title).toBeDefined();
    expect(result.entries).toHaveLength(2);
    expect(result.analyticsSummary).toBeDefined();
    expect(result.dateRange).toContain('2024');
  });

  test('builds json exports with metadata and entry payloads', () => {
    const result = generateJSONExport(mockEntries, mockAnalytics);

    expect(result.version).toBe('1.0');
    expect(result.metadata.exportedAt).toBeDefined();
    expect(result.entries).toHaveLength(2);
    expect(result.analytics).toEqual(mockAnalytics);
  });

  test('escapes csv helper values safely', () => {
    expect(escapeCSV('Hello "World"')).toBe('Hello ""World""');
    expect(escapeCSV('line 1\nline 2')).toBe('line 1 line 2');
  });

  test('formats dates and ranges consistently', () => {
    expect(formatDate(new Date('2024-01-15T00:00:00.000Z'))).toMatch(/\d{2}\/\d{2}\/2024/);
    expect(generateDateRange(mockEntries)).toContain('2024');
  });

  test('counts words defensively', () => {
    expect(countWords('Hello world test')).toBe(3);
    expect(countWords('')).toBe(0);
    expect(countWords(null)).toBe(0);
  });
});
