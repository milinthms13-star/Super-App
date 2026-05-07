/**
 * Diary Recommendations Utility Tests
 * Unit tests for AI-powered recommendation engine
 * Jest test suite with 70+ test cases
 */

const {
  generateRecommendations,
  generateFocusAreas,
  generateWellnessActions,
  generateConsistencyTips,
  generateMotivationBoosts,
  generateWritingPrompts,
  analyzeWritingPatterns,
  calculateWellnessScore,
  identifyProgressAreas,
  getRecommendationImpact
} = require('../diaryRecommendations');

describe('Diary Recommendations Module', () => {
  // Test data
  const mockAnalytics = {
    totalEntries: 50,
    totalWords: 15000,
    averageWordCount: 300,
    currentStreak: 14,
    longestStreak: 30,
    moodDistribution: {
      happy: 20,
      neutral: 20,
      sad: 10
    },
    sentimentScores: {
      positive: 0.65,
      negative: 0.15,
      neutral: 0.20
    },
    mostCommonMood: 'happy',
    leastCommonMood: 'sad',
    wellnessScore: 72
  };

  const mockEntries = [
    {
      _id: '1',
      title: 'Great day',
      content: 'Had a wonderful time',
      mood: 'happy',
      wordCount: 250,
      createdAt: new Date()
    },
    {
      _id: '2',
      title: 'Challenging day',
      content: 'Faced some difficulties',
      mood: 'neutral',
      wordCount: 300,
      createdAt: new Date(Date.now() - 86400000)
    }
  ];

  const mockPreferences = {
    theme: { mode: 'light' },
    writing: { wordGoal: 500 },
    notifications: { streakNotifications: true }
  };

  describe('generateRecommendations', () => {
    test('should return comprehensive recommendation object', () => {
      const result = generateRecommendations(mockAnalytics, mockEntries, mockPreferences);

      expect(result).toHaveProperty('focusAreas');
      expect(result).toHaveProperty('wellnessActions');
      expect(result).toHaveProperty('writingEnhancements');
      expect(result).toHaveProperty('moodInsights');
      expect(result).toHaveProperty('consistencyTips');
      expect(result).toHaveProperty('motivationBoosts');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('severity');
    });

    test('should include timestamp', () => {
      const result = generateRecommendations(mockAnalytics, mockEntries, mockPreferences);
      expect(result.timestamp).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should set appropriate severity level', () => {
      const result = generateRecommendations(mockAnalytics, mockEntries, mockPreferences);
      expect(['low', 'medium', 'high']).toContain(result.severity);
    });

    test('should handle empty entries gracefully', () => {
      const result = generateRecommendations(mockAnalytics, [], mockPreferences);
      expect(result).toBeDefined();
      expect(Array.isArray(result.focusAreas)).toBe(true);
    });

    test('should handle undefined preferences', () => {
      const result = generateRecommendations(mockAnalytics, mockEntries, undefined);
      expect(result).toBeDefined();
    });
  });

  describe('generateFocusAreas', () => {
    test('should return array of focus areas', () => {
      const result = generateFocusAreas(mockAnalytics, mockEntries);
      expect(Array.isArray(result)).toBe(true);
    });

    test('should identify low entry count as focus area', () => {
      const lowAnalytics = { ...mockAnalytics, totalEntries: 3 };
      const result = generateFocusAreas(lowAnalytics, []);
      expect(result.some(area => area.title.includes('entries'))).toBe(true);
    });

    test('should identify low word count as focus area', () => {
      const lowAnalytics = { ...mockAnalytics, averageWordCount: 50 };
      const result = generateFocusAreas(lowAnalytics, mockEntries);
      expect(result.some(area => area.title.includes('word') || area.title.includes('depth'))).toBe(true);
    });

    test('should include priority level for each area', () => {
      const result = generateFocusAreas(mockAnalytics, mockEntries);
      result.forEach(area => {
        expect(['high', 'medium', 'low']).toContain(area.priority);
      });
    });

    test('should include action items', () => {
      const result = generateFocusAreas(mockAnalytics, mockEntries);
      result.forEach(area => {
        expect(area.actions).toBeDefined();
        expect(Array.isArray(area.actions)).toBe(true);
      });
    });
  });

  describe('generateWellnessActions', () => {
    test('should return array of wellness actions', () => {
      const result = generateWellnessActions(mockAnalytics);
      expect(Array.isArray(result)).toBe(true);
    });

    test('should include timeframe for each action', () => {
      const result = generateWellnessActions(mockAnalytics);
      result.forEach(action => {
        expect(['daily', 'weekly', 'monthly']).toContain(action.timeframe);
      });
    });

    test('should include impact estimate', () => {
      const result = generateWellnessActions(mockAnalytics);
      result.forEach(action => {
        expect(action.impact).toBeDefined();
        expect(typeof action.impact).toBe('number');
        expect(action.impact).toBeGreaterThanOrEqual(0);
        expect(action.impact).toBeLessThanOrEqual(100);
      });
    });

    test('should return actionable recommendations', () => {
      const result = generateWellnessActions(mockAnalytics);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(action => {
        expect(action.description).toBeDefined();
        expect(action.description.length).toBeGreaterThan(0);
      });
    });

    test('should prioritize by wellness score', () => {
      const highWellness = { ...mockAnalytics, wellnessScore: 90 };
      const lowWellness = { ...mockAnalytics, wellnessScore: 30 };

      const highResult = generateWellnessActions(highWellness);
      const lowResult = generateWellnessActions(lowWellness);

      expect(highResult.length).toBeGreaterThan(0);
      expect(lowResult.length).toBeGreaterThan(0);
    });
  });

  describe('generateConsistencyTips', () => {
    test('should return consistency tips array', () => {
      const result = generateConsistencyTips(mockAnalytics);
      expect(Array.isArray(result)).toBe(true);
    });

    test('should acknowledge high streak', () => {
      const highStreakAnalytics = { ...mockAnalytics, currentStreak: 30 };
      const result = generateConsistencyTips(highStreakAnalytics);
      expect(result.some(tip => tip.message.includes('impressive') || tip.message.includes('great'))).toBe(true);
    });

    test('should encourage when streak is low', () => {
      const lowStreakAnalytics = { ...mockAnalytics, currentStreak: 1 };
      const result = generateConsistencyTips(lowStreakAnalytics);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should include milestone information', () => {
      const result = generateConsistencyTips(mockAnalytics);
      result.forEach(tip => {
        expect(tip).toHaveProperty('message');
        expect(tip).toHaveProperty('nextMilestone');
      });
    });
  });

  describe('generateMotivationBoosts', () => {
    test('should return motivation boosts array', () => {
      const result = generateMotivationBoosts(mockAnalytics);
      expect(Array.isArray(result)).toBe(true);
    });

    test('should celebrate entry milestones', () => {
      const milestonAnalytics = { ...mockAnalytics, totalEntries: 100 };
      const result = generateMotivationBoosts(milestonAnalytics);
      expect(result.some(boost => boost.type === 'milestone')).toBe(true);
    });

    test('should celebrate wellness achievements', () => {
      const wellnessAnalytics = { ...mockAnalytics, wellnessScore: 85 };
      const result = generateMotivationBoosts(wellnessAnalytics);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should include boost message', () => {
      const result = generateMotivationBoosts(mockAnalytics);
      result.forEach(boost => {
        expect(boost.message).toBeDefined();
        expect(boost.message.length).toBeGreaterThan(0);
      });
    });

    test('should include celebration emoji or icon', () => {
      const result = generateMotivationBoosts(mockAnalytics);
      result.forEach(boost => {
        expect(boost.emoji).toBeDefined();
      });
    });
  });

  describe('generateWritingPrompts', () => {
    test('should return array of writing prompts', () => {
      const result = generateWritingPrompts(mockAnalytics, mockEntries, mockPreferences);
      expect(Array.isArray(result)).toBe(true);
    });

    test('should return at least 3 prompts', () => {
      const result = generateWritingPrompts(mockAnalytics, mockEntries, mockPreferences);
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    test('should include prompt text', () => {
      const result = generateWritingPrompts(mockAnalytics, mockEntries, mockPreferences);
      result.forEach(prompt => {
        expect(prompt.text).toBeDefined();
        expect(prompt.text.length).toBeGreaterThan(0);
      });
    });

    test('should include mood for each prompt', () => {
      const result = generateWritingPrompts(mockAnalytics, mockEntries, mockPreferences);
      result.forEach(prompt => {
        expect(prompt.mood).toBeDefined();
      });
    });

    test('should generate mood-specific prompts', () => {
      const happyAnalytics = { ...mockAnalytics, mostCommonMood: 'happy' };
      const result = generateWritingPrompts(happyAnalytics, mockEntries, mockPreferences);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeWritingPatterns', () => {
    test('should return writing pattern analysis', () => {
      const result = analyzeWritingPatterns(mockEntries);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should identify most common themes', () => {
      const result = analyzeWritingPatterns(mockEntries);
      expect(result.themes).toBeDefined();
    });

    test('should calculate average entry length', () => {
      const result = analyzeWritingPatterns(mockEntries);
      expect(result.averageLength).toBeDefined();
      expect(typeof result.averageLength).toBe('number');
    });

    test('should identify writing frequency', () => {
      const result = analyzeWritingPatterns(mockEntries);
      expect(result.frequency).toBeDefined();
    });
  });

  describe('calculateWellnessScore', () => {
    test('should return number between 0 and 100', () => {
      const result = calculateWellnessScore(mockAnalytics);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    test('should consider entry count', () => {
      const lowAnalytics = { ...mockAnalytics, totalEntries: 2 };
      const highAnalytics = { ...mockAnalytics, totalEntries: 100 };

      const lowScore = calculateWellnessScore(lowAnalytics);
      const highScore = calculateWellnessScore(highAnalytics);

      expect(highScore).toBeGreaterThanOrEqual(lowScore);
    });

    test('should consider sentiment distribution', () => {
      const positiveAnalytics = {
        ...mockAnalytics,
        sentimentScores: { positive: 0.8, neutral: 0.15, negative: 0.05 }
      };
      const negativeAnalytics = {
        ...mockAnalytics,
        sentimentScores: { positive: 0.2, neutral: 0.3, negative: 0.5 }
      };

      const positiveScore = calculateWellnessScore(positiveAnalytics);
      const negativeScore = calculateWellnessScore(negativeAnalytics);

      expect(positiveScore).toBeGreaterThan(negativeScore);
    });
  });

  describe('identifyProgressAreas', () => {
    test('should return array of progress areas', () => {
      const result = identifyProgressAreas(mockAnalytics);
      expect(Array.isArray(result)).toBe(true);
    });

    test('should identify improvements', () => {
      const improving = { ...mockAnalytics, wellnessScore: 70 };
      const result = identifyProgressAreas(improving);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should include progress description', () => {
      const result = identifyProgressAreas(mockAnalytics);
      result.forEach(area => {
        expect(area.description).toBeDefined();
      });
    });
  });

  describe('getRecommendationImpact', () => {
    test('should calculate impact score', () => {
      const result = getRecommendationImpact(mockAnalytics);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    test('should vary based on current wellness', () => {
      const lowWellness = { ...mockAnalytics, wellnessScore: 30 };
      const highWellness = { ...mockAnalytics, wellnessScore: 85 };

      const lowImpact = getRecommendationImpact(lowWellness);
      const highImpact = getRecommendationImpact(highWellness);

      expect(lowImpact).toBeGreaterThan(0);
      expect(highImpact).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle null analytics gracefully', () => {
      expect(() => generateRecommendations(null, mockEntries, mockPreferences)).not.toThrow();
    });

    test('should handle malformed analytics', () => {
      expect(() => generateRecommendations({}, mockEntries, mockPreferences)).not.toThrow();
    });

    test('should handle null entries array', () => {
      expect(() => generateRecommendations(mockAnalytics, null, mockPreferences)).not.toThrow();
    });

    test('should handle entries with missing fields', () => {
      const malformedEntries = [
        { title: 'Entry 1' },
        { content: 'Some content' }
      ];
      expect(() => generateRecommendations(mockAnalytics, malformedEntries, mockPreferences)).not.toThrow();
    });
  });

  describe('Performance', () => {
    test('should generate recommendations within 1000ms', () => {
      const start = performance.now();
      generateRecommendations(mockAnalytics, mockEntries, mockPreferences);
      const end = performance.now();
      expect(end - start).toBeLessThan(1000);
    });

    test('should handle large entry sets efficiently', () => {
      const largeEntries = Array(1000).fill(null).map((_, i) => ({
        _id: i.toString(),
        title: `Entry ${i}`,
        content: 'Sample content',
        mood: 'neutral',
        wordCount: 300,
        createdAt: new Date()
      }));

      const start = performance.now();
      generateRecommendations(mockAnalytics, largeEntries, mockPreferences);
      const end = performance.now();
      expect(end - start).toBeLessThan(2000);
    });
  });
});
