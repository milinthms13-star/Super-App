const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const EmployerProfile = require('../models/EmployerProfile');
const JobSavedJob = require('../models/JobSavedJob');
const JobReport = require('../models/JobReport');
const JobPortalEvent = require('../models/JobPortalEvent');
const User = require('../models/User');
const { authenticateToken, verifyAdmin } = require('../middleware/auth');
const {
  computeSemanticMatchScore,
  generateCareerAssistantResponse,
  assessJobReportRisk,
} = require('../services/jobPortalAiService');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/jobportal/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const extension = String(path.extname(file.originalname || '') || '').toLowerCase();
    const mimeType = String(file.mimetype || '').toLowerCase();
    const allowedMimeTypes = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/webm',
    ]);
    const allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.mp4', '.webm', '.mp3', '.wav']);

    if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(mimeType)) {
      cb(new Error('Invalid file type'));
      return;
    }
    cb(null, true);
  }
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadDir = path.join(__dirname, '../uploads/jobportal');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const APPLICATION_STATUSES = ['Applied', 'Viewed', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];
const PHONE_REGEX = /^\+?[0-9][0-9\s-]{7,14}$/;
const LICENSE_REGEX = /^[A-Za-z0-9/-]{5,30}$/;
const MODERATION_STATUSES = ['pending', 'in_review', 'resolved', 'dismissed', 'escalated'];

const parsePositiveInt = (value, fallback, { min = 1, max = 100 } = {}) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

const mapRiskToPriority = (riskLevel = '', riskScore = 0) => {
  const normalizedRisk = String(riskLevel || '').trim().toLowerCase();
  if (normalizedRisk === 'critical' || riskScore >= 85) return 'urgent';
  if (normalizedRisk === 'high' || riskScore >= 70) return 'high';
  if (normalizedRisk === 'medium' || riskScore >= 45) return 'medium';
  return 'low';
};

const trackJobPortalEvent = async ({
  eventType,
  userId = null,
  jobId = null,
  applicationId = null,
  metadata = {},
  source = 'web',
} = {}) => {
  try {
    await JobPortalEvent.create({
      eventType,
      userId,
      jobId,
      applicationId,
      metadata,
      source,
    });
  } catch (_error) {
    // Non-blocking tracking.
  }
};

const normalizeArrayField = (value = '') =>
  Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const normalizeSkill = (value = '') => String(value || '').trim().toLowerCase();

const calculateMatchScore = (jobSkills = [], applicantSkills = []) => {
  const normalizedJobSkills = normalizeArrayField(jobSkills).map(normalizeSkill).filter(Boolean);
  const normalizedApplicantSkills = normalizeArrayField(applicantSkills).map(normalizeSkill).filter(Boolean);

  if (!normalizedJobSkills.length && !normalizedApplicantSkills.length) {
    return { score: 50, matchedSkills: [] };
  }

  if (!normalizedApplicantSkills.length) {
    return { score: 45, matchedSkills: [] };
  }

  const matchedSkills = normalizedJobSkills.filter((skill) => normalizedApplicantSkills.includes(skill));
  const uniqueMatchedSkills = Array.from(new Set(matchedSkills));
  const score = Math.min(100, 50 + uniqueMatchedSkills.length * 15);
  return { score, matchedSkills: uniqueMatchedSkills };
};

const parseSalaryNumbers = (salaryText = '') => {
  const matches = String(salaryText || '')
    .replace(/,/g, '')
    .match(/\d+(\.\d+)?/g);
  if (!matches || !matches.length) return { salaryMin: 0, salaryMax: 0 };
  const numbers = matches.map((item) => Number(item)).filter(Number.isFinite);
  if (!numbers.length) return { salaryMin: 0, salaryMax: 0 };
  return {
    salaryMin: Math.min(...numbers),
    salaryMax: Math.max(...numbers),
  };
};

const postJobValidationSchema = Joi.object({
  title: Joi.string().trim().min(3).max(140).required(),
  company: Joi.string().trim().min(2).max(140).required(),
  location: Joi.string().trim().min(2).max(140).required(),
  district: Joi.string().trim().allow('').max(80),
  type: Joi.string().valid('local', 'gulf', 'it', 'gig').required(),
  subtype: Joi.string().trim().min(2).max(120).required(),
  salary: Joi.string().trim().min(3).max(80).required(),
  experience: Joi.string().trim().min(2).max(80).required(),
  description: Joi.string().trim().min(30).max(4000).required(),
  requirements: Joi.string().trim().allow('').max(2000),
  benefits: Joi.string().allow(''),
  skills: Joi.string().allow(''),
  jobType: Joi.string().valid('fulltime', 'parttime', 'contract', 'freelance', 'temporary').allow(''),
  workMode: Joi.string().valid('onsite', 'remote', 'hybrid').allow(''),
  contactEmail: Joi.string().email().required(),
  contactPhone: Joi.string().pattern(PHONE_REGEX).required(),
  companyWebsite: Joi.string().uri().allow(''),
  isUrgent: Joi.boolean().default(false),
  isFeatured: Joi.boolean().default(false),
  visaType: Joi.string().allow('').max(80),
  accommodationProvided: Joi.boolean().default(false),
  contractTerms: Joi.string().allow('').max(2000),
  agencyLicenseNumber: Joi.string().allow('').max(40),
  medicalInsuranceProvided: Joi.boolean().default(false),
  returnTicketProvided: Joi.boolean().default(false),
  overtimePolicy: Joi.string().allow('').max(300),
  warningNotes: Joi.string().allow('').max(500),
});

const mobileEventSchema = Joi.object({
  eventType: Joi.string()
    .valid(
      'screen_view',
      'api_error',
      'deep_link_open',
      'offline_action_queued',
      'offline_queue_flushed',
      'background_refresh',
      'notification_registered'
    )
    .required(),
  source: Joi.string().trim().max(24).allow(''),
  metadata: Joi.object().unknown(true).default({}),
  jobId: Joi.string().trim().allow(''),
});

const registerDeviceSchema = Joi.object({
  token: Joi.string().trim().min(8).max(500).required(),
  platform: Joi.string().valid('web', 'ios', 'android').default('web'),
  deviceId: Joi.string().trim().max(120).allow(''),
  appVersion: Joi.string().trim().max(40).allow(''),
  pushEnabled: Joi.boolean().default(false),
});

const JOBPORTAL_OVERVIEW_CACHE_TTL_MS = Math.max(
  30000,
  Number.parseInt(String(process.env.JOBPORTAL_OVERVIEW_CACHE_TTL_MS || '120000'), 10) || 120000
);
const JOBPORTAL_CRON_SECRET = String(process.env.JOBPORTAL_CRON_SECRET || '').trim();
const ENABLE_JOBPORTAL_OVERVIEW_CACHE =
  String(process.env.JOBPORTAL_ENABLE_OVERVIEW_CACHE || 'true').trim().toLowerCase() !== 'false';

let overview360MarketplaceCache = {
  cachedAt: 0,
  data: null,
};

const invalidateOverview360MarketplaceCache = () => {
  overview360MarketplaceCache = {
    cachedAt: 0,
    data: null,
  };
};

const getJobPortalRequestId = (req) =>
  String(req.headers['x-vercel-id'] || req.headers['x-request-id'] || '').trim() ||
  `local-${Date.now()}`;

const logJobPortalRoute = ({ level = 'info', route = '', requestId = '', event = '', meta = {} }) => {
  const payload = {
    level,
    module: 'jobportal',
    route,
    event,
    requestId,
    ts: new Date().toISOString(),
    ...meta,
  };
  const serialized = JSON.stringify(payload);
  if (level === 'error') {
    console.error(serialized);
    return;
  }
  console.log(serialized);
};

const readCronSecretFromRequest = (req) => {
  const authHeader = String(req.headers.authorization || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return String(req.headers['x-cron-secret'] || '').trim();
};

const buildMarketplaceOverviewSnapshot = async () => {
  const startedAt = Date.now();
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [
    totalActiveJobs,
    jobsByTypeAgg,
    topLocationsAgg,
    topSkillsAgg,
    topSubtypesAgg,
    salaryByTypeAgg,
    verifiedEmployersCount,
    totalEmployersCount,
    urgentJobsCount,
    newJobsLast7Days,
    newJobsPrevious7Days,
    eventCountsLast30Days,
    moderationSummary,
    selectedApplicationsLast30Days,
    gulfJobsCount,
    itJobsCount,
    gigJobsCount,
  ] = await Promise.all([
    Job.countDocuments({ isActive: true }),
    Job.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Job.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    Job.aggregate([
      { $match: { isActive: true } },
      { $unwind: { path: '$skills', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$skills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).then((results) => results.filter((entry) => entry._id)),
    Job.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$subtype', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    Job.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$type',
          averageMin: { $avg: '$salaryMin' },
          averageMax: { $avg: '$salaryMax' },
          count: { $sum: 1 },
        },
      },
    ]),
    EmployerProfile.countDocuments({ isVerified: true }),
    EmployerProfile.countDocuments({}),
    Job.countDocuments({ isActive: true, isUrgent: true }),
    Job.countDocuments({ isActive: true, postedAt: { $gte: sevenDaysAgo } }),
    Job.countDocuments({ isActive: true, postedAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }),
    JobPortalEvent.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
    ]),
    JobReport.aggregate([
      {
        $group: {
          _id: '$moderationStatus',
          count: { $sum: 1 },
          highRiskCount: {
            $sum: {
              $cond: [{ $gte: ['$riskScore', 70] }, 1, 0],
            },
          },
        },
      },
    ]),
    JobApplication.countDocuments({
      status: { $in: ['Selected', 'hired'] },
      updatedAt: { $gte: thirtyDaysAgo },
    }),
    Job.countDocuments({ isActive: true, type: 'gulf' }),
    Job.countDocuments({ isActive: true, type: 'it' }),
    Job.countDocuments({ isActive: true, type: 'gig' }),
  ]);

  const salaryStats = salaryByTypeAgg.map((entry) => ({
    type: entry._id || 'Unknown',
    averageMin: Math.round(entry.averageMin || 0),
    averageMax: Math.round(entry.averageMax || 0),
    count: entry.count,
  }));

  const averageSalaryMin = salaryStats.length
    ? Math.round(salaryStats.reduce((sum, item) => sum + item.averageMin, 0) / salaryStats.length)
    : 0;
  const averageSalaryMax = salaryStats.length
    ? Math.round(salaryStats.reduce((sum, item) => sum + item.averageMax, 0) / salaryStats.length)
    : 0;

  const eventCountMap = eventCountsLast30Days.reduce((acc, entry) => {
    acc[String(entry._id || '')] = entry.count;
    return acc;
  }, {});
  const moderationByStatus = moderationSummary.reduce(
    (acc, entry) => {
      const key = String(entry._id || 'pending').toLowerCase();
      acc[key] = entry.count || 0;
      acc.highRisk += Number(entry.highRiskCount || 0);
      return acc;
    },
    { pending: 0, in_review: 0, resolved: 0, dismissed: 0, escalated: 0, highRisk: 0 }
  );
  const forecastGrowthRatio = newJobsPrevious7Days > 0 ? newJobsLast7Days / newJobsPrevious7Days : 1;
  const projectedNewJobsNext7Days = Math.max(
    0,
    Math.round(newJobsLast7Days * Math.max(0.6, Math.min(1.6, forecastGrowthRatio)))
  );

  const totalViews30 = Number(eventCountMap.job_view || 0);
  const totalSaves30 = Number(eventCountMap.job_save || 0);
  const totalApplies30 = Number(eventCountMap.job_apply || 0);
  const totalSelected30 = Number(selectedApplicationsLast30Days || 0);
  const viewToSaveRate = totalViews30 ? Math.round((totalSaves30 / totalViews30) * 100) : 0;
  const saveToApplyRate = totalSaves30 ? Math.round((totalApplies30 / totalSaves30) * 100) : 0;
  const applyToSelectionRate = totalApplies30 ? Math.round((totalSelected30 / totalApplies30) * 100) : 0;

  const marketplace = {
    totalActiveJobs,
    jobsByType: jobsByTypeAgg.map((entry) => ({ type: entry._id || 'Unknown', count: entry.count })),
    topLocations: topLocationsAgg.map((entry) => ({ location: entry._id || 'Unknown', count: entry.count })),
    topSkills: topSkillsAgg.map((entry) => ({ skill: entry._id || 'Unknown', count: entry.count })),
    topRoles: topSubtypesAgg.map((entry) => ({ role: entry._id || 'Unknown', count: entry.count })),
    salaryStats,
    averageSalaryMin,
    averageSalaryMax,
    verifiedEmployers: verifiedEmployersCount,
    totalEmployers: totalEmployersCount,
    gulfJobs: gulfJobsCount,
    itJobs: itJobsCount,
    gigJobs: gigJobsCount,
    urgentJobs: urgentJobsCount,
    newJobsLast7Days,
    newJobsPrevious7Days,
    projectedNewJobsNext7Days,
    demandTrend: forecastGrowthRatio >= 1.05 ? 'up' : forecastGrowthRatio <= 0.95 ? 'down' : 'stable',
    funnel: {
      viewToSaveRate,
      saveToApplyRate,
      applyToSelectionRate,
      totalsLast30Days: {
        views: totalViews30,
        saves: totalSaves30,
        applies: totalApplies30,
        statusUpdates: totalSelected30,
      },
    },
    moderation: {
      pendingReports: moderationByStatus.pending + moderationByStatus.in_review,
      resolvedReports: moderationByStatus.resolved,
      escalatedReports: moderationByStatus.escalated,
      highRiskReports: moderationByStatus.highRisk,
    },
  };

  const recommendedActions = [];
  if (marketplace.funnel.viewToSaveRate < 8) {
    recommendedActions.push(
      'Improve job card quality (clear salary, benefits, verification badge) to raise saves.'
    );
  }
  if (marketplace.funnel.saveToApplyRate < 20) {
    recommendedActions.push('Simplify application flow and reduce mandatory fields to improve apply conversion.');
  }
  if (marketplace.moderation.highRiskReports > 0) {
    recommendedActions.push('Prioritize moderation of high-risk reports to protect candidates from scams.');
  }
  if (marketplace.demandTrend === 'down') {
    recommendedActions.push('Run employer outreach campaigns in high-demand categories to stabilize inventory.');
  }
  marketplace.recommendedActions = recommendedActions;

  return {
    marketplace,
    topSkillsRaw: topSkillsAgg,
    computedAt: new Date().toISOString(),
    buildDurationMs: Date.now() - startedAt,
  };
};

const getMarketplaceOverviewSnapshot = async ({ forceRebuild = false } = {}) => {
  const now = Date.now();
  const cacheIsFresh =
    ENABLE_JOBPORTAL_OVERVIEW_CACHE &&
    !forceRebuild &&
    overview360MarketplaceCache.data &&
    now - overview360MarketplaceCache.cachedAt <= JOBPORTAL_OVERVIEW_CACHE_TTL_MS;

  if (cacheIsFresh) {
    return {
      ...overview360MarketplaceCache.data,
      cacheHit: true,
      cacheAgeMs: now - overview360MarketplaceCache.cachedAt,
    };
  }

  const snapshot = await buildMarketplaceOverviewSnapshot();
  if (ENABLE_JOBPORTAL_OVERVIEW_CACHE) {
    overview360MarketplaceCache = {
      cachedAt: Date.now(),
      data: snapshot,
    };
  }

  return {
    ...snapshot,
    cacheHit: false,
    cacheAgeMs: 0,
  };
};

// Job Routes

// Get all jobs with filters
router.get('/jobs', async (req, res) => {
  try {
    const {
      type,
      subtype,
      location,
      experience,
      skills,
      applicantSkills,
      district,
      quickFilter,
      q,
      page = 1,
      limit = 20,
      sort = '-postedAt'
    } = req.query;

    const query = { isActive: true };
    const parsedPage = parsePositiveInt(page, 1, { min: 1, max: 10000 });
    const parsedLimit = parsePositiveInt(limit, 20, { min: 1, max: 100 });

    if (type) query.type = type;
    if (subtype) query.subtype = subtype;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (district) query.district = { $regex: district, $options: 'i' };
    if (experience) query.experience = experience;
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query.skills = { $in: skillsArray };
    }
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { company: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } }
      ];
    }

    if (quickFilter === 'remote' || quickFilter === 'wfh') query.workMode = 'remote';
    if (quickFilter === 'it') query.type = 'it';
    if (quickFilter === 'gulf') query.type = 'gulf';
    if (quickFilter === 'urgent') query.isUrgent = true;
    if (quickFilter === 'high-salary') query.salaryMax = { $gte: 75000 };

    const jobs = await Job.find(query)
      .populate('postedBy', 'name email')
      .sort(sort)
      .limit(parsedLimit)
      .skip((parsedPage - 1) * parsedLimit)
      .select('-__v');
    const applicantSkillsList = normalizeArrayField(applicantSkills);
    const jobsWithMatch = applicantSkillsList.length
      ? await Promise.all(
          jobs.map(async (job) => {
            const semanticMatch = await computeSemanticMatchScore({
              jobTitle: job.title,
              jobDescription: job.description,
              jobSkills: job.skills,
              applicantSkills: applicantSkillsList,
            });
            return {
              ...job.toObject(),
              aiMatchScore: semanticMatch.score,
              matchedSkills: semanticMatch.matchedSkills,
              aiMatchBreakdown: {
                lexicalScore: semanticMatch.lexicalScore,
                semanticScore: semanticMatch.semanticScore,
                provider: semanticMatch.provider,
                model: semanticMatch.model,
              },
            };
          })
        )
      : jobs;

    const total = await Job.countDocuments(query);
    const hasPersonalization = applicantSkillsList.length > 0 || Boolean(req.headers.authorization);
    if (hasPersonalization) {
      res.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    } else {
      res.set('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=300');
      res.set('Vercel-CDN-Cache-Control', 'public, s-maxage=45, stale-while-revalidate=300');
      res.set('CDN-Cache-Control', 'public, s-maxage=45, stale-while-revalidate=300');
    }

    res.json({
      success: true,
      data: jobsWithMatch,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ success: false, message: 'Error fetching jobs' });
  }
});

// Get job by ID
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('postedBy', 'name email')
      .populate({
        path: 'postedBy',
        populate: {
          path: 'employerProfile',
          model: 'EmployerProfile'
        }
      });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Increment view count
    await Job.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    await trackJobPortalEvent({
      eventType: 'job_view',
      userId: req.user?.id || null,
      jobId: req.params.id,
      metadata: {
        type: job.type,
        location: job.location,
      },
    });

    res.json({ success: true, data: job });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ success: false, message: 'Error fetching job' });
  }
});

// Create new job (Employer only)
router.post('/jobs', authenticateToken, upload.array('documents', 5), async (req, res) => {
  try {
    const employerProfile = await EmployerProfile.findOne({ userId: req.user.id });
    if (!employerProfile) {
      return res.status(403).json({ success: false, message: 'Employer profile required' });
    }

    // Check job posting limit
    if (employerProfile.jobsPosted >= employerProfile.jobPostingLimit) {
      return res.status(403).json({ success: false, message: 'Job posting limit reached' });
    }

    const { error, value } = postJobValidationSchema.validate(req.body, { abortEarly: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    if (value.type === 'gulf') {
      if (!employerProfile.isVerified) {
        return res.status(403).json({
          success: false,
          message: 'Gulf jobs require verified employer/agency KYC.'
        });
      }

      if (!LICENSE_REGEX.test(String(value.agencyLicenseNumber || '').trim())) {
        return res.status(400).json({
          success: false,
          message: 'Valid Gulf agency license number is required for Gulf jobs.'
        });
      }

      if (!String(value.visaType || '').trim() || !String(value.contractTerms || '').trim()) {
        return res.status(400).json({
          success: false,
          message: 'Visa type and contract terms are required for Gulf jobs.'
        });
      }
    }

    const salaryNumbers = parseSalaryNumbers(value.salary);

    const jobData = {
      ...value,
      postedBy: req.user.id,
      skills: normalizeArrayField(value.skills),
      benefits: normalizeArrayField(value.benefits),
      contactEmail: String(value.contactEmail || '').trim().toLowerCase(),
      contactPhone: String(value.contactPhone || '').trim(),
      salaryMin: salaryNumbers.salaryMin,
      salaryMax: salaryNumbers.salaryMax,
      isVerified: Boolean(employerProfile.isVerified),
      gulfSafetyChecklist: {
        agencyLicenseNumber: String(value.agencyLicenseNumber || '').trim(),
        medicalInsuranceProvided: Boolean(value.medicalInsuranceProvided),
        returnTicketProvided: Boolean(value.returnTicketProvided),
        overtimePolicy: String(value.overtimePolicy || '').trim(),
        warningNotes:
          String(value.warningNotes || '').trim() ||
          (value.type === 'gulf'
            ? 'Never pay recruitment charges in cash. Verify offer letter and visa details before travel.'
            : '')
      }
    };

    const job = new Job(jobData);
    await job.save();
    invalidateOverview360MarketplaceCache();

    // Update employer stats
    await EmployerProfile.findByIdAndUpdate(employerProfile._id, {
      $inc: { jobsPosted: 1, activeJobs: 1 }
    });
    await trackJobPortalEvent({
      eventType: 'job_posted',
      userId: req.user.id,
      jobId: job._id,
      metadata: {
        type: job.type,
        isUrgent: Boolean(job.isUrgent),
      },
    });

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ success: false, message: 'Error creating job' });
  }
});

// Update job
router.put('/jobs/:id', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const candidatePayload = { ...job.toObject(), ...req.body };
    const { error, value } = postJobValidationSchema.validate(candidatePayload, { abortEarly: true, allowUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const employerProfile = await EmployerProfile.findOne({ userId: req.user.id });
    if (value.type === 'gulf') {
      if (!employerProfile?.isVerified) {
        return res.status(403).json({
          success: false,
          message: 'Gulf jobs require verified employer/agency KYC.'
        });
      }
      if (!LICENSE_REGEX.test(String(value.agencyLicenseNumber || '').trim())) {
        return res.status(400).json({
          success: false,
          message: 'Valid Gulf agency license number is required for Gulf jobs.'
        });
      }
    }
    const salaryNumbers = parseSalaryNumbers(value.salary);

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      {
        ...value,
        skills: normalizeArrayField(value.skills),
        benefits: normalizeArrayField(value.benefits),
        contactEmail: String(value.contactEmail || '').trim().toLowerCase(),
        contactPhone: String(value.contactPhone || '').trim(),
        salaryMin: salaryNumbers.salaryMin,
        salaryMax: salaryNumbers.salaryMax,
        gulfSafetyChecklist: {
          agencyLicenseNumber: String(value.agencyLicenseNumber || '').trim(),
          medicalInsuranceProvided: Boolean(value.medicalInsuranceProvided),
          returnTicketProvided: Boolean(value.returnTicketProvided),
          overtimePolicy: String(value.overtimePolicy || '').trim(),
          warningNotes:
            String(value.warningNotes || '').trim() ||
            (value.type === 'gulf'
              ? 'Never pay recruitment charges in cash. Verify offer letter and visa details before travel.'
              : '')
        }
      },
      { new: true }
    );
    invalidateOverview360MarketplaceCache();
    await trackJobPortalEvent({
      eventType: 'job_updated',
      userId: req.user.id,
      jobId: req.params.id,
      metadata: {
        type: updatedJob?.type,
        isActive: updatedJob?.isActive !== false,
      },
    });

    res.json({ success: true, data: updatedJob });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ success: false, message: 'Error updating job' });
  }
});

// Delete job
router.delete('/jobs/:id', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Job.findByIdAndUpdate(req.params.id, { isActive: false });
    invalidateOverview360MarketplaceCache();

    // Update employer stats
    const employerProfile = await EmployerProfile.findOne({ userId: req.user.id });
    if (employerProfile) {
      await EmployerProfile.findByIdAndUpdate(employerProfile._id, {
        $inc: { activeJobs: -1 }
      });
    }

    await trackJobPortalEvent({
      eventType: 'job_updated',
      userId: req.user.id,
      jobId: req.params.id,
      metadata: {
        action: 'deactivate',
      },
    });

    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ success: false, message: 'Error deleting job' });
  }
});

// Job Application Routes

// Apply for job
router.post('/jobs/:id/apply', authenticateToken, upload.single('resume'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job || !job.isActive) {
      return res.status(404).json({ success: false, message: 'Job not found or inactive' });
    }

    // Check if already applied
    const existingApplication = await JobApplication.findOne({
      jobId: req.params.id,
      applicantId: req.user.id
    });

    if (existingApplication) {
      return res.status(400).json({ success: false, message: 'Already applied for this job' });
    }

    const profile = await JobSeekerProfile.findOne({ userId: req.user.id }).lean();
    const applicantSkills = normalizeArrayField(req.body.skills || profile?.skills || []);
    const matchResult = await computeSemanticMatchScore({
      jobTitle: job.title,
      jobDescription: job.description,
      jobSkills: job.skills,
      applicantSkills,
      applicantContext: [
        `Experience: ${String(profile?.experience || '')}`,
        `ExpectedSalary: ${String(req.body.expectedSalary || profile?.expectedSalary || '')}`,
        `Availability: ${String(req.body.availability || profile?.availability || '')}`,
      ]
        .filter(Boolean)
        .join(' | '),
    });
    const fallbackEmail = String(profile?.email || req.user.email || '').trim().toLowerCase();
    const fallbackName = String(profile?.fullName || req.user.name || '').trim();
    const fallbackPhone = String(profile?.phone || '').trim();

    const applicationData = {
      jobId: req.params.id,
      applicantId: req.user.id,
      name: String(req.body.name || fallbackName || '').trim(),
      email: String(req.body.email || fallbackEmail || '').trim().toLowerCase(),
      phone: String(req.body.phone || fallbackPhone || '').trim(),
      skills: applicantSkills,
      matchScore: matchResult.score,
      lexicalMatchScore: matchResult.lexicalScore,
      semanticMatchScore: matchResult.semanticScore,
      matchedSkills: matchResult.matchedSkills,
      matchProvider: matchResult.provider,
      matchModel: matchResult.model,
      coverLetter: req.body.coverLetter,
      expectedSalary: req.body.expectedSalary,
      availability: req.body.availability,
      resumeUrl: req.file ? `/uploads/jobportal/${req.file.filename}` : String(req.body.resumeUrl || '').trim() || null
    };

    const application = new JobApplication(applicationData);
    await application.save();
    invalidateOverview360MarketplaceCache();

    // Update job application count
    await Job.findByIdAndUpdate(req.params.id, { $inc: { applicationCount: 1 } });

    // Update employer stats
    const employerProfile = await EmployerProfile.findOne({ userId: job.postedBy });
    if (employerProfile) {
      await EmployerProfile.findByIdAndUpdate(employerProfile._id, {
        $inc: { totalApplications: 1 }
      });
    }
    await trackJobPortalEvent({
      eventType: 'job_apply',
      userId: req.user.id,
      jobId: req.params.id,
      applicationId: application._id,
      metadata: {
        matchScore: matchResult.score,
        lexicalMatchScore: matchResult.lexicalScore,
        semanticMatchScore: matchResult.semanticScore,
      },
    });

    res.status(201).json({ success: true, data: application });
  } catch (error) {
    console.error('Error applying for job:', error);
    res.status(500).json({ success: false, message: 'Error applying for job' });
  }
});

// Get applications for a job (Employer only)
router.get('/jobs/:id/applications', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const applications = await JobApplication.find({ jobId: req.params.id })
      .populate('applicantId', 'name email')
      .populate({
        path: 'applicantId',
        populate: {
          path: 'jobSeekerProfile',
          model: 'JobSeekerProfile'
        }
      })
      .sort({ matchScore: -1, appliedAt: -1 });

    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ success: false, message: 'Error fetching applications' });
  }
});

// Update application status
router.put('/applications/:id', authenticateToken, async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id).populate('jobId');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.jobId.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const statusMap = {
      applied: 'Applied',
      viewed: 'Viewed',
      shortlisted: 'Shortlisted',
      interview: 'Interview',
      interviewed: 'Interview',
      selected: 'Selected',
      hired: 'Selected',
      rejected: 'Rejected'
    };
    const requestedStatus = String(req.body.status || '').trim();
    const normalizedStatus =
      APPLICATION_STATUSES.includes(requestedStatus)
        ? requestedStatus
        : statusMap[requestedStatus.toLowerCase()];

    if (!normalizedStatus) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${APPLICATION_STATUSES.join(', ')}`
      });
    }

    const updatedApplication = await JobApplication.findByIdAndUpdate(
      req.params.id,
      {
        status: normalizedStatus,
        notes: req.body.notes,
        interviewScheduled: req.body.interviewScheduled,
        interviewNotes: req.body.interviewNotes,
        rating: req.body.rating,
        feedback: req.body.feedback
      },
      { new: true }
    );
    invalidateOverview360MarketplaceCache();

    if (normalizedStatus === 'Selected') {
      await EmployerProfile.findOneAndUpdate(
        { userId: req.user.id },
        { $inc: { hiredCount: 1 } }
      );
    }

    await trackJobPortalEvent({
      eventType: 'job_status_update',
      userId: req.user.id,
      jobId: application.jobId?._id || application.jobId,
      applicationId: updatedApplication._id,
      metadata: {
        status: normalizedStatus,
      },
    });

    res.json({ success: true, data: updatedApplication });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ success: false, message: 'Error updating application' });
  }
});

// Profile Routes

// Get or create job seeker profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    let profile = await JobSeekerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      const account = await User.findById(req.user.id).lean();
      profile = new JobSeekerProfile({
        userId: req.user.id,
        fullName: account?.name || req.user.name || 'Job Seeker',
        email: account?.email || req.user.email || 'unknown@example.com',
        phone: account?.phone || ''
      });
      await profile.save();
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
});

// Update job seeker profile
router.put('/profile', authenticateToken, upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'videoIntro', maxCount: 1 },
  { name: 'voiceResume', maxCount: 1 }
]), async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Handle file uploads
    if (req.files) {
      if (req.files.resume && req.files.resume[0]) {
        updateData.resume = {
          url: `/uploads/jobportal/${req.files.resume[0].filename}`,
          filename: req.files.resume[0].originalname
        };
      }
      if (req.files.videoIntro && req.files.videoIntro[0]) {
        updateData.videoIntro = {
          url: `/uploads/jobportal/${req.files.videoIntro[0].filename}`,
          filename: req.files.videoIntro[0].originalname
        };
      }
      if (req.files.voiceResume && req.files.voiceResume[0]) {
        updateData.voiceResume = {
          url: `/uploads/jobportal/${req.files.voiceResume[0].filename}`,
          filename: req.files.voiceResume[0].originalname
        };
      }
    }

    // Handle arrays
    if (updateData.skills) {
      updateData.skills = Array.isArray(updateData.skills)
        ? updateData.skills
        : updateData.skills.split(',').map(s => s.trim());
    }
    if (updateData.languages) {
      updateData.languages = Array.isArray(updateData.languages)
        ? updateData.languages
        : updateData.languages.split(',').map(l => l.trim());
    }
    if (updateData.preferredLocations) {
      updateData.preferredLocations = Array.isArray(updateData.preferredLocations)
        ? updateData.preferredLocations
        : updateData.preferredLocations.split(',').map(l => l.trim());
    }

    updateData.lastUpdated = new Date();

    // Calculate profile completeness
    const completeness = calculateProfileCompleteness(updateData);
    updateData.profileCompleteness = completeness;

    const profile = await JobSeekerProfile.findOneAndUpdate(
      { userId: req.user.id },
      updateData,
      { new: true, upsert: true }
    );

    await trackJobPortalEvent({
      eventType: 'profile_update',
      userId: req.user.id,
      metadata: {
        profileCompleteness: profile?.profileCompleteness || 0,
        hasResume: Boolean(profile?.resume?.url),
        hasSkills: Array.isArray(profile?.skills) && profile.skills.length > 0,
      },
    });

    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
});

router.post('/notifications/register', authenticateToken, async (req, res) => {
  try {
    const { error, value } = registerDeviceSchema.validate(req.body || {}, { abortEarly: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const profile = await JobSeekerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Job seeker profile not found.' });
    }

    const currentSubscriptions = Array.isArray(profile.pushSubscriptions) ? profile.pushSubscriptions : [];
    const tokenKey = String(value.token || '').trim();
    const withoutToken = currentSubscriptions.filter(
      (item) => String(item?.token || '').trim() !== tokenKey
    );
    const normalizedSubscription = {
      token: tokenKey,
      platform: value.platform || 'web',
      deviceId: String(value.deviceId || '').trim(),
      appVersion: String(value.appVersion || '').trim(),
      pushEnabled: Boolean(value.pushEnabled),
      lastSeenAt: new Date(),
      createdAt: new Date(),
    };

    profile.pushSubscriptions = [...withoutToken, normalizedSubscription].slice(-10);
    await profile.save();

    await trackJobPortalEvent({
      eventType: 'notification_registered',
      userId: req.user.id,
      metadata: {
        platform: normalizedSubscription.platform,
        pushEnabled: normalizedSubscription.pushEnabled,
      },
      source: normalizedSubscription.platform,
    });

    res.status(201).json({
      success: true,
      data: {
        platform: normalizedSubscription.platform,
        pushEnabled: normalizedSubscription.pushEnabled,
      },
    });
  } catch (error) {
    console.error('Error registering jobportal notification device:', error);
    res.status(500).json({ success: false, message: 'Error registering notification device' });
  }
});

router.put('/notifications/preferences', authenticateToken, async (req, res) => {
  try {
    const enabled = Boolean(req.body?.enabled);
    const profile = await JobSeekerProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          'jobAlerts.enabled': enabled,
          lastUpdated: new Date(),
        },
      },
      { new: true }
    );
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Job seeker profile not found.' });
    }
    res.json({
      success: true,
      data: {
        enabled: Boolean(profile?.jobAlerts?.enabled),
      },
    });
  } catch (error) {
    console.error('Error updating jobportal notification preferences:', error);
    res.status(500).json({ success: false, message: 'Error updating notification preferences' });
  }
});

router.post('/events', authenticateToken, async (req, res) => {
  try {
    const { error, value } = mobileEventSchema.validate(req.body || {}, { abortEarly: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const metadata = value.metadata && typeof value.metadata === 'object' ? value.metadata : {};
    await trackJobPortalEvent({
      eventType: value.eventType,
      userId: req.user.id,
      jobId: value.jobId || null,
      metadata,
      source: value.source || 'mobile',
    });
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error tracking jobportal client event:', error);
    res.status(500).json({ success: false, message: 'Error tracking event' });
  }
});

// Employer profile routes
router.get('/employer/profile', authenticateToken, async (req, res) => {
  try {
    let profile = await EmployerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      const account = await User.findById(req.user.id).lean();
      profile = new EmployerProfile({
        userId: req.user.id,
        companyName: account?.businessName || account?.name || 'My Company',
        companyType: 'sme',
        location: account?.location || 'Kerala',
        contactEmail: account?.email || req.user.email || 'unknown@example.com',
        contactPhone: account?.phone || '',
        industry: account?.profession || 'General',
      });
      await profile.save();
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching employer profile:', error);
    res.status(500).json({ success: false, message: 'Error fetching employer profile' });
  }
});

router.put('/employer/profile', authenticateToken, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'documents', maxCount: 5 }
]), async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.files) {
      if (req.files.logo && req.files.logo[0]) {
        updateData.logo = {
          url: `/uploads/jobportal/${req.files.logo[0].filename}`,
          filename: req.files.logo[0].originalname
        };
      }
      if (req.files.documents) {
        updateData.verificationDocuments = req.files.documents.map(file => ({
          type: req.body.documentTypes ? req.body.documentTypes[file.fieldname] : 'other',
          url: `/uploads/jobportal/${file.filename}`,
          filename: file.originalname
        }));
      }
    }

    if (updateData.preferredSkills) {
      updateData.preferredSkills = Array.isArray(updateData.preferredSkills)
        ? updateData.preferredSkills
        : updateData.preferredSkills.split(',').map(s => s.trim());
    }

    const profile = await EmployerProfile.findOneAndUpdate(
      { userId: req.user.id },
      updateData,
      { new: true, upsert: true }
    );

    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error updating employer profile:', error);
    res.status(500).json({ success: false, message: 'Error updating employer profile' });
  }
});

// Get my applications (Job seeker)
router.get('/my-applications', authenticateToken, async (req, res) => {
  try {
    const applications = await JobApplication.find({ applicantId: req.user.id })
      .populate({
        path: 'jobId',
        select: 'title company location salary type status workMode'
      })
      .sort('-appliedAt');

    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ success: false, message: 'Error fetching applications' });
  }
});

router.post('/jobs/:id/report', authenticateToken, async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim();
    const details = String(req.body.details || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Reason is required.' });
    }

    const job = await Job.findById(req.params.id).lean();
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const riskAssessment = await assessJobReportRisk({
      reason,
      details,
      job,
    });
    const priority = mapRiskToPriority(riskAssessment.riskLevel, riskAssessment.riskScore);

    const updated = await Job.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          reports: {
            reportedBy: req.user.id,
            reason,
            details,
            riskScore: riskAssessment.riskScore,
            riskLevel: riskAssessment.riskLevel,
            riskCategories: riskAssessment.categories || [],
            moderationStatus: 'pending',
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const report = await JobReport.create({
      jobId: req.params.id,
      reportedBy: req.user.id,
      reason,
      details,
      riskScore: riskAssessment.riskScore,
      riskLevel: riskAssessment.riskLevel,
      riskCategories: riskAssessment.categories || [],
      moderationStatus: 'pending',
      priority,
    });
    invalidateOverview360MarketplaceCache();

    await trackJobPortalEvent({
      eventType: 'job_report',
      userId: req.user.id,
      jobId: req.params.id,
      metadata: {
        riskLevel: riskAssessment.riskLevel,
        riskScore: riskAssessment.riskScore,
        moderationStatus: 'pending',
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Report submitted for moderation.',
      data: {
        reportId: report._id,
        riskLevel: report.riskLevel,
        priority: report.priority,
        moderationStatus: report.moderationStatus,
      },
    });
  } catch (error) {
    console.error('Error reporting job:', error);
    return res.status(500).json({ success: false, message: 'Error reporting job' });
  }
});

router.get('/reports', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || '').trim().toLowerCase();
    const priority = String(req.query.priority || '').trim().toLowerCase();
    const page = parsePositiveInt(req.query.page, 1, { min: 1, max: 10000 });
    const limit = parsePositiveInt(req.query.limit, 20, { min: 1, max: 100 });
    const query = {};

    if (MODERATION_STATUSES.includes(status)) query.moderationStatus = status;
    if (['low', 'medium', 'high', 'urgent'].includes(priority)) query.priority = priority;

    const [reports, total] = await Promise.all([
      JobReport.find(query)
        .populate('jobId', 'title company type location isVerified')
        .populate('reportedBy', 'name email')
        .populate('assignedTo', 'name email')
        .sort({ riskScore: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      JobReport.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error loading job reports queue:', error);
    res.status(500).json({ success: false, message: 'Error loading job reports queue' });
  }
});

router.patch('/reports/:id/moderation', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const nextStatus = String(req.body.moderationStatus || '').trim().toLowerCase();
    const resolutionNote = String(req.body.resolutionNote || '').trim();
    if (!MODERATION_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid moderation status. Allowed: ${MODERATION_STATUSES.join(', ')}`,
      });
    }

    const updatePayload = {
      moderationStatus: nextStatus,
      assignedTo: req.user.id,
    };
    if (resolutionNote) updatePayload.resolutionNote = resolutionNote;
    if (nextStatus === 'resolved' || nextStatus === 'dismissed') {
      updatePayload.resolvedAt = new Date();
    }

    const report = await JobReport.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    invalidateOverview360MarketplaceCache();

    await Job.updateOne(
      { _id: report.jobId, 'reports.reportedBy': report.reportedBy, 'reports.reason': report.reason },
      {
        $set: {
          'reports.$.moderationStatus': nextStatus,
        },
      }
    );

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error updating report moderation:', error);
    res.status(500).json({ success: false, message: 'Error updating report moderation status' });
  }
});

// Saved jobs (Job seeker)
router.get('/saved-jobs', authenticateToken, async (req, res) => {
  try {
    const saved = await JobSavedJob.find({ userId: req.user.id })
      .populate({
        path: 'jobId',
        select: 'title company location salary salaryMin salaryMax type subtype isUrgent isVerified postedAt workMode district isActive',
      })
      .sort({ createdAt: -1 })
      .lean();

    const jobs = saved
      .filter((entry) => entry.jobId && entry.jobId.isActive !== false)
      .map((entry) => ({ ...entry.jobId, savedAt: entry.createdAt }));

    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error('Error loading saved jobs:', error);
    res.status(500).json({ success: false, message: 'Error loading saved jobs' });
  }
});

router.post('/saved-jobs/:jobId', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId).select('_id isActive');
    if (!job || !job.isActive) {
      return res.status(404).json({ success: false, message: 'Job not found or inactive' });
    }

    let saved = await JobSavedJob.findOne({ userId: req.user.id, jobId: req.params.jobId });
    if (!saved) {
      saved = await JobSavedJob.create({ userId: req.user.id, jobId: req.params.jobId });
      await trackJobPortalEvent({
        eventType: 'job_save',
        userId: req.user.id,
        jobId: req.params.jobId,
      });
    }

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving job:', error);
    res.status(500).json({ success: false, message: 'Error saving job' });
  }
});

router.delete('/saved-jobs/:jobId', authenticateToken, async (req, res) => {
  try {
    const deleted = await JobSavedJob.deleteOne({ userId: req.user.id, jobId: req.params.jobId });
    if (deleted?.deletedCount) {
      await trackJobPortalEvent({
        eventType: 'job_unsave',
        userId: req.user.id,
        jobId: req.params.jobId,
      });
    }
    res.json({ success: true, message: 'Saved job removed.' });
  } catch (error) {
    console.error('Error removing saved job:', error);
    res.status(500).json({ success: false, message: 'Error removing saved job' });
  }
});

// Get my jobs (Employer)
router.get('/my-jobs', authenticateToken, async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user.id })
      .sort('-postedAt');

    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ success: false, message: 'Error fetching jobs' });
  }
});

// Employer dashboard analytics and latest activity
router.get('/employer/dashboard', authenticateToken, async (req, res) => {
  try {
    const myJobs = await Job.find({ postedBy: req.user.id, isActive: true })
      .sort('-postedAt')
      .lean();
    const jobIds = myJobs.map((job) => job._id);
    const applications = jobIds.length
      ? await JobApplication.find({ jobId: { $in: jobIds } })
          .populate('jobId', 'title company location')
          .populate('applicantId', 'name email')
          .sort('-appliedAt')
          .lean()
      : [];

    const statusCount = applications.reduce(
      (acc, item) => {
        const normalized = String(item.status || '').toLowerCase();
        if (normalized === 'applied') acc.applied += 1;
        else if (normalized === 'viewed') acc.viewed += 1;
        else if (normalized === 'shortlisted') acc.shortlisted += 1;
        else if (normalized === 'interview') acc.interview += 1;
        else if (normalized === 'selected' || normalized === 'hired') acc.selected += 1;
        else if (normalized === 'rejected') acc.rejected += 1;
        return acc;
      },
      { applied: 0, viewed: 0, shortlisted: 0, interview: 0, selected: 0, rejected: 0 }
    );
    const matchScoreStats = applications.reduce(
      (acc, item) => {
        const score = Number(item.matchScore || 0);
        if (Number.isFinite(score) && score > 0) {
          acc.sum += score;
          acc.count += 1;
        }
        return acc;
      },
      { sum: 0, count: 0 }
    );

    const jobApplicationCountById = applications.reduce((acc, item) => {
      const id = String(item.jobId?._id || item.jobId || '');
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});
    const jobTopMatchById = applications.reduce((acc, item) => {
      const id = String(item.jobId?._id || item.jobId || '');
      const score = Number(item.matchScore || 0);
      if (!acc[id] || score > acc[id]) {
        acc[id] = score;
      }
      return acc;
    }, {});
    const jobMatchSumById = applications.reduce((acc, item) => {
      const id = String(item.jobId?._id || item.jobId || '');
      const score = Number(item.matchScore || 0);
      if (!Number.isFinite(score)) return acc;
      acc[id] = acc[id] || { sum: 0, count: 0 };
      acc[id].sum += score;
      acc[id].count += 1;
      return acc;
    }, {});

    const jobsWithStats = myJobs.map((job) => ({
      ...job,
      applicationCount: jobApplicationCountById[String(job._id)] || 0,
      topMatchScore: jobTopMatchById[String(job._id)] || 0,
      avgMatchScore: jobMatchSumById[String(job._id)]
        ? Math.round(jobMatchSumById[String(job._id)].sum / jobMatchSumById[String(job._id)].count)
        : 0,
    }));

    res.json({
      success: true,
      data: {
        stats: {
          activeJobs: myJobs.length,
          totalApplications: applications.length,
          averageMatchScore:
            matchScoreStats.count > 0 ? Math.round(matchScoreStats.sum / matchScoreStats.count) : 0,
          ...statusCount,
        },
        jobs: jobsWithStats,
        applications: applications.slice(0, 100),
      },
    });
  } catch (error) {
    console.error('Error loading employer dashboard:', error);
    res.status(500).json({ success: false, message: 'Error loading employer dashboard' });
  }
});

router.post('/assistant/chat', authenticateToken, async (req, res) => {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ success: false, message: 'Message is too long.' });
    }

    const [profile, applicationsCount, savedJobsCount] = await Promise.all([
      JobSeekerProfile.findOne({ userId: req.user.id }).lean(),
      JobApplication.countDocuments({ applicantId: req.user.id }),
      JobSavedJob.countDocuments({ userId: req.user.id }),
    ]);

    const aiResponse = await generateCareerAssistantResponse({
      message,
      context: {
        profileCompleteness: profile?.profileCompleteness || 0,
        skills: profile?.skills || [],
        experience: profile?.experience || '',
        expectedSalary: profile?.expectedSalary || '',
        availability: profile?.availability || '',
        gulfReady: Boolean(profile?.gulfReady),
        applicationsCount,
        savedJobsCount,
      },
    });

    await trackJobPortalEvent({
      eventType: 'assistant_chat',
      userId: req.user.id,
      metadata: {
        provider: aiResponse.provider,
        model: aiResponse.model,
        messageLength: message.length,
      },
    });

    res.json({
      success: true,
      data: aiResponse,
    });
  } catch (error) {
    console.error('Error generating assistant response:', error);
    res.status(500).json({ success: false, message: 'Error generating assistant response' });
  }
});

router.get('/overview360', authenticateToken, async (req, res) => {
  const requestId = getJobPortalRequestId(req);
  const startedAt = Date.now();
  logJobPortalRoute({
    route: '/overview360',
    requestId,
    event: 'start',
    meta: { cacheEnabled: ENABLE_JOBPORTAL_OVERVIEW_CACHE },
  });

  try {
    res.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    const marketplaceSnapshot = await getMarketplaceOverviewSnapshot();
    const marketplace = marketplaceSnapshot.marketplace;
    const topSkillsAgg = marketplaceSnapshot.topSkillsRaw;
    res.set('X-JobPortal-Overview-Cache', marketplaceSnapshot.cacheHit ? 'HIT' : 'MISS');
    res.set('X-JobPortal-Overview-Computed-At', marketplaceSnapshot.computedAt);
    res.set('X-JobPortal-Overview-Cache-Age', String(marketplaceSnapshot.cacheAgeMs || 0));

    const candidateProfile = await JobSeekerProfile.findOne({ userId: req.user.id }).lean();
    const candidateApplications = await JobApplication.find({ applicantId: req.user.id })
      .populate('jobId', 'title company location type')
      .sort('-appliedAt')
      .lean();

    const candidateRecentMatches = candidateApplications.slice(0, 5).map((application) => ({
      jobId: String(application.jobId?._id || application.jobId || ''),
      title: application.jobId?.title || 'Unknown job',
      company: application.jobId?.company || 'Unknown company',
      location: application.jobId?.location || 'Unknown location',
      matchScore: Number(application.matchScore || 0),
      applicationStatus: application.status || 'Applied',
    }));

    const candidateSkills = new Set(normalizeArrayField(candidateProfile?.skills || []).map((skill) => String(skill).trim().toLowerCase()));
    const topSkillGaps = topSkillsAgg
      .filter((skill) => skill._id && !candidateSkills.has(String(skill._id).trim().toLowerCase()))
      .slice(0, 5)
      .map((skill) => ({ skill: skill._id, count: skill.count }));

    const recommendedActions = [];
    if (!candidateProfile) {
      recommendedActions.push('Complete your job seeker profile to start saving and applying.');
    } else {
      if (!candidateProfile.resume?.url) {
        recommendedActions.push('Upload your resume so employers can quickly review your profile.');
      }
      if (!candidateProfile.skills?.length) {
        recommendedActions.push('Add your main skills and certifications to improve your match score.');
      }
      if (!candidateProfile.preferredLocations?.length) {
        recommendedActions.push('Set preferred locations to receive better local and Gulf job alerts.');
      }
      if (!candidateProfile.jobAlerts?.enabled) {
        recommendedActions.push('Enable job alerts to receive fresh matches and urgent openings.');
      }
      if (candidateProfile.profileCompleteness < 80) {
        recommendedActions.push('Finish profile sections marked incomplete for better visibility.');
      }
      if (candidateProfile.gulfReady && !candidateProfile.preferredJobTypes?.includes('gulf')) {
        recommendedActions.push('If you are Gulf ready, add Gulf job preferences to see better opportunities.');
      }
    }

    const candidate = {
      profileCompleteness: candidateProfile?.profileCompleteness || 0,
      resumeScore: calculateResumeScore(candidateProfile),
      savedJobsCount: await JobSavedJob.countDocuments({ userId: req.user.id }),
      applicationsCount: candidateApplications.length,
      jobAlertsEnabled: candidateProfile?.jobAlerts?.enabled !== false,
      recentMatches: candidateRecentMatches,
      recommendedActions,
      topSkillGaps,
    };

    const employerProfile = await EmployerProfile.findOne({ userId: req.user.id }).lean();
    let employer = null;

    if (employerProfile) {
      const employerJobs = await Job.find({ postedBy: req.user.id }).sort('-postedAt').lean();
      const employerJobIds = employerJobs.map((job) => job._id);
      const employerApplications = employerJobIds.length
        ? await JobApplication.find({ jobId: { $in: employerJobIds } })
            .populate('jobId', 'title company location postedAt')
            .lean()
        : [];

      const statusCounts = employerApplications.reduce(
        (acc, application) => {
          const status = String(application.status || 'Applied').toLowerCase();
          if (status.includes('view')) acc.viewed += 1;
          else if (status.includes('short')) acc.shortlisted += 1;
          else if (status.includes('interview')) acc.interview += 1;
          else if (status.includes('select') || status.includes('hire')) acc.selected += 1;
          else if (status.includes('reject')) acc.rejected += 1;
          else acc.applied += 1;
          return acc;
        },
        { applied: 0, viewed: 0, shortlisted: 0, interview: 0, selected: 0, rejected: 0 }
      );

      const matchStats = employerApplications.reduce(
        (acc, application) => {
          const score = Number(application.matchScore || 0);
          if (Number.isFinite(score) && score > 0) {
            acc.sum += score;
            acc.count += 1;
          }
          return acc;
        },
        { sum: 0, count: 0 }
      );

      const jobAppCounts = employerApplications.reduce((acc, application) => {
        const jobId = String(application.jobId?._id || application.jobId || '');
        acc[jobId] = (acc[jobId] || 0) + 1;
        return acc;
      }, {});

      const jobMatchSum = employerApplications.reduce((acc, application) => {
        const jobId = String(application.jobId?._id || application.jobId || '');
        const score = Number(application.matchScore || 0);
        if (!acc[jobId]) acc[jobId] = { sum: 0, count: 0 };
        if (Number.isFinite(score)) {
          acc[jobId].sum += score;
          acc[jobId].count += 1;
        }
        return acc;
      }, {});

      const selectedApplications = employerApplications.filter((application) => {
        const status = String(application.status || '').toLowerCase();
        return status.includes('select') || status.includes('hire');
      });

      const hiringVelocityDays = selectedApplications.length
        ? Math.round(
            selectedApplications.reduce((sum, application) => {
              const jobPostedAt = application.jobId?.postedAt ? new Date(application.jobId.postedAt) : null;
              const appliedAt = application.appliedAt ? new Date(application.appliedAt) : null;
              if (!jobPostedAt || !appliedAt) return sum;
              return sum + Math.max(0, (appliedAt - jobPostedAt) / (1000 * 60 * 60 * 24));
            }, 0) / selectedApplications.length
          )
        : 0;

      const engagedCount = employerApplications.filter((application) => {
        const status = String(application.status || 'Applied').toLowerCase();
        return status !== 'applied';
      }).length;

      const responseRate = employerApplications.length
        ? Math.round((engagedCount / employerApplications.length) * 100)
        : 0;

      const employerRecommendedActions = [];
      if (responseRate < 45) {
        employerRecommendedActions.push('Respond to new applications within 48 hours to improve conversion.');
      }
      if ((statusCounts.shortlisted + statusCounts.interview + statusCounts.selected) === 0 && employerApplications.length > 0) {
        employerRecommendedActions.push('Shortlist top 5 candidates by match score to unblock hiring pipeline.');
      }
      if (matchStats.count > 0 && Math.round(matchStats.sum / matchStats.count) < 60) {
        employerRecommendedActions.push('Refine job descriptions and required skills for higher quality matches.');
      }
      if (employerJobs.length && employerJobs.every((job) => !job.isVerified)) {
        employerRecommendedActions.push('Complete employer verification to increase candidate trust and apply rate.');
      }

      const topJobs = employerJobs
        .map((job) => ({
          jobId: String(job._id),
          title: job.title,
          company: job.company,
          location: job.location,
          applicationCount: jobAppCounts[String(job._id)] || 0,
          avgMatchScore: jobMatchSum[String(job._id)]?.count
            ? Math.round(jobMatchSum[String(job._id)].sum / jobMatchSum[String(job._id)].count)
            : 0,
        }))
        .sort((a, b) => b.applicationCount - a.applicationCount)
        .slice(0, 5);

      employer = {
        activeJobs: employerJobs.length,
        totalApplications: employerApplications.length,
        averageMatchScore: matchStats.count ? Math.round(matchStats.sum / matchStats.count) : 0,
        selectedCount: statusCounts.selected,
        shortlistedCount: statusCounts.shortlisted,
        responseRate,
        hiringVelocityDays,
        topJobs,
        recommendedActions: employerRecommendedActions,
      };
    }
    logJobPortalRoute({
      route: '/overview360',
      requestId,
      event: 'done',
      meta: {
        durationMs: Date.now() - startedAt,
        cacheHit: marketplaceSnapshot.cacheHit,
      },
    });

    res.json({
      success: true,
      data: {
        marketplace,
        candidate,
        employer,
      },
    });
  } catch (error) {
    logJobPortalRoute({
      level: 'error',
      route: '/overview360',
      requestId,
      event: 'failed',
      meta: {
        durationMs: Date.now() - startedAt,
        message: error?.message || 'Unknown error',
      },
    });
    console.error('Error loading job portal overview360:', error);
    res.status(500).json({ success: false, message: 'Error loading job portal 360 data' });
  }
});

router.get('/overview360/public', async (req, res) => {
  const requestId = getJobPortalRequestId(req);
  try {
    const marketplaceSnapshot = await getMarketplaceOverviewSnapshot();
    res.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    res.set('Vercel-CDN-Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    res.set('CDN-Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    res.set('X-JobPortal-Overview-Cache', marketplaceSnapshot.cacheHit ? 'HIT' : 'MISS');
    res.set('X-JobPortal-Overview-Computed-At', marketplaceSnapshot.computedAt);

    return res.json({
      success: true,
      data: {
        marketplace: marketplaceSnapshot.marketplace,
        cache: {
          hit: marketplaceSnapshot.cacheHit,
          ageMs: marketplaceSnapshot.cacheAgeMs,
          computedAt: marketplaceSnapshot.computedAt,
        },
      },
    });
  } catch (error) {
    logJobPortalRoute({
      level: 'error',
      route: '/overview360/public',
      requestId,
      event: 'failed',
      meta: { message: error?.message || 'Unknown error' },
    });
    return res.status(500).json({ success: false, message: 'Error loading public overview data' });
  }
});

router.all('/internal/cron/overview360-rebuild', async (req, res) => {
  const requestId = getJobPortalRequestId(req);
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  if (!JOBPORTAL_CRON_SECRET) {
    return res.status(503).json({
      success: false,
      message: 'JOBPORTAL_CRON_SECRET is not configured.',
    });
  }
  const providedSecret = readCronSecretFromRequest(req);
  if (providedSecret !== JOBPORTAL_CRON_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorized cron request.' });
  }

  const startedAt = Date.now();
  try {
    const marketplaceSnapshot = await getMarketplaceOverviewSnapshot({ forceRebuild: true });
    await trackJobPortalEvent({
      eventType: 'background_refresh',
      userId: null,
      metadata: {
        route: '/api/jobportal/internal/cron/overview360-rebuild',
        durationMs: Date.now() - startedAt,
      },
      source: 'cron',
    });

    logJobPortalRoute({
      route: '/internal/cron/overview360-rebuild',
      requestId,
      event: 'done',
      meta: {
        durationMs: Date.now() - startedAt,
        computedAt: marketplaceSnapshot.computedAt,
      },
    });

    return res.json({
      success: true,
      data: {
        cachedAt: new Date(Date.now()).toISOString(),
        computedAt: marketplaceSnapshot.computedAt,
        buildDurationMs: marketplaceSnapshot.buildDurationMs,
        totalActiveJobs: marketplaceSnapshot.marketplace.totalActiveJobs,
      },
    });
  } catch (error) {
    logJobPortalRoute({
      level: 'error',
      route: '/internal/cron/overview360-rebuild',
      requestId,
      event: 'failed',
      meta: { message: error?.message || 'Unknown error' },
    });
    return res.status(500).json({ success: false, message: 'Error rebuilding jobportal overview360 cache' });
  }
});

// Search jobs
router.get('/search', async (req, res) => {
  try {
    const { q, type, location, experience } = req.query;

    const query = { isActive: true };

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { company: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { skills: { $in: [new RegExp(q, 'i')] } }
      ];
    }

    if (type) query.type = type;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (experience) query.experience = experience;

    const jobs = await Job.find(query)
      .populate('postedBy', 'name')
      .sort('-postedAt')
      .limit(50);

    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error('Error searching jobs:', error);
    res.status(500).json({ success: false, message: 'Error searching jobs' });
  }
});

// Helper function to calculate profile completeness
function calculateProfileCompleteness(profile) {
  let score = 0;
  const totalFields = 12;

  if (profile.fullName) score++;
  if (profile.email) score++;
  if (profile.phone) score++;
  if (profile.resume && profile.resume.url) score++;
  if (profile.skills && profile.skills.length > 0) score++;
  if (profile.experience) score++;
  if (profile.expectedSalary) score++;
  if (profile.languages && profile.languages.length > 0) score++;
  if (profile.portfolio) score++;
  if (profile.videoIntro && profile.videoIntro.url) score++;
  if (profile.voiceResume && profile.voiceResume.url) score++;
  if (profile.preferredLocations && profile.preferredLocations.length > 0) score++;

  return Math.round((score / totalFields) * 100);
}

function calculateResumeScore(profile) {
  if (!profile) return 0;
  let score = 0;
  if (profile.fullName) score += 10;
  if (profile.email) score += 10;
  if (profile.phone) score += 10;
  if (profile.resume?.url) score += 15;
  if (profile.skills?.length) score += 15;
  if (profile.experience) score += 10;
  if (profile.preferredLocations?.length) score += 10;
  if (profile.linkedin) score += 5;
  if (profile.portfolio) score += 5;
  if (profile.videoIntro?.url || profile.voiceResume?.url) score += 10;
  return Math.min(100, Math.round(score));
}

module.exports = router;
