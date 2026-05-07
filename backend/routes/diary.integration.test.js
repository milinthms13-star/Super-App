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
    value: body,
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
  generateOpenAISummary: jest.fn(),
  generateInsights: jest.fn(),
  generateSuggestions: jest.fn(),
  calculateAPICost: jest.fn(),
}));

jest.mock('../models/DiaryEntry', () => {
  const DiaryEntry = jest.fn(function DiaryEntry(data = {}) {
    Object.assign(this, {
      _id: data._id || 'entry-1',
      tags: [],
      attachments: [],
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
const DiaryEntryVersion = require('../models/DiaryEntryVersion');
const DiaryAppLock = require('../models/DiaryAppLock');
const { invalidateUserCache } = require('../utils/diaryCache');
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

const createSortedLeanChain = (resolvedValue) => ({
  sort: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(resolvedValue),
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

describe('diary phase-5 workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateUserCache.mockResolvedValue(undefined);
  });

  test('autosaves an entry and records the next version number', async () => {
    const handler = getRouteHandler('post', '/:entryId/autosave');
    const entry = {
      _id: 'entry-1',
      title: 'Current title',
      content: 'Current content',
      mood: 'happy',
      category: 'Work',
      tags: ['current'],
      isDraft: false,
      save: jest.fn().mockResolvedValue(undefined),
    };

    DiaryEntry.findOne.mockResolvedValue(entry);
    DiaryEntryVersion.findOne.mockImplementationOnce(() =>
      createSortedLeanChain({ versionNumber: 2 })
    );
    DiaryEntryVersion.create.mockResolvedValue({});

    const req = {
      params: {
        entryId: 'entry-1',
      },
      body: {
        title: 'Updated title',
        content: 'Updated content',
        tags: ['updated'],
      },
      user: {
        _id: 'user-1',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(DiaryEntryVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entryId: 'entry-1',
        versionNumber: 3,
        changeType: 'auto_save',
      })
    );
    expect(entry.title).toBe('Updated title');
    expect(entry.content).toBe('Updated content');
    expect(entry.tags).toEqual(['updated']);
    expect(entry.save).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body.versionNumber).toBe(3);
  });

  test('restores a prior version and snapshots the current state first', async () => {
    const handler = getRouteHandler('post', '/:entryId/versions/:versionNumber/restore');
    const entry = {
      _id: 'entry-1',
      title: 'Current title',
      content: 'Current content',
      mood: 'neutral',
      category: 'Personal',
      tags: ['current'],
      isDraft: false,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const versionToRestore = {
      title: 'Previous title',
      content: 'Previous content',
      mood: 'happy',
      category: 'Work',
      tags: ['restored'],
      isDraft: true,
    };

    DiaryEntry.findOne.mockResolvedValue(entry);
    DiaryEntryVersion.findOne
      .mockResolvedValueOnce(versionToRestore)
      .mockImplementationOnce(() => createSortedLeanChain({ versionNumber: 4 }));
    DiaryEntryVersion.create.mockResolvedValue({});

    const req = {
      params: {
        entryId: 'entry-1',
        versionNumber: '2',
      },
      user: {
        _id: 'user-1',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(DiaryEntryVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        versionNumber: 5,
        changeType: 'manual_save',
      })
    );
    expect(entry.title).toBe('Previous title');
    expect(entry.content).toBe('Previous content');
    expect(entry.tags).toEqual(['restored']);
    expect(entry.isDraft).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Restored to version 2');
  });

  test('moves an entry to trash and then recovers it', async () => {
    const deleteHandler = getRouteHandler('delete', '/:entryId');
    const recoverHandler = getRouteHandler('post', '/:entryId/recover');
    const deletedEntry = {
      _id: 'entry-1',
      title: 'Recover me',
      isDeleted: false,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const trashedEntry = {
      _id: 'entry-1',
      title: 'Recover me',
      isDeleted: true,
      deletedAt: new Date('2026-05-07T00:00:00.000Z'),
      deletedBy: 'user-1',
      permanentlyDeleteAt: new Date('2026-06-06T00:00:00.000Z'),
      save: jest.fn().mockResolvedValue(undefined),
    };

    DiaryEntry.findOne
      .mockResolvedValueOnce(deletedEntry)
      .mockResolvedValueOnce(trashedEntry);

    const deleteReq = {
      params: {
        entryId: 'entry-1',
      },
      user: {
        _id: 'user-1',
      },
    };
    const deleteRes = createMockResponse();

    await deleteHandler(deleteReq, deleteRes);

    expect(deletedEntry.isDeleted).toBe(true);
    expect(deletedEntry.deletedBy).toBe('user-1');
    expect(deletedEntry.save).toHaveBeenCalledTimes(1);
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.message).toMatch(/moved to trash/i);

    const recoverReq = {
      params: {
        entryId: 'entry-1',
      },
      user: {
        _id: 'user-1',
      },
    };
    const recoverRes = createMockResponse();

    await recoverHandler(recoverReq, recoverRes);

    expect(trashedEntry.isDeleted).toBe(false);
    expect(trashedEntry.deletedAt).toBeNull();
    expect(trashedEntry.permanentlyDeleteAt).toBeNull();
    expect(trashedEntry.save).toHaveBeenCalledTimes(1);
    expect(recoverRes.statusCode).toBe(200);
    expect(recoverRes.body.message).toBe('Entry recovered from trash');
  });

  test('sets up a PIN lock for a user who does not have one yet', async () => {
    const handler = getRouteHandler('post', '/app-lock/setup-pin');

    DiaryAppLock.findOne.mockResolvedValue(null);

    const req = {
      body: {
        pin: '1234',
      },
      user: {
        _id: 'user-1',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(DiaryAppLock).toHaveBeenCalledWith({ userId: 'user-1' });
    const createdLock = DiaryAppLock.mock.instances[0];
    expect(createdLock.setPin).toHaveBeenCalledWith('1234');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.lockType).toBe('pin');
  });

  test('rejects invalid PIN verification attempts and reports remaining tries', async () => {
    const handler = getRouteHandler('post', '/app-lock/verify-pin');
    const appLock = {
      lockType: 'pin',
      failedAttempts: 0,
      maxFailedAttempts: 5,
      lockedUntil: null,
      isLockedOutTemporarily: jest.fn(() => false),
      verifyPin: jest.fn().mockResolvedValue(false),
      incrementFailedAttempts: jest.fn().mockImplementation(async function increment() {
        appLock.failedAttempts += 1;
        return appLock;
      }),
      resetFailedAttempts: jest.fn(),
    };

    DiaryAppLock.findOne.mockResolvedValue(appLock);

    const req = {
      body: {
        pin: '0000',
      },
      user: {
        _id: 'user-1',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(appLock.verifyPin).toHaveBeenCalledWith('0000');
    expect(appLock.incrementFailedAttempts).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Invalid PIN',
      attemptsRemaining: 4,
    });
  });

  test('lists version history with pagination metadata', async () => {
    const handler = getRouteHandler('get', '/:entryId/versions');

    DiaryEntry.findOne.mockResolvedValue({ _id: 'entry-1', userId: 'user-1' });
    DiaryEntryVersion.find.mockReturnValue(
      createQueryChain([
        { versionNumber: 3 },
        { versionNumber: 2 },
      ])
    );
    DiaryEntryVersion.countDocuments.mockResolvedValue(2);

    const req = {
      params: {
        entryId: 'entry-1',
      },
      query: {
        limit: '10',
        skip: '0',
      },
      user: {
        _id: 'user-1',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toMatchObject({
      total: 2,
      limit: 10,
      hasMore: false,
    });
  });
});
