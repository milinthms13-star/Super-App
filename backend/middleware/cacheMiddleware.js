const cacheService = require('../services/cacheService');

/**
 * Cache middleware for GET requests
 * @param {number} ttl - Time to live in seconds (default: 300)
 * @param {Function} keyGenerator - Function to generate cache key from req
 */
const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator 
        ? keyGenerator(req) 
        : `cache:${req.originalUrl || req.url}`;

      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        // Return cached response
        return res.json(cachedData);
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function(data) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, data, ttl).catch(err => {
            console.error('Cache set error in middleware:', err);
          });
        }
        
        // Call original json method
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Invalidate cache middleware
 * Use after operations that modify data
 */
const invalidateCacheMiddleware = (patterns = []) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to invalidate cache after successful response
    res.json = function(data) {
      // Invalidate cache on successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(pattern => {
          cacheService.delPattern(pattern).catch(err => {
            console.error('Cache invalidation error:', err);
          });
        });
      }
      
      return originalJson(data);
    };

    next();
  };
};

/**
 * Cache key generators for common scenarios
 */
const keyGenerators = {
  business: (req) => `cache:business:${req.params.businessId || req.query.businessId}:${req.originalUrl}`,
  user: (req) => `cache:user:${req.user?.id}:${req.originalUrl}`,
  public: (req) => `cache:public:${req.originalUrl}`,
  list: (req) => {
    const query = JSON.stringify(req.query);
    return `cache:list:${req.originalUrl}:${query}`;
  }
};

module.exports = {
  cacheMiddleware,
  invalidateCacheMiddleware,
  keyGenerators
};
