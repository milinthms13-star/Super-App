const request = require('supertest');
const express = require('express');
const router = require('./diary');
const DiaryEntry = require('../models/DiaryEntry');
const logger = require('../utils/logger');

// Mock dependencies
jest.mock('../models/DiaryEntry');
jest.mock('../models/DiaryEntryVersion');
jest.mock('../models/DiaryVersionTag');
jest.mock('../models/User');
jest.mock('../utils/logger');

// Mock middleware
const mockAuth = (req, res, next) => {
  req.user = { _id: 'test-user-id', id: 'test-user-id' };
  next();
};

// Create test app
const app = express();
app.use(express.json());
app.use(mockAuth);
app.use('/api/diary', router);

describe('Diary Search and Filter API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/diary/search/query', () => {
    test('should search entries with valid query', async () => {
      const mockEntries = [
        {
          _id: '1',
          title: 'Happy Day',
          createdAt: new Date('2026-05-01'),
          tags: ['positive'],
          sentiment: 'positive',
        },
      ];

      DiaryEntry.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockEntries),
        }),
      });

      DiaryEntry.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/diary/search/query')
        .send({
          query: 'happy',
          limit: 20,
          skip: 0,
          tags: [],
          sentiment: [],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should reject empty query', async () => {
      const response = await request(app)
        .post('/api/diary/search/query')
        .send({
          query: '',
          limit: 20,
          skip: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('query is required');
    });

    test('should filter search by tags', async () => {
      DiaryEntry.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      DiaryEntry.countDocuments.mockResolvedValue(0);

      await request(app)
        .post('/api/diary/search/query')
        .send({
          query: 'test',
          limit: 20,
          skip: 0,
          tags: ['positive'],
          sentiment: [],
        });

      const findCall = DiaryEntry.find.mock.calls[0][0];
      expect(findCall.tags).toBeDefined();
    });

    test('should filter search by date range', async () => {
      DiaryEntry.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      DiaryEntry.countDocuments.mockResolvedValue(0);

      await request(app)
        .post('/api/diary/search/query')
        .send({
          query: 'test',
          limit: 20,
          skip: 0,
          dateFrom: '2026-05-01',
          dateTo: '2026-05-31',
        });

      const findCall = DiaryEntry.find.mock.calls[0][0];
      expect(findCall.createdAt).toBeDefined();
    });

    test('should respect pagination limits', async () => {
      DiaryEntry.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      DiaryEntry.countDocuments.mockResolvedValue(100);

      const response = await request(app)
        .post('/api/diary/search/query')
        .send({
          query: 'test',
          limit: 100,
          skip: 20,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.page).toBeDefined();
    });

    test('should handle search errors', async () => {
      DiaryEntry.find.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/diary/search/query')
        .send({
          query: 'test',
          limit: 20,
          skip: 0,
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/diary/search/highlight', () => {
    test('should return search with highlighting', async () => {
      DiaryEntry.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([
            {
              _id: '1',
              title: 'Happy',
              createdAt: new Date(),
              tags: [],
            },
          ]),
        }),
      });

      DiaryEntry.findById.mockResolvedValue({
        content: 'Had a wonderful day',
      });

      DiaryEntry.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .post('/api/diary/search/highlight')
        .send({
          query: 'wonderful',
          limit: 20,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject empty query for highlight search', async () => {
      const response = await request(app)
        .post('/api/diary/search/highlight')
        .send({
          query: '',
          limit: 20,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/diary/filter/apply', () => {
    test('should apply filters to entries', async () => {
      DiaryEntry.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      DiaryEntry.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .post('/api/diary/filter/apply')
        .send({
          tags: [],
          tagMatchType: 'any',
          dateRange: { from: '', to: '' },
          sentiment: [],
          minWords: '',
          maxWords: '',
          status: '',
          minVersions: '',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should filter by tags', async () => {
      DiaryEntry.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      DiaryEntry.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .post('/api/diary/filter/apply')
        .send({
          tags: ['work', 'personal'],
          tagMatchType: 'any',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should filter by date range', async () => {
      DiaryEntry.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      DiaryEntry.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .post('/api/diary/filter/apply')
        .send({
          dateRange: {
            from: '2026-05-01',
            to: '2026-05-31',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should filter by sentiment', async () => {
      DiaryEntry.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      DiaryEntry.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .post('/api/diary/filter/apply')
        .send({
          sentiment: ['positive', 'neutral'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle filter errors', async () => {
      DiaryEntry.find.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/diary/filter/apply')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/diary/search/suggestions', () => {
    test('should return search suggestions', async () => {
      const MockTag = require('../models/DiaryVersionTag');
      MockTag.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue(['positive', 'work']),
      });

      DiaryEntry.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue(['Happy Day']),
      });

      const response = await request(app)
        .get('/api/diary/search/suggestions?query=pos&type=all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should return empty suggestions for short query', async () => {
      const response = await request(app)
        .get('/api/diary/search/suggestions?query=a&type=all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('should filter suggestions by type', async () => {
      const MockTag = require('../models/DiaryVersionTag');
      MockTag.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue(['positive']),
      });

      const response = await request(app)
        .get('/api/diary/search/suggestions?query=pos&type=tags');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle missing query parameter', async () => {
      const response = await request(app)
        .get('/api/diary/search/suggestions?type=all');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/diary/search/history', () => {
    test('should return search history', async () => {
      const User = require('../models/User');
      User.findById.mockResolvedValue({
        searchHistory: [
          { query: 'happy', count: 2, lastSearched: new Date() },
        ],
      });

      const response = await request(app)
        .get('/api/diary/search/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should handle missing history', async () => {
      const User = require('../models/User');
      User.findById.mockResolvedValue({
        searchHistory: null,
      });

      const response = await request(app)
        .get('/api/diary/search/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('should handle history fetch errors', async () => {
      const User = require('../models/User');
      User.findById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/diary/search/history');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/diary/search/history', () => {
    test('should clear search history', async () => {
      const User = require('../models/User');
      User.findByIdAndUpdate.mockResolvedValue({});

      const response = await request(app)
        .delete('/api/diary/search/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle clear history errors', async () => {
      const User = require('../models/User');
      User.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/diary/search/history');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/diary/filters/save', () => {
    test('should save new filter', async () => {
      const User = require('../models/User');
      const mockUser = {
        _id: 'test-user-id',
        savedFilters: [],
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/diary/filters/save')
        .send({
          name: 'Happy Entries',
          config: {
            sentiment: ['positive'],
            tags: [],
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should reject filter without name', async () => {
      const response = await request(app)
        .post('/api/diary/filters/save')
        .send({
          config: {},
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('name');
    });

    test('should reject filter without config', async () => {
      const response = await request(app)
        .post('/api/diary/filters/save')
        .send({
          name: 'Test Filter',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('configuration');
    });

    test('should reject duplicate filter names', async () => {
      const User = require('../models/User');
      const mockUser = {
        _id: 'test-user-id',
        savedFilters: [
          { name: 'Happy Entries', config: {} },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/diary/filters/save')
        .send({
          name: 'Happy Entries',
          config: { sentiment: [] },
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/diary/filters/list', () => {
    test('should return saved filters', async () => {
      const User = require('../models/User');
      User.findById.mockResolvedValue({
        savedFilters: [
          { _id: 'f1', name: 'Happy', useCount: 5 },
          { _id: 'f2', name: 'Sad', useCount: 2 },
        ],
      });

      const response = await request(app)
        .get('/api/diary/filters/list');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should sort filters by use count', async () => {
      const User = require('../models/User');
      User.findById.mockResolvedValue({
        savedFilters: [
          { _id: 'f1', name: 'Happy', useCount: 5 },
          { _id: 'f2', name: 'Sad', useCount: 2 },
        ],
      });

      const response = await request(app)
        .get('/api/diary/filters/list');

      expect(response.status).toBe(200);
      expect(response.body.data[0].useCount).toBeGreaterThanOrEqual(
        response.body.data[1].useCount
      );
    });

    test('should handle no saved filters', async () => {
      const User = require('../models/User');
      User.findById.mockResolvedValue({
        savedFilters: null,
      });

      const response = await request(app)
        .get('/api/diary/filters/list');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('POST /api/diary/filters/:filterId/use', () => {
    test('should use saved filter', async () => {
      const User = require('../models/User');
      const mockUser = {
        _id: 'test-user-id',
        savedFilters: [
          {
            _id: 'f1',
            name: 'Test',
            config: { sentiment: ['positive'] },
            useCount: 0,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockResolvedValue(mockUser);

      DiaryEntry.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      DiaryEntry.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .post('/api/diary/filters/f1/use');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle missing filter', async () => {
      const User = require('../models/User');
      User.findById.mockResolvedValue({
        _id: 'test-user-id',
        savedFilters: [],
      });

      const response = await request(app)
        .post('/api/diary/filters/nonexistent/use');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/diary/filters/:filterId', () => {
    test('should delete filter', async () => {
      const User = require('../models/User');
      User.findByIdAndUpdate.mockResolvedValue({});

      const response = await request(app)
        .delete('/api/diary/filters/f1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle delete errors', async () => {
      const User = require('../models/User');
      User.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/diary/filters/f1');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/diary/filters/suggestions', () => {
    test('should return filter suggestions', async () => {
      DiaryEntry.find.mockResolvedValue([
        {
          tags: ['work', 'positive'],
          sentiment: 'positive',
          createdAt: new Date(),
        },
        {
          tags: ['personal'],
          sentiment: 'neutral',
          createdAt: new Date(),
        },
      ]);

      const response = await request(app)
        .get('/api/diary/filters/suggestions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('topTags');
      expect(response.body.data).toHaveProperty('sentiments');
      expect(response.body.data).toHaveProperty('dateRanges');
    });

    test('should handle no entries', async () => {
      DiaryEntry.find.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/diary/filters/suggestions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.topTags).toEqual([]);
    });

    test('should handle suggestion errors', async () => {
      DiaryEntry.find.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/diary/filters/suggestions');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    test('should search, then apply filters', async () => {
      DiaryEntry.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      DiaryEntry.countDocuments.mockResolvedValue(0);

      // First search
      const searchRes = await request(app)
        .post('/api/diary/search/query')
        .send({
          query: 'test',
          limit: 20,
          skip: 0,
        });

      expect(searchRes.status).toBe(200);

      // Then apply filters
      const filterRes = await request(app)
        .post('/api/diary/filter/apply')
        .send({
          sentiment: ['positive'],
        });

      expect(filterRes.status).toBe(200);
    });

    test('should save and load filter', async () => {
      const User = require('../models/User');
      const mockUser = {
        _id: 'test-user-id',
        savedFilters: [],
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockResolvedValue(mockUser);

      // Save filter
      const saveRes = await request(app)
        .post('/api/diary/filters/save')
        .send({
          name: 'Test',
          config: { sentiment: ['positive'] },
        });

      expect(saveRes.status).toBe(201);
    });
  });
});
