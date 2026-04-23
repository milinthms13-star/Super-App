const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const FlashSale = require('../models/FlashSale');
const {
  getActiveFlashSaleForProduct,
  listActiveFlashSales,
  reserveFlashSaleItems,
  reserveFlashSaleStock,
} = require('../utils/flashSaleService');
const logger = require('../utils/logger');

const router = express.Router();

const normalizeStatus = (payload = {}) => {
  const now = new Date();
  const startTime = payload.startTime ? new Date(payload.startTime) : null;
  const endTime = payload.endTime ? new Date(payload.endTime) : null;

  if (endTime && !Number.isNaN(endTime.getTime()) && endTime < now) {
    return 'expired';
  }

  if (startTime && !Number.isNaN(startTime.getTime()) && startTime > now) {
    return 'draft';
  }

  return payload.status && payload.status !== 'expired' ? payload.status : 'active';
};

router.post('/', authenticate, async (req, res) => {
  try {
    const sale = new FlashSale({
      ...req.body,
      createdBy: req.user.email,
      status: normalizeStatus(req.body),
    });

    await sale.save();
    res.status(201).json({ success: true, data: sale });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const sales = await listActiveFlashSales({ userId: req.user?.email || '' });
    res.json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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

router.get('/product/:productId', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }

    const sale = await getActiveFlashSaleForProduct(req.params.productId, {
      userId: req.user?.email || '',
    });

    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:saleId', authenticate, async (req, res) => {
  try {
    const updates = {
      ...req.body,
      status: normalizeStatus(req.body),
    };

    const sale = await FlashSale.findOneAndUpdate(
      { _id: req.params.saleId, createdBy: req.user.email },
      updates,
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

router.post('/reserve/bulk', authenticate, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const reservations = await reserveFlashSaleItems({
      items,
      userId: req.user.email,
    });

    res.json({
      success: true,
      data: reservations,
      message: reservations.length > 0
        ? 'Flash sale stock reserved for checkout.'
        : 'No flash sale reservations were needed.',
    });
  } catch (error) {
    logger.error('Flash sale bulk reserve error:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.post('/reserve/:saleId', authenticate, async (req, res) => {
  try {
    const reservation = await reserveFlashSaleStock({
      saleId: req.params.saleId,
      productId: req.body?.productId,
      quantity: req.body?.quantity || 1,
      userId: req.user.email,
    });

    res.json({
      success: true,
      data: reservation,
      message: 'Flash sale stock reserved successfully.',
    });
  } catch (error) {
    logger.error('Flash sale reserve error:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.get('/apply/:saleId', authenticate, async (req, res) => {
  try {
    const sale = await FlashSale.findById(req.params.saleId).populate('products.productId');
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Flash sale not found.' });
    }

    const productStates = await Promise.all(
      (sale.products || []).map((entry) => getActiveFlashSaleForProduct(entry.productId, {
        userId: req.user.email,
        saleId: req.params.saleId,
      }))
    );

    res.json({
      success: true,
      data: {
        saleId: sale.saleId,
        name: sale.name,
        description: sale.description || '',
        startsAt: sale.startTime,
        endsAt: sale.endTime,
        products: productStates.filter(Boolean),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
