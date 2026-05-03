const Queue = require('bullmq');
const IORedis = require('ioredis');
const logger = require('../utils/logger');
const { connectRedis } = require('../config/redis');

let orderQueue = null;

const initOrderQueue = async () => {
  await connectRedis();
  const redisConnection = new IORedis(process.env.REDIS_URL);
  
  orderQueue = new Queue('ecommerce:orders', {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 50,
      attempts: 3,
    },
  });

  logger.info('Ecommerce order queue initialized');

  orderQueue.on('completed', (job) => {
    logger.info(`Order job ${job.id} completed: ${job.data.orderId}`);
  });

  orderQueue.on('failed', (job, err) => {
    logger.error(`Order job ${job.id} failed: ${err.message}`, { data: job.data });
  });

  return orderQueue;
};

const addOrderToQueue = async (orderData) => {
  if (!orderQueue) {
    await initOrderQueue();
  }

  const job = await orderQueue.add('processOrder', orderData, {
    delay: 0,
    priority: 1,
  });

  return job;
};

const processOrderJob = async (jobData) => {
  // Placeholder for order processing (payment, inventory, email, etc.)
  logger.info('Processing order from queue:', jobData.orderId);
  // Integrate with payment webhooks, inventory deduction, etc.
};

module.exports = {
  initOrderQueue,
  addOrderToQueue,
  processOrderJob,
};

