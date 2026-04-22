const express = require('express');
const router = express.Router();
const BulkOrder = require('../models/BulkOrder');
const { authenticate } = require('../middleware/auth');

// Create bulk order inquiry
router.post('/create', authenticate, async (req, res) => {
  try {
    const { items, companyName, gstNumber, deliveryAddress, notes } = req.body;

    // Calculate bulk discounts
    let subtotal = 0;
    items.forEach((item) => {
      item.totalPrice = item.quantity * item.unitPrice;
      subtotal += item.totalPrice;
    });

    // Apply bulk discount based on quantity
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    let discountPercentage = 0;
    if (totalQuantity >= 1000) discountPercentage = 20;
    else if (totalQuantity >= 500) discountPercentage = 15;
    else if (totalQuantity >= 200) discountPercentage = 10;
    else discountPercentage = 5;

    const bulkDiscount = (subtotal * discountPercentage) / 100;

    const bulkOrder = new BulkOrder({
      customerEmail: req.user.email,
      customerName: req.user.name,
      customerPhone: req.user.phone,
      items,
      companyName,
      gstNumber,
      subtotal,
      bulkDiscount,
      discountPercentage,
      deliveryAddress,
      notes,
      totalAmount: subtotal - bulkDiscount,
    });

    await bulkOrder.save();
    res.status(201).json({ success: true, data: bulkOrder });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get bulk orders for customer
router.get('/customer/:email', authenticate, async (req, res) => {
  try {
    if (req.user.email !== req.params.email) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const orders = await BulkOrder.find({ customerEmail: req.params.email }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get bulk orders for seller
router.get('/seller/:email', authenticate, async (req, res) => {
  try {
    const orders = await BulkOrder.find({
      sellerEmail: req.user.email,
      status: { $in: ['Pending', 'Quoted'] },
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update bulk order status
router.put('/:bulkOrderId/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await BulkOrder.findOneAndUpdate(
      { bulkOrderId: req.params.bulkOrderId },
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, error: 'Bulk order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send quote to customer
router.post('/:bulkOrderId/quote', authenticate, async (req, res) => {
  try {
    const { quotedPrice, validityDays } = req.body;
    const order = await BulkOrder.findOneAndUpdate(
      { bulkOrderId: req.params.bulkOrderId },
      {
        status: 'Quoted',
        totalAmount: quotedPrice,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, error: 'Bulk order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Confirm bulk order
router.post('/:bulkOrderId/confirm', authenticate, async (req, res) => {
  try {
    const order = await BulkOrder.findOneAndUpdate(
      { bulkOrderId: req.params.bulkOrderId, customerEmail: req.user.email },
      { status: 'Confirmed', paymentStatus: 'Pending' },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found or unauthorized' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
