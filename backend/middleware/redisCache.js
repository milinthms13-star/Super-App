                                                                                                                                                                                                                                                                                                                                                                                                                                const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const CACHE_TTL_SECONDS = {
  products: 300, // 5min
  orders: 120,   // 2min
  search: 180,   // 3min
};

const generateCacheKey = (req, prefix = '') => {
  const baseKey = `${prefix}:${req.path}`;
  const queryKey = Object.keys(req.query)
    .sort()
    .filter(key => req.query[key] !== undefined)
    .map(key => `${key}=${req.query[key]}`)
    .join('&');
  return `${baseKey}:${queryKey || 'default'}`;
};

const cacheMiddleware = (resourceType) => {
  return async (req, res, next) => {
    const client = getRedisClient();
    if (!client) {
      return next(); // No Redis, skip caching
    }

    const cacheKey = generateCacheKey(req, resourceType);
    
    try {
      // Try GET
      const cached = await client.get(cacheKey);
      if (cached) {
        logger.debug(`Cache HIT: ${cacheKey}`);
        res.set('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
      
      logger.debug(`Cache MISS: ${cacheKey}`);
      res.set('X-Cache', 'MISS');
      
      // Store response in cache on success
      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200 && data.success) {
          client.setEx(cacheKey, CACHE_TTL_SECONDS[resourceType], JSON.stringify(data));
        }
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.warn(`Cache middleware error: ${error.message}`);
      next();
    }
  };
};

module.exports = {
  cacheProducts: cacheMiddleware('products'),
  cacheOrders: cacheMiddleware('orders'),
  cacheSearch: cacheMiddleware('search'),
  generateCacheKey,
};

