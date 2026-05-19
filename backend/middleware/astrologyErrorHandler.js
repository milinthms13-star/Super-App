/**
 * Astrology Module - Error Handling & Middleware
 * Provides comprehensive error handling, validation, and request filtering
 */

const logger = require('../config/logger');

/**
 * Astrology-specific error handler middleware
 */
const astrologyErrorHandler = (error, req, res, next) => {
  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.error(`[${errorId}] Astrology error: ${error.message}`, {
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    stack: error.stack,
  });

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errorId,
      details: Object.entries(error.errors).map(([field, err]) => ({
        field,
        message: err.message,
      })),
    });
  }

  // Cast errors (invalid MongoDB IDs)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid record ID format',
      errorId,
    });
  }

  // Duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `Duplicate value for field: ${field}`,
      errorId,
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      errorId,
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      errorId,
    });
  }

  // Generic errors
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    errorId,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

/**
 * Request validation middleware for astrology bookings
 */
const validateAstrologyBooking = (req, res, next) => {
  const { consultantId, preferredDate, consultationDuration } = req.body;

  const errors = [];

  if (!consultantId || typeof consultantId !== 'string') {
    errors.push('Invalid or missing consultantId');
  }

  if (!preferredDate || isNaN(new Date(preferredDate).getTime())) {
    errors.push('Invalid or missing preferredDate');
  }

  if (new Date(preferredDate) < new Date()) {
    errors.push('preferredDate must be in the future');
  }

  if (consultationDuration && (consultationDuration < 15 || consultationDuration > 120)) {
    errors.push('consultationDuration must be between 15 and 120 minutes');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Booking validation failed',
      errors,
    });
  }

  next();
};

/**
 * Request validation middleware for payments
 */
const validatePaymentRequest = (req, res, next) => {
  const { bookingId, amountInr } = req.body;

  const errors = [];

  if (!bookingId || typeof bookingId !== 'string') {
    errors.push('Invalid or missing bookingId');
  }

  if (!amountInr || amountInr < 100 || amountInr > 10000) {
    errors.push('amountInr must be between 100 and 10000');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Payment validation failed',
      errors,
    });
  }

  next();
};

/**
 * Rate limiting for payment operations
 */
const paymentRateLimiter = (() => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const userId = String(req.user?._id || req.user?.id || 'anonymous');
    const now = Date.now();
    
    if (!attempts.has(userId)) {
      attempts.set(userId, []);
    }
    
    const userAttempts = attempts.get(userId);
    
    // Remove attempts older than 5 minutes
    attempts.set(userId, userAttempts.filter(timestamp => now - timestamp < 5 * 60 * 1000));
    
    // Allow 10 attempts per 5 minutes
    if (userAttempts.length >= 10) {
      return res.status(429).json({
        success: false,
        message: 'Too many payment attempts. Please try again later.',
      });
    }
    
    userAttempts.push(now);
    next();
  };
})();

/**
 * Audit logging middleware for sensitive operations
 */
const auditLog = (action) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      if (data.success) {
        logger.info(`[AUDIT] ${action}`, {
          userId: req.user?.id,
          timestamp: new Date().toISOString(),
          data: {
            ...data,
            // Mask sensitive data
            paymentId: data.data?.paymentId ? '***' : undefined,
            signature: '***',
          },
        });
      }
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Response sanitization middleware
 */
const sanitizeResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    // Remove sensitive fields
    if (data.data?.paymentSecret) delete data.data.paymentSecret;
    if (data.data?.apiKey) delete data.data.apiKey;
    
    return originalJson(data);
  };
  
  next();
};

module.exports = {
  astrologyErrorHandler,
  validateAstrologyBooking,
  validatePaymentRequest,
  paymentRateLimiter,
  auditLog,
  sanitizeResponse,
};
