require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

const connectDB = require('./config/db');
const { connectRedis, closeRedis } = require('./config/redis');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Init app
const app = express();
const uploadsDirectory = path.join(__dirname, 'uploads');

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(uploadsDirectory, {
  setHeaders: (res) => {
    // Uploaded chat media needs to be embeddable by the frontend audio/video tags.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

// Health check
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

// API Routes
const authRoutes = require('./routes/auth');
const appDataRoutes = require('./routes/appData');

app.use('/api/auth', authRoutes);
app.use('/api/appdata', appDataRoutes);
app.use('/api/app-data', appDataRoutes);

// Phase 4: Message Enhancements Routes (Reactions, Editing, Search, Threading, Forwarding, Pinning, Receipts, Translation, Analytics)
app.use('/api/messaging/v4/reactions', require('./routes/messageReactionsRoutes'));
app.use('/api/messaging/v4/edits', require('./routes/messageEditRoutes'));
app.use('/api/messaging/v4/search', require('./routes/messageSearchRoutes'));
app.use('/api/messaging/v4/threads', require('./routes/messageThreadRoutes'));
app.use('/api/messaging/v4/forward', require('./routes/messageForwardingRoutes'));
app.use('/api/messaging/v4/pins', require('./routes/messagePinRoutes'));
app.use('/api/messaging/v4/receipts', require('./routes/readReceiptRoutes'));
app.use('/api/messaging/v4/translate', require('./routes/messageTranslationRoutes'));
app.use('/api/messaging/v4/analytics', require('./routes/conversationAnalyticsRoutes'));

// Phase 5: Advanced Messaging Features Routes (Scheduling, Rich Media, Disappearing Messages, Encryption, Templates, Smart Replies, Filters, Voice Messages, Backup & Export)
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
app.use('/api/files', require('./routes/files'));
app.use('/api/giftcards', require('./routes/giftcards'));
app.use('/api/health', require('./routes/health'));
app.use('/api/localmarket', require('./routes/localmarket'));
app.use('/api/messaging', require('./routes/messaging'));
app.use('/api/invitations', require('./routes/invitations'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/settlements', require('./routes/settlements'));

// SOS Emergency Module Phase 1 Routes (OTP, Siren, Photos, Tracking, Retry)
app.use('/api/sos', require('./routes/sosRoutes'));

// Phase 1: Device Management Routes (Multi-Device & Session Support)
app.use('/api/messaging/devices', require('./routes/deviceRoutes'));
// Phase 2: OTP Authentication Routes
app.use('/api/messaging/otp', require('./routes/otpRoutes'));
// Phase 2: End-to-End Encryption Routes
app.use('/api/messaging/encryption', require('./routes/encryptionRoutes'));
// Phase 2: Admin Moderation Routes
app.use('/api/messaging/admin', require('./routes/adminRoutes'));
// Phase 2: Real-Time Optimization Routes
app.use('/api/messaging/optimization', require('./routes/optimizationRoutes'));
// Phase 2: User Abuse Reporting Routes
app.use('/api/messaging/reports', require('./routes/abuseReportingRoutes'));
// Phase 2: Feature 5 - Advanced Abuse Reporting Routes (Bulk, Aggregation, Analytics)
app.use('/api/messaging/feature5-reporting', require('./routes/feature5ReportingRoutes'));

// Phase 3: Analytics and Insights Routes
app.use('/api/messaging/analytics', require('./routes/analyticsRoutes'));
// Phase 3: Group Chat and Channel Management Routes
app.use('/api/messaging/v3/groups', require('./routes/groupRoutes'));
// Phase 3: Message Search Routes
app.use('/api/messaging/v3/search', require('./routes/searchRoutes'));
// Phase 3: Message Reactions, Editing, and Rich Text Routes
app.use('/api/messaging/v3/reactions', require('./routes/reactionRoutes'));
// Phase 3: Offline Sync and Message Queuing Routes
app.use('/api/messaging/v3/sync', require('./routes/syncRoutes'));

// Phase 4: Message Scheduling and Expiration Routes
app.use('/api/messaging/v4/scheduled', require('./routes/schedulingRoutes'));
// Phase 4: Message Bookmarks and Polls Routes
app.use('/api/messaging/v4/bookmarks', require('./routes/bookmarkPollRoutes'));
// Phase 4: Chat Backup and Restoration Routes
app.use('/api/messaging/v4/backups', require('./routes/backupRestoreRoutes'));
// Phase 4: Real-Time Optimization and Performance Routes
app.use('/api/messaging/v4/optimize', require('./routes/optimizationRoutes'));
// Phase 4: Data Management and Analytics Routes
app.use('/api/messaging/v4/data', require('./routes/dataManagementRoutes'));

app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/abandonedcarts', require('./routes/abandonedcarts'));
app.use('/api/products', require('./routes/products'));
app.use('/api/referralprogram', require('./routes/referralprogram'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/matrimonial', require('./routes/matrimonial-kyc'));
app.use('/api/matrimonial', require('./routes/matrimonial-subscription'));
app.use('/api/matrimonial/admin/analytics', require('./routes/matrimonial-admin-analytics'));
app.use('/api/matrimonial/referral', require('./routes/matrimonial-referral'));
app.use('/api/matrimonial/communication', require('./routes/matrimonial-communication'));
app.use('/matrimonial', require('./routes/matrimonial-seo'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/selleranalytics', require('./routes/selleranalytics'));
app.use('/api/seller-analytics', require('./routes/selleranalytics'));
app.use('/api/socialmedia', require('./routes/socialmedia'));
app.use('/api/sos', require('./routes/sos'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/wishlistshare', require('./routes/wishlistshare'));

// FoodDelivery routes
app.use('/api/fooddelivery', require('./routes/fooddelivery'));

// RideSharing routes
app.use('/api/ridesharing', require('./routes/ridesharing'));

// RealEstate routes
app.use('/api/realestate', require('./routes/realestate_fixed'));


// Voice API (new)
app.use('/api/voice', require('./routes/voice'));
app.use('/api/voice-input', require('./routes/voiceInput'));

// Astrology module routes
app.use('/api/astrology', require('./routes/astrology'));

app.use('/api/matrimonial', require('./routes/matrimonial'));
app.use('/api/flashsales', require('./routes/flashsales'));
app.use('/api/support', require('./routes/support'));


// Initialize Elasticsearch index on startup
require('./utils/elasticsearch').ensureIndex().catch(console.error);

// Error handler last
app.use(errorHandler);

// Serve React static files from build folder
app.use(express.static(path.join(__dirname, '../build')));

// SPA fallback: serve index.html for all unknown routes (React Router handles it)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'), (err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to load application' });
    }
  });
});

const PORT = process.env.PORT || 5000;

// Create HTTP server for both Express and Socket.io
const server = require('http').createServer(app);

// Initialize WebSocket
const { initializeWebSocket } = require('./config/websocket');
const { setupClassifiedsWebSocket } = require('./config/classifiedsWebSocket');
initializeWebSocket(server);

// Initialize Classifieds WebSocket namespace
const classifiedsWS = setupClassifiedsWebSocket(require('./config/websocket').io());

// Initialize Moderation WebSocket (Phase 2: Real-Time Optimization)
const moderationWebsocket = require('./websocket/moderationWebsocket');
moderationWebsocket.initialize(server);

// Initialize Voice Call Scheduler
const foodOrderQueue = require('./jobs/foodOrderQueue');
const rideQueue = require('./jobs/rideQueue');
const {
  scheduleAbandonedCartReminders,
  stopAbandonedCartReminders,
} = require('./jobs/abandonedCartScheduler');
const { initOrderQueue, closeOrderQueue } = require('./jobs/orderQueue');
const voiceCallScheduler = require('./services/voiceCallScheduler');

// Initialize Message Retry Job (Phase 1: Multi-Device & Retry Support)
const messageRetryJob = require('./jobs/messageRetryJob');

// Initialize OTP Cleanup Job (Phase 2: OTP Authentication)
const otpCleanupJob = require('./jobs/otpCleanupJob');

// Initialize Encryption Cleanup Job (Phase 2: End-to-End Encryption)
const encryptionCleanupJob = require('./jobs/encryptionCleanupJob');

// Initialize Moderation Cleanup Job (Phase 2: Admin Moderation Panel)
const moderationCleanupJob = require('./jobs/moderationCleanupJob');

// Initialize Optimization Cleanup Job (Phase 2: Real-Time Optimization)
const optimizationCleanupJob = require('./jobs/optimizationCleanupJob');

// Initialize Abuse Reporting Job (Phase 2: User Abuse Reporting)
const abuseReportingJob = require('./jobs/abuseReportingJob');

// Initialize Diary Reminder Scheduler
const DiaryReminderScheduler = require('./services/diaryReminderScheduler');
const { io } = require('./config/websocket');
const diaryReminderScheduler = new DiaryReminderScheduler(io);

// Initialize Missed Reminder Scheduler (Phase 1)
const missedReminderScheduler = require('./services/missedReminderScheduler');

// Initialize SMS Reminder Scheduler (Phase 2)
const smsReminderScheduler = require('./services/smsReminderScheduler');

// Initialize Email Reminder Scheduler (Phase 3)
const emailReminderScheduler = require('./services/emailReminderScheduler');

// Initialize WhatsApp Reminder Scheduler (Phase 4)
const whatsappReminderScheduler = require('./services/whatsappReminderScheduler');

// Initialize Telegram Reminder Scheduler (Phase 4)
const telegramReminderScheduler = require('./services/telegramReminderScheduler');

// Initialize Phase 4: Message Scheduling Service
const schedulingService = require('./services/schedulingService');

// Initialize Phase 4: Data Management Service
const dataManagementService = require('./services/dataManagementService');

// Initialize Push Notification Scheduler (Phase 4)
const pushNotificationScheduler = require('./services/pushNotificationScheduler');

// Initialize WhatsApp Group Reminder Scheduler (Phase 5)
const whatsappGroupReminderScheduler = require('./services/whatsappGroupReminderScheduler');

// Initialize Diary Draft Expiration Scheduler (Phase 4.5)
const draftExpirationScheduler = require('./services/draftExpirationScheduler');
let backgroundServicesStarted = false;
let databaseConnectedAtStartup = false;

const startBackgroundServices = () => {
  if (backgroundServicesStarted) {
    return;
  }

  voiceCallScheduler.start();
  scheduleAbandonedCartReminders();
  void initOrderQueue().catch((err) => {
    logger.warn(`Ecommerce order queue init failed: ${err.message}`);
  });

  messageRetryJob.startAll();
  otpCleanupJob.startAll();
  encryptionCleanupJob.startAll();
  moderationCleanupJob.startAll();
  optimizationCleanupJob.startAll();
  abuseReportingJob.startAll();
  diaryReminderScheduler.start();
  missedReminderScheduler.startMissedReminderScheduler(5 * 60 * 1000);
  smsReminderScheduler.start();
  emailReminderScheduler.start();
  whatsappReminderScheduler.startWhatsAppReminderScheduler();
  telegramReminderScheduler.startTelegramReminderScheduler();
  schedulingService.startSchedulingJobs();
  dataManagementService.startDataManagementJobs();
  pushNotificationScheduler.startPushNotificationScheduler();
  whatsappGroupReminderScheduler.startWhatsAppGroupReminderScheduler();
  draftExpirationScheduler.startDraftExpirationScheduler();

  backgroundServicesStarted = true;
};

const stopBackgroundServices = async () => {
  if (backgroundServicesStarted) {
    voiceCallScheduler.stop();
    stopAbandonedCartReminders();
    diaryReminderScheduler.stop();
    missedReminderScheduler.stopMissedReminderScheduler();
    smsReminderScheduler.stop();
    emailReminderScheduler.stop();
    whatsappReminderScheduler.stopWhatsAppReminderScheduler();
    telegramReminderScheduler.stopTelegramReminderScheduler();
    pushNotificationScheduler.stopPushNotificationScheduler();
    whatsappGroupReminderScheduler.stopWhatsAppGroupReminderScheduler();

    try {
      await closeOrderQueue();
    } catch (error) {
      logger.warn(`Failed to close ecommerce order queue: ${error.message}`);
    }

    backgroundServicesStarted = false;
  }

  moderationWebsocket.shutdown();

  try {
    await closeRedis();
  } catch (error) {
    logger.warn(`Failed to close Redis connection: ${error.message}`);
  }
};

const bootstrap = async () => {
  try {
    databaseConnectedAtStartup = await connectDB();
    await connectRedis();

    if (databaseConnectedAtStartup) {
      startBackgroundServices();
    } else {
      logger.warn('MongoDB is not connected. Starting without MongoDB-backed background jobs.');
    }

    server.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
      logger.info('WebSocket server initialized');
      logger.info('Moderation WebSocket server initialized');

      if (databaseConnectedAtStartup) {
        logger.info('MongoDB-backed background services started');
      } else {
        logger.warn('Background jobs were skipped because MongoDB is not connected');
      }
    });
  } catch (error) {
    logger.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
};

bootstrap();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection', err);
  if (server.listening) {
    server.close(() => process.exit(1));
    return;
  }

  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await stopBackgroundServices();

  if (server.listening) {
    server.close(() => {
      logger.info('Process terminated');
    });
    return;
  }

  logger.info('Process terminated');
});
