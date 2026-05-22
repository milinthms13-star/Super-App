/**
 * Gulf Services - Complete Backend Integration
 * Routes for: Visa, Jobs, Document Attestation, Travel, Medical, Returnee, NRI, Emergency Services
 * Date: May 2026
 */

const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const logger = require('../utils/logger');
const { authenticate, verifyAdmin, optionalToken, hasAdminPrivileges } = require('../middleware/auth');
const { sendEmergencyAlert } = require('../utils/notifications');
const { scanFile } = require('../utils/virusScan');

const router = express.Router();

const StripeLib = require('stripe');
const stripe = process.env.STRIPE_SECRET ? StripeLib(process.env.STRIPE_SECRET) : null;

const {
  GulfVisaRequest,
  GulfJobApplication,
  GulfAttestationRequest,
  GulfTravelSupport,
  GulfMedicalBooking,
  GulfReturneeService,
  GulfNRIService,
  GulfEmergencyCase,
  GulfJob,
  GulfUser,
  GulfRecruiter,
  GulfApplication,
  GulfFraudReport,
  GulfPaymentIdempotency,
  GulfPaymentWebhookEvent,
  GulfAdminAuditEvent,
} = require('../models/gulfservices');

const SAMPLE_JOBS = [
  {
    id: 'gulf-hospitality-uae',
    title: 'Hospitality Team Lead',
    company: 'Al Nahar Group',
    country: 'UAE',
    category: 'Hospitality',
    summary: 'Verified UAE hospitality role with visa support and onboarding assistance.',
    salary: { min: 2200, max: 2800 },
  },
  {
    id: 'gulf-construction-qatar',
    title: 'Site Engineer',
    company: 'Gulf Connect',
    country: 'Qatar',
    category: 'Construction',
    summary: 'Qatar engineering position with document guidance and fraud protection.',
    salary: { min: 2600, max: 3200 },
  },
  {
    id: 'gulf-healthcare-saudi',
    title: 'Clinical Nurse',
    company: 'Skyline Careers',
    country: 'Saudi Arabia',
    category: 'Healthcare',
    summary: 'GAMCA-ready nurse role with employer verification and interview prep.',
    salary: { min: 3000, max: 3600 },
  },
  {
    id: 'gulf-it-oman',
    title: 'IT Support Specialist',
    company: 'MetroWorks',
    country: 'Oman',
    category: 'IT & Engineering',
    summary: 'IT support post with visa-friendly package and onboarding support.',
    salary: { min: 2200, max: 3000 },
  },
];

const SAMPLE_RECRUITERS = [
  {
    id: 'recruiter-1',
    name: 'Al Nahar Employment Services',
    licenseNumber: 'UAE-12345',
    registrationNumber: 'KSA-67890',
    country: 'UAE',
    verified: true,
    status: 'active',
    successCases: 420,
    rating: 4.8,
    reviews: 152,
  },
  {
    id: 'recruiter-2',
    name: 'Gulf Verified Recruiters',
    licenseNumber: 'QA-56432',
    registrationNumber: 'OM-01472',
    country: 'Qatar',
    verified: true,
    status: 'active',
    successCases: 310,
    rating: 4.6,
    reviews: 98,
  },
  {
    id: 'recruiter-3',
    name: 'Skyline Gulf Careers',
    licenseNumber: 'SA-99881',
    registrationNumber: 'BH-11324',
    country: 'Saudi Arabia',
    verified: true,
    status: 'active',
    successCases: 275,
    rating: 4.7,
    reviews: 121,
  },
];

const VISA_TYPES = ['Visit', 'Employment', 'Family', 'Student', 'Business'];
const VALID_COUNTRIES = ['UAE', 'Saudi Arabia', 'Qatar', 'Oman', 'Kuwait', 'Bahrain'];
const VISA_WORKFLOW_STATUSES = [
  'Applied',
  'Offer Letter Pending',
  'Offer Letter Received',
  'Medical Pending',
  'Medical Completed',
  'Visa Processing',
  'Requires Human Review',
  'Escalated',
  'Visa Approved',
  'Visa Stamped',
  'Travel Ready',
  'Rejected',
];
const ALLOWED_PAYMENT_CURRENCIES = ['usd', 'inr', 'aed'];
const PAYMENT_MIN_AMOUNT = 1;
const PAYMENT_MAX_AMOUNT = 10000;
const PAYMENT_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const paymentIntentCache = new Map();
const PAYMENT_CACHE_SWEEP_MAX = 20;

const toObjectIdString = (value) => {
  if (!value) return '';
  return typeof value === 'string' ? value : String(value);
};

const formatJob = (job = {}) => {
  const salary = job.salary || {};
  const salaryMin = Number(job.salaryMin || salary.min || 0);
  const salaryMax = Number(job.salaryMax || salary.max || 0);

  return {
    id: toObjectIdString(job.id || job._id),
    title: job.title || '',
    company: job.company || '',
    country: job.country || '',
    category: job.category || '',
    summary: job.summary || '',
    description: job.description || job.summary || '',
    salary: {
      min: Number.isFinite(salaryMin) ? salaryMin : 0,
      max: Number.isFinite(salaryMax) ? salaryMax : 0,
    },
    visaType: job.visaType || 'Employment',
    accommodation: Boolean(job.accommodation),
    food: Boolean(job.food),
    urgentHiring: Boolean(job.urgentHiring),
    experience: Number(job.experience || 0),
    recruiter: job.recruiter || job.recruiterId || '',
    verified: typeof job.verified === 'boolean' ? job.verified : true,
  };
};

const normalizePhone = (value = '') => String(value || '').replace(/[^\d+]/g, '').trim();
const normalizePassportNo = (value = '') =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
const parseCompletedDocs = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  const raw = String(value || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || '').trim()).filter(Boolean);
    }
  } catch (_error) {
    // fallback split
  }

  return raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};
const normalizeVisaType = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  const matched = VISA_TYPES.find((type) => type.toLowerCase() === normalized);
  return matched || '';
};

const isMongoObjectId = (value = '') => /^[a-f\d]{24}$/i.test(String(value || ''));
const resolveUserId = (req) => String(req?.user?._id || req?.user?.id || '').trim();
const resolveUserEmail = (req) => String(req?.user?.email || '').trim().toLowerCase();
const resolveUserRole = (req) => String(req?.user?.role || req?.user?.registrationType || '').trim().toLowerCase();
const parsePagination = (query = {}, defaults = {}) => {
  const parsedPage = Number.parseInt(String(query.page || defaults.page || '1'), 10);
  const parsedLimit = Number.parseInt(String(query.limit || defaults.limit || '25'), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const maxLimit = Number.isFinite(Number(defaults.maxLimit)) ? Number(defaults.maxLimit) : 200;
  const fallbackLimit = Number.isFinite(Number(defaults.limit)) ? Number(defaults.limit) : 25;
  const boundedLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : fallbackLimit;
  const limit = Math.min(Math.max(boundedLimit, 1), maxLimit);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
const averageHours = (records = [], startField, endField) => {
  const durations = records
    .map((item) => {
      const start = item?.[startField] ? new Date(item[startField]) : null;
      const end = item?.[endField] ? new Date(item[endField]) : null;
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      const diffMs = end.getTime() - start.getTime();
      return diffMs >= 0 ? diffMs / (1000 * 60 * 60) : null;
    })
    .filter((value) => Number.isFinite(value));

  if (!durations.length) return null;
  const total = durations.reduce((sum, value) => sum + value, 0);
  return Number((total / durations.length).toFixed(2));
};
const buildPaymentCacheKey = (req, payload, idempotencyKey) => {
  const caller = resolveUserId(req) || resolveUserEmail(req) || String(req.ip || 'anonymous');
  return `${caller}:${idempotencyKey}:${payload.currency}:${payload.amount}:${payload.type || ''}:${payload.id || ''}`;
};
const sweepInMemoryPaymentCache = () => {
  if (!paymentIntentCache.size) return;
  let scanned = 0;
  for (const [cacheKey, entry] of paymentIntentCache.entries()) {
    scanned += 1;
    if (!entry || Date.now() - Number(entry.createdAt || 0) > PAYMENT_IDEMPOTENCY_TTL_MS) {
      paymentIntentCache.delete(cacheKey);
    }
    if (scanned >= PAYMENT_CACHE_SWEEP_MAX) break;
  }
};
const readInMemoryPaymentCache = (key) => {
  const cached = paymentIntentCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > PAYMENT_IDEMPOTENCY_TTL_MS) {
    paymentIntentCache.delete(key);
    return null;
  }
  return cached.data;
};
const writeInMemoryPaymentCache = (key, data) => {
  paymentIntentCache.set(key, { data, createdAt: Date.now() });
};
const readPaymentCache = async (key) => {
  sweepInMemoryPaymentCache();
  const localCached = readInMemoryPaymentCache(key);
  if (localCached) return localCached;

  const persisted = await GulfPaymentIdempotency.findOne({ cacheKey: key }).lean();
  if (!persisted) return null;
  const expiresAtTs = new Date(persisted.expiresAt).getTime();
  if (!Number.isFinite(expiresAtTs) || expiresAtTs <= Date.now()) {
    await GulfPaymentIdempotency.deleteOne({ cacheKey: key }).catch(() => {});
    return null;
  }

  writeInMemoryPaymentCache(key, persisted.responsePayload);
  return persisted.responsePayload;
};
const writePaymentCache = async (key, data, idempotencyKey, caller) => {
  writeInMemoryPaymentCache(key, data);
  await GulfPaymentIdempotency.findOneAndUpdate(
    { cacheKey: key },
    {
      $set: {
        responsePayload: data,
        idempotencyKey: String(idempotencyKey || '').trim(),
        caller: String(caller || '').trim(),
        expiresAt: new Date(Date.now() + PAYMENT_IDEMPOTENCY_TTL_MS),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};
const buildAuditActor = (req) => ({
  actorId: resolveUserId(req),
  actorEmail: resolveUserEmail(req),
  actorRole: resolveUserRole(req),
});
const recordAdminAudit = async (req, entry = {}) => {
  const { actorId, actorEmail, actorRole } = buildAuditActor(req);
  const auditId = `AUD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  await GulfAdminAuditEvent.create({
    auditId,
    entityType: String(entry.entityType || '').trim(),
    entityId: String(entry.entityId || '').trim(),
    action: String(entry.action || '').trim(),
    actorId,
    actorEmail,
    actorRole,
    before: entry.before || {},
    after: entry.after || {},
    note: String(entry.note || '').trim(),
  });
};

// ============ RATE LIMITING ============
const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 applications per hour
  message: 'Too many applications. Please try again later.',
});

const documentUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 uploads per 15 minutes
  message: 'Too many uploads. Please try again later.',
});

const emergencyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many emergency requests. Please contact helpline directly.',
});

const fraudReportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: 'Too many fraud reports from this source. Please try again later.',
});

const paymentsCreateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many payment initiation requests. Please try again later.',
});

// ============ FILE UPLOADS ============
const uploadsRoot = path.join(__dirname, '../uploads/gulfservices');
const documentUploads = path.join(uploadsRoot, 'documents');
const cvUploads = path.join(uploadsRoot, 'cv');

[uploadsRoot, documentUploads, cvUploads].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const createUploader = (dir) =>
  multer({
    storage: multer.diskStorage({
      destination: (_, __, cb) => cb(null, dir),
      filename: (_, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_, file, cb) => {
      const allowed = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file format'));
      }
    },
  });

const docUpload = createUploader(documentUploads);
const cvUpload = createUploader(cvUploads);

// ============ VALIDATION SCHEMAS ============
const visaRequestSchema = Joi.object({
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[0-9]{8,15}$/).required(),
  country: Joi.string().valid(...VALID_COUNTRIES).required(),
  visaType: Joi.string().valid(...VISA_TYPES).required(),
  urgency: Joi.string().valid('normal', 'urgent', 'emergency').default('normal'),
  currentLocation: Joi.string().required(),
  message: Joi.string().max(1000),
});

const jobApplicationSchema = Joi.object({
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[0-9]{8,15}$/).required(),
  passportNo: Joi.string().trim().min(6).max(20).required(),
  experience: Joi.number().min(0).max(50),
  currentCompany: Joi.string(),
  expectedSalary: Joi.number().min(0),
  availabilityDays: Joi.number().min(15).max(90),
  jobId: Joi.string().optional(),
});

const attestationRequestSchema = Joi.object({
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[0-9]{8,15}$/).required(),
  documentType: Joi.string().valid('degree', 'marriage', 'birth', 'character', 'police_clearance').required(),
  documentName: Joi.string().required(),
  country: Joi.string().valid(...VALID_COUNTRIES).required(),
  urgency: Joi.string().valid('standard', 'expedited', 'emergency').default('standard'),
});

const emergencySchema = Joi.object({
  issueType: Joi.string().trim().required(),
  description: Joi.string().trim().allow('').max(2000),
  phone: Joi.string().pattern(/^\+?[0-9]{8,15}$/).required(),
  country: Joi.string().valid(...VALID_COUNTRIES).required(),
  message: Joi.string().trim().allow('').max(2000),
});

const fraudReportSchema = Joi.object({
  recruiterId: Joi.string().trim().allow(''),
  issueDescription: Joi.string().trim().min(12).max(4000).required(),
  phone: Joi.string().pattern(/^\+?[0-9]{8,15}$/).required(),
});

const genericServiceRequestSchema = Joi.object({
  fullName: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[0-9]{8,15}$/).required(),
  country: Joi.string().valid(...VALID_COUNTRIES).required(),
  details: Joi.string().trim().max(3000).allow(''),
});

const travelSupportSchema = genericServiceRequestSchema.keys({
  serviceType: Joi.string().trim().valid('flight', 'accommodation', 'relocation', 'insurance', 'forex').required(),
});

const medicalBookingSchema = genericServiceRequestSchema.keys({
  appointmentDate: Joi.date().iso().optional(),
});

const returneeServiceSchema = genericServiceRequestSchema.keys({
  serviceCategory: Joi.string().trim().valid('job-support', 'business-setup', 'legal-help', 'financial-planning').required(),
});

const nriServiceSchema = genericServiceRequestSchema.keys({
  serviceType: Joi.string().trim().valid('banking', 'property', 'legal', 'investment').required(),
});

const fraudAdminStatusSchema = Joi.object({
  status: Joi.string().trim().valid('open', 'in_review', 'resolved', 'rejected').required(),
  adminNote: Joi.string().trim().allow('').max(1000),
});

const recruiterApplicationSchema = Joi.object({
  fullName: Joi.string().trim().allow(''),
  name: Joi.string().trim().allow(''),
  companyName: Joi.string().trim().allow(''),
  licenseNumber: Joi.string().trim().required(),
  registrationNumber: Joi.string().trim().allow(''),
  country: Joi.string().valid(...VALID_COUNTRIES).required(),
  phone: Joi.string().pattern(/^\+?[0-9]{8,15}$/).required(),
  email: Joi.string().email().required(),
  website: Joi.string().trim().uri({ scheme: [/https?/] }).allow(''),
  experienceSummary: Joi.string().trim().max(3000).allow(''),
}).or('fullName', 'name');

const gulfApplicationSchema = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().email().allow(''),
  phone: Joi.string().pattern(/^\+?[0-9]{8,15}$/).required(),
  passportNo: Joi.string().trim().min(6).max(20).required(),
  jobTitle: Joi.string().trim().required(),
  country: Joi.string().valid(...VALID_COUNTRIES).required(),
  company: Joi.string().trim().allow(''),
  salary: Joi.string().trim().allow(''),
  completedDocs: Joi.array().items(Joi.string().trim()).default([]),
});

const gulfAdminStatusSchema = Joi.object({
  visaStatus: Joi.string().valid(...VISA_WORKFLOW_STATUSES).required(),
  agentName: Joi.string().trim().allow(''),
  agentVerified: Joi.boolean().default(false),
  adminNote: Joi.string().trim().allow(''),
});

// ============ BOOTSTRAP ENDPOINT ============
router.get('/bootstrap', async (_, res) => {
  try {
    const constants = {
      countries: VALID_COUNTRIES,
      visaTypes: VISA_TYPES,
      documentTypes: ['Degree', 'Marriage Certificate', 'Birth Certificate', 'PCC', 'Character Certificate'],
      jobCategories: ['Hospitality', 'Construction', 'Healthcare', 'IT & Engineering', 'Logistics', 'Sales & Retail', 'Nursing', 'Housemaid'],
      services: [
        { id: 'visa', title: 'Visa Assistance', description: 'Visit, employment, family visas and renewals.' },
        { id: 'jobs', title: 'Gulf Jobs', description: 'Verified recruiters and fraud protection.' },
        { id: 'attestation', title: 'Document Attestation', description: 'MEA, embassy, HRD and delivery tracking.' },
        { id: 'travel', title: 'Travel Support', description: 'Flights, insurance, forex and roaming setup.' },
        { id: 'medical', title: 'Medical & PCC', description: 'GAMCA medical and PCC guidance.' },
        { id: 'returnee', title: 'Returnee Help', description: 'Re-entry jobs, business setup and NRI services.' },
        { id: 'nri', title: 'NRI Services', description: 'Bank, transfer, legal and property support.' },
        { id: 'emergency', title: 'Emergency Help', description: 'Passport lost, visa issues, legal aid.' },
      ],
      urgencyLevels: ['Normal (7-14 days)', 'Urgent (3-7 days)', 'Emergency (24 hours)'],
      trustIndicators: ['Verified Agency License', 'Govt. Registration', '100+ Successful Cases', 'Customer Reviews', '24/7 Support'],
      trustedRecruiters: SAMPLE_RECRUITERS,
      support: {
        phone: String(process.env.GULF_SUPPORT_PHONE || '+919999999999').trim(),
        whatsapp: String(process.env.GULF_SUPPORT_WHATSAPP || '919999999999').trim(),
      },
    };

    res.json({ success: true, data: { constants } });
  } catch (error) {
    logger.error('gulf bootstrap error:', error);
    res.status(500).json({ success: false, message: 'Unable to load bootstrap data.' });
  }
});

// ============ VISA SERVICES ============
router.post('/visa/enquire', applicationLimiter, async (req, res) => {
  try {
    const normalizedPayload = {
      ...req.body,
      phone: normalizePhone(req.body?.phone),
      visaType: normalizeVisaType(req.body?.visaType),
    };

    const { error, value } = visaRequestSchema.validate(normalizedPayload);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const visaRequest = await GulfVisaRequest.create({
      ...value,
      requestId: `VR-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      status: 'submitted',
      createdAt: new Date(),
    });

    logger.info('Visa request created:', visaRequest.requestId);

    res.status(201).json({
      success: true,
      message: 'Visa enquiry submitted. Our team will contact you shortly.',
      data: { requestId: visaRequest.requestId, visaRequest },
    });
  } catch (error) {
    logger.error('visa enquire error:', error);
    res.status(500).json({ success: false, message: 'Unable to submit visa enquiry.' });
  }
});

router.get('/visa/track/:requestId', optionalToken, async (req, res) => {
  try {
    const queryEmail = String(req.query.email || '').trim().toLowerCase();
    const authEmail = resolveUserEmail(req);

    if (!authEmail && !queryEmail) {
      return res.status(400).json({ success: false, message: 'Email is required to track this request.' });
    }

    const visaRequest = await GulfVisaRequest.findOne({ requestId: req.params.requestId });
    if (!visaRequest) return res.status(404).json({ success: false, message: 'Visa request not found.' });

    const ownerEmail = String(visaRequest.email || '').trim().toLowerCase();
    const isAdmin = hasAdminPrivileges(req.user || {});
    // Allow if authenticated owner or admin, otherwise require matching email query param
    if (authEmail) {
      if (authEmail !== ownerEmail && !isAdmin) {
        return res.status(403).json({ success: false, message: 'You are not authorized to access this request.' });
      }
    } else {
      if (ownerEmail !== queryEmail) {
        return res.status(403).json({ success: false, message: 'You are not authorized to access this request.' });
      }
    }

    res.json({
      success: true,
      data: {
        requestId: visaRequest.requestId,
        status: visaRequest.status,
        timeline: visaRequest.timeline || [],
        visaRequest,
      },
    });
  } catch (error) {
    logger.error('visa track error:', error);
    res.status(500).json({ success: false, message: 'Unable to track visa request.' });
  }
});

// ============ JOB SERVICES ============
router.get('/jobs', async (req, res) => {
  try {
    const { country, category, salaryMin, salaryMax, visaType, urgentOnly, accommodation, food } = req.query;
    const query = { status: 'active' };

    if (country) query.country = country;
    if (category) query.category = category;
    if (visaType) query.visaType = visaType;
    if (urgentOnly === 'true') query.urgentHiring = true;
    if (accommodation === 'true') query.accommodation = true;
    if (food === 'true') query.food = true;
    if (salaryMin) query['salary.min'] = { $gte: Number(salaryMin) };
    if (salaryMax) query['salary.max'] = { $lte: Number(salaryMax) };

    let jobs = await GulfJob.find(query).sort({ createdAt: -1 }).limit(50).lean();
    if (!jobs.length) {
      jobs = SAMPLE_JOBS.filter((job) => {
        const matchesCountry = country ? job.country === country : true;
        const matchesCategory = category ? job.category === category : true;
        const matchesVisaType = visaType ? job.visaType === visaType : true;
        const matchesUrgent = urgentOnly === 'true' ? job.urgentHiring === true : true;
        const matchesAccommodation = accommodation === 'true' ? job.accommodation === true : true;
        const matchesFood = food === 'true' ? job.food === true : true;
        const matchesSalaryMin = salaryMin ? Number(job.salary?.min || 0) >= Number(salaryMin) : true;
        const matchesSalaryMax = salaryMax ? Number(job.salary?.max || 0) <= Number(salaryMax) : true;
        return (
          matchesCountry &&
          matchesCategory &&
          matchesVisaType &&
          matchesUrgent &&
          matchesAccommodation &&
          matchesFood &&
          matchesSalaryMin &&
          matchesSalaryMax
        );
      }).slice(0, 50);
    }

    const formattedJobs = jobs.map(formatJob);

    res.json({ success: true, data: { jobs: formattedJobs, count: formattedJobs.length } });
  } catch (error) {
    logger.error('jobs fetch error:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch jobs.' });
  }
});

router.get('/jobs/:jobId', async (req, res) => {
  try {
    let job = null;
    if (isMongoObjectId(req.params.jobId)) {
      job = await GulfJob.findById(req.params.jobId).lean();
    }
    if (!job) {
      job = SAMPLE_JOBS.find((entry) => entry.id === req.params.jobId);
    }

    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });

    res.json({ success: true, data: { job: formatJob(job) } });
  } catch (error) {
    logger.error('job detail error:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch job details.' });
  }
});

router.post('/jobs/:jobId/apply', applicationLimiter, documentUploadLimiter, optionalToken, cvUpload.single('cv'), async (req, res) => {
  try {
    const normalizedPayload = {
      ...req.body,
      phone: normalizePhone(req.body?.phone),
      passportNo: normalizePassportNo(req.body?.passportNo),
    };

    const { error, value } = jobApplicationSchema.validate(normalizedPayload);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    let job = null;
    if (isMongoObjectId(req.params.jobId)) {
      job = await GulfJob.findById(req.params.jobId);
    }
    if (!job) {
      job = SAMPLE_JOBS.find((entry) => entry.id === req.params.jobId);
    }
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });

    const application = await GulfJobApplication.create({
      ...value,
      jobId: req.params.jobId,
      applicationId: `APP-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      cvFile: req.file ? req.file.filename : null,
      status: 'submitted',
      createdAt: new Date(),
    });

    // Basic virus-scan placeholder for uploaded CV
    if (req.file && req.file.path) {
      try {
        await scanFile(req.file.path);
      } catch (scanErr) {
        // cleanup: remove created records and uploaded file
        try {
          if (application && application._id) await GulfJobApplication.findByIdAndDelete(application._id);
        } catch (e) {
          logger.error('cleanup error after failed scan (application):', e);
        }
        try {
          if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        } catch (e) {
          logger.error('cleanup error after failed scan (file):', e);
        }
        return res.status(400).json({ success: false, message: 'Uploaded CV failed security checks.' });
      }
    }

    // Also persist into the unified Gulf application workflow tracker.
    await GulfApplication.create({
      userId: resolveUserId(req),
      name: value.fullName,
      email: value.email,
      phone: value.phone,
      passportNo: value.passportNo,
      jobTitle: job.title || '',
      country: job.country || '',
      company: job.company || '',
      salary: `${Number(job.salary?.min || 0)}-${Number(job.salary?.max || 0)}`,
      completedDocs: parseCompletedDocs(req.body?.completedDocs),
      visaStatus: 'Applied',
      timeline: [{ status: 'Applied', note: 'Job application received', date: new Date() }],
      source: 'job-apply',
    });

    logger.info('Job application created:', application.applicationId);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      data: { applicationId: application.applicationId },
    });
  } catch (error) {
    logger.error('job apply error:', error);
    res.status(500).json({ success: false, message: 'Unable to submit job application.' });
  }
});

// ============ UNIFIED GULF APPLICATION WORKFLOW ============
router.post('/applications', authenticate, async (req, res) => {
  try {
    const normalizedPayload = {
      ...req.body,
      phone: normalizePhone(req.body?.phone),
      passportNo: normalizePassportNo(req.body?.passportNo),
      completedDocs: parseCompletedDocs(req.body?.completedDocs),
      email: String(req.body?.email || resolveUserEmail(req) || '').trim().toLowerCase(),
    };

    const { error, value } = gulfApplicationSchema.validate(normalizedPayload);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const app = await GulfApplication.create({
      ...value,
      userId: resolveUserId(req),
      visaStatus: 'Applied',
      timeline: [{ status: 'Applied', note: 'Application submitted', date: new Date() }],
      source: 'direct-application',
    });

    return res.status(201).json({
      success: true,
      message: 'Gulf application submitted.',
      data: app,
    });
  } catch (error) {
    logger.error('gulf applications create error:', error);
    return res.status(500).json({ success: false, message: 'Unable to submit Gulf application.' });
  }
});

router.get('/applications/my', authenticate, async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const email = resolveUserEmail(req);
    if (!userId && !email) {
      return res.status(400).json({ success: false, message: 'Authenticated user identity is required.' });
    }

    const query =
      userId && email
        ? { $or: [{ userId }, { email }] }
        : userId
          ? { userId }
          : { email };
    const applications = await GulfApplication.find(query).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ success: true, data: applications });
  } catch (error) {
    logger.error('gulf applications my error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch your Gulf applications.' });
  }
});

router.get('/admin/applications', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { visaStatus, country, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query, { page: 1, limit: 50, maxLimit: 500 });
    const filter = {};
    if (visaStatus) filter.visaStatus = String(visaStatus).trim();
    if (country) filter.country = String(country).trim();
    if (search) {
      const rx = new RegExp(String(search).trim(), 'i');
      filter.$or = [{ name: rx }, { phone: rx }, { passportNo: rx }, { jobTitle: rx }, { company: rx }];
    }

    const [applications, totalCount] = await Promise.all([
      GulfApplication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      GulfApplication.countDocuments(filter),
    ]);
    const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
    return res.json({
      success: true,
      data: applications,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
      },
    });
  } catch (error) {
    logger.error('gulf applications admin list error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch admin Gulf applications.' });
  }
});

router.get('/admin/analytics', authenticate, verifyAdmin, async (req, res) => {
  try {
    const [applications, pendingRecruiters, activeRecruiters, attestations, emergencies, jobApplications, fraudReports, recruiterSlaRecords, fraudSlaRecords, emergencySlaRecords] = await Promise.all([
      GulfApplication.aggregate([
        { $group: { _id: '$visaStatus', count: { $sum: 1 } } },
      ]),
      GulfRecruiter.countDocuments({ status: 'pending' }),
      GulfRecruiter.countDocuments({ verified: true, status: 'active' }),
      GulfAttestationRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      GulfEmergencyCase.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      GulfJobApplication.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      GulfFraudReport.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      GulfRecruiter.find({
        verifiedAt: { $exists: true, $ne: null },
        verificationRequestedAt: { $exists: true, $ne: null },
      })
        .select('verificationRequestedAt verifiedAt')
        .lean(),
      GulfFraudReport.find({ status: { $in: ['resolved', 'rejected'] } })
        .select('createdAt updatedAt')
        .lean(),
      GulfEmergencyCase.find({ status: { $ne: 'received' } })
        .select('createdAt updatedAt')
        .lean(),
    ]);

    const applicationStatusCounts = applications.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});
    const attestationStatusCounts = attestations.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});
    const emergencyStatusCounts = emergencies.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});
    const jobApplicationStatusCounts = jobApplications.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});
    const fraudStatusCounts = fraudReports.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});
    const totalApplications = Object.values(applicationStatusCounts).reduce((sum, value) => sum + Number(value || 0), 0);
    const travelReadyApplications = Number(applicationStatusCounts['Travel Ready'] || 0);
    const travelReadyConversionRate = totalApplications > 0
      ? Number(((travelReadyApplications / totalApplications) * 100).toFixed(2))
      : 0;

    return res.json({
      success: true,
      data: {
        applicationStatusCounts,
        pendingRecruiterCount: pendingRecruiters,
        activeRecruiterCount: activeRecruiters,
        attestationStatusCounts,
        emergencyStatusCounts,
        jobApplicationStatusCounts,
        fraudStatusCounts,
        funnelMetrics: {
          totalApplications,
          travelReadyApplications,
          travelReadyConversionRate,
          dropoffByStatus: applicationStatusCounts,
        },
        slaMetrics: {
          recruiterVerificationAvgHours: averageHours(recruiterSlaRecords, 'verificationRequestedAt', 'verifiedAt'),
          fraudResolutionAvgHours: averageHours(fraudSlaRecords, 'createdAt', 'updatedAt'),
          emergencyResponseAvgHours: averageHours(emergencySlaRecords, 'createdAt', 'updatedAt'),
        },
      },
    });
  } catch (error) {
    logger.error('gulf admin analytics error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch admin analytics.' });
  }
});

router.put('/admin/applications/:id/status', authenticate, verifyAdmin, async (req, res) => {
  try {
    const payload = {
      ...req.body,
      agentName: String(req.body?.agentName || '').trim(),
      adminNote: String(req.body?.adminNote || '').trim(),
    };
    const { error, value } = gulfAdminStatusSchema.validate(payload);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const existing = await GulfApplication.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const timeline = Array.isArray(existing.timeline) ? [...existing.timeline] : [];
    timeline.push({
      status: value.visaStatus,
      note: value.adminNote || `Status updated by admin${value.agentName ? ` (${value.agentName})` : ''}`,
      date: new Date(),
    });

    const updated = await GulfApplication.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          visaStatus: value.visaStatus,
          agentName: value.agentName || '',
          agentVerified: Boolean(value.agentVerified),
          adminNote: value.adminNote || '',
          timeline,
        },
      },
      { new: true }
    );

    try {
      await recordAdminAudit(req, {
        entityType: 'gulf_application',
        entityId: String(existing._id || ''),
        action: 'application_status_updated',
        before: {
          visaStatus: existing.visaStatus || '',
          agentName: existing.agentName || '',
          agentVerified: Boolean(existing.agentVerified),
          adminNote: existing.adminNote || '',
        },
        after: {
          visaStatus: updated?.visaStatus || value.visaStatus,
          agentName: updated?.agentName || value.agentName || '',
          agentVerified: Boolean(updated?.agentVerified),
          adminNote: updated?.adminNote || value.adminNote || '',
        },
        note: value.adminNote || '',
      });
    } catch (auditError) {
      logger.warn('gulf applications admin audit create error:', auditError);
    }

    return res.json({ success: true, data: updated, message: 'Gulf application updated.' });
  } catch (error) {
    logger.error('gulf applications admin status error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update Gulf application.' });
  }
});

// ============ DOCUMENT ATTESTATION ============
router.post('/attestation/request', applicationLimiter, documentUploadLimiter, docUpload.single('document'), async (req, res) => {
  try {
    const normalizedPayload = {
      ...req.body,
      phone: normalizePhone(req.body?.phone),
    };

    const { error, value } = attestationRequestSchema.validate(normalizedPayload);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const attestation = await GulfAttestationRequest.create({
      ...value,
      requestId: `ATT-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      documentFile: req.file ? req.file.filename : null,
      status: 'document_received',
      timeline: [{ status: 'document_received', date: new Date(), note: 'Document received' }],
      createdAt: new Date(),
    });

    // Basic virus-scan placeholder for uploaded document
    if (req.file && req.file.path) {
      try {
        await scanFile(req.file.path);
      } catch (scanErr) {
        try {
          if (attestation && attestation._id) await GulfAttestationRequest.findByIdAndDelete(attestation._id);
        } catch (e) {
          logger.error('cleanup error after failed scan (attestation):', e);
        }
        try {
          if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        } catch (e) {
          logger.error('cleanup error after failed scan (file):', e);
        }
        return res.status(400).json({ success: false, message: 'Uploaded document failed security checks.' });
      }
    }
    logger.info('Attestation request created:', attestation.requestId);

    res.status(201).json({
      success: true,
      message: 'Attestation request submitted. Tracking ID: ' + attestation.requestId,
      data: { requestId: attestation.requestId },
    });
  } catch (error) {
    logger.error('attestation error:', error);
    res.status(500).json({ success: false, message: 'Unable to submit attestation request.' });
  }
});

router.get('/attestation/track/:requestId', optionalToken, async (req, res) => {
  try {
    const queryEmail = String(req.query.email || '').trim().toLowerCase();
    const authEmail = resolveUserEmail(req);
    const requesterEmail = authEmail || queryEmail;
    if (!requesterEmail) {
      return res.status(400).json({ success: false, message: 'Email is required to track this request.' });
    }

    const attestation = await GulfAttestationRequest.findOne({ requestId: req.params.requestId });
    if (!attestation) return res.status(404).json({ success: false, message: 'Attestation request not found.' });
    const ownerEmail = String(attestation.email || '').trim().toLowerCase();
    const isAdmin = hasAdminPrivileges(req.user || {});
    if (!isAdmin && ownerEmail !== requesterEmail) {
      return res.status(403).json({ success: false, message: 'You are not authorized to access this request.' });
    }

    res.json({
      success: true,
      data: {
        requestId: attestation.requestId,
        status: attestation.status,
        timeline: attestation.timeline || [],
        attestation,
      },
    });
  } catch (error) {
    logger.error('attestation track error:', error);
    res.status(500).json({ success: false, message: 'Unable to track attestation.' });
  }
});

// ============ TRAVEL / MEDICAL / RETURN / NRI SERVICES ============
router.post('/travel/request', applicationLimiter, async (req, res) => {
  try {
    const normalizedPayload = {
      ...req.body,
      phone: normalizePhone(req.body?.phone),
      email: String(req.body?.email || '').trim().toLowerCase(),
    };
    const { error, value } = travelSupportSchema.validate(normalizedPayload);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const support = await GulfTravelSupport.create({
      supportId: `TRV-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      fullName: value.fullName,
      email: value.email,
      phone: value.phone,
      serviceType: value.serviceType,
      details: value.details || '',
      status: 'requested',
    });

    return res.status(201).json({
      success: true,
      message: 'Travel support request submitted.',
      data: { supportId: support.supportId },
    });
  } catch (error) {
    logger.error('travel support request error:', error);
    return res.status(500).json({ success: false, message: 'Unable to submit travel support request.' });
  }
});

router.post('/medical/request', applicationLimiter, async (req, res) => {
  try {
    const normalizedPayload = {
      ...req.body,
      phone: normalizePhone(req.body?.phone),
      email: String(req.body?.email || '').trim().toLowerCase(),
    };
    const { error, value } = medicalBookingSchema.validate(normalizedPayload);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const booking = await GulfMedicalBooking.create({
      bookingId: `MED-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      fullName: value.fullName,
      email: value.email,
      phone: value.phone,
      country: value.country,
      appointmentDate: value.appointmentDate ? new Date(value.appointmentDate) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: 'scheduled',
    });

    return res.status(201).json({
      success: true,
      message: 'Medical booking request submitted.',
      data: { bookingId: booking.bookingId },
    });
  } catch (error) {
    logger.error('medical support request error:', error);
    return res.status(500).json({ success: false, message: 'Unable to submit medical booking request.' });
  }
});

router.post('/returnee/request', applicationLimiter, async (req, res) => {
  try {
    const normalizedPayload = {
      ...req.body,
      phone: normalizePhone(req.body?.phone),
      email: String(req.body?.email || '').trim().toLowerCase(),
    };
    const { error, value } = returneeServiceSchema.validate(normalizedPayload);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const service = await GulfReturneeService.create({
      serviceId: `RET-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      email: value.email,
      fullName: value.fullName,
      serviceCategory: value.serviceCategory,
      details: value.details || '',
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Returnee support request submitted.',
      data: { serviceId: service.serviceId },
    });
  } catch (error) {
    logger.error('returnee support request error:', error);
    return res.status(500).json({ success: false, message: 'Unable to submit returnee support request.' });
  }
});

router.post('/nri/request', applicationLimiter, async (req, res) => {
  try {
    const normalizedPayload = {
      ...req.body,
      phone: normalizePhone(req.body?.phone),
      email: String(req.body?.email || '').trim().toLowerCase(),
    };
    const { error, value } = nriServiceSchema.validate(normalizedPayload);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const service = await GulfNRIService.create({
      serviceId: `NRI-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      email: value.email,
      fullName: value.fullName,
      serviceType: value.serviceType,
      details: value.details || '',
      status: 'open',
    });

    return res.status(201).json({
      success: true,
      message: 'NRI support request submitted.',
      data: { serviceId: service.serviceId },
    });
  } catch (error) {
    logger.error('nri support request error:', error);
    return res.status(500).json({ success: false, message: 'Unable to submit NRI support request.' });
  }
});

router.get('/services/track/:serviceType/:requestId', optionalToken, async (req, res) => {
  try {
    const serviceType = String(req.params.serviceType || '').trim().toLowerCase();
    const requestId = String(req.params.requestId || '').trim();
    const queryEmail = String(req.query.email || '').trim().toLowerCase();
    const authEmail = resolveUserEmail(req);
    if (!queryEmail && !authEmail) {
      return res.status(400).json({ success: false, message: 'Email is required to track this request.' });
    }

    let record = null;
    if (serviceType === 'travel') {
      record = await GulfTravelSupport.findOne({ supportId: requestId }).lean();
    } else if (serviceType === 'medical') {
      record = await GulfMedicalBooking.findOne({ bookingId: requestId }).lean();
    } else if (serviceType === 'returnee') {
      record = await GulfReturneeService.findOne({ serviceId: requestId }).lean();
    } else if (serviceType === 'nri') {
      record = await GulfNRIService.findOne({ serviceId: requestId }).lean();
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported service type for tracking.' });
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const ownerEmail = String(record.email || '').trim().toLowerCase();
    const isAdmin = hasAdminPrivileges(req.user || {});
    const requesterEmail = authEmail || queryEmail;
    if (!isAdmin) {
      if (!ownerEmail) {
        return res.status(403).json({
          success: false,
          message: 'Unable to verify request ownership. Please contact support.',
        });
      }
      if (requesterEmail !== ownerEmail) {
        return res.status(403).json({ success: false, message: 'You are not authorized to access this request.' });
      }
    }

    return res.json({ success: true, data: { serviceType, record } });
  } catch (error) {
    logger.error('generic service track error:', error);
    return res.status(500).json({ success: false, message: 'Unable to track service request.' });
  }
});

// ============ USER DASHBOARD ============
router.get('/user/dashboard', authenticate, async (req, res) => {
  try {
    const email = String(req.user?.email || '').trim().toLowerCase();
    const userId = resolveUserId(req);
    if (!email && !userId) {
      return res.status(400).json({ success: false, message: 'Authenticated identity is required for dashboard.' });
    }

    const lookupByIdentity = userId && email ? { $or: [{ userId }, { email }] } : userId ? { userId } : { email };

    const emailQuery = email ? { email } : { _id: null };

    const [visaRequests, jobApplications, attestations, medicalBookings, travelRequests, returneeRequests, nriRequests, applications] = await Promise.all([
      GulfVisaRequest.find(emailQuery).sort({ createdAt: -1 }).limit(10),
      GulfJobApplication.find(emailQuery).sort({ createdAt: -1 }).limit(10),
      GulfAttestationRequest.find(emailQuery).sort({ createdAt: -1 }).limit(10),
      GulfMedicalBooking.find(emailQuery).sort({ createdAt: -1 }).limit(5),
      GulfTravelSupport.find(emailQuery).sort({ createdAt: -1 }).limit(10),
      GulfReturneeService.find(emailQuery).sort({ createdAt: -1 }).limit(10),
      GulfNRIService.find(emailQuery).sort({ createdAt: -1 }).limit(10),
      GulfApplication.find(lookupByIdentity).sort({ createdAt: -1 }).limit(25),
    ]);

    const dashboard = {
      visaRequests: visaRequests.map((v) => ({ requestId: v.requestId, country: v.country, status: v.status, createdAt: v.createdAt })),
      jobApplications: jobApplications.map((a) => ({ applicationId: a.applicationId, status: a.status, createdAt: a.createdAt })),
      attestations: attestations.map((a) => ({ requestId: a.requestId, documentType: a.documentType, status: a.status, createdAt: a.createdAt })),
      medicalBookings: medicalBookings.map((m) => ({ bookingId: m.bookingId, status: m.status, date: m.appointmentDate })),
      travelRequests: travelRequests.map((t) => ({ supportId: t.supportId, serviceType: t.serviceType, status: t.status, createdAt: t.createdAt })),
      returneeRequests: returneeRequests.map((r) => ({ serviceId: r.serviceId, serviceCategory: r.serviceCategory, status: r.status, createdAt: r.createdAt })),
      nriRequests: nriRequests.map((n) => ({ serviceId: n.serviceId, serviceType: n.serviceType, status: n.status, createdAt: n.createdAt })),
      applications: applications.map((item) => ({
        id: toObjectIdString(item._id),
        visaStatus: item.visaStatus,
        jobTitle: item.jobTitle,
        country: item.country,
        createdAt: item.createdAt,
      })),
      pendingActions: visaRequests.filter((v) => v.status === 'submitted').length +
        jobApplications.filter((a) => a.status === 'submitted').length +
        attestations.filter((a) => a.status === 'document_received').length +
        applications.filter((item) => item.visaStatus === 'Applied').length,
    };

    res.json({ success: true, data: { dashboard } });
  } catch (error) {
    logger.error('dashboard error:', error);
    res.status(500).json({ success: false, message: 'Unable to load dashboard.' });
  }
});

// ============ EMERGENCY SERVICES ============
router.post('/emergency/report', emergencyLimiter, async (req, res) => {
  try {
    const normalizedPayload = {
      ...req.body,
      phone: normalizePhone(req.body?.phone),
    };
    const { error, value } = emergencySchema.validate(normalizedPayload);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const { issueType, description, phone, country, message } = value;

    const emergency = await GulfEmergencyCase.create({
      caseId: `EMG-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      issueType,
      description,
      phone,
      country,
      message,
      status: 'received',
      createdAt: new Date(),
    });

    logger.info('Emergency case created:', emergency.caseId);
    // Send alert to configured emergency webhook (if present)
    try {
      const alertPayload = {
        caseId: emergency.caseId,
        issueType,
        description,
        phone,
        country,
        message,
        createdAt: emergency.createdAt,
      };
      const alertResult = await sendEmergencyAlert(alertPayload);
      logger.info('Emergency alert result:', alertResult);
    } catch (alertErr) {
      logger.error('Emergency alert failed:', alertErr);
    }

    res.status(201).json({
      success: true,
      message: 'Emergency reported. Our team is notified. Case ID: ' + emergency.caseId,
      data: { caseId: emergency.caseId },
    });
  } catch (error) {
    logger.error('emergency report error:', error);
    res.status(500).json({ success: false, message: 'Unable to report emergency.' });
  }
});

// ============ TRUSTED RECRUITERS ============
router.get('/recruiters/verified', async (req, res) => {
  try {
    let recruiters = await GulfRecruiter.find({ verified: true, status: 'active' })
      .select('name licenseNumber registrationNumber successCases rating reviews country')
      .limit(50)
      .lean();

    if (!recruiters.length) {
      recruiters = SAMPLE_RECRUITERS;
    }

    recruiters = recruiters.map((recruiter) => ({
      id: toObjectIdString(recruiter.id || recruiter._id),
      name: recruiter.name,
      licenseNumber: recruiter.licenseNumber,
      registrationNumber: recruiter.registrationNumber,
      successCases: Number(recruiter.successCases || 0),
      rating: Number(recruiter.rating || 0),
      reviews: Number(recruiter.reviews || 0),
      country: recruiter.country || '',
      verified: recruiter.verified !== false,
      status: recruiter.status || 'active',
    }));

    res.json({ success: true, data: { recruiters, count: recruiters.length } });
  } catch (error) {
    logger.error('recruiters fetch error:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch recruiters.' });
  }
});

// ============ PAYMENTS (SCAFFOLD) ============
router.post('/payments/create', paymentsCreateLimiter, optionalToken, async (req, res) => {
  try {
    const payload = req.body || {};
    const amount = Number(payload.amount || 0);
    const currency = String(payload.currency || 'usd').toLowerCase();
    const description = String(payload.description || '').trim();
    const metadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};
    const idempotencyKey = String(req.get('x-idempotency-key') || req.get('idempotency-key') || '').trim();

    if (!Number.isFinite(amount) || amount < PAYMENT_MIN_AMOUNT || amount > PAYMENT_MAX_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Amount must be between ${PAYMENT_MIN_AMOUNT} and ${PAYMENT_MAX_AMOUNT}.`,
      });
    }

    if (!ALLOWED_PAYMENT_CURRENCIES.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: `Currency must be one of: ${ALLOWED_PAYMENT_CURRENCIES.join(', ')}.`,
      });
    }

    if (!stripe) {
      logger.warn('Stripe not configured for payments.create');
      return res.status(501).json({ success: false, message: 'Payment provider not configured.' });
    }

    if (idempotencyKey) {
      const cacheKey = buildPaymentCacheKey(req, payload, idempotencyKey);
      const cached = await readPaymentCache(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          message: 'Reused existing payment intent for idempotent request.',
        });
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      description,
      metadata: {
        ...metadata,
        service: metadata.service || String(payload.type || 'unknown'),
        type: String(payload.type || metadata.type || ''),
        id: String(payload.id || metadata.id || ''),
        referenceId: String(payload.id || metadata.id || ''),
      },
    }, idempotencyKey ? { idempotencyKey } : undefined);

    const responsePayload = {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
      metadata: paymentIntent.metadata,
    };

    if (idempotencyKey) {
      const cacheKey = buildPaymentCacheKey(req, payload, idempotencyKey);
      const caller = resolveUserId(req) || resolveUserEmail(req) || String(req.ip || 'anonymous');
      await writePaymentCache(cacheKey, responsePayload, idempotencyKey, caller);
    }

    return res.json({
      success: true,
      data: responsePayload,
    });
  } catch (error) {
    logger.error('payments.create error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create payment.' });
  }
});

router.post('/payments/webhook', async (req, res) => {
  let eventRecord = null;
  try {
    const webhookSecret = String(process.env.GULF_STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    const signature = String(req.get('stripe-signature') || '').trim();

    if (!stripe || !webhookSecret) {
      logger.error('payments.webhook configuration error: Stripe is not configured.');
      return res.status(503).json({ success: false, message: 'Payment webhook is not configured.' });
    }
    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing Stripe signature.' });
    }
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({ success: false, message: 'Invalid webhook payload format.' });
    }

    const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

    logger.info('payments.webhook', { eventType: event?.type || 'unknown' });

    const payload = event?.data?.object;
    const eventType = String(event?.type || 'unknown');
    const eventId = String(event?.id || '').trim();

    if (eventId) {
      try {
        eventRecord = await GulfPaymentWebhookEvent.create({
          eventId,
          eventType,
          status: 'processing',
        });
      } catch (err) {
        if (Number(err?.code) === 11000) {
          return res.json({ received: true, duplicate: true });
        }
        throw err;
      }
    }

    if (eventType === 'payment_intent.succeeded' && payload) {
      const pi = payload;
      const metadata = pi.metadata || {};
      const refType = metadata.type;
      const refId = metadata.id;

      if (refType === 'attestation') {
        await GulfAttestationRequest.findOneAndUpdate(
          { requestId: refId },
          { $set: { paymentStatus: 'paid', paymentId: pi.id, amount: (pi.amount_received || pi.amount || 0) / 100 } }
        );
      } else if (refType === 'application') {
        if (!isMongoObjectId(refId)) {
          logger.warn('payments.webhook invalid application reference id', { refId });
        } else {
          await GulfApplication.findOneAndUpdate(
            { _id: refId },
            { $set: { paymentStatus: 'paid', paymentId: pi.id, amount: (pi.amount_received || pi.amount || 0) / 100 } }
          );
        }
      }
    }

    if (eventRecord && eventRecord._id) {
      await GulfPaymentWebhookEvent.findByIdAndUpdate(eventRecord._id, {
        $set: {
          status: 'processed',
          processedAt: new Date(),
          failureReason: '',
        },
      });
    }

    res.json({ received: true });
  } catch (error) {
    if (eventRecord && eventRecord._id) {
      await GulfPaymentWebhookEvent.findByIdAndUpdate(eventRecord._id, {
        $set: {
          status: 'failed',
          processedAt: new Date(),
          failureReason: String(error?.message || '').slice(0, 500),
        },
      }).catch(() => {});
    }
    const signatureError = String(error?.message || '').toLowerCase().includes('signature');
    logger.error('payments.webhook error:', error);
    res.status(signatureError ? 400 : 500).json({
      success: false,
      message: signatureError ? 'Invalid Stripe signature.' : 'Webhook handler failed.',
    });
  }
});

// ============ RECRUITER APPLICATIONS & VERIFICATION ============
router.post('/recruiters/apply', documentUploadLimiter, docUpload.single('kycDocument'), async (req, res) => {
  try {
    const normalizedPayload = {
      ...req.body,
      phone: normalizePhone(req.body?.phone),
      email: String(req.body?.email || '').trim().toLowerCase(),
    };
    const { error, value } = recruiterApplicationSchema.validate(normalizedPayload);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const recruiterName = String(value.fullName || value.name || '').trim();
    if (!recruiterName) {
      return res.status(400).json({ success: false, message: 'Recruiter name and country are required.' });
    }

    const kycFiles = req.file ? [req.file.filename] : [];

    const recruiter = await GulfRecruiter.create({
      name: recruiterName,
      companyName: String(value.companyName || '').trim(),
      licenseNumber: String(value.licenseNumber || '').trim(),
      registrationNumber: String(value.registrationNumber || '').trim(),
      country: String(value.country || '').trim(),
      phone: String(value.phone || '').trim(),
      email: String(value.email || '').trim().toLowerCase(),
      website: String(value.website || '').trim(),
      experienceSummary: String(value.experienceSummary || '').trim(),
      verified: false,
      status: 'pending',
      kycDocuments: kycFiles,
      verificationRequestedAt: new Date(),
    });

    if (req.file && req.file.path) {
      try {
        await scanFile(req.file.path);
      } catch (scanErr) {
        logger.error('recruiter apply scan failed:', scanErr);
        try {
          if (recruiter && recruiter._id) await GulfRecruiter.findByIdAndDelete(recruiter._id);
        } catch (e) {
          logger.error('cleanup error removing recruiter after failed scan:', e);
        }
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          logger.error('cleanup error removing recruiter file after failed scan:', e);
        }
        return res.status(400).json({ success: false, message: 'Uploaded KYC document failed security checks.' });
      }
    }

    return res.status(201).json({ success: true, message: 'Recruiter application submitted.', data: { id: recruiter._id } });
  } catch (error) {
    logger.error('recruiter apply error:', error);
    res.status(500).json({ success: false, message: 'Unable to submit recruiter application.' });
  }
});

router.get('/admin/recruiters/pending', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { page: 1, limit: 50, maxLimit: 200 });
    const filter = { status: 'pending' };
    const [pending, totalCount] = await Promise.all([
      GulfRecruiter.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      GulfRecruiter.countDocuments(filter),
    ]);
    const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
    return res.json({
      success: true,
      data: pending,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
      },
    });
  } catch (error) {
    logger.error('admin recruiters pending error:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch pending recruiters.' });
  }
});

router.put('/admin/recruiters/:id/verify', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { verified, notes } = req.body || {};
    const rec = await GulfRecruiter.findById(req.params.id);
    if (!rec) return res.status(404).json({ success: false, message: 'Recruiter not found.' });

    const previousState = {
      verified: Boolean(rec.verified),
      status: String(rec.status || ''),
      verificationNotes: String(rec.verificationNotes || ''),
      verifiedAt: rec.verifiedAt || null,
    };

    rec.verified = Boolean(verified);
    rec.status = rec.verified ? 'active' : 'rejected';
    rec.verificationNotes = String(notes || '').trim();
    rec.verifiedAt = rec.verified ? new Date() : rec.verifiedAt;

    await rec.save();
    try {
      await recordAdminAudit(req, {
        entityType: 'gulf_recruiter',
        entityId: String(rec._id || ''),
        action: 'recruiter_verification_updated',
        before: previousState,
        after: {
          verified: Boolean(rec.verified),
          status: String(rec.status || ''),
          verificationNotes: String(rec.verificationNotes || ''),
          verifiedAt: rec.verifiedAt || null,
        },
        note: String(notes || '').trim(),
      });
    } catch (auditError) {
      logger.warn('gulf recruiter verify audit create error:', auditError);
    }
    return res.json({ success: true, data: rec, message: rec.verified ? 'Recruiter verified.' : 'Recruiter marked as rejected.' });
  } catch (error) {
    logger.error('admin recruiter verify error:', error);
    res.status(500).json({ success: false, message: 'Unable to update recruiter.' });
  }
});

// ============ REPORT FRAUD ============
router.post('/fraud/report', fraudReportLimiter, async (req, res) => {
  try {
    const normalizedPayload = {
      ...req.body,
      phone: normalizePhone(req.body?.phone),
    };
    const { error, value } = fraudReportSchema.validate(normalizedPayload);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { recruiterId, issueDescription, phone } = value;

    const report = await GulfFraudReport.create({
      reportId: `FRD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      recruiterId: recruiterId || '',
      issueDescription,
      phone,
      status: 'open',
      source: 'gulf-services',
    });

    logger.warn('Fraud report submitted:', {
      reportId: report.reportId,
      recruiterId,
      phoneHash: crypto.createHash('sha256').update(phone).digest('hex').slice(0, 12),
    });

    res.json({
      success: true,
      message: 'Fraud report submitted. Our team will investigate.',
      data: { reportId: report.reportId },
    });
  } catch (error) {
    logger.error('fraud report error:', error);
    res.status(500).json({ success: false, message: 'Unable to submit fraud report.' });
  }
});

router.get('/admin/fraud-reports', authenticate, verifyAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const { page, limit, skip } = parsePagination(req.query, { page: 1, limit: 50, maxLimit: 500 });
    const filter = status ? { status } : {};
    const [reports, totalCount] = await Promise.all([
      GulfFraudReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      GulfFraudReport.countDocuments(filter),
    ]);
    const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
    return res.json({
      success: true,
      data: reports,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
      },
    });
  } catch (error) {
    logger.error('admin fraud reports fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch fraud reports.' });
  }
});

router.put('/admin/fraud-reports/:reportId/status', authenticate, verifyAdmin, async (req, res) => {
  try {
    const { error, value } = fraudAdminStatusSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const reportId = String(req.params.reportId || '').trim();
    const report = await GulfFraudReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Fraud report not found.' });
    }

    const previousState = {
      status: String(report.status || ''),
      adminNote: String(report.adminNote || ''),
    };

    report.status = value.status;
    report.adminNote = String(value.adminNote || '').trim();
    await report.save();

    try {
      await recordAdminAudit(req, {
        entityType: 'gulf_fraud_report',
        entityId: reportId,
        action: 'fraud_report_status_updated',
        before: previousState,
        after: {
          status: String(report.status || ''),
          adminNote: String(report.adminNote || ''),
        },
        note: String(value.adminNote || '').trim(),
      });
    } catch (auditError) {
      logger.warn('gulf fraud report admin audit create error:', auditError);
    }

    return res.json({ success: true, data: report, message: 'Fraud report updated.' });
  } catch (error) {
    logger.error('admin fraud report status update error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update fraud report.' });
  }
});

router.use((error, _req, res, next) => {
  if (!error) return next();

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: error.code === 'LIMIT_FILE_SIZE' ? 'Uploaded file exceeds 10MB limit.' : 'File upload failed.',
    });
  }

  if (error.message === 'Invalid file format') {
    return res.status(400).json({
      success: false,
      message: 'Unsupported file format. Upload PDF, JPG, PNG, DOC, or DOCX files only.',
    });
  }

  return next(error);
});

module.exports = router;
