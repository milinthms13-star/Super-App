const appDataRouter = require('./appData');

describe('education app-data helpers', () => {
  test('normalizes education state lists and removes duplicates', () => {
    const { normalizeEducationState } = appDataRouter.__testables;

    const normalized = normalizeEducationState({
      enrolledCourseIds: ['spoken-english', 'spoken-english', ' coding-fundamentals '],
      appliedScholarships: ['Kerala State Merit Scholarship', ''],
      joinedGroups: ['SSLC Exam Preparation', 'SSLC Exam Preparation', ' '],
    });

    expect(normalized).toEqual({
      enrolledCourseIds: ['spoken-english', 'coding-fundamentals'],
      appliedScholarships: ['Kerala State Merit Scholarship'],
      joinedGroups: ['SSLC Exam Preparation'],
      courseProgress: {},
      roleProfile: {
        primaryRole: 'student',
        studentName: '',
        classLevel: '',
        targetExam: '',
        preferredLanguage: 'English',
        careerGoal: '',
      },
      interventionsDismissed: [],
    });
  });

  test('normalizes course progress map and bounds values', () => {
    const { normalizeEducationState } = appDataRouter.__testables;

    const normalized = normalizeEducationState({
      courseProgress: {
        ' spoken-english ': 87.6,
        'bad-number': 'nope',
        'over-max': 170,
        'below-min': -15,
      },
    });

    expect(normalized).toEqual({
      enrolledCourseIds: [],
      appliedScholarships: [],
      joinedGroups: [],
      courseProgress: {
        'spoken-english': 88,
        'over-max': 100,
        'below-min': 0,
      },
      roleProfile: {
        primaryRole: 'student',
        studentName: '',
        classLevel: '',
        targetExam: '',
        preferredLanguage: 'English',
        careerGoal: '',
      },
      interventionsDismissed: [],
    });
  });

  test('computes progress delta for learning events', () => {
    const { computeEducationProgressDelta } = appDataRouter.__testables;

    expect(
      computeEducationProgressDelta({
        eventType: 'lesson_complete',
      })
    ).toBe(8);

    expect(
      computeEducationProgressDelta({
        eventType: 'quiz_complete',
        quizScore: 90,
      })
    ).toBe(12);

    expect(
      computeEducationProgressDelta({
        eventType: 'watch_time',
        watchMinutes: 35,
      })
    ).toBe(3);
  });

  test('returns ranked tutor matches for tuition requests', () => {
    const { buildEducationTutorMatches } = appDataRouter.__testables;

    const matches = buildEducationTutorMatches({
      subject: 'Mathematics',
      classLevel: 'Class 10',
      preferredMode: 'online',
    });

    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        matchScore: expect.any(Number),
      })
    );
  });

  test('computes assessment metrics against full question bank', () => {
    const { buildSkillAssessmentMetrics } = appDataRouter.__testables;

    const metrics = buildSkillAssessmentMetrics({
      questions: [
        { id: 'q1', answer: 1, topic: 'algebra' },
        { id: 'q2', answer: 0, topic: 'grammar' },
        { id: 'q3', answer: 2, topic: 'science' },
      ],
      answers: [
        { id: 'q1', selectedIndex: 1 },
        { id: 'q2', selectedIndex: 2 },
      ],
    });

    expect(metrics).toEqual({
      totalQuestions: 3,
      correct: 1,
      wrong: 1,
      attempted: 2,
      negativeMarks: 0.25,
      score: 25,
      weakAreaTopics: ['grammar'],
    });
  });

  test('allows only valid tuition status transitions', () => {
    const { canTransitionEducationTuitionStatus } = appDataRouter.__testables;

    expect(
      canTransitionEducationTuitionStatus({
        currentStatus: 'submitted',
        nextStatus: 'matched',
      })
    ).toBe(true);

    expect(
      canTransitionEducationTuitionStatus({
        currentStatus: 'submitted',
        nextStatus: 'completed',
      })
    ).toBe(false);
  });

  test('builds education outcome metrics and interventions', () => {
    const { buildEducationOutcomeMetrics, buildEducationInterventions } = appDataRouter.__testables;

    const state = {
      courseProgress: { course1: 40, course2: 50 },
      appliedScholarships: ['Kerala State Merit Scholarship'],
      interventionsDismissed: ['certificate-verification'],
    };
    const tuitionRequests = [
      { status: 'submitted', createdAt: '2026-05-01T00:00:00.000Z', requestId: 'req-1' },
      { status: 'completed', createdAt: '2026-05-10T00:00:00.000Z', requestId: 'req-2' },
    ];
    const certificates = [
      { verificationStatus: 'uploaded' },
      { verificationStatus: 'verified' },
    ];
    const latestTest = { score: 62, weakAreas: ['grammar'] };
    const learningEvents = [
      { createdAt: new Date().toISOString() },
      { createdAt: new Date().toISOString() },
    ];

    const outcomeMetrics = buildEducationOutcomeMetrics({
      state,
      latestTest,
      tuitionRequests,
      certificates,
      learningEvents,
    });
    const interventions = buildEducationInterventions({
      state,
      latestTest,
      tuitionRequests,
      outcomeMetrics,
    });

    expect(outcomeMetrics).toEqual(
      expect.objectContaining({
        readinessScore: expect.any(Number),
        avgCourseProgress: 45,
        tuitionCompletionRate: 50,
      })
    );
    expect(interventions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'weak-areas',
        }),
      ])
    );
    expect(interventions.find((item) => item.id === 'certificate-verification')).toBeUndefined();
  });

  test('builds canva toolkit payload for education campaigns', () => {
    const { buildEducationCanvaToolkit } = appDataRouter.__testables;

    const toolkit = buildEducationCanvaToolkit({
      roleProfile: { primaryRole: 'parent', preferredLanguage: 'Malayalam' },
      interventions: [
        { id: 'low-progress', title: 'Low progress', description: 'Improve course momentum.' },
      ],
    });

    expect(toolkit).toEqual(
      expect.objectContaining({
        preferredLanguage: 'Malayalam',
        templates: expect.any(Array),
        campaignSizes: expect.any(Array),
        suggestedCampaigns: expect.arrayContaining([
          expect.objectContaining({
            targetAudience: 'Parents',
          }),
        ]),
      })
    );
  });
});

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

  test('guards classifieds buyer interactions against hidden or owned listings', () => {
    const { getClassifiedPublicInteractionGuard } = appDataRouter.__testables;

    expect(
      getClassifiedPublicInteractionGuard(
        {
          id: 'cl-approved',
          sellerEmail: 'seller@example.com',
          moderationStatus: 'approved',
        },
        {
          email: 'buyer@example.com',
        }
      )
    ).toEqual({ allowed: true });

    expect(
      getClassifiedPublicInteractionGuard(
        {
          id: 'cl-owned',
          sellerEmail: 'seller@example.com',
          moderationStatus: 'approved',
        },
        {
          email: 'seller@example.com',
        }
      )
    ).toEqual(
      expect.objectContaining({
        allowed: false,
        statusCode: 400,
      })
    );

    expect(
      getClassifiedPublicInteractionGuard(
        {
          id: 'cl-pending',
          sellerEmail: 'seller@example.com',
          moderationStatus: 'pending',
        },
        {
          email: 'buyer@example.com',
        }
      )
    ).toEqual(
      expect.objectContaining({
        allowed: false,
        statusCode: 403,
      })
    );
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
