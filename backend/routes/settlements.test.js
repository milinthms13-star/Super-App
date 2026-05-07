jest.mock('../models/Settlement', () => {
  const Settlement = jest.fn(function Settlement(payload = {}) {
    Object.assign(this, {
      settlementId: payload.settlementId || 'settlement-1',
      vendorEmail: payload.vendorEmail || '',
      summary: payload.summary || {},
      orders: payload.orders || [],
      status: payload.status || 'Pending',
      payment: payload.payment || null,
      save: jest.fn().mockResolvedValue(this),
    });
  });

  Settlement.find = jest.fn();
  Settlement.findOne = jest.fn();
  Settlement.countDocuments = jest.fn();
  return Settlement;
});

jest.mock('../models/Order', () => ({
  find: jest.fn(),
}));

jest.mock('../utils/commissionService', () => ({
  calculateVendorSettlement: jest.fn(),
  qualifiesForSettlement: jest.fn(),
}));

const Settlement = require('../models/Settlement');
const Order = require('../models/Order');
const {
  calculateVendorSettlement,
  qualifiesForSettlement,
} = require('../utils/commissionService');
const settlementsRouter = require('./settlements');

const buildChain = (records = []) => {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(records),
  };

  return chain;
};

const getRouteHandler = (method, path) => {
  const layer = settlementsRouter.stack.find(
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

describe('settlement routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /dashboard/vendor counts failed settlements correctly', async () => {
    const handler = getRouteHandler('get', '/dashboard/vendor');
    Settlement.find.mockReturnValue(
      buildChain([
        { status: 'Pending', summary: { netPayable: 100 } },
        { status: 'Failed', summary: { netPayable: 50 } },
        { status: 'Completed', summary: { netPayable: 220 } },
      ])
    );
    const req = {
      user: {
        email: 'seller@example.com',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.summary).toEqual(
      expect.objectContaining({
        pending: 1,
        failed: 1,
        completed: 1,
        totalEarnings: 220,
      })
    );
  });

  test('GET /list rejects invalid settlement statuses', async () => {
    const handler = getRouteHandler('get', '/list');
    const req = {
      user: {
        email: 'mgdhanyamohan@gmail.com',
      },
      query: {
        status: 'Unknown',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid status/i);
  });

  test('POST /generate rejects inverted date ranges', async () => {
    const handler = getRouteHandler('post', '/generate');
    const req = {
      user: {
        email: 'mgdhanyamohan@gmail.com',
      },
      body: {
        vendorEmail: 'seller@example.com',
        startDate: '2026-05-10T00:00:00.000Z',
        endDate: '2026-05-01T00:00:00.000Z',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/on or after/i);
    expect(Order.find).not.toHaveBeenCalled();
  });

  test('POST /generate normalizes vendor email before building the settlement', async () => {
    const handler = getRouteHandler('post', '/generate');
    Order.find.mockResolvedValue([
      {
        _id: 'order-1',
        status: 'Delivered',
        createdAt: '2026-05-07T10:00:00.000Z',
        items: [{ sellerEmail: 'seller@example.com', price: 100, quantity: 2 }],
      },
    ]);
    calculateVendorSettlement.mockReturnValue({
      summary: {
        netPayable: 170,
      },
      orders: [
        {
          sellerName: 'Seller',
          businessName: 'Seller Store',
        },
      ],
    });
    qualifiesForSettlement.mockReturnValue(true);
    Settlement.findOne.mockResolvedValue(null);
    const req = {
      user: {
        email: 'mgdhanyamohan@gmail.com',
      },
      body: {
        vendorEmail: ' Seller@Example.com ',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(calculateVendorSettlement).toHaveBeenCalledWith(
      expect.any(Array),
      'seller@example.com',
      expect.any(Object)
    );
    expect(Settlement).toHaveBeenCalledWith(
      expect.objectContaining({
        vendorEmail: 'seller@example.com',
      })
    );
  });
});
