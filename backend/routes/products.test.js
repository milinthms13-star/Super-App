jest.mock('../utils/elasticsearch', () => ({
  indexProduct: jest.fn().mockResolvedValue(undefined),
  deleteProduct: jest.fn().mockResolvedValue(undefined),
  searchProducts: jest.fn().mockResolvedValue({
    products: [],
    total: 0,
    aggregations: { categories: [], businesses: [] },
  }),
}));

jest.mock('../config/redis', () => ({
  getRedisClient: jest.fn(() => null),
}));

jest.mock('../utils/cloudinary', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue('https://example.com/product.jpg'),
}));

jest.mock('../utils/gridfs', () => ({
  deleteGridFSFile: jest.fn().mockResolvedValue(undefined),
  uploadBufferToGridFS: jest.fn().mockResolvedValue({ id: '507f1f77bcf86cd799439011' }),
}));

const { __testables } = require('./products');

describe('product serialization', () => {
  test('preserves starter-product stock when there are no inventory batches', async () => {
    const serialized = await __testables.serializeProduct({
      id: 'starter-1',
      name: 'Starter Product',
      category: 'Groceries',
      stock: 8,
      price: 120,
      mrp: 150,
      approvalStatus: 'approved',
      isActive: true,
    });

    expect(serialized.stock).toBe(8);
    expect(serialized.price).toBe(120);
    expect(serialized.mrp).toBe(150);
  });

  test('promotes active batch return policy to the product summary', async () => {
    const serialized = await __testables.serializeProduct({
      id: 'batch-1',
      name: 'Batch-backed Product',
      category: 'Snacks',
      stock: 0,
      price: 0,
      mrp: 0,
      inventoryBatches: [
        {
          id: 'lot-1',
          stock: 4,
          price: 90,
          mrp: 100,
          returnAllowed: true,
          returnWindowDays: 7,
          isActive: true,
          createdAt: '2026-04-20T00:00:00.000Z',
        },
      ],
    });

    expect(serialized.stock).toBe(4);
    expect(serialized.returnAllowed).toBe(true);
    expect(serialized.returnWindowDays).toBe(7);
  });
});
