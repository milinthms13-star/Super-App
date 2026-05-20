const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const auth = require('../middleware/auth');
const BeautyPlan = require('../models/BeautyPlan');
const {
  buildBeautyPrompt,
  validateBeautyPayload,
} = require('../services/beautyAiBackendHelpers');

const router = express.Router();
const authenticate = auth.authenticate || auth;
const verifyAdmin = auth.verifyAdmin || ((req, _res, next) => next());

const dataDir = path.join(__dirname, '..', 'data');
const dataPath = path.join(dataDir, 'beauty-ai-data.json');

const DEFAULT_TIPS = [
  {
    id: 'tip-sunscreen',
    title: 'Daily Sunscreen Matters',
    text: 'Apply broad-spectrum sunscreen 15 minutes before sun exposure, and reapply every 2-3 hours.',
    category: 'skin-care',
    language: 'en',
    status: 'published',
  },
  {
    id: 'tip-patch-test',
    title: 'Patch Test First',
    text: 'Always patch-test a new product or home remedy on a small skin area for 24 hours.',
    category: 'safety',
    language: 'en',
    status: 'published',
  },
  {
    id: 'tip-hydration',
    title: 'Hydrate for Glow',
    text: 'Hydration supports skin barrier health. Drink water and use a simple moisturizer regularly.',
    category: 'skin-care',
    language: 'en',
    status: 'published',
  },
];

const DEFAULT_SUBSCRIPTION_RULES = {
  free: {
    dailyAnalysisLimit: 1,
    weeklyPlanLengthDays: 7,
    allowPremiumReport: false,
    allowDermatologistReferral: false,
  },
  premium: {
    dailyAnalysisLimit: 10,
    weeklyPlanLengthDays: 30,
    allowPremiumReport: true,
    allowDermatologistReferral: true,
  },
};

const DEFAULT_PRODUCTS = {
  low: [
    'Gentle sulfate-free cleanser',
    'Niacinamide serum (budget)',
    'SPF 30 sunscreen',
  ],
  medium: [
    'Ceramide cleanser',
    'Vitamin C serum',
    'SPF 50 PA++++ sunscreen',
  ],
  high: [
    'Barrier-repair cleanser',
    'Retinol night serum',
    'Broad-spectrum matte sunscreen',
  ],
};

const normalizeText = (value = '') => String(value || '').trim();
const normalizeLower = (value = '') => normalizeText(value).toLowerCase();
const normalizeArray = (value = []) =>
  Array.isArray(value)
    ? value.map((item) => normalizeText(item)).filter(Boolean)
    : String(value || '')
        .split(',')
        .map((item) => normalizeText(item))
        .filter(Boolean);

const resolveUserId = (req) => {
  const raw = req.user?._id || req.user?.id || req.auth?.sub || '';
  return normalizeText(raw);
};

const getUserKey = (req) =>
  normalizeLower(req.user?.email || req.user?.id || req.user?._id || req.auth?.sub || 'guest');

const ensureDataFile = async () => {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataPath);
  } catch (_error) {
    const seed = {
      tips: DEFAULT_TIPS,
      progressLogs: [],
      subscriptionRules: DEFAULT_SUBSCRIPTION_RULES,
    };
    await fs.writeFile(dataPath, JSON.stringify(seed, null, 2), 'utf8');
  }
};

const readData = async () => {
  await ensureDataFile();
  try {
    const raw = await fs.readFile(dataPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      tips: Array.isArray(parsed.tips) ? parsed.tips : DEFAULT_TIPS,
      progressLogs: Array.isArray(parsed.progressLogs) ? parsed.progressLogs : [],
      subscriptionRules: parsed.subscriptionRules || DEFAULT_SUBSCRIPTION_RULES,
    };
  } catch (_error) {
    return {
      tips: DEFAULT_TIPS,
      progressLogs: [],
      subscriptionRules: DEFAULT_SUBSCRIPTION_RULES,
    };
  }
};

const writeData = async (nextData) => {
  await ensureDataFile();
  await fs.writeFile(dataPath, JSON.stringify(nextData, null, 2), 'utf8');
};

const detectSkinType = (knownSkinType = 'Not sure', concern = '') => {
  if (knownSkinType && knownSkinType !== 'Not sure') {
    return knownSkinType;
  }

  const normalizedConcern = normalizeLower(concern);
  if (normalizedConcern.includes('acne')) return 'Oily';
  if (normalizedConcern.includes('wrinkle')) return 'Dry';
  if (normalizedConcern.includes('pigmentation')) return 'Combination';
  return 'Combination';
};

const concernList = (primaryConcern = '', eventMode = '') => {
  const seed = [normalizeText(primaryConcern)].filter(Boolean);
  const event = normalizeLower(eventMode);

  if (event.includes('bridal') || event.includes('festival')) {
    seed.push('Tanning');
  }
  if (event.includes('teen')) {
    seed.push('Acne');
  }

  return [...new Set(seed)].slice(0, 4);
};

const pickProducts = (budget = 'medium') => {
  if (budget === 'low') return DEFAULT_PRODUCTS.low;
  if (budget === 'high') return DEFAULT_PRODUCTS.high;
  return DEFAULT_PRODUCTS.medium;
};

const buildRoutines = (analysisInput = {}) => {
  const concern = normalizeLower(analysisInput.concern);
  const preference = normalizeLower(analysisInput.preference || 'balanced');

  const morningRoutine = [
    'Gentle cleanse',
    concern.includes('pigmentation') ? 'Vitamin C or brightening serum' : 'Hydrating serum',
    'Moisturizer',
    'Broad-spectrum sunscreen',
  ];

  const nightRoutine = [
    'Cleanse (double cleanse if makeup was used)',
    concern.includes('acne') ? 'Target acne treatment' : 'Barrier-support serum',
    'Moisturizer',
    'Lip and under-eye care',
  ];

  const weeklyPlan = [
    '2x soothing mask',
    '1x mild exfoliation (skip if skin is irritated)',
    'Scalp and hair nourishment routine',
  ];

  const remedies =
    preference === 'natural'
      ? [
          'Aloe vera gel (patch-tested) for soothing',
          'Cold green tea compress for under-eye puffiness',
          'Honey + yogurt mask weekly if no sensitivity',
        ]
      : [
          'Use a dermatologist-tested soothing gel',
          'Use fragrance-free moisturizer for barrier support',
          'Use a targeted concern serum 3-4 nights/week',
        ];

  return { morningRoutine, nightRoutine, weeklyPlan, remedies };
};

const buildSafetyWarnings = (safety = {}) => {
  const warnings = [];

  if (safety.sensitiveSkin) {
    warnings.push('Patch test every new product for at least 24 hours before full-face use.');
  }
  if (safety.pregnantOrBreastfeeding) {
    warnings.push('Avoid strong active ingredients unless approved by your doctor.');
  }
  if (safety.usingSkinMedicine) {
    warnings.push('Do not mix acne or skin medicine with new active products without dermatologist advice.');
  }
  if (normalizeText(safety.knownAllergy)) {
    warnings.push(`Avoid ingredients related to: ${normalizeText(safety.knownAllergy)}.`);
  }

  return warnings;
};

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeSelfieSignals = (signals = {}) => {
  const rednessScore = Math.min(1, Math.max(0, toNumber(signals.rednessScore, 0.3)));
  const textureScore = Math.min(1, Math.max(0, toNumber(signals.textureScore, 0.3)));
  const brightnessScore = Math.min(1, Math.max(0, toNumber(signals.brightnessScore, 0.5)));
  const confidence = Math.min(1, Math.max(0, toNumber(signals.confidence, 0.5)));

  return {
    rednessScore,
    textureScore,
    brightnessScore,
    confidence,
  };
};

const scoreFromSignals = (signals = {}) => {
  const normalized = normalizeSelfieSignals(signals);
  const penalty =
    normalized.rednessScore * 12 +
    normalized.textureScore * 10 +
    Math.max(0, 0.55 - normalized.brightnessScore) * 8;
  return Math.max(42, Math.round(82 - penalty));
};

const eventPlanAddons = (eventType = '') => {
  const normalized = normalizeLower(eventType);
  if (normalized.includes('bridal')) {
    return ['Start 4-week glow prep', 'Schedule 2 trial makeup sessions', 'Hydration + sleep tracker daily'];
  }
  if (normalized.includes('festival')) {
    return ['Add de-tan care 2x weekly', 'Practice lightweight makeup look', 'Avoid last-minute unknown products'];
  }
  if (normalized.includes('interview')) {
    return ['Keep routine minimal and calm', 'Focus on hydration and SPF', 'Prep low-shine grooming night before'];
  }
  if (normalized.includes('teen')) {
    return ['Use gentle acne-safe routine', 'Avoid harsh scrubs', 'Track breakout triggers'];
  }
  if (normalized.includes('men-grooming')) {
    return ['Shave-care soothing routine', 'Beard area hygiene checks', 'Weekly scalp + skin reset'];
  }
  return ['Keep routine consistent for 7 days', 'Take weekly progress selfie'];
};

const generateStructuredBeautyPlan = ({
  skinType = 'normal',
  hairType = 'normal',
  selectedConcerns = [],
  budget = 'medium',
  language = 'en',
  eventType = 'daily-glow',
  safety = {},
  signals = {},
}) => {
  const concerns = normalizeArray(selectedConcerns).map((item) => normalizeLower(item));
  const lowerSkinType = normalizeLower(skinType || 'normal');
  const lowerHairType = normalizeLower(hairType || 'normal');
  const score = scoreFromSignals(signals);

  const morning = [
    'Gentle cleanser',
    lowerSkinType === 'dry' ? 'Hydrating moisturizer' : 'Light moisturizer',
    'Sunscreen SPF 30+',
  ];
  const night = [
    'Cleanse face',
    concerns.includes('acne') ? 'Use acne-safe treatment only if suitable' : 'Apply serum if suitable',
    'Moisturizer',
  ];
  const hair = [
    lowerHairType === 'dry' ? 'Oil massage once or twice weekly' : 'Mild shampoo routine',
    concerns.includes('dandruff') ? 'Use anti-dandruff shampoo twice weekly' : 'Use gentle shampoo',
    concerns.includes('hair fall')
      ? 'Check stress, sleep, and diet. Consult doctor if hair fall is severe.'
      : 'Use conditioner on hair lengths',
  ];

  return {
    title: language === 'ml' ? 'സ്വകാര്യ ബ്യൂട്ടി റൂട്ടീൻ പ്ലാൻ' : 'Personal Beauty Routine Plan',
    score,
    morning,
    night,
    hair,
    products: pickProducts(normalizeLower(budget || 'medium')),
    avoid: [
      'Avoid steroid creams without dermatologist advice.',
      'Avoid bleaching creams and unknown fairness products.',
      ...buildSafetyWarnings(safety).map((warning) => `Safety: ${warning}`),
    ],
    eventPlan: eventPlanAddons(eventType),
  };
};

router.get('/tips/today', authenticate, async (req, res) => {
  try {
    const language = normalizeLower(req.query.language || 'en');
    const category = normalizeLower(req.query.category || '');
    const data = await readData();

    const filtered = data.tips.filter((tip) => {
      if (tip.status && tip.status !== 'published') return false;
      if (category && normalizeLower(tip.category) !== category) return false;
      return normalizeLower(tip.language || 'en') === language || normalizeLower(tip.language || 'en') === 'en';
    });

    const source = filtered.length ? filtered : data.tips.filter((tip) => tip.status === 'published');
    const todayTip = source[new Date().getDate() % Math.max(1, source.length)] || null;

    return res.json({
      success: true,
      language,
      category: category || 'all',
      todayTip,
      tips: source.slice(0, 20),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch beauty tips.',
      error: error.message,
    });
  }
});

router.post('/analyze-selfie', authenticate, async (req, res) => {
  try {
    const {
      knownSkinType,
      concern,
      eventMode,
      ageRange,
      selfieConsent,
      budget = 'medium',
    } = req.body || {};

    if (!selfieConsent) {
      return res.status(400).json({
        success: false,
        message: 'Consent is required before selfie analysis.',
      });
    }

    const detectedSkinType = detectSkinType(knownSkinType, concern);
    const detectedConcerns = concernList(concern, eventMode);

    const baseScore = 72;
    const concernPenalty = Math.min(20, detectedConcerns.length * 4);
    const agePenalty = String(ageRange || '').includes('41') ? 4 : 0;
    const skinScore = Math.max(45, baseScore - concernPenalty - agePenalty);

    const severeConcern = detectedConcerns.some((item) =>
      ['infection', 'burns', 'allergy'].includes(normalizeLower(item))
    );

    return res.json({
      success: true,
      analysis: {
        skinType: detectedSkinType,
        skinScore,
        concernsDetected: detectedConcerns,
        productsPreview: pickProducts(budget),
        severeConcernDetected: severeConcern,
        warning: severeConcern
          ? 'Possible severe concern detected. Please consult a dermatologist.'
          : '',
        dataPolicy: {
          selfieStored: false,
          note: 'Selfie image is processed for guidance and not stored by this endpoint.',
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze selfie.',
      error: error.message,
    });
  }
});

router.post('/generate-plan', authenticate, async (req, res) => {
  try {
    const input = req.body || {};
    const routines = buildRoutines(input);
    const products = pickProducts(input.budget);
    const concernDetected = concernList(input.concern, input.eventMode);

    return res.json({
      success: true,
      plan: {
        skinType: detectSkinType(input.knownSkinType, input.concern),
        skinScore: Number(input.skinScore || 74),
        concernsDetected: concernDetected,
        ...routines,
        dos: [
          'Patch-test all new products.',
          'Use sunscreen daily, even on cloudy days.',
          'Keep pillow covers and makeup tools clean.',
        ],
        donts: [
          'Avoid steroid creams without doctor advice.',
          'Avoid over-layering active ingredients in one routine.',
          'Avoid unsafe bleaching routines.',
        ],
        products,
      },
      safety: {
        medicalDisclaimer:
          'This module does not provide medical diagnosis. Consult a dermatologist for severe or persistent issues.',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate beauty plan.',
      error: error.message,
    });
  }
});

router.post('/plan', authenticate, async (req, res) => {
  try {
    const payload = req.body || {};
    const validation = validateBeautyPayload(payload);
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const safety = payload.safety || {};
    const warnings = buildSafetyWarnings(safety);
    const signals = normalizeSelfieSignals(payload.selfieSignals || {});
    const score = scoreFromSignals(signals);

    const selectedConcerns = normalizeArray(payload.selectedConcerns || []);
    const concern = normalizeText(payload.concern || selectedConcerns[0] || 'General care');
    const eventType = normalizeText(payload.eventType || 'daily-glow');
    const skinType = detectSkinType(payload.skinType, concern);
    const hairType = normalizeText(payload.hairType || 'normal');
    const routines = buildRoutines({
      concern,
      preference: payload.preference || 'balanced',
    });
    const products = pickProducts(normalizeLower(payload.budget || 'medium'));
    const structuredPlan = generateStructuredBeautyPlan({
      skinType,
      hairType,
      selectedConcerns,
      budget: payload.budget,
      language: payload.language,
      eventType,
      safety,
      signals,
    });

    return res.json({
      success: true,
      prompt: buildBeautyPrompt(payload),
      analysis: {
        skinType,
        skinScore: score,
        concern,
        selfieSignals: signals,
        severeConcernDetected:
          concern.toLowerCase().includes('infection') ||
          concern.toLowerCase().includes('burn') ||
          concern.toLowerCase().includes('allergy'),
      },
      plan: {
        title: payload.language === 'ml' ? 'സുരക്ഷിത ബ്യൂട്ടി പ്ലാൻ' : 'Safe Beauty Plan',
        score,
        summary:
          payload.language === 'ml'
            ? 'ഇത് പൊതുവായ skincare guidance ആണ്. ഗുരുതര പ്രശ്നങ്ങൾക്ക് ഡെർമറ്റോളജിസ്റ്റിനെ സമീപിക്കുക.'
            : 'This is general skincare guidance. Consult a dermatologist for severe concerns.',
        morning: structuredPlan.morning.length ? structuredPlan.morning : routines.morningRoutine,
        night: structuredPlan.night.length ? structuredPlan.night : routines.nightRoutine,
        hair: structuredPlan.hair,
        avoid: [
          'Do not use steroid creams without dermatologist advice.',
          'Avoid bleaching creams and unknown fairness products.',
          ...warnings.map((item) => `Safety: ${item}`),
        ],
        products: structuredPlan.products.length ? structuredPlan.products : products,
        eventPlan: structuredPlan.eventPlan.length ? structuredPlan.eventPlan : eventPlanAddons(eventType),
      },
      warnings,
      bookingHooks: {
        salonModule: 'localservices',
        productModule: 'localmarket',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate safety-first beauty plan.',
      error: error.message,
    });
  }
});

router.get('/products/recommendations', authenticate, async (req, res) => {
  const budget = normalizeLower(req.query.budget || 'medium');
  const concern = normalizeText(req.query.concern || 'General care');
  const tier = budget === 'low' || budget === 'high' ? budget : 'medium';

  return res.json({
    success: true,
    budget: tier,
    concern,
    products: pickProducts(tier),
  });
});

router.post('/plans', authenticate, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const {
      gender = '',
      age = null,
      skinType = '',
      hairType = '',
      budget = 'medium',
      language = 'en',
      selectedConcerns = [],
      photoUrl = '',
      photoName = '',
      plan = null,
      eventType = 'daily-glow',
      safety = {},
      selfieSignals = {},
    } = req.body || {};

    const generatedPlan =
      plan && typeof plan === 'object'
        ? {
            title: normalizeText(plan.title || ''),
            score: Number(plan.score || 0),
            morning: normalizeArray(plan.morning || []),
            night: normalizeArray(plan.night || []),
            hair: normalizeArray(plan.hair || []),
            products: normalizeArray(plan.products || []),
            avoid: normalizeArray(plan.avoid || []),
            eventPlan: normalizeArray(plan.eventPlan || []),
          }
        : generateStructuredBeautyPlan({
            skinType,
            hairType,
            selectedConcerns,
            budget,
            language,
            eventType,
            safety,
            signals: selfieSignals,
          });

    const savedPlan = await BeautyPlan.create({
      userId,
      gender: normalizeText(gender),
      age: Number.isFinite(Number(age)) ? Number(age) : undefined,
      skinType: normalizeText(skinType),
      hairType: normalizeText(hairType),
      budget: normalizeText(budget),
      language: normalizeLower(language || 'en'),
      selectedConcerns: normalizeArray(selectedConcerns),
      photoUrl: normalizeText(photoUrl),
      photoName: normalizeText(photoName),
      plan: generatedPlan,
      status: 'Active',
    });

    return res.status(201).json({
      success: true,
      data: savedPlan,
      message: 'Beauty plan created',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to create beauty plan',
      error: error.message,
    });
  }
});

router.get('/plans/my', authenticate, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const plans = await BeautyPlan.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to load beauty plans',
      error: error.message,
    });
  }
});

router.put('/plans/:id/archive', authenticate, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const plan = await BeautyPlan.findOneAndUpdate(
      { _id: req.params.id, userId },
      { status: 'Archived' },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    return res.json({
      success: true,
      data: plan,
      message: 'Beauty plan archived',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to archive beauty plan',
      error: error.message,
    });
  }
});

router.post('/progress-log', authenticate, async (req, res) => {
  try {
    const userKey = getUserKey(req);
    const day = Number(req.body.day || 0);
    const done = Boolean(req.body.done);
    const note = normalizeText(req.body.note || '');
    const skinScore = Number(req.body.skinScore || 0);
    const selfieSnapshotLabel = normalizeText(req.body.selfieSnapshotLabel || '');

    if (!day || day < 1 || day > 30) {
      return res.status(400).json({
        success: false,
        message: 'day must be between 1 and 30.',
      });
    }

    const data = await readData();
    const existingIndex = data.progressLogs.findIndex(
      (item) => item.userKey === userKey && Number(item.day) === day
    );

    const entry = {
      userKey,
      day,
      done,
      note,
      skinScore: Number.isFinite(skinScore) ? skinScore : 0,
      selfieSnapshotLabel,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      data.progressLogs[existingIndex] = entry;
    } else {
      data.progressLogs.push(entry);
    }

    await writeData(data);

    return res.status(201).json({
      success: true,
      entry,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to save progress log.',
      error: error.message,
    });
  }
});

router.get('/progress-log/mine', authenticate, async (req, res) => {
  try {
    const userKey = getUserKey(req);
    const data = await readData();
    const logs = data.progressLogs
      .filter((item) => item.userKey === userKey)
      .sort((a, b) => Number(a.day) - Number(b.day));

    const completedCount = logs.filter((item) => item.done).length;

    return res.json({
      success: true,
      logs,
      summary: {
        completedCount,
        totalLoggedDays: logs.length,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch progress logs.',
      error: error.message,
    });
  }
});

router.post('/admin/tip-library', authenticate, verifyAdmin, async (req, res) => {
  try {
    const title = normalizeText(req.body.title);
    const text = normalizeText(req.body.text);
    const category = normalizeText(req.body.category || 'general');
    const language = normalizeLower(req.body.language || 'en');

    if (!title || !text) {
      return res.status(400).json({
        success: false,
        message: 'title and text are required.',
      });
    }

    const data = await readData();
    const tip = {
      id: `tip-${Date.now()}`,
      title,
      text,
      category,
      language,
      status: 'published',
      createdAt: new Date().toISOString(),
      createdBy: normalizeLower(req.user?.email || req.user?.id || 'admin'),
    };

    data.tips.unshift(tip);
    await writeData(data);

    return res.status(201).json({
      success: true,
      tip,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to add tip.',
      error: error.message,
    });
  }
});

router.put('/admin/subscription-rules', authenticate, verifyAdmin, async (req, res) => {
  try {
    const free = req.body?.free || {};
    const premium = req.body?.premium || {};

    const nextRules = {
      free: {
        dailyAnalysisLimit: Number(free.dailyAnalysisLimit || DEFAULT_SUBSCRIPTION_RULES.free.dailyAnalysisLimit),
        weeklyPlanLengthDays: Number(
          free.weeklyPlanLengthDays || DEFAULT_SUBSCRIPTION_RULES.free.weeklyPlanLengthDays
        ),
        allowPremiumReport: Boolean(free.allowPremiumReport),
        allowDermatologistReferral: Boolean(free.allowDermatologistReferral),
      },
      premium: {
        dailyAnalysisLimit: Number(
          premium.dailyAnalysisLimit || DEFAULT_SUBSCRIPTION_RULES.premium.dailyAnalysisLimit
        ),
        weeklyPlanLengthDays: Number(
          premium.weeklyPlanLengthDays || DEFAULT_SUBSCRIPTION_RULES.premium.weeklyPlanLengthDays
        ),
        allowPremiumReport: Boolean(
          premium.allowPremiumReport !== undefined
            ? premium.allowPremiumReport
            : DEFAULT_SUBSCRIPTION_RULES.premium.allowPremiumReport
        ),
        allowDermatologistReferral: Boolean(
          premium.allowDermatologistReferral !== undefined
            ? premium.allowDermatologistReferral
            : DEFAULT_SUBSCRIPTION_RULES.premium.allowDermatologistReferral
        ),
      },
    };

    const data = await readData();
    data.subscriptionRules = nextRules;
    await writeData(data);

    return res.json({
      success: true,
      subscriptionRules: nextRules,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update subscription rules.',
      error: error.message,
    });
  }
});

router.get('/admin/subscription-rules', authenticate, verifyAdmin, async (_req, res) => {
  try {
    const data = await readData();
    return res.json({
      success: true,
      subscriptionRules: data.subscriptionRules || DEFAULT_SUBSCRIPTION_RULES,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load subscription rules.',
      error: error.message,
    });
  }
});

module.exports = router;
