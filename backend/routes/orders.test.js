const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const orderStore = require('../utils/orderStore');
const devOrderStore = require('../utils/devOrderStore');

let mongoServer;

describe('Orders API', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await orderStore.listOrders().forEach(order => orderStore.deleteOrder(order.id));
  });

  test('POST /api/orders - create order', async () => {
    const userToken = 'mock-auth-token'; // Mock auth setup needed
    const orderData = {
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
      items: [{
        id: 'test-product-1',
        quantity: 1,
        price: 500,
      }],
    };

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send(orderData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.order).toHaveProperty('id');
    expect(response.body.order.items).toHaveLength(1);
  });

  test('GET /api/orders/mine - cursor pagination', async () => {
    // Setup test orders
    const testOrders = [
      { id: 'order1', customerEmail: 'test@example.com', createdAt: new Date(Date.now() - 86400000) },
      { id: 'order2', customerEmail: 'test@example.com', createdAt: new Date() },
    ];

    await Promise.all(testOrders.map(order => orderStore.createOrder(order)));

    const userToken = 'mock-auth-token';
    const response = await request(app)
      .get('/api/orders/mine?limit=1')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.orders).toHaveLength(1);
    expect(response.body.pagination.hasMore).toBe(true);
  });

  test('POST /api/orders/payments/razorpay/verify - webhook signature', async () => {
    const userToken = 'mock-auth-token';
    const verifyData = {
      attemptId: 'test-attempt',
      razorpay_order_id: 'order_RC123',
      razorpay_payment_id: 'pay_RC123',
      razorpay_signature: 'valid_signature_hash',
    };

    const response = await request(app)
      .post('/api/orders/payments/razorpay/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send(verifyData)
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});

