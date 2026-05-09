/**
 * Rate Limiter Controller - Phase 10 REST Endpoints
 * API rate limiting and throttling configuration endpoints
 */

const { validationResult } = require('express-validator');
const RateLimiterService = require('../services/RateLimiterService');

class RateLimiterController {
  async createRateLimiter(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, targetType, rateLimit, actionOnLimitExceeded } = req.body;

      const result = await RateLimiterService.createRateLimiter(name, targetType, rateLimit, actionOnLimitExceeded);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create rate limiter',
        errors: [error.message],
      });
    }
  }

  async getRateLimiterDetails(req, res) {
    try {
      const { limiterId } = req.params;

      const result = await RateLimiterService.getRateLimiterDetails(limiterId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve rate limiter details',
        errors: [error.message],
      });
    }
  }

  async whitelistIP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { limiterId } = req.params;
      const { ip } = req.body;

      const result = await RateLimiterService.whitelistIP(limiterId, ip);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to whitelist IP',
        errors: [error.message],
      });
    }
  }

  async blacklistIP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { limiterId } = req.params;
      const { ip } = req.body;

      const result = await RateLimiterService.blacklistIP(limiterId, ip);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to blacklist IP',
        errors: [error.message],
      });
    }
  }

  async whitelistUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { limiterId } = req.params;
      const { userId } = req.body;

      const result = await RateLimiterService.whitelistUser(limiterId, userId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to whitelist user',
        errors: [error.message],
      });
    }
  }

  async checkRateLimit(req, res) {
    try {
      const { limiterId } = req.params;
      const { targetIdentifier } = req.body;

      const result = await RateLimiterService.checkRateLimit(limiterId, targetIdentifier);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to check rate limit',
        errors: [error.message],
      });
    }
  }

  async getAllRateLimiters(req, res) {
    try {
      const filters = {
        limit: parseInt(req.query.limit) || 50,
        skip: parseInt(req.query.skip) || 0,
      };

      const result = await RateLimiterService.getAllRateLimiters(filters);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve rate limiters',
        errors: [error.message],
      });
    }
  }

  async disableRateLimiter(req, res) {
    try {
      const { limiterId } = req.params;

      const result = await RateLimiterService.disableRateLimiter(limiterId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to disable rate limiter',
        errors: [error.message],
      });
    }
  }

  async enableRateLimiter(req, res) {
    try {
      const { limiterId } = req.params;

      const result = await RateLimiterService.enableRateLimiter(limiterId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to enable rate limiter',
        errors: [error.message],
      });
    }
  }
}

module.exports = new RateLimiterController();
