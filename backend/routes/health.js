const express = require('express');
const mongoose = require('mongoose');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MalabarBazaar backend is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  const health = {
    success: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {},
  };

  // Check MongoDB
  try {
    await mongoose.connection.db.admin().ping();
    health.services.mongodb = {
      status: 'healthy',
      message: 'Connected',
    };
  } catch (error) {
    health.services.mongodb = {
      status: 'unhealthy',
      message: error.message,
    };
    health.success = false;
  }

  // Check Redis (if available)
  try {
    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.ping();
      health.services.redis = {
        status: 'healthy',
        message: 'Connected',
      };
    } else {
      health.services.redis = {
        status: 'disabled',
        message: 'Redis not configured',
      };
    }
  } catch (error) {
    health.services.redis = {
      status: 'unhealthy',
      message: error.message,
    };
    health.success = false;
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  health.memory = {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
  };

  // System info
  health.system = {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    pid: process.pid,
  };

  const statusCode = health.success ? 200 : 503;
  res.status(statusCode).json(health);
});

// Readiness probe for Kubernetes/Docker
router.get('/ready', async (req, res) => {
  try {
    // Check if MongoDB is ready
    await mongoose.connection.db.admin().ping();

    res.status(200).json({
      success: true,
      message: 'Service is ready to accept traffic',
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Service is not ready',
    });
  }
});

// Liveness probe
router.get('/live', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service is alive',
  });
});

module.exports = router;