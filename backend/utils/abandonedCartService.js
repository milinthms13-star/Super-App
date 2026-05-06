/**
 * Abandoned Cart Detection and Recovery Service
 * Detects abandoned carts, sends reminders, and tracks recovery
 */

const { MILLISECONDS_IN_DAY } = require('../config/constants');
const logger = require('./logger');

/**
 * Detect abandoned carts based on time threshold
 * @param {Array} carts - All shopping carts from store
 * @param {Number} abandonmentMinutes - Time threshold in minutes (default 30)
 * @returns {Array} Abandoned carts
 */
const detectAbandonedCarts = (carts = [], abandonmentMinutes = 30) => {
  try {
    const now = new Date();
    const abandonmentThreshold = abandonmentMinutes * 60 * 1000; // Convert to milliseconds

    const abandoned = carts.filter((cart) => {
      const lastActivityTime = new Date(cart.lastModified || cart.createdAt);
      const timeSinceLastActivity = now - lastActivityTime;

      return (
        timeSinceLastActivity > abandonmentThreshold &&
        cart.items &&
        cart.items.length > 0 &&
        cart.customerEmail
      );
    });

    return abandoned;
  } catch (error) {
    logger.error(`Error detecting abandoned carts: ${error.message}`);
    return [];
  }
};

/**
 * Check if cart is eligible for reminder
 * @param {Object} cart - Cart document
 * @param {Number} maxReminders - Max reminders before giving up (default 3)
 * @param {Number} reminderIntervalHours - Hours between reminders (default 24)
 * @returns {Boolean}
 */
const isEligibleForReminder = (
  cart = {},
  maxReminders = 3,
  reminderIntervalHours = 24
) => {
  try {
    // Check recovery attempts
    if ((cart.recoveryAttempts || 0) >= maxReminders) {
      return false;
    }

    // Check last reminder time
    if (cart.reminders && cart.reminders.length > 0) {
      const lastReminder = cart.reminders[cart.reminders.length - 1];
      const lastSentTime = new Date(lastReminder.sentAt);
      const now = new Date();
      const hoursSinceLastReminder = (now - lastSentTime) / (1000 * 60 * 60);

      if (hoursSinceLastReminder < reminderIntervalHours) {
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error(`Error checking reminder eligibility: ${error.message}`);
    return false;
  }
};

/**
 * Calculate recovery rate from abandoned carts
 * @param {Array} carts - Array of cart documents
 * @returns {Object} Recovery statistics
 */
const calculateRecoveryStats = (carts = []) => {
  try {
    const totalAbandoned = carts.length;
    const recovered = carts.filter((c) => c.status === 'recovered').length;
    const withReminders = carts.filter((c) => c.reminders && c.reminders.length > 0)
      .length;
    const opened = carts.filter(
      (c) =>
        c.reminders &&
        c.reminders.some((r) => r.status === 'opened' || r.openedAt)
    ).length;

    const totalValue = carts.reduce((sum, c) => sum + (c.cartValue?.total || 0), 0);
    const recoveredValue = carts
      .filter((c) => c.status === 'recovered')
      .reduce((sum, c) => sum + (c.cartValue?.total || 0), 0);

    return {
      totalAbandoned,
      totalRecovered: recovered,
      recoveryRate: totalAbandoned > 0 ? ((recovered / totalAbandoned) * 100).toFixed(2) : 0,
      cartsWithReminders: withReminders,
      reminderOpenRate: withReminders > 0 ? ((opened / withReminders) * 100).toFixed(2) : 0,
      totalCartValue: Math.round(totalValue * 100) / 100,
      recoveredValue: Math.round(recoveredValue * 100) / 100,
      potentialLoss: Math.round((totalValue - recoveredValue) * 100) / 100,
    };
  } catch (error) {
    logger.error(`Error calculating recovery stats: ${error.message}`);
    return null;
  }
};

/**
 * Generate reminder email template
 * @param {Object} cart - Cart document
 * @param {String} customerName - Customer name
 * @param {Object} incentive - Optional discount incentive
 * @returns {Object} Email template
 */
const generateReminderEmailTemplate = (cart = {}, customerName = '', incentive = null) => {
  try {
    const itemsSummary = (cart.items || [])
      .map((item) => `${item.quantity}x ${item.productName} (₹${item.price})`)
      .join(', ');

    const incentiveText = incentive
      ? `\n\nSpecial Offer: Use code "${incentive.couponCode}" to get ${
          incentive.discount
        }% off your order!`
      : '';

    return {
      subject: `You left ${cart.items?.length || 0} items in your cart!`,
      body: `
Hi ${customerName},

We noticed you left some great items in your cart:
${itemsSummary}

Cart Total: ₹${cart.cartValue?.total || 0}

Don't miss out! Complete your purchase now.${incentiveText}

Best regards,
GlobeMart Team
      `.trim(),
    };
  } catch (error) {
    logger.error(`Error generating reminder email: ${error.message}`);
    return null;
  }
};

/**
 * Expire old abandoned carts (not recovered after 30 days)
 * @param {Array} carts - All abandoned carts
 * @param {Number} expirationDays - Days before expiration (default 30)
 * @returns {Array} Carts to expire
 */
const getExpiredCarts = (carts = [], expirationDays = 30) => {
  try {
    const now = new Date();
    const expirationThreshold = expirationDays * MILLISECONDS_IN_DAY;

    return carts.filter((cart) => {
      const timeSinceAbandonment =
        now - new Date(cart.abandonedAt || cart.createdAt);
      return timeSinceAbandonment > expirationThreshold && cart.status !== 'recovered';
    });
  } catch (error) {
    logger.error(`Error getting expired carts: ${error.message}`);
    return [];
  }
};

module.exports = {
  detectAbandonedCarts,
  isEligibleForReminder,
  calculateRecoveryStats,
  generateReminderEmailTemplate,
  getExpiredCarts,
};
