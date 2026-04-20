const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const { initializeWebSocket, io: getIo } = require('./config/websocket');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const { initializeGmailAuth } = require('./config/gmail');
const logger = require('./utils/logger');
const { migrateModuleDataToMongo } = require('./utils/moduleDataMigration');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');
const productRoutes = require('./routes/products');
const appDataRoutes = require('./routes/appData');
const orderRoutes = require('./routes/orders');
const fileRoutes = require('./routes/files');
const socialmediaRoutes = require('./routes/socialmedia');
const messagingRoutes = require('./routes/messaging');
const reminderRoutes = require('./routes/reminders');
const diaryRoutes = require('./routes/diary');
const sosRoutes = require('./routes/sos');

const app = express();
const server = http.createServer(app);
const defaultFrontendOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
const configuredFrontendOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = configuredFrontendOrigins.length > 0
  ? configuredFrontendOrigins
  : defaultFrontendOrigins;

// Initialize WebSocket for real-time messaging
initializeWebSocket(server);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-malabar-role'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 15 : 5, // higher limit in dev for repeated testing
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: logger.stream }));
} else {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check (before other routes)
app.use('/api/health', healthRoutes);

// API routes
app.use('/api/auth/send-otp', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/app-data', appDataRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/social', socialmediaRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/sos', sosRoutes);

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../build')));

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// WebSocket is now handled by config/websocket.js

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  try {
    const migrationResult = await migrateModuleDataToMongo();
    if (migrationResult?.migrated) {
      logger.info(`Module data migration checked: ${JSON.stringify(migrationResult)}`);
    }
  } catch (error) {
    logger.error('Module data migration error:', error);
  }
  await connectRedis();

  // Initialize Gmail OAuth if enabled
  if (process.env.EMAIL_SERVICE === 'gmail-api') {
    const gmailReady = await initializeGmailAuth();
    if (gmailReady) {
      logger.info('Gmail API initialized');
    } else {
      logger.warn('Gmail API not ready. Follow setup instructions or use a different email service.');
    }
  }

  server.listen(PORT, () => {
    logger.info(`MalabarBazaar backend running on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Frontend URL: ${allowedOrigins.join(', ')}`);
  });
};

startServer();

// Export for testing
module.exports = { app, server, io: getIo() };
