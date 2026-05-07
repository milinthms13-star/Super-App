const crypto = require('crypto');
const express = require('express');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.AUTH_STORAGE = 'memory';
process.env.RAZORPAY_KEY_SECRET = 'test-secret';

const mockProducts = new Map();
const mockOrders = [];
const mockAttempts = [];

const clone = (value) => JSON.parse(JSON.stringify(value));

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = {
      id: 'user-1',
      _id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      registrationType: 'user',
      role: 'user',
    };
    req.auth = {
      sub: 'user-1',
      email: 'test@example.com',
      registrationType: 'user',
      role: 'user',
    };
    next();
  },
}));

jest.mock('../middleware/redisCache', () => ({
  cacheOrders: (_req, _res, next) => next(),
}));

jest.mock('../middleware/rateLimiter', () => ({
  createStrictRateLimiter: () => (_req, _res, next) => next(),
}));

jest.mock('../utils/devAppDataStore', () => ({
  readAppData: jest.fn(async () => ({
    moduleData: {
      ecommerceProducts: [],
    },
  })),
  updateAppData: jest.fn(async (updater) =>
    typeof updater === 'function'
      ? updater({ moduleData: { ecommerceProducts: [] } })
      : updater
  ),
}));

jest.mock('../utils/devProductStore', () => ({
  findProductById: jest.fn(async (id) => {
    const product = mockProducts.get(String(id));
    return product ? clone(product) : null;
  }),
  updateProduct: jest.fn(async (id, updates) => {
    const current = mockProducts.get(String(id));
    if (!current) {
      return null;
    }

    const nextProduct = {
      ...current,
      ...clone(updates),
    };
    mockProducts.set(String(id), nextProduct);
    return clone(nextProduct);
  }),
}));

jest.mock('../utils/orderStore', () => ({
  createOrder: jest.fn(async (payload) => {
    const order = {
      id: `order-${mockOrders.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...clone(payload),
    };
    mockOrders.unshift(order);
    return clone(order);
  }),
  listOrders: jest.fn(async () => clone(mockOrders)),
  listOrdersByEmail: jest.fn(async (email, { cursor = null, limit = 20 } = {}) => {
    let orders = mockOrders
      .filter((order) => order.customerEmail === email)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (cursor) {
      const cursorDate = new Date(cursor);
      orders = orders.filter((order) => new Date(order.createdAt) < cursorDate);
    }

    return clone(orders.slice(0, limit));
  }),
  findOrderById: jest.fn(async (orderId) => {
    const order = mockOrders.find((entry) => entry.id === orderId);
    return order ? clone(order) : null;
  }),
  listOrdersForSeller: jest.fn(async () => []),
  updateOrder: jest.fn(async (orderId, updates) => {
    const index = mockOrders.findIndex((order) => order.id === orderId);
    if (index === -1) {
      return null;
    }

    mockOrders[index] = {
      ...mockOrders[index],
      ...clone(updates),
      updatedAt: new Date().toISOString(),
    };
    return clone(mockOrders[index]);
  }),
}));

jest.mock('../utils/paymentAttemptStore', () => ({
  createAttempt: jest.fn(async (payload) => {
    const attempt = {
      id: `attempt-${mockAttempts.length + 1}`,
      status: 'created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...clone(payload),
    };
    mockAttempts.unshift(attempt);
    return clone(attempt);
  }),
  findAttemptById: jest.fn(async (attemptId) => {
    const attempt = mockAttempts.find((entry) => entry.id === attemptId);
    return attempt ? clone(attempt) : null;
  }),
  updateAttempt: jest.fn(async (attemptId, updates) => {
    const index = mockAttempts.findIndex((attempt) => attempt.id === attemptId);
    if (index === -1) {
      return null;
    }

    mockAttempts[index] = {
      ...mockAttempts[index],
      ...(typeof updates === 'function' ? updates(clone(mockAttempts[index])) : clone(updates)),
      updatedAt: new Date().toISOString(),
    };
    return clone(mockAttempts[index]);
  }),
}));

jest.mock('../utils/gstInvoice', () => ({
  generateGSTInvoice: jest.fn(async (order) => ({
    invoiceNumber: `INV-${order.id}`,
    filePath: `/tmp/${order.id}.pdf`,
    fileName: `${order.id}.pdf`,
    generatedAt: new Date().toISOString(),
  })),
}));

jest.mock('../models/Product', () => ({
  find: jest.fn(async () => []),
  findById: jest.fn(async () => null),
  findByIdAndUpdate: jest.fn(async () => null),
}));

jest.mock('../models/Coupon', () => ({
  findOne: jest.fn(async () => null),
}));

jest.mock('../utils/flashSaleService', () => ({
  consumeFlashSaleReservation: jest.fn(async () => null),
  getActiveFlashSaleForProduct: jest.fn(async () => null),
}));

const ordersRouter = require('./orders');

let app;

const buildProductFixture = (overrides = {}) => ({
  _id: overrides._id || 'product-1',
  id: overrides._id || 'product-1',
  name: 'Test Product',
  category: 'Electronics',
  description: 'Test product for ecommerce order route coverage.',
  price: 500,
  mrp: 500,
  stock: 5,
  inventoryBatches: [],
  sellerName: 'Seller One',
  businessName: 'Seller One Store',
  sellerEmail: 'seller@example.com',
  location: 'Kochi',
  approvalStatus: 'approved',
  ...overrides,
});

const buildOrderData = (productId) => ({
  amount: '500.00',
  deliveryAddress: 'Test address',
  deliveryDetails: {
    receiverPhone: '9999999999',
    pincode: '682001',
    country: 'India',
    state: 'Kerala',
    district: 'Ernakulam',
    houseName: 'Test House',
    addressLine: 'Test Street',
  },
  items: [
    {
      id: String(productId),
      quantity: 1,
      price: 500,
    },
  ],
});

describe('Orders API', () => {
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/orders', ordersRouter);
  });

  beforeEach(() => {
    mockProducts.clear();
    mockOrders.length = 0;
    mockAttempts.length = 0;
  });

  test('POST /api/orders - create order', async () => {
    const product = buildProductFixture({ _id: 'product-create-1' });
    mockProducts.set(product._id, product);

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer mock-auth-token')
      .send(buildOrderData(product._id))
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.order).toHaveProperty('id');
    expect(response.body.order.items).toHaveLength(1);
    expect(response.body.order.items[0].productId).toBe(product._id);
  });

  test('GET /api/orders/mine - cursor pagination', async () => {
    mockOrders.push(
      {
        id: 'order-older',
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        amount: 450,
        subtotal: 400,
        deliveryFee: 50,
        deliveryAddress: 'Older address',
        deliveryDetails: {
          receiverPhone: '9999999999',
          pincode: '682001',
        },
        items: [],
        sellerFulfillments: [],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'order-newer',
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        amount: 500,
        subtotal: 450,
        deliveryFee: 50,
        deliveryAddress: 'Latest address',
        deliveryDetails: {
          receiverPhone: '9999999999',
          pincode: '682001',
        },
        items: [],
        sellerFulfillments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    const response = await request(app)
      .get('/api/orders/mine?limit=1')
      .set('Authorization', 'Bearer mock-auth-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.orders).toHaveLength(1);
    expect(response.body.pagination.hasMore).toBe(true);
    expect(response.body.pagination.limit).toBe(1);
  });

  test('POST /api/orders/payments/razorpay/verify - webhook signature', async () => {
    const product = buildProductFixture({ _id: 'product-verify-1' });
    mockProducts.set(product._id, product);

    const orderData = buildOrderData(product._id);
    mockAttempts.push({
      id: 'attempt-verify-1',
      customerEmail: 'test@example.com',
      customerName: 'Test User',
      gateway: 'razorpay',
      externalOrderId: 'order_RC123',
      orderData,
      paymentStatus: 'created',
      status: 'created',
    });

    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update('order_RC123|pay_RC123')
      .digest('hex');

    const response = await request(app)
      .post('/api/orders/payments/razorpay/verify')
      .set('Authorization', 'Bearer mock-auth-token')
      .send({
        attemptId: 'attempt-verify-1',
        razorpay_order_id: 'order_RC123',
        razorpay_payment_id: 'pay_RC123',
        razorpay_signature: signature,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.order).toHaveProperty('id');
    expect(response.body.order.paymentStatus).toBe('Paid');
  });
});
