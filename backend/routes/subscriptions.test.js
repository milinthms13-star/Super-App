jest.mock('../models/Subscription', () => {
  const Subscription = jest.fn(function Subscription(payload = {}) {
    Object.assign(this, {
      subscriptionId: payload.subscriptionId || 'sub-1',
      customerEmail: payload.customerEmail || '',
      customerName: payload.customerName || '',
      items: payload.items || [],
      frequency: payload.frequency || 'Monthly',
      deliveryDay: payload.deliveryDay || 'Monday',
      deliveryAddress: payload.deliveryAddress || '',
      nextDeliveryDate: payload.nextDeliveryDate || null,
      totalPrice: payload.totalPrice || 0,
      status: payload.status || 'Active',
      autoRenew: payload.autoRenew !== false,
      endDate: payload.endDate || null,
      discount: payload.discount || 0,
      paymentMethod: payload.paymentMethod || 'Card',
      updatedAt: payload.updatedAt || null,
    });
    this.save = jest.fn().mockResolvedValue(this);
  });

  Subscription.find = jest.fn();
  Subscription.findOne = jest.fn();
  Subscription.findOneAndUpdate = jest.fn();
  Subscription.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
  return Subscription;
});

const Subscription = require('../models/Subscription');
const subscriptionsRouter = require('./subscriptions');

const getRouteHandler = (method, path) => {
  const layer = subscriptionsRouter.stack.find(
    (entry) => entry.route?.path === path && entry.route?.methods?.[method]
  );

  return layer.route.stack[layer.route.stack.length - 1].handle;
};

const createMockResponse = () => ({
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

describe('subscription routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Subscription.updateMany.mockResolvedValue({ modifiedCount: 0 });
  });

  test('POST /create rejects invalid subscription payloads', async () => {
    const handler = getRouteHandler('post', '/create');
    const req = {
      user: {
        email: 'buyer@example.com',
        name: 'Buyer',
      },
      body: {
        items: [],
        frequency: 'Monthly',
        deliveryDay: 'Monday',
        deliveryAddress: '',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/item|delivery address/i);
  });

  test('POST /create calculates discounted totals and next delivery date', async () => {
    const handler = getRouteHandler('post', '/create');
    const req = {
      user: {
        email: 'buyer@example.com',
        name: 'Buyer',
      },
      body: {
        items: [
          {
            productId: 'product-1',
            productName: 'Milk Pack',
            quantity: 2,
            price: 100,
          },
        ],
        frequency: 'Monthly',
        deliveryDay: 'Monday',
        deliveryAddress: '123 Market Street',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalPrice).toBe(190);
    expect(res.body.data.discount).toBe(5);
    expect(new Date(res.body.data.nextDeliveryDate).getTime()).toBeGreaterThan(Date.now());
  });

  test('PUT /:subscriptionId recalculates pricing when items and frequency change', async () => {
    const handler = getRouteHandler('put', '/:subscriptionId');
    Subscription.findOne.mockResolvedValue({
      subscriptionId: 'sub-1',
      customerEmail: 'buyer@example.com',
      items: [
        {
          productId: 'old-item',
          productName: 'Old Product',
          quantity: 1,
          price: 80,
        },
      ],
      frequency: 'Weekly',
      deliveryDay: 'Tuesday',
      status: 'Active',
    });
    Subscription.findOneAndUpdate.mockImplementation(async (_filter, updates) => ({
      subscriptionId: 'sub-1',
      customerEmail: 'buyer@example.com',
      ...updates,
    }));
    const req = {
      params: { subscriptionId: 'sub-1' },
      user: {
        email: 'buyer@example.com',
      },
      body: {
        items: [
          {
            productId: 'new-item',
            productName: 'Coffee Beans',
            quantity: 3,
            price: 120,
          },
        ],
        frequency: 'Quarterly',
        deliveryDay: 'Friday',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
      { subscriptionId: 'sub-1', customerEmail: 'buyer@example.com' },
      expect.objectContaining({
        totalPrice: 324,
        discount: 10,
        frequency: 'Quarterly',
        deliveryDay: 'Friday',
      }),
      { new: true }
    );
  });

  test('POST /:subscriptionId/resume refreshes stale delivery dates', async () => {
    const handler = getRouteHandler('post', '/:subscriptionId/resume');
    Subscription.findOne.mockResolvedValue({
      subscriptionId: 'sub-2',
      customerEmail: 'buyer@example.com',
      frequency: 'Monthly',
      deliveryDay: 'Wednesday',
      nextDeliveryDate: '2020-01-01T00:00:00.000Z',
      status: 'Paused',
    });
    Subscription.findOneAndUpdate.mockImplementation(async (_filter, updates) => ({
      subscriptionId: 'sub-2',
      customerEmail: 'buyer@example.com',
      ...updates,
    }));
    const req = {
      params: { subscriptionId: 'sub-2' },
      user: {
        email: 'buyer@example.com',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
      { subscriptionId: 'sub-2', customerEmail: 'buyer@example.com' },
      expect.objectContaining({
        status: 'Active',
        nextDeliveryDate: expect.any(Date),
      }),
      { new: true }
    );
  });
});
