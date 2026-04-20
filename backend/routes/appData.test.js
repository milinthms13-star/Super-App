const appDataRouter = require('./appData');

describe('classifieds app-data helpers', () => {
  test('normalizes legacy classifieds records into the persisted module shape', () => {
    const { normalizeClassifiedsModule } = appDataRouter.__testables;

    const normalized = normalizeClassifiedsModule({
      classifiedsListings: [
        {
          id: 1,
          title: 'Vintage Bicycle',
          price: 8000,
          category: 'Vehicles',
          seller: 'Priya Singh',
          location: 'Delhi',
        },
      ],
    });

    expect(normalized.classifiedsListings).toEqual([
      expect.objectContaining({
        id: '1',
        title: 'Vintage Bicycle',
        price: 8000,
        category: 'Vehicles',
        seller: 'Priya Singh',
        condition: 'Used',
        moderationStatus: 'approved',
        mediaGallery: ['Primary image'],
      }),
    ]);
    expect(normalized.classifiedsMessages).toEqual([]);
    expect(normalized.classifiedsReports).toEqual([]);
  });

  test('maps promotion plans to monetization labels', () => {
    const { buildClassifiedPlanLabel } = appDataRouter.__testables;

    expect(buildClassifiedPlanLabel('free')).toBe('Free');
    expect(buildClassifiedPlanLabel('featured')).toBe('Featured');
    expect(buildClassifiedPlanLabel('urgent')).toBe('Urgent');
    expect(buildClassifiedPlanLabel('subscription')).toBe('Seller Pro');
  });
});
