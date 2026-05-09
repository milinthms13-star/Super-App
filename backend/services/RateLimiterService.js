/**
 * Rate Limiter Service - Phase 10 Business Logic
 * API rate limiting and throttling
 */

const RateLimiterConfig = require('../models/RateLimiterConfig');

class RateLimiterService {
  async createRateLimiter(name, targetType, rateLimit, actionOnLimitExceeded = 'reject') {
    try {
      const limiterId = `LIMIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const limiter = new RateLimiterConfig({
        limiterId,
        name,
        targetType,
        rateLimit,
        actionOnLimitExceeded,
        enabled: true,
      });

      await limiter.save();

      return {
        success: true,
        data: { limiterId },
        message: 'Rate limiter created',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create rate limiter',
        errors: [error.message],
      };
    }
  }

  async getRateLimiterDetails(limiterId) {
    try {
      const limiter = await RateLimiterConfig.findOne({ limiterId });

      if (!limiter) {
        return { success: false, message: 'Rate limiter not found', statusCode: 404 };
      }

      return {
        success: true,
        data: limiter,
        message: 'Rate limiter details retrieved',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve rate limiter details',
        errors: [error.message],
      };
    }
  }

  async whitelistIP(limiterId, ip) {
    try {
      const limiter = await RateLimiterConfig.findOne({ limiterId });

      if (!limiter) {
        return { success: false, message: 'Rate limiter not found', statusCode: 404 };
      }

      if (!limiter.whitelistedIPs.includes(ip)) {
        limiter.whitelistedIPs.push(ip);
        await limiter.save();
      }

      return {
        success: true,
        data: { limiterId },
        message: 'IP whitelisted',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to whitelist IP',
        errors: [error.message],
      };
    }
  }

  async blacklistIP(limiterId, ip) {
    try {
      const limiter = await RateLimiterConfig.findOne({ limiterId });

      if (!limiter) {
        return { success: false, message: 'Rate limiter not found', statusCode: 404 };
      }

      if (!limiter.blacklistedIPs.includes(ip)) {
        limiter.blacklistedIPs.push(ip);
        await limiter.save();
      }

      return {
        success: true,
        data: { limiterId },
        message: 'IP blacklisted',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to blacklist IP',
        errors: [error.message],
      };
    }
  }

  async whitelistUser(limiterId, userId) {
    try {
      const limiter = await RateLimiterConfig.findOne({ limiterId });

      if (!limiter) {
        return { success: false, message: 'Rate limiter not found', statusCode: 404 };
      }

      if (!limiter.whitelistedUsers.includes(userId)) {
        limiter.whitelistedUsers.push(userId);
        await limiter.save();
      }

      return {
        success: true,
        data: { limiterId },
        message: 'User whitelisted',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to whitelist user',
        errors: [error.message],
      };
    }
  }

  async checkRateLimit(limiterId, targetIdentifier) {
    try {
      const limiter = await RateLimiterConfig.findOne({ limiterId });

      if (!limiter || !limiter.isActive()) {
        return { success: true, allowed: true, message: 'Rate limit not active' };
      }

      // TODO: Implement actual rate limit checking logic
      // This would integrate with a rate limiting library like redis
      // For now, return allowed

      return {
        success: true,
        allowed: true,
        message: 'Request allowed',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to check rate limit',
        errors: [error.message],
      };
    }
  }

  async logRateLimitViolation(limiterId, targetId, requestCount, ipAddress, endpoint) {
    try {
      const limiter = await RateLimiterConfig.findOne({ limiterId });

      if (!limiter) {
        return { success: false, message: 'Rate limiter not found', statusCode: 404 };
      }

      limiter.logViolation(targetId, requestCount, ipAddress, endpoint);
      await limiter.save();

      return {
        success: true,
        data: { limiterId },
        message: 'Violation logged',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to log violation',
        errors: [error.message],
      };
    }
  }

  async getAllRateLimiters(filters = {}) {
    try {
      const query = { enabled: true };

      const limiters = await RateLimiterConfig.find(query)
        .sort({ priority: -1 })
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);

      const total = await RateLimiterConfig.countDocuments(query);

      return {
        success: true,
        data: { limiters, total },
        message: 'Rate limiters retrieved',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve rate limiters',
        errors: [error.message],
      };
    }
  }

  async disableRateLimiter(limiterId) {
    try {
      const limiter = await RateLimiterConfig.findOne({ limiterId });

      if (!limiter) {
        return { success: false, message: 'Rate limiter not found', statusCode: 404 };
      }

      limiter.enabled = false;
      await limiter.save();

      return {
        success: true,
        data: { limiterId },
        message: 'Rate limiter disabled',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to disable rate limiter',
        errors: [error.message],
      };
    }
  }

  async enableRateLimiter(limiterId) {
    try {
      const limiter = await RateLimiterConfig.findOne({ limiterId });

      if (!limiter) {
        return { success: false, message: 'Rate limiter not found', statusCode: 404 };
      }

      limiter.enabled = true;
      await limiter.save();

      return {
        success: true,
        data: { limiterId },
        message: 'Rate limiter enabled',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to enable rate limiter',
        errors: [error.message],
      };
    }
  }
}

module.exports = new RateLimiterService();
