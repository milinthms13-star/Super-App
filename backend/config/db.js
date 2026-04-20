const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { initializeGridFS } = require('../utils/gridfs');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    if (process.env.AUTH_STORAGE === 'memory' && process.env.NODE_ENV !== 'production') {
      logger.warn('Using development-only in-memory auth storage. MongoDB/GridFS is disabled because MONGODB_URI is not set.');
      return;
    }

    logger.error('MONGODB_URI is required in .env');
    process.exit(1);
  }

  try {
    const normalizedUri = uri.replace('mongodb://localhost', 'mongodb://127.0.0.1');
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      family: 4, // Force IPv4 to avoid Windows localhost IPv6 resolution issues
    };

    await mongoose.connect(normalizedUri, options);
    logger.info('MongoDB connected successfully');
    initializeGridFS();
    logger.info('GridFS bucket initialized');

    if (process.env.AUTH_STORAGE === 'memory' && process.env.NODE_ENV !== 'production') {
      logger.warn('Auth remains in memory mode, but MongoDB is connected for GridFS and other persisted data.');
    }

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('MongoDB connection error:', error);
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('Continuing without MongoDB in development mode. Some features may be unavailable.');
      return;
    }
    process.exit(1);
  }
};

module.exports = connectDB;
