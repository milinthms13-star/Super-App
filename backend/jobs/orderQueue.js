const Queue = require('bull');
const logger = require('../utils/logger');

let orderQueue = null;
const ORDER_QUEUE_NAME = 'ecommerce:orders';

const processOrderJob = async (jobData = {}) => {
  // Placeholder for order processing (payment, inventory, email, etc.)
  logger.info(`Processing order from queue: ${jobData.orderId || 'unknown-order'}`);
  // Integrate with payment webhooks, inventory deduction, etc.
  return { success: true, orderId: jobData.orderId || null };
};

const initOrderQueue = async () => {
  if (orderQueue) {
    return orderQueue;
  }

  if (process.env.NODE_ENV === 'test') {
    logger.info('Skipping ecommerce order queue initialization in test environment');
    return null;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.info('REDIS_URL not configured. Ecommerce order queue disabled.');
    return null;
  }

  orderQueue = new Queue(ORDER_QUEUE_NAME, redisUrl, {
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 50,
      attempts: 3,
    },
  });

  orderQueue.process(async (job) => processOrderJob(job.data));

  orderQueue.on('completed', (job) => {
    logger.info(`Order job ${job.id} completed: ${job.data.orderId}`);
  });

  orderQueue.on('failed', (job, err) => {
    logger.error(`Order job ${job.id} failed: ${err.message}`, { data: job.data });
  });

  orderQueue.on('error', (err) => {
    logger.error(`Ecommerce order queue error: ${err.message}`);
  });

  logger.info('Ecommerce order queue initialized');
  return orderQueue;
};

const addOrderToQueue = async (orderData) => {
  const queue = orderQueue || await initOrderQueue();
  if (!queue) {
    throw new Error('Ecommerce order queue is not configured');
  }

  const job = await queue.add('processOrder', orderData, {
    delay: 0,
    priority: 1,
  });

  return job;
};

const closeOrderQueue = async () => {
  if (!orderQueue) {
    return;
  }

  await orderQueue.close();
  orderQueue = null;
  logger.info('Ecommerce order queue closed');
};

module.exports = {
  initOrderQueue,
  addOrderToQueue,
  processOrderJob,
  closeOrderQueue,
};

