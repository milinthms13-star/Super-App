const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');

/**
 * Rate limiting configurations for different routes
 */
const rateLimiters = {
  // General API rate limiter
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Strict rate limiter for auth routes
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 login attempts per 15 minutes
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later.'
    },
    skipSuccessfulRequests: true
  }),

  // File upload rate limiter
  upload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
    message: {
      success: false,
      message: 'Upload limit exceeded, please try again later.'
    }
  }),

  // Payment rate limiter
  payment: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // 30 payment operations per hour
    message: {
      success: false,
      message: 'Payment operation limit exceeded, please try again later.'
    }
  }),

  // Export rate limiter
  export: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 exports per hour
    message: {
      success: false,
      message: 'Export limit exceeded, please try again later.'
    }
  }),

  // QR code generation rate limiter
  qrcode: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 QR codes per hour
    message: {
      success: false,
      message: 'QR code generation limit exceeded, please try again later.'
    }
  })
};

/**
 * Helmet security headers configuration
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
});

/**
 * XSS protection middleware
 * Sanitizes user input to prevent cross-site scripting attacks
 */
const xssProtection = xss();

/**
 * MongoDB query sanitization
 * Prevents NoSQL injection attacks
 */
const mongoSanitization = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized input detected: ${key} in ${req.method} ${req.path}`);
  }
});

/**
 * Input validation middleware
 * Validates common input patterns
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    req.body = value;
    next();
  };
};

/**
 * File upload security validation
 */
const validateFileUpload = (options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
  } = options;

  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files || [req.file];

    for (const file of files) {
      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`
        });
      }

      // Check MIME type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `File type ${file.mimetype} is not allowed`
        });
      }

      // Check for double extensions (e.g., file.php.jpg)
      const filename = file.originalname || file.name;
      const parts = filename.split('.');
      if (parts.length > 2) {
        return res.status(400).json({
          success: false,
          message: 'Files with multiple extensions are not allowed'
        });
      }
    }

    next();
  };
};

/**
 * API key validation middleware
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key is required'
    });
  }

  // Validate API key against stored keys
  const validApiKeys = process.env.API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
  }

  next();
};

/**
 * Request logging middleware for security monitoring
 */
const securityLogger = (req, res, next) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || 'anonymous'
  };

  // Log suspicious patterns
  if (req.path.includes('..') || req.path.includes('//')) {
    console.warn('Suspicious path detected:', logEntry);
  }

  // Log failed auth attempts
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn('Failed authentication/authorization:', logEntry);
    }
  });

  next();
};

/**
 * CORS configuration
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001'
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With']
};

/**
 * Prevent parameter pollution
 */
const preventParameterPollution = (paramWhitelist = []) => {
  return (req, res, next) => {
    // Check for duplicate query parameters
    const params = Object.keys(req.query);
    
    for (const param of params) {
      if (Array.isArray(req.query[param]) && !paramWhitelist.includes(param)) {
        return res.status(400).json({
          success: false,
          message: `Parameter pollution detected: ${param}`
        });
      }
    }

    next();
  };
};

module.exports = {
  rateLimiters,
  helmetConfig,
  xssProtection,
  mongoSanitization,
  validateInput,
  validateFileUpload,
  validateApiKey,
  securityLogger,
  corsOptions,
  preventParameterPollution
};
