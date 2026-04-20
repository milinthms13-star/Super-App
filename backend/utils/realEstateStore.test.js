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
      verified: true,
      featured: true,
      rating: 4.8,
    });

    expect(serialized).toEqual(
      expect.objectContaining({
        id: '507f1f77bcf86cd799439021',
        title: 'Skyline Residency 3 BHK',
        priceLabel: '95 Lakhs',
        location: 'Kochi',
        type: 'Flat',
        intent: 'sale',
        verified: true,
        featured: true,
      })
    );
  });
});
