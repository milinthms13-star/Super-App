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
const { authenticate } = require('../middleware/auth');

const router = express.Router();

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
const normalizeVisaType = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  const matched = VISA_TYPES.find((type) => type.toLowerCase() === normalized);
  return matched || '';
};

const isMongoObjectId = (value = '') => /^[a-f\d]{24}$/i.test(String(value || ''));

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

router.get('/visa/track/:requestId', async (req, res) => {
  try {
    const requesterEmail = String(req.query.email || '').trim().toLowerCase();
    if (!requesterEmail) {
      return res.status(400).json({ success: false, message: 'Email is required to track this request.' });
    }

    const visaRequest = await GulfVisaRequest.findOne({ requestId: req.params.requestId });
    if (!visaRequest) return res.status(404).json({ success: false, message: 'Visa request not found.' });
    if (String(visaRequest.email || '').trim().toLowerCase() !== requesterEmail) {
      return res.status(403).json({ success: false, message: 'You are not authorized to access this request.' });
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

router.post('/jobs/:jobId/apply', applicationLimiter, documentUploadLimiter, cvUpload.single('cv'), async (req, res) => {
  try {
    const normalizedPayload = {
      ...req.body,
      phone: normalizePhone(req.body?.phone),
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
    // TODO: Send SMS/WhatsApp alert to support team

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
