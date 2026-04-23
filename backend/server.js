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
app.use('/uploads', express.static('uploads'));

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
app.use('/api/orders', require('./routes/orders'));
app.use('/api/products', require('./routes/products'));
app.use('/api/referralprogram', require('./routes/referralprogram'));
app.use('/api/reminders', require('./routes/reminders'));
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

// Add realestate route to main server
app.use('/api/realestate', require('./routes/realestate'));

// Voice API (new)
app.use('/api/voice', require('./routes/voice'));
app.use('/api/voice-input', require('./routes/voiceInput'));

// Astrology module routes
app.use('/api/astrology', require('./routes/astrology'));

app.use('/api/flashsales', require('./routes/flashsales'));
app.use('/api/support', require('./routes/support'));


// Initialize Elasticsearch index on startup
require('./utils/elasticsearch').ensureIndex().catch(console.error);

// Error handler last
app.use(errorHandler);

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Create HTTP server for both Express and Socket.io
const server = require('http').createServer(app);

// Initialize WebSocket
const { initializeWebSocket } = require('./config/websocket');
initializeWebSocket(server);

// Initialize Voice Call Scheduler
const voiceCallScheduler = require('./services/voiceCallScheduler');
voiceCallScheduler.start();

server.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`WebSocket server initialized`);
  logger.info(`Voice call scheduler started`);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection', err);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});
