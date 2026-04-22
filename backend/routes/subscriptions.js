const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const { authenticate } = require('../middleware/auth');

// Create subscription
router.post('/create', authenticate, async (req, res) => {
  try {
    const { items, frequency, deliveryDay, deliveryAddress, endDate } = req.body;

    const nextDeliveryDate = new Date();
    if (frequency === 'Weekly') {
      nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 7);
    } else if (frequency === 'Bi-weekly') {
      nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 14);
    } else if (frequency === 'Monthly') {
      nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 1);
    } else if (frequency === 'Quarterly') {
      nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 3);
    }

    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = frequency === 'Monthly' ? 5 : frequency === 'Quarterly' ? 10 : 0;

    const subscription = new Subscription({
      customerEmail: req.user.email,
      customerName: req.user.name,
      items,
      frequency,
      deliveryDay,
      deliveryAddress,
      nextDeliveryDate,
      totalPrice: totalPrice - (totalPrice * discount) / 100,
      endDate,
      discount,
    });

    await subscription.save();
    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user subscriptions
router.get('/', authenticate, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      customerEmail: req.user.email,
      status: { $ne: 'Cancelled' },
    }).sort({ nextDeliveryDate: 1 });

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single subscription
router.get('/:subscriptionId', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      subscriptionId: req.params.subscriptionId,
      customerEmail: req.user.email,
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update subscription
router.put('/:subscriptionId', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOneAndUpdate(
      { subscriptionId: req.params.subscriptionId, customerEmail: req.user.email },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found or unauthorized' });
    }

    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pause subscription
router.post('/:subscriptionId/pause', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOneAndUpdate(
      { subscriptionId: req.params.subscriptionId, customerEmail: req.user.email },
      { status: 'Paused', updatedAt: new Date() },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resume subscription
router.post('/:subscriptionId/resume', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOneAndUpdate(
      { subscriptionId: req.params.subscriptionId, customerEmail: req.user.email },
      { status: 'Active', updatedAt: new Date() },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel subscription
router.post('/:subscriptionId/cancel', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOneAndUpdate(
      { subscriptionId: req.params.subscriptionId, customerEmail: req.user.email },
      { status: 'Cancelled', updatedAt: new Date() },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
