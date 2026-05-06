const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { ADMIN_EMAIL } = require('../config/constants');
const Coupon = require('../models/Coupon');

const router = express.Router();

const isAdmin = (req) => {
  const role = (req?.user?.registrationType || req?.user?.role || req?.auth?.registrationType || req?.auth?.role || req?.headers?.['x-malabar-role'] || '')
    .toString()
    .trim()
    .toLowerCase();

  return role === 'admin' || req.user?.email?.trim().toLowerCase() === ADMIN_EMAIL;
};

const createCouponSchema = Joi.object({
  code: Joi.string().trim().min(3).max(40).required(),
  discountType: Joi.string().valid('fixed', 'percentage').required(),
  discountValue: Joi.number().min(0).required(),
  minOrderAmount: Joi.number().min(0).optional().default(0),
  maxUses: Joi.number().integer().min(0).optional().default(0),
  perUserUses: Joi.number().integer().min(0).optional().default(0),
  startAt: Joi.date().iso().allow(null).optional().default(null),
  endAt: Joi.date().iso().allow(null).optional().default(null),
  isActive: Joi.boolean().optional().default(true),
});

const applyCouponSchema = Joi.object({
  couponCode: Joi.string().trim().required(),
  amount: Joi.number().min(0).required(),
  userEmail: Joi.string().trim().email().required(),
});

const toUpperCode = (code) => String(code || '').trim().toUpperCase();

const computeDiscount = ({ coupon, amount }) => {
  if (!coupon || !coupon.isActive) {
    return { discountAmount: 0, reason: 'inactive' };
  }

  const now = new Date();

  if (coupon.startAt && now < new Date(coupon.startAt)) {
    return { discountAmount: 0, reason: 'not_started' };
  }

  if (coupon.endAt && now > new Date(coupon.endAt)) {
    return { discountAmount: 0, reason: 'expired' };
  }

  if (amount < Number(coupon.minOrderAmount || 0)) {
    return { discountAmount: 0, reason: 'below_min' };
  }

  let discountAmount = 0;
  if (coupon.discountType === 'fixed') {
    discountAmount = Number(coupon.discountValue || 0);
  } else {
    // percentage
    discountAmount = (Number(amount) * Number(coupon.discountValue || 0)) / 100;
  }

  discountAmount = Math.max(0, Math.min(discountAmount, Number(amount) || 0));

  return { discountAmount, reason: 'ok' };
};

// Admin: create coupon
router.post('/', authenticate, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const { error, value } = createCouponSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const coupon = await Coupon.create({
      ...value,
      code: toUpperCode(value.code),
      createdBy: req.user?.email || req.user?.id || '',
    });

    return res.status(201).json({ success: true, coupon });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message || 'Unable to create coupon' });
  }
});

// Customer/checkout: validate coupon
router.get('/:code', async (req, res) => {
  try {
    const code = toUpperCode(req.params.code);
    const coupon = await Coupon.findOne({ code });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    const now = new Date();
    const startOk = !coupon.startAt || now >= new Date(coupon.startAt);
    const endOk = !coupon.endAt || now <= new Date(coupon.endAt);

    return res.json({
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        maxUses: coupon.maxUses,
        perUserUses: coupon.perUserUses,
        isActive: coupon.isActive,
        startAt: coupon.startAt,
        endAt: coupon.endAt,
        activeNow: Boolean(coupon.isActive && startOk && endOk),
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || 'Unable to validate coupon' });
  }
});

// Customer: apply coupon (returns discount)
router.post('/apply', authenticate, async (req, res) => {
  try {
    const { error, value } = applyCouponSchema.validate(
      { ...req.body, userEmail: req.user?.email, userEmailFromClient: req.body?.userEmail },
      { stripUnknown: true }
    );

    // allow body.userEmail missing; we override above
    const couponCode = toUpperCode(value.couponCode);
    const coupon = await Coupon.findOne({ code: couponCode });

    if (!coupon) {
      return res.status(400).json({ success: false, message: 'Invalid coupon code' });
    }

    const { discountAmount, reason } = computeDiscount({ coupon, amount: Number(value.amount) });
    if (reason !== 'ok' || discountAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is not applicable',
        discountAmount: 0,
      });
    }

    return res.json({
      success: true,
      coupon: { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue },
      discountAmount,
      finalAmount: Math.max(0, Number(value.amount) - discountAmount),
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message || 'Unable to apply coupon' });
  }
});

module.exports = router;

