const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: false });

const connectDB = require('./config/db');
const { connectRedis, closeRedis } = require('./config/redis');
const { initializeClassifiedsIndexes } = require('./config/classifiedsIndexes');
const logger = require('./utils/logger');
const app = require('./app');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
let backgroundServicesStarted = false;
let databaseConnectedAtStartup = false;

const startBackgroundServices = () => {
  if (backgroundServicesStarted) {
    return;
  }

  const voiceCallScheduler = require('./services/voiceCallScheduler');
  const {
    scheduleAbandonedCartReminders,
    stopAbandonedCartReminders,
  } = require('./jobs/abandonedCartScheduler');
  const { initOrderQueue, closeOrderQueue } = require('./jobs/orderQueue');
  const messageRetryJob = require('./jobs/messageRetryJob');
  const otpCleanupJob = require('./jobs/otpCleanupJob');
  const encryptionCleanupJob = require('./jobs/encryptionCleanupJob');
  const moderationCleanupJob = require('./jobs/moderationCleanupJob');
  const optimizationCleanupJob = require('./jobs/optimizationCleanupJob');
  const abuseReportingJob = require('./jobs/abuseReportingJob');
  const DiaryReminderScheduler = require('./services/diaryReminderScheduler');
  const { io } = require('./config/websocket');
  const websocketIo = io();
  const diaryReminderScheduler = new DiaryReminderScheduler(websocketIo);
  const OrderTrackingWebSocket = require('./websocket/orderTrackingWebSocket');
  new OrderTrackingWebSocket(websocketIo);
  const missedReminderScheduler = require('./services/missedReminderScheduler');
  const smsReminderScheduler = require('./services/smsReminderScheduler');
  const emailReminderScheduler = require('./services/emailReminderScheduler');
  const whatsappReminderScheduler = require('./services/whatsappReminderScheduler');
  const telegramReminderScheduler = require('./services/telegramReminderScheduler');
  const schedulingService = require('./services/schedulingService');
  const dataManagementService = require('./services/dataManagementService');
  const pushNotificationScheduler = require('./services/pushNotificationScheduler');
  const whatsappGroupReminderScheduler = require('./services/whatsappGroupReminderScheduler');
  const draftExpirationScheduler = require('./services/draftExpirationScheduler');

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
    const {
      stopAbandonedCartReminders,
    } = require('./jobs/abandonedCartScheduler');
    const diaryReminderScheduler = require('./services/diaryReminderScheduler');
    const { io } = require('./config/websocket');
    const websocketIo = io();
    const moderationWebsocket = require('./websocket/moderationWebsocket');
    const closeOrderQueue = require('./jobs/orderQueue').closeOrderQueue;
    const voiceCallScheduler = require('./services/voiceCallScheduler');
    const missedReminderScheduler = require('./services/missedReminderScheduler');
    const smsReminderScheduler = require('./services/smsReminderScheduler');
    const emailReminderScheduler = require('./services/emailReminderScheduler');
    const whatsappReminderScheduler = require('./services/whatsappReminderScheduler');
    const telegramReminderScheduler = require('./services/telegramReminderScheduler');
    const pushNotificationScheduler = require('./services/pushNotificationScheduler');
    const whatsappGroupReminderScheduler = require('./services/whatsappGroupReminderScheduler');

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

  try {
    const moderationWebsocket = require('./websocket/moderationWebsocket');
    moderationWebsocket.shutdown();
  } catch (error) {
    logger.warn(`Failed to shutdown moderation websocket: ${error.message}`);
  }

  try {
    await closeRedis();
  } catch (error) {
    logger.warn(`Failed to close Redis connection: ${error.message}`);
  }
};

const bootstrap = async () => {
  try {
    const moderationWebsocket = require('./websocket/moderationWebsocket');
    const { initializeWebSocket } = require('./config/websocket');
    const { setupClassifiedsWebSocket } = require('./config/classifiedsWebSocket');

    await connectDB();
    await connectRedis();
    await initializeClassifiedsIndexes();

    initializeWebSocket(server);
    setupClassifiedsWebSocket(require('./config/websocket').io());
    moderationWebsocket.initialize(server);

    startBackgroundServices();

    server.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
      logger.info('WebSocket server initialized');
      logger.info('Moderation WebSocket server initialized');
      logger.info('MongoDB-backed background services started');
    });
  } catch (error) {
    logger.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
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
}

module.exports = app;
