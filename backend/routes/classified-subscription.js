/**
 * Classified Subscription & Contact Access Routes
 * Handles subscription management, payment processing, and contact unlocking
 */

const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const ClassifiedSubscription = require('../models/ClassifiedSubscription');
const ClassifiedAd = require('../models/ClassifiedAd');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

// Rate limiters
const subscriptionCreateLimiter = createModerateRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 10 requests per hour
});

const subscriptionQueryLimiter = createModerateRateLimiter({
  maxRequests: 100,
  windowMs: 60 * 60 * 1000, // 100 requests per hour
});

const contactUnlockLimiter = createModerateRateLimiter({
  maxRequests: 50,
  windowMs: 60 * 60 * 1000, // 50 unlocks per hour
});

const paymentCreateLimiter = createModerateRateLimiter({
  maxRequests: 15,
  windowMs: 60 * 60 * 1000, // 15 payment creations per hour
});

const paymentVerifyLimiter = createModerateRateLimiter({
  maxRequests: 25,
  windowMs: 60 * 60 * 1000, // 25 payment verifications per hour
});

// Utility functions
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const isAdminUser = (user) =>
  user?.role === 'admin' ||
  user?.registrationType === 'admin' ||
  (Array.isArray(user?.roles) && user.roles.includes('admin'));

const ensureAdmin = (req, res, next) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  return next();
};

const createOrderId = (prefix = 'order') =>
  `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

const createInvoiceNumber = () =>
  `CLSF-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const asPositiveNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const mapSubscriptionResponse = (subscription) => {
  if (!subscription) {
    return null;
  }

  const model = typeof subscription.toObject === 'function' ? subscription.toObject() : subscription;

  return {
    subscriptionId: String(model._id),
    userId: model.userId ? String(model.userId) : '',
    userEmail: model.userEmail || '',
    userName: model.userName || '',
    tier: model.tier || 'free',
    billingCycle: model.billingCycle || 'monthly',
    startDate: model.startDate || null,
    endDate: model.endDate || null,
    nextRenewalDate: model.nextRenewalDate || null,
    isActive: Boolean(model.isActive),
    autoRenew: Boolean(model.autoRenew),
    paymentMethod: model.paymentMethod || '',
    transactionId: model.transactionId || '',
    amount: asPositiveNumber(model.amount),
    currency: model.currency || 'INR',
    paymentStatus: model.paymentStatus || 'pending',
    contactUnlocksUsed: asPositiveNumber(model.contactUnlocksUsed),
    contactUnlocksLimit: asPositiveNumber(model.contactUnlocksLimit),
    remainingUnlocks: model.remainingUnlocks || 0,
    entitlements: model.entitlements || {},
    cancelledAt: model.cancelledAt || null,
    cancellationReason: model.cancellationReason || '',
    refundDetails: model.refundDetails || null,
    isTrialPeriod: Boolean(model.isTrialPeriod),
    trialEndsAt: model.trialEndsAt || null,
    promoCode: model.promoCode || '',
    discountApplied: asPositiveNumber(model.discountApplied),
    daysRemaining: model.daysRemaining || 0,
    isExpired: Boolean(model.isExpired),
    canUseFeatures: Boolean(model.canUseFeatures),
    paymentHistory: Array.isArray(model.paymentHistory) ? model.paymentHistory : [],
    createdAt: model.createdAt || null,
    updatedAt: model.updatedAt || null,
  };
};

/**
 * POST /api/classifieds/subscription/create
 * Create or upgrade subscription
 */
router.post('/subscription/create', authenticate, subscriptionCreateLimiter, async (req, res) => {
  try {
    const tier = String(req.body?.tier || '').trim().toLowerCase();
    const billingCycle = String(req.body?.billingCycle || 'monthly').trim().toLowerCase();
    const userEmail = normalizeEmail(req.user?.email);
    const userId = req.user?._id || req.user?.id;

    if (!userEmail || !userId || !tier) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!['free', 'basic', 'pro', 'business'].includes(tier)) {
      return res.status(400).json({ success: false, message: 'Invalid subscription tier' });
    }

    if (!['monthly', 'quarterly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({ success: false, message: 'Invalid billing cycle' });
    }

    // Check for existing active subscription
    const existingSubscription = await ClassifiedSubscription.findOne({
      userId,
      isActive: true,
    }).sort('-createdAt');

    if (existingSubscription && existingSubscription.tier === tier) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription for this tier',
        data: mapSubscriptionResponse(existingSubscription),
      });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = ClassifiedSubscription.calculateEndDate(startDate, billingCycle);
    const pricing = ClassifiedSubscription.getTierPricing(tier, billingCycle);
    const tierLimits = ClassifiedSubscription.getTierLimits(tier);

    // Create subscription
    const subscription = new ClassifiedSubscription({
      userId,
      userEmail,
      userName: req.user?.name || '',
      tier,
      billingCycle,
      startDate,
      endDate,
      nextRenewalDate: endDate,
      amount: pricing,
      currency: 'INR',
      entitlements: tierLimits,
      contactUnlocksLimit: tierLimits.contactUnlocksLimit,
      source: 'web',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
    });

    // Handle free tier
    if (tier === 'free') {
      subscription.isActive = true;
      subscription.paymentStatus = 'completed';
      subscription.paymentMethod = 'free';
      subscription.amount = 0;
      subscription.paymentHistory.push({
        gateway: 'free',
        orderId: createOrderId('free'),
        paymentId: createOrderId('free'),
        status: 'completed',
        amount: 0,
        currency: 'INR',
        invoiceNumber: createInvoiceNumber(),
        createdAt: new Date(),
        verifiedAt: new Date(),
      });
    } else {
      subscription.isActive = false;
      subscription.paymentStatus = 'pending';
    }

    await subscription.save();

    // Deactivate old subscription if upgrading
    if (existingSubscription && tier !== 'free') {
      existingSubscription.isActive = false;
      existingSubscription.autoRenew = false;
      existingSubscription.notes = `Upgraded to ${tier} on ${new Date().toISOString()}`;
      await existingSubscription.save();
    }

    logger.info(`Classified subscription created: ${subscription._id} for user ${userEmail}, tier: ${tier}`);

    return res.json({
      success: true,
      message: `${tier} subscription created`,
      data: mapSubscriptionResponse(subscription),
      paymentRequired: tier !== 'free',
    });
  } catch (error) {
    logger.error(`Error creating classified subscription: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/classifieds/subscription/current
 * Get current active subscription
 */
router.get('/subscription/current', authenticate, subscriptionQueryLimiter, async (req, res) => {
  try {
    const userEmail = normalizeEmail(req.user?.email);
    const userId = req.user?._id || req.user?.id;

    const subscription = await ClassifiedSubscription.findOne({
      $or: [{ userId }, { userEmail }],
      isActive: true,
    }).sort('-createdAt');

    if (!subscription) {
      // Return free tier as default
      const freeTierLimits = ClassifiedSubscription.getTierLimits('free');
      return res.json({
        success: true,
        data: {
          subscriptionId: '',
          tier: 'free',
          isActive: true,
          entitlements: freeTierLimits,
          contactUnlocksUsed: 0,
          contactUnlocksLimit: 0,
          remainingUnlocks: 0,
          paymentHistory: [],
          daysRemaining: 365,
          isExpired: false,
          canUseFeatures: true,
        },
      });
    }

    const mapped = mapSubscriptionResponse(subscription);

    return res.json({
      success: true,
      data: mapped,
    });
  } catch (error) {
    logger.error(`Error fetching classified subscription: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/classifieds/subscription/check-access
 * Check if user can access contact information
 */
router.post('/subscription/check-access', authenticate, subscriptionQueryLimiter, async (req, res) => {
  try {
    const adId = String(req.body?.adId || '').trim();
    const userEmail = normalizeEmail(req.user?.email);
    const userId = req.user?._id || req.user?.id;

    if (!adId) {
      return res.status(400).json({ success: false, message: 'Ad ID is required' });
    }

    // Fetch ad
    const ad = await ClassifiedAd.findById(adId);
    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    // Check if user is ad owner
    const isOwner = normalizeEmail(ad.sellerEmail) === userEmail;
    if (isOwner) {
      return res.json({
        success: true,
        hasAccess: true,
        reason: 'owner',
        message: 'You are the ad owner',
      });
    }

    // Check contact visibility setting
    if (ad.contactVisibility === 'public') {
      return res.json({
        success: true,
        hasAccess: true,
        reason: 'public',
        message: 'Contact details are public',
      });
    }

    if (ad.contactVisibility === 'hidden') {
      return res.json({
        success: true,
        hasAccess: false,
        reason: 'hidden',
        message: 'Contact details are hidden by seller',
      });
    }

    // Get user's subscription
    const subscription = await ClassifiedSubscription.findOne({
      $or: [{ userId }, { userEmail }],
      isActive: true,
    }).sort('-createdAt');

    if (!subscription || subscription.tier === 'free') {
      return res.json({
        success: true,
        hasAccess: false,
        reason: 'subscription_required',
        message: 'Subscribe to view contact details',
        upgradeUrl: '/classifieds/subscription/plans',
      });
    }

    // Check if already unlocked
    if (subscription.isAdUnlocked(adId)) {
      return res.json({
        success: true,
        hasAccess: true,
        reason: 'already_unlocked',
        message: 'Contact already unlocked',
      });
    }

    // Check if can unlock
    if (subscription.canUnlockContact()) {
      return res.json({
        success: true,
        hasAccess: true,
        reason: 'can_unlock',
        message: 'Can unlock contact details',
        remainingUnlocks: subscription.remainingUnlocks,
      });
    }

    // Limit reached
    return res.json({
      success: true,
      hasAccess: false,
      reason: 'limit_reached',
      message: 'Contact unlock limit reached. Upgrade to Pro for unlimited access.',
      upgradeUrl: '/classifieds/subscription/plans',
    });
  } catch (error) {
    logger.error(`Error checking contact access: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/classifieds/subscription/unlock-contact/:adId
 * Unlock contact information for an ad
 */
router.post('/subscription/unlock-contact/:adId', authenticate, contactUnlockLimiter, async (req, res) => {
  try {
    const adId = String(req.params?.adId || '').trim();
    const userEmail = normalizeEmail(req.user?.email);
    const userId = req.user?._id || req.user?.id;

    if (!adId || !mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ success: false, message: 'Invalid Ad ID' });
    }

    // Fetch ad
    const ad = await ClassifiedAd.findById(adId);
    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    // Check if user is ad owner
    const isOwner = normalizeEmail(ad.sellerEmail) === userEmail;
    if (isOwner) {
      return res.json({
        success: true,
        message: 'You are the ad owner',
        contactDetails: {
          phone: ad.contactPhone || '',
          email: ad.contactEmail || ad.sellerEmail || '',
          whatsapp: ad.contactWhatsApp || ad.contactPhone || '',
        },
        reason: 'owner',
      });
    }

    // Check contact visibility
    if (ad.contactVisibility === 'hidden') {
      return res.status(403).json({
        success: false,
        message: 'Contact details are hidden by seller',
      });
    }

    if (ad.contactVisibility === 'public') {
      return res.json({
        success: true,
        message: 'Contact details are public',
        contactDetails: {
          phone: ad.contactPhone || '',
          email: ad.contactEmail || ad.sellerEmail || '',
          whatsapp: ad.contactWhatsApp || ad.contactPhone || '',
        },
        reason: 'public',
      });
    }

    // Get user's subscription
    const subscription = await ClassifiedSubscription.findOne({
      $or: [{ userId }, { userEmail }],
      isActive: true,
    }).sort('-createdAt');

    if (!subscription || subscription.tier === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required to unlock contact details',
        upgradeUrl: '/classifieds/subscription/plans',
      });
    }

    // Check if already unlocked
    if (subscription.isAdUnlocked(adId)) {
      const contactDetails = subscription.getUnlockedContactDetails(adId);
      return res.json({
        success: true,
        message: 'Contact already unlocked',
        contactDetails: contactDetails || {
          phone: ad.contactPhone || '',
          email: ad.contactEmail || ad.sellerEmail || '',
          whatsapp: ad.contactWhatsApp || ad.contactPhone || '',
        },
        alreadyUnlocked: true,
      });
    }

    // Unlock contact
    const contactDetails = {
      phone: ad.contactPhone || '',
      email: ad.contactEmail || ad.sellerEmail || '',
      whatsapp: ad.contactWhatsApp || ad.contactPhone || '',
    };

    const unlockResult = await subscription.unlockContact(
      adId,
      ad.title || '',
      ad.category || '',
      ad.sellerEmail || '',
      contactDetails
    );

    // Update ad's unlock counter and record
    ad.contactUnlocks = (ad.contactUnlocks || 0) + 1;
    if (!ad.unlockedByUsers) {
      ad.unlockedByUsers = [];
    }
    ad.unlockedByUsers.push({
      userId: String(userId),
      userEmail,
      unlockedAt: new Date(),
    });
    await ad.save();

    logger.info(`Contact unlocked: Ad ${adId} by user ${userEmail}`);

    return res.json({
      success: true,
      message: 'Contact details unlocked successfully',
      contactDetails,
      remainingUnlocks: subscription.remainingUnlocks,
      alreadyUnlocked: unlockResult.alreadyUnlocked,
    });
  } catch (error) {
    logger.error(`Error unlocking contact: ${error.message}`);
    
    if (error.message.includes('limit reached')) {
      return res.status(403).json({
        success: false,
        message: error.message,
        upgradeUrl: '/classifieds/subscription/plans',
      });
    }
    
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/classifieds/subscription/usage
 * Get subscription usage statistics
 */
router.get('/subscription/usage', authenticate, subscriptionQueryLimiter, async (req, res) => {
  try {
    const userEmail = normalizeEmail(req.user?.email);
    const userId = req.user?._id || req.user?.id;

    const subscription = await ClassifiedSubscription.findOne({
      $or: [{ userId }, { userEmail }],
      isActive: true,
    }).sort('-createdAt');

    if (!subscription) {
      return res.json({
        success: true,
        data: {
          tier: 'free',
          contactUnlocksUsed: 0,
          contactUnlocksLimit: 0,
          remainingUnlocks: 0,
          unlockedAds: [],
          usageHistory: [],
        },
      });
    }

    return res.json({
      success: true,
      data: {
        tier: subscription.tier,
        contactUnlocksUsed: subscription.contactUnlocksUsed,
        contactUnlocksLimit: subscription.contactUnlocksLimit,
        remainingUnlocks: subscription.remainingUnlocks,
        unlockedAds: subscription.unlockedAds || [],
        usageHistory: subscription.usageHistory || [],
        entitlements: subscription.entitlements || {},
      },
    });
  } catch (error) {
    logger.error(`Error fetching subscription usage: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/classifieds/subscription/plans
 * Get available subscription plans with pricing
 */
router.get('/subscription/plans', subscriptionQueryLimiter, async (req, res) => {
  try {
    const plans = ['free', 'basic', 'pro', 'business'].map((tier) => {
      const limits = ClassifiedSubscription.getTierLimits(tier);
      const pricing = {
        monthly: ClassifiedSubscription.getTierPricing(tier, 'monthly'),
        quarterly: ClassifiedSubscription.getTierPricing(tier, 'quarterly'),
        yearly: ClassifiedSubscription.getTierPricing(tier, 'yearly'),
      };

      return {
        tier,
        pricing,
        features: limits,
        recommended: tier === 'pro',
      };
    });

    return res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    logger.error(`Error fetching subscription plans: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/classifieds/subscription/history
 * Get subscription history
 */
router.get('/subscription/history', authenticate, subscriptionQueryLimiter, async (req, res) => {
  try {
    const userEmail = normalizeEmail(req.user?.email);
    const userId = req.user?._id || req.user?.id;

    const subscriptions = await ClassifiedSubscription.find({
      $or: [{ userId }, { userEmail }],
    })
      .sort('-createdAt')
      .limit(50);

    const history = subscriptions.map((sub) => mapSubscriptionResponse(sub));

    return res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error(`Error fetching subscription history: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/classifieds/subscription/:subscriptionId/cancel
 * Cancel subscription
 */
router.patch('/subscription/:subscriptionId/cancel', authenticate, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;
    const userEmail = normalizeEmail(req.user?.email);

    const subscription = await ClassifiedSubscription.findOneAndUpdate(
      {
        _id: subscriptionId,
        userEmail,
      },
      {
        isActive: false,
        autoRenew: false,
        cancelledAt: new Date(),
        cancellationReason: reason || 'User requested cancellation',
        cancelledBy: 'user',
      },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    logger.info(`Subscription cancelled: ${subscriptionId} by user ${userEmail}`);

    return res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: mapSubscriptionResponse(subscription),
    });
  } catch (error) {
    logger.error(`Error cancelling subscription: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/classifieds/subscription/:subscriptionId/toggle-auto-renew
 * Toggle auto-renewal
 */
router.patch('/subscription/:subscriptionId/toggle-auto-renew', authenticate, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userEmail = normalizeEmail(req.user?.email);

    const subscription = await ClassifiedSubscription.findOne({
      _id: subscriptionId,
      userEmail,
    });

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    subscription.autoRenew = !subscription.autoRenew;
    await subscription.save();

    logger.info(`Auto-renew toggled: ${subscriptionId}, now ${subscription.autoRenew}`);

    return res.json({
      success: true,
      message: `Auto-renewal ${subscription.autoRenew ? 'enabled' : 'disabled'}`,
      data: mapSubscriptionResponse(subscription),
    });
  } catch (error) {
    logger.error(`Error toggling auto-renew: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Payment routes - Razorpay Integration
 */

/**
 * POST /api/classifieds/subscription/payments/razorpay/create
 * Create Razorpay payment order
 */
router.post(
  '/subscription/payments/razorpay/create',
  authenticate,
  paymentCreateLimiter,
  async (req, res) => {
    try {
      const paymentService = require('../services/paymentService');
      const subscriptionTier = String(req.body?.tier || '').trim().toLowerCase();
      const billingCycle = String(req.body?.billingCycle || 'monthly').trim().toLowerCase();
      const userEmail = normalizeEmail(req.user?.email);
      const userId = req.user?._id || req.user?.id;

      if (!userEmail || !userId || !subscriptionTier) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      if (!['basic', 'pro', 'business'].includes(subscriptionTier)) {
        return res.status(400).json({ success: false, message: 'Invalid subscription tier for payment' });
      }

      if (!['monthly', 'quarterly', 'yearly'].includes(billingCycle)) {
        return res.status(400).json({ success: false, message: 'Invalid billing cycle' });
      }

      if (!paymentService.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Payment service not configured. Please contact support.',
        });
      }

      // Calculate pricing
      const price = ClassifiedSubscription.getTierPricing(subscriptionTier, billingCycle);
      
      if (price === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pricing for selected tier and cycle',
        });
      }

      // Check for existing pending subscription
      let subscription = await ClassifiedSubscription.findOne({
        userId,
        tier: subscriptionTier,
        isActive: false,
        paymentStatus: { $in: ['pending', 'failed'] },
      }).sort('-createdAt');

      // Create new subscription if none exists
      if (!subscription) {
        const startDate = new Date();
        const endDate = ClassifiedSubscription.calculateEndDate(startDate, billingCycle);
        const tierLimits = ClassifiedSubscription.getTierLimits(subscriptionTier);

        subscription = new ClassifiedSubscription({
          userId,
          userEmail,
          userName: req.user?.name || '',
          tier: subscriptionTier,
          billingCycle,
          startDate,
          endDate,
          nextRenewalDate: endDate,
          amount: price,
          currency: 'INR',
          entitlements: tierLimits,
          contactUnlocksLimit: tierLimits.contactUnlocksLimit,
          source: 'web',
          ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
          userAgent: req.headers['user-agent'] || '',
        });
      }

      // Generate Razorpay order
      const razorpayOrderId = createOrderId('order');
      const invoiceNumber = createInvoiceNumber();

      subscription.isActive = false;
      subscription.paymentStatus = 'pending';
      subscription.paymentMethod = 'razorpay';
      subscription.amount = price;
      subscription.transactionId = razorpayOrderId;
      subscription.lastPaymentAttemptAt = new Date();
      subscription.lastPaymentError = '';

      subscription.paymentHistory = Array.isArray(subscription.paymentHistory)
        ? subscription.paymentHistory
        : [];

      subscription.paymentHistory.push({
        gateway: 'razorpay',
        orderId: razorpayOrderId,
        paymentId: '',
        status: 'pending',
        amount: price,
        currency: 'INR',
        invoiceNumber,
        invoiceUrl: '',
        createdAt: new Date(),
      });

      await subscription.save();

      logger.info(`Razorpay order created for classifieds: ${razorpayOrderId}, user: ${userEmail}, tier: ${subscriptionTier}`);

      return res.json({
        success: true,
        subscriptionId: String(subscription._id),
        razorpayOrderId,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
        amount: Math.round(price * 100), // Convert to paise
        currency: 'INR',
        tier: subscriptionTier,
        billingCycle,
      });
    } catch (error) {
      logger.error(`Error creating Razorpay order for classifieds: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * POST /api/classifieds/subscription/payments/razorpay/verify
 * Verify Razorpay payment and activate subscription
 */
router.post(
  '/subscription/payments/razorpay/verify',
  authenticate,
  paymentVerifyLimiter,
  async (req, res) => {
    try {
      const paymentService = require('../services/paymentService');
      const {
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
      } = req.body || {};
      const userEmail = normalizeEmail(req.user?.email);

      if (!paymentId || !orderId || !signature || !userEmail) {
        return res.status(400).json({ success: false, message: 'Missing verification fields' });
      }

      // Verify signature
      const isValid = paymentService.verifyPaymentSignature(orderId, paymentId, signature);

      if (!isValid) {
        logger.warn(`Classified payment verification failed: ${paymentId}`);
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed. Invalid signature.',
        });
      }

      // Fetch payment details from Razorpay
      const payment = await paymentService.fetchPayment(paymentId);

      if (payment.status !== 'captured' && payment.status !== 'authorized') {
        return res.status(400).json({
          success: false,
          message: `Payment not successful. Status: ${payment.status}`,
        });
      }

      // Find subscription
      const subscription = await ClassifiedSubscription.findOne({
        userEmail,
        transactionId: orderId,
      }).sort('-createdAt');

      if (!subscription) {
        return res.status(404).json({ success: false, message: 'Pending subscription not found' });
      }

      // Update payment history
      subscription.paymentHistory = Array.isArray(subscription.paymentHistory)
        ? subscription.paymentHistory
        : [];

      const historyIndex = subscription.paymentHistory.findIndex(
        (entry) => entry.orderId === orderId
      );

      // Activate subscription
      subscription.paymentStatus = 'completed';
      subscription.isActive = true;
      subscription.paymentMethod = 'razorpay';
      subscription.transactionId = paymentId;
      subscription.lastPaymentError = '';

      if (historyIndex >= 0) {
        subscription.paymentHistory[historyIndex].status = 'completed';
        subscription.paymentHistory[historyIndex].paymentId = paymentId;
        subscription.paymentHistory[historyIndex].verifiedAt = new Date();
        subscription.paymentHistory[historyIndex].gateway = payment.method || 'razorpay';
      }

      // Deactivate any old active subscriptions
      await ClassifiedSubscription.updateMany(
        {
          userId: subscription.userId,
          _id: { $ne: subscription._id },
          isActive: true,
        },
        {
          isActive: false,
          autoRenew: false,
          notes: `Replaced by new subscription ${subscription._id} on ${new Date().toISOString()}`,
        }
      );

      await subscription.save();

      // Generate invoice
      const invoice = await paymentService.generateInvoice(
        subscription,
        subscription.paymentHistory[historyIndex]
      );

      logger.info(`Classified payment verified and subscription activated: ${subscription._id}`);

      return res.json({
        success: true,
        message: 'Payment verified and subscription activated',
        data: mapSubscriptionResponse(subscription),
        invoice,
      });
    } catch (error) {
      logger.error(`Error verifying Razorpay payment for classifieds: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * POST /api/classifieds/subscription/payments/upi/create
 * Create UPI payment intent
 */
router.post(
  '/subscription/payments/upi/create',
  authenticate,
  paymentCreateLimiter,
  async (req, res) => {
    try {
      const subscriptionTier = String(req.body?.tier || '').trim().toLowerCase();
      const billingCycle = String(req.body?.billingCycle || 'monthly').trim().toLowerCase();
      const userEmail = normalizeEmail(req.user?.email);
      const userId = req.user?._id || req.user?.id;

      if (!userEmail || !userId || !subscriptionTier) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      if (!['basic', 'pro', 'business'].includes(subscriptionTier)) {
        return res.status(400).json({ success: false, message: 'Invalid subscription tier for payment' });
      }

      const price = ClassifiedSubscription.getTierPricing(subscriptionTier, billingCycle);

      if (price === 0) {
        return res.status(400).json({ success: false, message: 'Invalid pricing' });
      }

      const startDate = new Date();
      const endDate = ClassifiedSubscription.calculateEndDate(startDate, billingCycle);
      const tierLimits = ClassifiedSubscription.getTierLimits(subscriptionTier);
      const transactionId = createOrderId('upi');

      const subscription = new ClassifiedSubscription({
        userId,
        userEmail,
        userName: req.user?.name || '',
        tier: subscriptionTier,
        billingCycle,
        startDate,
        endDate,
        nextRenewalDate: endDate,
        isActive: false,
        paymentStatus: 'pending',
        paymentMethod: 'upi',
        transactionId,
        amount: price,
        currency: 'INR',
        entitlements: tierLimits,
        contactUnlocksLimit: tierLimits.contactUnlocksLimit,
        source: 'web',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
        userAgent: req.headers['user-agent'] || '',
      });

      subscription.paymentHistory.push({
        gateway: 'upi',
        orderId: transactionId,
        status: 'pending',
        amount: price,
        currency: 'INR',
        invoiceNumber: createInvoiceNumber(),
        createdAt: new Date(),
      });

      await subscription.save();

      logger.info(`UPI payment created for classifieds: ${transactionId}, user: ${userEmail}`);

      return res.json({
        success: true,
        subscriptionId: String(subscription._id),
        transactionId,
        amount: price,
        currency: 'INR',
        status: 'pending',
        upiIntentUrl: '', // To be implemented with actual UPI integration
        message: 'UPI intent created. Complete payment in your UPI app.',
      });
    } catch (error) {
      logger.error(`Error creating UPI payment for classifieds: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/classifieds/subscription/payments/upi/status
 * Check UPI payment status
 */
router.get(
  '/subscription/payments/upi/status',
  authenticate,
  paymentVerifyLimiter,
  async (req, res) => {
    try {
      const transactionId = String(req.query?.transactionId || '').trim();
      const userEmail = normalizeEmail(req.user?.email);

      if (!transactionId || !userEmail) {
        return res.status(400).json({ success: false, message: 'Transaction ID is required' });
      }

      const subscription = await ClassifiedSubscription.findOne({
        userEmail,
        paymentMethod: 'upi',
        transactionId,
      }).sort('-createdAt');

      if (!subscription) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      const historyEntry = (subscription.paymentHistory || []).find(
        (entry) => entry.orderId === transactionId
      );

      const status = historyEntry?.status || subscription.paymentStatus || 'pending';

      return res.json({
        success: true,
        transactionId,
        status,
        subscriptionId: String(subscription._id),
        tier: subscription.tier,
        isActive: subscription.isActive,
      });
    } catch (error) {
      logger.error(`Error checking UPI status for classifieds: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * GET /api/classifieds/subscription/payments/history
 * Get payment history
 */
router.get('/subscription/payments/history', authenticate, subscriptionQueryLimiter, async (req, res) => {
  try {
    const userEmail = normalizeEmail(req.user?.email);
    const userId = req.user?._id || req.user?.id;

    const subscriptions = await ClassifiedSubscription.find({
      $or: [{ userId }, { userEmail }],
    })
      .sort('-createdAt')
      .limit(50);

    const history = [];
    subscriptions.forEach((sub) => {
      if (sub.paymentHistory && sub.paymentHistory.length > 0) {
        sub.paymentHistory.forEach((payment) => {
          history.push({
            subscriptionId: String(sub._id),
            tier: sub.tier,
            billingCycle: sub.billingCycle,
            gateway: payment.gateway,
            orderId: payment.orderId,
            paymentId: payment.paymentId,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            invoiceNumber: payment.invoiceNumber,
            invoiceUrl: payment.invoiceUrl,
            createdAt: payment.createdAt,
            verifiedAt: payment.verifiedAt,
          });
        });
      }
    });

    return res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error(`Error fetching payment history: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/classifieds/subscription/payments/retry
 * Retry failed payment
 */
router.post('/subscription/payments/retry', authenticate, paymentCreateLimiter, async (req, res) => {
  try {
    const subscriptionId = String(req.body?.subscriptionId || '').trim();
    const userEmail = normalizeEmail(req.user?.email);

    if (!subscriptionId || !userEmail) {
      return res.status(400).json({ success: false, message: 'Subscription ID is required' });
    }

    const subscription = await ClassifiedSubscription.findOne({
      _id: subscriptionId,
      userEmail,
    });

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (subscription.paymentStatus === 'completed') {
      return res.status(400).json({ success: false, message: 'Subscription already paid' });
    }

    const retryOrderId = createOrderId('retry');
    subscription.paymentStatus = 'pending';
    subscription.isActive = false;
    subscription.transactionId = retryOrderId;
    subscription.lastPaymentAttemptAt = new Date();

    subscription.paymentHistory.push({
      gateway: subscription.paymentMethod || 'razorpay',
      orderId: retryOrderId,
      status: 'retry_created',
      amount: subscription.amount,
      currency: subscription.currency || 'INR',
      retryOf: subscription.transactionId || '',
      invoiceNumber: createInvoiceNumber(),
      createdAt: new Date(),
    });

    await subscription.save();

    logger.info(`Payment retry created for classifieds: ${retryOrderId}`);

    return res.json({
      success: true,
      message: 'Retry payment order created',
      data: {
        subscriptionId: String(subscription._id),
        transactionId: retryOrderId,
        amount: subscription.amount,
        currency: subscription.currency,
      },
    });
  } catch (error) {
    logger.error(`Error retrying payment: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/classifieds/subscription/payments/:paymentId/invoice
 * Get invoice for a payment
 */
router.get('/subscription/payments/:paymentId/invoice', authenticate, async (req, res) => {
  try {
    const paymentId = String(req.params?.paymentId || '').trim();
    const userEmail = normalizeEmail(req.user?.email);

    if (!paymentId || !userEmail) {
      return res.status(400).json({ success: false, message: 'Payment ID is required' });
    }

    const subscriptions = await ClassifiedSubscription.find({ userEmail })
      .sort('-createdAt')
      .limit(50);

    let invoice = null;
    for (const subscription of subscriptions) {
      const entry = (subscription.paymentHistory || []).find(
        (item) => item.paymentId === paymentId || item.orderId === paymentId
      );

      if (entry) {
        invoice = {
          invoiceNumber: entry.invoiceNumber || createInvoiceNumber(),
          invoiceDate: entry.verifiedAt || entry.createdAt || subscription.createdAt,
          paymentId: entry.paymentId || '',
          orderId: entry.orderId || '',
          amount: entry.amount,
          currency: entry.currency || subscription.currency || 'INR',
          tier: subscription.tier,
          billingCycle: subscription.billingCycle,
          subscriptionId: String(subscription._id),
          status: entry.status || subscription.paymentStatus,
          downloadUrl: entry.invoiceUrl || '',
        };
        break;
      }
    }

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    return res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error(`Error fetching invoice: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Admin routes
 */

/**
 * GET /api/classifieds/subscription/admin/all
 * Get all subscriptions (admin only)
 */
router.get('/subscription/admin/all', authenticate, ensureAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query?.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query?.limit || '20', 10)));
    const tier = req.query?.tier;
    const isActive = req.query?.isActive;

    const filter = {};
    if (tier && ['free', 'basic', 'pro', 'business'].includes(tier)) {
      filter.tier = tier;
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const total = await ClassifiedSubscription.countDocuments(filter);
    const subscriptions = await ClassifiedSubscription.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    const data = subscriptions.map((sub) => mapSubscriptionResponse(sub));

    return res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(`Error fetching all subscriptions: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/classifieds/subscription/admin/:subscriptionId/refund
 * Process refund (admin only)
 */
router.patch('/subscription/admin/:subscriptionId/refund', authenticate, ensureAdmin, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const amount = asPositiveNumber(req.body?.amount, 0);
    const reason = String(req.body?.reason || '').trim();
    const adminEmail = normalizeEmail(req.user?.email);

    const subscription = await ClassifiedSubscription.findById(subscriptionId);

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (subscription.paymentStatus === 'refunded') {
      return res.status(400).json({ success: false, message: 'Subscription already refunded' });
    }

    // Update refund details
    subscription.refundDetails = {
      refundId: createOrderId('refund'),
      refundAmount: amount,
      refundReason: reason,
      refundedAt: new Date(),
      processedBy: adminEmail,
    };
    subscription.paymentStatus = 'refunded';
    subscription.isActive = false;
    subscription.autoRenew = false;

    // Update payment history
    if (subscription.paymentHistory.length > 0) {
      const lastPayment = subscription.paymentHistory[subscription.paymentHistory.length - 1];
      lastPayment.refundStatus = 'completed';
      lastPayment.refundId = subscription.refundDetails.refundId;
      lastPayment.refundAmount = amount;
      lastPayment.refundedAt = new Date();
    }

    await subscription.save();

    logger.info(`Refund processed: ${subscriptionId} by admin ${adminEmail}, amount: ${amount}`);

    return res.json({
      success: true,
      message: 'Refund processed successfully',
      data: mapSubscriptionResponse(subscription),
    });
  } catch (error) {
    logger.error(`Error processing refund: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
