const rateLimit = require('express-rate-limit');

/**
 * Rate limiters for classified listings endpoints
 */

// General API limit: 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for creating listings: 5 per hour per user
const createListingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => req.user?.email || req.ip,
  message: 'Too many listings created. Please wait before posting another ad.',
});

// Moderate limit for messaging: 30 messages per hour
const messageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  keyGenerator: (req) => req.user?.email || req.ip,
  message: 'Too many messages sent. Please slow down.',
});

// Strict limit for reporting: 10 reports per hour
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => req.user?.email || req.ip,
  message: 'Too many reports submitted. Please wait before reporting again.',
});

// Search limit: 50 searches per minute
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  keyGenerator: (req) => req.user?.email || req.ip,
  message: 'Too many search requests. Please wait before searching again.',
});

// Admin bulk action limiter: 20 per hour
const bulkActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => req.user?.email || req.ip,
  message: 'Too many bulk actions. Please wait before performing another bulk operation.',
});

// Media upload limiter: 10 uploads per hour (5MB each)
const mediaUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => req.user?.email || req.ip,
  message: 'Too many media uploads. Please wait before uploading more files.',
});

module.exports = {
  generalLimiter,
  createListingLimiter,
  messageLimiter,
  reportLimiter,
  searchLimiter,
  bulkActionLimiter,
  mediaUploadLimiter,
};
