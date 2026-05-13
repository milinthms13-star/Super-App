const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const logger = require('../utils/logger');
const { authenticate, verifyAdmin } = require('../middleware/auth');
const {
  HyperlocalShop,
  HyperlocalAddress,
  HyperlocalOrder,
  HyperlocalPartner,
  HyperlocalCoupon,
  HyperlocalSubscription,
  HyperlocalWallet,
  HyperlocalAd,
  HyperlocalAdminConfig,
} = require('../models/hyperlocal');

const router = express.Router();

const DELIVERY_STATUS_FLOW = [
  'Placed',
  'Accepted by shop',
  'Partner assigned',
  'Picked up',
  'Out for delivery',
  'Delivered',
  'Cancelled/Refunded',
];

const STATUS_TRANSITIONS = {
  Placed: ['Accepted by shop', 'Cancelled/Refunded'],
  'Accepted by shop': ['Partner assigned', 'Cancelled/Refunded'],
  'Partner assigned': ['Picked up', 'Cancelled/Refunded'],
  'Picked up': ['Out for delivery', 'Cancelled/Refunded'],
  'Out for delivery': ['Delivered', 'Cancelled/Refunded'],
  Delivered: [],
  'Cancelled/Refunded': [],
};

const CATEGORIES = [
  'Grocery',
  'Pharmacy',
  'Food',
  'Parcel',
  'Vegetables & Fruits',
  'Meat & Fish',
  'Bakery',
  'Stationery',
  'Pet Supplies',
];

const PAYMENT_MODES = ['UPI', 'COD', 'Card', 'Wallet'];
const PHONE_REGEX = /^\+?[0-9]{8,15}$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

const uploadRoot = path.join(__dirname, '../uploads/hyperlocal');
const prescriptionDir = path.join(uploadRoot, 'prescriptions');
const kycDir = path.join(uploadRoot, 'kyc');

[uploadRoot, prescriptionDir, kycDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const isKyc = req.path.includes('/partners/apply');
    cb(null, isKyc ? kycDir : prescriptionDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Invalid file format'));
  },
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  message: 'Too many requests. Please try again in a few minutes.',
});

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many order actions. Please retry shortly.',
});

const id = (prefix) => `${prefix}-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
const isMongoReady = () => mongoose.connection.readyState === 1;

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();
const normalizePhone = (value = '') => String(value || '').replace(/[^\d+]/g, '').trim();
const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toCoordinates = (lat, lng) => ({ lat: toNum(lat, 0), lng: toNum(lng, 0) });
const getAuthenticatedEmail = (req) =>
  normalizeEmail(req.user?.email || req.auth?.email || req.userEmail || '');

const ensureAuthenticatedEmail = (req, res) => {
  const email = getAuthenticatedEmail(req);
  if (!email) {
    res.status(401).json({ success: false, message: 'Authenticated account email not available.' });
    return '';
  }
  return email;
};

const getPartnerByEmail = async (email) => {
  if (!email) return null;
  if (isMongoReady()) return HyperlocalPartner.findOne({ email });
  return store.partners.find((entry) => entry.email === email) || null;
};

const ensureAuthorizedPartner = async (req, res, requestedPartnerId = '', options = {}) => {
  const email = ensureAuthenticatedEmail(req, res);
  if (!email) return null;
  const partner = await getPartnerByEmail(email);
  if (!partner) {
    res.status(403).json({ success: false, message: 'Partner profile not found for this account.' });
    return null;
  }
  const partnerId = String(requestedPartnerId || req.params.partnerId || req.body.partnerId || '').trim();
  if (partnerId && partner.partnerId !== partnerId) {
    res.status(403).json({ success: false, message: 'Partner identity mismatch.' });
    return null;
  }
  if (options.requireApproved && String(partner.approvalStatus || '').toLowerCase() !== 'approved') {
    res.status(403).json({ success: false, message: 'Partner account is not approved yet.' });
    return null;
  }
  return partner;
};

const haversineKm = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad((b.lat || 0) - (a.lat || 0));
  const dLng = toRad((b.lng || 0) - (a.lng || 0));
  const lat1 = toRad(a.lat || 0);
  const lat2 = toRad(b.lat || 0);
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return earthRadius * c;
};

const sampleShops = [
  {
    shopId: 'HLS-1001',
    ownerEmail: 'owner.cityfresh@example.com',
    ownerPhone: '+919876543210',
    name: 'City Fresh Grocery',
    category: 'Grocery',
    description: 'Daily essentials and fresh produce.',
    open: true,
    rating: 4.7,
    deliveryRadiusKm: 6,
    minOrderAmount: 149,
    deliveryCharge: 28,
    taxPercent: 5,
    location: { lat: 8.5241, lng: 76.9366 },
    addressText: 'Pattom, Trivandrum',
    approvalStatus: 'approved',
    openingHours: [
      { day: 'Mon-Sun', open: '07:00', close: '22:00', closed: false },
    ],
    products: [
      { productId: 'PR-1', name: 'Aashirvaad Wheat Flour 5kg', category: 'Grocery', price: 295, mrp: 320, stockQty: 50, isActive: true, prescriptionRequired: false },
      { productId: 'PR-2', name: 'Fresh Milk 1L', category: 'Grocery', price: 54, mrp: 58, stockQty: 80, isActive: true, prescriptionRequired: false },
    ],
  },
  {
    shopId: 'HLS-1002',
    ownerEmail: 'owner.medicare@example.com',
    ownerPhone: '+919912345678',
    name: 'MediCare Express',
    category: 'Pharmacy',
    description: '24x7 pharmacy with verified prescription checks.',
    open: true,
    rating: 4.8,
    deliveryRadiusKm: 8,
    minOrderAmount: 99,
    deliveryCharge: 35,
    taxPercent: 5,
    location: { lat: 8.5370, lng: 76.9435 },
    addressText: 'Kesavadasapuram, Trivandrum',
    approvalStatus: 'approved',
    openingHours: [
      { day: 'Mon-Sun', open: '00:00', close: '23:59', closed: false },
    ],
    products: [
      { productId: 'PR-10', name: 'Paracetamol 650mg', category: 'Pharmacy', price: 35, mrp: 40, stockQty: 120, isActive: true, prescriptionRequired: false },
      { productId: 'PR-11', name: 'Antibiotic Course', category: 'Pharmacy', price: 420, mrp: 460, stockQty: 20, isActive: true, prescriptionRequired: true },
    ],
  },
  {
    shopId: 'HLS-1003',
    ownerEmail: 'owner.quickbite@example.com',
    ownerPhone: '+919845678901',
    name: 'QuickBite Kitchen',
    category: 'Food',
    description: 'Snacks and meals delivered fast.',
    open: true,
    rating: 4.5,
    deliveryRadiusKm: 5,
    minOrderAmount: 120,
    deliveryCharge: 30,
    taxPercent: 5,
    location: { lat: 8.5140, lng: 76.9450 },
    addressText: 'Vazhuthacaud, Trivandrum',
    approvalStatus: 'approved',
    openingHours: [
      { day: 'Mon-Sun', open: '10:00', close: '23:00', closed: false },
    ],
    products: [
      { productId: 'PR-30', name: 'Chicken Roll', category: 'Food', price: 95, mrp: 110, stockQty: 60, isActive: true, prescriptionRequired: false },
      { productId: 'PR-31', name: 'Veg Fried Rice', category: 'Food', price: 140, mrp: 155, stockQty: 45, isActive: true, prescriptionRequired: false },
    ],
  },
];

const sampleCoupons = [
  { code: 'SAVE50', type: 'fixed', value: 50, minOrder: 499, maxDiscount: 50, active: true },
  { code: 'FAST10', type: 'percent', value: 10, minOrder: 299, maxDiscount: 120, active: true },
  { code: 'FREEDEL', type: 'free-delivery', value: 0, minOrder: 699, maxDiscount: 0, active: true },
];

const sampleConfig = {
  configId: 'CFG-DEFAULT',
  zonePricing: {
    zoneName: 'Trivandrum Core',
    baseDeliveryCharge: 30,
    perKmCharge: 8,
    maxDeliveryRadiusKm: 10,
  },
  surgePricing: {
    enabled: false,
    multiplier: 1,
    reason: '',
  },
  commissionPercent: 12,
  platformFee: 8,
  emergencyMedicineFee: 20,
};

const store = {
  shops: [...sampleShops],
  coupons: [...sampleCoupons],
  addresses: [],
  orders: [],
  partners: [],
  wallets: [],
  subscriptions: [],
  ads: [],
  config: { ...sampleConfig },
  complaints: [],
  refunds: [],
};

const bootstrapMongo = async () => {
  if (!isMongoReady()) return;
  const [shopCount, couponCount, configCount] = await Promise.all([
    HyperlocalShop.countDocuments(),
    HyperlocalCoupon.countDocuments(),
    HyperlocalAdminConfig.countDocuments(),
  ]);
  if (!shopCount) await HyperlocalShop.insertMany(sampleShops);
  if (!couponCount) await HyperlocalCoupon.insertMany(sampleCoupons);
  if (!configCount) await HyperlocalAdminConfig.create(sampleConfig);
};

const orderSchema = Joi.object({
  userEmail: Joi.string().email().required(),
  userPhone: Joi.string().pattern(PHONE_REGEX).required(),
  addressId: Joi.string().allow('', null),
  address: Joi.object({
    fullName: Joi.string().min(2).max(80).required(),
    phone: Joi.string().pattern(PHONE_REGEX).required(),
    line1: Joi.string().min(3).max(150).required(),
    line2: Joi.string().allow('').max(150),
    city: Joi.string().min(2).max(80).required(),
    state: Joi.string().min(2).max(80).required(),
    pincode: Joi.string().pattern(PINCODE_REGEX).required(),
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  }).required(),
  items: Joi.array().items(
    Joi.object({
      shopId: Joi.string().required(),
      productId: Joi.string().required(),
      qty: Joi.number().integer().min(1).max(20).required(),
    })
  ).min(1).required(),
  deliveryType: Joi.string().valid('instant', 'scheduled').required(),
  paymentMode: Joi.string().valid(...PAYMENT_MODES).required(),
  couponCode: Joi.string().allow(''),
  multiShopMode: Joi.boolean().default(false),
  emergencyMedicine: Joi.boolean().default(false),
});

const addressSchema = Joi.object({
  userEmail: Joi.string().email().required(),
  fullName: Joi.string().min(2).max(80).required(),
  phone: Joi.string().pattern(PHONE_REGEX).required(),
  line1: Joi.string().min(3).max(150).required(),
  line2: Joi.string().allow('').max(150),
  landmark: Joi.string().allow('').max(150),
  city: Joi.string().min(2).max(80).required(),
  state: Joi.string().min(2).max(80).required(),
  pincode: Joi.string().pattern(PINCODE_REGEX).required(),
  lat: Joi.number().required(),
  lng: Joi.number().required(),
  isDefault: Joi.boolean().default(false),
});

const vendorShopSchema = Joi.object({
  ownerEmail: Joi.string().email().required(),
  ownerPhone: Joi.string().pattern(PHONE_REGEX).required(),
  name: Joi.string().min(2).max(120).required(),
  category: Joi.string().valid(...CATEGORIES).required(),
  description: Joi.string().allow('').max(500),
  deliveryRadiusKm: Joi.number().min(1).max(25).required(),
  minOrderAmount: Joi.number().min(0).max(100000).required(),
  deliveryCharge: Joi.number().min(0).max(2000).required(),
  taxPercent: Joi.number().min(0).max(28).required(),
  lat: Joi.number().required(),
  lng: Joi.number().required(),
  addressText: Joi.string().required(),
});

const productSchema = Joi.object({
  name: Joi.string().min(2).max(160).required(),
  category: Joi.string().min(2).max(80).required(),
  price: Joi.number().min(0).max(100000).required(),
  mrp: Joi.number().min(0).max(100000).required(),
  stockQty: Joi.number().integer().min(0).max(100000).required(),
  prescriptionRequired: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
  description: Joi.string().allow('').max(500),
});

const computeQuote = async (payload, prescriptionAttached = false) => {
  const shops = isMongoReady() ? await HyperlocalShop.find({ approvalStatus: 'approved' }).lean() : store.shops;
  const coupons = isMongoReady() ? await HyperlocalCoupon.find({ active: true }).lean() : store.coupons;
  const configDoc = isMongoReady() ? await HyperlocalAdminConfig.findOne({ configId: 'CFG-DEFAULT' }).lean() : store.config;
  const config = configDoc || store.config;

  const selectedItems = [];
  for (const item of payload.items || []) {
    const shop = shops.find((entry) => entry.shopId === item.shopId);
    if (!shop) throw new Error(`Shop not found for ${item.shopId}`);
    const product = (shop.products || []).find((entry) => entry.productId === item.productId && entry.isActive);
    if (!product) throw new Error(`Product not available for ${item.productId}`);
    if (product.stockQty < item.qty) throw new Error(`${product.name} has limited stock.`);
    if (product.prescriptionRequired && !prescriptionAttached) {
      throw new Error(`${product.name} requires prescription upload.`);
    }

    selectedItems.push({
      shopId: shop.shopId,
      shopName: shop.name,
      productId: product.productId,
      productName: product.name,
      qty: item.qty,
      unitPrice: product.price,
      lineTotal: product.price * item.qty,
      prescriptionRequired: Boolean(product.prescriptionRequired),
      shopDeliveryRadius: shop.deliveryRadiusKm,
      shopLocation: shop.location || { lat: 0, lng: 0 },
      shopTaxPercent: shop.taxPercent || 5,
    });
  }

  const subtotal = selectedItems.reduce((sum, entry) => sum + entry.lineTotal, 0);
  const uniqueShopIds = Array.from(new Set(selectedItems.map((entry) => entry.shopId)));
  const userLocation = toCoordinates(payload.address?.lat, payload.address?.lng);

  let deliveryCharge = 0;
  for (const shopId of uniqueShopIds) {
    const item = selectedItems.find((entry) => entry.shopId === shopId);
    const distance = haversineKm(userLocation, item.shopLocation);
    const maxRadius = Math.min(item.shopDeliveryRadius || 5, config.zonePricing.maxDeliveryRadiusKm || 10);
    if (distance > maxRadius) {
      throw new Error(`Delivery unavailable for ${item.shopName}. Outside ${maxRadius} km radius.`);
    }
    deliveryCharge += (config.zonePricing.baseDeliveryCharge || 30) + distance * (config.zonePricing.perKmCharge || 8);
  }

  if (config.surgePricing?.enabled) {
    deliveryCharge *= config.surgePricing.multiplier || 1;
  }

  if (payload.emergencyMedicine) {
    deliveryCharge += config.emergencyMedicineFee || 0;
  }

  let couponDiscount = 0;
  const couponCode = String(payload.couponCode || '').trim().toUpperCase();
  if (couponCode) {
    const coupon = coupons.find((entry) => entry.code === couponCode && entry.active);
    if (!coupon) throw new Error('Invalid coupon code.');
    if (subtotal < (coupon.minOrder || 0)) throw new Error(`Coupon requires minimum order of INR ${coupon.minOrder}.`);

    if (coupon.type === 'fixed') {
      couponDiscount = coupon.value;
    } else if (coupon.type === 'percent') {
      couponDiscount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount) couponDiscount = Math.min(couponDiscount, coupon.maxDiscount);
    } else if (coupon.type === 'free-delivery') {
      deliveryCharge = 0;
    }
  }

  const platformFee = config.platformFee || 0;
  const tax = (subtotal * (selectedItems[0]?.shopTaxPercent || 5)) / 100;
  const finalPayable = Math.max(0, subtotal + deliveryCharge + platformFee + tax - couponDiscount);

  return {
    items: selectedItems.map(({ shopDeliveryRadius, shopLocation, shopTaxPercent, ...rest }) => rest),
    subtotal: Number(subtotal.toFixed(2)),
    deliveryCharge: Number(deliveryCharge.toFixed(2)),
    platformFee: Number(platformFee.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    couponCode,
    couponDiscount: Number(couponDiscount.toFixed(2)),
    finalPayable: Number(finalPayable.toFixed(2)),
  };
};

const applyOrderStatusTransition = async (orderId, nextStatus, note = '') => {
  if (!DELIVERY_STATUS_FLOW.includes(nextStatus)) {
    throw new Error('Invalid status.');
  }

  if (isMongoReady()) {
    const order = await HyperlocalOrder.findOne({ orderId });
    if (!order) throw new Error('Order not found.');
    const allowed = STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Invalid transition from ${order.status} to ${nextStatus}.`);
    }
    order.status = nextStatus;
    order.timeline = [...(order.timeline || []), { status: nextStatus, note, at: new Date() }];
    order.updatedAt = new Date();
    await order.save();
    return order.toObject();
  }

  const idx = store.orders.findIndex((entry) => entry.orderId === orderId);
  if (idx === -1) throw new Error('Order not found.');
  const order = store.orders[idx];
  const allowed = STATUS_TRANSITIONS[order.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Invalid transition from ${order.status} to ${nextStatus}.`);
  }
  const updated = {
    ...order,
    status: nextStatus,
    timeline: [...(order.timeline || []), { status: nextStatus, note, at: new Date() }],
    updatedAt: new Date(),
  };
  store.orders[idx] = updated;
  return updated;
};

router.get('/bootstrap', async (_req, res) => {
  try {
    await bootstrapMongo();
    res.json({
      success: true,
      data: {
        categories: CATEGORIES,
        paymentModes: PAYMENT_MODES,
        statusFlow: DELIVERY_STATUS_FLOW,
        featureFlags: {
          grocery: true,
          pharmacy: true,
          food: true,
          parcel: true,
          multiShop: true,
          subscriptions: true,
          walletCashback: true,
          emergencyMedicine: true,
          localAds: true,
          whatsappUpdates: true,
        },
      },
    });
  } catch (error) {
    logger.error('hyperlocal bootstrap error:', error);
    res.status(500).json({ success: false, message: 'Unable to load hyperlocal bootstrap.' });
  }
});

router.get('/shops', async (req, res) => {
  try {
    const { category = '', search = '', lat, lng } = req.query;
    const userLocation = lat && lng ? toCoordinates(lat, lng) : null;
    const source = isMongoReady() ? await HyperlocalShop.find({ approvalStatus: 'approved' }).lean() : store.shops;

    const filtered = source
      .filter((shop) => !category || category === 'All' || shop.category === category)
      .filter((shop) => !search || `${shop.name} ${shop.description}`.toLowerCase().includes(String(search).toLowerCase()))
      .map((shop) => {
        const distanceKm = userLocation ? haversineKm(userLocation, shop.location || { lat: 0, lng: 0 }) : null;
        return {
          ...shop,
          distanceKm: distanceKm === null ? null : Number(distanceKm.toFixed(2)),
          deliveryEligible: distanceKm === null ? true : distanceKm <= (shop.deliveryRadiusKm || 5),
        };
      })
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    res.json({ success: true, data: { shops: filtered } });
  } catch (error) {
    logger.error('hyperlocal shops error:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch shops.' });
  }
});

router.post('/cart/quote', authenticate, writeLimiter, async (req, res) => {
  try {
    const authEmail = ensureAuthenticatedEmail(req, res);
    if (!authEmail) return;
    const payload = {
      ...req.body,
      userEmail: authEmail,
      userPhone: normalizePhone(req.body.userPhone),
      items: Array.isArray(req.body.items) ? req.body.items : [],
      address: req.body.address || {},
    };
    const { error, value } = orderSchema.validate(payload, { allowUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const quote = await computeQuote(value, Boolean(req.body.prescriptionAttached));
    res.json({ success: true, data: quote });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Unable to compute quote.' });
  }
});

router.post('/orders', authenticate, orderLimiter, upload.single('prescription'), async (req, res) => {
  try {
    const authEmail = ensureAuthenticatedEmail(req, res);
    if (!authEmail) return;
    const payload = {
      ...req.body,
      userEmail: authEmail,
      userPhone: normalizePhone(req.body.userPhone),
      items: typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items,
      address: typeof req.body.address === 'string' ? JSON.parse(req.body.address) : req.body.address,
      multiShopMode: String(req.body.multiShopMode) === 'true',
      emergencyMedicine: String(req.body.emergencyMedicine) === 'true',
    };

    const { error, value } = orderSchema.validate(payload, { allowUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const quote = await computeQuote(value, Boolean(req.file));
    const orderId = id('HLORD');
    const order = {
      orderId,
      userEmail: value.userEmail,
      userPhone: value.userPhone,
      paymentMode: value.paymentMode,
      deliveryType: value.deliveryType,
      address: { ...value.address, location: toCoordinates(value.address.lat, value.address.lng) },
      items: quote.items,
      multiShopMode: value.multiShopMode,
      isEmergencyMedicine: value.emergencyMedicine,
      subtotal: quote.subtotal,
      deliveryCharge: quote.deliveryCharge,
      platformFee: quote.platformFee,
      tax: quote.tax,
      couponCode: quote.couponCode,
      couponDiscount: quote.couponDiscount,
      finalPayable: quote.finalPayable,
      status: 'Placed',
      timeline: [{ status: 'Placed', note: 'Order created by user', at: new Date() }],
      assignedPartnerId: '',
      partnerLocation: { lat: 0, lng: 0 },
      navigationLink: '',
      prescriptionFile: req.file ? `/uploads/hyperlocal/prescriptions/${req.file.filename}` : '',
      complaintStatus: '',
      refundStatus: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isMongoReady()) {
      await HyperlocalOrder.create(order);
    } else {
      store.orders.unshift(order);
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      data: { orderId, order },
    });
  } catch (error) {
    logger.error('hyperlocal order create error:', error);
    res.status(400).json({ success: false, message: error.message || 'Unable to place order.' });
  }
});

router.get('/orders', authenticate, async (req, res) => {
  try {
    const email = ensureAuthenticatedEmail(req, res);
    if (!email) return;
    const orders = isMongoReady()
      ? await HyperlocalOrder.find({ userEmail: email }).sort({ createdAt: -1 }).lean()
      : store.orders.filter((entry) => entry.userEmail === email);
    res.json({ success: true, data: { orders } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to fetch orders.' });
  }
});

router.get('/orders/:orderId/track', authenticate, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const email = ensureAuthenticatedEmail(req, res);
    if (!email) return;
    const order = isMongoReady()
      ? await HyperlocalOrder.findOne({ orderId, userEmail: email }).lean()
      : store.orders.find((entry) => entry.orderId === orderId && entry.userEmail === email);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, data: { orderId, status: order.status, timeline: order.timeline || [], order } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to fetch tracking.' });
  }
});

router.post('/orders/:orderId/cancel', authenticate, writeLimiter, async (req, res) => {
  try {
    const authEmail = ensureAuthenticatedEmail(req, res);
    if (!authEmail) return;
    const sourceOrder = isMongoReady()
      ? await HyperlocalOrder.findOne({ orderId: req.params.orderId, userEmail: authEmail })
      : store.orders.find((entry) => entry.orderId === req.params.orderId && entry.userEmail === authEmail);
    if (!sourceOrder) return res.status(404).json({ success: false, message: 'Order not found.' });
    const updated = await applyOrderStatusTransition(req.params.orderId, 'Cancelled/Refunded', String(req.body.reason || 'Cancelled by user'));
    return res.json({ success: true, message: 'Order cancelled.', data: { order: updated } });
  } catch (error) {
    const statusCode = error.message === 'Order not found.' ? 404 : 400;
    return res.status(statusCode).json({ success: false, message: error.message || 'Unable to cancel order.' });
  }
});

router.post('/orders/:orderId/refund-request', authenticate, writeLimiter, async (req, res) => {
  try {
    const authEmail = ensureAuthenticatedEmail(req, res);
    if (!authEmail) return;
    const reason = String(req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ success: false, message: 'Refund reason is required.' });
    const order = isMongoReady()
      ? await HyperlocalOrder.findOne({ orderId: req.params.orderId, userEmail: authEmail })
      : store.orders.find((entry) => entry.orderId === req.params.orderId && entry.userEmail === authEmail);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const refundEntry = {
      refundId: id('HLRF'),
      orderId: req.params.orderId,
      userEmail: order.userEmail,
      amount: order.finalPayable,
      reason,
      status: 'pending',
      createdAt: new Date(),
    };

    store.refunds.unshift(refundEntry);
    if (isMongoReady()) {
      order.refundStatus = 'pending';
      await order.save();
    } else {
      const idx = store.orders.findIndex((entry) => entry.orderId === req.params.orderId);
      if (idx !== -1) store.orders[idx].refundStatus = 'pending';
    }
    return res.status(201).json({ success: true, message: 'Refund request submitted.', data: { refund: refundEntry } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to submit refund request.' });
  }
});

router.post('/orders/:orderId/complaint', authenticate, writeLimiter, async (req, res) => {
  const authEmail = ensureAuthenticatedEmail(req, res);
  if (!authEmail) return;
  const issue = String(req.body.issue || '').trim();
  if (!issue) return res.status(400).json({ success: false, message: 'Complaint issue is required.' });
  const sourceOrder = isMongoReady()
    ? await HyperlocalOrder.findOne({ orderId: req.params.orderId, userEmail: authEmail }).lean()
    : store.orders.find((entry) => entry.orderId === req.params.orderId && entry.userEmail === authEmail);
  if (!sourceOrder) return res.status(404).json({ success: false, message: 'Order not found.' });
  const complaint = {
    complaintId: id('HLCM'),
    orderId: req.params.orderId,
    userEmail: authEmail,
    issue,
    status: 'open',
    createdAt: new Date(),
  };
  store.complaints.unshift(complaint);
  return res.status(201).json({ success: true, data: { complaint } });
});

router.patch('/orders/:orderId/status', authenticate, verifyAdmin, writeLimiter, async (req, res) => {
  try {
    const { status, note = '' } = req.body;
    const updated = await applyOrderStatusTransition(req.params.orderId, status, note);
    res.json({ success: true, message: 'Order status updated.', data: { order: updated } });
  } catch (error) {
    const statusCode = error.message === 'Order not found.' ? 404 : 400;
    res.status(statusCode).json({ success: false, message: error.message || 'Unable to update order status.' });
  }
});

router.post('/addresses', authenticate, writeLimiter, async (req, res) => {
  try {
    const authEmail = ensureAuthenticatedEmail(req, res);
    if (!authEmail) return;
    const payload = { ...req.body, userEmail: authEmail, phone: normalizePhone(req.body.phone) };
    const { error, value } = addressSchema.validate(payload);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const address = {
      addressId: id('HLADDR'),
      userEmail: value.userEmail,
      fullName: value.fullName,
      phone: value.phone,
      line1: value.line1,
      line2: value.line2,
      landmark: value.landmark,
      city: value.city,
      state: value.state,
      pincode: value.pincode,
      location: toCoordinates(value.lat, value.lng),
      isDefault: value.isDefault,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isMongoReady()) {
      if (value.isDefault) await HyperlocalAddress.updateMany({ userEmail: value.userEmail }, { $set: { isDefault: false } });
      await HyperlocalAddress.create(address);
    } else {
      if (value.isDefault) {
        store.addresses = store.addresses.map((entry) => (entry.userEmail === value.userEmail ? { ...entry, isDefault: false } : entry));
      }
      store.addresses.push(address);
    }
    res.status(201).json({ success: true, data: { address } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to save address.' });
  }
});

router.get('/addresses', authenticate, async (req, res) => {
  try {
    const email = ensureAuthenticatedEmail(req, res);
    if (!email) return;
    const addresses = isMongoReady()
      ? await HyperlocalAddress.find({ userEmail: email }).sort({ isDefault: -1, createdAt: -1 }).lean()
      : store.addresses.filter((entry) => entry.userEmail === email).sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
    res.json({ success: true, data: { addresses } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load addresses.' });
  }
});

router.post('/vendor/shops', authenticate, writeLimiter, async (req, res) => {
  try {
    const ownerEmail = ensureAuthenticatedEmail(req, res);
    if (!ownerEmail) return;
    const payload = { ...req.body, ownerEmail, ownerPhone: normalizePhone(req.body.ownerPhone) };
    const { error, value } = vendorShopSchema.validate(payload);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const shop = {
      shopId: id('HLS'),
      ...value,
      open: true,
      rating: 0,
      location: toCoordinates(value.lat, value.lng),
      approvalStatus: 'pending',
      openingHours: [{ day: 'Mon-Sun', open: '09:00', close: '21:00', closed: false }],
      products: [],
      settlementHistory: [],
      sales: { totalOrders: 0, grossSales: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    delete shop.lat;
    delete shop.lng;

    if (isMongoReady()) await HyperlocalShop.create(shop);
    else store.shops.push(shop);
    res.status(201).json({ success: true, message: 'Shop application submitted for approval.', data: { shop } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to submit shop.' });
  }
});

router.get('/vendor/shops', authenticate, async (req, res) => {
  const ownerEmail = ensureAuthenticatedEmail(req, res);
  if (!ownerEmail) return;
  const shops = isMongoReady()
    ? await HyperlocalShop.find({ ownerEmail }).sort({ createdAt: -1 }).lean()
    : store.shops.filter((entry) => entry.ownerEmail === ownerEmail);
  return res.json({ success: true, data: { shops } });
});

router.post('/vendor/shops/:shopId/products', authenticate, writeLimiter, async (req, res) => {
  try {
    const ownerEmail = ensureAuthenticatedEmail(req, res);
    if (!ownerEmail) return;
    const { error, value } = productSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const newProduct = { productId: id('PR'), ...value };

    if (isMongoReady()) {
      const shop = await HyperlocalShop.findOne({ shopId: req.params.shopId, ownerEmail });
      if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });
      shop.products.push(newProduct);
      await shop.save();
    } else {
      const idx = store.shops.findIndex((entry) => entry.shopId === req.params.shopId && entry.ownerEmail === ownerEmail);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Shop not found.' });
      store.shops[idx].products = [...(store.shops[idx].products || []), newProduct];
    }
    res.status(201).json({ success: true, data: { product: newProduct } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to add product.' });
  }
});

router.patch('/vendor/shops/:shopId/products/:productId', authenticate, writeLimiter, async (req, res) => {
  try {
    const ownerEmail = ensureAuthenticatedEmail(req, res);
    if (!ownerEmail) return;
    const { error, value } = productSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    if (isMongoReady()) {
      const shop = await HyperlocalShop.findOne({ shopId: req.params.shopId, ownerEmail });
      if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });
      const productIndex = (shop.products || []).findIndex((entry) => entry.productId === req.params.productId);
      if (productIndex === -1) return res.status(404).json({ success: false, message: 'Product not found.' });
      shop.products[productIndex] = { ...shop.products[productIndex].toObject(), ...value };
      await shop.save();
      return res.json({ success: true, message: 'Product updated.', data: { product: shop.products[productIndex] } });
    }

    const shopIndex = store.shops.findIndex((entry) => entry.shopId === req.params.shopId && entry.ownerEmail === ownerEmail);
    if (shopIndex === -1) return res.status(404).json({ success: false, message: 'Shop not found.' });
    const productIndex = (store.shops[shopIndex].products || []).findIndex((entry) => entry.productId === req.params.productId);
    if (productIndex === -1) return res.status(404).json({ success: false, message: 'Product not found.' });
    store.shops[shopIndex].products[productIndex] = { ...store.shops[shopIndex].products[productIndex], ...value };
    return res.json({ success: true, message: 'Product updated.', data: { product: store.shops[shopIndex].products[productIndex] } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update product.' });
  }
});

router.patch('/vendor/shops/:shopId/open-status', authenticate, writeLimiter, async (req, res) => {
  const ownerEmail = ensureAuthenticatedEmail(req, res);
  if (!ownerEmail) return;
  const open = Boolean(req.body.open);
  if (isMongoReady()) {
    const result = await HyperlocalShop.updateOne({ shopId: req.params.shopId, ownerEmail }, { $set: { open } });
    if (!result.matchedCount) return res.status(404).json({ success: false, message: 'Shop not found.' });
  } else {
    const shopIndex = store.shops.findIndex((entry) => entry.shopId === req.params.shopId && entry.ownerEmail === ownerEmail);
    if (shopIndex === -1) return res.status(404).json({ success: false, message: 'Shop not found.' });
    store.shops[shopIndex].open = open;
  }
  return res.json({ success: true, message: `Shop is now ${open ? 'open' : 'closed'}.` });
});

router.patch('/vendor/shops/:shopId/opening-hours', authenticate, writeLimiter, async (req, res) => {
  const ownerEmail = ensureAuthenticatedEmail(req, res);
  if (!ownerEmail) return;
  const hours = Array.isArray(req.body.openingHours) ? req.body.openingHours : [];
  if (!hours.length) return res.status(400).json({ success: false, message: 'openingHours array is required.' });
  if (isMongoReady()) {
    const result = await HyperlocalShop.updateOne({ shopId: req.params.shopId, ownerEmail }, { $set: { openingHours: hours } });
    if (!result.matchedCount) return res.status(404).json({ success: false, message: 'Shop not found.' });
  } else {
    const shopIndex = store.shops.findIndex((entry) => entry.shopId === req.params.shopId && entry.ownerEmail === ownerEmail);
    if (shopIndex === -1) return res.status(404).json({ success: false, message: 'Shop not found.' });
    store.shops[shopIndex].openingHours = hours;
  }
  return res.json({ success: true, message: 'Opening hours updated.' });
});

router.patch('/vendor/orders/:orderId/action', authenticate, writeLimiter, async (req, res) => {
  try {
    const ownerEmail = ensureAuthenticatedEmail(req, res);
    if (!ownerEmail) return;
    const action = String(req.body.action || '').toLowerCase();
    const status = action === 'accept' ? 'Accepted by shop' : action === 'reject' ? 'Cancelled/Refunded' : '';
    if (!status) return res.status(400).json({ success: false, message: 'Action must be accept or reject.' });
    const shops = isMongoReady()
      ? await HyperlocalShop.find({ ownerEmail }).lean()
      : store.shops.filter((entry) => entry.ownerEmail === ownerEmail);
    const ownedShopIds = new Set(shops.map((entry) => entry.shopId));
    const sourceOrder = isMongoReady()
      ? await HyperlocalOrder.findOne({ orderId: req.params.orderId }).lean()
      : store.orders.find((entry) => entry.orderId === req.params.orderId);
    if (!sourceOrder) return res.status(404).json({ success: false, message: 'Order not found.' });
    const isOrderForVendor = (sourceOrder.items || []).some((item) => ownedShopIds.has(item.shopId));
    if (!isOrderForVendor) return res.status(403).json({ success: false, message: 'Not authorized for this order.' });
    const updated = await applyOrderStatusTransition(req.params.orderId, status, action === 'accept' ? 'Accepted by vendor' : 'Rejected by vendor');
    return res.json({ success: true, message: 'Vendor order action applied.', data: { order: updated } });
  } catch (error) {
    const statusCode = error.message === 'Order not found.' ? 404 : 400;
    return res.status(statusCode).json({ success: false, message: error.message || 'Unable to apply vendor action.' });
  }
});

router.get('/vendor/orders', authenticate, async (req, res) => {
  const ownerEmail = ensureAuthenticatedEmail(req, res);
  if (!ownerEmail) return;
  const shops = isMongoReady()
    ? await HyperlocalShop.find({ ownerEmail }).lean()
    : store.shops.filter((entry) => entry.ownerEmail === ownerEmail);
  const shopIds = new Set(shops.map((entry) => entry.shopId));
  const orders = (isMongoReady() ? await HyperlocalOrder.find().sort({ createdAt: -1 }).lean() : store.orders)
    .filter((order) => order.items.some((item) => shopIds.has(item.shopId)));
  return res.json({ success: true, data: { orders } });
});

router.get('/vendor/settlements', authenticate, async (req, res) => {
  const ownerEmail = ensureAuthenticatedEmail(req, res);
  if (!ownerEmail) return;
  const shops = isMongoReady() ? await HyperlocalShop.find({ ownerEmail }).lean() : store.shops.filter((entry) => entry.ownerEmail === ownerEmail);
  const shopIds = new Set(shops.map((entry) => entry.shopId));
  const orders = (isMongoReady() ? await HyperlocalOrder.find().lean() : store.orders)
    .filter((order) => order.status === 'Delivered' && order.items.some((item) => shopIds.has(item.shopId)));

  const config = isMongoReady() ? await HyperlocalAdminConfig.findOne({ configId: 'CFG-DEFAULT' }).lean() : store.config;
  const commissionPercent = config?.commissionPercent || 12;
  const gross = orders.reduce((sum, entry) => sum + Number(entry.subtotal || 0), 0);
  const commission = (gross * commissionPercent) / 100;
  const net = gross - commission;
  return res.json({
    success: true,
    data: {
      grossSales: Number(gross.toFixed(2)),
      commissionPercent,
      commissionAmount: Number(commission.toFixed(2)),
      netSettlement: Number(net.toFixed(2)),
      deliveredOrders: orders.length,
    },
  });
});

router.get('/vendor/analytics', authenticate, async (req, res) => {
  const ownerEmail = ensureAuthenticatedEmail(req, res);
  if (!ownerEmail) return;
  const shops = isMongoReady() ? await HyperlocalShop.find({ ownerEmail }).lean() : store.shops.filter((entry) => entry.ownerEmail === ownerEmail);
  const shopIds = new Set(shops.map((entry) => entry.shopId));
  const orders = isMongoReady() ? await HyperlocalOrder.find().lean() : store.orders;
  const relevant = orders.filter((order) => order.items.some((item) => shopIds.has(item.shopId)));
  return res.json({
    success: true,
    data: {
      totalOrders: relevant.length,
      delivered: relevant.filter((entry) => entry.status === 'Delivered').length,
      cancelled: relevant.filter((entry) => entry.status === 'Cancelled/Refunded').length,
      avgOrderValue: relevant.length ? Number((relevant.reduce((sum, entry) => sum + entry.finalPayable, 0) / relevant.length).toFixed(2)) : 0,
    },
  });
});

router.post('/partners/apply', authenticate, writeLimiter, upload.array('kycDocs', 3), async (req, res) => {
  try {
    const authEmail = ensureAuthenticatedEmail(req, res);
    if (!authEmail) return;
    const payload = {
      fullName: String(req.body.fullName || '').trim(),
      phone: normalizePhone(req.body.phone),
      email: authEmail,
      area: String(req.body.area || '').trim(),
      vehicleType: String(req.body.vehicleType || 'Bike').trim(),
    };
    if (!payload.fullName || !PHONE_REGEX.test(payload.phone)) {
      return res.status(400).json({ success: false, message: 'Valid full name and phone are required.' });
    }
    const existingPartner = isMongoReady()
      ? await HyperlocalPartner.findOne({ email: authEmail }).lean()
      : store.partners.find((entry) => entry.email === authEmail);
    if (existingPartner) {
      return res.json({ success: true, message: 'Partner profile already exists for this account.', data: { partner: existingPartner } });
    }
    const partner = {
      partnerId: id('HLP'),
      ...payload,
      online: false,
      approvalStatus: 'pending',
      currentOrderId: '',
      walletBalance: 0,
      payoutHistory: [],
      kycStatus: req.files?.length ? 'submitted' : 'pending',
      kycDocs: (req.files || []).map((file) => ({
        docType: 'kyc',
        fileName: `/uploads/hyperlocal/kyc/${file.filename}`,
        uploadedAt: new Date(),
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (isMongoReady()) await HyperlocalPartner.create(partner);
    else store.partners.push(partner);
    res.status(201).json({ success: true, message: 'Partner application submitted.', data: { partner } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to submit partner application.' });
  }
});

router.get('/partners/me', authenticate, async (req, res) => {
  const email = ensureAuthenticatedEmail(req, res);
  if (!email) return;
  const partner = isMongoReady()
    ? await HyperlocalPartner.findOne({ email }).lean()
    : store.partners.find((entry) => entry.email === email);
  if (!partner) return res.status(404).json({ success: false, message: 'Partner profile not found.' });
  return res.json({ success: true, data: { partner } });
});

router.get('/partners/jobs', authenticate, async (req, res) => {
  const partner = await ensureAuthorizedPartner(req, res, '', { requireApproved: true });
  if (!partner) return;
  const jobs = (isMongoReady() ? await HyperlocalOrder.find().sort({ createdAt: -1 }).lean() : store.orders).filter(
    (order) =>
      order.status === 'Accepted by shop' ||
      (order.status === 'Partner assigned' && String(order.assignedPartnerId || '') === String(partner.partnerId))
  );
  return res.json({ success: true, data: { jobs } });
});

router.patch('/partners/:partnerId/availability', authenticate, writeLimiter, async (req, res) => {
  const partner = await ensureAuthorizedPartner(req, res, req.params.partnerId, { requireApproved: true });
  if (!partner) return;
  const online = Boolean(req.body.online);
  if (isMongoReady()) {
    await HyperlocalPartner.updateOne({ partnerId: partner.partnerId }, { $set: { online } });
  } else {
    const idx = store.partners.findIndex((entry) => entry.partnerId === partner.partnerId);
    if (idx !== -1) store.partners[idx].online = online;
  }
  return res.json({ success: true, message: `Partner is now ${online ? 'online' : 'offline'}.` });
});

router.post('/partners/jobs/:orderId/accept', authenticate, writeLimiter, async (req, res) => {
  try {
    const partner = await ensureAuthorizedPartner(req, res, '', { requireApproved: true });
    if (!partner) return;
    const partnerId = partner.partnerId;
    const updated = await applyOrderStatusTransition(req.params.orderId, 'Partner assigned', `Partner ${partnerId} assigned`);
    if (isMongoReady()) {
      await HyperlocalOrder.updateOne({ orderId: req.params.orderId }, { $set: { assignedPartnerId: partnerId } });
      await HyperlocalPartner.updateOne({ partnerId }, { $set: { currentOrderId: req.params.orderId } });
    } else {
      const orderIdx = store.orders.findIndex((entry) => entry.orderId === req.params.orderId);
      if (orderIdx !== -1) store.orders[orderIdx].assignedPartnerId = partnerId;
      const partnerIdx = store.partners.findIndex((entry) => entry.partnerId === partnerId);
      if (partnerIdx !== -1) store.partners[partnerIdx].currentOrderId = req.params.orderId;
    }
    return res.json({ success: true, message: 'Delivery job accepted.', data: { order: { ...updated, assignedPartnerId: partnerId } } });
  } catch (error) {
    const statusCode = error.message === 'Order not found.' ? 404 : 400;
    return res.status(statusCode).json({ success: false, message: error.message || 'Unable to accept delivery job.' });
  }
});

router.post('/partners/jobs/:orderId/reject', authenticate, writeLimiter, async (req, res) => {
  try {
    const partner = await ensureAuthorizedPartner(req, res, '', { requireApproved: true });
    if (!partner) return;
    const orderId = req.params.orderId;
    const partnerId = partner.partnerId;
    const note = String(req.body.note || 'Rejected by partner').trim();
    const sourceOrder = isMongoReady()
      ? await HyperlocalOrder.findOne({ orderId })
      : store.orders.find((entry) => entry.orderId === orderId);
    if (!sourceOrder) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (sourceOrder.status === 'Partner assigned' && String(sourceOrder.assignedPartnerId || '') === partnerId) {
      const updated = await applyOrderStatusTransition(orderId, 'Cancelled/Refunded', note);
      return res.json({ success: true, message: 'Assigned job rejected and marked cancelled.', data: { order: updated } });
    }
    if (sourceOrder.status === 'Partner assigned' && String(sourceOrder.assignedPartnerId || '') !== partnerId) {
      return res.status(403).json({ success: false, message: 'This delivery is assigned to another partner.' });
    }

    return res.json({ success: true, message: 'Job rejection recorded. Other partners can pick this order.' });
  } catch (error) {
    const statusCode = error.message === 'Order not found.' ? 404 : 400;
    return res.status(statusCode).json({ success: false, message: error.message || 'Unable to reject delivery job.' });
  }
});

router.post('/partners/jobs/:orderId/update', authenticate, writeLimiter, async (req, res) => {
  try {
    const partner = await ensureAuthorizedPartner(req, res, '', { requireApproved: true });
    if (!partner) return;
    const status = req.body.status;
    if (!['Picked up', 'Out for delivery', 'Delivered'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid partner status update.' });
    }
    const sourceOrder = isMongoReady()
      ? await HyperlocalOrder.findOne({ orderId: req.params.orderId }).lean()
      : store.orders.find((entry) => entry.orderId === req.params.orderId);
    if (!sourceOrder) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (String(sourceOrder.assignedPartnerId || '') !== String(partner.partnerId)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this delivery.' });
    }
    const updated = await applyOrderStatusTransition(req.params.orderId, status, req.body.note || `Updated by partner to ${status}`);
    return res.json({ success: true, message: 'Delivery status updated.', data: { order: updated } });
  } catch (error) {
    const statusCode = error.message === 'Order not found.' ? 404 : 400;
    return res.status(statusCode).json({ success: false, message: error.message || 'Unable to update delivery status.' });
  }
});

router.get('/partners/:partnerId/wallet', authenticate, async (req, res) => {
  const authorizedPartner = await ensureAuthorizedPartner(req, res, req.params.partnerId, { requireApproved: true });
  if (!authorizedPartner) return;
  const partnerId = String(authorizedPartner.partnerId || '').trim();
  const partner = isMongoReady()
    ? await HyperlocalPartner.findOne({ partnerId }).lean()
    : store.partners.find((entry) => entry.partnerId === partnerId);
  if (!partner) return res.status(404).json({ success: false, message: 'Partner not found.' });
  return res.json({ success: true, data: { walletBalance: partner.walletBalance || 0, payoutHistory: partner.payoutHistory || [] } });
});

router.post('/partners/:partnerId/payouts/request', authenticate, writeLimiter, async (req, res) => {
  const authorizedPartner = await ensureAuthorizedPartner(req, res, req.params.partnerId, { requireApproved: true });
  if (!authorizedPartner) return;
  const amount = toNum(req.body.amount, 0);
  if (amount <= 0) return res.status(400).json({ success: false, message: 'amount must be greater than 0.' });
  const payout = { payoutId: id('HLPAY'), amount, status: 'requested', requestedAt: new Date() };
  if (isMongoReady()) {
    const partner = await HyperlocalPartner.findOne({ partnerId: authorizedPartner.partnerId });
    if (!partner) return res.status(404).json({ success: false, message: 'Partner not found.' });
    partner.payoutHistory.push(payout);
    await partner.save();
  } else {
    const idx = store.partners.findIndex((entry) => entry.partnerId === authorizedPartner.partnerId);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Partner not found.' });
    store.partners[idx].payoutHistory.push(payout);
  }
  return res.status(201).json({ success: true, message: 'Payout request submitted.', data: { payout } });
});

router.patch('/admin/shops/:shopId/approval', authenticate, verifyAdmin, writeLimiter, async (req, res) => {
  const status = String(req.body.status || '');
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be approved or rejected.' });
  }
  if (isMongoReady()) {
    await HyperlocalShop.updateOne({ shopId: req.params.shopId }, { $set: { approvalStatus: status } });
  } else {
    const idx = store.shops.findIndex((entry) => entry.shopId === req.params.shopId);
    if (idx !== -1) store.shops[idx].approvalStatus = status;
  }
  return res.json({ success: true, message: `Shop ${status}.` });
});

router.patch('/admin/partners/:partnerId/approval', authenticate, verifyAdmin, writeLimiter, async (req, res) => {
  const status = String(req.body.status || '');
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be approved or rejected.' });
  }
  if (isMongoReady()) {
    await HyperlocalPartner.updateOne({ partnerId: req.params.partnerId }, { $set: { approvalStatus: status } });
  } else {
    const idx = store.partners.findIndex((entry) => entry.partnerId === req.params.partnerId);
    if (idx !== -1) store.partners[idx].approvalStatus = status;
  }
  return res.json({ success: true, message: `Partner ${status}.` });
});

router.get('/admin/pending-shops', authenticate, verifyAdmin, async (_req, res) => {
  const shops = isMongoReady()
    ? await HyperlocalShop.find({ approvalStatus: 'pending' }).lean()
    : store.shops.filter((entry) => entry.approvalStatus === 'pending');
  return res.json({ success: true, data: { shops } });
});

router.get('/admin/pending-partners', authenticate, verifyAdmin, async (_req, res) => {
  const partners = isMongoReady()
    ? await HyperlocalPartner.find({ approvalStatus: 'pending' }).lean()
    : store.partners.filter((entry) => entry.approvalStatus === 'pending');
  return res.json({ success: true, data: { partners } });
});

router.patch('/admin/config', authenticate, verifyAdmin, writeLimiter, async (req, res) => {
  try {
    const commissionPercent = toNum(req.body.commissionPercent, 12);
    const maxDeliveryRadiusKm = toNum(req.body.maxDeliveryRadiusKm, 10);
    const platformFee = toNum(req.body.platformFee, 8);
    const surgeMultiplier = toNum(req.body.surgeMultiplier, 1);
    if (commissionPercent < 0 || commissionPercent > 40) return res.status(400).json({ success: false, message: 'commissionPercent must be between 0 and 40.' });
    if (maxDeliveryRadiusKm < 1 || maxDeliveryRadiusKm > 30) return res.status(400).json({ success: false, message: 'maxDeliveryRadiusKm must be between 1 and 30.' });
    if (surgeMultiplier < 1 || surgeMultiplier > 3) return res.status(400).json({ success: false, message: 'surgeMultiplier must be between 1 and 3.' });

    const nextConfig = {
      configId: 'CFG-DEFAULT',
      zonePricing: {
        zoneName: String(req.body.zoneName || 'Trivandrum Core'),
        baseDeliveryCharge: toNum(req.body.baseDeliveryCharge, 30),
        perKmCharge: toNum(req.body.perKmCharge, 8),
        maxDeliveryRadiusKm,
      },
      surgePricing: {
        enabled: Boolean(req.body.surgeEnabled),
        multiplier: surgeMultiplier,
        reason: String(req.body.surgeReason || ''),
      },
      commissionPercent,
      platformFee,
      emergencyMedicineFee: toNum(req.body.emergencyMedicineFee, 20),
    };

    if (isMongoReady()) {
      await HyperlocalAdminConfig.updateOne({ configId: 'CFG-DEFAULT' }, { $set: nextConfig }, { upsert: true });
    } else {
      store.config = nextConfig;
    }
    res.json({ success: true, message: 'Admin pricing config updated.', data: { config: nextConfig } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to update config.' });
  }
});

router.get('/admin/analytics', authenticate, verifyAdmin, async (_req, res) => {
  const orders = isMongoReady() ? await HyperlocalOrder.find().lean() : store.orders;
  const shops = isMongoReady() ? await HyperlocalShop.find().lean() : store.shops;
  const partners = isMongoReady() ? await HyperlocalPartner.find().lean() : store.partners;
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.finalPayable || 0), 0);
  res.json({
    success: true,
    data: {
      totalOrders: orders.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      deliveredOrders: orders.filter((entry) => entry.status === 'Delivered').length,
      cancelledOrders: orders.filter((entry) => entry.status === 'Cancelled/Refunded').length,
      approvedShops: shops.filter((entry) => entry.approvalStatus === 'approved').length,
      approvedPartners: partners.filter((entry) => entry.approvalStatus === 'approved').length,
      activePartnersOnline: partners.filter((entry) => entry.online).length,
    },
  });
});

router.get('/admin/refunds', authenticate, verifyAdmin, async (_req, res) => res.json({ success: true, data: { refunds: store.refunds } }));
router.patch('/admin/refunds/:refundId/review', authenticate, verifyAdmin, writeLimiter, async (req, res) => {
  const status = String(req.body.status || '').trim().toLowerCase();
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be approved or rejected.' });
  }
  const idx = store.refunds.findIndex((entry) => entry.refundId === req.params.refundId);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Refund request not found.' });
  store.refunds[idx].status = status;
  return res.json({ success: true, message: `Refund ${status}.`, data: { refund: store.refunds[idx] } });
});

router.get('/admin/complaints', authenticate, verifyAdmin, async (_req, res) => res.json({ success: true, data: { complaints: store.complaints } }));
router.patch('/admin/complaints/:complaintId/resolve', authenticate, verifyAdmin, writeLimiter, async (req, res) => {
  const idx = store.complaints.findIndex((entry) => entry.complaintId === req.params.complaintId);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Complaint not found.' });
  store.complaints[idx].status = 'resolved';
  store.complaints[idx].resolutionNote = String(req.body.resolutionNote || '');
  return res.json({ success: true, message: 'Complaint resolved.', data: { complaint: store.complaints[idx] } });
});

router.get('/admin/settlement-reports', authenticate, verifyAdmin, async (_req, res) => {
  const orders = isMongoReady() ? await HyperlocalOrder.find({ status: 'Delivered' }).lean() : store.orders.filter((entry) => entry.status === 'Delivered');
  const config = isMongoReady() ? await HyperlocalAdminConfig.findOne({ configId: 'CFG-DEFAULT' }).lean() : store.config;
  const commissionPercent = config?.commissionPercent || 12;
  const gross = orders.reduce((sum, entry) => sum + Number(entry.subtotal || 0), 0);
  const commission = (gross * commissionPercent) / 100;
  const deliveryFees = orders.reduce((sum, entry) => sum + Number(entry.deliveryCharge || 0), 0);
  return res.json({
    success: true,
    data: {
      deliveredOrders: orders.length,
      grossSales: Number(gross.toFixed(2)),
      commissionCollected: Number(commission.toFixed(2)),
      deliveryFeesCollected: Number(deliveryFees.toFixed(2)),
      netPayoutToVendors: Number((gross - commission).toFixed(2)),
    },
  });
});

router.get('/wallet/me', authenticate, async (req, res) => {
  const email = ensureAuthenticatedEmail(req, res);
  if (!email) return;
  const wallet = isMongoReady()
    ? await HyperlocalWallet.findOne({ userEmail: email }).lean()
    : store.wallets.find((entry) => entry.userEmail === email);
  if (!wallet) {
    return res.json({ success: true, data: { wallet: { userEmail: email, balance: 0, cashbackBalance: 0, transactions: [] } } });
  }
  return res.json({ success: true, data: { wallet } });
});

router.get('/wallet/:email', authenticate, async (req, res) => {
  const authEmail = ensureAuthenticatedEmail(req, res);
  if (!authEmail) return;
  const email = normalizeEmail(req.params.email);
  if (!email) return res.status(400).json({ success: false, message: 'Valid email required.' });
  if (email !== authEmail) return res.status(403).json({ success: false, message: 'Not authorized for this wallet.' });
  const wallet = isMongoReady()
    ? await HyperlocalWallet.findOne({ userEmail: email }).lean()
    : store.wallets.find((entry) => entry.userEmail === email);
  if (!wallet) {
    return res.json({ success: true, data: { wallet: { userEmail: email, balance: 0, cashbackBalance: 0, transactions: [] } } });
  }
  return res.json({ success: true, data: { wallet } });
});

router.post('/wallet/topup', authenticate, writeLimiter, async (req, res) => {
  const userEmail = ensureAuthenticatedEmail(req, res);
  if (!userEmail) return;
  const amount = toNum(req.body.amount, 0);
  if (amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount is required.' });
  const tx = { txId: id('HLTX'), type: 'credit', amount, note: 'Wallet top-up', at: new Date() };

  if (isMongoReady()) {
    const wallet = await HyperlocalWallet.findOneAndUpdate(
      { userEmail },
      { $setOnInsert: { walletId: id('HLWAL'), userEmail, balance: 0, cashbackBalance: 0, transactions: [] } },
      { upsert: true, new: true }
    );
    wallet.balance += amount;
    wallet.transactions.push(tx);
    await wallet.save();
    return res.status(201).json({ success: true, data: { wallet } });
  }

  const existing = store.wallets.find((entry) => entry.userEmail === userEmail);
  if (existing) {
    existing.balance += amount;
    existing.transactions.push(tx);
    return res.status(201).json({ success: true, data: { wallet: existing } });
  }

  const wallet = { walletId: id('HLWAL'), userEmail, balance: amount, cashbackBalance: 0, transactions: [tx] };
  store.wallets.push(wallet);
  return res.status(201).json({ success: true, data: { wallet } });
});

router.get('/subscriptions/plans', (_req, res) =>
  res.json({
    success: true,
    data: {
      plans: [
        { planCode: 'PASS-STARTER', title: 'Starter Pass', amount: 149, benefits: ['Free delivery on 5 orders', '2% cashback'] },
        { planCode: 'PASS-PLUS', title: 'Plus Pass', amount: 299, benefits: ['Free delivery on 15 orders', '5% cashback', 'Priority delivery'] },
      ],
    },
  })
);

router.post('/subscriptions/subscribe', authenticate, writeLimiter, async (req, res) => {
  const email = ensureAuthenticatedEmail(req, res);
  if (!email) return;
  const planCode = String(req.body.planCode || '').trim();
  const amount = toNum(req.body.amount, 0);
  if (!planCode || amount < 0) return res.status(400).json({ success: false, message: 'planCode and amount are required.' });
  const subscription = {
    subscriptionId: id('HLSUB'),
    userEmail: email,
    planCode,
    status: 'active',
    amount,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (isMongoReady()) await HyperlocalSubscription.create(subscription);
  else store.subscriptions.push(subscription);
  return res.status(201).json({ success: true, message: 'Subscription activated.', data: { subscription } });
});

router.get('/subscriptions/me', authenticate, async (req, res) => {
  const email = ensureAuthenticatedEmail(req, res);
  if (!email) return;
  const subscriptions = isMongoReady()
    ? await HyperlocalSubscription.find({ userEmail: email }).sort({ createdAt: -1 }).lean()
    : store.subscriptions.filter((entry) => entry.userEmail === email);
  return res.json({ success: true, data: { subscriptions } });
});

router.get('/subscriptions/:email', authenticate, async (req, res) => {
  const authEmail = ensureAuthenticatedEmail(req, res);
  if (!authEmail) return;
  const email = normalizeEmail(req.params.email);
  if (!email) return res.status(400).json({ success: false, message: 'Valid email required.' });
  if (email !== authEmail) return res.status(403).json({ success: false, message: 'Not authorized for these subscriptions.' });
  const subscriptions = isMongoReady()
    ? await HyperlocalSubscription.find({ userEmail: email }).sort({ createdAt: -1 }).lean()
    : store.subscriptions.filter((entry) => entry.userEmail === email);
  return res.json({ success: true, data: { subscriptions } });
});

router.post('/ads', authenticate, writeLimiter, async (req, res) => {
  const ownerEmail = ensureAuthenticatedEmail(req, res);
  if (!ownerEmail) return;
  const shopId = String(req.body.shopId || '').trim();
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  const budget = toNum(req.body.budget, 0);
  if (!shopId || !title || budget < 0) return res.status(400).json({ success: false, message: 'shopId, title, and budget are required.' });
  const shop = isMongoReady()
    ? await HyperlocalShop.findOne({ shopId, ownerEmail }).lean()
    : store.shops.find((entry) => entry.shopId === shopId && entry.ownerEmail === ownerEmail);
  if (!shop) return res.status(403).json({ success: false, message: 'Not authorized to create ads for this shop.' });
  const ad = { adId: id('HLAD'), shopId, title, description, budget, active: true, createdAt: new Date(), updatedAt: new Date() };
  if (isMongoReady()) await HyperlocalAd.create(ad);
  else store.ads.push(ad);
  return res.status(201).json({ success: true, data: { ad } });
});

router.get('/ads', authenticate, async (req, res) => {
  const ownerEmail = ensureAuthenticatedEmail(req, res);
  if (!ownerEmail) return;
  const shopId = String(req.query.shopId || '').trim();
  const ownedShops = isMongoReady()
    ? await HyperlocalShop.find({ ownerEmail }).lean()
    : store.shops.filter((entry) => entry.ownerEmail === ownerEmail);
  const ownedShopIds = new Set(ownedShops.map((entry) => entry.shopId));
  if (shopId && !ownedShopIds.has(shopId)) {
    return res.status(403).json({ success: false, message: 'Not authorized for this shop.' });
  }
  const filterShopIds = shopId ? new Set([shopId]) : ownedShopIds;
  const ads = isMongoReady()
    ? (await HyperlocalAd.find(shopId ? { shopId } : {}).sort({ createdAt: -1 }).lean()).filter((entry) => filterShopIds.has(entry.shopId))
    : store.ads.filter((entry) => filterShopIds.has(entry.shopId));
  return res.json({ success: true, data: { ads } });
});

router.use((error, _req, res, next) => {
  if (!error) return next();
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'Upload exceeds 8MB limit.' : 'Upload failed.' });
  }
  if (error.message === 'Invalid file format') {
    return res.status(400).json({ success: false, message: 'Upload PDF/JPG/PNG/DOC/DOCX only.' });
  }
  return next(error);
});

module.exports = router;
