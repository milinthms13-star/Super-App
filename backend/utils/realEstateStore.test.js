const { serializeRealEstateProperty } = require('./realEstateStore');

describe('realEstateStore', () => {
  test('serializes a property document into module data format', () => {
    const serialized = serializeRealEstateProperty({
      _id: '507f1f77bcf86cd799439021',
      title: 'Skyline Residency 3 BHK',
      price: '95 Lakhs',
      priceLabel: '95 Lakhs',
      priceValue: 95,
      area: '1650 sq ft',
      areaSqft: 1650,
      location: 'Kochi',
      locality: 'Kakkanad',
      type: 'Flat',
      intent: 'sale',
      sellerName: 'Amina Niyas',
      sellerRole: 'Owner',
      sellerEmail: 'seller@example.com',
      ownerId: 'owner-1',
      verified: true,
      featured: true,
      leads: [
        {
          id: 'lead-1',
          name: 'Haritha',
          status: 'contacted',
          followUpAt: '2026-05-08T10:00:00.000Z',
        },
      ],
      visits: [
        {
          id: 'visit-1',
          buyerName: 'Haritha',
          scheduledAt: '2026-05-10T11:00:00.000Z',
          durationMinutes: 45,
          status: 'scheduled',
        },
      ],
      reports: [{ reporterEmail: 'user@example.com', reason: 'Duplicate listing' }],
      reviews: [{ author: 'Buyer', score: 4, comment: 'Smooth visit scheduling.' }],
    });

    expect(serialized).toEqual(
      expect.objectContaining({
        id: '507f1f77bcf86cd799439021',
        title: 'Skyline Residency 3 BHK',
        priceLabel: '95 Lakhs',
        location: 'Kochi',
        type: 'Flat',
        intent: 'sale',
        sellerEmail: 'seller@example.com',
        ownerId: 'owner-1',
        verified: true,
        featured: true,
        disputeCount: 1,
      })
    );
    expect(serialized.reviews[0]).toEqual(expect.objectContaining({ author: 'Buyer', score: 4 }));
    expect(serialized.reports[0]).toEqual(
      expect.objectContaining({ reporterEmail: 'user@example.com', reason: 'Duplicate listing' })
    );
    expect(serialized.leads[0]).toEqual(
      expect.objectContaining({
        id: 'lead-1',
        status: 'contacted',
        followUpAt: '2026-05-08T10:00:00.000Z',
      })
    );
    expect(serialized.visits[0]).toEqual(
      expect.objectContaining({
        id: 'visit-1',
        buyerName: 'Haritha',
        status: 'scheduled',
      })
    );
  });
});
