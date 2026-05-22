const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

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
  HyperlocalRefund,
  HyperlocalComplaint,
  HyperlocalOrderIdempotencyKey,
  HyperlocalAdminAuditLog,
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
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const UPLOAD_MODE = String(process.env.HYPERLOCAL_UPLOAD_MODE || 'disk').trim().toLowerCase();
const OVERVIEW_CACHE_TTL_MS = Math.max(10000, Number.parseInt(String(process.env.HYPERLOCAL_OVERVIEW_CACHE_TTL_MS || '45000'), 10) || 45000);
const CRON_SECRET = String(process.env.HYPERLOCAL_CRON_SECRET || '').trim();
const ENABLE_OVERVIEW_CACHE = String(process.env.HYPERLOCAL_ENABLE_OVERVIEW_CACHE || 'true').trim().toLowerCase() !== 'false';
const s3Bucket = String(process.env.HYPERLOCAL_UPLOAD_S3_BUCKET || '').trim();
const s3Region = String(process.env.HYPERLOCAL_UPLOAD_S3_REGION || process.env.AWS_REGION || 'ap-south-1').trim();
const s3PublicBaseUrl = String(process.env.HYPERLOCAL_UPLOAD_PUBLIC_BASE_URL || '').trim();
const useS3Uploads = UPLOAD_MODE === 's3';
const s3Client = useS3Uploads && s3Bucket ? new S3Client({ region: s3Region }) : null;

let overviewCache = {
  cachedAt: 0,
  data: null,
};

const invalidateOverviewCache = () => {
  overviewCache = { cachedAt: 0, data: null };
};

const uploadRoot = path.join(__dirname, '../uploads/hyperlocal');
const prescriptionDir = path.join(uploadRoot, 'prescriptions');
const kycDir = path.join(uploadRoot, 'kyc');

if (!useS3Uploads) {
  [uploadRoot, prescriptionDir, kycDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

const storage = useS3Uploads
  ? multer.memoryStorage()
  : multer.diskStorage({
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

const toUploadKey = (folder, originalName = '') => {
  const ext = path.extname(originalName || '').toLowerCase();
  return `hyperlocal/${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
};

const uploadBufferToS3 = async (buffer, key, contentType = 'application/octet-stream') => {
  if (!s3Client || !s3Bucket) {
    throw new Error('S3 upload mode is enabled but HYPERLOCAL_UPLOAD_S3_BUCKET is not configured.');
  }
  await s3Client.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  if (s3PublicBaseUrl) {
    return `${s3PublicBaseUrl.replace(/\/$/, '')}/${key}`;
  }
  return `s3://${s3Bucket}/${key}`;
};

const persistUploadedFile = async (file, folder) => {
  if (!file) return '';
  if (!useS3Uploads) {
    return `/uploads/hyperlocal/${folder}/${file.filename}`;
  }
  const key = toUploadKey(folder, file.originalname || '');
  return uploadBufferToS3(file.buffer, key, file.mimetype || 'application/octet-stream');
};

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

const highRiskWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: 'High frequency write activity detected. Please retry after a short interval.',
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

const parsePagination = (req, defaults = {}) => {
  const page = Math.max(1, Number.parseInt(String(req.query.page || defaults.page || 1), 10) || 1);
  const limit = Math.max(1, Math.min(100, Number.parseInt(String(req.query.limit || defaults.limit || 20), 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const paginateList = (list, page, limit) => {
  const total = Array.isArray(list) ? list.length : 0;
  const start = Math.max(0, (page - 1) * limit);
  const end = start + limit;
  const items = (list || []).slice(start, end);
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: total ? Math.ceil(total / limit) : 0,
      hasNext: end < total,
      hasPrev: start > 0,
    },
  };
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

const SUBSCRIPTION_PLANS = [
  { planCode: 'PASS-STARTER', title: 'Starter Pass', amount: 149, benefits: ['Free delivery on 5 orders', '2% cashback'] },
  { planCode: 'PASS-PLUS', title: 'Plus Pass', amount: 299, benefits: ['Free delivery on 15 orders', '5% cashback', 'Priority delivery'] },
];

const SUBSCRIPTION_PLAN_MAP = SUBSCRIPTION_PLANS.reduce((acc, plan) => {
  acc[plan.planCode] = plan;
  return acc;
}, {});

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
  idempotencyKeys: [],
  auditLogs: [],
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
  deliveryWindowStart: Joi.string().allow('', null),
  deliveryWindowEnd: Joi.string().allow('', null),
}).custom((value, helpers) => {
  if (value.deliveryType !== 'scheduled') return value;
  const startRaw = String(value.deliveryWindowStart || '').trim();
  const endRaw = String(value.deliveryWindowEnd || '').trim();
  if (!startRaw || !endRaw) {
    return helpers.message('Scheduled delivery requires deliveryWindowStart and deliveryWindowEnd.');
  }
  if (!ISO_DATE_REGEX.test(startRaw) || !ISO_DATE_REGEX.test(endRaw)) {
    return helpers.message('Delivery window must use ISO datetime format.');
  }
  const start = new Date(startRaw);
  const end = new Date(endRaw);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return helpers.message('Delivery window range is invalid.');
  }
  return value;
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

const productUpdateSchema = productSchema.keys({
  productId: Joi.string().allow('').optional(),
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
    } else {
      throw new Error('Unsupported coupon type.');
    }
  }

  const platformFee = config.platformFee || 0;
  const tax = selectedItems.reduce(
    (sum, item) => sum + ((Number(item.lineTotal || 0) * Number(item.shopTaxPercent || 5)) / 100),
    0
  );
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
    if (nextStatus === 'Cancelled/Refunded' && order.inventoryReserved) {
      await releaseInventoryForOrder(order.items || []);
      order.inventoryReserved = false;
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
  if (nextStatus === 'Cancelled/Refunded' && order.inventoryReserved) {
    await releaseInventoryForOrder(order.items || []);
  }
  const updated = {
    ...order,
    status: nextStatus,
    timeline: [...(order.timeline || []), { status: nextStatus, note, at: new Date() }],
    inventoryReserved: nextStatus === 'Cancelled/Refunded' ? false : order.inventoryReserved,
    updatedAt: new Date(),
  };
  store.orders[idx] = updated;
  return updated;
};

const calculatePartnerAvailableBalance = (partner = {}) => {
  const walletBalance = toNum(partner.walletBalance, 0);
  const pendingPayouts = Array.isArray(partner.payoutHistory)
    ? partner.payoutHistory
        .filter((entry) => String(entry.status || '').toLowerCase() === 'requested')
        .reduce((sum, entry) => sum + toNum(entry.amount, 0), 0)
    : 0;
  return Math.max(0, walletBalance - pendingPayouts);
};

const normalizeOrderItemsForInventory = (items = []) => {
  const grouped = new Map();
  for (const item of items) {
    const shopId = String(item.shopId || '').trim();
    const productId = String(item.productId || '').trim();
    const qty = Math.max(0, Number.parseInt(String(item.qty || 0), 10) || 0);
    if (!shopId || !productId || qty <= 0) continue;
    const key = `${shopId}:${productId}`;
    grouped.set(key, {
      shopId,
      productId,
      qty: (grouped.get(key)?.qty || 0) + qty,
    });
  }
  return Array.from(grouped.values());
};

const reserveInventoryForOrder = async (items = []) => {
  const normalized = normalizeOrderItemsForInventory(items);
  const reserved = [];

  if (isMongoReady()) {
    try {
      for (const item of normalized) {
        const result = await HyperlocalShop.updateOne(
          {
            shopId: item.shopId,
            approvalStatus: 'approved',
            products: { $elemMatch: { productId: item.productId, isActive: true, stockQty: { $gte: item.qty } } },
          },
          { $inc: { 'products.$.stockQty': -item.qty } }
        );
        if (!result.matchedCount || !result.modifiedCount) {
          throw new Error(`Insufficient stock for ${item.productId}.`);
        }
        reserved.push(item);
      }
      return;
    } catch (error) {
      if (reserved.length) {
        await Promise.all(
          reserved.map((item) =>
            HyperlocalShop.updateOne(
              { shopId: item.shopId, 'products.productId': item.productId },
              { $inc: { 'products.$.stockQty': item.qty } }
            )
          )
        );
      }
      throw error;
    }
  }

  try {
    for (const item of normalized) {
      const shopIndex = store.shops.findIndex((entry) => entry.shopId === item.shopId && entry.approvalStatus === 'approved');
      if (shopIndex === -1) throw new Error(`Shop not found for ${item.shopId}.`);
      const productIndex = (store.shops[shopIndex].products || []).findIndex(
        (entry) => entry.productId === item.productId && entry.isActive
      );
      if (productIndex === -1) throw new Error(`Product not found for ${item.productId}.`);
      if (toNum(store.shops[shopIndex].products[productIndex].stockQty, 0) < item.qty) {
        throw new Error(`Insufficient stock for ${item.productId}.`);
      }
      store.shops[shopIndex].products[productIndex].stockQty -= item.qty;
      reserved.push(item);
    }
  } catch (error) {
    for (const item of reserved) {
      const shopIndex = store.shops.findIndex((entry) => entry.shopId === item.shopId);
      if (shopIndex === -1) continue;
      const productIndex = (store.shops[shopIndex].products || []).findIndex((entry) => entry.productId === item.productId);
      if (productIndex === -1) continue;
      store.shops[shopIndex].products[productIndex].stockQty += item.qty;
    }
    throw error;
  }
};

const releaseInventoryForOrder = async (items = []) => {
  const normalized = normalizeOrderItemsForInventory(items);
  if (!normalized.length) return;

  if (isMongoReady()) {
    await Promise.all(
      normalized.map((item) =>
        HyperlocalShop.updateOne(
          { shopId: item.shopId, 'products.productId': item.productId },
          { $inc: { 'products.$.stockQty': item.qty } }
        )
      )
    );
    return;
  }

  for (const item of normalized) {
    const shopIndex = store.shops.findIndex((entry) => entry.shopId === item.shopId);
    if (shopIndex === -1) continue;
    const productIndex = (store.shops[shopIndex].products || []).findIndex((entry) => entry.productId === item.productId);
    if (productIndex === -1) continue;
    store.shops[shopIndex].products[productIndex].stockQty += item.qty;
  }
};

const logAdminAction = async (req, { action, targetType = '', targetId = '', meta = {} }) => {
  const actorEmail = normalizeEmail(req.user?.email || req.auth?.email || req.userEmail || '');
  const actorRole = String(req.user?.role || req.user?.registrationType || '').trim().toLowerCase();
  const entry = {
    auditId: id('HLAUD'),
    actorEmail,
    actorRole,
    action: String(action || '').trim(),
    targetType: String(targetType || '').trim(),
    targetId: String(targetId || '').trim(),
    meta,
    at: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (!entry.action) return;
  if (isMongoReady()) {
    await HyperlocalAdminAuditLog.create(entry);
  } else {
    store.auditLogs.unshift(entry);
  }
};

const getIdempotencyKey = (req) => String(req.headers['x-idempotency-key'] || '').trim();

const setEdgeCacheHeaders = (res, { isPublic = true, sMaxageSec = 60, swrSec = 300 } = {}) => {
  const scope = isPublic ? 'public' : 'private';
  res.set('Cache-Control', `${scope}, s-maxage=${sMaxageSec}, stale-while-revalidate=${swrSec}`);
  if (!isPublic) {
    res.set('Vary', 'Authorization');
  }
};

const getFeatureFlags = () => ({
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
  overviewCache: ENABLE_OVERVIEW_CACHE,
  cronRollups: Boolean(CRON_SECRET),
  uploadStorage: useS3Uploads ? 's3' : 'disk',
});

router.get('/bootstrap', async (_req, res) => {
  try {
    await bootstrapMongo();
    setEdgeCacheHeaders(res, { isPublic: true, sMaxageSec: 300, swrSec: 1800 });
    res.json({
      success: true,
      data: {
        categories: CATEGORIES,
        paymentModes: PAYMENT_MODES,
        statusFlow: DELIVERY_STATUS_FLOW,
        featureFlags: getFeatureFlags(),
      },
    });
  } catch (error) {
    logger.error('hyperlocal bootstrap error:', error);
    res.status(500).json({ success: false, message: 'Unable to load hyperlocal bootstrap.' });
  }
});

router.get('/shops', async (req, res) => {
  try {
    setEdgeCacheHeaders(res, { isPublic: true, sMaxageSec: 45, swrSec: 300 });
    const { category = '', search = '', lat, lng, openOnly = '' } = req.query;
    const { page, limit } = parsePagination(req, { page: 1, limit: 24 });
    const userLocation = lat && lng ? toCoordinates(lat, lng) : null;
    const source = isMongoReady() ? await HyperlocalShop.find({ approvalStatus: 'approved' }).lean() : store.shops;

    const filtered = source
      .filter((shop) => !category || category === 'All' || shop.category === category)
      .filter((shop) => !search || `${shop.name} ${shop.description}`.toLowerCase().includes(String(search).toLowerCase()))
      .filter((shop) => (String(openOnly).toLowerCase() === 'true' ? Boolean(shop.open) : true))
      .map((shop) => {
        const distanceKm = userLocation ? haversineKm(userLocation, shop.location || { lat: 0, lng: 0 }) : null;
        return {
          ...shop,
          distanceKm: distanceKm === null ? null : Number(distanceKm.toFixed(2)),
          deliveryEligible: distanceKm === null ? true : distanceKm <= (shop.deliveryRadiusKm || 5),
        };
      })
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    const paged = paginateList(filtered, page, limit);
    res.json({ success: true, data: { shops: paged.items, pagination: paged.pagination } });
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
    const idempotencyKey = getIdempotencyKey(req);
    if (idempotencyKey) {
      if (isMongoReady()) {
        const existing = await HyperlocalOrderIdempotencyKey.findOne({ key: idempotencyKey, userEmail: authEmail }).lean();
        if (existing?.responsePayload) {
          return res.status(existing.responseStatus || 201).json(existing.responsePayload);
        }
      } else {
        const existing = store.idempotencyKeys.find((entry) => entry.key === idempotencyKey && entry.userEmail === authEmail);
        if (existing?.responsePayload) {
          return res.status(existing.responseStatus || 201).json(existing.responsePayload);
        }
      }
    }

    const payload = {
      ...req.body,
      userEmail: authEmail,
      userPhone: normalizePhone(req.body.userPhone),
      items: typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items,
      address: typeof req.body.address === 'string' ? JSON.parse(req.body.address) : req.body.address,
      multiShopMode: String(req.body.multiShopMode) === 'true',
      emergencyMedicine: String(req.body.emergencyMedicine) === 'true',
      deliveryWindowStart: String(req.body.deliveryWindowStart || '').trim(),
      deliveryWindowEnd: String(req.body.deliveryWindowEnd || '').trim(),
    };

    const { error, value } = orderSchema.validate(payload, { allowUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const quote = await computeQuote(value, Boolean(req.file));
    await reserveInventoryForOrder(quote.items || []);
    const orderId = id('HLORD');
    const prescriptionFilePath = await persistUploadedFile(req.file, 'prescriptions');
    const order = {
      orderId,
      userEmail: value.userEmail,
      userPhone: value.userPhone,
      paymentMode: value.paymentMode,
      deliveryType: value.deliveryType,
      deliveryWindowStart: value.deliveryType === 'scheduled' ? new Date(value.deliveryWindowStart) : null,
      deliveryWindowEnd: value.deliveryType === 'scheduled' ? new Date(value.deliveryWindowEnd) : null,
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
      prescriptionFile: prescriptionFilePath,
      complaintStatus: '',
      refundStatus: '',
      inventoryReserved: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      if (isMongoReady()) {
        await HyperlocalOrder.create(order);
      } else {
        store.orders.unshift(order);
      }
    } catch (persistError) {
      await releaseInventoryForOrder(order.items || []);
      throw persistError;
    }

    const responsePayload = {
      success: true,
      message: 'Order placed successfully.',
      data: { orderId, order },
    };

    if (idempotencyKey) {
      if (isMongoReady()) {
        await HyperlocalOrderIdempotencyKey.updateOne(
          { key: idempotencyKey, userEmail: authEmail },
          {
            $set: {
              orderId,
              responseStatus: 201,
              responsePayload,
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
      } else {
        const idx = store.idempotencyKeys.findIndex((entry) => entry.key === idempotencyKey && entry.userEmail === authEmail);
        const valueToStore = { key: idempotencyKey, userEmail: authEmail, orderId, responseStatus: 201, responsePayload, createdAt: new Date() };
        if (idx === -1) store.idempotencyKeys.push(valueToStore);
        else store.idempotencyKeys[idx] = valueToStore;
      }
    }

    invalidateOverviewCache();
    res.status(201).json(responsePayload);
  } catch (error) {
    logger.error('hyperlocal order create error:', error);
    res.status(400).json({ success: false, message: error.message || 'Unable to place order.' });
  }
});

router.get('/orders', authenticate, async (req, res) => {
  try {
    const email = ensureAuthenticatedEmail(req, res);
    if (!email) return;
    const statusFilter = String(req.query.status || '').trim();
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const { page, limit, skip } = parsePagination(req, { page: 1, limit: 20 });

    if (isMongoReady()) {
      const query = { userEmail: email };
      if (statusFilter) query.status = statusFilter;
      if (from || to) {
        query.createdAt = {};
        if (from) query.createdAt.$gte = new Date(from);
        if (to) query.createdAt.$lte = new Date(to);
      }
      const [orders, total] = await Promise.all([
        HyperlocalOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        HyperlocalOrder.countDocuments(query),
      ]);
      return res.json({
        success: true,
        data: {
          orders,
          pagination: {
            page,
            limit,
            total,
            totalPages: total ? Math.ceil(total / limit) : 0,
            hasNext: skip + orders.length < total,
            hasPrev: page > 1,
          },
        },
      });
    }

    const filtered = store.orders
      .filter((entry) => entry.userEmail === email)
      .filter((entry) => (!statusFilter ? true : String(entry.status) === statusFilter))
      .filter((entry) => {
        const createdTime = new Date(entry.createdAt).getTime();
        const afterFrom = !from || createdTime >= new Date(from).getTime();
        const beforeTo = !to || createdTime <= new Date(to).getTime();
        return afterFrom && beforeTo;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const paged = paginateList(filtered, page, limit);
    res.json({ success: true, data: { orders: paged.items, pagination: paged.pagination } });
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
    invalidateOverviewCache();
    return res.json({ success: true, message: 'Order cancelled.', data: { order: updated } });
  } catch (error) {
    const statusCode = error.message === 'Order not found.' ? 404 : 400;
    return res.status(statusCode).json({ success: false, message: error.message || 'Unable to cancel order.' });
  }
});

router.post('/orders/:orderId/refund-request', authenticate, highRiskWriteLimiter, async (req, res) => {
  try {
    const authEmail = ensureAuthenticatedEmail(req, res);
    if (!authEmail) return;
    const reason = String(req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ success: false, message: 'Refund reason is required.' });
    const order = isMongoReady()
      ? await HyperlocalOrder.findOne({ orderId: req.params.orderId, userEmail: authEmail })
      : store.orders.find((entry) => entry.orderId === req.params.orderId && entry.userEmail === authEmail);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (String(order.refundStatus || '').toLowerCase() === 'pending') {
      return res.status(409).json({ success: false, message: 'A refund request is already pending for this order.' });
    }

    if (isMongoReady()) {
      const existingRefund = await HyperlocalRefund.findOne({ orderId: req.params.orderId, userEmail: order.userEmail, status: 'pending' });
      if (existingRefund) {
        return res.status(409).json({ success: false, message: 'A refund request is already pending for this order.' });
      }
    }

    const refundEntry = {
      refundId: id('HLRF'),
      orderId: req.params.orderId,
      userEmail: order.userEmail,
      amount: order.finalPayable,
      reason,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isMongoReady()) {
      await HyperlocalRefund.create(refundEntry);
      order.refundStatus = 'pending';
      await order.save();
    } else {
      store.refunds.unshift(refundEntry);
      const idx = store.orders.findIndex((entry) => entry.orderId === req.params.orderId);
      if (idx !== -1) store.orders[idx].refundStatus = 'pending';
    }
    invalidateOverviewCache();
    return res.status(201).json({ success: true, message: 'Refund request submitted.', data: { refund: refundEntry } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to submit refund request.' });
  }
});

router.post('/orders/:orderId/complaint', authenticate, highRiskWriteLimiter, async (req, res) => {
  const authEmail = ensureAuthenticatedEmail(req, res);
  if (!authEmail) return;
  const issue = String(req.body.issue || '').trim();
  if (!issue) return res.status(400).json({ success: false, message: 'Complaint issue is required.' });
  const order = isMongoReady()
    ? await HyperlocalOrder.findOne({ orderId: req.params.orderId, userEmail: authEmail })
    : store.orders.find((entry) => entry.orderId === req.params.orderId && entry.userEmail === authEmail);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  const complaint = {
    complaintId: id('HLCM'),
    orderId: req.params.orderId,
    userEmail: authEmail,
    issue,
    status: 'open',
    resolutionNote: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (isMongoReady()) {
    const existingComplaint = await HyperlocalComplaint.findOne({ orderId: req.params.orderId, userEmail: authEmail, status: 'open' });
    if (existingComplaint) {
      return res.status(409).json({ success: false, message: 'An open complaint already exists for this order.' });
    }
    await HyperlocalComplaint.create(complaint);
    await HyperlocalOrder.updateOne({ orderId: req.params.orderId }, { $set: { complaintStatus: 'open' } });
  } else {
    const existingComplaint = store.complaints.find((entry) => entry.orderId === req.params.orderId && entry.userEmail === authEmail && entry.status === 'open');
    if (existingComplaint) {
      return res.status(409).json({ success: false, message: 'An open complaint already exists for this order.' });
    }
    store.complaints.unshift(complaint);
    const idx = store.orders.findIndex((entry) => entry.orderId === req.params.orderId);
    if (idx !== -1) store.orders[idx].complaintStatus = 'open';
  }
  invalidateOverviewCache();
  return res.status(201).json({ success: true, data: { complaint } });
});

router.patch('/orders/:orderId/status', authenticate, verifyAdmin, writeLimiter, async (req, res) => {
  try {
    const { status, note = '' } = req.body;
    const updated = await applyOrderStatusTransition(req.params.orderId, status, note);
    await logAdminAction(req, {
      action: 'order.status.update',
      targetType: 'order',
      targetId: req.params.orderId,
      meta: { status, note },
    });
    invalidateOverviewCache();
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
    const { error, value } = productUpdateSchema.validate(req.body, { allowUnknown: true });
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
    invalidateOverviewCache();
    return res.json({ success: true, message: 'Vendor order action applied.', data: { order: updated } });
  } catch (error) {
    const statusCode = error.message === 'Order not found.' ? 404 : 400;
    return res.status(statusCode).json({ success: false, message: error.message || 'Unable to apply vendor action.' });
  }
});

router.get('/vendor/orders', authenticate, async (req, res) => {
  const ownerEmail = ensureAuthenticatedEmail(req, res);
  if (!ownerEmail) return;
  const statusFilter = String(req.query.status || '').trim();
  const { page, limit } = parsePagination(req, { page: 1, limit: 20 });
  const shops = isMongoReady()
    ? await HyperlocalShop.find({ ownerEmail }).lean()
    : store.shops.filter((entry) => entry.ownerEmail === ownerEmail);
  const shopIds = new Set(shops.map((entry) => entry.shopId));
  if (isMongoReady()) {
    const query = statusFilter ? { status: statusFilter } : {};
    const all = await HyperlocalOrder.find(query).sort({ createdAt: -1 }).lean();
    const filtered = all.filter((order) => order.items.some((item) => shopIds.has(item.shopId)));
    const paged = paginateList(filtered, page, limit);
    return res.json({ success: true, data: { orders: paged.items, pagination: paged.pagination } });
  }

  const filtered = store.orders
    .filter((order) => order.items.some((item) => shopIds.has(item.shopId)))
    .filter((order) => (!statusFilter ? true : String(order.status) === statusFilter))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const paged = paginateList(filtered, page, limit);
  return res.json({ success: true, data: { orders: paged.items, pagination: paged.pagination } });
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
    const kycDocs = await Promise.all(
      (req.files || []).map(async (file) => ({
        docType: 'kyc',
        fileName: await persistUploadedFile(file, 'kyc'),
        uploadedAt: new Date(),
      }))
    );

    const partner = {
      partnerId: id('HLP'),
      ...payload,
      online: false,
      approvalStatus: 'pending',
      currentOrderId: '',
      walletBalance: 0,
      payoutHistory: [],
      kycStatus: req.files?.length ? 'submitted' : 'pending',
      kycDocs,
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
    invalidateOverviewCache();
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
      invalidateOverviewCache();
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

    if (status === 'Delivered' && sourceOrder.status !== 'Delivered') {
      const partnerEarning = Number(toNum(sourceOrder.deliveryCharge, 0).toFixed(2));
      if (isMongoReady()) {
        const partnerDoc = await HyperlocalPartner.findOne({ partnerId: partner.partnerId });
        if (partnerDoc) {
          partnerDoc.walletBalance = toNum(partnerDoc.walletBalance, 0) + partnerEarning;
          partnerDoc.currentOrderId = '';
          await partnerDoc.save();
        }
      } else {
        const idx = store.partners.findIndex((entry) => entry.partnerId === partner.partnerId);
        if (idx !== -1) {
          store.partners[idx].walletBalance = toNum(store.partners[idx].walletBalance, 0) + partnerEarning;
          store.partners[idx].currentOrderId = '';
        }
      }
    }

    invalidateOverviewCache();
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

router.post('/partners/:partnerId/payouts/request', authenticate, highRiskWriteLimiter, async (req, res) => {
  const authorizedPartner = await ensureAuthorizedPartner(req, res, req.params.partnerId, { requireApproved: true });
  if (!authorizedPartner) return;
  const amount = toNum(req.body.amount, 0);
  if (amount <= 0) return res.status(400).json({ success: false, message: 'amount must be greater than 0.' });
  const payout = { payoutId: id('HLPAY'), amount, status: 'requested', requestedAt: new Date() };
  if (isMongoReady()) {
    const partner = await HyperlocalPartner.findOne({ partnerId: authorizedPartner.partnerId });
    if (!partner) return res.status(404).json({ success: false, message: 'Partner not found.' });
    const availableBalance = calculatePartnerAvailableBalance(partner);
    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Requested amount exceeds available balance. Available: INR ${availableBalance.toFixed(2)}.`,
      });
    }
    partner.payoutHistory.push(payout);
    await partner.save();
    return res.status(201).json({
      success: true,
      message: 'Payout request submitted.',
      data: { payout, availableBalance: Number((availableBalance - amount).toFixed(2)) },
    });
  } else {
    const idx = store.partners.findIndex((entry) => entry.partnerId === authorizedPartner.partnerId);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Partner not found.' });
    const availableBalance = calculatePartnerAvailableBalance(store.partners[idx]);
    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Requested amount exceeds available balance. Available: INR ${availableBalance.toFixed(2)}.`,
      });
    }
    store.partners[idx].payoutHistory.push(payout);
    return res.status(201).json({
      success: true,
      message: 'Payout request submitted.',
      data: { payout, availableBalance: Number((availableBalance - amount).toFixed(2)) },
    });
  }
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
  await logAdminAction(req, {
    action: 'shop.approval.update',
    targetType: 'shop',
    targetId: req.params.shopId,
    meta: { status },
  });
  invalidateOverviewCache();
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
  await logAdminAction(req, {
    action: 'partner.approval.update',
    targetType: 'partner',
    targetId: req.params.partnerId,
    meta: { status },
  });
  invalidateOverviewCache();
  return res.json({ success: true, message: `Partner ${status}.` });
});

router.get('/admin/pending-shops', authenticate, verifyAdmin, async (_req, res) => {
  const { page, limit } = parsePagination(_req, { page: 1, limit: 20 });
  const shops = isMongoReady()
    ? await HyperlocalShop.find({ approvalStatus: 'pending' }).sort({ createdAt: -1 }).lean()
    : store.shops
        .filter((entry) => entry.approvalStatus === 'pending')
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const paged = paginateList(shops, page, limit);
  return res.json({ success: true, data: { shops: paged.items, pagination: paged.pagination } });
});

router.get('/admin/pending-partners', authenticate, verifyAdmin, async (_req, res) => {
  const { page, limit } = parsePagination(_req, { page: 1, limit: 20 });
  const partners = isMongoReady()
    ? await HyperlocalPartner.find({ approvalStatus: 'pending' }).sort({ createdAt: -1 }).lean()
    : store.partners
        .filter((entry) => entry.approvalStatus === 'pending')
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const paged = paginateList(partners, page, limit);
  return res.json({ success: true, data: { partners: paged.items, pagination: paged.pagination } });
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
    await logAdminAction(req, {
      action: 'admin.config.update',
      targetType: 'config',
      targetId: 'CFG-DEFAULT',
      meta: {
        commissionPercent: nextConfig.commissionPercent,
        platformFee: nextConfig.platformFee,
        surgeEnabled: nextConfig.surgePricing.enabled,
      },
    });
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

const computeOverview360Data = async () => {
  const orders = isMongoReady() ? await HyperlocalOrder.find().lean() : store.orders;
  const shops = isMongoReady() ? await HyperlocalShop.find().lean() : store.shops;
  const partners = isMongoReady() ? await HyperlocalPartner.find().lean() : store.partners;
  const subscriptions = isMongoReady() ? await HyperlocalSubscription.find().lean() : store.subscriptions;
  const refunds = isMongoReady() ? await HyperlocalRefund.find().lean() : store.refunds;
  const complaints = isMongoReady() ? await HyperlocalComplaint.find().lean() : store.complaints;
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.finalPayable || 0), 0);
  const totalGross = orders.reduce((sum, order) => sum + Number(order.subtotal || 0), 0);
  const categorySales = orders.flatMap((order) => order.items || []).reduce((acc, item) => {
    acc[item.category || 'Other'] = (acc[item.category || 'Other'] || 0) + Number(item.lineTotal || 0);
    return acc;
  }, {});
  const shopRevenue = orders.flatMap((order) => order.items || []).reduce((acc, item) => {
    acc[item.shopName || item.shopId] = (acc[item.shopName || item.shopId] || 0) + Number(item.lineTotal || 0);
    return acc;
  }, {});
  const productVelocity = orders.flatMap((order) => order.items || []).reduce((acc, item) => {
    acc[item.productName || item.productId] = (acc[item.productName || item.productId] || 0) + Number(item.qty || 0);
    return acc;
  }, {});
  const openComplaints = complaints.filter((entry) => entry.status !== 'resolved').length;
  const pendingRefunds = refunds.filter((entry) => entry.status === 'pending').length;
  const resolvedRefunds = refunds.filter((entry) => entry.status === 'approved' || entry.status === 'rejected').length;
  const approvedShopCount = shops.filter((entry) => entry.approvalStatus === 'approved').length;
  const approvedPartnerCount = partners.filter((entry) => entry.approvalStatus === 'approved').length;
  const activePartnerCount = partners.filter((entry) => entry.online).length;
  const activeJobs = orders.filter((order) =>
    ['Accepted by shop', 'Partner assigned', 'Picked up', 'Out for delivery'].includes(order.status)
  ).length;
  const activeOrders = orders.filter((order) => ['Placed', 'Accepted by shop', 'Partner assigned', 'Picked up', 'Out for delivery'].includes(order.status)).length;
  const ordersByCity = orders.reduce((acc, order) => {
    const city = order.address?.city || 'Unknown';
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {});
  const topShops = Object.entries(shopRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, revenue]) => ({ name, revenue: Number(revenue.toFixed(2)) }));
  const topProducts = Object.entries(productVelocity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));
  const categoryBreakdown = Object.entries(categorySales)
    .sort((a, b) => b[1] - a[1])
    .map(([category, revenue]) => ({ category, revenue: Number(revenue.toFixed(2)) }));

  return {
    totalOrders: orders.length,
    deliveredOrders: orders.filter((entry) => entry.status === 'Delivered').length,
    cancelledOrders: orders.filter((entry) => entry.status === 'Cancelled/Refunded').length,
    activeOrders,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    averageOrderValue: orders.length ? Number((totalRevenue / orders.length).toFixed(2)) : 0,
    totalGross: Number(totalGross.toFixed(2)),
    approvedShopCount,
    approvedPartnerCount,
    activePartnerCount,
    activeJobs,
    openComplaints,
    pendingRefunds,
    resolvedRefunds,
    subscriptionCount: subscriptions.length,
    ordersByCity: Object.entries(ordersByCity).map(([city, count]) => ({ city, count })),
    topShops,
    topProducts,
    categoryBreakdown,
  };
};

router.get('/overview360', authenticate, async (_req, res) => {
  try {
    setEdgeCacheHeaders(res, { isPublic: false, sMaxageSec: 25, swrSec: 120 });
    const now = Date.now();
    if (ENABLE_OVERVIEW_CACHE && overviewCache.data && now - overviewCache.cachedAt < OVERVIEW_CACHE_TTL_MS) {
      return res.json({
        success: true,
        data: overviewCache.data,
        meta: { cache: 'hit', cachedAt: new Date(overviewCache.cachedAt).toISOString() },
      });
    }

    const startedAt = Date.now();
    const data = await computeOverview360Data();
    overviewCache = { cachedAt: Date.now(), data };
    logger.info('hyperlocal overview360 recomputed', {
      durationMs: Date.now() - startedAt,
      cacheTtlMs: OVERVIEW_CACHE_TTL_MS,
    });
    return res.json({
      success: true,
      data,
      meta: { cache: 'miss', cachedAt: new Date(overviewCache.cachedAt).toISOString() },
    });
  } catch (error) {
    logger.error('hyperlocal overview360 error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load Hyperlocal 360 data.' });
  }
});

router.post('/internal/cron/overview360-rebuild', async (req, res) => {
  if (!CRON_SECRET) {
    return res.status(503).json({ success: false, message: 'HYPERLOCAL_CRON_SECRET is not configured.' });
  }
  const providedSecret = String(req.headers['x-cron-secret'] || '').trim();
  if (providedSecret !== CRON_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorized cron request.' });
  }
  try {
    const startedAt = Date.now();
    const data = await computeOverview360Data();
    overviewCache = { cachedAt: Date.now(), data };
    return res.json({
      success: true,
      data: {
        cachedAt: new Date(overviewCache.cachedAt).toISOString(),
        durationMs: Date.now() - startedAt,
        summary: {
          totalOrders: data.totalOrders,
          totalRevenue: data.totalRevenue,
          activeOrders: data.activeOrders,
        },
      },
    });
  } catch (error) {
    logger.error('hyperlocal cron overview rebuild error:', error);
    return res.status(500).json({ success: false, message: 'Unable to rebuild overview cache.' });
  }
});

router.get('/admin/refunds', authenticate, verifyAdmin, async (_req, res) => {
  const status = String(_req.query.status || '').trim().toLowerCase();
  const { page, limit, skip } = parsePagination(_req, { page: 1, limit: 20 });
  if (isMongoReady()) {
    const query = status ? { status } : {};
    const [refunds, total] = await Promise.all([
      HyperlocalRefund.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      HyperlocalRefund.countDocuments(query),
    ]);
    return res.json({
      success: true,
      data: {
        refunds,
        pagination: {
          page,
          limit,
          total,
          totalPages: total ? Math.ceil(total / limit) : 0,
          hasNext: skip + refunds.length < total,
          hasPrev: page > 1,
        },
      },
    });
  }
  const filtered = store.refunds
    .filter((entry) => (!status ? true : String(entry.status || '').toLowerCase() === status))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const paged = paginateList(filtered, page, limit);
  return res.json({ success: true, data: { refunds: paged.items, pagination: paged.pagination } });
});
router.patch('/admin/refunds/:refundId/review', authenticate, verifyAdmin, writeLimiter, async (req, res) => {
  const status = String(req.body.status || '').trim().toLowerCase();
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be approved or rejected.' });
  }
  if (isMongoReady()) {
    const result = await HyperlocalRefund.findOneAndUpdate(
      { refundId: req.params.refundId },
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    ).lean();
    if (!result) return res.status(404).json({ success: false, message: 'Refund request not found.' });
    await HyperlocalOrder.updateOne({ orderId: result.orderId }, { $set: { refundStatus: status } });
    await logAdminAction(req, {
      action: 'refund.review',
      targetType: 'refund',
      targetId: req.params.refundId,
      meta: { status, orderId: result.orderId },
    });
    invalidateOverviewCache();
    return res.json({ success: true, message: `Refund ${status}.`, data: { refund: result } });
  }
  const idx = store.refunds.findIndex((entry) => entry.refundId === req.params.refundId);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Refund request not found.' });
  store.refunds[idx].status = status;
  store.refunds[idx].updatedAt = new Date();
  const orderIndex = store.orders.findIndex((entry) => entry.orderId === store.refunds[idx].orderId);
  if (orderIndex !== -1) store.orders[orderIndex].refundStatus = status;
  await logAdminAction(req, {
    action: 'refund.review',
    targetType: 'refund',
    targetId: req.params.refundId,
    meta: { status, orderId: store.refunds[idx].orderId },
  });
  invalidateOverviewCache();
  return res.json({ success: true, message: `Refund ${status}.`, data: { refund: store.refunds[idx] } });
});

router.get('/admin/complaints', authenticate, verifyAdmin, async (_req, res) => {
  const status = String(_req.query.status || '').trim().toLowerCase();
  const { page, limit, skip } = parsePagination(_req, { page: 1, limit: 20 });
  if (isMongoReady()) {
    const query = status ? { status } : {};
    const [complaints, total] = await Promise.all([
      HyperlocalComplaint.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      HyperlocalComplaint.countDocuments(query),
    ]);
    return res.json({
      success: true,
      data: {
        complaints,
        pagination: {
          page,
          limit,
          total,
          totalPages: total ? Math.ceil(total / limit) : 0,
          hasNext: skip + complaints.length < total,
          hasPrev: page > 1,
        },
      },
    });
  }
  const filtered = store.complaints
    .filter((entry) => (!status ? true : String(entry.status || '').toLowerCase() === status))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const paged = paginateList(filtered, page, limit);
  return res.json({ success: true, data: { complaints: paged.items, pagination: paged.pagination } });
});
router.patch('/admin/complaints/:complaintId/resolve', authenticate, verifyAdmin, writeLimiter, async (req, res) => {
  const resolutionNote = String(req.body.resolutionNote || '').trim();
  if (isMongoReady()) {
    const result = await HyperlocalComplaint.findOneAndUpdate(
      { complaintId: req.params.complaintId },
      { $set: { status: 'resolved', resolutionNote, updatedAt: new Date() } },
      { new: true }
    ).lean();
    if (!result) return res.status(404).json({ success: false, message: 'Complaint not found.' });
    await HyperlocalOrder.updateOne({ orderId: result.orderId }, { $set: { complaintStatus: 'resolved' } });
    await logAdminAction(req, {
      action: 'complaint.resolve',
      targetType: 'complaint',
      targetId: req.params.complaintId,
      meta: { orderId: result.orderId, resolutionNote },
    });
    invalidateOverviewCache();
    return res.json({ success: true, message: 'Complaint resolved.', data: { complaint: result } });
  }
  const idx = store.complaints.findIndex((entry) => entry.complaintId === req.params.complaintId);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Complaint not found.' });
  store.complaints[idx].status = 'resolved';
  store.complaints[idx].resolutionNote = resolutionNote;
  store.complaints[idx].updatedAt = new Date();
  const orderIndex = store.orders.findIndex((entry) => entry.orderId === store.complaints[idx].orderId);
  if (orderIndex !== -1) store.orders[orderIndex].complaintStatus = 'resolved';
  await logAdminAction(req, {
    action: 'complaint.resolve',
    targetType: 'complaint',
    targetId: req.params.complaintId,
    meta: { orderId: store.complaints[idx].orderId, resolutionNote },
  });
  invalidateOverviewCache();
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

router.get('/admin/audit-logs', authenticate, verifyAdmin, async (req, res) => {
  const action = String(req.query.action || '').trim();
  const { page, limit, skip } = parsePagination(req, { page: 1, limit: 50 });
  if (isMongoReady()) {
    const query = action ? { action } : {};
    const [auditLogs, total] = await Promise.all([
      HyperlocalAdminAuditLog.find(query).sort({ at: -1 }).skip(skip).limit(limit).lean(),
      HyperlocalAdminAuditLog.countDocuments(query),
    ]);
    return res.json({
      success: true,
      data: {
        auditLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: total ? Math.ceil(total / limit) : 0,
          hasNext: skip + auditLogs.length < total,
          hasPrev: page > 1,
        },
      },
    });
  }
  const filtered = store.auditLogs
    .filter((entry) => (!action ? true : String(entry.action) === action))
    .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
  const paged = paginateList(filtered, page, limit);
  return res.json({ success: true, data: { auditLogs: paged.items, pagination: paged.pagination } });
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

router.post('/wallet/topup', authenticate, highRiskWriteLimiter, async (req, res) => {
  const userEmail = ensureAuthenticatedEmail(req, res);
  if (!userEmail) return;
  const amount = toNum(req.body.amount, 0);
  if (amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount is required.' });
  const paymentReference = String(req.body.paymentReference || '').trim();
  const paymentStatus = String(req.body.paymentStatus || '').trim().toLowerCase();
  if (!paymentReference || paymentReference.length < 6) {
    return res.status(400).json({ success: false, message: 'A valid paymentReference is required.' });
  }
  if (paymentStatus !== 'verified') {
    return res.status(400).json({ success: false, message: 'paymentStatus must be verified.' });
  }
  const tx = {
    txId: id('HLTX'),
    type: 'credit',
    amount,
    note: 'Wallet top-up',
    paymentReference,
    at: new Date(),
  };

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

router.get('/subscriptions/plans', (_req, res) => {
  setEdgeCacheHeaders(res, { isPublic: true, sMaxageSec: 600, swrSec: 3600 });
  return res.json({
    success: true,
    data: {
      plans: SUBSCRIPTION_PLANS,
    },
  });
});

router.post('/subscriptions/subscribe', authenticate, highRiskWriteLimiter, async (req, res) => {
  const email = ensureAuthenticatedEmail(req, res);
  if (!email) return;
  const planCode = String(req.body.planCode || '').trim();
  const plan = SUBSCRIPTION_PLAN_MAP[planCode];
  if (!plan) return res.status(400).json({ success: false, message: 'Invalid planCode.' });
  const amount = toNum(plan.amount, 0);
  const now = new Date();
  const existingActive = isMongoReady()
    ? await HyperlocalSubscription.findOne({ userEmail: email, planCode, status: 'active', validUntil: { $gt: now } }).lean()
    : store.subscriptions.find(
        (entry) =>
          entry.userEmail === email &&
          entry.planCode === planCode &&
          entry.status === 'active' &&
          new Date(entry.validUntil) > now
      );
  if (existingActive) {
    return res.status(409).json({ success: false, message: 'This subscription is already active.' });
  }
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
  invalidateOverviewCache();
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

router.post('/ads', authenticate, highRiskWriteLimiter, async (req, res) => {
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
  const { page, limit } = parsePagination(req, { page: 1, limit: 20 });
  if (isMongoReady()) {
    const allAds = (await HyperlocalAd.find(shopId ? { shopId } : {}).sort({ createdAt: -1 }).lean()).filter((entry) =>
      filterShopIds.has(entry.shopId)
    );
    const paged = paginateList(allAds, page, limit);
    return res.json({ success: true, data: { ads: paged.items, pagination: paged.pagination } });
  }
  const filtered = store.ads
    .filter((entry) => filterShopIds.has(entry.shopId))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const paged = paginateList(filtered, page, limit);
  return res.json({ success: true, data: { ads: paged.items, pagination: paged.pagination } });
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
