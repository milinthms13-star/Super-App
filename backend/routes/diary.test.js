jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => next(),
}));

jest.mock('../middleware/rateLimiter', () => ({
  createModerateRateLimiter: () => (_req, _res, next) => next(),
}));

jest.mock('../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../utils/gridfs', () => ({
  uploadBufferToGridFS: jest.fn(),
}));

jest.mock('../utils/aiMoodAnalyzer', () => ({
  analyzeMood: jest.fn(() => 'reflective'),
}));

jest.mock('../utils/diaryValidation', () => ({
  validateDiaryEntry: jest.fn((body = {}) => ({
    error: null,
    value: {
      title: String(body.title || '').trim(),
      content: String(body.content || '').trim(),
      mood: body.mood,
      category: body.category || 'Personal',
      tags: body.tags || [],
      isDraft: Boolean(body.isDraft),
      entryDate: body.entryDate || new Date('2026-05-07T00:00:00.000Z'),
    },
  })),
  validateDiaryEntryUpdate: jest.fn((body = {}) => ({
    error: null,
    value: body,
  })),
  validateCalendarItem: jest.fn(),
  validateCalendarItemUpdate: jest.fn(),
  validateQuery: jest.fn((query = {}) => ({
    error: null,
    value: {
      category: query.category,
      mood: query.mood,
      search: query.search,
      limit: query.limit || 20,
      skip: query.skip || 0,
      sortBy: query.sortBy || '-createdAt',
    },
  })),
  formatValidationErrors: jest.fn(() => 'Validation failed'),
}));

jest.mock('../utils/diaryCache', () => ({
  CACHE_KEYS: {
    DRAFTS: (userId) => `drafts:${userId}`,
    TAGS: (userId) => `tags:${userId}`,
    MOOD_STATS: (userId, days) => `mood:${userId}:${days}`,
  },
  CACHE_TTL: {
    ENTRIES: 60,
    DRAFTS: 60,
    TAGS: 60,
  },
  getCached: jest.fn(),
  setCached: jest.fn(),
  invalidateUserCache: jest.fn(),
  cacheResponse: jest.fn(),
}));

jest.mock('../utils/diaryAnalytics', () => ({
  calculateWritingStats: jest.fn(),
  calculateStreakStats: jest.fn(),
  calculateMoodStats: jest.fn(),
  calculateWellnessScore: jest.fn(),
}));

jest.mock('../utils/diaryAI', () => ({
  analyzeSentiment: jest.fn(),
  suggestTags: jest.fn(() => []),
}));

jest.mock('../utils/diaryAISummary', () => ({
  generateSummary: jest.fn(),
  extractActionItems: jest.fn(),
  formatSummaryMarkdown: jest.fn(),
}));

jest.mock('../utils/diaryAIOpenAI', () => ({
  generateGeminiSummary: jest.fn(),
  generateInsights: jest.fn(),
  generateSuggestions: jest.fn(),
  calculateAPICost: jest.fn(),
}));

jest.mock('../models/DiaryEntry', () => {
  const DiaryEntry = jest.fn(function DiaryEntry(data = {}) {
    Object.assign(this, {
      _id: data._id || 'entry-1',
      attachments: [],
      tags: [],
      ...data,
    });
    this.save = jest.fn().mockResolvedValue(this);
  });

  DiaryEntry.find = jest.fn();
  DiaryEntry.countDocuments = jest.fn();
  DiaryEntry.aggregate = jest.fn();
  DiaryEntry.findOne = jest.fn();
  DiaryEntry.findOneAndDelete = jest.fn();
  DiaryEntry.findOneAndUpdate = jest.fn();
  DiaryEntry.deleteOne = jest.fn();

  return DiaryEntry;
});

jest.mock('../models/DiaryCalendarItem', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../models/DiaryStreak', () => ({}));
jest.mock('../models/DiaryAISummary', () => ({}));
jest.mock('../models/DiaryEntryVersion', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  deleteMany: jest.fn(),
}));
jest.mock('../models/DiaryAppLock', () => {
  const DiaryAppLock = jest.fn(function DiaryAppLock(data = {}) {
    Object.assign(this, {
      userId: data.userId,
      lockType: 'none',
      autoLockTimeoutMinutes: 5,
      failedAttempts: 0,
      maxFailedAttempts: 5,
      lockedUntil: null,
      isCurrentlyLocked: false,
      lastUnlockedAt: null,
    });
    this.setPin = jest.fn().mockImplementation(async () => {
      this.lockType = 'pin';
      return this;
    });
    this.verifyPin = jest.fn(async (pin) => pin === '1234');
    this.incrementFailedAttempts = jest.fn(async () => {
      this.failedAttempts += 1;
      return this;
    });
    this.resetFailedAttempts = jest.fn(async () => {
      this.failedAttempts = 0;
      return this;
    });
    this.isLockedOutTemporarily = jest.fn(() => false);
    this.save = jest.fn().mockResolvedValue(this);
  });

  DiaryAppLock.findOne = jest.fn();
  return DiaryAppLock;
});

jest.mock('../models/DiaryEncryptionKey', () => ({
  getActiveKey: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../models/DiaryBackup', () => ({}));
jest.mock('../utils/diaryEncryptionService', () =>
  jest.fn().mockImplementation(() => ({
    generateUserKey: jest.fn(),
    hashContent: jest.fn(),
  }))
);
jest.mock('../services/diaryAISummaryService', () => ({}));

const DiaryEntry = require('../models/DiaryEntry');
const { analyzeMood } = require('../utils/aiMoodAnalyzer');
const {
  getCached,
  setCached,
  invalidateUserCache,
} = require('../utils/diaryCache');
const {
  validateDiaryEntry,
  validateDiaryEntryUpdate,
} = require('../utils/diaryValidation');
const diaryRouter = require('./diary');

const createMockResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const createQueryChain = (resolvedValue) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(resolvedValue),
});

const getRouteHandler = (method, path) => {
  const layer = diaryRouter.stack.find(
    (entry) => entry.route?.path === path && entry.route?.methods?.[method]
  );

  return layer.route.stack[layer.route.stack.length - 1].handle;
};

describe('diary routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCached.mockResolvedValue(null);
    setCached.mockResolvedValue(undefined);
    invalidateUserCache.mockResolvedValue(undefined);
  });

  test('lists diary entries with pagination and cache population', async () => {
    const handler = getRouteHandler('get', '/');

    DiaryEntry.find.mockReturnValue(
      createQueryChain([
        {
          _id: 'entry-1',
          title: 'My note',
          content: 'Remember this',
        },
      ])
    );
    DiaryEntry.countDocuments.mockResolvedValue(1);

    const req = {
      query: {
        limit: '20',
        skip: '0',
      },
      user: {
        _id: 'user-1',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(DiaryEntry.find).toHaveBeenCalledWith({
      userId: 'user-1',
      isDraft: false,
      isDeleted: false,
    });
    expect(setCached).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toMatchObject({
      total: 1,
      hasMore: false,
    });
  });

  test('returns cached draft entries without hitting the database', async () => {
    const handler = getRouteHandler('get', '/drafts');
    const cachedResponse = {
      success: true,
      data: [{ _id: 'draft-1', title: 'Draft note' }],
      pagination: { total: 1, limit: 20, skip: 0 },
    };

    getCached.mockResolvedValue(cachedResponse);

    const req = {
      query: {},
      user: {
        _id: 'user-1',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(DiaryEntry.find).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(cachedResponse);
  });

  test('creates a diary entry and derives the mood when none is provided', async () => {
    const handler = getRouteHandler('post', '/');

    analyzeMood.mockReturnValue('focused');
    validateDiaryEntry.mockReturnValue({
      error: null,
      value: {
        title: 'Planning session',
        content: 'Mapped out the next sprint.',
        mood: '',
        category: 'Work',
        tags: ['planning'],
        isDraft: false,
        entryDate: new Date('2026-05-07T00:00:00.000Z'),
      },
    });

    const req = {
      body: {
        title: 'Planning session',
        content: 'Mapped out the next sprint.',
      },
      files: [],
      user: {
        _id: 'user-1',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(analyzeMood).toHaveBeenCalledWith('Mapped out the next sprint.');
    expect(DiaryEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        mood: 'focused',
        category: 'Work',
      })
    );
    expect(invalidateUserCache).toHaveBeenCalledWith('user-1');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Entry created successfully');
  });

  test('updates an existing diary entry with validated fields', async () => {
    const handler = getRouteHandler('put', '/:id');
    const entry = {
      _id: 'entry-1',
      title: 'Old title',
      content: 'Old content',
      mood: 'happy',
      category: 'Personal',
      tags: ['old'],
      attachments: [],
      save: jest.fn().mockResolvedValue(undefined),
    };

    DiaryEntry.findOne.mockResolvedValue(entry);
    validateDiaryEntryUpdate.mockReturnValue({
      error: null,
      value: {
        title: 'Updated title',
        tags: ['new'],
      },
    });

    const req = {
      params: {
        id: 'entry-1',
      },
      body: {
        title: 'Updated title',
        tags: ['new'],
      },
      files: [],
      user: {
        _id: 'user-1',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(entry.title).toBe('Updated title');
    expect(entry.tags).toEqual(['new']);
    expect(entry.save).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Entry updated successfully');
  });

  test('aggregates diary tags into name and count pairs', async () => {
    const handler = getRouteHandler('get', '/tags');

    DiaryEntry.aggregate.mockResolvedValue([
      { _id: 'focus', count: 2 },
      { _id: 'travel', count: 1 },
    ]);

    const req = {
      query: {},
      user: {
        _id: 'user-1',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([
      { name: 'focus', count: 2 },
      { name: 'travel', count: 1 },
    ]);
  });
});
