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
        location: 'Delhi',
        condition: 'Used',
        moderationStatus: 'approved',
        mediaGallery: [],
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

  test('assigns lifecycle fields for classifieds plans', () => {
    const { buildClassifiedLifecycleFields } = appDataRouter.__testables;
    const now = new Date('2026-05-07T00:00:00.000Z');

    expect(buildClassifiedLifecycleFields('free', now)).toEqual(
      expect.objectContaining({
        autoRenew: false,
        subscriptionTier: 'none',
        promotionPlanExpiry: null,
        expiryDate: '2026-06-06T00:00:00.000Z',
      })
    );

    expect(buildClassifiedLifecycleFields('featured', now)).toEqual(
      expect.objectContaining({
        autoRenew: false,
        promotionPlanExpiry: '2026-05-14T00:00:00.000Z',
        expiryDate: '2026-05-14T00:00:00.000Z',
      })
    );

    expect(buildClassifiedLifecycleFields('subscription', now)).toEqual(
      expect.objectContaining({
        autoRenew: true,
        subscriptionTier: 'pro',
        subscriptionExpiryDate: '2027-05-07T00:00:00.000Z',
        expiryDate: '2027-05-07T00:00:00.000Z',
      })
    );
  });

  test('renews classifieds from the later of now or the current expiry', () => {
    const { buildClassifiedRenewalFields } = appDataRouter.__testables;

    const futureRenewal = buildClassifiedRenewalFields(
      {
        expiryDate: '2026-05-20T00:00:00.000Z',
        featured: true,
        autoRenew: false,
        monetizationPlan: 'Featured',
      },
      { durationDays: 10, autoRenew: true },
      new Date('2026-05-07T00:00:00.000Z')
    );

    expect(futureRenewal).toEqual(
      expect.objectContaining({
        expiryDate: '2026-05-30T00:00:00.000Z',
        promotionPlanExpiry: '2026-05-30T00:00:00.000Z',
        autoRenew: true,
      })
    );

    const lapsedRenewal = buildClassifiedRenewalFields(
      {
        expiryDate: '2026-05-01T00:00:00.000Z',
        urgent: false,
        autoRenew: false,
        monetizationPlan: 'Free',
      },
      { durationDays: 5 },
      new Date('2026-05-07T00:00:00.000Z')
    );

    expect(lapsedRenewal).toEqual(
      expect.objectContaining({
        expiryDate: '2026-05-12T00:00:00.000Z',
        promotionPlanExpiry: null,
        autoRenew: false,
      })
    );
  });

  test('builds saved-search summaries with only unseen classifieds matches', () => {
    const { buildClassifiedSavedSearchSummary } = appDataRouter.__testables;

    const summary = buildClassifiedSavedSearchSummary(
      {
        id: 'search-1',
        name: 'Laptop alerts',
        filters: {
          searchText: 'Laptop',
          categoryFilter: ['Electronics'],
          locationFilter: ['Trivandrum'],
          conditionFilter: ['Like New'],
          priceFilter: ['50k - 1L'],
        },
        lastSeenListingIds: ['cl-older'],
      },
      [
        {
          id: 'cl-new',
          title: 'Gaming Laptop RTX 4060',
          description: 'Like new condition with warranty',
          category: 'Electronics',
          location: 'Trivandrum',
          condition: 'Like New',
          price: 89000,
          moderationStatus: 'approved',
          createdAt: '2026-05-07T10:00:00.000Z',
        },
        {
          id: 'cl-older',
          title: 'Laptop Stand',
          description: 'Accessory listing',
          category: 'Electronics',
          location: 'Trivandrum',
          condition: 'Like New',
          price: 60000,
          moderationStatus: 'approved',
          createdAt: '2026-05-06T10:00:00.000Z',
        },
        {
          id: 'cl-pending',
          title: 'Gaming Laptop Pending',
          description: 'Should not alert while pending review',
          category: 'Electronics',
          location: 'Trivandrum',
          condition: 'Like New',
          price: 87000,
          moderationStatus: 'pending',
        },
      ]
    );

    expect(summary.matchCount).toBe(2);
    expect(summary.newMatchCount).toBe(1);
    expect(summary.previewListings).toEqual([
      expect.objectContaining({
        id: 'cl-new',
        title: 'Gaming Laptop RTX 4060',
      }),
    ]);
    expect(summary.matchedListingIds).toEqual(['cl-new', 'cl-older']);
  });
});

describe('realestate app-data helpers', () => {
  test('updates lead status and follow-up metadata for CRM workflows', () => {
    const { buildRealEstateLeadUpdate } = appDataRouter.__testables;

    const updatedLead = buildRealEstateLeadUpdate(
      {
        id: 'lead-1',
        name: 'Haritha',
        status: 'new',
        followUpAt: null,
        followUpNote: '',
      },
      {
        status: 'contacted',
        followUpAt: '2026-05-08T10:00:00.000Z',
        followUpNote: 'Call back after document share.',
      },
      new Date('2026-05-07T09:00:00.000Z')
    );

    expect(updatedLead).toEqual(
      expect.objectContaining({
        id: 'lead-1',
        status: 'contacted',
        followUpAt: '2026-05-08T10:00:00.000Z',
        followUpNote: 'Call back after document share.',
        lastContactedAt: '2026-05-07T09:00:00.000Z',
      })
    );
  });

  test('detects seller visit conflicts across properties', () => {
    const { findRealEstateVisitConflict } = appDataRouter.__testables;

    const conflict = findRealEstateVisitConflict(
      [
        {
          id: 're-1',
          title: 'Skyline Residency 3 BHK',
          ownerId: 'owner-1',
          sellerEmail: 'seller@example.com',
          visits: [
            {
              id: 'visit-1',
              scheduledAt: '2026-05-10T11:00:00.000Z',
              durationMinutes: 45,
              status: 'confirmed',
            },
          ],
        },
        {
          id: 're-2',
          title: 'Garden Villa',
          ownerId: 'owner-1',
          sellerEmail: 'seller@example.com',
          visits: [],
        },
      ],
      {
        id: 'visit-2',
        scheduledAt: '2026-05-10T11:15:00.000Z',
        durationMinutes: 30,
        status: 'scheduled',
      },
      {
        ownerId: 'owner-1',
        sellerEmail: 'seller@example.com',
      }
    );

    expect(conflict).toEqual(
      expect.objectContaining({
        propertyId: 're-1',
        propertyTitle: 'Skyline Residency 3 BHK',
        visitId: 'visit-1',
      })
    );
  });

  test('builds visit reminders for new property visits', () => {
    const { buildRealEstateVisitRecord } = appDataRouter.__testables;

    const visit = buildRealEstateVisitRecord(
      {
        scheduledAt: '2026-05-12T15:00:00.000Z',
        durationMinutes: 60,
        mode: 'virtual',
        note: 'Please share the meet link.',
      },
      {
        name: 'Akhil',
        email: 'akhil@example.com',
      },
      new Date('2026-05-10T12:00:00.000Z')
    );

    expect(visit).toEqual(
      expect.objectContaining({
        buyerName: 'Akhil',
        buyerEmail: 'akhil@example.com',
        scheduledAt: '2026-05-12T15:00:00.000Z',
        durationMinutes: 60,
        mode: 'virtual',
        status: 'scheduled',
        reminderAt: '2026-05-12T13:00:00.000Z',
      })
    );
  });
});
