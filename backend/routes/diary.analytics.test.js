/**
 * Diary Analytics API Integration Tests
 * Tests for all Phase 6 analytics endpoints
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Mock data and setup
const mockToken = jwt.sign({ userId: 'test-user-123' }, 'test-secret');
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, 'test-secret');
    req.userId = decoded.userId;
    next();
  } catch (e) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Create mock app with routes
const createMockApp = () => {
  const app = express();
  app.use(express.json());
  app.use(authenticateToken);

  // Mock middleware
  const logger = { debug: jest.fn(), info: jest.fn(), error: jest.fn() };

  // Import routes (would be actual routes in real scenario)
  const analyticsRoutes = require('../routes/diary');
  
  app.use('/api/diary', analyticsRoutes);

  return app;
};

describe('Diary Analytics API Endpoints', () => {
  let app;
  let mockFetch;

  beforeAll(() => {
    app = createMockApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDashboardResponse = {
    writing: {
      entryCount: 45,
      totalWords: 12500,
      avgWords: 278,
      entriesPerDay: 1.5
    },
    streak: {
      currentStreak: 12,
      longestStreak: 25
    },
    mood: {
      moodCounts: { positive: 20, neutral: 15, negative: 10 }
    },
    wellness: { score: 75, level: 'High' }
  };

  const mockSentimentTrend = [
    { period: '2024-05-01', positive: 70, neutral: 20, negative: 10, entries: 3 }
  ];

  const mockTagAnalytics = {
    uniqueTags: 12,
    totalTagUsages: 45,
    tagFrequency: [
      { tag: 'productivity', frequency: 8, trend: 'up' }
    ]
  };

  const mockWordCountAnalytics = {
    totalWords: 12500,
    avgWords: 278,
    wordDistribution: { veryShort: 5, short: 15, medium: 18, long: 5, veryLong: 2 }
  };

  const mockHeatmapData = {
    '2024-05-01': 2,
    '2024-05-02': 1,
    '2024-05-03': 3
  };

  // =========================================================================
  // DASHBOARD ENDPOINT TESTS
  // =========================================================================

  describe('GET /api/diary/analytics/dashboard', () => {
    test('should return 200 with valid token', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/dashboard')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    test('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/dashboard');

      expect(response.status).toBe(401);
    });

    test('should accept daysBack query parameter', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/dashboard?daysBack=30')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
    });

    test('should accept multiple daysBack values', async () => {
      const values = [7, 30, 90, 180, 365];
      
      for (const daysBack of values) {
        const response = await request(app)
          .get(`/api/diary/analytics/dashboard?daysBack=${daysBack}`)
          .set('Authorization', `Bearer ${mockToken}`);

        expect(response.status).toBe(200);
      }
    });

    test('should return all required fields', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/dashboard')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.body.data).toHaveProperty('writing');
      expect(response.body.data).toHaveProperty('streak');
      expect(response.body.data).toHaveProperty('mood');
      expect(response.body.data).toHaveProperty('wellness');
    });

    test('should handle invalid daysBack parameter', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/dashboard?daysBack=abc')
        .set('Authorization', `Bearer ${mockToken}`);

      // Should either return 400 or use default value
      expect([200, 400]).toContain(response.status);
    });
  });

  // =========================================================================
  // SENTIMENT TREND ENDPOINT TESTS
  // =========================================================================

  describe('GET /api/diary/analytics/sentiment-trend', () => {
    test('should return 200 with valid parameters', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/sentiment-trend?groupBy=week&daysBack=90')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should accept different groupBy values', async () => {
      const groupByValues = ['day', 'week', 'month'];

      for (const groupBy of groupByValues) {
        const response = await request(app)
          .get(`/api/diary/analytics/sentiment-trend?groupBy=${groupBy}`)
          .set('Authorization', `Bearer ${mockToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    test('should return sentiment data with period and percentages', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/sentiment-trend?groupBy=day')
        .set('Authorization', `Bearer ${mockToken}`);

      if (response.body.data.length > 0) {
        const item = response.body.data[0];
        expect(item).toHaveProperty('period');
        expect(item).toHaveProperty('positive');
        expect(item).toHaveProperty('neutral');
        expect(item).toHaveProperty('negative');
      }
    });

    test('should handle invalid groupBy parameter', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/sentiment-trend?groupBy=invalid')
        .set('Authorization', `Bearer ${mockToken}`);

      // Should either return 400 or use default
      expect([200, 400]).toContain(response.status);
    });

    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/sentiment-trend');

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // TAG ANALYTICS ENDPOINT TESTS
  // =========================================================================

  describe('GET /api/diary/analytics/tags', () => {
    test('should return 200 with valid parameters', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/tags?limit=10&daysBack=90')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    test('should accept limit parameter', async () => {
      const limits = [5, 10, 20];

      for (const limit of limits) {
        const response = await request(app)
          .get(`/api/diary/analytics/tags?limit=${limit}`)
          .set('Authorization', `Bearer ${mockToken}`);

        expect(response.status).toBe(200);
        if (response.body.data.tagFrequency) {
          expect(response.body.data.tagFrequency.length).toBeLessThanOrEqual(limit);
        }
      }
    });

    test('should return tag frequency data', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/tags')
        .set('Authorization', `Bearer ${mockToken}`);

      const data = response.body.data;
      expect(data).toHaveProperty('uniqueTags');
      expect(data).toHaveProperty('totalTagUsages');
      expect(data).toHaveProperty('tagFrequency');
      expect(Array.isArray(data.tagFrequency)).toBe(true);
    });

    test('should include tag metadata', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/tags')
        .set('Authorization', `Bearer ${mockToken}`);

      const data = response.body.data;
      if (data.tagFrequency.length > 0) {
        const tag = data.tagFrequency[0];
        expect(tag).toHaveProperty('tag');
        expect(tag).toHaveProperty('frequency');
        expect(tag).toHaveProperty('trend');
      }
    });

    test('should handle invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/tags?limit=abc')
        .set('Authorization', `Bearer ${mockToken}`);

      expect([200, 400]).toContain(response.status);
    });
  });

  // =========================================================================
  // HEATMAP ENDPOINT TESTS
  // =========================================================================

  describe('GET /api/diary/analytics/heatmap', () => {
    test('should return 200 with valid parameters', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/heatmap?monthsBack=6')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(typeof response.body.data).toBe('object');
    });

    test('should return date-to-count mapping', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/heatmap')
        .set('Authorization', `Bearer ${mockToken}`);

      const data = response.body.data;
      if (Object.keys(data).length > 0) {
        const firstKey = Object.keys(data)[0];
        expect(firstKey).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
        expect(typeof data[firstKey]).toBe('number');
      }
    });

    test('should accept monthsBack parameter', async () => {
      const months = [1, 3, 6, 12];

      for (const monthsBack of months) {
        const response = await request(app)
          .get(`/api/diary/analytics/heatmap?monthsBack=${monthsBack}`)
          .set('Authorization', `Bearer ${mockToken}`);

        expect(response.status).toBe(200);
      }
    });

    test('should return dates in correct format', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/heatmap')
        .set('Authorization', `Bearer ${mockToken}`);

      Object.keys(response.body.data).forEach((date) => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  // =========================================================================
  // WORD COUNT ENDPOINT TESTS
  // =========================================================================

  describe('GET /api/diary/analytics/word-count', () => {
    test('should return 200 with valid parameters', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/word-count?daysBack=90')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    test('should return word count statistics', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/word-count')
        .set('Authorization', `Bearer ${mockToken}`);

      const data = response.body.data;
      expect(data).toHaveProperty('totalWords');
      expect(data).toHaveProperty('avgWords');
      expect(data).toHaveProperty('minWords');
      expect(data).toHaveProperty('maxWords');
      expect(data).toHaveProperty('median');
    });

    test('should return word distribution', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/word-count')
        .set('Authorization', `Bearer ${mockToken}`);

      const data = response.body.data;
      expect(data).toHaveProperty('wordDistribution');
      expect(data.wordDistribution).toHaveProperty('veryShort');
      expect(data.wordDistribution).toHaveProperty('short');
      expect(data.wordDistribution).toHaveProperty('medium');
      expect(data.wordDistribution).toHaveProperty('long');
      expect(data.wordDistribution).toHaveProperty('veryLong');
    });
  });

  // =========================================================================
  // MONTHLY SUMMARY ENDPOINT TESTS
  // =========================================================================

  describe('GET /api/diary/analytics/monthly-summary/:year/:month', () => {
    test('should return 200 with valid year and month', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/monthly-summary/2024/05')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    test('should return 400 with invalid month', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/monthly-summary/2024/13')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
    });

    test('should include monthly statistics', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/monthly-summary/2024/05')
        .set('Authorization', `Bearer ${mockToken}`);

      if (response.status === 200) {
        const data = response.body.data;
        expect(data).toHaveProperty('stats');
        expect(data).toHaveProperty('mood');
      }
    });

    test('should handle different valid dates', async () => {
      const dates = ['2024/01', '2024/06', '2024/12', '2023/05'];

      for (const date of dates) {
        const [year, month] = date.split('/');
        const response = await request(app)
          .get(`/api/diary/analytics/monthly-summary/${year}/${month}`)
          .set('Authorization', `Bearer ${mockToken}`);

        expect([200, 404, 400]).toContain(response.status);
      }
    });
  });

  // =========================================================================
  // INSIGHTS ENDPOINT TESTS
  // =========================================================================

  describe('GET /api/diary/analytics/insights', () => {
    test('should return 200 with valid token', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/insights?daysBack=90')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should return insights array', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/insights')
        .set('Authorization', `Bearer ${mockToken}`);

      const data = response.body.data;
      expect(Array.isArray(data)).toBe(true);
    });

    test('should include insight metadata', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/insights')
        .set('Authorization', `Bearer ${mockToken}`);

      if (response.body.data.length > 0) {
        const insight = response.body.data[0];
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('message');
      }
    });

    test('should handle daysBack parameter', async () => {
      const values = [7, 30, 90];

      for (const daysBack of values) {
        const response = await request(app)
          .get(`/api/diary/analytics/insights?daysBack=${daysBack}`)
          .set('Authorization', `Bearer ${mockToken}`);

        expect(response.status).toBe(200);
      }
    });
  });

  // =========================================================================
  // ERROR HANDLING TESTS
  // =========================================================================

  describe('Error Handling', () => {
    test('should return 401 for all endpoints without token', async () => {
      const endpoints = [
        '/api/diary/analytics/dashboard',
        '/api/diary/analytics/sentiment-trend',
        '/api/diary/analytics/tags',
        '/api/diary/analytics/heatmap',
        '/api/diary/analytics/word-count',
        '/api/diary/analytics/insights',
        '/api/diary/analytics/monthly-summary/2024/05'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);
      }
    });

    test('should return 403 for invalid token', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/dashboard')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });

    test('should return consistent error response format', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/dashboard');

      expect(response.body).toHaveProperty('error');
    });
  });

  // =========================================================================
  // CACHING TESTS
  // =========================================================================

  describe('Caching Behavior', () => {
    test('should return data quickly on repeated requests', async () => {
      const endpoint = '/api/diary/analytics/dashboard';

      const start1 = Date.now();
      await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${mockToken}`);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${mockToken}`);
      const time2 = Date.now() - start2;

      // Second request should be comparable or faster
      expect(time2).toBeLessThanOrEqual(time1 * 2);
    });
  });

  // =========================================================================
  // RESPONSE FORMAT TESTS
  // =========================================================================

  describe('Response Format', () => {
    test('should return consistent success response structure', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/dashboard')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.body).toEqual({
        success: expect.any(Boolean),
        data: expect.any(Object)
      });
    });

    test('should have JSON Content-Type', async () => {
      const response = await request(app)
        .get('/api/diary/analytics/dashboard')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.type).toBe('application/json');
    });

    test('should have appropriate status codes', async () => {
      const successResponse = await request(app)
        .get('/api/diary/analytics/dashboard')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(successResponse.status).toBe(200);

      const unauthorizedResponse = await request(app)
        .get('/api/diary/analytics/dashboard');

      expect(unauthorizedResponse.status).toBe(401);
    });
  });
});
