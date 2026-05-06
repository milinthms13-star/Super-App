const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const BulkOrder = require('../models/BulkOrder');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');
const devProductStore = require('../utils/devProductStore');

const useMemoryProducts = () => process.env.AUTH_STORAGE === 'memory' && process.env.NODE_ENV !== 'production';

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();

const loadProductForBulkOrder = async (productId) => {
  const normalizedProductId = String(productId || '').trim();

  if (!normalizedProductId) {
    return null;
  }

  if (useMemoryProducts()) {
    return devProductStore.findProductById(normalizedProductId);
  }

  if (!mongoose.Types.ObjectId.isValid(normalizedProductId)) {
    return null;
  }

  return Product.findById(normalizedProductId).select('sellerEmail sellerName').lean();
};

const resolveBulkOrderSellerDetails = async (items = []) => {
  const productIds = [...new Set(
    (Array.isArray(items) ? items : [])
      .map((item) => String(item?.productId || '').trim())
      .filter(Boolean)
  )];

  if (productIds.length === 0) {
    return null;
  }

  const products = (await Promise.all(productIds.map((productId) => loadProductForBulkOrder(productId)))).filter(Boolean);
  if (products.length !== productIds.length) {
    return null;
  }

  const sellerEmails = [...new Set(products.map((product) => normalizeEmail(product?.sellerEmail)).filter(Boolean))];
  if (sellerEmails.length !== 1) {
    return null;
  }

  const sellerEmail = sellerEmails[0];
  const seller = products.find((product) => normalizeEmail(product?.sellerEmail) === sellerEmail);

  return {
    sellerEmail,
    sellerName: seller?.sellerName || '',
  };
};

const loadSellerOwnedBulkOrder = async (bulkOrderId, userEmail) => {
  const order = await BulkOrder.findOne({ bulkOrderId });

  if (!order) {
    return null;
  }

  const normalizedUserEmail = normalizeEmail(userEmail);
  const storedSellerEmail = normalizeEmail(order.sellerEmail);

  if (storedSellerEmail) {
    if (storedSellerEmail !== normalizedUserEmail) {
      return null;
    }

    return {
      order,
      sellerDetails: {
        sellerEmail: storedSellerEmail,
        sellerName: order.sellerName || '',
      },
    };
  }

  const sellerDetails = await resolveBulkOrderSellerDetails(order.items);
  if (!sellerDetails || sellerDetails.sellerEmail !== normalizedUserEmail) {
    return null;
  }

  return { order, sellerDetails };
};

const applySellerOwnership = (order, sellerDetails) => {
  if (!order || !sellerDetails) {
    return;
  }

  if (!order.sellerEmail && sellerDetails.sellerEmail) {
    order.sellerEmail = sellerDetails.sellerEmail;
  }

  if (!order.sellerName && sellerDetails.sellerName) {
    order.sellerName = sellerDetails.sellerName;
  }
};

// Create bulk order inquiry
router.post('/create', authenticate, async (req, res) => {
  try {
    const { items, companyName, gstNumber, deliveryAddress, notes } = req.body;
    const sellerDetails = await resolveBulkOrderSellerDetails(items);

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one bulk-order item is required.' });
    }

    if (!sellerDetails) {
      return res.status(400).json({
        success: false,
        error: 'Bulk orders must contain valid products from a single seller.',
      });
    }

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
      customerEmail: normalizeEmail(req.user.email),
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
      sellerEmail: sellerDetails?.sellerEmail || '',
      sellerName: sellerDetails?.sellerName || '',
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
    const requestedEmail = normalizeEmail(req.params.email);
    const currentUserEmail = normalizeEmail(req.user.email);

    if (currentUserEmail !== requestedEmail) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const orders = await BulkOrder.find({ customerEmail: currentUserEmail }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get bulk orders for seller
router.get('/seller/:email', authenticate, async (req, res) => {
  try {
    const requestedEmail = normalizeEmail(req.params.email);
    const currentUserEmail = normalizeEmail(req.user.email);

    if (currentUserEmail !== requestedEmail) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const orders = await BulkOrder.find({
      sellerEmail: currentUserEmail,
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
    const ownedOrder = await loadSellerOwnedBulkOrder(req.params.bulkOrderId, req.user.email);

    if (!ownedOrder) {
      return res.status(404).json({ success: false, error: 'Bulk order not found or unauthorized' });
    }

    const { order, sellerDetails } = ownedOrder;
    order.status = status;
    order.updatedAt = new Date();
    applySellerOwnership(order, sellerDetails);

    await order.save();

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send quote to customer
router.post('/:bulkOrderId/quote', authenticate, async (req, res) => {
  try {
    const { quotedPrice, validityDays } = req.body;
    const ownedOrder = await loadSellerOwnedBulkOrder(req.params.bulkOrderId, req.user.email);

    if (!ownedOrder) {
      return res.status(404).json({ success: false, error: 'Bulk order not found or unauthorized' });
    }

    const { order, sellerDetails } = ownedOrder;
    order.status = 'Quoted';
    order.totalAmount = quotedPrice;
    order.updatedAt = new Date();
    applySellerOwnership(order, sellerDetails);

    await order.save();

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Confirm bulk order
router.post('/:bulkOrderId/confirm', authenticate, async (req, res) => {
  try {
    const order = await BulkOrder.findOneAndUpdate(
      { bulkOrderId: req.params.bulkOrderId, customerEmail: normalizeEmail(req.user.email) },
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
