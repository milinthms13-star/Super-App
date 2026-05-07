/**
 * Abandoned Cart Scheduler Job
 * Periodically detects abandoned carts and sends reminders
 * 
 * Usage in server.js:
 * const { scheduleAbandonedCartReminders } = require('./jobs/abandonedCartScheduler');
 * scheduleAbandonedCartReminders();
 */

const AbandonedCart = require('../models/AbandonedCart');
const {
  detectAbandonedCarts,
  isEligibleForReminder,
  getExpiredCarts,
  generateReminderEmailTemplate,
} = require('../utils/abandonedCartService');
const logger = require('../utils/logger');
const ABANDONED_CART_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let abandonedCartInterval = null;

/**
 * Send reminder for abandoned cart
 * @param {Object} cart - Abandoned cart document
 * @param {String} channel - Communication channel ('email', 'sms', 'whatsapp', 'push')
 * @returns {Boolean} Success status
 */
const sendCartReminder = async (cart = {}, channel = 'email') => {
  try {
    if (!isEligibleForReminder(cart)) {
      logger.info(`Cart ${cart.cartId} is not eligible for reminder`);
      return false;
    }

    // Generate email template
    const emailTemplate = generateReminderEmailTemplate(
      cart,
      cart.customerName || cart.customerEmail,
      cart.incentive
    );

    if (!emailTemplate) {
      logger.error(`Failed to generate email template for cart ${cart.cartId}`);
      return false;
    }

    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    // For now, just log the reminder
    logger.info(`
      [ABANDONED CART REMINDER]
      Cart ID: ${cart.cartId}
      Customer: ${cart.customerEmail}
      Items: ${cart.items?.length || 0}
      Total: ₹${cart.cartValue?.total || 0}
      Channel: ${channel}
      Subject: ${emailTemplate.subject}
    `);

    // Record reminder in database
    const reminder = {
      sentAt: new Date(),
      channel,
      status: 'sent',
      recipientAddress: cart.customerEmail,
    };

    await AbandonedCart.findByIdAndUpdate(
      cart._id,
      {
        $push: { reminders: reminder },
        $inc: { recoveryAttempts: 1 },
      },
      { new: true }
    );

    return true;
  } catch (error) {
    logger.error(`Error sending cart reminder: ${error.message}`);
    return false;
  }
};

/**
 * Expire old abandoned carts (30+ days without recovery)
 * Mark them as 'expired' to stop sending reminders
 */
const expireOldCarts = async () => {
  try {
    const expiredCarts = await AbandonedCart.find({
      status: 'abandoned',
      abandonedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    if (expiredCarts.length === 0) {
      return;
    }

    const expiredIds = expiredCarts.map((cart) => cart._id);

    await AbandonedCart.updateMany(
      { _id: { $in: expiredIds } },
      { status: 'expired' }
    );

    logger.info(`Expired ${expiredCarts.length} old abandoned carts`);
  } catch (error) {
    logger.error(`Error expiring old carts: ${error.message}`);
  }
};

/**
 * Main scheduler job - runs periodically (e.g., every 6 hours)
 * 1. Detect abandoned carts
 * 2. Send reminders to eligible carts
 * 3. Expire old carts
 */
const processAbandonedCarts = async () => {
  try {
    logger.info('Starting abandoned cart reminder job...');

    // Get all active abandoned carts
    const abandonedCarts = await AbandonedCart.find({
      status: 'abandoned',
      recoveryAttempts: { $lt: 3 },
    });

    if (abandonedCarts.length === 0) {
      logger.info('No abandoned carts to process');
      return;
    }

    let remindersCount = 0;

    // Send reminders
    for (const cart of abandonedCarts) {
      const sent = await sendCartReminder(cart, 'email');
      if (sent) {
        remindersCount += 1;
      }
    }

    logger.info(`Sent ${remindersCount} cart reminders`);

    // Expire old carts
    await expireOldCarts();

    logger.info('Abandoned cart reminder job completed');
  } catch (error) {
    logger.error(`Error in abandoned cart job: ${error.message}`);
  }
};

/**
 * Schedule the job to run periodically
 * Default: Every 6 hours (using simple setInterval)
 * For production, consider using bull-mq or node-cron
 */
const scheduleAbandonedCartReminders = () => {
  if (abandonedCartInterval) {
    logger.warn('Abandoned cart reminder scheduler is already running');
    return abandonedCartInterval;
  }

  logger.info('Scheduling abandoned cart reminder job every 6 hours');

  // Run once immediately
  void processAbandonedCarts();

  // Then schedule recurring
  abandonedCartInterval = setInterval(() => {
    void processAbandonedCarts();
  }, ABANDONED_CART_INTERVAL_MS);

  return abandonedCartInterval;
};

const stopAbandonedCartReminders = () => {
  if (!abandonedCartInterval) {
    logger.warn('Abandoned cart reminder scheduler is not running');
    return;
  }

  clearInterval(abandonedCartInterval);
  abandonedCartInterval = null;
  logger.info('Abandoned cart reminder scheduler stopped');
};

module.exports = {
  sendCartReminder,
  expireOldCarts,
  processAbandonedCarts,
  scheduleAbandonedCartReminders,
  stopAbandonedCartReminders,
};
