const rateLimit = require('express-rate-limit');

// Education module rate limiter
const educationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Enrollment rate limiter (stricter)
const enrollmentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit to 10 enrollments per hour
  message: 'Too many enrollment attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Certificate upload rate limiter
const certificateUploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit to 20 uploads per hour
  message: 'Too many upload attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Test submission rate limiter
const testSubmissionRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Limit to 30 test submissions per hour
  message: 'Too many test submissions, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  educationRateLimiter,
  enrollmentRateLimiter,
  certificateUploadRateLimiter,
  testSubmissionRateLimiter,
};
