const path = require('path');

if (typeof global.ReadableStream === 'undefined') {
  const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web');
  global.ReadableStream = ReadableStream;
  global.WritableStream = WritableStream;
  global.TransformStream = TransformStream;
}

if (typeof global.Blob === 'undefined') {
  const { Blob, File } = require('buffer');
  global.Blob = Blob;
  global.File = typeof global.File === 'undefined' ? File : global.File;
}

if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

if (typeof global.MessagePort === 'undefined') {
  try {
    const { MessagePort, MessageChannel } = require('worker_threads');
    global.MessagePort = MessagePort;
    global.MessageChannel = MessageChannel;
  } catch (error) {
    global.MessagePort = class {};
    global.MessageChannel = class {};
  }
}

if (typeof global.DOMException === 'undefined') {
  global.DOMException = class DOMException extends Error {
    constructor(message, name = 'Error') {
      super(message);
      this.name = name;
    }
  };
}

require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: false });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { 
  rateLimiters, 
  xssProtection, 
  mongoSanitization, 
  securityLogger 
} = require('./middleware/securityMiddleware');

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const uploadsDirectory = path.join(__dirname, 'uploads');
const videoStudioDirectory = path.join(uploadsDirectory, 'video-studio');
const isProduction = process.env.NODE_ENV === 'production';
const DEFAULT_FRONTEND_ORIGINS = [
  'https://super-app-7j9x.onrender.com',
  'https://super-app-api.onrender.com',
];
if (!isProduction) {
  DEFAULT_FRONTEND_ORIGINS.push('http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002');
}
const DEFAULT_FRONTEND_ORIGIN_PATTERNS = [
  /^https:\/\/super-app-[a-z0-9-]+\.onrender\.com$/i,
];

const normalizeOrigin = (origin) =>
  String(origin || '')
    .trim()
    .replace(/\/$/, '');

const configuredFrontendOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  process.env.WEB_URL,
  DEFAULT_FRONTEND_ORIGINS.join(','),
]
  .filter(Boolean)
  .join(',')
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const allowedOriginSet = new Set(configuredFrontendOrigins);

const isLoopbackOrigin = (origin) => {
  try {
    const parsed = new URL(origin);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch (_error) {
    return false;
  }
};

const corsOrigin = (origin, callback) => {
  const normalizedOrigin = normalizeOrigin(origin);
  const matchesDefaultPattern = DEFAULT_FRONTEND_ORIGIN_PATTERNS.some((pattern) =>
    pattern.test(normalizedOrigin)
  );
  const localLoopbackAllowed = !isProduction && isLoopbackOrigin(normalizedOrigin);

  if (
    !origin ||
    localLoopbackAllowed ||
    matchesDefaultPattern ||
    (!isProduction && configuredFrontendOrigins.length === 0) ||
    configuredFrontendOrigins.includes('*') ||
    allowedOriginSet.has(normalizedOrigin)
  ) {
    callback(null, true);
    return;
  }

  logger.warn(`CORS origin blocked: ${normalizedOrigin || 'unknown'}`);
  callback(new Error('Not allowed by CORS'));
};

const corsOptions = {
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'x-idempotency-key',
    'idempotency-key',
    'x-source-channel',
    'x-client-platform',
    'x-app-version',
    'x-build-number',
    'x-voicefriend-session-token',
    'X-VoiceFriend-Session-Token',
  ],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(morgan('combined'));

// Security middleware
app.use(xssProtection);
app.use(mongoSanitization);
app.use(securityLogger);

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Business Builder API Documentation'
}));

// Serve swagger spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api/astrology/payment/webhook/razorpay', express.raw({ type: 'application/json', limit: '20mb' }));
app.use('/api/astrology/payment/webhook', express.raw({ type: 'application/json', limit: '20mb' }));
app.use('/webhooks/payment', express.raw({ type: 'application/json', limit: '20mb' }));
app.use('/api/gulfservices/payments/webhook', express.raw({ type: 'application/json', limit: '2mb' }));
app.use(
  express.json({
    limit: '20mb',
    inflate: true,
    verify: (req, _res, buf) => {
      if (buf && buf.length > 0) {
        req.rawBody = buf.toString('utf8');
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '20mb', inflate: true }));
app.use(
  '/uploads',
  express.static(uploadsDirectory, {
    fallthrough: false,
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);
app.use(
  '/videos',
  express.static(videoStudioDirectory, {
    fallthrough: false,
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'nilahub-backend',
    health: '/health',
    api: '/api',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

const safeUse = (mountPath, modulePath) => {
  try {
    app.use(mountPath, require(modulePath));
  } catch (error) {
    logger.error(`Skipping route ${modulePath} at ${mountPath}: ${error.message}`);
  }
};

const createLazyRouteMiddleware = (modulePath) => {
  let loadedRouter = null;
  let loadingPromise = null;

  return async (req, res, next) => {
    try {
      if (!loadedRouter) {
        if (!loadingPromise) {
          loadingPromise = Promise.resolve().then(() => require(modulePath));
        }
        loadedRouter = await loadingPromise;
        logger.info(`Lazy route loaded: ${modulePath}`);
      }

      return loadedRouter(req, res, next);
    } catch (error) {
      logger.error(`Lazy route load failed for ${modulePath}: ${error.message}`);
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable. Please try again.',
      });
    }
  };
};

const authRoutes = require('./routes/auth');
const sessionManagementRoutes = require('./routes/sessionManagementRoutes');
const appDataRoutes = require('./routes/appData');
const { cacheMiddleware, keyGenerators } = require('./middleware/cacheMiddleware');

app.use('/api/auth', authRoutes);
app.use('/api/auth', sessionManagementRoutes);
app.use('/api/appdata', appDataRoutes);
app.use('/api/app-data', appDataRoutes);
app.use('/api/realestate', require('./routes/realestate'));

// Business Builder routes with caching and rate limiting
app.use('/api/business-builder', rateLimiters.general, require('./routes/businessBuilderRoutes'));
app.use('/api/business-builder/advanced', rateLimiters.general, require('./routes/businessBuilderAdvancedRoutes'));
app.use('/api/business-builder/upload', rateLimiters.upload, require('./routes/businessBuilderUploadRoutes'));
app.use('/api/qrcode', rateLimiters.qrcode, require('./routes/qrCodeRoutes'));
app.use('/api/webhooks', rateLimiters.general, require('./routes/webhookRoutes'));
app.use('/api/audit-logs', rateLimiters.general, cacheMiddleware(60, keyGenerators.user), require('./routes/auditLogRoutes'));
app.use('/api/payments', rateLimiters.payment, require('./routes/paymentRoutes'));
app.use('/api/export', rateLimiters.export, require('./routes/exportRoutes'));
app.use('/api/video-studio', createLazyRouteMiddleware('./routes/videoStudio'));
app.use('/api/kids-video-hf', createLazyRouteMiddleware('./routes/kidsVideoGeneratorHF'));
app.use('/api/kids-story', createLazyRouteMiddleware('./routes/kidsStoryGeneratorRoutes'));
app.use('/api/cartoon-video', createLazyRouteMiddleware('./routes/cartoonVideoGenerator'));
app.use('/api/photo-studio', require('./routes/photoStudio'));
app.use('/api/voice-input', require('./routes/voiceInput'));
app.use('/api/ai-voice-friend', require('./routes/voiceFriendRoutes'));
app.use('/api/live-place-explorer', require('./routes/livePlaceExplorer'));
app.use('/api/dance-duet', require('./routes/danceDuet'));
app.use('/api/danceduet', require('./routes/danceDuet'));
app.use('/api/karaoke-duet', require('./routes/karaokeDuet'));
app.use('/api/karaokeduet', require('./routes/karaokeDuet'));
app.use('/api/kitchen', require('./routes/kitchen'));
app.use('/api/beauty-ai', require('./routes/beautyAI'));
app.use('/api/hyperlocal', createLazyRouteMiddleware('./routes/hyperlocal'));
const financeRoutes = require('./routes/finance');
if (typeof financeRoutes.bootstrap === 'function') {
  void financeRoutes.bootstrap();
}
app.use('/api/finance', financeRoutes);
const freelancerRoutes = require('./routes/freelancer');
if (typeof freelancerRoutes.bootstrap === 'function') {
  void freelancerRoutes.bootstrap();
}
app.use('/api/freelancer', freelancerRoutes);

// Education module routes
const educationRoutes = require('./routes/education');
const skillLearningRoutes = require('./routes/skilllearning');
const tuitionRoutes = require('./routes/tuition');
const { educationRateLimiter } = require('./middleware/rateLimiters');
app.use('/api/education', educationRateLimiter, educationRoutes);
app.use('/api/skilllearning', educationRateLimiter, skillLearningRoutes);
app.use('/api/app-data/skilllearning', educationRateLimiter, skillLearningRoutes);
app.use('/api/education/tuition', educationRateLimiter, tuitionRoutes);
app.use('/api/app-data/education', educationRateLimiter, educationRoutes);
app.use('/api/app-data/education/tuition', educationRateLimiter, tuitionRoutes);

app.use('/api/strategic-modules', require('./routes/strategicModules'));

app.use('/api/messaging/v4/reactions', require('./routes/messageReactionsRoutes'));
app.use('/api/messaging/v4/edits', require('./routes/messageEditRoutes'));
app.use('/api/messaging/v4/search', require('./routes/messageSearchRoutes'));
app.use('/api/messaging/v4/threads', require('./routes/messageThreadRoutes'));
app.use('/api/messaging/v4/forward', require('./routes/messageForwardingRoutes'));
app.use('/api/messaging/v4/pins', require('./routes/messagePinRoutes'));
app.use('/api/messaging/v4/receipts', require('./routes/readReceiptRoutes'));
app.use('/api/messaging/v4/translate', require('./routes/messageTranslationRoutes'));
app.use('/api/messaging/v4/analytics', require('./routes/conversationAnalyticsRoutes'));

app.use('/api/messaging/v5/schedule', require('./routes/messageScheduleRoutes'));
app.use('/api/messaging/v5/media', require('./routes/richMediaRoutes'));
app.use('/api/messaging/v5/disappearing', require('./routes/disappearingMessageRoutes'));
app.use('/api/messaging/v5/encryption', require('./routes/messageEncryptionRoutes'));
app.use('/api/messaging/v5/templates', require('./routes/messageTemplateRoutes'));
app.use('/api/messaging/v5/smart-replies', require('./routes/smartRepliesRoutes'));
app.use('/api/messaging/v5/filters', require('./routes/messageFilterRoutes'));
app.use('/api/messaging/v5/voice', require('./routes/voiceMessageRoutes'));
app.use('/api/messaging/v5/backup', require('./routes/messageBackupRoutes'));

// Advanced messaging features
app.use('/api/messaging/advanced', require('./routes/messageAdvancedRoutes'));

app.use('/api/bulkorders', require('./routes/bulkorders'));
app.use('/api/diary', require('./routes/diary'));
app.use('/api/diary', require('./routes/diary-phase7'));
app.use('/api/astrology', require('./routes/astrology'));
// NOTE: Astrology payments/webhooks are implemented inside backend/routes/astrology.js.
// Mounting backend/routes/payments.js here creates duplicate/competing endpoints and webhook handlers.
// Keeping it disabled for production safety.
// app.use('/api/astrology', require('./routes/payments'));
app.use('/api/files', require('./routes/files'));
app.use('/api/giftcards', require('./routes/giftcards'));
app.use('/api/health', require('./routes/health'));
app.use('/api/billpay', require('./routes/billpay'));
app.use('/api', require('./routes/healthcare'));
app.use('/api/localmarket', require('./routes/localmarket'));
app.use('/api/localservices', require('./routes/localservices'));
app.use('/api/nilaaihub', require('./routes/nilaaihubRoutes'));
app.use('/api/resumebuilder', require('./routes/resumebuilder'));
app.use('/api/socialmedia', require('./routes/socialmedia'));
app.use('/api/messaging', require('./routes/messaging'));
app.use('/api/invitations', require('./routes/invitations'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/checkout', require('./routes/checkoutRoutes')); // Phase 5D: Checkout & Payment
app.use('/api/cart', require('./routes/cartRoutes')); // Persistent cart API
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/settlements', require('./routes/settlements'));
app.use('/webhooks/payment', require('./routes/paymentWebhookRoutes')); // Phase 5D: Payment Gateway Webhooks

app.use('/api/orders', require('./routes/orderManagementRoutes'));
app.use('/api/admin/orders', require('./routes/adminOrderManagementRoutes'));
app.use('/api/notifications', require('./routes/orderNotificationRoutes'));
safeUse('/api/multi-notifications', './routes/multiChannelNotificationRoutes');
safeUse('/api/tax', './routes/taxCalculationRoutes');

app.use('/api/business-services', require('./routes/businessServices'));
app.use('/api/devadarshan', require('./routes/devadarshan'));
app.use('/api/tourism', require('./routes/tourismNew'));

app.use('/webhooks/carrier', require('./routes/carrierWebhookRoutes'));
app.use('/webhooks/fulfillment', require('./routes/fulfillmentWebhookRoutes'));

app.use('/api/sos', require('./routes/sosRoutes'));

app.use('/api/messaging/devices', require('./routes/deviceRoutes'));
app.use('/api/messaging/otp', require('./routes/otpRoutes'));
app.use('/api/messaging/encryption', require('./routes/encryptionRoutes'));
app.use('/api/messaging/admin', require('./routes/adminRoutes'));
app.use('/api/messaging/optimization', require('./routes/optimizationRoutes'));
app.use('/api/messaging/reports', require('./routes/abuseReportingRoutes'));
app.use('/api/messaging/feature5-reporting', require('./routes/feature5ReportingRoutes'));

app.use('/api/messaging/analytics', require('./routes/analyticsRoutes'));
app.use('/api/messaging/v3/groups', require('./routes/groupRoutes'));
app.use('/api/messaging/v3/search', require('./routes/searchRoutes'));
app.use('/api/messaging/v3/reactions', require('./routes/reactionRoutes'));
app.use('/api/messaging/v3/sync', require('./routes/syncRoutes'));

app.use('/api/messaging/v4/scheduled', require('./routes/schedulingRoutes'));
app.use('/api/messaging/v4/bookmarks', require('./routes/bookmarkPollRoutes'));
app.use('/api/messaging/v4/backups', require('./routes/backupRestoreRoutes'));
app.use('/api/messaging/v4/optimize', require('./routes/optimizationRoutes'));
app.use('/api/messaging/v4/data', require('./routes/dataManagementRoutes'));

app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/abandonedcarts', require('./routes/abandonedcarts'));
app.use('/api/products', require('./routes/products'));
safeUse('/api/products', './routes/productDiscoveryRoutes');
safeUse('/api/filters', './routes/advancedFiltersRoutes');
safeUse('/api/product-specs', './routes/productSpecificationsRoutes');
app.use('/api/referralprogram', require('./routes/referralprogram'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/matrimonial', require('./routes/matrimonial'));
app.use('/api/matrimonial', require('./routes/matrimonial-kyc'));
app.use('/api/matrimonial', require('./routes/matrimonial-horoscope'));
app.use('/api/matrimonial', require('./routes/matrimonial-subscription'));
app.use('/api/matrimonial', require('./routes/matrimonial-communication'));
app.use('/api/matrimonial', require('./routes/matrimonial-referral'));
app.use('/api/matrimonial', require('./routes/matrimonial-admin-analytics'));
app.use('/api/matrimonial', require('./routes/matrimonial-seo'));
app.use('/api/matrimonial/realtime', require('./routes/matrimonial-realtime'));
app.use('/api/matrimonial/webhooks', require('./routes/matrimonial-payment-webhook'));
app.use('/api/matrimonial/calls', require('./routes/matrimonial-calls'));
app.use('/api/matrimonial/whatsapp', require('./routes/matrimonial-whatsapp'));
app.use('/api/matrimonial/matching', require('./routes/matrimonial-matching'));
app.use('/api/matrimonial/admin', require('./routes/matrimonial-admin'));
app.use('/api/matrimonial/location', require('./routes/matrimonial-location'));
app.use('/api/matrimonial/moderation', require('./routes/matrimonial-moderation'));
app.use('/api/matrimonial/analytics', require('./routes/matrimonial-analytics'));
app.use('/api/matrimonial/success-stories', require('./routes/matrimonial-success-stories'));
app.use('/api/matrimonial/photos', require('./routes/matrimonial-photos'));
app.use('/api/matrimonial/notifications', require('./routes/matrimonial-notifications'));
app.use('/api/matrimonial/saved-searches', require('./routes/matrimonial-saved-searches'));
app.use('/api/matrimonial/messages-enhanced', require('./routes/matrimonial-messages-enhanced'));
app.use('/api/matrimonial/verification', require('./routes/matrimonial-verification'));
app.use('/api/matrimonial/astrology', require('./routes/matrimonial-astrology'));
app.use('/api/matrimonial/family', require('./routes/matrimonial-family'));
app.use('/api/matrimonial/compatibility', require('./routes/matrimonial-compatibility'));
app.use('/api/matrimonial/meetings', require('./routes/matrimonial-meetings'));
app.use('/api/matrimonial/behavioral', require('./routes/matrimonial-behavioral'));
app.use('/api/jobportal', require('./routes/jobportal'));
app.use('/api/hotelbooking', require('./routes/hotelbooking'));
app.use('/api/hotelbookings', require('./routes/hotelbooking'));
app.use('/api/gulfservices', require('./routes/gulfservices'));

app.use(errorHandler);

app.use('/api', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
  });
});

app.use(express.static(path.join(__dirname, '../build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'), (err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to load application' });
    }
  });
});

module.exports = app;
