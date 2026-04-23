const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const FlashSale = require('../models/FlashSale');
const Product = require('../models/Product');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const router = express.Router();

// Create flash sale (admin/seller)
router.post('/', authenticate, async (req, res) => {
  try {
    const sale = new FlashSale({
      ...req.body,
      createdBy: req.user.email,
      status: new Date(req.body.startTime) > new Date() ? 'draft' : 'active'
    });
    await sale.save();
    res.status(201).json({ success: true, data: sale });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// List active flash sales (buyer view)
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const sales = await FlashSale.find({
      status: 'active',
      startTime: { $lte: now },
      endTime: { $gte: now }
    }).populate('products.productId', 'name image price stock');

    // Add remaining time
    const salesWithTime = sales.map(sale => ({
      ...sale.toObject(),
      timeRemaining: new Date(sale.endTime) - now
    }));

    res.json({ success: true, data: salesWithTime });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// My flash sales (seller/admin dashboard)
router.get('/mine', authenticate, async (req, res) => {
  try {
    const sales = await FlashSale.find({ createdBy: req.user.email })
      .sort({ updatedAt: -1 })
      .populate('products.productId');
    
    res.json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update flash sale
router.put('/:saleId', authenticate, async (req, res) => {
  try {
    const sale = await FlashSale.findOneAndUpdate(
      { _id: req.params.saleId, createdBy: req.user.email },
      req.body,
      { new: true }
    ).populate('products.productId');
    
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Flash sale not found' });
    }
    
    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Reserve flash sale stock (prevents oversell - called from checkout/cart)
router.post('/reserve/:saleId', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const { productId, quantity = 1 } = req.body;
    const userId = req.user.email;

    const sale = await FlashSale.findById(req.params.saleId).populate('products.productId');
    
    if (!sale || sale.status !== 'active' || now < sale.startTime || now > sale.endTime) {
      return res.status(400).json({ success: false, message: 'Invalid or expired flash sale' });
    }

    const saleProduct = sale.products.find(p => p.productId._id.toString() === productId);
    if (!saleProduct) {
      return res.status(404).json({ success: false, message: 'Flash sale product not found' });
    }

    // Check per-user limit
    const userUsage = sale.userUses.find(u => u.userId === userId);
    const userUses = userUsage ? userUsage.uses : 0;
    if (userUses + quantity > sale.maxUsesPerUser) {
      return res.status(400).json({ success: false, message: `Max ${sale.maxUsesPerUser} uses per user exceeded` });
    }

    // Check product stock limit
    if (saleProduct.uses + quantity > saleProduct.stockLimit) {
      return res.status(400).json({ success: false, message: 'Flash sale stock sold out' });
    }

    // Reserve stock (transaction-like)
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      // Update flash sale
      sale.products = sale.products.map(p => 
        p.productId._id.toString() === productId 
          ? { ...p, reservedStock: (p.reservedStock || 0) + quantity, uses: p.uses }
          : p
      );

      // Update user usage
      if (userUsage) {
        userUsage.uses += quantity;
        userUsage.usedAt = new Date();
      } else {
        sale.userUses.push({ userId, uses: quantity, usedAt: new Date() });
      }

      await sale.save({ session });

      // Invalidate product cache
      const redis = getRedisClient();
      if (redis) {
        await redis.del('devProducts:list');
      }
    });
    session.endSession();

    // Set short reservation expiry (15min cart timeout)
    const redis = getRedisClient();
    if (redis) {
      await redis.setEx(
        `flash-reserve:${saleId}:${productId}:${userId}`, 
        900, // 15min
        JSON.stringify({ quantity, reservedAt: now.toISOString() })
      );
    }

    res.json({ 
      success: true, 
      message: `${quantity} item(s) reserved for flash sale`,
      expiresIn: 900000 // 15min ms
    });
  } catch (error) {
    logger.error('Flash sale reserve error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Apply flash sale discount to cart (buyer view only)
router.get('/apply/:saleId', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const sale = await FlashSale.findById(req.params.saleId).populate('products.productId');
    
    if (!sale || sale.status !== 'active' || now < sale.startTime || now > sale.endTime) {
      return res.status(400).json({ success: false, message: 'Invalid or expired flash sale' });
    }

    const userId = req.user.email;
    const userUsage = sale.userUses.find(u => u.userId === userId);
    const remainingUses = sale.maxUsesPerUser - (userUsage?.uses || 0);

    res.json({ 
      success: true, 
      sale,
      remainingUses: Math.max(0, remainingUses),
      timeRemaining: new Date(sale.endTime) - now
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

