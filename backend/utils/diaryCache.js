const { getRedisClient } = require('../config/redis');
const logger = require('./logger');

/**
 * Cache keys for diary module
 */
const CACHE_KEYS = {
  ENTRIES: (userId) => `diary:entries:${userId}`,
  ENTRY: (userId, entryId) => `diary:entry:${userId}:${entryId}`,
  DRAFTS: (userId) => `diary:drafts:${userId}`,
  CALENDAR_ITEMS: (userId) => `diary:calendar:${userId}`,
  MOOD_STATS: (userId, daysBack) => `diary:mood-stats:${userId}:${daysBack}`,
  TAGS: (userId) => `diary:tags:${userId}`,
  AI_SUMMARY: (userId, daysBack) => `diary:ai-summary:${userId}:${daysBack}`,
  AI_ACTION_ITEMS: (userId, daysBack) => `diary:ai-action-items:${userId}:${daysBack}`,
  AI_MOOD_INSIGHTS: (userId, daysBack) => `diary:ai-mood:${userId}:${daysBack}`,
  AI_WELLNESS: (userId, daysBack) => `diary:ai-wellness:${userId}:${daysBack}`,
  ENTRY_VERSIONS: (userId, entryId) => `diary:versions:${userId}:${entryId}`,
  TRASH: (userId) => `diary:trash:${userId}`,
  // Analytics cache keys
  WRITING_STATS: (userId, daysBack) => `diary:analytics:writing-stats:${userId}:${daysBack}`,
  MOOD_TRENDS: (userId, daysBack) => `diary:analytics:mood-trends:${userId}:${daysBack}`,
  WELLNESS_SCORE: (userId, daysBack) => `diary:analytics:wellness:${userId}:${daysBack}`,
  STREAKS: (userId) => `diary:streaks:${userId}`,
};

const CACHE_TTL = {
  ENTRIES: 5 * 60, // 5 minutes
  ENTRY: 10 * 60, // 10 minutes
  DRAFTS: 5 * 60,
  CALENDAR_ITEMS: 5 * 60,
  MOOD_STATS: 30 * 60, // 30 minutes (less volatile)
  TAGS: 60 * 60, // 1 hour
  AI_SUMMARY: 60 * 60, // 1 hour
  AI_MOOD_INSIGHTS: 60 * 60,
  AI_WELLNESS: 60 * 60,
  ENTRY_VERSIONS: 10 * 60,
  TRASH: 5 * 60,
};

/**
 * Get cached value
 */
const getCached = async (key) => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient) {
      return null;
    }

    const cached = await redisClient.get(key);
    if (cached) {
      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(cached);
    }
    logger.debug(`Cache miss: ${key}`);
    return null;
  } catch (error) {
    logger.warn(`Cache read error for ${key}: ${error.message}`);
    return null; // Fail gracefully
  }
};

/**
 * Set cached value with TTL
 */
const setCached = async (key, value, ttl = 300) => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient) {
      return false;
    }

    const serialized = JSON.stringify(value);
    await redisClient.setEx(key, ttl, serialized);
    logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    logger.warn(`Cache write error for ${key}: ${error.message}`);
    return false; // Fail gracefully
  }
};

/**
 * Delete cached value
 */
const deleteCached = async (key) => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient) {
      return false;
    }

    await redisClient.del(key);
    logger.debug(`Cache deleted: ${key}`);
    return true;
  } catch (error) {
    logger.warn(`Cache delete error for ${key}: ${error.message}`);
    return false;
  }
};

/**
 * Delete multiple cached values
 */
const deleteMultipleCached = async (keys) => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient || keys.length === 0) {
      return false;
    }

    await redisClient.del(keys);
    logger.debug(`Deleted ${keys.length} cache entries`);
    return true;
  } catch (error) {
    logger.warn(`Cache batch delete error: ${error.message}`);
    return false;
  }
};

/**
 * Delete all cache for a user (after entry modifications)
 * This invalidates all cached data for a user when entries change
 */
const invalidateUserCache = async (userId) => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient) {
      return false;
    }

    const patterns = [
      `diary:entries:${userId}`,
      `diary:entry:${userId}:*`,
      `diary:drafts:${userId}`,
      `diary:calendar:${userId}`,
      `diary:mood-stats:${userId}:*`,
      `diary:tags:${userId}`,
      `diary:ai-*:${userId}:*`,
      `diary:versions:${userId}:*`,
      `diary:trash:${userId}`,
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        totalDeleted += keys.length;
      }
    }

    logger.debug(`Invalidated ${totalDeleted} cache entries for user ${userId}`);
    return true;
  } catch (error) {
    logger.warn(`Cache invalidation error for user ${userId}: ${error.message}`);
    return false;
  }
};

/**
 * Middleware to cache GET requests
 * Usage: router.get('/path', cacheMiddleware('ENTRIES', 'diary:entries:key'), handler)
 */
const cacheMiddleware = (cacheKeyBuilder, ttlKey) => {
  return async (req, res, next) => {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return next(); // Skip caching if no user
    }

    try {
      const cacheKey = typeof cacheKeyBuilder === 'function'
        ? cacheKeyBuilder(userId, req)
        : cacheKeyBuilder;

      const cached = await getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Store cache key and TTL in request for handler to use
      res.locals.cacheKey = cacheKey;
      res.locals.cacheTTL = ttlKey ? CACHE_TTL[ttlKey] : CACHE_TTL.ENTRIES;
      next();
    } catch (error) {
      logger.warn(`Cache middleware error: ${error.message}`);
      next(); // Continue without caching on error
    }
  };
};

/**
 * Helper to cache response in handler
 * Usage: After successful response, call cacheResponse(res, data)
 */
const cacheResponse = async (res, data) => {
  try {
    if (res.locals.cacheKey) {
      await setCached(res.locals.cacheKey, data, res.locals.cacheTTL);
    }
  } catch (error) {
    logger.warn(`Error caching response: ${error.message}`);
  }
};

module.exports = {
  CACHE_KEYS,
  CACHE_TTL,
  getCached,
  setCached,
  deleteCached,
  deleteMultipleCached,
  invalidateUserCache,
  cacheMiddleware,
  cacheResponse,
};
