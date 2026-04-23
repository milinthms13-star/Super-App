const express = require('express');
const Joi = require('joi');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { createStrictRateLimiter } = require('../middleware/rateLimiter');
const Product = require('../models/Product');
const devProductStore = require('../utils/devProductStore');
const devAppDataStore = require('../utils/devAppDataStore');
const Order = require('../models/Order');
const orderStore = require('../utils/orderStore');
const paymentAttemptStore = require('../utils/paymentAttemptStore');
const logger = require('../utils/logger');
const { ADMIN_EMAIL, ORDER_STATUSES, DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT, ORDER_CURRENCY, DELIVERY_BASE_FEE, DELIVERY_PER_ITEM_FEE, MILLISECONDS_IN_DAY, ORDER_STATUS_RANK } = require('../config/constants');
const { validateDeliveryAddress, validateReturnRequest, validatePhone, validatePincode } = require('../utils/validators');

const router = express.Router();

// Strict rate limiter for payment endpoints
const paymentRateLimiter = createStrictRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 5, // Max 5 payment attempts per minute per user (stricter)
});

const useMemoryProducts = () => {
  return process.env.AUTH_STORAGE === 'memory' && process.env.NODE_ENV !== 'production';
};

const orderSchema = Joi.object({
  amount: Joi.string().trim().allow('').optional(),
  subtotal: Joi.string().trim().allow('').optional(),
  deliveryFee: Joi.string().trim().allow('').optional(),
  deliveryAddress: Joi.string().trim().required(),
  deliveryDetails: Joi.object({
    receiverPhone: Joi.string().trim().required(),
    pincode: Joi.string().trim().required(),
    country: Joi.string().trim().required(),
    state: Joi.string().trim().required(),
    district: Joi.string().trim().required(),
    houseName: Joi.string().trim().required(),
    addressLine: Joi.string().trim().required(),
  }).required(),
  walletPayment: Joi.boolean().default(false),
  items: Joi.array()
    .items(
      Joi.object({
        id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
        productId: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
        batchId: Joi.string().allow('').trim().optional(),
        name: Joi.string().allow('').trim().default(''),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().min(0).optional(),
      })
    )
    .min(1)
    .required(),
});

const createPaymentSchema = orderSchema.keys({
  gateway: Joi.string().valid('razorpay', 'stripe').required(),
});

const razorpayVerifySchema = Joi.object({
  attemptId: Joi.string().trim().required(),
  razorpay_order_id: Joi.string().trim().required(),
  razorpay_payment_id: Joi.string().trim().required(),
  razorpay_signature: Joi.string().trim().required(),
});

const stripeVerifySchema = Joi.object({
  attemptId: Joi.string().trim().required(),
  sessionId: Joi.string().trim().required(),
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid(...ORDER_STATUSES).required(),
  sellerKey: Joi.string().allow('').trim().default(''),
  provider: Joi.string().valid('manual', 'shiprocket', 'dhl').default('manual'),
  trackingNumber: Joi.string().allow('').trim().default(''),
  shipmentId: Joi.string().allow('').trim().default(''),
});

const syncOrderStatusSchema = Joi.object({
  provider: Joi.string().valid('shiprocket', 'dhl').required(),
  sellerKey: Joi.string().allow('').trim().default(''),
  trackingNumber: Joi.string().allow('').trim().default(''),
  shipmentId: Joi.string().allow('').trim().default(''),
});

const createReturnRequestSchema = Joi.object({
  itemId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  reason: Joi.string().valid('damaged', 'not_satisfied', 'wrong_item').required(),
  details: Joi.string().allow('').max(600).default(''),
});

const updateReturnRequestSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject', 'refund_completed').required(),
});

const normalizeOrderStatus = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (!normalizedStatus || normalizedStatus === 'paid' || normalizedStatus === 'cash on delivery') {
    return 'Confirmed';
  }

  const matchedStatus = ORDER_STATUSES.find(
    (orderStatus) => orderStatus.toLowerCase() === normalizedStatus
  );

  return matchedStatus || 'Confirmed';
};

const buildSellerKey = ({ sellerEmail = '', businessName = '', itemId = '' }) =>
  sellerEmail || `${businessName || 'seller'}-${itemId}`;

const deriveOrderStatusFromFulfillments = (sellerFulfillments = []) => {
  if (!Array.isArray(sellerFulfillments) || sellerFulfillments.length === 0) {
    return 'Confirmed';
  }

  return sellerFulfillments.reduce((currentStatus, fulfillment) => {
    const normalizedStatus = normalizeOrderStatus(fulfillment.status);
    return ORDER_STATUS_RANK[normalizedStatus] < ORDER_STATUS_RANK[currentStatus]
      ? normalizedStatus
      : currentStatus;
  }, 'Delivered');
};

const mapExternalStatusToOrderStatus = (externalStatus = '') => {
  const normalizedStatus = String(externalStatus).trim().toLowerCase();

  if (
    normalizedStatus.includes('deliver') ||
    normalizedStatus.includes('proof of delivery')
  ) {
    return 'Delivered';
  }

  if (
    normalizedStatus.includes('transit') ||
    normalizedStatus.includes('shipped') ||
    normalizedStatus.includes('out for delivery') ||
    normalizedStatus.includes('reached destination')
  ) {
    return 'Shipped';
  }

  if (
    normalizedStatus.includes('pick') ||
    normalizedStatus.includes('pack') ||
    normalizedStatus.includes('manifest')
  ) {
    return 'Packed';
  }

  return 'Confirmed';
};

const resolveRole = (req) =>
  (
    req.user?.registrationType ||
    req.user?.role ||
    req.auth?.registrationType ||
    req.auth?.role ||
    req.headers['x-malabar-role'] ||
    ''
  )
    .toString()
    .trim()
    .toLowerCase();

const isAdmin = (req) =>
  resolveRole(req) === 'admin' || req.user?.email?.trim().toLowerCase() === ADMIN_EMAIL;

const isSellerRole = (req) => ['entrepreneur', 'business'].includes(resolveRole(req));

const normalizeSellerKey = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

const serializeFulfillmentHistoryEntry = (entry = {}) => ({
  status: normalizeOrderStatus(entry.status),
  provider: entry.provider || 'manual',
  trackingNumber: entry.trackingNumber || '',
  shipmentId: entry.shipmentId || '',
  externalStatus: entry.externalStatus || '',
  changedAt: entry.changedAt || null,
  source: entry.source || 'manual',
});

const buildNormalizedSellerFulfillments = (sellerFulfillments = [], items = []) => {
  if (Array.isArray(sellerFulfillments) && sellerFulfillments.length > 0) {
    return sellerFulfillments.map((fulfillment) => ({
      sellerKey: fulfillment.sellerKey,
      sellerEmail: fulfillment.sellerEmail || '',
      sellerName: fulfillment.sellerName || '',
      businessName: fulfillment.businessName || '',
      itemIds: Array.isArray(fulfillment.itemIds) ? fulfillment.itemIds.map(String) : [],
      status: normalizeOrderStatus(fulfillment.status),
      provider: fulfillment.provider || 'manual',
      trackingNumber: fulfillment.trackingNumber || '',
      shipmentId: fulfillment.shipmentId || '',
      externalStatus: fulfillment.externalStatus || '',
      updatedAt: fulfillment.updatedAt || null,
      history: Array.isArray(fulfillment.history)
        ? fulfillment.history.map(serializeFulfillmentHistoryEntry)
        : [],
    }));
  }

  const grouped = new Map();
  for (const item of items) {
    const sellerKey = item.sellerKey || buildSellerKey(item);
    if (!grouped.has(sellerKey)) {
      grouped.set(sellerKey, {
        sellerKey,
        sellerEmail: item.sellerEmail || '',
        sellerName: item.sellerName || '',
        businessName: item.businessName || '',
        itemIds: [],
        status: normalizeOrderStatus(item.status || 'Confirmed'),
        provider: 'manual',
        trackingNumber: '',
        shipmentId: '',
        externalStatus: '',
        updatedAt: item.updatedAt || null,
        history: [],
      });
    }

    grouped.get(sellerKey).itemIds.push(String(item.id));
  }

  return Array.from(grouped.values());
};

const buildSerializedItems = (items = [], sellerFulfillments = []) => {
  const fulfillmentMap = new Map(
    sellerFulfillments.map((fulfillment) => [fulfillment.sellerKey, fulfillment])
  );

  return (items || []).map((item) => {
    const sellerKey = item.sellerKey || buildSellerKey(item);
    const fulfillment = fulfillmentMap.get(sellerKey);

    return {
      id: item.id,
      productId: item.productId || item.id,
      batchId: item.batchId || '',
      batchLabel: item.batchLabel || '',
      category: item.category || '',
      name: item.name || '',
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
      location: item.location || item.batchLocation || '',
      batchLocation: item.batchLocation || item.location || '',
      expiryDate: item.expiryDate || null,
      returnAllowed: Boolean(item.returnAllowed),
      returnWindowDays: Number(item.returnWindowDays || 0),
      returnRequest: item.returnRequest || null,
      sellerKey,
      sellerEmail: item.sellerEmail || fulfillment?.sellerEmail || '',
      sellerName: item.sellerName || fulfillment?.sellerName || '',
      businessName: item.businessName || fulfillment?.businessName || '',
      status: normalizeOrderStatus(fulfillment?.status || item.status || 'Confirmed'),
    };
  });
};

const getNumericAmount = (value) => roundCurrency(parseCurrencyAmount(value));

const derivePaymentSummary = (paymentDetails = null) => {
  const gateway = paymentDetails?.gateway || 'cash_on_delivery';

  return {
    gateway,
    paymentMethod:
      gateway === 'cash_on_delivery'
        ? 'Cash on Delivery'
        : gateway === 'razorpay'
          ? 'Razorpay'
          : gateway === 'stripe'
            ? 'Stripe'
            : gateway,
    paymentStatus:
      gateway === 'cash_on_delivery'
        ? 'Pending'
        : paymentDetails?.paymentStatus || 'Paid',
  };
};

const serializeOrder = (order) => {
  const sellerFulfillments = buildNormalizedSellerFulfillments(
    order.sellerFulfillments,
    order.items
  );
  const paymentSummary = derivePaymentSummary(order.paymentDetails);
  const amount = getNumericAmount(order.amount);
  const subtotal = getNumericAmount(order.subtotal);
  const deliveryFee = getNumericAmount(order.deliveryFee);

  return {
    id: order.id,
    customerEmail: order.customerEmail || '',
    customerName: order.customerName || '',
    amount,
    subtotal,
    deliveryFee,
    formattedAmount: formatCurrencyAmount(amount),
    formattedSubtotal: formatCurrencyAmount(subtotal),
    formattedDeliveryFee: formatCurrencyAmount(deliveryFee),
    deliveryAddress: order.deliveryAddress,
    deliveryDetails: order.deliveryDetails,
    items: buildSerializedItems(order.items, sellerFulfillments),
    sellerFulfillments,
    paymentDetails: order.paymentDetails || null,
    gateway: paymentSummary.gateway,
    paymentMethod: paymentSummary.paymentMethod,
    paymentStatus: paymentSummary.paymentStatus,
    status: deriveOrderStatusFromFulfillments(sellerFulfillments),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt || order.createdAt || null,
    deliveredAt: order.deliveredAt || null,
  };
};

const findDbProductById = async (productId) => Product.findById(productId);

const isBatchExpired = (batch = {}, now = new Date()) => {
  if (!batch?.expiryDate) {
    return false;
  }

  const expiryDate = new Date(batch.expiryDate);
  if (Number.isNaN(expiryDate.getTime())) {
    return false;
  }

  return expiryDate < now;
};

const updateDbProductStock = async (productId, nextStock, inventoryBatches) =>
  Product.findByIdAndUpdate(
    productId,
    { stock: nextStock, inventoryBatches },
    { new: true, runValidators: true }
  );

const buildProductAvailableStock = (product = {}, batchId = '') => {
  if (Array.isArray(product.inventoryBatches) && product.inventoryBatches.length > 0) {
    const now = new Date();
    if (batchId) {
      const matchingBatch = product.inventoryBatches.find(
        (batch) => String(batch.id || batch._id || '') === String(batchId)
      );
      if (!matchingBatch || matchingBatch.isActive === false || isBatchExpired(matchingBatch, now)) {
        return 0;
      }

      return Math.max(0, Number(matchingBatch.stock || 0));
    }

    return product.inventoryBatches.reduce(
      (sum, batch) =>
        batch.isActive === false || isBatchExpired(batch, now)
          ? sum
          : sum + Math.max(0, Number(batch.stock || 0)),
      0
    );
  }

  return Math.max(0, Number(product.stock || 0));
};

const reduceInventoryBatches = (inventoryBatches = [], quantityToReduce = 0, batchId = '') => {
  let remainingQuantity = Math.max(0, Number(quantityToReduce || 0));
  const now = new Date();
  const nextBatches = (inventoryBatches || []).map((batch) => {
    const currentStock = Math.max(0, Number(batch.stock || 0));
    const currentBatchId = String(batch.id || batch._id || '');
    const shouldSkipSelectedBatch = batchId && currentBatchId !== String(batchId);
    if (
      remainingQuantity <= 0 ||
      currentStock <= 0 ||
      batch.isActive === false ||
      isBatchExpired(batch, now) ||
      shouldSkipSelectedBatch
    ) {
      return {
        ...batch,
        stock: currentStock,
      };
    }

    const consumed = Math.min(currentStock, remainingQuantity);
    remainingQuantity -= consumed;

    return {
      ...batch,
      stock: currentStock - consumed,
    };
  });

  return {
    inventoryBatches: nextBatches,
    remainingQuantity,
    nextStock: nextBatches.reduce((sum, batch) => sum + Number(batch.stock || 0), 0),
  };
};

const parseCurrencyAmount = (value) => {
  if (typeof value === 'number') {
    return value;
  }

  const numericValue = Number(
    String(value || '')
      .replace(/[^0-9.]/g, '')
      .trim()
  );

  return Number.isFinite(numericValue) ? numericValue : 0;
};

const toPaise = (value) => Math.round(parseCurrencyAmount(value) * 100);
const roundCurrency = (value) => Math.round(Number(value || 0) * 100) / 100;
const formatCurrencyAmount = (value) => {
  const roundedValue = roundCurrency(value);
  const isWholeNumber = Number.isInteger(roundedValue);
  return `${ORDER_CURRENCY} ${isWholeNumber ? roundedValue : roundedValue.toFixed(2)}`;
};

const getRequestedProductId = (item = {}) => {
  if (item.productId !== undefined && item.productId !== null && String(item.productId).trim()) {
    return String(item.productId).trim();
  }

  const normalizedId = String(item.id || '').trim();
  if (normalizedId.includes('::batch::')) {
    return normalizedId.split('::batch::')[0];
  }

  return normalizedId;
};

const getRequestedBatchId = (item = {}) => String(item.batchId || '').trim();

const resolveBatchBackedPrice = ({ product = {}, batchId = '' }) => {
  const inventoryBatches = Array.isArray(product.inventoryBatches) ? product.inventoryBatches : [];
  const now = new Date();
  const normalizedBatchId = String(batchId || '').trim();
  const matchingBatch = normalizedBatchId
    ? inventoryBatches.find((batch) => String(batch.id || batch._id || '') === normalizedBatchId)
    : null;
  const activeBatch = matchingBatch && matchingBatch.isActive !== false && !isBatchExpired(matchingBatch, now)
    ? matchingBatch
    : inventoryBatches.find((batch) => batch.isActive !== false && !isBatchExpired(batch, now));

  if (!activeBatch) {
    return roundCurrency(product.price || 0);
  }

  const batchMrp = roundCurrency(activeBatch.mrp ?? product.mrp ?? product.price ?? 0);
  const batchSellingPrice = roundCurrency(activeBatch.price ?? product.price ?? 0);
  const parsedDiscountStartDate = activeBatch.discountStartDate ? new Date(activeBatch.discountStartDate) : null;
  const parsedDiscountEndDate = activeBatch.discountEndDate ? new Date(activeBatch.discountEndDate) : null;
  const isBeforeDiscountStart =
    parsedDiscountStartDate && !Number.isNaN(parsedDiscountStartDate.getTime())
      ? now < parsedDiscountStartDate
      : false;
  const isAfterDiscountEnd =
    parsedDiscountEndDate && !Number.isNaN(parsedDiscountEndDate.getTime())
      ? now > parsedDiscountEndDate
      : false;
  const savedDiscountAmount = Math.max(
    0,
    Number(activeBatch.discountAmount ?? Math.max(0, batchMrp - batchSellingPrice))
  );
  const hasActiveDiscount = savedDiscountAmount > 0 && !isBeforeDiscountStart && !isAfterDiscountEnd;

  return roundCurrency(hasActiveDiscount ? batchSellingPrice : batchMrp || batchSellingPrice);
};

const getAuthoritativeUnitPrice = ({ item, product }) => {
  const hasInventoryBatches = Array.isArray(product?.inventoryBatches) && product.inventoryBatches.length > 0;
  if (hasInventoryBatches) {
    return resolveBatchBackedPrice({
      product,
      batchId: getRequestedBatchId(item),
    });
  }

  return roundCurrency(product?.price || 0);
};

const getFrontendBaseUrl = () => {
  const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins[0] || 'http://localhost:3000';
};

const getStripeSecretKey = () => process.env.STRIPE_SECRET_KEY || '';
const getStripePublishableKey = () => process.env.STRIPE_PUBLISHABLE_KEY || '';
const getRazorpayKeyId = () => process.env.RAZORPAY_KEY_ID || '';
const getRazorpayKeySecret = () => process.env.RAZORPAY_KEY_SECRET || '';

const getPaymentConfig = () => ({
  stripe: {
    enabled: Boolean(getStripeSecretKey() && getStripePublishableKey()),
    publishableKey: getStripePublishableKey(),
  },
  razorpay: {
    enabled: Boolean(getRazorpayKeyId() && getRazorpayKeySecret()),
    keyId: getRazorpayKeyId(),
  },
});

const buildEnrichedOrderItems = ({ items, starterProductMap, dbProducts }) =>
  items.map((item) => {
    const normalizedId = getRequestedProductId(item);
    const sourceProduct = starterProductMap.get(normalizedId) || dbProducts.get(normalizedId) || {};
    const activeBatch = Array.isArray(sourceProduct.inventoryBatches)
      ? sourceProduct.inventoryBatches.find((batch) => {
          if (getRequestedBatchId(item)) {
            return String(batch.id || batch._id || '') === getRequestedBatchId(item);
          }

          return Number(batch.stock || 0) > 0 && !isBatchExpired(batch);
        })
      : null;
    const sellerKey = buildSellerKey({
      sellerEmail: sourceProduct.sellerEmail,
      businessName: sourceProduct.businessName || sourceProduct.sellerName || item.name,
      itemId: normalizedId,
    });

    return {
      id: item.id,
      productId: getRequestedProductId(item),
      batchId: getRequestedBatchId(item),
      batchLabel: activeBatch?.batchLabel || item.batchLabel || '',
      category: item.category || sourceProduct.category || '',
      name: item.name || sourceProduct.name || '',
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0),
      sellerKey,
      sellerEmail: sourceProduct.sellerEmail || '',
      sellerName: sourceProduct.sellerName || '',
      businessName: sourceProduct.businessName || sourceProduct.sellerName || '',
      location: activeBatch?.location || sourceProduct.location || '',
      batchLocation: activeBatch?.location || sourceProduct.location || '',
      expiryDate: activeBatch?.expiryDate || item.expiryDate || sourceProduct.expiryDate || null,
      returnAllowed:
        typeof activeBatch?.returnAllowed === 'boolean'
          ? activeBatch.returnAllowed
          : Boolean(item.returnAllowed || sourceProduct.returnAllowed),
      returnWindowDays: Number(
        activeBatch?.returnWindowDays ?? item.returnWindowDays ?? sourceProduct.returnWindowDays ?? 0
      ),
      returnRequest: item.returnRequest || null,
      status: 'Confirmed',
    };
  });

const buildInitialSellerFulfillments = (items = []) => {
  const now = new Date().toISOString();
  const grouped = new Map();

  for (const item of items) {
    const sellerKey = item.sellerKey || buildSellerKey(item);
    if (!grouped.has(sellerKey)) {
      grouped.set(sellerKey, {
        sellerKey,
        sellerEmail: item.sellerEmail || '',
        sellerName: item.sellerName || '',
        businessName: item.businessName || '',
        itemIds: [],
        status: 'Confirmed',
        provider: 'manual',
        trackingNumber: '',
        shipmentId: '',
        externalStatus: '',
        updatedAt: now,
        history: [
          {
            status: 'Confirmed',
            provider: 'manual',
            trackingNumber: '',
            shipmentId: '',
            externalStatus: '',
            changedAt: now,
            source: 'order_created',
          },
        ],
      });
    }

    grouped.get(sellerKey).itemIds.push(String(item.id));
  }

  return Array.from(grouped.values());
};

const getNextOrderStatus = (currentStatus) => {
  const normalizedCurrentStatus = normalizeOrderStatus(currentStatus);
  const currentRank = ORDER_STATUS_RANK[normalizedCurrentStatus];
  const nextStatus = ORDER_STATUSES[currentRank + 1];
  return nextStatus || normalizedCurrentStatus;
};

const isValidNextStatusTransition = (currentStatus, nextStatus) => {
  const normalizedCurrentStatus = normalizeOrderStatus(currentStatus);
  const normalizedNextStatus = normalizeOrderStatus(nextStatus);

  if (normalizedCurrentStatus === normalizedNextStatus) {
    return true;
  }

  return ORDER_STATUS_RANK[normalizedNextStatus] === ORDER_STATUS_RANK[normalizedCurrentStatus] + 1;
};

const sellerOwnsFulfillment = ({ fulfillment, user, req }) => {
  const userEmail = String(user?.email || '').trim().toLowerCase();
  const fulfillmentEmail = String(fulfillment?.sellerEmail || '').trim().toLowerCase();

  // Only allow authorization by email (not business name) to prevent cross-seller access
  return Boolean(userEmail && fulfillmentEmail && userEmail === fulfillmentEmail);
};

const resolveSellerFulfillmentForRequest = ({ order, req, sellerKey = '' }) => {
  const serializedOrder = serializeOrder(order);
  const sellerFulfillments = serializedOrder.sellerFulfillments || [];
  const normalizedRequestedSellerKey = normalizeSellerKey(sellerKey);
  const ownedFulfillments = sellerFulfillments.filter((fulfillment) =>
    sellerOwnsFulfillment({ fulfillment, user: req.user, req })
  );

  if (ownedFulfillments.length === 0) {
    const error = new Error('You can update only your own seller items.');
    error.statusCode = 403;
    throw error;
  }

  if (normalizedRequestedSellerKey) {
    const requestedFulfillment = ownedFulfillments.find(
      (fulfillment) => normalizeSellerKey(fulfillment.sellerKey) === normalizedRequestedSellerKey
    );

    if (!requestedFulfillment) {
      const error = new Error('Seller fulfillment not found for this order.');
      error.statusCode = 404;
      throw error;
    }

    return requestedFulfillment;
  }

  if (ownedFulfillments.length > 1) {
    const error = new Error('This order has multiple seller segments. Choose the seller item group first.');
    error.statusCode = 400;
    throw error;
  }

  return ownedFulfillments[0];
};

const parseProviderStatusFromPayload = (provider, payload = {}) => {
  const candidateValues = [
    payload.status,
    payload.current_status,
    payload.currentStatus,
    payload.tracking_status,
    payload.trackingStatus,
    payload.shipment_status,
    payload.shipmentStatus,
    payload.awb_status,
    payload.awbStatus,
    payload.shipments?.[0]?.current_status,
    payload.shipments?.[0]?.status,
    payload.data?.current_status,
    payload.data?.status,
  ].filter(Boolean);

  if (candidateValues.length === 0) {
    const error = new Error(`${provider} status payload did not include a recognizable shipment status.`);
    error.statusCode = 502;
    throw error;
  }

  return String(candidateValues[0]);
};

const fetchProviderShipmentStatus = async ({ provider, trackingNumber, shipmentId }) => {
  const envPrefix = provider === 'shiprocket' ? 'SHIPROCKET' : 'DHL';
  const trackingUrl = process.env[`${envPrefix}_TRACKING_URL`] || '';
  const authToken =
    process.env[`${envPrefix}_TOKEN`] ||
    process.env[`${envPrefix}_API_KEY`] ||
    '';

  if (!trackingUrl) {
    const error = new Error(`${provider} tracking is not configured on the backend.`);
    error.statusCode = 400;
    throw error;
  }

  const url = new URL(trackingUrl);
  if (trackingNumber) {
    url.searchParams.set('trackingNumber', trackingNumber);
  }
  if (shipmentId) {
    url.searchParams.set('shipmentId', shipmentId);
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      Accept: 'application/json',
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || `Unable to fetch ${provider} shipment status.`);
    error.statusCode = response.status || 502;
    throw error;
  }

  return {
    externalStatus: parseProviderStatusFromPayload(provider, data),
    payload: data,
  };
};

const validateOrderItemsAgainstStock = async (items) => {
  const appData = await devAppDataStore.readAppData();
  const starterProducts = Array.isArray(appData.moduleData?.ecommerceProducts)
    ? appData.moduleData.ecommerceProducts
    : [];

  const starterProductMap = new Map(
    starterProducts.map((product) => [String(product.id), product])
  );

  // Collect all DB product IDs to fetch (batch query to avoid N+1 problem)
  const dbProductIds = [];
  for (const item of items) {
    const normalizedId = getRequestedProductId(item);
    if (normalizedId && !starterProductMap.has(normalizedId) && !dbProductIds.includes(normalizedId)) {
      dbProductIds.push(normalizedId);
    }
  }

  // Fetch all DB products in a single batch query
  const dbProducts = new Map();
  if (dbProductIds.length > 0) {
    if (useMemoryProducts()) {
      // Memory storage: fetch each one (fallback for testing)
      for (const id of dbProductIds) {
        const product = await devProductStore.findProductById(id);
        if (product) {
          dbProducts.set(id, product);
        }
      }
    } else {
      // MongoDB: batch query for efficiency
      const products = await Product.find({ _id: { $in: dbProductIds } });
      products.forEach((product) => {
        dbProducts.set(String(product._id), product);
      });
    }
  }

  const resolvedItems = [];
  for (const item of items) {
    const normalizedId = getRequestedProductId(item);
    const starterProduct = starterProductMap.get(normalizedId);
    const dbProduct = dbProducts.get(normalizedId);
    const sourceProduct = starterProduct || dbProduct;

    if (!sourceProduct) {
      return {
        success: false,
        statusCode: 404,
        message: `${item.name || 'A product'} is no longer available.`,
      };
    }

      const availableStock = buildProductAvailableStock(sourceProduct, getRequestedBatchId(item));
      if (availableStock < Number(item.quantity || 0)) {
        return {
          success: false,
          statusCode: 400,
          message: `Only ${availableStock} item(s) left for ${sourceProduct.name}.`,
        };
      }

      resolvedItems.push({
        item,
        productLookupId: normalizedId,
        sourceProduct,
        unitPrice: getAuthoritativeUnitPrice({ item, product: sourceProduct }),
      });
    }

  return {
    success: true,
    starterProducts,
    starterProductMap,
    dbProducts,
    resolvedItems,
  };
};

const buildAuthoritativeOrderSummary = ({ resolvedItems = [] }) => {
  const normalizedItems = resolvedItems.map(({ item, productLookupId, sourceProduct, unitPrice }) => {
    const quantity = Number(item.quantity || 1);
    return {
      ...item,
      id: item.id,
      productId: productLookupId,
      name: item.name || sourceProduct.name || '',
      quantity,
      price: unitPrice,
      lineTotal: roundCurrency(unitPrice * quantity),
    };
  });
  const totalItems = normalizedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const subtotalValue = roundCurrency(
    normalizedItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0)
  );
  const deliveryFeeValue = totalItems > 0
    ? roundCurrency(DELIVERY_BASE_FEE + totalItems * DELIVERY_PER_ITEM_FEE)
    : 0;
  const amountValue = roundCurrency(subtotalValue + deliveryFeeValue);

  return {
    items: normalizedItems,
    totalItems,
    subtotalValue,
    deliveryFeeValue,
    amountValue,
    subtotal: formatCurrencyAmount(subtotalValue),
    deliveryFee: formatCurrencyAmount(deliveryFeeValue),
    amount: formatCurrencyAmount(amountValue),
  };
};

const canUseMongoOrderTransaction = ({ authoritativeItems = [], starterProductMap = new Map() }) =>
  mongoose.connection.readyState === 1 &&
  authoritativeItems.length > 0 &&
  authoritativeItems.every((item) => !starterProductMap.has(String(item.productId)));

const createStoredOrderPayload = ({
  user,
  orderData,
  authoritativeOrder,
  enrichedItems,
  sellerFulfillments,
  paymentDetails,
}) => ({
  customerEmail: user.email,
  customerName: user.name || user.email,
  amount: authoritativeOrder.amountValue,
  subtotal: authoritativeOrder.subtotalValue,
  deliveryFee: authoritativeOrder.deliveryFeeValue,
  deliveryAddress: orderData.deliveryAddress,
  deliveryDetails: orderData.deliveryDetails,
  items: enrichedItems,
  sellerFulfillments,
  paymentDetails,
  status: deriveOrderStatusFromFulfillments(sellerFulfillments),
});

const createOrderWithMongoTransaction = async ({
  user,
  orderData,
  paymentDetails = null,
  authoritativeOrder,
  starterProductMap,
  dbProducts,
}) => {
  let createdOrder = null;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      for (const item of authoritativeOrder.items) {
        const normalizedId = String(item.productId);
        if (starterProductMap.has(normalizedId)) {
          const error = new Error('Starter products are not supported in Mongo transactions.');
          error.statusCode = 400;
          throw error;
        }

        const product = await Product.findById(normalizedId).session(session);
        if (!product) {
          const error = new Error(`${item.name || 'A product'} is no longer available.`);
          error.statusCode = 404;
          throw error;
        }

        const availableStock = buildProductAvailableStock(product, String(item.batchId || ''));
        if (availableStock < Number(item.quantity || 0)) {
          const error = new Error(`Only ${availableStock} item(s) left for ${product.name}.`);
          error.statusCode = 409;
          throw error;
        }

        const reducedInventory = reduceInventoryBatches(
          product.inventoryBatches || [],
          Number(item.quantity || 0),
          String(item.batchId || '')
        );

        if (Array.isArray(product.inventoryBatches) && product.inventoryBatches.length > 0) {
          product.inventoryBatches = reducedInventory.inventoryBatches;
          product.stock = reducedInventory.nextStock;
        } else {
          product.stock = Math.max(0, Number(product.stock || 0) - Number(item.quantity || 0));
        }

        await product.save({ session });
        dbProducts.set(normalizedId, product.toObject());
      }

      const enrichedItems = buildEnrichedOrderItems({
        items: authoritativeOrder.items,
        starterProductMap,
        dbProducts,
      });
      const sellerFulfillments = buildInitialSellerFulfillments(enrichedItems);
      const payload = createStoredOrderPayload({
        user,
        orderData,
        authoritativeOrder,
        enrichedItems,
        sellerFulfillments,
        paymentDetails,
      });

      const [order] = await Order.create([payload], { session });
      createdOrder = order;
    });
  } finally {
    await session.endSession();
  }

  return createdOrder;
};

const persistStockReductionAndCreateOrder = async ({ user, orderData, paymentDetails = null, status = 'Confirmed' }) => {
  const stockCheck = await validateOrderItemsAgainstStock(orderData.items);
  if (!stockCheck.success) {
    const error = new Error(stockCheck.message);
    error.statusCode = stockCheck.statusCode;
    throw error;
  }

  const { starterProducts, starterProductMap, dbProducts, resolvedItems } = stockCheck;
  const authoritativeOrder = buildAuthoritativeOrderSummary({ resolvedItems });

  if (
    canUseMongoOrderTransaction({
      authoritativeItems: authoritativeOrder.items,
      starterProductMap,
    })
  ) {
    const order = await createOrderWithMongoTransaction({
      user,
      orderData,
      paymentDetails,
      status,
      authoritativeOrder,
      starterProductMap,
      dbProducts,
    });

    return order;
  }

  const nextStarterProducts = starterProducts.map((product) => {
    const matchingItem = authoritativeOrder.items.find(
      (item) => String(item.productId) === String(product.id)
    );
    if (!matchingItem) {
      return product;
    }

    return {
      ...product,
      stock: Math.max(0, Number(product.stock || 0) - Number(matchingItem.quantity || 0)),
    };
  });

  await devAppDataStore.updateAppData(async (currentData) => ({
    ...currentData,
    moduleData: {
      ...currentData.moduleData,
      ecommerceProducts: nextStarterProducts,
    },
  }));

  for (const item of authoritativeOrder.items) {
    const normalizedId = String(item.productId);
    if (starterProductMap.has(normalizedId)) {
      continue;
    }

    const product = dbProducts.get(normalizedId);
    if (!product) {
      continue;
    }

    const reducedInventory = reduceInventoryBatches(
      product.inventoryBatches || [],
      Number(item.quantity || 0),
      String(item.batchId || '')
    );
    const nextStock = Array.isArray(product.inventoryBatches) && product.inventoryBatches.length > 0
      ? reducedInventory.nextStock
      : Math.max(0, Number(product.stock || 0) - Number(item.quantity || 0));

    if (useMemoryProducts()) {
      await devProductStore.updateProduct(normalizedId, {
        stock: nextStock,
        inventoryBatches: reducedInventory.inventoryBatches,
      });
    } else {
      await updateDbProductStock(normalizedId, nextStock, reducedInventory.inventoryBatches);
    }
  }

  const enrichedItems = buildEnrichedOrderItems({
    items: authoritativeOrder.items,
    starterProductMap,
    dbProducts,
  });
  const sellerFulfillments = buildInitialSellerFulfillments(enrichedItems);

  return orderStore.createOrder(
    createStoredOrderPayload({
      user,
      orderData,
      authoritativeOrder,
      enrichedItems,
      sellerFulfillments,
      paymentDetails,
      status,
    })
  );
};

const createRazorpayOrder = async ({ amount, receipt, notes }) => {
  const authToken = Buffer.from(`${getRazorpayKeyId()}:${getRazorpayKeySecret()}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt,
      notes,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.description || 'Unable to create Razorpay order.');
  }

  return data;
};

const createStripeCheckoutSession = async ({ amount, attemptId, user, orderData }) => {
  const successUrl = `${getFrontendBaseUrl()}/?payment=success&gateway=stripe&attemptId=${attemptId}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${getFrontendBaseUrl()}/?payment=cancelled&gateway=stripe&attemptId=${attemptId}`;
  const body = new URLSearchParams({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    'customer_email': user.email,
    'metadata[attemptId]': attemptId,
    'metadata[userEmail]': user.email,
    'line_items[0][price_data][currency]': 'inr',
    'line_items[0][price_data][product_data][name]': 'NilaHub Order',
    'line_items[0][price_data][product_data][description]': `${orderData.items.length} item(s) with delivery`,
    'line_items[0][price_data][unit_amount]': String(amount),
    'line_items[0][quantity]': '1',
  });

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Unable to create Stripe checkout session.');
  }

  return data;
};

const fetchStripeCheckoutSession = async (sessionId) => {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Unable to verify Stripe checkout session.');
  }

  return data;
};

const serializePaymentConfig = () => ({
  success: true,
  gateways: getPaymentConfig(),
});

const parsePagination = (query = {}, defaultLimit = DEFAULT_LIMIT) => {
  const page = Math.max(DEFAULT_PAGE, Number.parseInt(query.page, 10) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit)
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const buildPaginationMeta = ({ page, limit, totalItems }) => ({
  page,
  limit,
  totalItems,
  totalPages: totalItems > 0 ? Math.ceil(totalItems / limit) : 0,
  hasNextPage: page * limit < totalItems,
  hasPreviousPage: page > 1,
});

const countCustomerOpenOrders = (orders = []) =>
  orders.filter((order) => normalizeOrderStatus(order.status) !== 'Delivered').length;

const countSellerOpenFulfillments = ({ orders = [], user, req }) =>
  orders.filter((order) =>
    buildNormalizedSellerFulfillments(order.sellerFulfillments, order.items).some(
      (fulfillment) =>
        sellerOwnsFulfillment({ fulfillment, user, req }) &&
        normalizeOrderStatus(fulfillment.status) !== 'Delivered'
    )
  ).length;

router.get('/mine', authenticate, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const orders = await orderStore.listOrdersByEmail(req.user.email);
    const pagedOrders = orders.slice(skip, skip + limit);

    return res.json({
      success: true,
      orders: pagedOrders.map(serializeOrder),
      pagination: buildPaginationMeta({
        page,
        limit,
        totalItems: orders.length,
      }),
      stats: {
        openCount: countCustomerOpenOrders(orders),
      },
    });
  } catch (error) {
    logger.error('orders list error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch orders.',
    });
  }
});

router.get('/manage', authenticate, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    if (isAdmin(req)) {
      const allOrders = await orderStore.listOrders();
      const pagedOrders = allOrders.slice(skip, skip + limit);

      return res.json({
        success: true,
        orders: pagedOrders.map(serializeOrder),
        pagination: buildPaginationMeta({
          page,
          limit,
          totalItems: allOrders.length,
        }),
        stats: {
          openCount: countCustomerOpenOrders(allOrders),
        },
      });
    }

    if (!isSellerRole(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only seller accounts can manage seller order fulfillment.',
      });
    }

    const orders = await orderStore.listOrdersForSeller({
      email: req.user.email,
      businessName: req.auth?.businessName || req.user?.businessName || '',
    });
    const pagedOrders = orders.slice(skip, skip + limit);

    return res.json({
      success: true,
      orders: pagedOrders.map(serializeOrder),
      pagination: buildPaginationMeta({
        page,
        limit,
        totalItems: orders.length,
      }),
      stats: {
        openFulfillmentCount: countSellerOpenFulfillments({
          orders,
          user: req.user,
          req,
        }),
      },
    });
  } catch (error) {
    logger.error('seller orders list error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch seller orders.',
    });
  }
});

// Public endpoint for delivery constants (used by frontend for consistency)
router.get('/constants', async (req, res) => {
  return res.json({
    success: true,
    constants: {
      DELIVERY_BASE_FEE,
      DELIVERY_PER_ITEM_FEE,
      ORDER_CURRENCY,
      ORDER_STATUSES,
    },
  });
});

router.get('/pincode/:pincode', async (req, res) => {
  const normalizedPincode = String(req.params.pincode || '').replace(/\D/g, '').slice(0, 6);

  if (!validatePincode(normalizedPincode)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid pincode format.',
    });
  }

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${normalizedPincode}`);
    if (!response.ok) {
      throw new Error(`Postal API returned ${response.status}`);
    }

    const result = await response.json();
    const office = Array.isArray(result) ? result[0]?.PostOffice?.[0] : null;

    if (!office) {
      return res.status(404).json({
        success: false,
        message: 'Pincode not found.',
      });
    }

    return res.json({
      success: true,
      location: {
        country: office.Country || 'India',
        state: office.State || '',
        district: office.District || '',
      },
    });
  } catch (error) {
    logger.warn('pincode lookup error:', error.message || error);
    return res.status(502).json({
      success: false,
      message: 'Unable to look up pincode right now.',
    });
  }
});

router.get('/payment-config', authenticate, async (req, res) => {
  return res.json(serializePaymentConfig());
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { error, value } = orderSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Additional validation for delivery details
    if (value.deliveryDetails) {
      if (!validatePhone(value.deliveryDetails.receiverPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format (at least 10 digits required)',
        });
      }

      if (!validatePincode(value.deliveryDetails.pincode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pincode format (6-digit Indian pincode required)',
        });
      }
    }

    // Wallet one-click checkout
    if (value.walletPayment) {
      const balance = await require('../utils/wallet').getWalletBalance(req.user.email);
      const numericAmount = parseFloat(value.amount.replace(/[^\d.]/g, ''));
      if (balance < numericAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance. Need INR ${numericAmount.toFixed(2)}, have INR ${balance.toFixed(2)}`,
        });
      }
    }

    const paymentDetails = value.walletPayment 
      ? { gateway: 'wallet', paymentStatus: 'Paid' }
      : { gateway: 'cash_on_delivery', paymentStatus: 'Pending' };

    const order = await persistStockReductionAndCreateOrder({
      user: req.user,
      orderData: value,
      paymentDetails,
      status: 'Confirmed',
    });

    // Deduct wallet if used
    if (value.walletPayment) {
      await require('../utils/wallet').deductWalletBalance(
        req.user.email, 
        parseFloat(value.amount.replace(/[^\d.]/g, '')), 
        order.id, 
        `Order #${order.id.slice(-8)}`
      );
    }

    return res.status(201).json({
      success: true,
      message: value.walletPayment ? 'Order placed using Wallet balance.' : 'Order placed successfully.',
      order: serializeOrder(order),
    });
  } catch (error) {
    logger.error('orders create error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Unable to place the order.',
    });
  }
});

router.post('/payments/create', paymentRateLimiter, authenticate, async (req, res) => {
  try {
    const { error, value } = createPaymentSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Additional validation for delivery details
    if (value.deliveryDetails) {
      if (!validatePhone(value.deliveryDetails.receiverPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format (at least 10 digits required)',
        });
      }

      if (!validatePincode(value.deliveryDetails.pincode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pincode format (6-digit Indian pincode required)',
        });
      }
    }

    const paymentConfig = getPaymentConfig();
    if (!paymentConfig[value.gateway]?.enabled) {
      return res.status(400).json({
        success: false,
        message: `${value.gateway} is not configured on the backend.`,
      });
    }

    const stockCheck = await validateOrderItemsAgainstStock(value.items);
    if (!stockCheck.success) {
      return res.status(stockCheck.statusCode).json({
        success: false,
        message: stockCheck.message,
      });
    }
    const authoritativeOrder = buildAuthoritativeOrderSummary({
      resolvedItems: stockCheck.resolvedItems,
    });

    const attempt = await paymentAttemptStore.createAttempt({
      customerEmail: req.user.email,
      customerName: req.user.name || req.user.email,
      gateway: value.gateway,
      amountInPaise: toPaise(authoritativeOrder.amountValue),
      currency: ORDER_CURRENCY,
      orderData: {
        ...value,
        items: authoritativeOrder.items,
        amount: authoritativeOrder.amount,
        subtotal: authoritativeOrder.subtotal,
        deliveryFee: authoritativeOrder.deliveryFee,
      },
      paymentStatus: 'pending',
    });

    if (value.gateway === 'razorpay') {
      const razorpayOrder = await createRazorpayOrder({
        amount: attempt.amountInPaise,
        receipt: attempt.id,
        notes: {
          attemptId: attempt.id,
          customerEmail: req.user.email,
        },
      });

      await paymentAttemptStore.updateAttempt(attempt.id, {
        externalOrderId: razorpayOrder.id,
        paymentStatus: 'created',
      });

      return res.status(201).json({
        success: true,
        gateway: 'razorpay',
        attemptId: attempt.id,
        key: paymentConfig.razorpay.keyId,
        order: razorpayOrder,
      });
    }

    const session = await createStripeCheckoutSession({
      amount: attempt.amountInPaise,
      attemptId: attempt.id,
      user: req.user,
      orderData: attempt.orderData,
    });

    await paymentAttemptStore.updateAttempt(attempt.id, {
      externalOrderId: session.id,
      paymentStatus: 'created',
    });

    return res.status(201).json({
      success: true,
      gateway: 'stripe',
      attemptId: attempt.id,
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    logger.error('payment create error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to initialize payment.',
    });
  }
});

router.post('/payments/razorpay/verify', paymentRateLimiter, authenticate, async (req, res) => {
  try {
    const { error, value } = razorpayVerifySchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const attempt = await paymentAttemptStore.findAttemptById(value.attemptId);
    if (!attempt || attempt.customerEmail !== req.user.email || attempt.gateway !== 'razorpay') {
      return res.status(404).json({
        success: false,
        message: 'Payment attempt not found.',
      });
    }

    if (attempt.status === 'completed' && attempt.orderId) {
      const existingOrders = await orderStore.listOrdersByEmail(req.user.email);
      const existingOrder = existingOrders.find((order) => order.id === attempt.orderId);

      return res.json({
        success: true,
        message: 'Payment already verified.',
        order: existingOrder ? serializeOrder(existingOrder) : null,
      });
    }

    if (attempt.externalOrderId !== value.razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay order ID mismatch.',
      });
    }

    const generatedSignature = crypto
      .createHmac('sha256', getRazorpayKeySecret())
      .update(`${value.razorpay_order_id}|${value.razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== value.razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Razorpay payment signature.',
      });
    }

    const order = await persistStockReductionAndCreateOrder({
      user: req.user,
      orderData: attempt.orderData,
      paymentDetails: {
        gateway: 'razorpay',
        attemptId: attempt.id,
        razorpayOrderId: value.razorpay_order_id,
        razorpayPaymentId: value.razorpay_payment_id,
        paymentStatus: 'Paid',
      },
      status: 'Confirmed',
    });

    await paymentAttemptStore.updateAttempt(attempt.id, {
      status: 'completed',
      paymentStatus: 'paid',
      orderId: order.id,
      verifiedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: 'Payment verified successfully.',
      order: serializeOrder(order),
    });
  } catch (error) {
    logger.error('razorpay verify error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Unable to verify Razorpay payment.',
    });
  }
});

router.post('/payments/stripe/verify', paymentRateLimiter, authenticate, async (req, res) => {
  try {
    const { error, value } = stripeVerifySchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const attempt = await paymentAttemptStore.findAttemptById(value.attemptId);
    if (!attempt || attempt.customerEmail !== req.user.email || attempt.gateway !== 'stripe') {
      return res.status(404).json({
        success: false,
        message: 'Payment attempt not found.',
      });
    }

    if (attempt.status === 'completed' && attempt.orderId) {
      const existingOrders = await orderStore.listOrdersByEmail(req.user.email);
      const existingOrder = existingOrders.find((order) => order.id === attempt.orderId);

      return res.json({
        success: true,
        message: 'Payment already verified.',
        order: existingOrder ? serializeOrder(existingOrder) : null,
      });
    }

    if (attempt.externalOrderId !== value.sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Stripe session ID mismatch.',
      });
    }

    const session = await fetchStripeCheckoutSession(value.sessionId);

    if (session.payment_status !== 'paid' || session.status !== 'complete') {
      return res.status(400).json({
        success: false,
        message: 'Stripe payment is not completed yet.',
      });
    }

    if (session.metadata?.attemptId !== attempt.id) {
      return res.status(400).json({
        success: false,
        message: 'Stripe payment metadata mismatch.',
      });
    }

    const order = await persistStockReductionAndCreateOrder({
      user: req.user,
      orderData: attempt.orderData,
      paymentDetails: {
        gateway: 'stripe',
        attemptId: attempt.id,
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        paymentStatus: 'Paid',
      },
      status: 'Confirmed',
    });

    await paymentAttemptStore.updateAttempt(attempt.id, {
      status: 'completed',
      paymentStatus: 'paid',
      orderId: order.id,
      verifiedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: 'Payment verified successfully.',
      order: serializeOrder(order),
    });
  } catch (error) {
    logger.error('stripe verify error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Unable to verify Stripe payment.',
    });
  }
});

const findOrderItem = (order, itemId) =>
  (order.items || []).find((item) => String(item.id) === String(itemId)) || null;

const customerOwnsOrder = (order, req) =>
  String(order?.customerEmail || '').trim().toLowerCase() === String(req.user?.email || '').trim().toLowerCase();

const getReturnEligibleUntil = (item, order) => {
  const returnWindowDays = Number(item?.returnWindowDays || 0);
  if (!item?.returnAllowed || returnWindowDays <= 0) {
    return null;
  }

  const baselineDate = new Date(order?.deliveredAt || '');
  if (Number.isNaN(baselineDate.getTime())) {
    return null;
  }

  return new Date(baselineDate.getTime() + returnWindowDays * MILLISECONDS_IN_DAY);
};

const isReturnRequestStillEligible = (item, order, now = new Date()) => {
  const eligibleUntil = getReturnEligibleUntil(item, order);
  if (!eligibleUntil) {
    return false;
  }

  return eligibleUntil.getTime() >= now.getTime();
};

router.post('/:orderId/returns', authenticate, async (req, res) => {
  try {
    const { error, value } = createReturnRequestSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Validate return request data
    const returnValidation = validateReturnRequest(value);
    if (!returnValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: returnValidation.errors[0] || 'Invalid return request data',
      });
    }

    const existingOrder = await orderStore.findOrderById(req.params.orderId);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    if (!customerOwnsOrder(existingOrder, req)) {
      return res.status(403).json({
        success: false,
        message: 'You can request returns only for your own orders.',
      });
    }

    const existingItem = findOrderItem(existingOrder, value.itemId);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found.',
      });
    }

    if (!existingItem.returnAllowed || Number(existingItem.returnWindowDays || 0) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This item is not eligible for return.',
      });
    }

    if (normalizeOrderStatus(existingItem.status || existingOrder.status) !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Returns can be requested only after the item has been delivered.',
      });
    }

    if (!isReturnRequestStillEligible(existingItem, existingOrder)) {
      return res.status(400).json({
        success: false,
        message: 'The return window has expired for this item.',
      });
    }

    if (existingItem.returnRequest) {
      return res.status(400).json({
        success: false,
        message: 'A return request already exists for this item.',
      });
    }

    const now = new Date().toISOString();
    const updatedOrder = await orderStore.updateOrder(req.params.orderId, {
      items: (existingOrder.items || []).map((item) =>
        String(item.id) !== String(value.itemId)
          ? item
          : {
              ...item,
              returnRequest: {
                reason: value.reason,
                details: value.details || '',
                status: 'requested',
                refundStatus: 'pending',
                requestedAt: now,
              },
            }
      ),
    });

    return res.status(201).json({
      success: true,
      message: 'Return request submitted successfully.',
      order: serializeOrder(updatedOrder),
    });
  } catch (error) {
    logger.error('return request create error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Unable to submit the return request.',
    });
  }
});

router.patch('/:orderId/returns/:itemId', authenticate, async (req, res) => {
  try {
    const { error, value } = updateReturnRequestSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    if (!isSellerRole(req) && !isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only seller or admin accounts can review return requests.',
      });
    }

    const existingOrder = await orderStore.findOrderById(req.params.orderId);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const existingItem = findOrderItem(existingOrder, req.params.itemId);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found.',
      });
    }

    if (!existingItem.returnRequest) {
      return res.status(400).json({
        success: false,
        message: 'No return request exists for this item.',
      });
    }

    if (!isAdmin(req)) {
      const targetFulfillment = resolveSellerFulfillmentForRequest({
        order: existingOrder,
        req,
        sellerKey: existingItem.sellerKey,
      });

      if (!targetFulfillment.itemIds.some((itemId) => String(itemId) === String(req.params.itemId))) {
        return res.status(403).json({
          success: false,
          message: 'You can update only your own seller return requests.',
        });
      }
    }

    const now = new Date().toISOString();
    const updatedOrder = await orderStore.updateOrder(req.params.orderId, {
      items: (existingOrder.items || []).map((item) => {
        if (String(item.id) !== String(req.params.itemId)) {
          return item;
        }

        const currentRequest = item.returnRequest || {};
        if (value.action === 'approve') {
          return {
            ...item,
            returnRequest: {
              ...currentRequest,
              status: 'approved',
              refundStatus: 'approved',
              reviewedAt: now,
            },
          };
        }

        if (value.action === 'reject') {
          return {
            ...item,
            returnRequest: {
              ...currentRequest,
              status: 'rejected',
              refundStatus: 'rejected',
              reviewedAt: now,
            },
          };
        }

        return {
          ...item,
          returnRequest: {
            ...currentRequest,
            status: 'approved',
            refundStatus: 'completed',
            refundedAt: now,
          },
        };
      }),
    });

    return res.json({
      success: true,
      message: 'Return request updated successfully.',
      order: serializeOrder(updatedOrder),
    });
  } catch (error) {
    logger.error('return request update error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Unable to update the return request.',
    });
  }
});

router.patch('/:orderId/status', authenticate, async (req, res) => {
  try {
    if (isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admins can review orders, but only the seller can update fulfillment status.',
      });
    }

    if (!isSellerRole(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only seller accounts can update order status.',
      });
    }

    const { error, value } = updateOrderStatusSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const existingOrder = await orderStore.findOrderById(req.params.orderId);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const targetFulfillment = resolveSellerFulfillmentForRequest({
      order: existingOrder,
      req,
      sellerKey: value.sellerKey,
    });

    if (!isValidNextStatusTransition(targetFulfillment.status, value.status)) {
      return res.status(400).json({
        success: false,
        message: `Seller status can only move step-by-step from ${targetFulfillment.status} to ${getNextOrderStatus(targetFulfillment.status)}.`,
      });
    }

    const now = new Date().toISOString();
    const nextSellerFulfillments = buildNormalizedSellerFulfillments(
      existingOrder.sellerFulfillments,
      existingOrder.items
    ).map((fulfillment) => {
      if (normalizeSellerKey(fulfillment.sellerKey) !== normalizeSellerKey(targetFulfillment.sellerKey)) {
        return fulfillment;
      }

      return {
        ...fulfillment,
        status: normalizeOrderStatus(value.status),
        provider: value.provider || 'manual',
        trackingNumber: value.trackingNumber || fulfillment.trackingNumber || '',
        shipmentId: value.shipmentId || fulfillment.shipmentId || '',
        updatedAt: now,
        history: [
          ...(Array.isArray(fulfillment.history) ? fulfillment.history : []),
          {
            status: normalizeOrderStatus(value.status),
            provider: value.provider || 'manual',
            trackingNumber: value.trackingNumber || '',
            shipmentId: value.shipmentId || '',
            externalStatus: '',
            changedAt: now,
            source: 'manual',
          },
        ],
      };
    });

    const updatedOrder = await orderStore.updateOrder(req.params.orderId, {
      sellerFulfillments: nextSellerFulfillments,
      status: deriveOrderStatusFromFulfillments(nextSellerFulfillments),
      deliveredAt:
        deriveOrderStatusFromFulfillments(nextSellerFulfillments) === 'Delivered'
          ? now
          : existingOrder.deliveredAt || null,
    });

    return res.json({
      success: true,
      message: 'Seller fulfillment status updated successfully.',
      order: serializeOrder(updatedOrder),
    });
  } catch (error) {
    logger.error('order status update error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Unable to update order status.',
    });
  }
});

router.patch('/:orderId/status/sync', authenticate, async (req, res) => {
  try {
    if (isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admins can review orders, but only the seller can sync fulfillment status.',
      });
    }

    if (!isSellerRole(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only seller accounts can sync order status.',
      });
    }

    const { error, value } = syncOrderStatusSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const existingOrder = await orderStore.findOrderById(req.params.orderId);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const targetFulfillment = resolveSellerFulfillmentForRequest({
      order: existingOrder,
      req,
      sellerKey: value.sellerKey,
    });

    const trackingNumber = value.trackingNumber || targetFulfillment.trackingNumber || '';
    const shipmentId = value.shipmentId || targetFulfillment.shipmentId || '';

    if (!trackingNumber && !shipmentId) {
      return res.status(400).json({
        success: false,
        message: 'Tracking number or shipment ID is required for provider sync.',
      });
    }

    const providerStatus = await fetchProviderShipmentStatus({
      provider: value.provider,
      trackingNumber,
      shipmentId,
    });

    const nextStatus = mapExternalStatusToOrderStatus(providerStatus.externalStatus);
    if (!isValidNextStatusTransition(targetFulfillment.status, nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `${value.provider} returned "${providerStatus.externalStatus}", which does not map to the next allowed step after ${targetFulfillment.status}.`,
      });
    }

    const now = new Date().toISOString();
    const nextSellerFulfillments = buildNormalizedSellerFulfillments(
      existingOrder.sellerFulfillments,
      existingOrder.items
    ).map((fulfillment) => {
      if (normalizeSellerKey(fulfillment.sellerKey) !== normalizeSellerKey(targetFulfillment.sellerKey)) {
        return fulfillment;
      }

      return {
        ...fulfillment,
        status: nextStatus,
        provider: value.provider,
        trackingNumber,
        shipmentId,
        externalStatus: providerStatus.externalStatus,
        updatedAt: now,
        history: [
          ...(Array.isArray(fulfillment.history) ? fulfillment.history : []),
          {
            status: nextStatus,
            provider: value.provider,
            trackingNumber,
            shipmentId,
            externalStatus: providerStatus.externalStatus,
            changedAt: now,
            source: 'provider_sync',
          },
        ],
      };
    });

    const updatedOrder = await orderStore.updateOrder(req.params.orderId, {
      sellerFulfillments: nextSellerFulfillments,
      status: deriveOrderStatusFromFulfillments(nextSellerFulfillments),
      deliveredAt:
        deriveOrderStatusFromFulfillments(nextSellerFulfillments) === 'Delivered'
          ? now
          : existingOrder.deliveredAt || null,
    });

    return res.json({
      success: true,
      message: `Seller fulfillment synced from ${value.provider}.`,
      order: serializeOrder(updatedOrder),
      providerStatus: providerStatus.externalStatus,
    });
  } catch (error) {
    logger.error('order status sync error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Unable to sync order status.',
    });
  }
});

module.exports = router;
module.exports.__testables = {
  buildAuthoritativeOrderSummary,
  formatCurrencyAmount,
  getReturnEligibleUntil,
  isReturnRequestStillEligible,
};
