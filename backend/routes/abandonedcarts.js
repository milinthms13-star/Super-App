/**
 * Abandoned Carts Routes
 * Handles abandoned cart tracking and recovery
 */

const express = require('express');
const router = express.Router();
const AbandonedCart = require('../models/AbandonedCart');
const { authenticate } = require('../middleware/auth');
const {
  detectAbandonedCarts,
  calculateRecoveryStats,
  getExpiredCarts,
} = require('../utils/abandonedCartService');
const logger = require('../utils/logger');

/**
 * GET /api/abandonedcarts/list
 * Get customer's abandoned carts
 * Query: status, page, limit
 */
router.get('/list', authenticate, async (req, res) => {
  try {
    const customerEmail = req.user?.email;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { customerEmail };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const carts = await AbandonedCart.find(query)
      .sort('-abandonedAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AbandonedCart.countDocuments(query);

    return res.json({
      success: true,
      data: carts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error(`Error fetching abandoned carts: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/abandonedcarts/track
 * Track current cart as abandoned
 * Called when customer leaves checkout without completing purchase
 *
 * Body: { cartId, customerName, items, cartValue, incentive? }
 */
router.post('/track', authenticate, async (req, res) => {
  try {
    const customerEmail = req.user?.email;
    const { cartId, customerName, items, cartValue, incentive } = req.body;

    if (!cartId || !items || !items.length || !cartValue) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: cartId, items, cartValue',
      });
    }

    // Check if cart already tracked
    let cart = await AbandonedCart.findOne({ cartId, customerEmail });

    if (cart) {
      // Update existing cart
      cart.lastActiveAt = new Date();
      cart.items = items;
      cart.cartValue = cartValue;
      await cart.save();

      return res.json({
        success: true,
        message: 'Cart updated',
        cartId: cart.cartId,
      });
    }

    // Create new abandoned cart record
    cart = new AbandonedCart({
      cartId,
      customerEmail,
      customerName: customerName || 'Valued Customer',
      items,
      cartValue,
      abandonedAt: new Date(),
      lastActiveAt: new Date(),
      status: 'abandoned',
      incentive: incentive || {
        couponCode: `RECOVER${Date.now().toString().slice(-6)}`,
        discountPercentage: 10,
        discountAmount: (cartValue.total * 0.1).toFixed(2),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      reminders: [],
      recoveryAttempts: 0,
    });

    await cart.save();

    logger.info(`Abandoned cart tracked: ${cartId} for ${customerEmail}`);

    return res.json({
      success: true,
      message: 'Cart tracked as abandoned',
      cartId: cart.cartId,
    });
  } catch (error) {
    logger.error(`Error tracking abandoned cart: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/abandonedcarts/:cartId/recover
 * Record cart recovery when customer completes purchase
 * Called on successful order creation after returning from reminder
 *
 * Query: source ('email_reminder', 'direct_return', 'other')
 */
router.post('/:cartId/recover', authenticate, async (req, res) => {
  try {
    const { cartId } = req.params;
    const { source = 'direct_return' } = req.query;
    const customerEmail = req.user?.email;

    const cart = await AbandonedCart.findOne({ cartId, customerEmail });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    if (cart.status === 'recovered') {
      return res.json({
        success: true,
        message: 'Cart already recovered',
      });
    }

    // Mark as recovered
    cart.status = 'recovered';
    cart.recoveredAt = new Date();
    cart.recoverySource = source;

    await cart.save();

    logger.info(`Cart recovered: ${cartId}, source: ${source}`);

    return res.json({
      success: true,
      message: 'Cart marked as recovered',
      recoveredAt: cart.recoveredAt,
    });
  } catch (error) {
    logger.error(`Error recovering cart: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/abandonedcarts/stats
 * Get recovery statistics for admin/analytics
 * Admin-only endpoint
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    // TODO: Add admin authorization check
    // if (!req.user?.isAdmin) return res.status(403).json(...)

    const carts = await AbandonedCart.find({}).lean();

    if (carts.length === 0) {
      return res.json({
        success: true,
        statistics: {
          totalAbandoned: 0,
          recoveryRate: 0,
          reminderOpenRate: 0,
          totalValue: 0,
          recoveredValue: 0,
        },
      });
    }

    const abandoned = carts.filter((c) => c.status === 'abandoned').length;
    const recovered = carts.filter((c) => c.status === 'recovered');
    const totalValue = carts.reduce((sum, c) => sum + (c.cartValue?.total || 0), 0);
    const recoveredValue = recovered.reduce(
      (sum, c) => sum + (c.cartValue?.total || 0),
      0
    );

    // Calculate reminder open rate
    let totalReminders = 0;
    let openedReminders = 0;

    carts.forEach((cart) => {
      if (cart.reminders && cart.reminders.length > 0) {
        totalReminders += cart.reminders.length;
        openedReminders += cart.reminders.filter((r) => r.openedAt).length;
      }
    });

    const reminderOpenRate =
      totalReminders > 0 ? ((openedReminders / totalReminders) * 100).toFixed(2) : 0;

    return res.json({
      success: true,
      statistics: {
        totalAbandoned: carts.length,
        totalAbandonedValue: totalValue.toFixed(2),
        recoveryCount: recovered.length,
        recoveryRate: ((recovered.length / carts.length) * 100).toFixed(2),
        reminderOpenRate,
        totalValue: totalValue.toFixed(2),
        recoveredValue: recoveredValue.toFixed(2),
        potentialLoss: (totalValue - recoveredValue).toFixed(2),
      },
    });
  } catch (error) {
    logger.error(`Error fetching cart stats: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
