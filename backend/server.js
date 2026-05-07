require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

const connectDB = require('./config/db');
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

// Connect Database
connectDB();

// Init Redis
const { connectRedis } = require('./config/redis');
connectRedis().catch((err) => {
  logger.warn('Redis init failed (optional):', err.message);
});

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

// Initialize Voice Call Scheduler
const foodOrderQueue = require('./jobs/foodOrderQueue');
const rideQueue = require('./jobs/rideQueue');
const voiceCallScheduler = require('./services/voiceCallScheduler');
voiceCallScheduler.start();

// Initialize Diary Reminder Scheduler
const DiaryReminderScheduler = require('./services/diaryReminderScheduler');
const { io } = require('./config/websocket');
const diaryReminderScheduler = new DiaryReminderScheduler(io);
diaryReminderScheduler.start();

// Initialize Missed Reminder Scheduler (Phase 1)
const missedReminderScheduler = require('./services/missedReminderScheduler');
missedReminderScheduler.startMissedReminderScheduler(5 * 60 * 1000);  // Run every 5 minutes

// Initialize SMS Reminder Scheduler (Phase 2)
const smsReminderScheduler = require('./services/smsReminderScheduler');
smsReminderScheduler.start();

// Initialize Email Reminder Scheduler (Phase 3)
const emailReminderScheduler = require('./services/emailReminderScheduler');
emailReminderScheduler.start();

// Initialize WhatsApp Reminder Scheduler (Phase 4)
const whatsappReminderScheduler = require('./services/whatsappReminderScheduler');
whatsappReminderScheduler.startWhatsAppReminderScheduler();

// Initialize Telegram Reminder Scheduler (Phase 4)
const telegramReminderScheduler = require('./services/telegramReminderScheduler');
telegramReminderScheduler.startTelegramReminderScheduler();

// Initialize Push Notification Scheduler (Phase 4)
const pushNotificationScheduler = require('./services/pushNotificationScheduler');
pushNotificationScheduler.startPushNotificationScheduler();

// Initialize WhatsApp Group Reminder Scheduler (Phase 5)
const whatsappGroupReminderScheduler = require('./services/whatsappGroupReminderScheduler');
whatsappGroupReminderScheduler.startWhatsAppGroupReminderScheduler();

// Initialize Diary Draft Expiration Scheduler (Phase 4.5)
const draftExpirationScheduler = require('./services/draftExpirationScheduler');
draftExpirationScheduler.startDraftExpirationScheduler();

server.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`WebSocket server initialized`);
  logger.info(`Voice call scheduler started`);
  logger.info(`Diary reminder scheduler started`);
  logger.info(`Missed reminder scheduler started`);
  logger.info(`SMS reminder scheduler started`);
  logger.info(`Email reminder scheduler started`);
  logger.info(`WhatsApp reminder scheduler started`);
  logger.info(`Telegram reminder scheduler started`);
  logger.info(`Push notification scheduler started`);
  logger.info(`WhatsApp group reminder scheduler started`);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection', err);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  voiceCallScheduler.stop();
  diaryReminderScheduler.stop();
  missedReminderScheduler.stopMissedReminderScheduler();
  smsReminderScheduler.stop();
  emailReminderScheduler.stop();
  whatsappReminderScheduler.stopWhatsAppReminderScheduler();
  telegramReminderScheduler.stopTelegramReminderScheduler();
  pushNotificationScheduler.stopPushNotificationScheduler();
  whatsappGroupReminderScheduler.stopWhatsAppGroupReminderScheduler();
  server.close(() => {
    logger.info('Process terminated');
  });
});
