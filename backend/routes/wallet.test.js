jest.mock('../models/Wallet', () => {
  const Wallet = jest.fn(function Wallet(payload = {}) {
    Object.assign(this, {
      walletId: payload.walletId || 'wallet-1',
      userEmail: payload.userEmail || '',
      userName: payload.userName || '',
      balance: payload.balance || 0,
      currency: payload.currency || 'INR',
      transactions: payload.transactions || [],
      totalCredited: payload.totalCredited || 0,
      totalDebited: payload.totalDebited || 0,
      isActive: payload.isActive !== false,
      maximumBalance: payload.maximumBalance || 100000,
      lastTransactionDate: payload.lastTransactionDate || null,
    });
    this.save = jest.fn().mockResolvedValue(this);
  });

  Wallet.findOne = jest.fn();
  return Wallet;
});

const Wallet = require('../models/Wallet');
const walletRouter = require('./wallet');

const getRouteHandler = (method, path) => {
  const layer = walletRouter.stack.find(
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

describe('wallet routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /balance returns frontend-safe wallet summary fields', async () => {
    const handler = getRouteHandler('get', '/balance');
    Wallet.findOne.mockResolvedValue({
      balance: 525.5,
      currency: 'INR',
      totalCredited: 800,
      totalDebited: 274.5,
      isActive: true,
      maximumBalance: 5000,
      lastTransactionDate: '2026-05-07T10:00:00.000Z',
    });
    const req = {
      user: {
        email: 'buyer@example.com',
        name: 'Buyer',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        balance: 525.5,
        currency: 'INR',
        totalCredited: 800,
        totalDebited: 274.5,
        maximumBalance: 5000,
      })
    );
  });

  test('POST /add-money rejects top-ups that exceed the wallet maximum balance', async () => {
    const handler = getRouteHandler('post', '/add-money');
    const save = jest.fn().mockResolvedValue(undefined);
    Wallet.findOne.mockResolvedValue({
      userEmail: 'buyer@example.com',
      balance: 990,
      totalCredited: 1000,
      totalDebited: 10,
      isActive: true,
      maximumBalance: 1000,
      transactions: [],
      save,
    });
    const req = {
      user: {
        email: 'buyer@example.com',
        name: 'Buyer',
      },
      body: {
        amount: 25,
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/cannot exceed 1000/i);
    expect(save).not.toHaveBeenCalled();
  });

  test('GET /transactions/history reports filtered totals when transaction type is provided', async () => {
    const handler = getRouteHandler('get', '/transactions/history');
    Wallet.findOne.mockResolvedValue({
      transactions: [
        {
          transactionId: 'txn-1',
          type: 'Credit',
          amount: 100,
          timestamp: '2026-05-07T10:00:00.000Z',
        },
        {
          transactionId: 'txn-2',
          type: 'Debit',
          amount: 20,
          timestamp: '2026-05-07T09:00:00.000Z',
        },
        {
          transactionId: 'txn-3',
          type: 'Credit',
          amount: 50,
          timestamp: '2026-05-07T08:00:00.000Z',
        },
      ],
    });
    const req = {
      user: {
        email: 'buyer@example.com',
      },
      query: {
        type: 'Credit',
        page: '1',
        limit: '1',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].transactionId).toBe('txn-1');
    expect(res.body.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 1,
        total: 2,
      })
    );
  });
});
