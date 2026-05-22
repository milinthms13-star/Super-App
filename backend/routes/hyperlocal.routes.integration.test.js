const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    const role = String(req.headers['x-user-role'] || 'user').trim().toLowerCase();
    const userId = String(req.headers['x-user-id'] || '507f1f77bcf86cd799439011');
    req.user = {
      _id: userId,
      id: userId,
      role,
      email: String(req.headers['x-user-email'] || 'hyperlocal.user@example.com').trim().toLowerCase(),
      isAdmin: role === 'admin',
    };
    next();
  },
  verifyAdmin: (req, res, next) => {
    if (String(req.user?.role || '').toLowerCase() === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Forbidden' });
  },
}));

const hyperlocalRouter = require('./hyperlocal');
const {
  HyperlocalShop,
  HyperlocalOrder,
  HyperlocalPartner,
  HyperlocalSubscription,
  HyperlocalOrderIdempotencyKey,
  HyperlocalAdminAuditLog,
} = require('../models/hyperlocal');

describe('hyperlocal routes integration', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    let resolvedMongoUri = process.env.MONGO_TEST_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
    if (!resolvedMongoUri) {
      mongoServer = await MongoMemoryServer.create();
      resolvedMongoUri = mongoServer.getUri();
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(resolvedMongoUri, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
      });
    }

    app = express();
    app.use(express.json());
    app.use('/api/hyperlocal', hyperlocalRouter);
  });

  beforeEach(async () => {
    await Promise.all([
      HyperlocalShop.deleteMany({}),
      HyperlocalOrder.deleteMany({}),
      HyperlocalPartner.deleteMany({}),
      HyperlocalSubscription.deleteMany({}),
      HyperlocalOrderIdempotencyKey.deleteMany({}),
      HyperlocalAdminAuditLog.deleteMany({}),
    ]);

    await request(app).get('/api/hyperlocal/bootstrap').expect(200);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('order create is idempotent and inventory is reserved then released on cancel', async () => {
    const shop = await HyperlocalShop.findOne({ approvalStatus: 'approved' }).lean();
    const product = shop.products[0];
    const initialStock = product.stockQty;

    const key = 'hyperlocal-idem-1';
    const orderFields = {
      userPhone: '9999999999',
      deliveryType: 'instant',
      paymentMode: 'UPI',
      couponCode: '',
      multiShopMode: 'false',
      emergencyMedicine: 'false',
      items: JSON.stringify([{ shopId: shop.shopId, productId: product.productId, qty: 2 }]),
      address: JSON.stringify({
        fullName: 'Test User',
        phone: '9999999999',
        line1: 'Street 1',
        line2: '',
        city: 'Trivandrum',
        state: 'Kerala',
        pincode: '695001',
        lat: 8.5241,
        lng: 76.9366,
      }),
    };

    const first = await request(app)
      .post('/api/hyperlocal/orders')
      .set('x-user-email', 'buyer@example.com')
      .set('x-idempotency-key', key)
      .field(orderFields)
      .expect(201);

    const second = await request(app)
      .post('/api/hyperlocal/orders')
      .set('x-user-email', 'buyer@example.com')
      .set('x-idempotency-key', key)
      .field(orderFields)
      .expect(201);

    expect(second.body?.data?.orderId).toBe(first.body?.data?.orderId);
    expect(await HyperlocalOrder.countDocuments({})).toBe(1);

    const updatedShop = await HyperlocalShop.findOne({ shopId: shop.shopId }).lean();
    const updatedProduct = updatedShop.products.find((entry) => entry.productId === product.productId);
    expect(updatedProduct.stockQty).toBe(initialStock - 2);

    await request(app)
      .post(`/api/hyperlocal/orders/${first.body?.data?.orderId}/cancel`)
      .set('x-user-email', 'buyer@example.com')
      .send({ reason: 'Plan changed' })
      .expect(200);

    const restoredShop = await HyperlocalShop.findOne({ shopId: shop.shopId }).lean();
    const restoredProduct = restoredShop.products.find((entry) => entry.productId === product.productId);
    expect(restoredProduct.stockQty).toBe(initialStock);
  });

  test('scheduled order requires delivery window', async () => {
    const shop = await HyperlocalShop.findOne({ approvalStatus: 'approved' }).lean();
    const product = shop.products[0];

    const baseFields = {
      userPhone: '9999999999',
      deliveryType: 'scheduled',
      paymentMode: 'UPI',
      items: JSON.stringify([{ shopId: shop.shopId, productId: product.productId, qty: 1 }]),
      address: JSON.stringify({
        fullName: 'Test User',
        phone: '9999999999',
        line1: 'Street 1',
        line2: '',
        city: 'Trivandrum',
        state: 'Kerala',
        pincode: '695001',
        lat: 8.5241,
        lng: 76.9366,
      }),
    };

    await request(app)
      .post('/api/hyperlocal/orders')
      .set('x-user-email', 'buyer2@example.com')
      .field(baseFields)
      .expect(400);

    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    await request(app)
      .post('/api/hyperlocal/orders')
      .set('x-user-email', 'buyer2@example.com')
      .field({
        ...baseFields,
        deliveryWindowStart: start.toISOString(),
        deliveryWindowEnd: end.toISOString(),
      })
      .expect(201);
  });

  test('partner payout request cannot exceed available balance after pending payouts', async () => {
    await HyperlocalPartner.create({
      partnerId: 'HLP-1001',
      fullName: 'Partner One',
      email: 'partner.one@example.com',
      phone: '+919999999999',
      approvalStatus: 'approved',
      online: false,
      walletBalance: 100,
      payoutHistory: [{ payoutId: 'HLPAY-OLD', amount: 30, status: 'requested', requestedAt: new Date() }],
    });

    await request(app)
      .post('/api/hyperlocal/partners/HLP-1001/payouts/request')
      .set('x-user-email', 'partner.one@example.com')
      .send({ amount: 80 })
      .expect(400);

    await request(app)
      .post('/api/hyperlocal/partners/HLP-1001/payouts/request')
      .set('x-user-email', 'partner.one@example.com')
      .send({ amount: 70 })
      .expect(201);
  });

  test('subscription endpoint prevents duplicate active plan and admin actions are audited', async () => {
    const userEmail = 'subscriber@example.com';

    await request(app)
      .post('/api/hyperlocal/subscriptions/subscribe')
      .set('x-user-email', userEmail)
      .send({ planCode: 'PASS-STARTER', amount: 1 })
      .expect(201);

    await request(app)
      .post('/api/hyperlocal/subscriptions/subscribe')
      .set('x-user-email', userEmail)
      .send({ planCode: 'PASS-STARTER', amount: 999 })
      .expect(409);

    const pendingShop = await HyperlocalShop.create({
      shopId: 'HLS-PENDING-1',
      ownerEmail: 'pending.owner@example.com',
      ownerPhone: '+919988776655',
      name: 'Pending Shop',
      category: 'Grocery',
      approvalStatus: 'pending',
      open: true,
      deliveryRadiusKm: 5,
      minOrderAmount: 99,
      deliveryCharge: 25,
      taxPercent: 5,
      location: { lat: 8.5, lng: 76.9 },
      addressText: 'Pending Street',
      products: [],
    });

    await request(app)
      .patch(`/api/hyperlocal/admin/shops/${pendingShop.shopId}/approval`)
      .set('x-user-role', 'admin')
      .set('x-user-email', 'admin@example.com')
      .send({ status: 'approved' })
      .expect(200);

    const auditLogs = await request(app)
      .get('/api/hyperlocal/admin/audit-logs')
      .set('x-user-role', 'admin')
      .set('x-user-email', 'admin@example.com')
      .expect(200);

    const actions = (auditLogs.body?.data?.auditLogs || []).map((entry) => entry.action);
    expect(actions).toContain('shop.approval.update');
  });
});
