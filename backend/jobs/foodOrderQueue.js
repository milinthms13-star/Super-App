const Queue = require('bull');
const Redis = require('ioredis');
const logger = require('../utils/logger');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const foodOrderQueue = new Queue('food orders', redisUrl, {
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

foodOrderQueue.process(async (job) => {
  const { orderId, restaurantId, action } = job.data;

  logger.info(`Processing food order ${orderId}: ${action}`, {
    restaurantId,
    orderId,
  });

  // Simulate restaurant processing time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 30000 + 10000));

  // Emit WebSocket update
  const io = require('../config/websocket').io;
  io.emit('foodorder:status', {
    orderId,
    status: action === 'prepare' ? 'Ready for Pickup' : 'Out for Delivery',
    timestamp: new Date(),
  });

  logger.info(`Food order ${orderId} ${action} complete`);

  return { success: true, status: action };
});

foodOrderQueue.on('completed', (job, result) => {
  logger.info(`Food order job ${job.id} completed`, result);
});

foodOrderQueue.on('failed', (job, err) => {
  logger.error(`Food order job ${job.id} failed`, err.message);
});

module.exports = foodOrderQueue;

