jest.mock('../models/BulkOrder', () => {
  const BulkOrder = jest.fn();
  BulkOrder.findOne = jest.fn();
  return BulkOrder;
});

jest.mock('../models/Product', () => ({
  findById: jest.fn(),
}));

jest.mock('../utils/devProductStore', () => ({
  findProductById: jest.fn(),
}));

const BulkOrder = require('../models/BulkOrder');
const Product = require('../models/Product');
const bulkOrdersRouter = require('./bulkorders');

describe('bulkorders authorization', () => {
  const getRouteHandler = (method, path) => {
    const layer = bulkOrdersRouter.stack.find(
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects bulk order status changes from a different account', async () => {
    const handler = getRouteHandler('put', '/:bulkOrderId/status');
    const save = jest.fn().mockResolvedValue(undefined);
    BulkOrder.findOne.mockResolvedValue({
      bulkOrderId: 'bulk-123',
      sellerEmail: 'seller@example.com',
      sellerName: 'Seller',
      status: 'Pending',
      save,
    });
    const req = {
      params: { bulkOrderId: 'bulk-123' },
      body: { status: 'Processing' },
      user: { email: 'intruder@example.com', name: 'Intruder' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Bulk order not found or unauthorized');
    expect(save).not.toHaveBeenCalled();
  });

  test('allows the owning seller to quote a legacy order and backfills seller ownership', async () => {
    const handler = getRouteHandler('post', '/:bulkOrderId/quote');
    const save = jest.fn().mockResolvedValue(undefined);
    const order = {
      bulkOrderId: 'bulk-legacy',
      sellerEmail: '',
      sellerName: '',
      items: [{ productId: '665f4f7e8b69fe10ef2ac001' }],
      status: 'Pending',
      totalAmount: 1000,
      save,
    };

    BulkOrder.findOne.mockResolvedValue(order);
    Product.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          sellerEmail: 'seller@example.com',
          sellerName: 'Seller',
        }),
      }),
    });
    const req = {
      params: { bulkOrderId: 'bulk-legacy' },
      body: { quotedPrice: 1250, validityDays: 7 },
      user: { email: 'seller@example.com', name: 'Seller' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(order.status).toBe('Quoted');
    expect(order.totalAmount).toBe(1250);
    expect(order.sellerEmail).toBe('seller@example.com');
    expect(order.sellerName).toBe('Seller');
    expect(save).toHaveBeenCalledTimes(1);
  });
});
