/**
 * Matrimonial Subscription Service
 * Handles subscription lifecycle, renewals, expiry
 */

const MatrimonialSubscription = require('../models/MatrimonialSubscription');
const logger = require('../utils/logger');

const SUBSCRIPTION_TIERS = {
  free: {
    profileViews: 50,
    interestRequests: 10,
    directMessages: 0,
    horoscopeMatching: false,
    videoCalls: false,
  },
  gold: {
    profileViews: 500,
    interestRequests: 100,
    directMessages: 200,
    horoscopeMatching: true,
    videoCalls: false,
    cost: 499,
    duration: 30, // days
  },
  premium: {
    profileViews: 2000,
    interestRequests: 500,
    directMessages: 1000,
    horoscopeMatching: true,
    videoCalls: true,
    cost: 999,
    duration: 30,
  },
  vip: {
    profileViews: 'unlimited',
    interestRequests: 'unlimited',
    directMessages: 'unlimited',
    horoscopeMatching: true,
    videoCalls: true,
    cost: 2999,
    duration: 30,
  },
};

/**
 * Create new subscription
 */
const createSubscription = async (profileId, userEmail, tier, billingCycle = 'monthly') => {
  try {
    if (!SUBSCRIPTION_TIERS[tier]) {
      throw new Error(`Invalid subscription tier: ${tier}`);
    }

    const tierConfig = SUBSCRIPTION_TIERS[tier];
    const daysPerMonth = 30;
    const durationDays = tierConfig.duration || daysPerMonth;

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const subscription = new MatrimonialSubscription({
      profileId,
      userEmail,
      tier,
      billingCycle,
      startDate,
      endDate,
      nextRenewalDate: endDate,
      amount: tierConfig.cost || 0,
      paymentStatus: tier === 'free' ? 'completed' : 'pending',
      isActive: true,
      entitlements: {
        profileViews: tierConfig.profileViews === 'unlimited' ? 999999 : tierConfig.profileViews,
        interestRequests: tierConfig.interestRequests === 'unlimited' ? 999999 : tierConfig.interestRequests,
        directMessages: tierConfig.directMessages === 'unlimited' ? 999999 : tierConfig.directMessages,
        horoscopeMatching: tierConfig.horoscopeMatching,
        videoCalls: tierConfig.videoCalls,
      },
    });

    await subscription.save();
    logger.info(`Subscription created: ${tier} for ${userEmail}`);

    return subscription;
  } catch (error) {
    logger.error(`Error creating subscription: ${error.message}`);
    throw error;
  }
};

/**
 * Check if user has entitlement
 */
const hasEntitlement = async (userEmail, entitlement) => {
  try {
    const subscription = await MatrimonialSubscription.findOne({
      userEmail,
      isActive: true,
      endDate: { $gt: new Date() },
    }).lean();

    if (!subscription) return false;

    const value = subscription.entitlements[entitlement];
    const usedValue = subscription.entitlements?.[`${entitlement}Used`] || 0;
    return value === true || (typeof value === 'number' && value > usedValue);
  } catch (error) {
    logger.error(`Error checking entitlement: ${error.message}`);
    return false;
  }
};

/**
 * Consume entitlement (decrement count)
 */
const consumeEntitlement = async (userEmail, entitlement) => {
  try {
    const subscription = await MatrimonialSubscription.findOne({
      userEmail,
      isActive: true,
    });

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const usedField = `${entitlement}Used`;
    const currentUsed = subscription.entitlements[usedField] || 0;
    const limit = subscription.entitlements[entitlement];

    if (currentUsed >= limit) {
      throw new Error(`${entitlement} limit exceeded`);
    }

    subscription.entitlements[usedField] = currentUsed + 1;
    await subscription.save();

    return subscription;
  } catch (error) {
    logger.error(`Error consuming entitlement: ${error.message}`);
    throw error;
  }
};

/**
 * Handle subscription expiry
 */
const handleSubscriptionExpiry = async () => {
  try {
    const now = new Date();

    // Find expired subscriptions
    const expired = await MatrimonialSubscription.find({
      isActive: true,
      endDate: { $lt: now },
    });

    for (const sub of expired) {
      if (sub.autoRenew && sub.paymentStatus === 'completed') {
        // Auto-renew
        await renewSubscription(sub._id);
      } else {
        // Deactivate
        sub.isActive = false;
        sub.tier = 'free';
        await sub.save();
        logger.info(`Subscription expired and deactivated for ${sub.userEmail}`);
      }
    }

    // Send expiry warnings (14 days, 7 days, 3 days, 1 day)
    const warningDays = [14, 7, 3, 1];
    for (const days of warningDays) {
      const warningDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const upcomingExpiry = await MatrimonialSubscription.find({
        isActive: true,
        endDate: {
          $gte: new Date(warningDate.getTime() - 1000),
          $lt: new Date(warningDate.getTime() + 1000),
        },
      });

      for (const sub of upcomingExpiry) {
        const alreadyWarned = sub.expiryWarningsSent?.some((w) => w.daysRemaining === days);
        if (!alreadyWarned) {
          sub.expiryWarningsSent.push({
            sentAt: now,
            daysRemaining: days,
            method: 'email',
          });
          await sub.save();
          logger.info(`Expiry warning sent to ${sub.userEmail} (${days} days remaining)`);
        }
      }
    }
  } catch (error) {
    logger.error(`Error handling subscription expiry: ${error.message}`);
  }
};

/**
 * Renew subscription
 */
const renewSubscription = async (subscriptionId) => {
  try {
    const subscription = await MatrimonialSubscription.findById(subscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const now = new Date();
    const durationMs = subscription.endDate.getTime() - subscription.startDate.getTime();

    subscription.startDate = now;
    subscription.endDate = new Date(now.getTime() + durationMs);
    subscription.nextRenewalDate = subscription.endDate;
    subscription.renewalAttempts = 0;
    subscription.lastRenewalAttempt = now;
    subscription.isActive = true;

    await subscription.save();
    logger.info(`Subscription renewed for ${subscription.userEmail}`);

    return subscription;
  } catch (error) {
    logger.error(`Error renewing subscription: ${error.message}`);
    throw error;
  }
};

/**
 * Process refund
 */
const processRefund = async (subscriptionId, amount, reason, adminEmail) => {
  try {
    const subscription = await MatrimonialSubscription.findById(subscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.refundDetails = {
      refundedAt: new Date(),
      refundReason: reason,
      refundAmount: amount,
      refundStatus: 'pending',
      refundedBy: adminEmail,
    };

    subscription.paymentStatus = 'refunded';
    subscription.isActive = false;
    subscription.tier = 'free';

    await subscription.save();
    logger.info(`Refund processed for ${subscription.userEmail}: ${amount}`);

    return subscription;
  } catch (error) {
    logger.error(`Error processing refund: ${error.message}`);
    throw error;
  }
};

/**
 * Get user's current subscription
 */
const getUserSubscription = async (userEmail) => {
  try {
    const subscription = await MatrimonialSubscription.findOne({ userEmail })
      .sort('-createdAt')
      .lean();

    return subscription;
  } catch (error) {
    logger.error(`Error fetching user subscription: ${error.message}`);
    return null;
  }
};

module.exports = {
  createSubscription,
  hasEntitlement,
  consumeEntitlement,
  handleSubscriptionExpiry,
  renewSubscription,
  processRefund,
  getUserSubscription,
  SUBSCRIPTION_TIERS,
};
