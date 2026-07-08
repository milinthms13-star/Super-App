/**
 * BeautyAI Module Constants
 * Centralized constants for skin types, concerns, products, and configuration
 */

// ==================== Skin Types ====================

export const SKIN_TYPES = {
  OILY: "oily",
  DRY: "dry",
  COMBINATION: "combination",
  NORMAL: "normal",
  SENSITIVE: "sensitive",
};

export const SKIN_TYPE_LABELS = {
  [SKIN_TYPES.OILY]: "Oily",
  [SKIN_TYPES.DRY]: "Dry",
  [SKIN_TYPES.COMBINATION]: "Combination",
  [SKIN_TYPES.NORMAL]: "Normal",
  [SKIN_TYPES.SENSITIVE]: "Sensitive",
};

export const SKIN_TYPE_DESCRIPTIONS = {
  [SKIN_TYPES.OILY]: "Shiny appearance, enlarged pores, prone to acne",
  [SKIN_TYPES.DRY]: "Tight feeling, flaky, prone to fine lines",
  [SKIN_TYPES.COMBINATION]: "Oily T-zone, dry cheeks",
  [SKIN_TYPES.NORMAL]: "Balanced, not too oily or dry",
  [SKIN_TYPES.SENSITIVE]: "Easily irritated, prone to redness",
};

// ==================== Hair Types ====================

export const HAIR_TYPES = {
  STRAIGHT: "straight",
  WAVY: "wavy",
  CURLY: "curly",
  COILY: "coily",
  NORMAL: "normal",
  DRY: "dry",
  OILY: "oily",
};

export const HAIR_TYPE_LABELS = {
  [HAIR_TYPES.STRAIGHT]: "Straight",
  [HAIR_TYPES.WAVY]: "Wavy",
  [HAIR_TYPES.CURLY]: "Curly",
  [HAIR_TYPES.COILY]: "Coily",
  [HAIR_TYPES.NORMAL]: "Normal",
  [HAIR_TYPES.DRY]: "Dry",
  [HAIR_TYPES.OILY]: "Oily",
};

// ==================== Concerns ====================

export const SKIN_CONCERNS = {
  ACNE: "acne",
  AGING: "aging",
  DARK_SPOTS: "dark-spots",
  DRYNESS: "dryness",
  DULLNESS: "dullness",
  FINE_LINES: "fine-lines",
  HYPERPIGMENTATION: "hyperpigmentation",
  LARGE_PORES: "large-pores",
  OILINESS: "oiliness",
  REDNESS: "redness",
  UNEVEN_TEXTURE: "uneven-texture",
  DARK_CIRCLES: "dark-circles",
  SENSITIVITY: "sensitivity",
};

export const CONCERN_LABELS = {
  [SKIN_CONCERNS.ACNE]: "Acne & Breakouts",
  [SKIN_CONCERNS.AGING]: "Anti-Aging",
  [SKIN_CONCERNS.DARK_SPOTS]: "Dark Spots",
  [SKIN_CONCERNS.DRYNESS]: "Dryness",
  [SKIN_CONCERNS.DULLNESS]: "Dullness",
  [SKIN_CONCERNS.FINE_LINES]: "Fine Lines & Wrinkles",
  [SKIN_CONCERNS.HYPERPIGMENTATION]: "Hyperpigmentation",
  [SKIN_CONCERNS.LARGE_PORES]: "Large Pores",
  [SKIN_CONCERNS.OILINESS]: "Excess Oil",
  [SKIN_CONCERNS.REDNESS]: "Redness & Irritation",
  [SKIN_CONCERNS.UNEVEN_TEXTURE]: "Uneven Texture",
  [SKIN_CONCERNS.DARK_CIRCLES]: "Dark Circles",
  [SKIN_CONCERNS.SENSITIVITY]: "Sensitivity",
};

// ==================== Event Types ====================

export const EVENT_TYPES = {
  DAILY_GLOW: "daily-glow",
  WEDDING: "wedding",
  PARTY: "party",
  PHOTOSHOOT: "photoshoot",
  DATE_NIGHT: "date-night",
  PROFESSIONAL: "professional",
  SPECIAL_OCCASION: "special-occasion",
};

export const EVENT_TYPE_LABELS = {
  [EVENT_TYPES.DAILY_GLOW]: "Daily Glow",
  [EVENT_TYPES.WEDDING]: "Wedding",
  [EVENT_TYPES.PARTY]: "Party",
  [EVENT_TYPES.PHOTOSHOOT]: "Photoshoot",
  [EVENT_TYPES.DATE_NIGHT]: "Date Night",
  [EVENT_TYPES.PROFESSIONAL]: "Professional Event",
  [EVENT_TYPES.SPECIAL_OCCASION]: "Special Occasion",
};

// ==================== Budget Levels ====================

export const BUDGET_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

export const BUDGET_LABELS = {
  [BUDGET_LEVELS.LOW]: "Budget-Friendly",
  [BUDGET_LEVELS.MEDIUM]: "Mid-Range",
  [BUDGET_LEVELS.HIGH]: "Premium",
};

export const BUDGET_RANGES = {
  [BUDGET_LEVELS.LOW]: "₹500 - ₹2,000",
  [BUDGET_LEVELS.MEDIUM]: "₹2,000 - ₹5,000",
  [BUDGET_LEVELS.HIGH]: "₹5,000+",
};

// ==================== Preferences ====================

export const PREFERENCES = {
  NATURAL: "natural",
  BALANCED: "balanced",
  INTENSIVE: "intensive",
};

export const PREFERENCE_LABELS = {
  [PREFERENCES.NATURAL]: "Natural & Gentle",
  [PREFERENCES.BALANCED]: "Balanced Approach",
  [PREFERENCES.INTENSIVE]: "Intensive Treatment",
};

// ==================== Languages ====================

export const LANGUAGES = {
  EN: "en",
  ML: "ml",
  HI: "hi",
  TA: "ta",
  TE: "te",
  KN: "kn",
};

export const LANGUAGE_LABELS = {
  [LANGUAGES.EN]: "English",
  [LANGUAGES.ML]: "Malayalam",
  [LANGUAGES.HI]: "Hindi",
  [LANGUAGES.TA]: "Tamil",
  [LANGUAGES.TE]: "Telugu",
  [LANGUAGES.KN]: "Kannada",
};

// ==================== Safety Levels ====================

export const SAFETY_LEVELS = {
  LOW: "low",
  MODERATE: "moderate",
  HIGH: "high",
  CRITICAL: "critical",
};

export const SAFETY_LEVEL_LABELS = {
  [SAFETY_LEVELS.LOW]: "Low Risk",
  [SAFETY_LEVELS.MODERATE]: "Moderate Risk",
  [SAFETY_LEVELS.HIGH]: "High Risk",
  [SAFETY_LEVELS.CRITICAL]: "Critical - Consult Professional",
};

export const SAFETY_LEVEL_COLORS = {
  [SAFETY_LEVELS.LOW]: "#4caf50",
  [SAFETY_LEVELS.MODERATE]: "#ff9800",
  [SAFETY_LEVELS.HIGH]: "#f44336",
  [SAFETY_LEVELS.CRITICAL]: "#d32f2f",
};

// ==================== User Tiers ====================

export const USER_TIERS = {
  FREE: "free",
  PREMIUM: "premium",
  ENTERPRISE: "enterprise",
};

export const TIER_LABELS = {
  [USER_TIERS.FREE]: "Free",
  [USER_TIERS.PREMIUM]: "Premium",
  [USER_TIERS.ENTERPRISE]: "Enterprise",
};

// ==================== Tip Categories ====================

export const TIP_CATEGORIES = {
  GENERAL: "general",
  SKIN_CARE: "skin-care",
  HAIR_CARE: "hair-care",
  MAKEUP: "makeup",
  DIET: "diet",
  LIFESTYLE: "lifestyle",
  SAFETY: "safety",
  SEASONAL: "seasonal",
};

export const TIP_CATEGORY_LABELS = {
  [TIP_CATEGORIES.GENERAL]: "General Beauty",
  [TIP_CATEGORIES.SKIN_CARE]: "Skin Care",
  [TIP_CATEGORIES.HAIR_CARE]: "Hair Care",
  [TIP_CATEGORIES.MAKEUP]: "Makeup Tips",
  [TIP_CATEGORIES.DIET]: "Diet & Nutrition",
  [TIP_CATEGORIES.LIFESTYLE]: "Lifestyle",
  [TIP_CATEGORIES.SAFETY]: "Safety & Precautions",
  [TIP_CATEGORIES.SEASONAL]: "Seasonal Care",
};

// ==================== Progress Days ====================

export const DEFAULT_WEEK = [
  { day: 1, label: "Day 1", completed: false, note: "" },
  { day: 2, label: "Day 2", completed: false, note: "" },
  { day: 3, label: "Day 3", completed: false, note: "" },
  { day: 4, label: "Day 4", completed: false, note: "" },
  { day: 5, label: "Day 5", completed: false, note: "" },
  { day: 6, label: "Day 6", completed: false, note: "" },
  { day: 7, label: "Day 7", completed: false, note: "" },
];

// ==================== Product Categories ====================

export const PRODUCT_CATEGORIES = {
  CLEANSER: "cleanser",
  TONER: "toner",
  SERUM: "serum",
  MOISTURIZER: "moisturizer",
  SUNSCREEN: "sunscreen",
  MASK: "mask",
  EXFOLIATOR: "exfoliator",
  EYE_CREAM: "eye-cream",
  SPOT_TREATMENT: "spot-treatment",
  SHAMPOO: "shampoo",
  CONDITIONER: "conditioner",
  HAIR_OIL: "hair-oil",
  HAIR_MASK: "hair-mask",
};

export const PRODUCT_CATEGORY_LABELS = {
  [PRODUCT_CATEGORIES.CLEANSER]: "Cleanser",
  [PRODUCT_CATEGORIES.TONER]: "Toner",
  [PRODUCT_CATEGORIES.SERUM]: "Serum",
  [PRODUCT_CATEGORIES.MOISTURIZER]: "Moisturizer",
  [PRODUCT_CATEGORIES.SUNSCREEN]: "Sunscreen",
  [PRODUCT_CATEGORIES.MASK]: "Face Mask",
  [PRODUCT_CATEGORIES.EXFOLIATOR]: "Exfoliator",
  [PRODUCT_CATEGORIES.EYE_CREAM]: "Eye Cream",
  [PRODUCT_CATEGORIES.SPOT_TREATMENT]: "Spot Treatment",
  [PRODUCT_CATEGORIES.SHAMPOO]: "Shampoo",
  [PRODUCT_CATEGORIES.CONDITIONER]: "Conditioner",
  [PRODUCT_CATEGORIES.HAIR_OIL]: "Hair Oil",
  [PRODUCT_CATEGORIES.HAIR_MASK]: "Hair Mask",
};

// ==================== Routine Times ====================

export const ROUTINE_TIMES = {
  MORNING: "morning",
  EVENING: "evening",
  NIGHT: "night",
  WEEKLY: "weekly",
};

export const ROUTINE_TIME_LABELS = {
  [ROUTINE_TIMES.MORNING]: "Morning Routine",
  [ROUTINE_TIMES.EVENING]: "Evening Routine",
  [ROUTINE_TIMES.NIGHT]: "Night Routine",
  [ROUTINE_TIMES.WEEKLY]: "Weekly Treatment",
};

// ==================== Age Ranges ====================

export const AGE_RANGES = {
  TEENS: "13-19",
  TWENTIES: "20-29",
  THIRTIES: "30-39",
  FORTIES: "40-49",
  FIFTIES_PLUS: "50+",
};

export const AGE_RANGE_LABELS = {
  [AGE_RANGES.TEENS]: "Teens (13-19)",
  [AGE_RANGES.TWENTIES]: "20s",
  [AGE_RANGES.THIRTIES]: "30s",
  [AGE_RANGES.FORTIES]: "40s",
  [AGE_RANGES.FIFTIES_PLUS]: "50+",
};

// ==================== API & Storage ====================

export const API_VERSION = "beauty-ai-v1.1";
export const MODEL_VERSION = "heuristic-selfie-v2";

export const STORAGE_KEYS = {
  SNAPSHOTS: "beauty_ai_weekly_snapshots_v1",
  OFFLINE_QUEUE: "beautyai_offline_queue_v1",
  LAST_PLAN: "beautyai_last_plan_v1",
  PREFERENCES: "beautyai_user_preferences_v1",
};

// ==================== File Upload ====================

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB
export const MAX_IMAGE_SIZE_LABEL = "8MB";

// ==================== Timeouts & Limits ====================

export const SNAPSHOT_TTL_DAYS = 30;
export const SNAPSHOT_TTL_MS = SNAPSHOT_TTL_DAYS * 24 * 60 * 60 * 1000;
export const MAX_SNAPSHOTS = 6;
export const AUTO_SYNC_INTERVAL_MS = 30000; // 30 seconds

// ==================== Default Values ====================

export const DEFAULTS = {
  LANGUAGE: LANGUAGES.EN,
  SKIN_TYPE: SKIN_TYPES.NORMAL,
  HAIR_TYPE: HAIR_TYPES.NORMAL,
  BUDGET: BUDGET_LEVELS.MEDIUM,
  PREFERENCE: PREFERENCES.BALANCED,
  EVENT_TYPE: EVENT_TYPES.DAILY_GLOW,
  CONCERN: "General care",
};

// ==================== Feature Flags ====================

export const FEATURES = {
  SELFIE_ANALYSIS: "selfie_analysis",
  PLAN_GENERATION: "plan_generation",
  PROGRESS_TRACKING: "progress_tracking",
  PRODUCT_RECOMMENDATIONS: "product_recommendations",
  PREMIUM_REPORTS: "premium_reports",
  DERMATOLOGIST_REFERRAL: "dermatologist_referral",
  OFFLINE_MODE: "offline_mode",
  ADMIN_CONTROLS: "admin_controls",
};

// ==================== Status Messages ====================

export const STATUS_MESSAGES = {
  SUCCESS: {
    PLAN_GENERATED: "Beauty plan generated successfully!",
    SELFIE_ANALYZED: "Selfie analyzed successfully!",
    PROGRESS_SAVED: "Progress saved successfully!",
    PLAN_SAVED: "Plan saved successfully!",
    CONSENT_GRANTED: "Consent granted successfully!",
    TIP_CREATED: "Tip created successfully!",
  },
  ERROR: {
    NETWORK: "Network error. Please check your connection.",
    QUOTA_EXCEEDED: "Daily limit reached. Please upgrade or try tomorrow.",
    CONSENT_REQUIRED: "Please accept the terms before proceeding.",
    INVALID_IMAGE: "Please upload a valid image file.",
    FILE_TOO_LARGE: `Image size must be under ${MAX_IMAGE_SIZE_LABEL}.`,
    GENERIC: "Something went wrong. Please try again.",
  },
  INFO: {
    OFFLINE_MODE: "You're offline. Changes will sync when you reconnect.",
    LOADING: "Loading...",
    PROCESSING: "Processing...",
    SYNCING: "Syncing offline changes...",
  },
};

// ==================== Validation Rules ====================

export const VALIDATION = {
  PLAN_TITLE_MIN: 3,
  PLAN_TITLE_MAX: 120,
  PLAN_NOTES_MAX: 500,
  TIP_TITLE_MAX: 120,
  TIP_TEXT_MAX: 500,
  CONCERN_MAX_LENGTH: 120,
  SELECTED_CONCERNS_MAX: 20,
};

// ==================== Malayalam Translations ====================

export const MALAYALAM_TRANSLATIONS = {
  SKIN_TYPES: {
    [SKIN_TYPES.OILY]: "എണ്ണമയമുള്ള",
    [SKIN_TYPES.DRY]: "വരണ്ട",
    [SKIN_TYPES.COMBINATION]: "സംയോജിത",
    [SKIN_TYPES.NORMAL]: "സാധാരണ",
    [SKIN_TYPES.SENSITIVE]: "സെൻസിറ്റീവ്",
  },
  CONCERNS: {
    [SKIN_CONCERNS.ACNE]: "മുഖക്കുരു",
    [SKIN_CONCERNS.AGING]: "വാർദ്ധക്യം",
    [SKIN_CONCERNS.DARK_SPOTS]: "കറുത്ത പാടുകൾ",
    [SKIN_CONCERNS.DRYNESS]: "വരൾച്ച",
  },
  COMMON: {
    LOADING: "ലോഡ് ചെയ്യുന്നു...",
    SAVE: "സേവ് ചെയ്യുക",
    CANCEL: "റദ്ദാക്കുക",
    DELETE: "ഇല്ലാതാക്കുക",
    EDIT: "എഡിറ്റ് ചെയ്യുക",
  },
};
