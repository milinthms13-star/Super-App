const ClassifiedAd = require('../models/ClassifiedAd');
const { initializeClassifiedsIndexes } = require('./classifiedsIndexes');

describe('initializeClassifiedsIndexes', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    if (ClassifiedAd.collection && ClassifiedAd.collection.createIndex) {
      jest.spyOn(ClassifiedAd.collection, 'createIndex').mockResolvedValue('ok');
    }
  });

  test('creates the expected classifieds indexes with correct fields and TTL partial filter', async () => {
    await initializeClassifiedsIndexes();

    const calls = ClassifiedAd.collection.createIndex.mock.calls;
    expect(calls).toEqual([
      [{ coordinates: '2dsphere' }],
      [
        {
          title: 'text',
          description: 'text',
          tags: 'text',
          category: 'text',
          searchableText: 'text',
          location: 'text',
        },
      ],
      [{ moderationStatus: 1, expiryDate: 1 }],
      [{ seller: 1, createdAt: -1 }],
      [{ price: 1, category: 1 }],
      [{ spamScore: 1, moderationStatus: 1 }],
      [
        { expiryDate: 1 },
        {
          expireAfterSeconds: 0,
          partialFilterExpression: { autoRenew: false },
        },
      ],
    ]);
  });
});
