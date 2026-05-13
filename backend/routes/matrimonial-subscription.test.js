jest.mock('../models/MatrimonialSubscription', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock('../models/MatrimonialProfile', () => ({
  findOne: jest.fn(),
}));

jest.mock('../utils/subscriptionService', () => ({
  SUBSCRIPTION_TIERS: {
    free: {},
    gold: {},
    premium: {},
    vip: {},
  },
  createSubscription: jest.fn(),
  getUserSubscription: jest.fn(),
  hasEntitlement: jest.fn(),
  consumeEntitlement: jest.fn(),
  processRefund: jest.fn(),
}));

const crypto = require('crypto');
const MatrimonialSubscription = require('../models/MatrimonialSubscription');
const subscriptionRouter = require('./matrimonial-subscription');

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const getRouteHandler = (method, path) => {
  const layer = subscriptionRouter.stack.find(
    (entry) => entry.route?.path === path && entry.route?.methods?.[method]
  );
  return layer.route.stack[layer.route.stack.length - 1].handle;
};

describe('matrimonial subscription routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RAZORPAY_KEY_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.RAZORPAY_KEY_SECRET;
  });

  test('razorpay verify rejects invalid signature and marks payment failed', async () => {
    const handler = getRouteHandler('post', '/subscription/payments/razorpay/verify');
    const orderId = 'order_123';
    const paymentId = 'pay_123';
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    const subscription = {
      paymentStatus: 'pending',
      isActive: false,
      transactionId: orderId,
      paymentHistory: [{ orderId, status: 'pending' }],
      save: jest.fn().mockResolvedValue(undefined),
    };

    MatrimonialSubscription.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(subscription),
    });

    const req = {
      body: {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: `${expected}bad`,
      },
      user: {
        email: 'member@example.com',
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Razorpay signature verification failed');
    expect(subscription.paymentStatus).toBe('failed');
    expect(subscription.save).toHaveBeenCalledTimes(1);
  });
});

