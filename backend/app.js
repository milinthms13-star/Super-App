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

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const uploadsDirectory = path.join(__dirname, 'uploads');
const configuredFrontendOrigins = String(process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOrigin = (origin, callback) => {
  if (
    !origin ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    configuredFrontendOrigins.length === 0 ||
    configuredFrontendOrigins.includes('*') ||
    configuredFrontendOrigins.includes(origin)
  ) {
    callback(null, true);
    return;
  }

  logger.warn(`CORS origin not allowed: ${origin}`);
  callback(null, true);
};

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(
  '/uploads',
  express.static(uploadsDirectory, {
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

const authRoutes = require('./routes/auth');
const appDataRoutes = require('./routes/appData');

app.use('/api/auth', authRoutes);
app.use('/api/appdata', appDataRoutes);
app.use('/api/app-data', appDataRoutes);
app.use('/api/business-builder', require('./routes/businessBuilderRoutes'));

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

app.use('/api/bulkorders', require('./routes/bulkorders'));
app.use('/api/diary', require('./routes/diary'));
app.use('/api/diary', require('./routes/diary-phase7'));
app.use('/api/files', require('./routes/files'));
app.use('/api/giftcards', require('./routes/giftcards'));
app.use('/api/health', require('./routes/health'));
app.use('/api', require('./routes/healthcare'));
app.use('/api/localmarket', require('./routes/localmarket'));
app.use('/api/localservices', require('./routes/localservices'));
app.use('/api/messaging', require('./routes/messaging'));
app.use('/api/invitations', require('./routes/invitations'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/checkout', require('./routes/checkoutRoutes')); // Phase 5D: Checkout & Payment
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
app.use('/api/matrimonial', require('./routes/matrimonial-kyc'));

app.use(errorHandler);

app.use(express.static(path.join(__dirname, '../build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'), (err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to load application' });
    }
  });
});

module.exports = app;
