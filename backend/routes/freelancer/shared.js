const Joi = require('joi');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const FreelancerProvider = require('../../models/FreelancerProvider');
const FreelancerJob = require('../../models/FreelancerJob');
const FreelancerBid = require('../../models/FreelancerBid');
const FreelancerBooking = require('../../models/FreelancerBooking');
const FreelancerDispute = require('../../models/FreelancerDispute');
const FreelancerPlanPurchase = require('../../models/FreelancerPlanPurchase');
const FreelancerCommissionConfig = require('../../models/FreelancerCommissionConfig');
const FreelancerReport = require('../../models/FreelancerReport');
const FreelancerIdempotencyKey = require('../../models/FreelancerIdempotencyKey');
const FreelancerPaymentEvent = require('../../models/FreelancerPaymentEvent');
const logger = require('../../utils/logger');
const auth = require('../../middleware/auth');
const { authenticate, optionalToken, verifyAdmin, hasAdminPrivileges } = auth;

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many booking requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many payment operations. Please try again later.',
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: 'Too many OTP requests. Please try again later.',
  skipSuccessfulRequests: true,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
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

const uploadsRoot = path.join(__dirname, '../../uploads/freelancer');
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

const OTP_HASH_SECRET = String(process.env.FREELANCER_OTP_HASH_SECRET || process.env.JWT_SECRET || 'freelancer-otp-secret');
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_MS = 10 * 60 * 1000;

const BOOKING_STATE_TRANSITIONS = Object.freeze({
  requested: ['provider_assigned', 'cancelled'],
  provider_assigned: ['awaiting_payment', 'otp_pending', 'cancelled'],
  awaiting_payment: ['payment_in_escrow', 'cancelled'],
  payment_in_escrow: ['otp_pending', 'work_in_progress', 'disputed', 'cancelled'],
  otp_pending: ['work_in_progress', 'cancelled'],
  work_in_progress: ['completed', 'disputed', 'cancelled'],
  completed: [],
  cancelled: [],
  disputed: ['work_in_progress', 'cancelled'],
});

const maskPhone = (phone = '') => {
  const cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.length < 4) return '******';
  return `******${cleaned.slice(-4)}`;
};

const maskEmail = (email = '') => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return '';
  const [name, domain] = normalized.split('@');
  const safeName = name.length <= 2 ? `${name.slice(0, 1)}***` : `${name.slice(0, 2)}***`;
  return `${safeName}@${domain}`;
};

const hashOtp = (otp) =>
  crypto
    .createHmac('sha256', OTP_HASH_SECRET)
    .update(String(otp || '').trim())
    .digest('hex');

const buildCode = (prefix) => `${prefix}-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
const getPlanById = (planId) => SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);

const getRequestUserId = (req) => String(req.user?._id || req.user?.id || '').trim();
const getRequestUserPhone = (req) => String(req.user?.phone || req.user?.mobile || '').replace(/\D/g, '');
const getRequestUserName = (req) =>
  String(req.user?.name || req.user?.fullName || req.user?.email || '').trim();

const canManageProvider = (req, provider) => {
  if (!provider) return false;
  if (hasAdminPrivileges(req.user || {})) return true;
  const requesterUserId = getRequestUserId(req);
  return Boolean(requesterUserId) && String(provider.ownerUserId || '') === requesterUserId;
};

const sanitizeProvider = (provider = {}, { includeSensitive = false } = {}) => {
  if (!provider || typeof provider !== 'object') return provider;
  const output = { ...provider };

  if (!includeSensitive) {
    output.contactPhoneMasked = maskPhone(provider.contactPhone || '');
    output.contactEmailMasked = maskEmail(provider.contactEmail || '');
    delete output.contactPhone;
    delete output.contactEmail;
    delete output.ownerUserId;
  }

  if (Array.isArray(output.leadPurchaseHistory)) {
    output.leadPurchaseHistory = output.leadPurchaseHistory.slice(-25);
  }

  return output;
};

const sanitizeJob = (job = {}, { includeSensitive = false } = {}) => {
  if (!job || typeof job !== 'object') return job;
  const output = { ...job };
  if (output.createdBy && typeof output.createdBy === 'object') {
    output.createdBy = {
      customerName: output.createdBy.customerName || '',
      maskedPhone: output.createdBy.maskedPhone || maskPhone(output.createdBy.customerPhone || ''),
    };
    if (includeSensitive) {
      output.createdBy.customerPhone = output.createdBy.customerPhone || '';
      output.createdBy.userId = output.createdBy.userId || '';
    }
  }
  return output;
};

const sanitizeBooking = (booking = {}, { includeSensitive = false } = {}) => {
  if (!booking || typeof booking !== 'object') return booking;
  const output = { ...booking };

  if (output.customer && typeof output.customer === 'object') {
    output.customer = {
      name: output.customer.name || '',
      maskedPhone: output.customer.maskedPhone || maskPhone(output.customer.phone || ''),
    };
    if (includeSensitive) {
      output.customer.phone = output.customer.phone || '';
      output.customer.userId = output.customer.userId || '';
    }
  }

  if (output.otpVerification && typeof output.otpVerification === 'object') {
    output.otpVerification = {
      generatedAt: output.otpVerification.generatedAt || null,
      expiresAt: output.otpVerification.expiresAt || null,
      verifiedAt: output.otpVerification.verifiedAt || null,
      verified: Boolean(output.otpVerification.verified),
      attempts: toNumber(output.otpVerification.attempts, 0),
      lockedUntil: output.otpVerification.lockedUntil || null,
    };
  }

  return output;
};

const ensureBookingAccess = (req, booking, { allowProviderOwner = true } = {}) => {
  if (!booking) return false;
  if (hasAdminPrivileges(req.user || {})) return true;

  const requesterUserId = getRequestUserId(req);
  const requesterPhone = getRequestUserPhone(req);
  const bookingUserId = String(booking.customer?.userId || '').trim();
  const bookingPhone = String(booking.customer?.phone || '').replace(/\D/g, '');

  if (requesterUserId && bookingUserId && requesterUserId === bookingUserId) {
    return true;
  }
  if (requesterPhone && bookingPhone && requesterPhone === bookingPhone) {
    return true;
  }

  if (allowProviderOwner && requesterUserId && booking.providerId) {
    const ownerUserId = String(booking.providerOwnerUserId || '').trim();
    if (ownerUserId && ownerUserId === requesterUserId) {
      return true;
    }
  }

  return false;
};

const assertBookingAccess = async (req, booking, { allowProviderOwner = true } = {}) => {
  if (!booking) return false;
  if (hasAdminPrivileges(req.user || {})) return true;

  if (ensureBookingAccess(req, booking, { allowProviderOwner: false })) {
    return true;
  }

  if (!allowProviderOwner || !booking.providerId) return false;
  const provider = await FreelancerProvider.findById(booking.providerId).select({ ownerUserId: 1 }).lean();
  if (!provider) return false;
  const requesterUserId = getRequestUserId(req);
  return Boolean(requesterUserId) && String(provider.ownerUserId || '') === requesterUserId;
};

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
  if (String(process.env.FREELANCER_SEED_ON_BOOT || '').toLowerCase() !== 'true') {
    return;
  }

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

let freelancerBootstrapPromise = null;
const bootstrapFreelancerModule = () => {
  if (!freelancerBootstrapPromise) {
    freelancerBootstrapPromise = ensureSeedData()
      .then(() => {
        logger.info('[freelancer] bootstrap complete');
      })
      .catch((error) => {
        logger.error(`[freelancer] bootstrap failed: ${error.message}`);
        freelancerBootstrapPromise = null;
      });
  }
  return freelancerBootstrapPromise;
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

  const eventCode = buildCode('FPE');
  FreelancerPaymentEvent.create({
    eventCode,
    bookingCode: String(bookingCode || '').trim(),
    eventType: String(event || '').trim() || 'UNKNOWN',
    amount: toNumber(amount, 0),
    status: String(status || '').trim(),
    source: 'system',
    payload: {},
  }).catch((error) => {
    logger.warn(`[freelancer] payment event persistence skipped: ${error.message}`);
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

const resolvePlanCreditBundle = (planId = '') => {
  if (planId === 'basic') return 5;
  if (planId === 'pro') return 20;
  if (planId === 'premium') return 60;
  return 0;
};

const applyPlanActivation = async (provider, purchase, { session } = {}) => {
  if (!provider || !purchase) return false;

  const purchaseId = purchase._id;
  const providerId = provider._id;
  const startsAt = purchase.startsAt || new Date();
  const endsAt =
    purchase.endsAt || new Date(startsAt.getTime() + toNumber(purchase.durationDays, 30) * 24 * 60 * 60 * 1000);
  const creditToAdd = resolvePlanCreditBundle(purchase.planId);

  const purchaseUpdate = await FreelancerPlanPurchase.findOneAndUpdate(
    { _id: purchaseId, creditGranted: false },
    {
      $set: {
        status: 'active',
        paymentStatus: 'paid',
        creditGranted: true,
        startsAt,
        endsAt,
      },
    },
    { new: true, session }
  );

  if (!purchaseUpdate) {
    return false;
  }

  await FreelancerProvider.updateOne(
    { _id: providerId },
    {
      $set: {
        'plans.currentPlanId': purchase.planId,
        'plans.currentPlanName': purchase.planName,
        'plans.expiresAt': endsAt,
        'plans.sponsoredListing': purchase.planId === 'premium',
      },
      $inc: { leadCredits: creditToAdd },
    },
    { session }
  );

  provider.plans.currentPlanId = purchase.planId;
  provider.plans.currentPlanName = purchase.planName;
  provider.plans.expiresAt = endsAt;
  provider.plans.sponsoredListing = purchase.planId === 'premium';
  provider.leadCredits = Math.max(0, toNumber(provider.leadCredits, 0)) + creditToAdd;

  purchase.status = 'active';
  purchase.paymentStatus = 'paid';
  purchase.creditGranted = true;
  purchase.startsAt = startsAt;
  purchase.endsAt = endsAt;

  return true;
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
  reason: Joi.string().trim().min(5).max(500).required(),
});

const refundSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(500).required(),
});

const disputeCreateSchema = Joi.object({
  raisedByName: Joi.string().trim().min(2).max(80).allow('').default(''),
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

const parsePagination = (pageRaw, limitRaw, { defaultLimit = 20, maxLimit = 50 } = {}) => {
  const page = Math.max(1, toNumber(pageRaw, 1));
  const limit = Math.min(maxLimit, Math.max(1, toNumber(limitRaw, defaultLimit)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const normalizeForHash = (value) => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => normalizeForHash(item));
  if (typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalizeForHash(value[key]);
        return acc;
      }, {});
  }
  return value;
};

const computeRequestHash = ({ method = '', path = '', body = {}, query = {} } = {}) =>
  crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        method: String(method || '').toUpperCase(),
        path: String(path || ''),
        body: normalizeForHash(body),
        query: normalizeForHash(query),
      })
    )
    .digest('hex');

const getIdempotencyKeyFromRequest = (req) =>
  String(req.get('x-idempotency-key') || req.get('idempotency-key') || '').trim();

const executeIdempotentOperation = async ({ req, scope, operation }) => {
  const key = getIdempotencyKeyFromRequest(req);
  if (!key) {
    return operation();
  }

  const userId = getRequestUserId(req) || 'anonymous';
  const requestHash = computeRequestHash({
    method: req.method,
    path: req.originalUrl.split('?')[0],
    body: req.body,
    query: req.query,
  });

  const existing = await FreelancerIdempotencyKey.findOne({ userId, scope, key }).lean();
  if (existing) {
    if (String(existing.requestHash || '') !== requestHash) {
      return {
        statusCode: 409,
        body: {
          success: false,
          message: 'Idempotency key conflict: request payload differs from the original request.',
        },
      };
    }
    return {
      statusCode: existing.statusCode,
      body: {
        ...(existing.responseBody || {}),
        reused: true,
      },
    };
  }

  const response = await operation();
  const statusCode = Number(response?.statusCode || 200);
  const responseBody = response?.body || {};

  try {
    await FreelancerIdempotencyKey.create({
      userId,
      scope,
      key,
      requestHash,
      statusCode,
      responseBody,
      metadata: {
        method: req.method,
        path: req.originalUrl.split('?')[0],
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = await FreelancerIdempotencyKey.findOne({ userId, scope, key }).lean();
      if (duplicate && String(duplicate.requestHash || '') === requestHash) {
        return {
          statusCode: duplicate.statusCode,
          body: {
            ...(duplicate.responseBody || {}),
            reused: true,
          },
        };
      }
      return {
        statusCode: 409,
        body: {
          success: false,
          message: 'Idempotency key conflict detected.',
        },
      };
    }
    logger.warn(`[freelancer] idempotency persistence failed: ${error.message}`);
  }

  return {
    statusCode,
    body: responseBody,
  };
};

const canTransitionBookingStatus = (fromStatus = '', toStatus = '') => {
  const from = String(fromStatus || '').trim();
  const to = String(toStatus || '').trim();
  if (!from || !to) return false;
  if (from === to) return true;
  return (BOOKING_STATE_TRANSITIONS[from] || []).includes(to);
};

const enforceBookingTransition = ({ booking, nextStatus }) => {
  if (!booking) {
    return { ok: false, message: 'Booking not found.' };
  }
  const current = String(booking.status || '').trim();
  if (canTransitionBookingStatus(current, nextStatus)) {
    return { ok: true };
  }
  return {
    ok: false,
    message: `Invalid booking status transition from ${current || 'unknown'} to ${nextStatus}.`,
  };
};

const deriveFreelancerCapabilities = (user = {}) => {
  const isAdmin = hasAdminPrivileges(user);
  const normalizedRole = String(user.role || user.registrationType || '').trim().toLowerCase();
  const isProvider = normalizedRole === 'provider' || normalizedRole === 'freelancer';
  const isCustomer = !isAdmin && !isProvider;

  return {
    role: isAdmin ? 'admin' : isProvider ? 'provider' : isCustomer ? 'customer' : 'customer',
    canBook: isAdmin || isCustomer,
    canBid: isAdmin || isProvider,
    canLeadPurchase: isAdmin || isProvider,
    canSubmitReview: isAdmin || isCustomer,
    canResolveDisputes: isAdmin,
    canManageCommission: isAdmin,
    canActivatePlans: isAdmin,
  };
};

const deriveActorRole = (user = {}) => {
  if (hasAdminPrivileges(user)) return 'admin';
  const normalizedRole = String(user.role || user.registrationType || '').trim().toLowerCase();
  if (normalizedRole === 'provider' || normalizedRole === 'freelancer') return 'provider';
  return 'customer';
};

const runInTransaction = async (work) => {
  const connectionReady = mongoose.connection && mongoose.connection.readyState === 1;
  if (!connectionReady) {
    return work(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    const transactionUnsupported =
      message.includes('transaction numbers are only allowed on a replica set') ||
      message.includes('transaction not supported') ||
      message.includes('does not support retryable writes');
    if (transactionUnsupported) {
      logger.warn('[freelancer] transactions unavailable, falling back to non-transactional execution');
      return work(null);
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

const escapeRegex = (text = '') => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
  models: {
    FreelancerProvider,
    FreelancerJob,
    FreelancerBid,
    FreelancerBooking,
    FreelancerDispute,
    FreelancerPlanPurchase,
    FreelancerCommissionConfig,
    FreelancerReport,
    FreelancerIdempotencyKey,
    FreelancerPaymentEvent,
  },
  auth: { authenticate, optionalToken, verifyAdmin, hasAdminPrivileges },
  limits: { bookingLimiter, paymentLimiter, otpLimiter, generalLimiter },
  uploads: { attachmentUpload, disputeProofUpload, kycUpload },
  constants: {
    DISTRICTS,
    LANGUAGES,
    DIGITAL_CATEGORIES,
    LOCAL_CATEGORIES,
    VERIFICATION_TYPES,
    SUBSCRIPTION_PLANS,
    EMERGENCY_SERVICES,
    ALL_CATEGORIES,
    OTP_MAX_ATTEMPTS,
    OTP_LOCK_MS,
    BOOKING_STATE_TRANSITIONS,
  },
  schemas: {
    providerOnboardingSchema,
    reviewSchema,
    jobCreateSchema,
    bidCreateSchema,
    bookingCreateSchema,
    bookingStatusSchema,
    paymentInitSchema,
    cancellationSchema,
    refundSchema,
    disputeCreateSchema,
    disputeResolveSchema,
    planPurchaseSchema,
    leadPurchaseSchema,
    reportSchema,
    quoteSchema,
    commissionSchema,
  },
  helpers: {
    logger,
    toNumber,
    hashOtp,
    buildCode,
    getPlanById,
    getRequestUserId,
    getRequestUserPhone,
    getRequestUserName,
    canManageProvider,
    sanitizeProvider,
    sanitizeJob,
    sanitizeBooking,
    assertBookingAccess,
    bootstrapFreelancerModule,
    recalculateProviderRating,
    logPaymentEvent,
    logBookingEvent,
    logDisputeEvent,
    applyPlanActivation,
    parsePagination,
    runInTransaction,
    escapeRegex,
    maskPhone,
    executeIdempotentOperation,
    deriveFreelancerCapabilities,
    deriveActorRole,
    enforceBookingTransition,
    canTransitionBookingStatus,
    getIdempotencyKeyFromRequest,
  },
};
