const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  if (process.env.NODE_ENV === 'test') {
    return; // Skip Redis in tests
  }

  if (!process.env.REDIS_URL) {
    logger.info('REDIS_URL not configured. Redis cache disabled.');
    return;
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: false,
      },
    });

    redisClient.on('error', (err) => {
      logger.warn(`Redis unavailable. Continuing without cache: ${err.message}`);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('end', () => {
      logger.info('Redis connection ended');
    });

    await redisClient.connect();
  } catch (error) {
    redisClient = null;
    logger.warn(`Redis connection failed. Continuing without cache: ${error.message}`);
    // Don't exit process, Redis is optional for basic functionality
  }
};

const getRedisClient = () => {
  return redisClient;
};

const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
};

module.exports = { connectRedis, getRedisClient, closeRedis };
