const {
  serializeClassifiedAd,
  buildClassifiedPlanLabel,
} = require('./classifiedStore');

describe('classifiedStore', () => {
  test('serializes classifieds into frontend-friendly module records', () => {
    const serialized = serializeClassifiedAd({
      _id: '507f1f77bcf86cd799439011',
      title: 'Gaming Laptop RTX 4060',
      description: 'High refresh display and active warranty.',
      price: 89000,
      category: 'Electronics',
      seller: 'Anand V',
      sellerRole: 'Verified Seller',
      sellerEmail: 'anand@example.com',
      location: 'Trivandrum',
      locality: 'Kazhakkoottam',
      condition: 'Like New',
      featured: true,
      verified: true,
      chats: 15,
      favorites: 28,
      views: 430,
      languageSupport: ['English', 'Malayalam'],
      tags: ['Laptop', 'Warranty'],
      contactOptions: ['Chat', 'Call'],
      mediaGallery: ['Open lid', 'Specs'],
      mapLabel: 'Kazhakkoottam tech corridor',
      monetizationPlan: 'Featured',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T01:00:00.000Z',
    });

    expect(serialized).toEqual(
      expect.objectContaining({
        id: '507f1f77bcf86cd799439011',
        title: 'Gaming Laptop RTX 4060',
        sellerEmail: 'anand@example.com',
        location: 'Trivandrum',
        featured: true,
        verified: true,
        moderationStatus: 'approved',
        monetizationPlan: 'Featured',
      })
    );
  });

  test('maps pricing plans to monetization labels', () => {
    expect(buildClassifiedPlanLabel('free')).toBe('Free');
    expect(buildClassifiedPlanLabel('featured')).toBe('Featured');
    expect(buildClassifiedPlanLabel('urgent')).toBe('Urgent');
    expect(buildClassifiedPlanLabel('subscription')).toBe('Seller Pro');
  });
});
