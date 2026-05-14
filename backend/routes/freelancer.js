const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const FreelancerProvider = require('../models/FreelancerProvider');
const FreelancerJob = require('../models/FreelancerJob');
const FreelancerBid = require('../models/FreelancerBid');
const FreelancerBooking = require('../models/FreelancerBooking');
const FreelancerDispute = require('../models/FreelancerDispute');
const FreelancerPlanPurchase = require('../models/FreelancerPlanPurchase');
const FreelancerCommissionConfig = require('../models/FreelancerCommissionConfig');
const FreelancerReport = require('../models/FreelancerReport');
const logger = require('../utils/logger');

const router = express.Router();

// ============ RATE LIMITING FOR SENSITIVE ENDPOINTS ============
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  message: 'Too many booking requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 payment operations per 15 minutes
  message: 'Too many payment operations. Please try again later.',
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 OTP attempts per minute
  message: 'Too many OTP requests. Please try again later.',
  skipSuccessfulRequests: true,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100, // 100 requests per minute
  message: 'Too many requests. Please try again later.',
});

const DISTRICTS = ['Kollam', 'Trivandrum', 'Alappuzha', 'Kottayam', 'Pathanamthitta'];
const LANGUAGES = ['English', 'Malayalam', 'Tamil'];
const DIGITAL_CATEGORIES = [
  'Developers',
  'UI/UX Designers',
  'Video Editors',
  'SEO Experts',
  'Digital Marketing',
  'Content Writers',
  'AI Automation Experts',
  'Accountants',
  'GST Consultants',
];
const LOCAL_CATEGORIES = [
  'Electricians',
  'Plumbers',
  'AC Technicians',
  'Carpenters',
  'Painters',
  'Home Cleaning',
  'Drivers',
  'Tutors',
  'Nurses',
  'Beauticians',
];

const VERIFICATION_TYPES = [
  'Mobile OTP',
  'Email verification',
  'Aadhaar/PAN check',
  'GST verification',
  'Selfie verification',
  'Trade license verification',
  'Police verification',
  'Background verification',
];

const SUBSCRIPTION_PLANS = [
  { id: 'basic', name: 'Basic', price: 0, durationDays: 30, note: 'Entry-level visibility' },
  { id: 'pro', name: 'Pro', price: 799, durationDays: 30, note: 'More leads and better discovery' },
  {
    id: 'premium',
    name: 'Premium',
    price: 1999,
    durationDays: 30,
    note: 'Top placement + analytics + priority support',
  },
];

const EMERGENCY_SERVICES = [
  'Emergency electrician',
  'Water leakage support',
  'AC breakdown support',
  'Urgent accountant filing',
];

const ALL_CATEGORIES = [...DIGITAL_CATEGORIES, ...LOCAL_CATEGORIES];

const uploadsRoot = path.join(__dirname, '../uploads/freelancer');
const uploadsAttachments = path.join(uploadsRoot, 'attachments');
const uploadsProofs = path.join(uploadsRoot, 'proofs');
const uploadsKyc = path.join(uploadsRoot, 'kyc');
[uploadsRoot, uploadsAttachments, uploadsProofs, uploadsKyc].forEach((target) => {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
});

const createDiskUploader = (destinationDir) =>
  multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, destinationDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'video/mp4',
      ];
      const extAllowed = /\.(pdf|jpe?g|png|webp|mp4)$/i.test(file.originalname || '');
      if (allowed.includes(file.mimetype) || extAllowed) {
        cb(null, true);
        return;
      }
      cb(new Error('Unsupported file format.'));
    },
  });

const attachmentUpload = createDiskUploader(uploadsAttachments);
const disputeProofUpload = createDiskUploader(uploadsProofs);
const kycUpload = createDiskUploader(uploadsKyc);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const maskPhone = (phone = '') => {
  const cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.length < 4) return '******';
  return `******${cleaned.slice(-4)}`;
};

const buildCode = (prefix) => `${prefix}-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

const getPlanById = (planId) => SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);

const defaultProviders = [
  {
    providerCode: 'FRP-101',
    name: 'Akhil Dev Studio',
    category: 'Developers',
    type: 'digital',
    district: 'Trivandrum',
    serviceAreas: ['Trivandrum', 'Kollam'],
    language: 'English',
    languages: ['English', 'Malayalam'],
    budget: 'premium',
    availability: 'online-now',
    verified: true,
    responseMinutes: 12,
    verificationBadges: ['Verified', 'Top Rated'],
    hourlyRate: 1200,
    gigStartsFrom: 15000,
    completionRate: 96,
    responseRate: 98,
    experience: 6,
    rating: 4.9,
    reviewCount: 22,
    about: 'Full-stack product development for web and mobile.',
    contactPhone: '9887001234',
    contactEmail: 'akhil@devstudio.in',
    kycStatus: 'approved',
    plans: {
      currentPlanId: 'premium',
      currentPlanName: 'Premium',
      sponsoredListing: true,
    },
    leadCredits: 24,
  },
  {
    providerCode: 'FRP-102',
    name: 'Nila Tax Assist',
    category: 'GST Consultants',
    type: 'digital',
    district: 'Kollam',
    serviceAreas: ['Kollam', 'Alappuzha'],
    language: 'Malayalam',
    languages: ['Malayalam', 'English'],
    budget: 'medium',
    availability: 'schedule',
    verified: true,
    responseMinutes: 24,
    verificationBadges: ['Verified', 'Trusted Expert'],
    hourlyRate: 900,
    gigStartsFrom: 2500,
    completionRate: 94,
    responseRate: 95,
    experience: 9,
    rating: 4.7,
    reviewCount: 17,
    about: 'GST filing, business compliance and accounting workflows.',
    contactPhone: '9887002234',
    contactEmail: 'tax@nilataxassist.in',
    kycStatus: 'approved',
    plans: {
      currentPlanId: 'pro',
      currentPlanName: 'Pro',
    },
    leadCredits: 12,
  },
  {
    providerCode: 'FRP-103',
    name: 'QuickFix Electrical Team',
    category: 'Electricians',
    type: 'local',
    district: 'Kottayam',
    serviceAreas: ['Kottayam', 'Pathanamthitta'],
    language: 'Malayalam',
    languages: ['Malayalam'],
    budget: 'medium',
    availability: 'instant',
    verified: true,
    responseMinutes: 8,
    verificationBadges: ['Verified', 'Premium'],
    hourlyRate: 700,
    gigStartsFrom: 999,
    completionRate: 97,
    responseRate: 99,
    experience: 7,
    rating: 4.8,
    reviewCount: 29,
    about: 'On-site electrical support with emergency turnaround.',
    contactPhone: '9887003234',
    contactEmail: 'quickfix@electrical.in',
    kycStatus: 'approved',
    plans: {
      currentPlanId: 'pro',
      currentPlanName: 'Pro',
    },
    leadCredits: 14,
  },
  {
    providerCode: 'FRP-104',
    name: 'CareBridge Nurses',
    category: 'Nurses',
    type: 'local',
    district: 'Pathanamthitta',
    serviceAreas: ['Pathanamthitta', 'Kollam'],
    language: 'Tamil',
    languages: ['Tamil', 'Malayalam'],
    budget: 'budget',
    availability: 'schedule',
    verified: true,
    responseMinutes: 30,
    verificationBadges: ['Verified'],
    hourlyRate: 650,
    gigStartsFrom: 1800,
    completionRate: 92,
    responseRate: 93,
    experience: 5,
    rating: 4.6,
    reviewCount: 13,
    about: 'Home nursing services with shift-based options.',
    contactPhone: '9887004234',
    contactEmail: 'care@bridgecare.in',
    kycStatus: 'approved',
    leadCredits: 8,
  },
];

const ensureSeedData = async () => {
  const providerCount = await FreelancerProvider.countDocuments();
  if (providerCount === 0) {
    await FreelancerProvider.insertMany(defaultProviders);
  }

  const config = await FreelancerCommissionConfig.findOne({ configKey: 'default' });
  if (!config) {
    await FreelancerCommissionConfig.create({
      configKey: 'default',
      commissionType: 'percentage',
      commissionValue: 12,
      sponsoredListingFee: 5000,
      leadPurchaseFee: 300,
      cancellationPenaltyPercent: 10,
      refundWindowHours: 24,
    });
  }
};

const recalculateProviderRating = async (providerId) => {
  const provider = await FreelancerProvider.findById(providerId);
  if (!provider) return null;
  const reviews = provider.reviews || [];
  const rating = reviews.length
    ? reviews.reduce((sum, review) => sum + toNumber(review.rating), 0) / reviews.length
    : provider.rating || 0;
  provider.reviewCount = reviews.length;
  provider.rating = Number(rating.toFixed(2));
  await provider.save();
  return provider;
};

// ============ TRANSACTION LOGGING ============
const logTransaction = (transactionType, details) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type: transactionType,
    details,
  };
  logger.info(`[FREELANCER TRANSACTION] ${transactionType}`, logEntry);
};

const logPaymentEvent = (bookingCode, event, amount, status) => {
  logTransaction('PAYMENT_EVENT', {
    bookingCode,
    event,
    amount,
    status,
  });
};

const logBookingEvent = (bookingCode, event, status) => {
  logTransaction('BOOKING_EVENT', {
    bookingCode,
    event,
    status,
  });
};

const logDisputeEvent = (disputeCode, event, status) => {
  logTransaction('DISPUTE_EVENT', {
    disputeCode,
    event,
    status,
  });
};

const providerOnboardingSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  category: Joi.string().valid(...ALL_CATEGORIES).required(),
  type: Joi.string().valid('digital', 'local').required(),
  district: Joi.string().valid(...DISTRICTS).required(),
  serviceAreas: Joi.array().items(Joi.string().valid(...DISTRICTS)).min(1).required(),
  language: Joi.string().valid(...LANGUAGES).required(),
  languages: Joi.array().items(Joi.string().valid(...LANGUAGES)).min(1).required(),
  budget: Joi.string().valid('budget', 'medium', 'premium').required(),
  availability: Joi.string().valid('online-now', 'instant', 'schedule').required(),
  experience: Joi.number().integer().min(0).required(),
  responseMinutes: Joi.number().integer().min(1).required(),
  hourlyRate: Joi.number().min(0).required(),
  gigStartsFrom: Joi.number().min(0).required(),
  about: Joi.string().trim().allow('').default(''),
  contactPhone: Joi.string().pattern(/^\d{10}$/).required(),
  contactEmail: Joi.string().email().required(),
});

const reviewSchema = Joi.object({
  reviewerName: Joi.string().trim().min(2).max(80).required(),
  reviewerPhone: Joi.string().pattern(/^\d{10}$/).required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().trim().allow('').max(500).default(''),
});

const jobCreateSchema = Joi.object({
  title: Joi.string().trim().min(8).max(140).required(),
  category: Joi.string().valid(...ALL_CATEGORIES).required(),
  location: Joi.string().valid(...DISTRICTS).required(),
  requirements: Joi.string().trim().min(15).max(4000).required(),
  serviceType: Joi.string().valid('digital', 'local').required(),
  urgency: Joi.string().valid('low', 'medium', 'high', 'emergency').required(),
  minBudget: Joi.number().min(1).required(),
  maxBudget: Joi.number().min(1).required(),
  deadline: Joi.date().iso().required(),
  customerName: Joi.string().trim().min(2).max(80).required(),
  customerPhone: Joi.string().pattern(/^\d{10}$/).required(),
});

const bidCreateSchema = Joi.object({
  providerId: Joi.string().required(),
  amount: Joi.number().min(1).required(),
  timelineDays: Joi.number().integer().min(1).required(),
  coverLetter: Joi.string().trim().min(10).max(2000).required(),
});

const bookingCreateSchema = Joi.object({
  providerId: Joi.string().required(),
  customerName: Joi.string().trim().min(2).max(80).required(),
  customerPhone: Joi.string().pattern(/^\d{10}$/).required(),
  serviceMode: Joi.string().valid('gig', 'hourly').required(),
  bookingMode: Joi.string().valid('instant', 'schedule', 'quotation', 'bidding').required(),
  schedule: Joi.string().trim().allow('').default(''),
  notes: Joi.string().trim().allow('').default(''),
  emergency: Joi.boolean().default(false),
  totalAmount: Joi.number().min(0).default(0),
});

const bookingStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      'requested',
      'provider_assigned',
      'awaiting_payment',
      'payment_in_escrow',
      'otp_pending',
      'work_in_progress',
      'completed',
      'cancelled',
      'disputed'
    )
    .required(),
  note: Joi.string().trim().allow('').default(''),
  changedBy: Joi.string().trim().default('system'),
});

const paymentInitSchema = Joi.object({
  totalAmount: Joi.number().min(1).required(),
  milestones: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().trim().min(2).max(120).required(),
        amount: Joi.number().min(0).required(),
      })
    )
    .min(1)
    .required(),
});

const cancellationSchema = Joi.object({
  requestedBy: Joi.string().valid('customer', 'provider', 'admin').required(),
  reason: Joi.string().trim().min(5).max(500).required(),
});

const refundSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(500).required(),
});

const disputeCreateSchema = Joi.object({
  raisedByRole: Joi.string().valid('customer', 'provider', 'admin').required(),
  raisedByName: Joi.string().trim().min(2).max(80).required(),
  raisedAgainstRole: Joi.string().valid('customer', 'provider', 'platform').required(),
  reason: Joi.string().trim().min(5).max(240).required(),
  details: Joi.string().trim().allow('').max(3000).default(''),
});

const disputeResolveSchema = Joi.object({
  status: Joi.string().valid('resolved', 'rejected', 'under-review').required(),
  action: Joi.string().trim().min(2).max(120).required(),
  note: Joi.string().trim().allow('').max(1000).default(''),
  resolvedBy: Joi.string().trim().min(2).max(80).required(),
});

const planPurchaseSchema = Joi.object({
  providerId: Joi.string().required(),
  planId: Joi.string().valid(...SUBSCRIPTION_PLANS.map((plan) => plan.id)).required(),
  paymentReference: Joi.string().trim().allow('').default(''),
});

const leadPurchaseSchema = Joi.object({
  providerId: Joi.string().required(),
});

const reportSchema = Joi.object({
  targetType: Joi.string().valid('provider', 'customer', 'job', 'booking').required(),
  targetId: Joi.string().trim().required(),
  reportedByName: Joi.string().trim().min(2).max(80).required(),
  reportedByPhone: Joi.string().pattern(/^\d{10}$/).required(),
  reason: Joi.string().trim().min(5).max(300).required(),
  details: Joi.string().trim().allow('').max(2000).default(''),
});

const quoteSchema = Joi.object({
  category: Joi.string().valid(...ALL_CATEGORIES).required(),
  scope: Joi.string().trim().min(10).max(3000).required(),
  budget: Joi.number().min(0).required(),
  urgency: Joi.string().valid('low', 'medium', 'high', 'emergency').required(),
  location: Joi.string().valid(...DISTRICTS).required(),
  skillLevel: Joi.string().valid('junior', 'mid', 'senior', 'expert').required(),
  serviceType: Joi.string().valid('digital', 'local').required(),
});

const commissionSchema = Joi.object({
  commissionType: Joi.string().valid('percentage', 'flat').required(),
  commissionValue: Joi.number().min(0).required(),
  sponsoredListingFee: Joi.number().min(0).required(),
  leadPurchaseFee: Joi.number().min(0).required(),
  cancellationPenaltyPercent: Joi.number().min(0).max(100).required(),
  refundWindowHours: Joi.number().min(0).required(),
});

router.get('/bootstrap', async (_req, res) => {
  try {
    await ensureSeedData();
    const [providerCount, jobCount, bookingCount] = await Promise.all([
      FreelancerProvider.countDocuments({ isActive: true }),
      FreelancerJob.countDocuments({ status: { $ne: 'cancelled' } }),
      FreelancerBooking.countDocuments(),
    ]);

    return res.json({
      success: true,
      data: {
        constants: {
          districts: DISTRICTS,
          languages: LANGUAGES,
          digitalCategories: DIGITAL_CATEGORIES,
          localCategories: LOCAL_CATEGORIES,
          verificationTypes: VERIFICATION_TYPES,
          subscriptionPlans: SUBSCRIPTION_PLANS,
          emergencyServices: EMERGENCY_SERVICES,
        },
        counters: { providerCount, jobCount, bookingCount },
      },
    });
  } catch (error) {
    logger.error('freelancer bootstrap error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load freelancer bootstrap data.' });
  }
});

router.get('/providers', async (req, res) => {
  try {
    await ensureSeedData();
    const {
      search = '',
      category,
      location,
      rating,
      experience,
      language,
      budget,
      availability,
      serviceType,
      verifiedOnly,
      responseSpeed,
      sortBy = 'rating',
    } = req.query;

    const query = { isActive: true };
    if (category && category !== 'all') query.category = category;
    if (location && location !== 'all') query.district = location;
    if (language && language !== 'all') query.languages = language;
    if (budget && budget !== 'all') query.budget = budget;
    if (availability && availability !== 'all') query.availability = availability;
    if (serviceType && serviceType !== 'all') query.type = serviceType;
    if (String(verifiedOnly) === 'true') query.verified = true;

    const providers = await FreelancerProvider.find(query).lean();

    const filtered = providers.filter((provider) => {
      const searchableText =
        `${provider.name} ${provider.category} ${provider.district} ${(provider.verificationBadges || []).join(' ')}`.toLowerCase();
      const matchesSearch = searchableText.includes(String(search || '').toLowerCase());

      const matchesRating =
        !rating ||
        rating === 'all' ||
        (rating === '4.5+' && provider.rating >= 4.5) ||
        (rating === '4.8+' && provider.rating >= 4.8);

      const matchesExperience =
        !experience ||
        experience === 'all' ||
        (experience === '1-3' && provider.experience >= 1 && provider.experience <= 3) ||
        (experience === '4-7' && provider.experience >= 4 && provider.experience <= 7) ||
        (experience === '8+' && provider.experience >= 8);

      const matchesResponse =
        !responseSpeed ||
        responseSpeed === 'all' ||
        (responseSpeed === 'under-15' && provider.responseMinutes <= 15) ||
        (responseSpeed === 'under-30' && provider.responseMinutes <= 30);

      return matchesSearch && matchesRating && matchesExperience && matchesResponse;
    });

    const sorted = [...filtered].sort((left, right) => {
      if (sortBy === 'price-low') return left.hourlyRate - right.hourlyRate;
      if (sortBy === 'price-high') return right.hourlyRate - left.hourlyRate;
      if (sortBy === 'response') return left.responseMinutes - right.responseMinutes;
      return right.rating - left.rating;
    });

    return res.json({
      success: true,
      data: { providers: sorted },
    });
  } catch (error) {
    logger.error('freelancer providers fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch providers.' });
  }
});

router.get('/providers/:providerId', async (req, res) => {
  try {
    const provider = await FreelancerProvider.findById(req.params.providerId).lean();
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }
    return res.json({ success: true, data: { provider } });
  } catch (error) {
    logger.error('freelancer provider detail error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch provider profile.' });
  }
});

router.post('/providers/onboard', kycUpload.array('kycFiles', 8), async (req, res) => {
  try {
    const normalized = { ...req.body };
    if (typeof normalized.serviceAreas === 'string') {
      try {
        normalized.serviceAreas = JSON.parse(normalized.serviceAreas);
      } catch (_error) {
        normalized.serviceAreas = [];
      }
    }
    if (typeof normalized.languages === 'string') {
      try {
        normalized.languages = JSON.parse(normalized.languages);
      } catch (_error) {
        normalized.languages = [];
      }
    }

    const { error, value } = providerOnboardingSchema.validate(normalized, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const provider = await FreelancerProvider.create({
      providerCode: buildCode('FRP'),
      name: value.name,
      category: value.category,
      type: value.type,
      district: value.district,
      serviceAreas: value.serviceAreas,
      language: value.language,
      languages: value.languages,
      budget: value.budget,
      availability: value.availability,
      experience: value.experience,
      responseMinutes: value.responseMinutes,
      hourlyRate: value.hourlyRate,
      gigStartsFrom: value.gigStartsFrom,
      about: value.about,
      contactPhone: value.contactPhone,
      contactEmail: value.contactEmail,
      kycStatus: 'pending',
      verificationBadges: ['KYC Pending'],
      leadCredits: 5,
      reviews: [],
      portfolio: [],
    });

    return res.status(201).json({
      success: true,
      message: 'Provider onboarding submitted. KYC review is pending.',
      data: { provider },
    });
  } catch (error) {
    logger.error('freelancer provider onboarding error:', error);
    return res.status(500).json({ success: false, message: 'Unable to onboard provider.' });
  }
});

router.patch('/providers/:providerId/kyc', async (req, res) => {
  try {
    const status = String(req.body.status || '').trim();
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid KYC status.' });
    }
    const provider = await FreelancerProvider.findById(req.params.providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }
    provider.kycStatus = status;
    provider.verified = status === 'approved';
    provider.verificationBadges = status === 'approved' ? ['Verified', 'KYC Approved'] : ['KYC Pending'];
    await provider.save();
    return res.json({ success: true, data: { provider } });
  } catch (error) {
    logger.error('freelancer kyc update error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update KYC status.' });
  }
});

router.post('/providers/:providerId/reviews', async (req, res) => {
  try {
    const { error, value } = reviewSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const provider = await FreelancerProvider.findById(req.params.providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    provider.reviews.push(value);
    await provider.save();
    const refreshed = await recalculateProviderRating(provider._id);
    return res.status(201).json({ success: true, data: { provider: refreshed } });
  } catch (error) {
    logger.error('freelancer review create error:', error);
    return res.status(500).json({ success: false, message: 'Unable to add review.' });
  }
});

router.post('/providers/:providerId/sponsored', async (req, res) => {
  try {
    const durationDays = Math.max(1, toNumber(req.body.durationDays, 30));
    const provider = await FreelancerProvider.findById(req.params.providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }
    const sponsoredUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    provider.plans.sponsoredListing = true;
    provider.plans.expiresAt = sponsoredUntil;
    await provider.save();
    return res.json({
      success: true,
      message: `Sponsored listing enabled for ${durationDays} days.`,
      data: { provider },
    });
  } catch (error) {
    logger.error('freelancer sponsored update error:', error);
    return res.status(500).json({ success: false, message: 'Unable to enable sponsored listing.' });
  }
});

router.post('/jobs', attachmentUpload.array('attachments', 8), async (req, res) => {
  try {
    const normalized = {
      ...req.body,
      minBudget: toNumber(req.body.minBudget),
      maxBudget: toNumber(req.body.maxBudget),
    };

    const { error, value } = jobCreateSchema.validate(normalized, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    if (value.maxBudget < value.minBudget) {
      return res.status(400).json({ success: false, message: 'Max budget should be greater than min budget.' });
    }
    if (new Date(value.deadline).getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: 'Deadline should be in the future.' });
    }

    const attachments = (req.files || []).map((file) => ({
      originalName: file.originalname,
      filename: file.filename,
      path: `/uploads/freelancer/attachments/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
    }));

    const job = await FreelancerJob.create({
      jobCode: buildCode('FRJ'),
      title: value.title,
      category: value.category,
      location: value.location,
      requirements: value.requirements,
      serviceType: value.serviceType,
      urgency: value.urgency,
      minBudget: value.minBudget,
      maxBudget: value.maxBudget,
      deadline: new Date(value.deadline),
      attachments,
      createdBy: {
        customerName: value.customerName,
        customerPhone: value.customerPhone,
        maskedPhone: maskPhone(value.customerPhone),
      },
      status: 'open',
      bidCount: 0,
    });

    return res.status(201).json({ success: true, data: { job } });
  } catch (error) {
    logger.error('freelancer job create error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create job post.' });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const { category, location, status = 'open' } = req.query;
    const query = {};
    if (category && category !== 'all') query.category = category;
    if (location && location !== 'all') query.location = location;
    if (status && status !== 'all') query.status = status;

    const jobs = await FreelancerJob.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: { jobs } });
  } catch (error) {
    logger.error('freelancer jobs fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch jobs.' });
  }
});

router.post('/jobs/:jobId/bids', async (req, res) => {
  try {
    const { error, value } = bidCreateSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const [job, provider] = await Promise.all([
      FreelancerJob.findById(req.params.jobId),
      FreelancerProvider.findById(value.providerId),
    ]);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    const bid = await FreelancerBid.create({
      bidCode: buildCode('FRB'),
      jobId: job._id,
      jobCode: job.jobCode,
      providerId: provider._id,
      providerName: provider.name,
      amount: value.amount,
      timelineDays: value.timelineDays,
      coverLetter: value.coverLetter,
      status: 'submitted',
    });

    job.bidCount += 1;
    await job.save();

    return res.status(201).json({ success: true, data: { bid } });
  } catch (error) {
    logger.error('freelancer bid create error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create bid.' });
  }
});

router.get('/jobs/:jobId/bids', async (req, res) => {
  try {
    const bids = await FreelancerBid.find({ jobId: req.params.jobId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: { bids } });
  } catch (error) {
    logger.error('freelancer bids fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch bids.' });
  }
});

router.post('/jobs/:jobId/lead-purchase', async (req, res) => {
  try {
    const { error, value } = leadPurchaseSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const [job, provider, commission] = await Promise.all([
      FreelancerJob.findById(req.params.jobId),
      FreelancerProvider.findById(value.providerId),
      FreelancerCommissionConfig.findOne({ configKey: 'default' }),
    ]);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found.' });

    const leadFee = toNumber(commission?.leadPurchaseFee, 300);
    provider.leadPurchaseHistory.push({
      jobId: job.jobCode,
      amount: leadFee,
      purchasedAt: new Date(),
    });
    await provider.save();

    job.leadPurchases.push({
      providerId: provider._id,
      amount: leadFee,
      purchasedAt: new Date(),
    });
    await job.save();

    return res.status(201).json({
      success: true,
      message: `Lead purchased for ${job.jobCode}.`,
      data: { leadFee, jobCode: job.jobCode, providerName: provider.name },
    });
  } catch (error) {
    logger.error('freelancer lead purchase error:', error);
    return res.status(500).json({ success: false, message: 'Unable to purchase lead.' });
  }
});

router.post('/bookings', bookingLimiter, async (req, res) => {
  try {
    const { error, value } = bookingCreateSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const provider = await FreelancerProvider.findById(value.providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    const initialStatus = value.bookingMode === 'instant' ? 'provider_assigned' : 'requested';
    const booking = await FreelancerBooking.create({
      bookingCode: buildCode('FRK'),
      providerId: provider._id,
      providerName: provider.name,
      customer: {
        name: value.customerName,
        phone: value.customerPhone,
        maskedPhone: maskPhone(value.customerPhone),
      },
      serviceMode: value.serviceMode,
      bookingMode: value.bookingMode,
      schedule: value.schedule,
      notes: value.notes,
      emergency: value.emergency,
      status: initialStatus,
      providerAssignment: {
        assigned: value.bookingMode === 'instant',
        assignedAt: value.bookingMode === 'instant' ? new Date() : null,
        assignedBy: value.bookingMode === 'instant' ? 'system-auto' : '',
      },
      payment: {
        totalAmount: value.totalAmount,
        escrowAmount: 0,
        status: 'pending',
        milestones: [],
      },
      statusTimeline: [
        {
          status: initialStatus,
          note: value.emergency ? 'Emergency booking request raised.' : 'Booking created.',
          changedBy: 'customer',
          changedAt: new Date(),
        },
      ],
    });

    logBookingEvent(booking.bookingCode, 'CREATED', booking.status);

    return res.status(201).json({ success: true, data: { booking } });
  } catch (error) {
    logger.error('freelancer booking create error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create booking.' });
  }
});

router.get('/bookings', async (req, res) => {
  try {
    const { phone, providerId, status } = req.query;
    const query = {};
    if (phone) query['customer.phone'] = phone;
    if (providerId) query.providerId = providerId;
    if (status && status !== 'all') query.status = status;

    const bookings = await FreelancerBooking.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: { bookings } });
  } catch (error) {
    logger.error('freelancer booking fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch bookings.' });
  }
});

router.patch('/bookings/:bookingCode/assign', async (req, res) => {
  try {
    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    booking.providerAssignment.assigned = true;
    booking.providerAssignment.assignedAt = new Date();
    booking.providerAssignment.assignedBy = String(req.body.assignedBy || 'consultant');
    booking.status = 'provider_assigned';
    booking.statusTimeline.push({
      status: 'provider_assigned',
      note: 'Provider assigned to booking.',
      changedBy: String(req.body.assignedBy || 'consultant'),
      changedAt: new Date(),
    });
    await booking.save();
    return res.json({ success: true, data: { booking } });
  } catch (error) {
    logger.error('freelancer booking assign error:', error);
    return res.status(500).json({ success: false, message: 'Unable to assign provider.' });
  }
});

router.patch('/bookings/:bookingCode/status', async (req, res) => {
  try {
    const { error, value } = bookingStatusSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    booking.status = value.status;
    booking.statusTimeline.push({
      status: value.status,
      note: value.note,
      changedBy: value.changedBy,
      changedAt: new Date(),
    });
    await booking.save();
    return res.json({ success: true, data: { booking } });
  } catch (error) {
    logger.error('freelancer booking status update error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update booking status.' });
  }
});

router.post('/bookings/:bookingCode/otp/send', otpLimiter, async (req, res) => {
  try {
    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    booking.otpVerification.otpCode = otp;
    booking.otpVerification.generatedAt = new Date();
    booking.otpVerification.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    booking.otpVerification.verified = false;
    booking.status = 'otp_pending';
    booking.statusTimeline.push({
      status: 'otp_pending',
      note: 'OTP generated for work-start verification.',
      changedBy: 'system',
      changedAt: new Date(),
    });
    await booking.save();

    return res.json({
      success: true,
      message: 'OTP generated for booking start verification.',
      data: {
        bookingCode: booking.bookingCode,
        expiresAt: booking.otpVerification.expiresAt,
        ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
      },
    });
  } catch (error) {
    logger.error('freelancer booking otp send error:', error);
    return res.status(500).json({ success: false, message: 'Unable to generate OTP.' });
  }
});

router.post('/bookings/:bookingCode/otp/verify', otpLimiter, async (req, res) => {
  try {
    const otp = String(req.body.otp || '').trim();
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 6 digit OTP.' });
    }
    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (!booking.otpVerification.otpCode) {
      return res.status(400).json({ success: false, message: 'OTP not generated for this booking.' });
    }
    if (booking.otpVerification.expiresAt && booking.otpVerification.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new OTP.' });
    }
    if (booking.otpVerification.otpCode !== otp) {
      return res.status(400).json({ success: false, message: 'OTP verification failed.' });
    }

    booking.otpVerification.verified = true;
    booking.otpVerification.verifiedAt = new Date();
    booking.status = 'work_in_progress';
    booking.statusTimeline.push({
      status: 'work_in_progress',
      note: 'OTP verified and work started.',
      changedBy: 'customer',
      changedAt: new Date(),
    });
    await booking.save();
    return res.json({ success: true, data: { booking } });
  } catch (error) {
    logger.error('freelancer booking otp verify error:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify OTP.' });
  }
});

router.post('/bookings/:bookingCode/payments/initialize', paymentLimiter, async (req, res) => {
  try {
    const { error, value } = paymentInitSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const milestoneTotal = value.milestones.reduce((sum, item) => sum + toNumber(item.amount), 0);
    if (Math.abs(milestoneTotal - value.totalAmount) > 1) {
      return res.status(400).json({
        success: false,
        message: 'Milestone total should match total amount.',
      });
    }

    booking.payment.totalAmount = value.totalAmount;
    booking.payment.escrowAmount = value.totalAmount;
    booking.payment.status = 'in_escrow';
    booking.payment.lastTransactionRef = buildCode('TRX');
    booking.payment.milestones = value.milestones.map((item) => ({
      title: item.title,
      amount: item.amount,
      status: 'pending',
      releasedAt: null,
    }));
    booking.status = 'payment_in_escrow';
    booking.statusTimeline.push({
      status: 'payment_in_escrow',
      note: 'Escrow payment initialized.',
      changedBy: 'customer',
      changedAt: new Date(),
    });

    await booking.save();
    logPaymentEvent(booking.bookingCode, 'ESCROW_INITIALIZED', value.totalAmount, 'in_escrow');
    return res.json({ success: true, data: { booking } });
  } catch (error) {
    logger.error('freelancer payment init error:', error);
    return res.status(500).json({ success: false, message: 'Unable to initialize escrow payment.' });
  }
});

router.post('/bookings/:bookingCode/payments/milestones/:index/release', paymentLimiter, async (req, res) => {
  try {
    const index = Number(req.params.index);
    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({ success: false, message: 'Invalid milestone index.' });
    }
    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const milestone = booking.payment.milestones[index];
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found.' });
    }
    if (milestone.status === 'released') {
      return res.status(400).json({ success: false, message: 'Milestone already released.' });
    }

    milestone.status = 'released';
    milestone.releasedAt = new Date();
    const pendingExists = booking.payment.milestones.some((item) => item.status !== 'released');
    booking.payment.status = pendingExists ? 'partial_released' : 'released';
    if (!pendingExists) {
      booking.status = 'completed';
      booking.statusTimeline.push({
        status: 'completed',
        note: 'All milestones released and booking completed.',
        changedBy: 'customer',
        changedAt: new Date(),
      });
    }
    await booking.save();
    logPaymentEvent(booking.bookingCode, `MILESTONE_${index + 1}_RELEASED`, milestone.amount, 'released');
    return res.json({ success: true, data: { booking } });
  } catch (error) {
    logger.error('freelancer milestone release error:', error);
    return res.status(500).json({ success: false, message: 'Unable to release milestone.' });
  }
});

router.post('/bookings/:bookingCode/payments/refund-request', paymentLimiter, async (req, res) => {
  try {
    const { error, value } = refundSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    booking.payment.status = 'refund_requested';
    booking.statusTimeline.push({
      status: booking.status,
      note: `Refund requested: ${value.reason}`,
      changedBy: 'customer',
      changedAt: new Date(),
    });
    await booking.save();
    return res.status(202).json({
      success: true,
      message: 'Refund request submitted and pending review.',
      data: { booking },
    });
  } catch (error) {
    logger.error('freelancer refund request error:', error);
    return res.status(500).json({ success: false, message: 'Unable to submit refund request.' });
  }
});

router.patch('/bookings/:bookingCode/cancel', async (req, res) => {
  try {
    const { error, value } = cancellationSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const [booking, commission] = await Promise.all([
      FreelancerBooking.findOne({ bookingCode: req.params.bookingCode }),
      FreelancerCommissionConfig.findOne({ configKey: 'default' }),
    ]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const penaltyPercent = toNumber(commission?.cancellationPenaltyPercent, 10);
    booking.status = 'cancelled';
    booking.cancellation.requested = true;
    booking.cancellation.requestedBy = value.requestedBy;
    booking.cancellation.reason = value.reason;
    booking.cancellation.policyApplied = `Cancellation penalty up to ${penaltyPercent}% may apply.`;
    booking.cancellation.requestedAt = new Date();
    booking.statusTimeline.push({
      status: 'cancelled',
      note: value.reason,
      changedBy: value.requestedBy,
      changedAt: new Date(),
    });
    await booking.save();
    return res.json({ success: true, data: { booking } });
  } catch (error) {
    logger.error('freelancer cancellation error:', error);
    return res.status(500).json({ success: false, message: 'Unable to cancel booking.' });
  }
});

router.post('/bookings/:bookingCode/disputes', disputeProofUpload.array('proofs', 8), async (req, res) => {
  try {
    const { error, value } = disputeCreateSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const booking = await FreelancerBooking.findOne({ bookingCode: req.params.bookingCode });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const dispute = await FreelancerDispute.create({
      disputeCode: buildCode('FRD'),
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      raisedByRole: value.raisedByRole,
      raisedByName: value.raisedByName,
      raisedAgainstRole: value.raisedAgainstRole,
      reason: value.reason,
      details: value.details,
      proofs: (req.files || []).map((file) => ({
        originalName: file.originalname,
        filename: file.filename,
        path: `/uploads/freelancer/proofs/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
      })),
      status: 'open',
    });

    booking.status = 'disputed';
    booking.statusTimeline.push({
      status: 'disputed',
      note: `Dispute opened: ${value.reason}`,
      changedBy: value.raisedByRole,
      changedAt: new Date(),
    });
    await booking.save();

    return res.status(201).json({ success: true, data: { dispute } });
  } catch (error) {
    logger.error('freelancer dispute create error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create dispute.' });
  }
});

router.get('/disputes', async (req, res) => {
  try {
    const { status = 'open' } = req.query;
    const query = status === 'all' ? {} : { status };
    const disputes = await FreelancerDispute.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: { disputes } });
  } catch (error) {
    logger.error('freelancer disputes fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch disputes.' });
  }
});

router.patch('/disputes/:disputeCode/resolve', async (req, res) => {
  try {
    const { error, value } = disputeResolveSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const dispute = await FreelancerDispute.findOne({ disputeCode: req.params.disputeCode });
    if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found.' });

    dispute.status = value.status;
    dispute.resolution.action = value.action;
    dispute.resolution.note = value.note;
    dispute.resolution.resolvedBy = value.resolvedBy;
    dispute.resolution.resolvedAt = new Date();
    await dispute.save();

    const booking = await FreelancerBooking.findById(dispute.bookingId);
    if (booking && value.status === 'resolved') {
      booking.status = 'work_in_progress';
      booking.statusTimeline.push({
        status: 'work_in_progress',
        note: `Dispute resolved: ${value.action}`,
        changedBy: value.resolvedBy,
        changedAt: new Date(),
      });
      await booking.save();
    }

    return res.json({ success: true, data: { dispute } });
  } catch (error) {
    logger.error('freelancer dispute resolve error:', error);
    return res.status(500).json({ success: false, message: 'Unable to resolve dispute.' });
  }
});

router.get('/plans', async (_req, res) => {
  return res.json({ success: true, data: { plans: SUBSCRIPTION_PLANS } });
});

router.post('/plans/purchase', async (req, res) => {
  try {
    const { error, value } = planPurchaseSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const provider = await FreelancerProvider.findById(value.providerId);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found.' });

    const selectedPlan = getPlanById(value.planId);
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + selectedPlan.durationDays * 24 * 60 * 60 * 1000);
    const purchase = await FreelancerPlanPurchase.create({
      purchaseCode: buildCode('FRP-PLAN'),
      providerId: provider._id,
      providerName: provider.name,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      amount: selectedPlan.price,
      durationDays: selectedPlan.durationDays,
      status: 'active',
      paymentStatus: selectedPlan.price > 0 ? 'paid' : 'pending',
      paymentReference: value.paymentReference,
      startsAt,
      endsAt,
    });

    provider.plans.currentPlanId = selectedPlan.id;
    provider.plans.currentPlanName = selectedPlan.name;
    provider.plans.expiresAt = endsAt;
    provider.plans.sponsoredListing = selectedPlan.id === 'premium';
    if (selectedPlan.id === 'basic') provider.leadCredits += 5;
    if (selectedPlan.id === 'pro') provider.leadCredits += 20;
    if (selectedPlan.id === 'premium') provider.leadCredits += 60;
    await provider.save();

    return res.status(201).json({ success: true, data: { purchase, provider } });
  } catch (error) {
    logger.error('freelancer plan purchase error:', error);
    return res.status(500).json({ success: false, message: 'Unable to purchase plan.' });
  }
});

router.get('/plans/purchases', async (req, res) => {
  try {
    const query = req.query.providerId ? { providerId: req.query.providerId } : {};
    const purchases = await FreelancerPlanPurchase.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: { purchases } });
  } catch (error) {
    logger.error('freelancer plan purchases fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch plan purchases.' });
  }
});

router.post('/reports', async (req, res) => {
  try {
    const { error, value } = reportSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const report = await FreelancerReport.create({
      reportCode: buildCode('FRR'),
      targetType: value.targetType,
      targetId: value.targetId,
      reportedByName: value.reportedByName,
      reportedByPhone: value.reportedByPhone,
      reason: value.reason,
      details: value.details,
      status: 'open',
    });
    return res.status(201).json({ success: true, data: { report } });
  } catch (error) {
    logger.error('freelancer report create error:', error);
    return res.status(500).json({ success: false, message: 'Unable to submit report.' });
  }
});

router.post('/ai/quote', async (req, res) => {
  try {
    const { error, value } = quoteSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const categoryFactor = DIGITAL_CATEGORIES.includes(value.category) ? 1.4 : 1.1;
    const urgencyFactor =
      value.urgency === 'emergency' ? 1.45 : value.urgency === 'high' ? 1.25 : value.urgency === 'medium' ? 1.1 : 1;
    const skillFactor =
      value.skillLevel === 'expert' ? 1.5 : value.skillLevel === 'senior' ? 1.3 : value.skillLevel === 'mid' ? 1.12 : 1;
    const locationFactor = ['Trivandrum', 'Kottayam'].includes(value.location) ? 1.15 : 1.05;
    const scopeFactor = Math.max(1, Math.min(2.4, value.scope.length / 500));
    const baseline = Math.max(1000, toNumber(value.budget, 0) || 5000);

    const recommendedBudget = baseline * categoryFactor * urgencyFactor * skillFactor * locationFactor * scopeFactor;
    const minEstimate = Math.max(1000, Math.round(recommendedBudget * 0.85));
    const maxEstimate = Math.round(recommendedBudget * 1.18);
    const recommendedDays = Math.max(
      1,
      Math.round((scopeFactor * 4 + (value.skillLevel === 'expert' ? 2 : 4)) * (value.urgency === 'emergency' ? 0.6 : 1))
    );

    const matchedProviders = await FreelancerProvider.find({
      category: value.category,
      district: value.location,
      type: value.serviceType,
      isActive: true,
    })
      .sort({ rating: -1, responseMinutes: 1 })
      .limit(5)
      .lean();

    return res.json({
      success: true,
      data: {
        priceRange: {
          min: minEstimate,
          max: maxEstimate,
        },
        recommendedTimelineDays: {
          min: Math.max(1, recommendedDays - 1),
          max: recommendedDays + 2,
        },
        logic: {
          categoryFactor,
          urgencyFactor,
          skillFactor,
          locationFactor,
          scopeFactor,
        },
        recommendedSkills:
          value.skillLevel === 'expert'
            ? ['Technical specialist', 'Architectural review', 'QA handoff']
            : ['Core specialist', 'Execution support', 'QA review'],
        matchedProviders,
      },
    });
  } catch (error) {
    logger.error('freelancer ai quote error:', error);
    return res.status(500).json({ success: false, message: 'Unable to generate AI quote.' });
  }
});

router.get('/admin/commission-settings', async (_req, res) => {
  try {
    await ensureSeedData();
    const config = await FreelancerCommissionConfig.findOne({ configKey: 'default' }).lean();
    return res.json({ success: true, data: { config } });
  } catch (error) {
    logger.error('freelancer commission config fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch commission settings.' });
  }
});

router.put('/admin/commission-settings', async (req, res) => {
  try {
    const { error, value } = commissionSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const config = await FreelancerCommissionConfig.findOneAndUpdate(
      { configKey: 'default' },
      {
        ...value,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, data: { config } });
  } catch (error) {
    logger.error('freelancer commission config update error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update commission settings.' });
  }
});

router.get('/admin/dashboard', async (_req, res) => {
  try {
    await ensureSeedData();
    const [providers, jobs, bookings, disputes, reports, planPurchases] = await Promise.all([
      FreelancerProvider.countDocuments({ isActive: true }),
      FreelancerJob.countDocuments(),
      FreelancerBooking.countDocuments(),
      FreelancerDispute.countDocuments({ status: { $in: ['open', 'under-review'] } }),
      FreelancerReport.countDocuments({ status: 'open' }),
      FreelancerPlanPurchase.countDocuments({ status: 'active' }),
    ]);

    const recentDisputes = await FreelancerDispute.find().sort({ createdAt: -1 }).limit(10).lean();
    const recentBookings = await FreelancerBooking.find().sort({ createdAt: -1 }).limit(10).lean();

    return res.json({
      success: true,
      data: {
        metrics: {
          providers,
          jobs,
          bookings,
          openDisputes: disputes,
          openReports: reports,
          activePlanPurchases: planPurchases,
        },
        recentDisputes,
        recentBookings,
      },
    });
  } catch (error) {
    logger.error('freelancer admin dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch admin dashboard.' });
  }
});

module.exports = router;
