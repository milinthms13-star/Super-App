const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const FlashSale = require('../models/FlashSale');
const Product = require('../models/Product');
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

// Apply flash sale discount to cart (buyer)
router.post('/apply/:saleId', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const sale = await FlashSale.findById(req.params.saleId).populate('products.productId');
    
    if (!sale || sale.status !== 'active' || now < sale.startTime || now > sale.endTime) {
      return res.status(400).json({ success: false, message: 'Invalid or expired flash sale' });
    }

    const { cartItems } = req.body;
    const eligibleDiscounts = [];

    for (const item of cartItems) {
      const saleProduct = sale.products.find(p => 
        p.productId._id.toString() === item.productId
      );
      
      if (saleProduct && saleProduct.uses < saleProduct.stockLimit) {
        eligibleDiscounts.push({
          productId: item.productId,
          discountType: sale.discountType,
          discountValue: sale.discountValue,
          maxUses: sale.maxUsesPerUser
        });
      }
    }

    res.json({ 
      success: true, 
      discounts: eligibleDiscounts,
      saleName: sale.name 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

