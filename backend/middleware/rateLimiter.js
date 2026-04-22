/**
 * Simple in-memory rate limiter middleware
 * Tracks requests by IP/user and enforces rate limits
 */

const requestCounts = new Map();
const CLEANUP_INTERVAL = 60000; // Clean up old entries every 60 seconds

/**
 * Create a rate limiter middleware
 * @param {object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @param {number} options.maxRequests - Max requests per window (default: 100)
 * @param {string} options.keyGenerator - Function to generate rate limit key (default: IP)
 * @param {object} options.handler - Custom error handler
 * @returns {function} Express middleware
 */
const createRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 60000;
  const maxRequests = options.maxRequests || 100;
  const keyGenerator = options.keyGenerator || ((req) => req.ip || req.connection.remoteAddress);
  const handler = options.handler || defaultRateLimitHandler;

  // Clean up old entries periodically
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requestCounts.entries()) {
      if (now - data.firstRequestTime > windowMs * 2) {
        requestCounts.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const requestData = requestCounts.get(key);

    if (!requestData) {
      // First request in this window
      requestCounts.set(key, {
        count: 1,
        firstRequestTime: now,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (now > requestData.resetTime) {
      // Window expired, reset
      requestCounts.set(key, {
        count: 1,
        firstRequestTime: now,
        resetTime: now + windowMs,
      });
      return next();
    }

    // Window still active
    requestData.count += 1;

    if (requestData.count > maxRequests) {
      const retryAfter = Math.ceil((requestData.resetTime - now) / 1000);
      res.set('Retry-After', retryAfter);
      return handler(req, res, {
        limit: maxRequests,
        window: windowMs,
        retryAfter,
      });
    }

    next();
  };
};

/**
 * Default rate limit error handler
 */
const defaultRateLimitHandler = (req, res, info) => {
  res.status(429).json({
    success: false,
    message: `Too many requests. Please try again in ${info.retryAfter} seconds.`,
    retryAfter: info.retryAfter,
  });
};

/**
 * Create a strict rate limiter for sensitive endpoints (payments, logins)
 * @param {object} options - Additional options
 * @returns {function} Express middleware
 */
const createStrictRateLimiter = (options = {}) => {
  return createRateLimiter({
    windowMs: options.windowMs || 60000, // 1 minute window
    maxRequests: options.maxRequests || 10, // Only 10 requests per minute
    keyGenerator: (req) => req.user?.email || req.ip || req.connection.remoteAddress,
    ...options,
  });
};

/**
 * Create a moderate rate limiter (for general API endpoints)
 * @param {object} options - Additional options
 * @returns {function} Express middleware
 */
const createModerateRateLimiter = (options = {}) => {
  return createRateLimiter({
    windowMs: options.windowMs || 60000, // 1 minute window
    maxRequests: options.maxRequests || 60, // 60 requests per minute
    keyGenerator: (req) => req.ip || req.connection.remoteAddress,
    ...options,
  });
};

module.exports = {
  createRateLimiter,
  createStrictRateLimiter,
  createModerateRateLimiter,
  defaultRateLimitHandler,
};
