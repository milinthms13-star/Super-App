const {
  serializeClassifiedAd,
  buildClassifiedPlanLabel,
  buildNonExpiredQuery,
  listClassifiedModuleData,
} = require('./classifiedStore');
const devAppDataStore = require('./devAppDataStore');

describe('classifiedStore', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  test('builds a non-expired query that keeps renewable or active listings visible', () => {
    const now = new Date('2026-05-07T00:00:00.000Z');

    expect(buildNonExpiredQuery(now)).toEqual({
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: null },
        { expiryDate: { $gte: now } },
        { autoRenew: true },
      ],
    });
  });

  test('only exposes approved active listings and hydrates stored messages and reports in file mode', async () => {
    jest.spyOn(devAppDataStore, 'readAppData').mockResolvedValue({
      moduleData: {
        classifiedsListings: [
          {
            id: 'approved-1',
            title: 'Visible Listing',
            description: 'Approved and current.',
            price: 15000,
            category: 'Electronics',
            location: 'Kochi',
            seller: 'Visible Seller',
            sellerEmail: 'visible@example.com',
            condition: 'Used',
            moderationStatus: 'approved',
            expiryDate: '2099-01-01T00:00:00.000Z',
          },
          {
            id: 'pending-1',
            title: 'Pending Listing',
            description: 'Should stay hidden.',
            price: 17000,
            category: 'Electronics',
            location: 'Kochi',
            seller: 'Pending Seller',
            condition: 'Used',
            moderationStatus: 'pending',
          },
          {
            id: 'flagged-1',
            title: 'Flagged Listing',
            description: 'Should stay hidden.',
            price: 19000,
            category: 'Electronics',
            location: 'Kochi',
            seller: 'Flagged Seller',
            condition: 'Used',
            moderationStatus: 'flagged',
          },
          {
            id: 'expired-1',
            title: 'Expired Listing',
            description: 'Expired listing should not be public.',
            price: 21000,
            category: 'Electronics',
            location: 'Kochi',
            seller: 'Expired Seller',
            condition: 'Used',
            moderationStatus: 'approved',
            expiryDate: '2020-01-01T00:00:00.000Z',
          },
        ],
        classifiedsMessages: [
          {
            id: 'msg-1',
            listingId: 'approved-1',
            from: 'Buyer One',
            senderEmail: 'buyer@example.com',
            text: 'Is this still available?',
            createdAt: '2026-05-07T10:00:00.000Z',
          },
          {
            id: 'msg-2',
            listingId: 'pending-1',
            from: 'Buyer Two',
            senderEmail: 'hidden@example.com',
            text: 'Should not leak through hidden listing data.',
            createdAt: '2026-05-07T11:00:00.000Z',
          },
        ],
        classifiedsReports: [
          {
            id: 'report-1',
            listingId: 'approved-1',
            reporterEmail: 'moderator@example.com',
            reporterName: 'Moderator',
            reason: 'Needs closer review',
            status: 'open',
            createdAt: '2026-05-07T12:00:00.000Z',
          },
          {
            id: 'report-2',
            listingId: 'flagged-1',
            reporterEmail: 'hidden@example.com',
            reporterName: 'Hidden',
            reason: 'Should not leak through hidden listing data.',
            status: 'open',
            createdAt: '2026-05-07T13:00:00.000Z',
          },
        ],
      },
    });

    const result = await listClassifiedModuleData();

    expect(result.classifiedsListings.map((listing) => listing.id)).toEqual(['approved-1']);
    expect(result.classifiedsMessages).toEqual([
      expect.objectContaining({
        id: 'msg-1',
        listingId: 'approved-1',
        text: 'Is this still available?',
      }),
    ]);
    expect(result.classifiedsReports).toEqual([
      expect.objectContaining({
        id: 'report-1',
        listingId: 'approved-1',
        reason: 'Needs closer review',
      }),
    ]);
  });
});
