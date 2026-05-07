const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const { authenticate } = require('../middleware/auth');

const VALID_FREQUENCIES = new Set(['Weekly', 'Bi-weekly', 'Monthly', 'Quarterly']);
const VALID_DELIVERY_DAYS = new Set([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);
const FREQUENCY_DISCOUNTS = {
  Weekly: 0,
  'Bi-weekly': 0,
  Monthly: 5,
  Quarterly: 10,
};
const DAY_INDEX = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const normalizeItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({
      productId: String(item?.productId || '').trim(),
      productName: String(item?.productName || '').trim(),
      quantity: Number(item?.quantity || 0),
      price: Number(item?.price || 0),
      sellerId: String(item?.sellerId || '').trim(),
      sellerName: String(item?.sellerName || '').trim(),
    }))
    .filter((item) =>
      (item.productId || item.productName) &&
      Number.isFinite(item.quantity) &&
      item.quantity > 0 &&
      Number.isFinite(item.price) &&
      item.price >= 0
    );

const normalizeOptionalDate = (value) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const applyDeliveryDay = (baseDate, deliveryDay) => {
  if (!deliveryDay || !VALID_DELIVERY_DAYS.has(deliveryDay)) {
    return baseDate;
  }

  const nextDate = new Date(baseDate);
  const targetDay = DAY_INDEX[deliveryDay];
  const daysUntilTarget = (targetDay - nextDate.getDay() + 7) % 7;
  if (daysUntilTarget > 0) {
    nextDate.setDate(nextDate.getDate() + daysUntilTarget);
  }

  return nextDate;
};

const calculateNextDeliveryDate = (frequency = 'Monthly', deliveryDay, fromDate = new Date()) => {
  const nextDeliveryDate = new Date(fromDate);

  if (frequency === 'Weekly') {
    nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 7);
  } else if (frequency === 'Bi-weekly') {
    nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 14);
  } else if (frequency === 'Monthly') {
    nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 1);
  } else if (frequency === 'Quarterly') {
    nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 3);
  }

  return applyDeliveryDay(nextDeliveryDate, deliveryDay);
};

const calculateSubscriptionPricing = (items = [], frequency = 'Monthly') => {
  const totalPrice = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );
  const discount = FREQUENCY_DISCOUNTS[frequency] || 0;

  return {
    subtotal: totalPrice,
    discount,
    totalPrice: Math.round((totalPrice - (totalPrice * discount) / 100) * 100) / 100,
  };
};

const validateSubscriptionPayload = (payload = {}, { allowPartial = false } = {}) => {
  const errors = [];
  const hasItems = Object.prototype.hasOwnProperty.call(payload, 'items');
  const hasFrequency = Object.prototype.hasOwnProperty.call(payload, 'frequency');
  const hasDeliveryDay = Object.prototype.hasOwnProperty.call(payload, 'deliveryDay');
  const hasDeliveryAddress = Object.prototype.hasOwnProperty.call(payload, 'deliveryAddress');
  const hasEndDate = Object.prototype.hasOwnProperty.call(payload, 'endDate');

  const nextPayload = {};

  if (hasItems || !allowPartial) {
    const items = normalizeItems(payload.items);
    if (items.length === 0) {
      errors.push('At least one valid subscription item is required');
    } else {
      nextPayload.items = items;
    }
  }

  if (hasFrequency || !allowPartial) {
    const frequency = String(payload.frequency || '').trim();
    if (!VALID_FREQUENCIES.has(frequency)) {
      errors.push('A valid subscription frequency is required');
    } else {
      nextPayload.frequency = frequency;
    }
  }

  if (hasDeliveryDay || !allowPartial) {
    const deliveryDay = String(payload.deliveryDay || '').trim();
    if (!VALID_DELIVERY_DAYS.has(deliveryDay)) {
      errors.push('A valid delivery day is required');
    } else {
      nextPayload.deliveryDay = deliveryDay;
    }
  }

  if (hasDeliveryAddress || !allowPartial) {
    const deliveryAddress = String(payload.deliveryAddress || '').trim();
    if (!deliveryAddress) {
      errors.push('Delivery address is required');
    } else {
      nextPayload.deliveryAddress = deliveryAddress;
    }
  }

  if (hasEndDate) {
    const endDate = normalizeOptionalDate(payload.endDate);
    if (payload.endDate && !endDate) {
      errors.push('End date is invalid');
    } else if (endDate && endDate <= new Date()) {
      errors.push('End date must be in the future');
    } else {
      nextPayload.endDate = endDate;
    }
  } else if (!allowPartial) {
    nextPayload.endDate = null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'paymentMethod')) {
    nextPayload.paymentMethod = String(payload.paymentMethod || '').trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'autoRenew')) {
    nextPayload.autoRenew = Boolean(payload.autoRenew);
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: nextPayload,
  };
};

const refreshExpiredSubscriptions = async (customerEmail) => {
  const now = new Date();
  await Subscription.updateMany(
    {
      customerEmail,
      status: { $nin: ['Cancelled', 'Expired'] },
      endDate: { $ne: null, $lte: now },
    },
    {
      status: 'Expired',
      updatedAt: now,
    }
  );
};

// Create subscription
router.post('/create', authenticate, async (req, res) => {
  try {
    const validation = validateSubscriptionPayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, error: validation.errors[0] });
    }

    const {
      items,
      frequency,
      deliveryDay,
      deliveryAddress,
      endDate,
      paymentMethod,
      autoRenew,
    } = validation.value;
    const pricing = calculateSubscriptionPricing(items, frequency);
    const nextDeliveryDate = calculateNextDeliveryDate(frequency, deliveryDay);

    const subscription = new Subscription({
      customerEmail: req.user.email,
      customerName: req.user.name,
      items,
      frequency,
      deliveryDay,
      deliveryAddress,
      nextDeliveryDate,
      totalPrice: pricing.totalPrice,
      endDate,
      discount: pricing.discount,
      paymentMethod: paymentMethod || 'Card',
      autoRenew: typeof autoRenew === 'boolean' ? autoRenew : true,
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
    await refreshExpiredSubscriptions(req.user.email);

    const subscriptions = await Subscription.find({
      customerEmail: req.user.email,
      status: { $nin: ['Cancelled', 'Expired'] },
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
    const validation = validateSubscriptionPayload(req.body, { allowPartial: true });
    if (!validation.isValid) {
      return res.status(400).json({ success: false, error: validation.errors[0] });
    }

    const existingSubscription = await Subscription.findOne({
      subscriptionId: req.params.subscriptionId,
      customerEmail: req.user.email,
    });

    if (!existingSubscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found or unauthorized' });
    }

    if (existingSubscription.status === 'Cancelled' || existingSubscription.status === 'Expired') {
      return res.status(400).json({ success: false, error: 'Cancelled or expired subscriptions cannot be updated' });
    }

    const nextItems = validation.value.items || existingSubscription.items;
    const nextFrequency = validation.value.frequency || existingSubscription.frequency;
    const nextDeliveryDay = validation.value.deliveryDay || existingSubscription.deliveryDay;
    const pricing = calculateSubscriptionPricing(nextItems, nextFrequency);
    const shouldRefreshNextDelivery =
      Object.prototype.hasOwnProperty.call(validation.value, 'items') ||
      Object.prototype.hasOwnProperty.call(validation.value, 'frequency') ||
      Object.prototype.hasOwnProperty.call(validation.value, 'deliveryDay');

    const updates = {
      ...validation.value,
      items: nextItems,
      frequency: nextFrequency,
      deliveryDay: nextDeliveryDay,
      totalPrice: pricing.totalPrice,
      discount: pricing.discount,
      updatedAt: new Date(),
    };

    if (shouldRefreshNextDelivery) {
      updates.nextDeliveryDate = calculateNextDeliveryDate(nextFrequency, nextDeliveryDay);
    }

    const subscription = await Subscription.findOneAndUpdate(
      { subscriptionId: req.params.subscriptionId, customerEmail: req.user.email },
      updates,
      { new: true }
    );

    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pause subscription
router.post('/:subscriptionId/pause', authenticate, async (req, res) => {
  try {
    const existingSubscription = await Subscription.findOne({
      subscriptionId: req.params.subscriptionId,
      customerEmail: req.user.email,
    });

    if (!existingSubscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    if (existingSubscription.status === 'Cancelled' || existingSubscription.status === 'Expired') {
      return res.status(400).json({ success: false, error: 'Only active subscriptions can be paused' });
    }

    const subscription = await Subscription.findOneAndUpdate(
      { subscriptionId: req.params.subscriptionId, customerEmail: req.user.email },
      { status: 'Paused', updatedAt: new Date() },
      { new: true }
    );

    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resume subscription
router.post('/:subscriptionId/resume', authenticate, async (req, res) => {
  try {
    const existingSubscription = await Subscription.findOne({
      subscriptionId: req.params.subscriptionId,
      customerEmail: req.user.email,
    });

    if (!existingSubscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    if (existingSubscription.status === 'Cancelled' || existingSubscription.status === 'Expired') {
      return res.status(400).json({ success: false, error: 'Cancelled or expired subscriptions cannot be resumed' });
    }

    const nextDeliveryDate =
      existingSubscription.nextDeliveryDate && new Date(existingSubscription.nextDeliveryDate) > new Date()
        ? existingSubscription.nextDeliveryDate
        : calculateNextDeliveryDate(existingSubscription.frequency, existingSubscription.deliveryDay);

    const subscription = await Subscription.findOneAndUpdate(
      { subscriptionId: req.params.subscriptionId, customerEmail: req.user.email },
      { status: 'Active', nextDeliveryDate, updatedAt: new Date() },
      { new: true }
    );

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
