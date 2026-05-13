/**
 * Matrimonial Subscription & Entitlement Routes
 */

const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const MatrimonialSubscription = require('../models/MatrimonialSubscription');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const { authenticate } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');
const subscriptionService = require('../utils/subscriptionService');
const logger = require('../utils/logger');

const paymentCreateLimiter = createModerateRateLimiter({
  maxRequests: 15,
  windowMs: 60 * 60 * 1000,
});

const paymentVerifyLimiter = createModerateRateLimiter({
  maxRequests: 25,
  windowMs: 60 * 60 * 1000,
});

const entitlementLimiter = createModerateRateLimiter({
  maxRequests: 120,
  windowMs: 60 * 60 * 1000,
});

const TIER_PRICING = {
  free: 0,
  gold: 499,
  premium: 999,
  vip: 2999,
};

const asPositiveNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

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

const createOrderId = (prefix = 'order') => `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
const createInvoiceNumber = () => `INV-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const amountToNumber = (value) => {
  if (typeof value === 'number') {
    return value;
  }
  if (value && typeof value.toString === 'function') {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const mapSubscriptionResponse = (subscription) => {
  if (!subscription) {
    return null;
  }

  const model = typeof subscription.toObject === 'function' ? subscription.toObject() : subscription;
  const paymentHistory = Array.isArray(model.paymentHistory)
    ? model.paymentHistory.map((entry) => ({
        gateway: entry.gateway || '',
        orderId: entry.orderId || '',
        paymentId: entry.paymentId || '',
        status: entry.status || '',
        amount: asPositiveNumber(entry.amount),
        currency: entry.currency || 'INR',
        invoiceNumber: entry.invoiceNumber || '',
        invoiceUrl: entry.invoiceUrl || '',
        createdAt: entry.createdAt || null,
        verifiedAt: entry.verifiedAt || null,
        failureReason: entry.failureReason || '',
        retryOf: entry.retryOf || '',
        refundStatus: entry.refundStatus || '',
        refundId: entry.refundId || '',
      }))
    : [];

  return {
    subscriptionId: String(model._id),
    profileId: model.profileId ? String(model.profileId) : '',
    tier: model.tier,
    billingCycle: model.billingCycle,
    startDate: model.startDate,
    endDate: model.endDate,
    nextRenewalDate: model.nextRenewalDate,
    isActive: Boolean(model.isActive),
    autoRenew: Boolean(model.autoRenew),
    paymentMethod: model.paymentMethod || '',
    transactionId: model.transactionId || '',
    amount: amountToNumber(model.amount),
    currency: model.currency || 'INR',
    paymentStatus: model.paymentStatus || 'pending',
    entitlements: model.entitlements || {},
    cancelledAt: model.cancelledAt || null,
    cancellationReason: model.cancellationReason || '',
    refundDetails: model.refundDetails || null,
    paymentHistory,
    createdAt: model.createdAt || null,
    updatedAt: model.updatedAt || null,
    refundEligible: Boolean(model.paymentStatus === 'completed' && !model.refundDetails?.refundedAt),
  };
};

const resolveProfileId = async (req, explicitProfileId = '') => {
  if (explicitProfileId && mongoose.Types.ObjectId.isValid(explicitProfileId)) {
    return explicitProfileId;
  }

  const userId = req.user?._id || req.user?.id;
  const email = String(req.user?.email || '').trim().toLowerCase();
  const filters = [];

  if (userId) {
    filters.push({ userId });
  }

  if (email) {
    filters.push({ email });
  }

  if (!filters.length) {
    return '';
  }

  const profile = await MatrimonialProfile.findOne({ $or: filters }).select('_id');
  return profile?._id ? String(profile._id) : '';
};

/**
 * POST /api/matrimonial/subscription/create
 * Create/upgrade subscription request
 */
router.post('/subscription/create', authenticate, paymentCreateLimiter, async (req, res) => {
  try {
    const tier = String(req.body?.tier || '').trim().toLowerCase();
    const billingCycle = String(req.body?.billingCycle || 'monthly').trim().toLowerCase();
    const userEmail = req.user?.email;

    if (!userEmail || !tier) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!subscriptionService.SUBSCRIPTION_TIERS?.[tier]) {
      return res.status(400).json({ success: false, message: 'Unsupported subscription tier' });
    }

    const profileId = await resolveProfileId(req, req.body?.profileId);
    if (!profileId) {
      return res.status(400).json({
        success: false,
        message: 'Complete your matrimonial profile before creating subscription',
      });
    }

    const subscription = await subscriptionService.createSubscription(
      profileId,
      userEmail,
      tier,
      billingCycle
    );

    if (tier === 'free') {
      subscription.isActive = true;
      subscription.paymentStatus = 'completed';
      subscription.paymentMethod = 'free';
      subscription.amount = 0;
      await subscription.save();
    } else {
      subscription.isActive = false;
      subscription.paymentStatus = 'pending';
      subscription.amount = asPositiveNumber(req.body?.amount, TIER_PRICING[tier] || 0);
      await subscription.save();
    }

    return res.json({
      success: true,
      message: `${tier} subscription created`,
      data: mapSubscriptionResponse(subscription),
      paymentRequired: tier !== 'free',
    });
  } catch (error) {
    logger.error(`Error creating subscription: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/matrimonial/subscription/current
 * Get current subscription details
 */
router.get('/subscription/current', authenticate, async (req, res) => {
  try {
    const userEmail = req.user?.email;

    const subscription = await subscriptionService.getUserSubscription(userEmail);

    if (!subscription) {
      return res.json({
        success: true,
        data: {
          subscriptionId: '',
          tier: 'free',
          isActive: true,
          entitlements: subscriptionService.SUBSCRIPTION_TIERS.free,
          paymentHistory: [],
        },
      });
    }

    const now = new Date();
    const isExpired = subscription.endDate && now > new Date(subscription.endDate);
    const mapped = mapSubscriptionResponse(subscription);

    return res.json({
      success: true,
      data: {
        ...mapped,
        isActive: Boolean(mapped.isActive && !isExpired),
        daysRemaining: subscription.endDate
          ? Math.max(0, Math.ceil((new Date(subscription.endDate) - now) / (1000 * 60 * 60 * 24)))
          : 0,
      },
    });
  } catch (error) {
    logger.error(`Error fetching subscription: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/matrimonial/subscription/check-entitlement
 */
router.post('/subscription/check-entitlement', authenticate, entitlementLimiter, async (req, res) => {
  try {
    const entitlement = String(req.body?.entitlement || '').trim();
    const userEmail = req.user?.email;
    if (!userEmail || !entitlement) {
      return res.status(400).json({ success: false, message: 'Entitlement is required' });
    }

    const hasAccess = await subscriptionService.hasEntitlement(userEmail, entitlement);

    return res.json({
      success: true,
      hasAccess,
      entitlement,
    });
  } catch (error) {
    logger.error(`Error checking entitlement: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/matrimonial/subscription/consume
 */
router.post('/subscription/consume', authenticate, entitlementLimiter, async (req, res) => {
  try {
    const entitlement = String(req.body?.entitlement || '').trim();
    const userEmail = req.user?.email;
    if (!userEmail || !entitlement) {
      return res.status(400).json({ success: false, message: 'Entitlement is required' });
    }

    await subscriptionService.consumeEntitlement(userEmail, entitlement);

    return res.json({
      success: true,
      message: `${entitlement} consumed`,
    });
  } catch (error) {
    logger.error(`Error consuming entitlement: ${error.message}`);
    return res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/matrimonial/subscription/payments/razorpay/create
 */
router.post(
  '/subscription/payments/razorpay/create',
  authenticate,
  paymentCreateLimiter,
  async (req, res) => {
    try {
      const subscriptionTier = String(req.body?.subscriptionTier || '').trim().toLowerCase();
      const userEmail = req.user?.email;
      const price = asPositiveNumber(req.body?.amount, TIER_PRICING[subscriptionTier] || 0);

      if (!userEmail || !subscriptionTier || !TIER_PRICING[subscriptionTier]) {
        return res.status(400).json({ success: false, message: 'Invalid payment request' });
      }

      const profileId = await resolveProfileId(req, req.body?.profileId);
      if (!profileId) {
        return res.status(400).json({
          success: false,
          message: 'Complete your profile before making payment',
        });
      }

      let subscription = await MatrimonialSubscription.findOne({
        userEmail,
        profileId,
        tier: subscriptionTier,
        isActive: false,
        paymentStatus: { $in: ['pending', 'failed'] },
      }).sort('-createdAt');

      if (!subscription) {
        subscription = await subscriptionService.createSubscription(
          profileId,
          userEmail,
          subscriptionTier,
          'monthly'
        );
      }

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

      return res.json({
        success: true,
        subscriptionId: String(subscription._id),
        razorpayOrderId,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
        amount: Math.round(price * 100),
        currency: 'INR',
      });
    } catch (error) {
      logger.error(`Error creating Razorpay order: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * POST /api/matrimonial/subscription/payments/razorpay/verify
 */
router.post(
  '/subscription/payments/razorpay/verify',
  authenticate,
  paymentVerifyLimiter,
  async (req, res) => {
    try {
      const {
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
      } = req.body || {};
      const userEmail = req.user?.email;

      if (!paymentId || !orderId || !signature || !userEmail) {
        return res.status(400).json({ success: false, message: 'Missing verification fields' });
      }

      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        return res.status(500).json({
          success: false,
          message: 'Payment verification is not configured',
        });
      }

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const subscription = await MatrimonialSubscription.findOne({
        userEmail,
        transactionId: orderId,
      }).sort('-createdAt');

      if (!subscription) {
        return res.status(404).json({ success: false, message: 'Pending payment not found' });
      }

      subscription.paymentHistory = Array.isArray(subscription.paymentHistory)
        ? subscription.paymentHistory
        : [];
      const historyIndex = subscription.paymentHistory.findIndex(
        (entry) => entry.orderId === orderId
      );

      if (expectedSignature !== signature) {
        subscription.paymentStatus = 'failed';
        subscription.isActive = false;
        subscription.lastPaymentError = 'Signature verification failed';
        if (historyIndex >= 0) {
          subscription.paymentHistory[historyIndex].status = 'failed';
          subscription.paymentHistory[historyIndex].failureReason = 'Signature verification failed';
        }
        await subscription.save();
        return res.status(400).json({
          success: false,
          message: 'Razorpay signature verification failed',
        });
      }

      subscription.paymentStatus = 'completed';
      subscription.isActive = true;
      subscription.paymentMethod = 'razorpay';
      subscription.transactionId = paymentId;
      subscription.lastPaymentError = '';
      if (historyIndex >= 0) {
        subscription.paymentHistory[historyIndex].status = 'completed';
        subscription.paymentHistory[historyIndex].paymentId = paymentId;
        subscription.paymentHistory[historyIndex].verifiedAt = new Date();
      }
      await subscription.save();

      return res.json({
        success: true,
        message: 'Payment verified and subscription activated',
        data: mapSubscriptionResponse(subscription),
      });
    } catch (error) {
      logger.error(`Error verifying Razorpay payment: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * POST /api/matrimonial/subscription/payments/upi/create
 */
router.post('/subscription/payments/upi/create', authenticate, paymentCreateLimiter, async (req, res) => {
  try {
    const subscriptionTier = String(req.body?.subscriptionTier || '').trim().toLowerCase();
    const userEmail = req.user?.email;
    const amount = asPositiveNumber(req.body?.amount, TIER_PRICING[subscriptionTier] || 0);

    if (!userEmail || !subscriptionTier || !TIER_PRICING[subscriptionTier]) {
      return res.status(400).json({ success: false, message: 'Invalid UPI payment request' });
    }

    const profileId = await resolveProfileId(req, req.body?.profileId);
    if (!profileId) {
      return res.status(400).json({ success: false, message: 'Profile is required' });
    }

    const transactionId = createOrderId('upi');
    let subscription = await subscriptionService.createSubscription(
      profileId,
      userEmail,
      subscriptionTier,
      'monthly'
    );
    subscription.isActive = false;
    subscription.paymentStatus = 'pending';
    subscription.paymentMethod = 'upi';
    subscription.transactionId = transactionId;
    subscription.amount = amount;
    subscription.paymentHistory = Array.isArray(subscription.paymentHistory)
      ? subscription.paymentHistory
      : [];
    subscription.paymentHistory.push({
      gateway: 'upi',
      orderId: transactionId,
      status: 'pending',
      amount,
      currency: 'INR',
      invoiceNumber: createInvoiceNumber(),
      createdAt: new Date(),
    });
    await subscription.save();

    return res.json({
      success: true,
      transactionId,
      status: 'pending',
      upiIntentUrl: '',
      message: 'UPI intent created. Complete payment in your UPI app.',
    });
  } catch (error) {
    logger.error(`Error creating UPI payment: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/matrimonial/subscription/payments/upi/status
 */
router.get('/subscription/payments/upi/status', authenticate, paymentVerifyLimiter, async (req, res) => {
  try {
    const transactionId = String(req.query?.transactionId || '').trim();
    const userEmail = req.user?.email;
    if (!transactionId || !userEmail) {
      return res.status(400).json({ success: false, message: 'transactionId is required' });
    }

    const subscription = await MatrimonialSubscription.findOne({
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
    });
  } catch (error) {
    logger.error(`Error checking UPI status: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/matrimonial/subscription/payments/history
 */
router.get('/subscription/payments/history', authenticate, async (req, res) => {
  try {
    const userEmail = req.user?.email;
    const subscriptions = await MatrimonialSubscription.find({ userEmail }).sort('-createdAt').limit(50);
    const history = subscriptions.map((subscription) => mapSubscriptionResponse(subscription));

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
 * POST /api/matrimonial/subscription/payments/retry
 */
router.post('/subscription/payments/retry', authenticate, paymentCreateLimiter, async (req, res) => {
  try {
    const subscriptionId = String(req.body?.subscriptionId || '').trim();
    const userEmail = req.user?.email;
    if (!subscriptionId || !userEmail) {
      return res.status(400).json({ success: false, message: 'subscriptionId is required' });
    }

    const subscription = await MatrimonialSubscription.findOne({
      _id: subscriptionId,
      userEmail,
    });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const retryOrderId = createOrderId('retry');
    subscription.paymentStatus = 'pending';
    subscription.isActive = false;
    subscription.transactionId = retryOrderId;
    subscription.lastPaymentAttemptAt = new Date();
    subscription.paymentHistory = Array.isArray(subscription.paymentHistory)
      ? subscription.paymentHistory
      : [];
    subscription.paymentHistory.push({
      gateway: subscription.paymentMethod || 'razorpay',
      orderId: retryOrderId,
      status: 'retry_created',
      amount: amountToNumber(subscription.amount),
      currency: subscription.currency || 'INR',
      retryOf: subscription.transactionId || '',
      invoiceNumber: createInvoiceNumber(),
      createdAt: new Date(),
    });
    await subscription.save();

    return res.json({
      success: true,
      message: 'Retry payment order created',
      data: {
        subscriptionId: String(subscription._id),
        transactionId: retryOrderId,
      },
    });
  } catch (error) {
    logger.error(`Error retrying payment: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/matrimonial/subscription/payments/:paymentId/invoice
 */
router.get('/subscription/payments/:paymentId/invoice', authenticate, async (req, res) => {
  try {
    const paymentId = String(req.params?.paymentId || '').trim();
    const userEmail = req.user?.email;
    if (!paymentId || !userEmail) {
      return res.status(400).json({ success: false, message: 'paymentId is required' });
    }

    const subscriptions = await MatrimonialSubscription.find({ userEmail }).sort('-createdAt').limit(50);
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
          amount: asPositiveNumber(entry.amount, amountToNumber(subscription.amount)),
          currency: entry.currency || subscription.currency || 'INR',
          tier: subscription.tier,
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
    logger.error(`Error generating invoice: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/matrimonial/subscription/payments/refund-status
 */
router.get('/subscription/payments/refund-status', authenticate, async (req, res) => {
  try {
    const userEmail = req.user?.email;
    const subscriptionId = String(req.query?.subscriptionId || '').trim();

    const filter = {
      userEmail,
      ...(subscriptionId ? { _id: subscriptionId } : {}),
    };
    const subscription = await MatrimonialSubscription.findOne(filter).sort('-createdAt');
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    return res.json({
      success: true,
      data: {
        subscriptionId: String(subscription._id),
        paymentStatus: subscription.paymentStatus,
        refundDetails: subscription.refundDetails || null,
      },
    });
  } catch (error) {
    logger.error(`Error fetching refund status: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/matrimonial/subscription/:subscriptionId/cancel
 */
router.patch('/subscription/:subscriptionId/cancel', authenticate, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;

    const subscription = await MatrimonialSubscription.findOneAndUpdate(
      {
        _id: subscriptionId,
        userEmail: req.user?.email,
      },
      {
        isActive: false,
        tier: 'free',
        cancelledAt: new Date(),
        cancellationReason: reason,
        cancelledBy: 'user',
      },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    return res.json({
      success: true,
      message: 'Subscription cancelled',
      data: mapSubscriptionResponse(subscription),
    });
  } catch (error) {
    logger.error(`Error cancelling subscription: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/matrimonial/subscription/:subscriptionId/refund
 * Admin: Process refund
 */
router.patch('/subscription/:subscriptionId/refund', authenticate, ensureAdmin, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const amount = asPositiveNumber(req.body?.amount, 0);
    const reason = String(req.body?.reason || '').trim();

    const subscription = await subscriptionService.processRefund(
      subscriptionId,
      amount,
      reason,
      req.user?.email
    );

    const latestPaymentIndex = Array.isArray(subscription.paymentHistory)
      ? subscription.paymentHistory.length - 1
      : -1;
    if (latestPaymentIndex >= 0) {
      subscription.paymentHistory[latestPaymentIndex].refundStatus = 'pending';
      subscription.paymentHistory[latestPaymentIndex].refundId = createOrderId('refund');
      await subscription.save();
    }

    return res.json({
      success: true,
      message: 'Refund processed',
      data: mapSubscriptionResponse(subscription),
    });
  } catch (error) {
    logger.error(`Error processing refund: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

