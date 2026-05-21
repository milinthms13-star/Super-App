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
const { authenticate, verifyAdmin, optionalToken } = require('../middleware/auth');
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
  'Visa Approved',
  'Visa Stamped',
  'Travel Ready',
  'Rejected',
];

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

// ============ FILE UPLOADS ============
const uploadsRoot = path.join(__dirname, '../uploads/gulfservices');
const documentUploads = path.join(uploadsRoot, 'documents');
const cvUploads = path.join(uploadsRoot, 'cv');
const passportUploads = path.join(uploadsRoot, 'passport');

[uploadsRoot, documentUploads, cvUploads, passportUploads].forEach((dir) => {
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
const passportUpload = createUploader(passportUploads);

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
  passportNo: Joi.string().trim().min(6).max(20).allow(''),
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
    // Allow if authenticated owner or admin, otherwise require matching email query param
    if (authEmail) {
      if (authEmail !== ownerEmail && !(req.user && req.user.isAdmin)) {
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
      passportNo: normalizePassportNo(req.body?.passportNo),
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
    const filter = {};
    if (visaStatus) filter.visaStatus = String(visaStatus).trim();
    if (country) filter.country = String(country).trim();
    if (search) {
      const rx = new RegExp(String(search).trim(), 'i');
      filter.$or = [{ name: rx }, { phone: rx }, { passportNo: rx }, { jobTitle: rx }, { company: rx }];
    }

    const applications = await GulfApplication.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    return res.json({ success: true, data: applications });
  } catch (error) {
    logger.error('gulf applications admin list error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch admin Gulf applications.' });
  }
});

router.get('/admin/analytics', authenticate, verifyAdmin, async (req, res) => {
  try {
    const [applications, pendingRecruiters, activeRecruiters, attestations, emergencies, jobApplications] = await Promise.all([
      GulfApplication.aggregate([
        { $group: { _id: '$visaStatus', count: { $sum: 1 } } },
      ]),
      GulfRecruiter.countDocuments({ status: 'pending' }),
      GulfRecruiter.countDocuments({ verified: true, status: 'active' }),
      GulfAttestationRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      GulfEmergencyCase.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      GulfJobApplication.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    return res.json({
      success: true,
      data: {
        applicationStatusCounts: applications.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        pendingRecruiterCount: pendingRecruiters,
        activeRecruiterCount: activeRecruiters,
        attestationStatusCounts: attestations.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        emergencyStatusCounts: emergencies.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        jobApplicationStatusCounts: jobApplications.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
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

router.get('/attestation/track/:requestId', async (req, res) => {
  try {
    const requesterEmail = String(req.query.email || '').trim().toLowerCase();
    if (!requesterEmail) {
      return res.status(400).json({ success: false, message: 'Email is required to track this request.' });
    }

    const attestation = await GulfAttestationRequest.findOne({ requestId: req.params.requestId });
    if (!attestation) return res.status(404).json({ success: false, message: 'Attestation request not found.' });
    if (String(attestation.email || '').trim().toLowerCase() !== requesterEmail) {
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

// ============ USER DASHBOARD ============
router.get('/user/dashboard', authenticate, async (req, res) => {
  try {
    const email = String(req.user?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Authenticated user email is required for dashboard.' });
    }

    const [visaRequests, jobApplications, attestations, medicalBookings] = await Promise.all([
      GulfVisaRequest.find({ email }).sort({ createdAt: -1 }).limit(10),
      GulfJobApplication.find({ email }).sort({ createdAt: -1 }).limit(10),
      GulfAttestationRequest.find({ email }).sort({ createdAt: -1 }).limit(10),
      GulfMedicalBooking.find({ email }).sort({ createdAt: -1 }).limit(5),
    ]);

    const dashboard = {
      visaRequests: visaRequests.map((v) => ({ requestId: v.requestId, country: v.country, status: v.status, createdAt: v.createdAt })),
      jobApplications: jobApplications.map((a) => ({ applicationId: a.applicationId, status: a.status, createdAt: a.createdAt })),
      attestations: attestations.map((a) => ({ requestId: a.requestId, documentType: a.documentType, status: a.status, createdAt: a.createdAt })),
      medicalBookings: medicalBookings.map((m) => ({ bookingId: m.bookingId, status: m.status, date: m.appointmentDate })),
      pendingActions: visaRequests.filter((v) => v.status === 'submitted').length +
        jobApplications.filter((a) => a.status === 'submitted').length,
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
router.post('/payments/create', optionalToken, async (req, res) => {
  try {
    const payload = req.body || {};
    const amount = Number(payload.amount || 0);
    const currency = String(payload.currency || 'usd').toLowerCase();
    const description = String(payload.description || '').trim();
    const metadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }

    if (!stripe) {
      logger.warn('Stripe not configured for payments.create');
      return res.status(501).json({ success: false, message: 'Payment provider not configured.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      description,
      metadata: {
        ...metadata,
        service: metadata.service || String(payload.type || 'unknown'),
        referenceId: String(payload.id || metadata.id || ''),
      },
    });

    return res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
        metadata: paymentIntent.metadata,
      },
    });
  } catch (error) {
    logger.error('payments.create error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create payment.' });
  }
});

router.post('/payments/webhook', async (req, res) => {
  try {
    const event = req.body || {};
    logger.info('payments.webhook', { eventType: event.type || 'unknown' });

    // Best-effort handling for Stripe-like payloads
    const payload = event.data && event.data.object ? event.data.object : event;
    const eventType = event.type || 'unknown';

    if (eventType === 'payment_intent.succeeded' || payload.status === 'succeeded') {
      const pi = payload;
      const metadata = pi.metadata || {};
      const refType = metadata.type;
      const refId = metadata.id;
      // Update attestation or application records
      if (refType === 'attestation') {
        await GulfAttestationRequest.findOneAndUpdate({ requestId: refId }, { $set: { paymentStatus: 'paid', paymentId: pi.id, amount: (pi.amount_received || pi.amount || 0) / 100 } });
      } else if (refType === 'application') {
        await GulfApplication.findOneAndUpdate({ _id: refId }, { $set: { paymentStatus: 'paid', paymentId: pi.id, amount: (pi.amount_received || pi.amount || 0) / 100 } });
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('payments.webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook handler failed.' });
  }
});

// ============ RECRUITER APPLICATIONS & VERIFICATION ============
router.post('/recruiters/apply', documentUploadLimiter, docUpload.single('kycDocument'), async (req, res) => {
  try {
    const {
      fullName,
      name,
      companyName,
      licenseNumber,
      registrationNumber,
      country,
      experienceSummary,
      website,
    } = req.body || {};

    const recruiterName = String(fullName || name || '').trim();
    if (!recruiterName || !country) {
      return res.status(400).json({ success: false, message: 'Recruiter name and country are required.' });
    }

    const kycFiles = req.file ? [req.file.filename] : [];

    const recruiter = await GulfRecruiter.create({
      name: recruiterName,
      companyName: String(companyName || '').trim(),
      licenseNumber: String(licenseNumber || '').trim(),
      registrationNumber: String(registrationNumber || '').trim(),
      country: String(country).trim(),
      website: String(website || '').trim(),
      experienceSummary: String(experienceSummary || '').trim(),
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
    const pending = await GulfRecruiter.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ success: true, data: pending });
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

    rec.verified = Boolean(verified);
    rec.status = rec.verified ? 'active' : 'rejected';
    rec.verificationNotes = String(notes || '').trim();
    rec.verifiedAt = rec.verified ? new Date() : rec.verifiedAt;

    await rec.save();
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

    logger.warn('Fraud report submitted:', { recruiterId, issueDescription, phone });

    res.json({
      success: true,
      message: 'Fraud report submitted. Our team will investigate.',
      data: { reportId: `FRD-${Date.now()}` },
    });
  } catch (error) {
    logger.error('fraud report error:', error);
    res.status(500).json({ success: false, message: 'Unable to submit fraud report.' });
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
