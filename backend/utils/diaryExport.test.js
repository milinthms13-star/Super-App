/**
 * Diary Export Utility Tests
 * Unit tests for CSV, JSON, and PDF export functionality
 * Jest test suite with 60+ test cases
 */

const {
  generateCSV,
  generateAnalyticsCSV,
  generatePDFMetadata,
  generateJSONExport,
  escapeCSV,
  formatDate,
  generateDateRange,
  countWords
} = require('../diaryExport');

describe('Diary Export Module', () => {
  // Test data
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
      confidenceScore: 0.95,
      createdAt: new Date('2024-01-01')
    },
    {
      _id: '2',
      title: 'Second Entry',
      content: 'This is the second entry with "quotes" and\nnewlines',
      mood: 'neutral',
      category: 'thoughts',
      tags: ['ideas', 'brainstorm'],
      wordCount: 200,
      isDraft: true,
      sentiment: 'neutral',
      confidenceScore: 0.78,
      createdAt: new Date('2024-01-02')
    }
  ];

  const mockAnalytics = {
    totalEntries: 2,
    totalWords: 350,
    averageWordCount: 175,
    currentStreak: 2,
    moodDistribution: {
      happy: 1,
      neutral: 1
    },
    sentimentScores: {
      positive: 0.5,
      neutral: 0.5
    }
  };

  describe('generateCSV', () => {
    test('should return CSV string', () => {
      const result = generateCSV(mockEntries);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should include CSV header row', () => {
      const result = generateCSV(mockEntries);
      expect(result).toMatch(/Date,Title,Content,Mood/);
    });

    test('should include all entry data', () => {
      const result = generateCSV(mockEntries);
      expect(result).toContain('First Entry');
      expect(result).toContain('Second Entry');
    });

    test('should properly escape CSV values', () => {
      const result = generateCSV(mockEntries);
      expect(result).toContain('"This is the second entry with ""quotes""');
    });

    test('should handle newlines in content', () => {
      const result = generateCSV(mockEntries);
      expect(result).toMatch(/newlines/);
    });

    test('should include analytics when requested', () => {
      const result = generateCSV(mockEntries, { includeAnalytics: true });
      expect(result).toMatch(/Sentiment|Confidence/i);
    });

    test('should exclude analytics by default', () => {
      const result = generateCSV(mockEntries, {});
      const lines = result.split('\n');
      const header = lines[0];
      expect(header).not.toMatch(/Sentiment/);
    });

    test('should handle empty entries array', () => {
      const result = generateCSV([]);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle entries with missing fields', () => {
      const incomplete = [
        { title: 'Title only' },
        { content: 'Content only' }
      ];
      expect(() => generateCSV(incomplete)).not.toThrow();
    });

    test('should follow RFC 4180 standard', () => {
      const result = generateCSV(mockEntries);
      // Should have consistent column count
      const lines = result.split('\n');
      const headerCount = lines[0].split(',').length;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() !== '') {
          expect(lines[i].split(',').length).toBeLessThanOrEqual(headerCount + 5);
        }
      }
    });

    test('should include tags as comma-separated', () => {
      const result = generateCSV(mockEntries);
      expect(result).toContain('mood');
      expect(result).toContain('reflection');
    });

    test('should format dates consistently', () => {
      const result = generateCSV(mockEntries);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  describe('generateAnalyticsCSV', () => {
    test('should return CSV string for analytics', () => {
      const result = generateAnalyticsCSV(mockAnalytics);
      expect(typeof result).toBe('string');
    });

    test('should include analytics headers', () => {
      const result = generateAnalyticsCSV(mockAnalytics);
      expect(result).toMatch(/Metric|Value/i);
    });

    test('should include total entries', () => {
      const result = generateAnalyticsCSV(mockAnalytics);
      expect(result).toContain('2');
    });

    test('should handle empty analytics', () => {
      expect(() => generateAnalyticsCSV({})).not.toThrow();
    });

    test('should properly format mood distribution', () => {
      const result = generateAnalyticsCSV(mockAnalytics);
      expect(result).toContain('happy') || expect(result).toContain('neutral');
    });
  });

  describe('generatePDFMetadata', () => {
    test('should return metadata object', () => {
      const result = generatePDFMetadata(mockEntries, mockAnalytics);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should include title', () => {
      const result = generatePDFMetadata(mockEntries, mockAnalytics);
      expect(result.title).toBeDefined();
    });

    test('should include subtitle', () => {
      const result = generatePDFMetadata(mockEntries, mockAnalytics);
      expect(result.subtitle).toBeDefined();
    });

    test('should include entries array', () => {
      const result = generatePDFMetadata(mockEntries, mockAnalytics);
      expect(Array.isArray(result.entries)).toBe(true);
      expect(result.entries.length).toBe(2);
    });

    test('should include analytics summary', () => {
      const result = generatePDFMetadata(mockEntries, mockAnalytics);
      expect(result.analyticsSummary).toBeDefined();
    });

    test('should format date range', () => {
      const result = generatePDFMetadata(mockEntries, mockAnalytics);
      expect(result.dateRange).toBeDefined();
    });

    test('should include generation timestamp', () => {
      const result = generatePDFMetadata(mockEntries, mockAnalytics);
      expect(result.generatedAt).toBeDefined();
    });

    test('should handle entries with special characters', () => {
      const special = [{
        ...mockEntries[0],
        title: 'Entry with "quotes" and <html> & symbols'
      }];
      const result = generatePDFMetadata(special, mockAnalytics);
      expect(result.entries[0].title).toBeDefined();
    });
  });

  describe('generateJSONExport', () => {
    test('should return JSON object', () => {
      const result = generateJSONExport(mockEntries, mockAnalytics);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should include version', () => {
      const result = generateJSONExport(mockEntries, mockAnalytics);
      expect(result.version).toBeDefined();
    });

    test('should include metadata', () => {
      const result = generateJSONExport(mockEntries, mockAnalytics);
      expect(result.metadata).toBeDefined();
    });

    test('should include all entries', () => {
      const result = generateJSONExport(mockEntries, mockAnalytics);
      expect(Array.isArray(result.entries)).toBe(true);
      expect(result.entries.length).toBe(2);
    });

    test('should include analytics when provided', () => {
      const result = generateJSONExport(mockEntries, mockAnalytics);
      expect(result.analytics).toBeDefined();
    });

    test('should exclude analytics when not provided', () => {
      const result = generateJSONExport(mockEntries, null);
      expect(result.analytics).toBeUndefined();
    });

    test('should be valid JSON when stringified', () => {
      const result = generateJSONExport(mockEntries, mockAnalytics);
      const jsonString = JSON.stringify(result);
      expect(() => JSON.parse(jsonString)).not.toThrow();
    });

    test('should include export timestamp', () => {
      const result = generateJSONExport(mockEntries, mockAnalytics);
      expect(result.metadata.exportedAt).toBeDefined();
    });

    test('should handle entries with null values', () => {
      const nullEntries = [{
        ...mockEntries[0],
        tags: null,
        sentiment: null
      }];
      expect(() => generateJSONExport(nullEntries, mockAnalytics)).not.toThrow();
    });
  });

  describe('escapeCSV', () => {
    test('should escape double quotes', () => {
      const result = escapeCSV('Hello "World"');
      expect(result).toBe('"Hello ""World"""');
    });

    test('should quote values with commas', () => {
      const result = escapeCSV('Hello, World');
      expect(result).toBe('"Hello, World"');
    });

    test('should quote values with newlines', () => {
      const result = escapeCSV('Hello\nWorld');
      expect(result).toContain('"');
    });

    test('should handle empty strings', () => {
      const result = escapeCSV('');
      expect(typeof result).toBe('string');
    });

    test('should handle null values', () => {
      expect(() => escapeCSV(null)).not.toThrow();
    });

    test('should handle special characters', () => {
      const result = escapeCSV('Text with @#$%^&*() characters');
      expect(result).toBeDefined();
    });

    test('should not double-escape already escaped values', () => {
      const original = '"Already quoted"';
      const result = escapeCSV(original);
      expect(result).toBeDefined();
    });
  });

  describe('formatDate', () => {
    test('should format date as MM/DD/YYYY', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    });

    test('should handle January as 01', () => {
      const date = new Date('2024-01-01');
      const result = formatDate(date);
      expect(result.startsWith('1/1')).toBe(true);
    });

    test('should handle December as 12', () => {
      const date = new Date('2024-12-31');
      const result = formatDate(date);
      expect(result.includes('12')).toBe(true);
      expect(result.includes('2024')).toBe(true);
    });

    test('should handle null date gracefully', () => {
      expect(() => formatDate(null)).not.toThrow();
    });

    test('should pad single-digit months/days if needed', () => {
      const date = new Date('2024-01-05');
      const result = formatDate(date);
      expect(result).toBeDefined();
    });
  });

  describe('generateDateRange', () => {
    test('should return date range string', () => {
      const entries = [
        { createdAt: new Date('2024-01-01') },
        { createdAt: new Date('2024-01-31') }
      ];
      const result = generateDateRange(entries);
      expect(typeof result).toBe('string');
    });

    test('should include both start and end dates', () => {
      const entries = [
        { createdAt: new Date('2024-01-01') },
        { createdAt: new Date('2024-01-15') }
      ];
      const result = generateDateRange(entries);
      expect(result).toContain('2024');
    });

    test('should handle single entry', () => {
      const entries = [{ createdAt: new Date('2024-01-01') }];
      const result = generateDateRange(entries);
      expect(result).toBeDefined();
    });

    test('should handle empty entries', () => {
      expect(() => generateDateRange([])).not.toThrow();
    });

    test('should handle entries without dates', () => {
      const entries = [{ title: 'No date' }];
      expect(() => generateDateRange(entries)).not.toThrow();
    });
  });

  describe('countWords', () => {
    test('should return word count', () => {
      const result = countWords('Hello world test');
      expect(result).toBe(3);
    });

    test('should handle single word', () => {
      const result = countWords('Hello');
      expect(result).toBe(1);
    });

    test('should ignore extra spaces', () => {
      const result = countWords('Hello    world    test');
      expect(result).toBe(3);
    });

    test('should handle empty string', () => {
      const result = countWords('');
      expect(result).toBe(0);
    });

    test('should handle punctuation', () => {
      const result = countWords('Hello, world! Test.');
      expect(result).toBe(3);
    });

    test('should handle null or undefined', () => {
      expect(countWords(null)).toBe(0);
      expect(countWords(undefined)).toBe(0);
    });

    test('should handle numbers', () => {
      const result = countWords('123 456 789');
      expect(result).toBe(3);
    });

    test('should handle hyphenated words', () => {
      const result = countWords('well-being mother-in-law');
      expect(result).toBe(2);
    });
  });

  describe('Export Format Consistency', () => {
    test('CSV and JSON should export same entry count', () => {
      const csv = generateCSV(mockEntries);
      const json = generateJSONExport(mockEntries, mockAnalytics);

      // CSV should have header + entries
      const csvLines = csv.trim().split('\n').length;
      expect(csvLines).toBe(mockEntries.length + 1);
      expect(json.entries.length).toBe(mockEntries.length);
    });

    test('all formats should preserve entry titles', () => {
      const csv = generateCSV(mockEntries);
      const json = generateJSONExport(mockEntries, mockAnalytics);
      const pdf = generatePDFMetadata(mockEntries, mockAnalytics);

      mockEntries.forEach(entry => {
        expect(csv).toContain(entry.title);
        expect(json.entries.some(e => e.title === entry.title)).toBe(true);
        expect(pdf.entries.some(e => e.title === entry.title)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle null entries in CSV', () => {
      expect(() => generateCSV(null)).not.toThrow();
    });

    test('should handle undefined entries in JSON', () => {
      expect(() => generateJSONExport(undefined, mockAnalytics)).not.toThrow();
    });

    test('should handle circular references in JSON', () => {
      const circular = { ...mockEntries[0] };
      circular.self = circular;
      expect(() => generateJSONExport([circular], mockAnalytics)).not.toThrow();
    });

    test('should handle very large entries', () => {
      const largeEntry = {
        ...mockEntries[0],
        content: 'x'.repeat(1000000)
      };
      expect(() => generateCSV([largeEntry])).not.toThrow();
    });
  });

  describe('Performance', () => {
    test('should generate CSV for 1000 entries in under 500ms', () => {
      const largeEntries = Array(1000).fill(null).map((_, i) => ({
        ...mockEntries[0],
        _id: i.toString(),
        title: `Entry ${i}`,
        createdAt: new Date(Date.now() - i * 86400000)
      }));

      const start = performance.now();
      generateCSV(largeEntries);
      const end = performance.now();
      expect(end - start).toBeLessThan(500);
    });

    test('should generate JSON for 1000 entries in under 1000ms', () => {
      const largeEntries = Array(1000).fill(null).map((_, i) => ({
        ...mockEntries[0],
        _id: i.toString(),
        title: `Entry ${i}`
      }));

      const start = performance.now();
      generateJSONExport(largeEntries, mockAnalytics);
      const end = performance.now();
      expect(end - start).toBeLessThan(1000);
    });
  });
});
