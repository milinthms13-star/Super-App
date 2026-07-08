/**
 * Redis Cache Service
 * Handles caching for profile data and search results
 */

const redis = require('redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      if (this.isConnected) {
        return;
      }

      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis ready');
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Redis connection failed:', error);
      this.isConnected = false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      if (!this.isConnected || !this.client) {
        return null;
      }

      const value = await this.client.get(key);
      
      if (value) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (ttl > 0) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      
      return true;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Cache profile data
   */
  async cacheProfile(profileId, profileData, ttl = 1800) {
    const key = `matrimonial:profile:${profileId}`;
    return await this.set(key, profileData, ttl);
  }

  /**
   * Get cached profile
   */
  async getCachedProfile(profileId) {
    const key = `matrimonial:profile:${profileId}`;
    return await this.get(key);
  }

  /**
   * Invalidate profile cache
   */
  async invalidateProfile(profileId) {
    const key = `matrimonial:profile:${profileId}`;
    return await this.del(key);
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(searchParams, results, ttl = 600) {
    const key = `matrimonial:search:${this.hashSearchParams(searchParams)}`;
    return await this.set(key, results, ttl);
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(searchParams) {
    const key = `matrimonial:search:${this.hashSearchParams(searchParams)}`;
    return await this.get(key);
  }

  /**
   * Invalidate all search caches
   */
  async invalidateSearchCache() {
    return await this.delPattern('matrimonial:search:*');
  }

  /**
   * Cache recommendations
   */
  async cacheRecommendations(userId, recommendations, ttl = 1800) {
    const key = `matrimonial:recommendations:${userId}`;
    return await this.set(key, recommendations, ttl);
  }

  /**
   * Get cached recommendations
   */
  async getCachedRecommendations(userId) {
    const key = `matrimonial:recommendations:${userId}`;
    return await this.get(key);
  }

  /**
   * Hash search parameters
   */
  hashSearchParams(params) {
    const crypto = require('crypto');
    const sorted = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});
    
    return crypto
      .createHash('md5')
      .update(JSON.stringify(sorted))
      .digest('hex');
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      if (!this.isConnected || !this.client) {
        return { connected: false };
      }

      const info = await this.client.info();
      const dbSize = await this.client.dbSize();

      return {
        connected: true,
        dbSize,
        info: info
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Flush all cache
   */
  async flush() {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      await this.client.flushDb();
      logger.info('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Error flushing cache:', error);
      return false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
