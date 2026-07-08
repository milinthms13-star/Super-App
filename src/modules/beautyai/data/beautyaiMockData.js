/**
 * BeautyAI Mock Data
 * Sample data for development and testing
 */

import {
  SKIN_TYPES,
  HAIR_TYPES,
  SKIN_CONCERNS,
  EVENT_TYPES,
  BUDGET_LEVELS,
  TIP_CATEGORIES,
  ROUTINE_TIMES,
} from "./beautyaiConstants";

// ==================== Mock Tips ====================

export const mockTips = [
  {
    _id: "tip-001",
    title: "Daily Sunscreen is Essential",
    text: "Apply broad-spectrum SPF 30+ sunscreen every morning, even on cloudy days. Reapply every 2-3 hours if outdoors.",
    category: TIP_CATEGORIES.SKIN_CARE,
    language: "en",
    status: "published",
    createdAt: "2024-01-15T08:00:00Z",
  },
  {
    _id: "tip-002",
    title: "Hydration is Key",
    text: "Drink at least 8 glasses of water daily for glowing skin. Hydrated skin looks plumper and more radiant.",
    category: TIP_CATEGORIES.LIFESTYLE,
    language: "en",
    status: "published",
    createdAt: "2024-01-16T08:00:00Z",
  },
  {
    _id: "tip-003",
    title: "Double Cleanse at Night",
    text: "Remove makeup with oil cleanser first, then use water-based cleanser for clean, healthy skin.",
    category: TIP_CATEGORIES.SKIN_CARE,
    language: "en",
    status: "published",
    createdAt: "2024-01-17T08:00:00Z",
  },
  {
    _id: "tip-004",
    title: "Patch Test New Products",
    text: "Always patch test new skincare products on your inner arm for 24-48 hours before applying to your face.",
    category: TIP_CATEGORIES.SAFETY,
    language: "en",
    status: "published",
    createdAt: "2024-01-18T08:00:00Z",
  },
  {
    _id: "tip-005",
    title: "Sleep on Silk Pillowcases",
    text: "Silk pillowcases reduce friction, preventing hair breakage and facial creases while you sleep.",
    category: TIP_CATEGORIES.HAIR_CARE,
    language: "en",
    status: "published",
    createdAt: "2024-01-19T08:00:00Z",
  },
];

// ==================== Mock Beauty Plans ====================

export const mockBeautyPlans = [
  {
    _id: "plan-001",
    userId: "user-123",
    title: "7-Day Acne Clear Plan",
    skinType: SKIN_TYPES.OILY,
    hairType: HAIR_TYPES.NORMAL,
    concern: SKIN_CONCERNS.ACNE,
    selectedConcerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.OILINESS, SKIN_CONCERNS.LARGE_PORES],
    eventType: EVENT_TYPES.DAILY_GLOW,
    budget: BUDGET_LEVELS.MEDIUM,
    language: "en",
    plan: {
      morning: [
        "Gentle salicylic acid cleanser",
        "Niacinamide serum",
        "Oil-free moisturizer",
        "Matte sunscreen SPF 50",
      ],
      evening: [
        "Double cleanse with oil cleanser",
        "Water-based gentle cleanser",
        "BHA toner",
        "Hyaluronic acid serum",
        "Light gel moisturizer",
      ],
      night: [
        "Spot treatment with benzoyl peroxide",
        "Retinol serum (alternate nights)",
        "Soothing night cream",
      ],
      weekly: [
        "Clay mask twice a week",
        "Gentle exfoliation once a week",
      ],
      lifestyle: [
        "Change pillowcases every 3 days",
        "Avoid touching face",
        "Stay hydrated - 8 glasses water daily",
        "Reduce dairy and sugar intake",
      ],
    },
    products: [
      "CeraVe SA Cleanser",
      "The Ordinary Niacinamide 10% + Zinc 1%",
      "Neutrogena Oil-Free Moisturizer",
      "Bioré UV Aqua Rich Waxy Essence SPF 50",
    ],
    safety: {
      warnings: [
        "Avoid using retinol and AHA/BHA together",
        "Always use sunscreen when using actives",
        "Patch test new products",
      ],
      severity: "moderate",
    },
    createdAt: "2024-02-01T10:00:00Z",
    updatedAt: "2024-02-01T10:00:00Z",
  },
  {
    _id: "plan-002",
    userId: "user-123",
    title: "Wedding Glow 30-Day Plan",
    skinType: SKIN_TYPES.COMBINATION,
    hairType: HAIR_TYPES.WAVY,
    concern: SKIN_CONCERNS.DULLNESS,
    selectedConcerns: [SKIN_CONCERNS.DULLNESS, SKIN_CONCERNS.FINE_LINES, SKIN_CONCERNS.DARK_CIRCLES],
    eventType: EVENT_TYPES.WEDDING,
    budget: BUDGET_LEVELS.HIGH,
    language: "en",
    plan: {
      morning: [
        "Gentle cream cleanser",
        "Vitamin C serum 15%",
        "Hyaluronic acid serum",
        "Rich moisturizer",
        "Broad-spectrum SPF 50",
      ],
      evening: [
        "Oil cleanser",
        "Foam cleanser",
        "Glycolic acid toner",
        "Peptide serum",
        "Eye cream with caffeine",
        "Night cream with ceramides",
      ],
      night: [
        "Retinol 0.5% (3x per week)",
        "Sleeping mask (alternate nights)",
      ],
      weekly: [
        "Professional facial (once a week)",
        "AHA peel (twice a week)",
        "Sheet mask (3x per week)",
        "Hair spa treatment (once a week)",
      ],
      lifestyle: [
        "Sleep 7-8 hours nightly",
        "Drink green tea daily",
        "Face massage with jade roller",
        "Avoid alcohol and smoking",
      ],
    },
    products: [
      "SK-II Facial Treatment Essence",
      "Drunk Elephant C-Firma Vitamin C Serum",
      "La Mer The Eye Concentrate",
      "Estée Lauder Advanced Night Repair",
    ],
    safety: {
      warnings: [
        "Schedule professional treatments 2 weeks before wedding",
        "Stop retinol 1 week before wedding",
        "Avoid trying new products 2 weeks before event",
      ],
      severity: "low",
    },
    createdAt: "2024-02-05T14:30:00Z",
    updatedAt: "2024-02-05T14:30:00Z",
  },
];

// ==================== Mock Selfies ====================

export const mockSelfies = [
  {
    _id: "selfie-001",
    userId: "user-123",
    photoUrl: "https://example.com/selfies/selfie-001.jpg",
    thumbnailUrl: "https://example.com/selfies/thumb-selfie-001.jpg",
    analysis: {
      skinType: SKIN_TYPES.OILY,
      detectedConcerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.LARGE_PORES],
      skinScore: 72,
      recommendations: [
        "Use oil-control products",
        "Incorporate BHA exfoliant",
        "Never skip moisturizer",
      ],
    },
    metadata: {
      width: 1080,
      height: 1920,
      size: 2456789,
      format: "jpeg",
    },
    createdAt: "2024-02-01T09:45:00Z",
  },
  {
    _id: "selfie-002",
    userId: "user-123",
    photoUrl: "https://example.com/selfies/selfie-002.jpg",
    thumbnailUrl: "https://example.com/selfies/thumb-selfie-002.jpg",
    analysis: {
      skinType: SKIN_TYPES.COMBINATION,
      detectedConcerns: [SKIN_CONCERNS.DULLNESS, SKIN_CONCERNS.FINE_LINES],
      skinScore: 78,
      recommendations: [
        "Add vitamin C serum",
        "Use AHA exfoliants",
        "Apply SPF daily",
      ],
    },
    metadata: {
      width: 1080,
      height: 1920,
      size: 2123456,
      format: "jpeg",
    },
    createdAt: "2024-02-05T14:20:00Z",
  },
];

// ==================== Mock Progress Logs ====================

export const mockProgressLogs = [
  {
    _id: "log-001",
    userId: "user-123",
    planId: "plan-001",
    day: 1,
    done: true,
    note: "Started the routine, feeling good!",
    skinScore: 72,
    createdAt: "2024-02-01T20:00:00Z",
    updatedAt: "2024-02-01T20:00:00Z",
  },
  {
    _id: "log-002",
    userId: "user-123",
    planId: "plan-001",
    day: 2,
    done: true,
    note: "Skin feels cleaner already",
    skinScore: 73,
    createdAt: "2024-02-02T20:15:00Z",
    updatedAt: "2024-02-02T20:15:00Z",
  },
  {
    _id: "log-003",
    userId: "user-123",
    planId: "plan-001",
    day: 3,
    done: true,
    note: "Less oily throughout the day",
    skinScore: 74,
    createdAt: "2024-02-03T19:45:00Z",
    updatedAt: "2024-02-03T19:45:00Z",
  },
  {
    _id: "log-004",
    userId: "user-123",
    planId: "plan-001",
    day: 4,
    done: false,
    note: "",
    skinScore: 0,
    createdAt: "2024-02-04T00:00:00Z",
    updatedAt: "2024-02-04T00:00:00Z",
  },
];

// ==================== Mock Usage Status ====================

export const mockUsageStatus = {
  tier: "free",
  analyzeSelfie: {
    used: 1,
    limit: 3,
    remaining: 2,
    dateKey: "2024-02-01",
  },
  plan: {
    used: 2,
    limit: 3,
    remaining: 1,
    dateKey: "2024-02-01",
  },
  progressLog: {
    used: 3,
    limit: 100,
    remaining: 97,
    dateKey: "2024-02-01",
  },
};

// ==================== Mock Consent Status ====================

export const mockConsentStatus = {
  planGeneration: {
    granted: true,
    grantedAt: "2024-02-01T09:00:00Z",
  },
  selfieAnalysis: {
    granted: true,
    grantedAt: "2024-02-01T09:30:00Z",
  },
  consentVersion: "v1.0",
};

// ==================== Mock Subscription Rules ====================

export const mockSubscriptionRules = {
  free: {
    dailyAnalysisLimit: 3,
    weeklyPlanLengthDays: 7,
    allowPremiumReport: false,
    allowDermatologistReferral: false,
  },
  premium: {
    dailyAnalysisLimit: 20,
    weeklyPlanLengthDays: 30,
    allowPremiumReport: true,
    allowDermatologistReferral: true,
  },
  enterprise: {
    dailyAnalysisLimit: 100,
    weeklyPlanLengthDays: 90,
    allowPremiumReport: true,
    allowDermatologistReferral: true,
  },
};

// ==================== Mock Admin Alerts ====================

export const mockAdminAlerts = [
  {
    _id: "alert-001",
    type: "quota_warning",
    severity: "warning",
    message: "User user-456 approaching daily quota limit",
    userId: "user-456",
    metadata: {
      used: 18,
      limit: 20,
    },
    createdAt: "2024-02-01T15:30:00Z",
  },
  {
    _id: "alert-002",
    type: "consent_revoked",
    severity: "info",
    message: "User user-789 revoked selfie analysis consent",
    userId: "user-789",
    metadata: {
      consentType: "selfieAnalysis",
    },
    createdAt: "2024-02-01T14:20:00Z",
  },
];

// ==================== Mock Admin Stats ====================

export const mockAdminStats = {
  totalUsers: 1250,
  activeUsers: 487,
  totalPlans: 3421,
  totalSelfies: 5678,
  quotaUsage: {
    free: {
      users: 1000,
      avgDailyUsage: 2.3,
    },
    premium: {
      users: 250,
      avgDailyUsage: 8.7,
    },
  },
  popularConcerns: [
    { concern: SKIN_CONCERNS.ACNE, count: 456 },
    { concern: SKIN_CONCERNS.AGING, count: 321 },
    { concern: SKIN_CONCERNS.DARK_SPOTS, count: 287 },
  ],
  recentActivity: {
    last24h: {
      plans: 45,
      selfies: 67,
      progressLogs: 123,
    },
  },
};

// ==================== Mock Product Recommendations ====================

export const mockProductRecommendations = {
  [BUDGET_LEVELS.LOW]: [
    {
      id: "prod-001",
      name: "Simple Refreshing Facial Wash",
      category: "cleanser",
      price: 299,
      currency: "INR",
      rating: 4.5,
      link: "/ecommerce/product/prod-001",
    },
    {
      id: "prod-002",
      name: "The Ordinary Niacinamide 10%",
      category: "serum",
      price: 599,
      currency: "INR",
      rating: 4.7,
      link: "/ecommerce/product/prod-002",
    },
  ],
  [BUDGET_LEVELS.MEDIUM]: [
    {
      id: "prod-003",
      name: "CeraVe Hydrating Cleanser",
      category: "cleanser",
      price: 899,
      currency: "INR",
      rating: 4.6,
      link: "/ecommerce/product/prod-003",
    },
    {
      id: "prod-004",
      name: "Paula's Choice 2% BHA Liquid",
      category: "exfoliator",
      price: 2499,
      currency: "INR",
      rating: 4.8,
      link: "/ecommerce/product/prod-004",
    },
  ],
  [BUDGET_LEVELS.HIGH]: [
    {
      id: "prod-005",
      name: "SK-II Facial Treatment Essence",
      category: "toner",
      price: 12500,
      currency: "INR",
      rating: 4.9,
      link: "/ecommerce/product/prod-005",
    },
    {
      id: "prod-006",
      name: "Estée Lauder Advanced Night Repair",
      category: "serum",
      price: 8500,
      currency: "INR",
      rating: 4.8,
      link: "/ecommerce/product/prod-006",
    },
  ],
};

// ==================== Helper Functions ====================

export const getMockTipsByCategory = (category) => {
  if (!category || category === "all") {
    return mockTips;
  }
  return mockTips.filter((tip) => tip.category === category);
};

export const getMockPlansByUser = (userId) => {
  return mockBeautyPlans.filter((plan) => plan.userId === userId);
};

export const getMockProgressByPlan = (planId) => {
  return mockProgressLogs.filter((log) => log.planId === planId);
};

export const getMockProductsByBudget = (budget) => {
  return mockProductRecommendations[budget] || mockProductRecommendations[BUDGET_LEVELS.MEDIUM];
};
