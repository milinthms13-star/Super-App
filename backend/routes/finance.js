const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FinanceInstitution = require('../models/FinanceInstitution');
const FinanceLead = require('../models/FinanceLead');
const FinanceAuditLog = require('../models/FinanceAuditLog');
const FinanceEligibilityRecord = require('../models/FinanceEligibilityRecord');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');
const { postWorkflowEvent } = require('../utils/financeNotifications');
const { scanFile } = require('../utils/virusScan');

const router = express.Router();
const { authenticate, hasAdminPrivileges } = authMiddleware;

router.use((req, res, next) => {
  const incomingRequestId = String(req.get('x-request-id') || '').trim();
  const requestId = incomingRequestId || `fin-${crypto.randomUUID()}`;
  req.financeRequestId = requestId;
  res.setHeader('x-request-id', requestId);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const elapsedNs = process.hrtime.bigint() - start;
    const elapsedMs = Number(elapsedNs) / 1_000_000;
    logger.info(
      `[finance][${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs.toFixed(1)}ms`
    );
  });

  next();
});

const SOUTH_INDIA_REGIONS = {
  Kerala: ['Kollam', 'Thiruvananthapuram', 'Trivandrum', 'Alappuzha', 'Kottayam', 'Pathanamthitta', 'Ernakulam', 'Thrissur', 'Kozhikode', 'Kannur'],
  TamilNadu: ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli', 'Tirunelveli', 'Erode'],
  Karnataka: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Shivamogga'],
  AndhraPradesh: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kurnool', 'Rajahmundry'],
  Telangana: ['Hyderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam'],
};

const SOUTH_INDIA_DISTRICTS = Object.values(SOUTH_INDIA_REGIONS).flat();
const SOUTH_INDIA_STATES = Object.keys(SOUTH_INDIA_REGIONS);

const LOAN_CATEGORIES = [
  'business',
  'personal',
  'gold',
  'loan-takeover',
  'gold-sale',
  'home',
  'vehicle',
  'education',
  'agriculture',
  'women',
  'msme',
];

const RELATED_LOAN_CATEGORY_MAP = {
  'loan-takeover': ['loan-takeover', 'personal', 'business', 'home', 'msme', 'gold'],
  'gold-sale': ['gold-sale', 'gold'],
};

const getRelatedLoanCategories = (category = '') => {
  const normalized = String(category || '').trim().toLowerCase();
  if (!normalized) return [];
  return RELATED_LOAN_CATEGORY_MAP[normalized] || [normalized];
};

const LEAD_STATUSES = [
  'lead_received',
  'documents_pending',
  'consultant_assigned',
  'in_review',
  'submitted_to_institution',
  'approved',
  'rejected',
  'disbursed',
];

const NAME_PATTERN = /^[A-Za-z .'-]+$/;
const ELIGIBILITY_SNAPSHOT_MAX_BYTES = 24 * 1024;
const ELIGIBILITY_SNAPSHOT_MAX_KEYS = 80;
const ELIGIBILITY_SNAPSHOT_MAX_DEPTH = 4;

const financeUploadDir = path.join(__dirname, '../private/finance-docs');
if (!fs.existsSync(financeUploadDir)) {
  fs.mkdirSync(financeUploadDir, { recursive: true });
}

const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please retry shortly.' },
});

const leadCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many lead submissions. Please retry after some time.' },
});

const secureActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many workflow actions. Please retry shortly.' },
});

const normalizeRoleTokens = (user = {}) => {
  const roleTokens = new Set();
  const baseValues = [
    user.role,
    user.registrationType,
    ...(Array.isArray(user.roles) ? user.roles : []),
  ];

  for (const value of baseValues) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    if (normalized) roleTokens.add(normalized);
  }

  if (hasAdminPrivileges(user)) {
    roleTokens.add('admin');
  }

  return roleTokens;
};

const hasAnyRole = (user, acceptedRoles = []) => {
  const roleTokens = normalizeRoleTokens(user);
  return acceptedRoles.some((role) => roleTokens.has(String(role).trim().toLowerCase()));
};

const isFinanceAdmin = (user = {}) =>
  hasAnyRole(user, ['admin', 'finance', 'finance_admin']);

const isFinanceConsultant = (user = {}) =>
  isFinanceAdmin(user) || hasAnyRole(user, ['consultant', 'finance_consultant']);

const isInstitutionViewer = (user = {}) =>
  isFinanceConsultant(user) || hasAnyRole(user, ['institution', 'institution_partner']);

const getScopedConsultantId = (user = {}) =>
  String(user?.consultantId || user?._id || user?.id || '')
    .trim();

const requireFinanceAdmin = (req, res, next) => {
  if (!isFinanceAdmin(req.user)) {
    return res.status(403).json({ success: false, message: 'Finance admin access required.' });
  }
  return next();
};

const requireFinanceConsultant = (req, res, next) => {
  if (!isFinanceConsultant(req.user)) {
    return res.status(403).json({ success: false, message: 'Consultant or admin access required.' });
  }
  return next();
};

const requireInstitutionViewer = (req, res, next) => {
  if (!isInstitutionViewer(req.user)) {
    return res.status(403).json({ success: false, message: 'Institution dashboard access denied.' });
  }
  return next();
};

const normalizePhone = (value = '') =>
  String(value || '')
    .replace(/\D/g, '')
    .slice(-10);

const SOURCE_CHANNELS = new Set(['web', 'expo', 'mobile', 'admin', 'api']);
const IDEMPOTENCY_KEY_MAX_LENGTH = 120;

const normalizeSourceChannel = (value = '') => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return SOURCE_CHANNELS.has(normalized) ? normalized : 'web';
};

const getSourceMetaFromRequest = (req) => ({
  sourceChannel: normalizeSourceChannel(req.get('x-source-channel') || 'web'),
  platform: String(req.get('x-client-platform') || '').trim().slice(0, 40),
  appVersion: String(req.get('x-app-version') || '').trim().slice(0, 40),
  buildNumber: String(req.get('x-build-number') || '').trim().slice(0, 40),
});

const sanitizeIdempotencyKey = (value = '') =>
  String(value || '')
    .trim()
    .slice(0, IDEMPOTENCY_KEY_MAX_LENGTH);

const getActorUserId = (user = {}) =>
  String(user?._id || user?.id || '')
    .trim();

const SLA_HOURS_BY_STATUS = {
  lead_received: 4,
  documents_pending: 24,
  consultant_assigned: 12,
  in_review: 24,
  submitted_to_institution: 48,
  approved: 72,
};

const getNextActionDueAt = (status = '', fromDate = new Date()) => {
  const hours = SLA_HOURS_BY_STATUS[String(status || '').trim()];
  if (!hours) return null;
  return new Date(fromDate.getTime() + hours * 60 * 60 * 1000);
};

const addLeadNotificationEvent = (lead, event = {}) => {
  if (!lead || typeof lead !== 'object') return;
  if (!Array.isArray(lead.notificationEvents)) {
    lead.notificationEvents = [];
  }
  lead.notificationEvents.push({
    eventType: String(event.eventType || 'workflow_event').slice(0, 80),
    severity: ['info', 'warning', 'critical'].includes(event.severity) ? event.severity : 'info',
    message: String(event.message || '').slice(0, 240),
    metadata: event.metadata || {},
    createdAt: new Date(),
  });
  if (lead.notificationEvents.length > 40) {
    lead.notificationEvents = lead.notificationEvents.slice(-40);
  }
};

const applySlaForLead = (lead, status) => {
  if (!lead || typeof lead !== 'object') return;
  if (!lead.workflowOps || typeof lead.workflowOps !== 'object') {
    lead.workflowOps = {};
  }
  lead.workflowOps.nextActionDueAt = getNextActionDueAt(status, new Date());
};

const assertConsultantScopedLeadAccess = (user = {}, lead = null) => {
  if (isFinanceAdmin(user)) {
    return null;
  }

  const consultantId = getScopedConsultantId(user);
  if (!consultantId) {
    return 'Consultant profile is missing consultant ID.';
  }

  const leadConsultantId = String(lead?.consultant?.consultantId || '').trim();
  if (!leadConsultantId || leadConsultantId !== consultantId) {
    return 'You can only manage leads assigned to your consultant profile.';
  }

  return null;
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, financeUploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMime = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const extOk = /\.(pdf|jpe?g|png)$/i.test(file.originalname || '');
    if (allowedMime.includes(file.mimetype) && extOk) {
      cb(null, true);
      return;
    }
    cb(new Error('Only PDF, JPG, and PNG files are allowed.'));
  },
});

const leadCreateSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(80).pattern(NAME_PATTERN).required(),
  phone: Joi.string().trim().pattern(/^\d{10}$/).required(),
  state: Joi.string().trim().allow('').default(''),
  district: Joi.string().trim().required(),
  loanCategory: Joi.string().valid(...LOAN_CATEGORIES).required(),
  amount: Joi.number().min(1).required(),
  institutionId: Joi.string().trim().allow(''),
  callbackWindow: Joi.string().trim().allow('').default(''),
  documentNotes: Joi.string().trim().allow('').default(''),
  preferredInterestRate: Joi.number().min(6).max(36).allow(null),
  preferredTenureMonths: Joi.number().integer().min(1).max(600).allow(null),
  whatsappOptIn: Joi.boolean().default(false),
  consentPrivacy: Joi.boolean().required(),
  consentKyc: Joi.boolean().required(),
  consentDisclaimer: Joi.boolean().required(),
  eligibilitySnapshot: Joi.object().unknown(true).allow(null),
});

const eligibilitySchema = Joi.object({
  fullName: Joi.string().trim().pattern(NAME_PATTERN).allow(''),
  phone: Joi.string().trim().pattern(/^\d{10}$/).allow(''),
  state: Joi.string().trim().allow('').default(''),
  district: Joi.string().trim().required(),
  loanCategory: Joi.string().valid(...LOAN_CATEGORIES).required(),
  age: Joi.number().integer().min(18).max(75).required(),
  monthlyIncome: Joi.number().min(1).required(),
  requiredAmount: Joi.number().min(1).required(),
  existingEmi: Joi.number().min(0).required(),
  monthlyExpenses: Joi.number().min(0).required(),
  employmentType: Joi.string().valid('salaried', 'self-employed', 'business-owner', 'freelancer').required(),
  employmentStabilityMonths: Joi.number().integer().min(0).required(),
  cibilScore: Joi.number().integer().min(300).max(900).required(),
  collateralAvailable: Joi.boolean().required(),
  businessVintageMonths: Joi.number().integer().min(0).required(),
  hasGstItr: Joi.boolean().required(),
});

const assignConsultantSchema = Joi.object({
  consultantId: Joi.string().trim().min(2).max(40).required(),
  consultantName: Joi.string().trim().min(2).max(80).pattern(NAME_PATTERN).required(),
  consultantPhone: Joi.string().trim().pattern(/^\d{10}$/).allow(''),
});

const statusUpdateSchema = Joi.object({
  status: Joi.string().valid(...LEAD_STATUSES).required(),
  note: Joi.string().trim().allow('').default(''),
});

const commissionUpdateSchema = Joi.object({
  actualAmount: Joi.number().min(0).required(),
  status: Joi.string().valid('pending', 'eligible', 'paid').required(),
});

const dataDeletionSchema = Joi.object({
  phone: Joi.string().trim().pattern(/^\d{10}$/).required(),
  reason: Joi.string().trim().min(5).max(300).required(),
});

const defaultInstitutions = [
  {
    partnerCode: 'FI-KCB-001',
    name: 'Kerala Community Bank',
    type: 'bank',
    verifiedPartner: true,
    branchAddress: 'MG Road Branch, Trivandrum, Kerala 695001',
    contactPerson: {
      name: 'Rahul Nair',
      phone: '9895001101',
      email: 'rahul.nair@kcb.co.in',
    },
    serviceDistricts: ['Trivandrum', 'Kollam', 'Alappuzha', 'Kottayam'],
    loanCategories: ['business', 'personal', 'loan-takeover', 'home', 'vehicle', 'msme'],
    commissionModel: {
      type: 'percentage',
      value: 1.75,
      payoutCycle: 'monthly',
      notes: 'Paid on sanctioned-and-disbursed applications',
    },
    approvalTime: { minDays: 3, maxDays: 7 },
    processingFee: { type: 'percentage', value: 1.2, description: 'Up to 1.2% + GST' },
    interestRange: { min: 8.9, max: 13.75 },
    ratings: { average: 4.4, totalReviews: 124 },
  },
  {
    partnerCode: 'FI-TNN-002',
    name: 'Trivandrum NBFC Network',
    type: 'nbfc',
    verifiedPartner: true,
    branchAddress: 'Technopark Service Desk, Trivandrum, Kerala 695581',
    contactPerson: {
      name: 'Priya Menon',
      phone: '9747002202',
      email: 'priya.menon@tnncapital.in',
    },
    serviceDistricts: ['Trivandrum', 'Kollam', 'Alappuzha'],
    loanCategories: ['gold', 'gold-sale', 'loan-takeover', 'vehicle', 'personal', 'education'],
    commissionModel: {
      type: 'flat',
      value: 3500,
      payoutCycle: 'monthly',
      notes: 'Flat payout per disbursed file',
    },
    approvalTime: { minDays: 1, maxDays: 3 },
    processingFee: { type: 'percentage', value: 1.8, description: '1.5%-1.8% depending on profile' },
    interestRange: { min: 9.75, max: 18.5 },
    ratings: { average: 4.2, totalReviews: 89 },
  },
  {
    partnerCode: 'FI-CCU-003',
    name: 'Co-op Credit Union Kerala',
    type: 'co-operative',
    verifiedPartner: true,
    branchAddress: 'Civil Station Road, Alappuzha, Kerala 688001',
    contactPerson: {
      name: 'Suresh Kumar',
      phone: '9846003303',
      email: 'suresh.kumar@ccukerala.org',
    },
    serviceDistricts: ['Alappuzha', 'Kottayam', 'Pathanamthitta'],
    loanCategories: ['agriculture', 'home', 'loan-takeover', 'education', 'business'],
    commissionModel: {
      type: 'percentage',
      value: 1.25,
      payoutCycle: 'monthly',
      notes: 'Payout after first EMI realization',
    },
    approvalTime: { minDays: 4, maxDays: 8 },
    processingFee: { type: 'flat', value: 2500, description: 'Flat processing fee with local subsidy options' },
    interestRange: { min: 8.5, max: 12.95 },
    ratings: { average: 4.1, totalReviews: 73 },
  },
  {
    partnerCode: 'FI-MCS-004',
    name: 'MicroCapital South',
    type: 'microfinance',
    verifiedPartner: false,
    branchAddress: 'Town Hall Junction, Kottayam, Kerala 686001',
    contactPerson: {
      name: 'Amina Rahman',
      phone: '9605004404',
      email: 'amina.rahman@microcapitalsouth.in',
    },
    serviceDistricts: ['Kollam', 'Pathanamthitta', 'Kottayam'],
    loanCategories: ['women', 'agriculture', 'business', 'personal'],
    commissionModel: {
      type: 'percentage',
      value: 2.2,
      payoutCycle: 'weekly',
      notes: 'Weekly payout for micro-ticket disbursals',
    },
    approvalTime: { minDays: 2, maxDays: 5 },
    processingFee: { type: 'percentage', value: 2.0, description: '2% processing fee' },
    interestRange: { min: 12.5, max: 20 },
    ratings: { average: 4.0, totalReviews: 45 },
  },
];

const ensureInstitutionsSeeded = async () => {
  const count = await FinanceInstitution.countDocuments();
  if (count > 0) {
    return;
  }
  await FinanceInstitution.insertMany(defaultInstitutions);
};

let financeBootstrapPromise = null;
const bootstrapFinanceInstitutions = () => {
  if (!financeBootstrapPromise) {
    financeBootstrapPromise = ensureInstitutionsSeeded()
      .then(() => {
        logger.info('[finance] institution bootstrap complete');
      })
      .catch((error) => {
        logger.error(`[finance] institution bootstrap failed: ${error.message}`);
        financeBootstrapPromise = null;
      });
  }

  return financeBootstrapPromise;
};

const sanitizeEligibilitySnapshot = (value, depth = 0, state = { keys: 0 }) => {
  if (value == null) return null;
  if (depth > ELIGIBILITY_SNAPSHOT_MAX_DEPTH) {
    throw new Error('eligibility-snapshot-too-deep');
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeEligibilitySnapshot(item, depth + 1, state));
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).slice(0, ELIGIBILITY_SNAPSHOT_MAX_KEYS);
    const output = {};
    for (const [key, nested] of entries) {
      state.keys += 1;
      if (state.keys > ELIGIBILITY_SNAPSHOT_MAX_KEYS) {
        throw new Error('eligibility-snapshot-too-many-keys');
      }
      output[String(key).slice(0, 80)] = sanitizeEligibilitySnapshot(nested, depth + 1, state);
    }
    return output;
  }

  if (['string', 'number', 'boolean'].includes(typeof value)) {
    return typeof value === 'string' ? value.slice(0, 500) : value;
  }

  return null;
};

const parseEligibilitySnapshot = (rawValue) => {
  if (rawValue == null || rawValue === '') return null;

  if (typeof rawValue === 'string') {
    const byteLength = Buffer.byteLength(rawValue, 'utf8');
    if (byteLength > ELIGIBILITY_SNAPSHOT_MAX_BYTES) {
      throw new Error('eligibility-snapshot-too-large');
    }
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('eligibility-snapshot-invalid');
    }
    return sanitizeEligibilitySnapshot(parsed);
  }

  if (typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    const byteLength = Buffer.byteLength(JSON.stringify(rawValue), 'utf8');
    if (byteLength > ELIGIBILITY_SNAPSHOT_MAX_BYTES) {
      throw new Error('eligibility-snapshot-too-large');
    }
    return sanitizeEligibilitySnapshot(rawValue);
  }

  throw new Error('eligibility-snapshot-invalid');
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const calculateEmiQuote = (amount, annualRate, tenureMonths) => {
  const principal = Math.max(0, toNumber(amount, 0));
  const rate = Math.max(0, toNumber(annualRate, 0));
  const months = Math.max(0, Math.floor(toNumber(tenureMonths, 0)));

  if (!principal || !months) {
    return { emi: 0, totalPayable: 0, totalInterest: 0 };
  }

  const monthlyRate = rate / 12 / 100;
  if (!monthlyRate) {
    const emiNoInterest = principal / months;
    const roundedNoInterest = Number(emiNoInterest.toFixed(2));
    const totalNoInterest = Number((roundedNoInterest * months).toFixed(2));
    return {
      emi: roundedNoInterest,
      totalPayable: totalNoInterest,
      totalInterest: Number((totalNoInterest - principal).toFixed(2)),
    };
  }

  const factor = Math.pow(1 + monthlyRate, months);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  const roundedEmi = Number(emi.toFixed(2));
  const totalPayable = Number((roundedEmi * months).toFixed(2));
  const totalInterest = Number((totalPayable - principal).toFixed(2));

  return { emi: roundedEmi, totalPayable, totalInterest };
};

const getAuditActor = (req) => {
  const user = req.user || {};
  const role = isFinanceAdmin(user)
    ? 'admin'
    : isFinanceConsultant(user)
      ? 'consultant'
      : 'user';

  return {
    actorRole: role,
    actorName: String(user.name || user.email || 'User').slice(0, 80),
  };
};

const createAuditLog = async (req, payload = {}) => {
  try {
    const actor = getAuditActor(req);
    const incomingDetails = payload.details && typeof payload.details === 'object' ? payload.details : {};
    await FinanceAuditLog.create({
      ...payload,
      actorRole: payload.actorRole || actor.actorRole,
      actorName: payload.actorName || actor.actorName,
      details: {
        ...incomingDetails,
        requestId: req.financeRequestId || '',
      },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });
  } catch (error) {
    logger.warn(`finance audit log write failed: ${error.message}`);
  }
};

const publishWorkflowNotificationHook = async (lead, eventType, payload = {}) => {
  try {
    const workflowPayload = {
      eventType,
      leadId: String(lead?.leadId || ''),
      phone: String(lead?.phone || ''),
      loanCategory: String(lead?.loanCategory || ''),
      status: String(lead?.status || ''),
      sourceChannel: String(lead?.sourceMeta?.sourceChannel || ''),
      consultantId: String(lead?.consultant?.consultantId || ''),
      timestamp: new Date().toISOString(),
      payload,
    };

    const delivery = await postWorkflowEvent(workflowPayload);
    logger.info('finance notification hook', {
      leadId: workflowPayload.leadId,
      eventType,
      delivered: delivery.delivered,
      reason: delivery.reason || '',
    });
    return delivery;
  } catch (error) {
    logger.warn(`finance notification hook failed: ${error.message}`);
    return { delivered: false, reason: 'error' };
  }
};

const publishSlaAlertHook = async ({ consultantId = '', overdueCount = 0, dueSoonCount = 0, withoutSlaCount = 0 } = {}) => {
  if (overdueCount <= 0) return;

  try {
    await postWorkflowEvent({
      eventType: 'finance_sla_alert',
      consultantId,
      overdueCount,
      dueSoonCount,
      withoutSlaCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.warn(`finance sla alert hook failed: ${error.message}`);
  }
};

const parseDateRange = (fromRaw, toRaw) => {
  const fromDate = fromRaw ? new Date(fromRaw) : null;
  const toDate = toRaw ? new Date(toRaw) : null;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : null;

  if (validTo) {
    validTo.setHours(23, 59, 59, 999);
  }

  if (!validFrom && !validTo) return null;

  const range = {};
  if (validFrom) range.$gte = validFrom;
  if (validTo) range.$lte = validTo;
  return range;
};

const getEligibilityInsights = (input = {}) => {
  const monthlyIncome = toNumber(input.monthlyIncome);
  const requiredAmount = toNumber(input.requiredAmount);
  const existingEmi = toNumber(input.existingEmi);
  const monthlyExpenses = toNumber(input.monthlyExpenses);
  const cibil = toNumber(input.cibilScore);
  const age = toNumber(input.age);
  const stability = toNumber(input.employmentStabilityMonths);
  const businessVintage = toNumber(input.businessVintageMonths);
  const collateralAvailable = Boolean(input.collateralAvailable);
  const hasGstItr = Boolean(input.hasGstItr);

  const assumedRate = 13;
  const assumedTenure = 48;
  const monthlyRate = assumedRate / 12 / 100;
  const emiFactor = (monthlyRate * Math.pow(1 + monthlyRate, assumedTenure)) / (Math.pow(1 + monthlyRate, assumedTenure) - 1);
  const estimatedNewEmi = requiredAmount * emiFactor;

  const foir = monthlyIncome > 0 ? ((existingEmi + estimatedNewEmi) / monthlyIncome) * 100 : 999;
  const disposableIncome = monthlyIncome - existingEmi - monthlyExpenses;

  const cibilScoreWeight = Math.max(0, Math.min(35, ((cibil - 300) / 600) * 35));
  const foirScoreWeight = foir <= 35 ? 25 : foir <= 45 ? 18 : foir <= 55 ? 10 : 3;
  const stabilityWeight = stability >= 24 ? 10 : stability >= 12 ? 7 : stability >= 6 ? 4 : 1;
  const ageWeight = age >= 23 && age <= 55 ? 7 : age >= 18 && age <= 60 ? 4 : 1;
  const collateralWeight = collateralAvailable ? 10 : 3;
  const vintageWeight = businessVintage >= 36 ? 8 : businessVintage >= 12 ? 5 : 2;
  const gstWeight = hasGstItr ? 5 : 2;

  const rawScore = cibilScoreWeight + foirScoreWeight + stabilityWeight + ageWeight + collateralWeight + vintageWeight + gstWeight;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  const approvalProbability = score >= 80 ? 85 : score >= 65 ? 65 : score >= 50 ? 42 : 22;
  const probabilityLabel = score >= 80 ? 'High' : score >= 65 ? 'Medium' : score >= 50 ? 'Borderline' : 'Low';

  const rejectionReasons = [];
  if (cibil < 680) rejectionReasons.push('CIBIL score is below 680 for most mainstream products.');
  if (foir > 50) rejectionReasons.push('Existing EMI burden is high for current income.');
  if (disposableIncome < estimatedNewEmi * 1.3) rejectionReasons.push('Disposable income is tight for requested amount.');
  if (stability < 6) rejectionReasons.push('Employment/business stability is too short.');
  if (!collateralAvailable && requiredAmount > 1500000) {
    rejectionReasons.push('Requested amount is high without collateral support.');
  }

  const improvementTips = [];
  if (cibil < 750) improvementTips.push('Maintain on-time EMI/card payments for 6+ months to raise CIBIL.');
  if (foir > 45) improvementTips.push('Reduce existing EMI burden before applying for higher-ticket loans.');
  if (!hasGstItr) improvementTips.push('Keep GST/ITR records ready to improve lender confidence.');
  if (stability < 12) improvementTips.push('Apply after stronger employment/business continuity.');

  const bestMatchingLoanProducts = [];
  if (input.loanCategory === 'business' || input.loanCategory === 'msme') {
    bestMatchingLoanProducts.push('MSME Term Loan', 'Working Capital OD', 'Mudra Shishu/Kishor/Tarun');
  }
  if (input.loanCategory === 'women') {
    bestMatchingLoanProducts.push('Stand-Up India', 'Women Entrepreneur Loan', 'PMEGP Women Category');
  }
  if (input.loanCategory === 'education') {
    bestMatchingLoanProducts.push('Education Term Loan', 'Govt Subsidy-linked Education Loan');
  }
  if (bestMatchingLoanProducts.length === 0) {
    bestMatchingLoanProducts.push('Secured Personal Loan', 'Standard Term Loan', 'Priority Lending Products');
  }

  return {
    score,
    approvalProbability,
    probabilityLabel,
    foir: Number(foir.toFixed(2)),
    disposableIncome,
    estimatedNewEmi: Number(estimatedNewEmi.toFixed(2)),
    rejectionReasons,
    improvementTips,
    bestMatchingLoanProducts,
    matchedSchemes: getMatchedSchemes(input),
  };
};

const FINANCE_SCHEMES = [
  { id: 'pmmy', title: 'Pradhan Mantri Mudra Yojana', categoryHint: ['business', 'msme'], states: ['Kerala', 'TamilNadu', 'Karnataka', 'AndhraPradesh', 'Telangana'], description: 'Collateral-free working capital or term loan support for micro businesses.' },
  { id: 'pmegp', title: 'PMEGP', categoryHint: ['business', 'msme'], states: ['Kerala', 'TamilNadu', 'Karnataka', 'AndhraPradesh', 'Telangana'], description: 'Project cost subsidy for micro enterprises with special category support.' },
  { id: 'standup-india', title: 'Stand-Up India', categoryHint: ['women'], states: ['Kerala', 'TamilNadu', 'Karnataka', 'AndhraPradesh', 'Telangana'], description: 'Loans for women and SC/ST entrepreneurs to start greenfield projects.' },
  { id: 'cgtmse', title: 'CGTMSE Guarantee', categoryHint: ['business', 'msme'], states: ['Kerala', 'TamilNadu', 'Karnataka', 'AndhraPradesh', 'Telangana'], description: 'Credit guarantee support for collateral-free MSME lending.' },
  { id: 'education-loan', title: 'Education Loan Support', categoryHint: ['education'], states: [], description: 'Subsidized education loans for domestic and overseas studies.' },
];

const getMatchedSchemes = (input = {}) => {
  const category = String(input.loanCategory || '').toLowerCase();
  const state = String(input.state || '').trim();
  const isWomen = category === 'women';
  return FINANCE_SCHEMES.filter((scheme) => {
    const categoryMatch = scheme.categoryHint.some((hint) => hint === category || (isWomen && hint === 'women'));
    const stateMatch = !scheme.states.length || scheme.states.includes(state) || state === '';
    return categoryMatch && stateMatch;
  }).map((scheme) => ({ id: scheme.id, title: scheme.title, description: scheme.description }));
};

const getCommissionAmount = (institution, amount) => {
  const modelType = institution?.commissionModel?.type || 'percentage';
  const modelValue = toNumber(institution?.commissionModel?.value, 0);
  if (modelType === 'flat') {
    return modelValue;
  }
  return Number(((amount * modelValue) / 100).toFixed(2));
};

const mapUploadedFiles = (filesObj = {}) => {
  const categories = ['aadhaar', 'pan', 'salarySlip', 'bankStatement', 'gstProof', 'collateralDocuments'];
  const mapped = [];

  for (const category of categories) {
    const fileList = Array.isArray(filesObj[category]) ? filesObj[category] : [];
    for (const file of fileList) {
      mapped.push({
        category,
        originalName: file.originalname,
        filename: file.filename,
        path: `private/finance-docs/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
      });
    }
  }

  return mapped;
};

const listUploadedFiles = (filesObj = {}) =>
  Object.values(filesObj)
    .flat()
    .filter(Boolean);

const deleteUploadedFiles = (files = []) => {
  for (const file of files) {
    if (!file?.path) continue;
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      logger.warn(`finance upload cleanup failed: ${error.message}`);
    }
  }
};

const sanitizeLeadForUserView = (lead = {}, { includePhone = false, includeDocuments = false, includeInternal = false } = {}) => {
  const sanitized = {
    ...lead,
    phone: includePhone ? lead.phone : '',
  };

  if (!includeDocuments) {
    sanitized.documents = Array.isArray(lead.documents) ? lead.documents.map((item) => ({
      category: item.category,
      originalName: item.originalName,
      mimeType: item.mimeType,
      size: item.size,
      uploadedAt: item.uploadedAt,
    })) : [];
  }

  const sourceMeta = lead?.sourceMeta || {};
  sanitized.sourceMeta = {
    sourceChannel: sourceMeta.sourceChannel || 'web',
    device: sourceMeta.device || {},
  };
  if (includeInternal) {
    sanitized.sourceMeta.createdByUserId = sourceMeta.createdByUserId || '';
    sanitized.sourceMeta.idempotencyKey = sourceMeta.idempotencyKey || '';
    sanitized.sourceMeta.idempotencyReplayCount = toNumber(sourceMeta.idempotencyReplayCount, 0);
  }

  return sanitized;
};

const buildSlaSummaryForLeads = (leads = [], dueSoonHours = 24) => {
  const now = Date.now();
  const dueSoonMs = Math.max(1, toNumber(dueSoonHours, 24)) * 60 * 60 * 1000;
  const openStatuses = new Set([
    'lead_received',
    'documents_pending',
    'consultant_assigned',
    'in_review',
    'submitted_to_institution',
    'approved',
  ]);

  const overdue = [];
  const dueSoon = [];
  const withoutSla = [];

  for (const lead of leads) {
    if (!openStatuses.has(String(lead.status || ''))) continue;
    const dueAt = lead?.workflowOps?.nextActionDueAt ? new Date(lead.workflowOps.nextActionDueAt).getTime() : NaN;
    if (!Number.isFinite(dueAt)) {
      withoutSla.push(lead);
      continue;
    }
    if (dueAt < now) {
      overdue.push(lead);
      continue;
    }
    if (dueAt - now <= dueSoonMs) {
      dueSoon.push(lead);
    }
  }

  return {
    overdue,
    dueSoon,
    withoutSla,
  };
};

const buildLeadCreateResponse = (lead, options = {}) => ({
  success: true,
  data: {
    lead: sanitizeLeadForUserView(lead, { includePhone: true, includeDocuments: false }),
    idempotency: {
      replayed: Boolean(options.replayed),
      key: options.key || '',
    },
  },
});

const handleLeadCreateIdempotency = async (req, res, next) => {
  try {
    const userId = getActorUserId(req.user);
    const idempotencyKey = sanitizeIdempotencyKey(
      req.get('x-idempotency-key') || req.get('idempotency-key') || ''
    );

    req.financeRequestMeta = {
      actorUserId: userId,
      idempotencyKey,
      sourceMeta: getSourceMetaFromRequest(req),
    };

    if (!userId || !idempotencyKey) {
      return next();
    }

    const existingLead = await FinanceLead.findOne({
      'sourceMeta.createdByUserId': userId,
      'sourceMeta.idempotencyKey': idempotencyKey,
    }).lean();

    if (!existingLead) {
      return next();
    }

    await FinanceLead.updateOne(
      { _id: existingLead._id },
      {
        $set: { 'sourceMeta.lastIdempotencySeenAt': new Date() },
        $inc: { 'sourceMeta.idempotencyReplayCount': 1 },
      }
    );

    const refreshedLead = await FinanceLead.findById(existingLead._id).lean();
    return res.status(200).json(buildLeadCreateResponse(refreshedLead || existingLead, { replayed: true, key: idempotencyKey }));
  } catch (error) {
    logger.error('finance lead idempotency check error:', error);
    return next();
  }
};

router.get('/institutions', publicReadLimiter, async (req, res) => {
  try {
    const { state, district, type, category, verified } = req.query;
    const query = { isActive: true };

    const selectedState = String(state || '').trim();
    if (selectedState) {
      const regionDistricts = SOUTH_INDIA_REGIONS[selectedState];
      query.serviceDistricts = regionDistricts ? { $in: regionDistricts } : selectedState;
    }
    if (district) {
      query.serviceDistricts = district;
    }
    if (type && type !== 'all') {
      query.type = type;
    }
    if (category && category !== 'all') {
      const relatedCategories = getRelatedLoanCategories(category);
      query.loanCategories = relatedCategories.length > 0 ? { $in: relatedCategories } : category;
    }
    if (verified === 'true') {
      query.verifiedPartner = true;
    }

    const institutions = await FinanceInstitution.find(query).sort({ verifiedPartner: -1, 'ratings.average': -1 }).lean();

    res.json({
      success: true,
      data: {
        institutions,
      },
    });
  } catch (error) {
    logger.error('finance institutions fetch error:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch institutions.' });
  }
});

router.post('/eligibility', publicReadLimiter, async (req, res) => {
  try {
    const { error, value } = eligibilitySchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const result = getEligibilityInsights(value);

    const relatedCategories = getRelatedLoanCategories(value.loanCategory);
    const matchingInstitutions = await FinanceInstitution.find({
      isActive: true,
      serviceDistricts: value.district,
      loanCategories: relatedCategories.length > 0 ? { $in: relatedCategories } : value.loanCategory,
    })
      .sort({ verifiedPartner: -1, 'ratings.average': -1 })
      .limit(5)
      .lean();

    const record = await FinanceEligibilityRecord.create({
      recordId: `FER-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      fullName: value.fullName || '',
      phone: value.phone || '',
      state: value.state || '',
      district: value.district,
      loanCategory: value.loanCategory,
      payload: value,
      result,
    });

    await createAuditLog(req, {
      actionType: 'eligibility_saved',
      details: {
        recordId: record.recordId,
        score: result.score,
        probability: result.approvalProbability,
        state: value.state || '',
        district: value.district,
        loanCategory: value.loanCategory,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        recordId: record.recordId,
        result,
        matchingInstitutions,
      },
    });
  } catch (error) {
    logger.error('finance eligibility save error:', error);
    return res.status(500).json({ success: false, message: 'Unable to process eligibility.' });
  }
});

router.get('/emi', publicReadLimiter, async (req, res) => {
  try {
    const amount = toNumber(req.query.amount, 0);
    const rate = toNumber(req.query.rate, 12);
    const months = Math.max(1, Math.floor(toNumber(req.query.months, 36)));

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero.' });
    }

    const quote = calculateEmiQuote(amount, rate, months);

    return res.json({
      success: true,
      data: {
        amount,
        rate,
        months,
        emi: quote.emi,
        totalPayable: quote.totalPayable,
        totalInterest: quote.totalInterest,
      },
    });
  } catch (error) {
    logger.error('finance emi quote error:', error);
    return res.status(500).json({ success: false, message: 'Unable to calculate EMI quote.' });
  }
});

router.post(
  '/leads',
  authenticate,
  leadCreateLimiter,
  handleLeadCreateIdempotency,
  upload.fields([
    { name: 'aadhaar', maxCount: 3 },
    { name: 'pan', maxCount: 3 },
    { name: 'salarySlip', maxCount: 6 },
    { name: 'bankStatement', maxCount: 12 },
    { name: 'gstProof', maxCount: 6 },
    { name: 'collateralDocuments', maxCount: 12 },
  ]),
  async (req, res) => {
    try {
      const requestMeta = req.financeRequestMeta || {};
      const normalizedBody = {
        ...req.body,
        fullName: String(req.body.fullName || req.user?.name || '').trim(),
        phone: normalizePhone(req.body.phone || req.user?.phone || ''),
        amount: toNumber(req.body.amount),
        preferredInterestRate:
          req.body.preferredInterestRate === '' || req.body.preferredInterestRate == null
            ? null
            : toNumber(req.body.preferredInterestRate),
        preferredTenureMonths:
          req.body.preferredTenureMonths === '' || req.body.preferredTenureMonths == null
            ? null
            : Number(req.body.preferredTenureMonths),
        whatsappOptIn: String(req.body.whatsappOptIn).toLowerCase() === 'true',
        consentPrivacy: String(req.body.consentPrivacy).toLowerCase() === 'true',
        consentKyc: String(req.body.consentKyc).toLowerCase() === 'true',
        consentDisclaimer: String(req.body.consentDisclaimer).toLowerCase() === 'true',
        eligibilitySnapshot: parseEligibilitySnapshot(req.body.eligibilitySnapshot),
      };

      const accountPhone = normalizePhone(req.user?.phone || '');
      if (!isFinanceAdmin(req.user) && !accountPhone) {
        return res.status(400).json({
          success: false,
          message: 'Please add a valid phone number in your profile before creating a finance lead.',
        });
      }

      if (accountPhone && normalizedBody.phone && normalizedBody.phone !== accountPhone && !isFinanceAdmin(req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Lead phone must match your verified account phone number.',
        });
      }

      const { error, value } = leadCreateSchema.validate(normalizedBody, { stripUnknown: true });
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
      }

      if (!value.consentPrivacy || !value.consentKyc || !value.consentDisclaimer) {
        return res.status(400).json({
          success: false,
          message: 'Privacy, KYC and disclaimer consent are required before submission.',
        });
      }

      let selectedInstitution = null;
      if (value.institutionId) {
        selectedInstitution = await FinanceInstitution.findById(value.institutionId);
      }

      if (!selectedInstitution) {
        const relatedCategories = getRelatedLoanCategories(value.loanCategory);
        selectedInstitution = await FinanceInstitution.findOne({
          isActive: true,
          serviceDistricts: value.district,
          loanCategories: relatedCategories.length > 0 ? { $in: relatedCategories } : value.loanCategory,
        })
          .sort({ verifiedPartner: -1, 'ratings.average': -1 })
          .lean();
      }

      const rawUploadedFiles = listUploadedFiles(req.files || {});
      for (const file of rawUploadedFiles) {
        await scanFile(file.path);
      }

      const uploadedDocs = mapUploadedFiles(req.files || {});
      const leadId = `FIN-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      const commissionAmount = getCommissionAmount(selectedInstitution, value.amount);

      const lead = await FinanceLead.create({
        leadId,
        fullName: value.fullName,
        phone: value.phone,
        state: value.state || '',
        district: value.district,
        loanCategory: value.loanCategory,
        amount: value.amount,
        callbackWindow: value.callbackWindow,
        preferredInterestRate: value.preferredInterestRate,
        preferredTenureMonths: value.preferredTenureMonths,
        institution: {
          institutionId: selectedInstitution?._id || null,
          name: selectedInstitution?.name || 'Auto-Matched Institution',
          partnerCode: selectedInstitution?.partnerCode || '',
        },
        documents: uploadedDocs,
        documentNotes: value.documentNotes,
        consents: {
          privacy: value.consentPrivacy,
          kyc: value.consentKyc,
          disclaimer: value.consentDisclaimer,
          timestamp: new Date(),
        },
        whatsappOptIn: value.whatsappOptIn,
        eligibilitySnapshot: value.eligibilitySnapshot,
        status: 'lead_received',
        statusTimeline: [
          {
            status: 'lead_received',
            note: 'Lead created from Finance Hub',
            changedByRole: 'user',
            changedByName: value.fullName,
            changedAt: new Date(),
          },
        ],
        sourceMeta: {
          sourceChannel: requestMeta.sourceMeta?.sourceChannel || 'web',
          createdByUserId: requestMeta.actorUserId || getActorUserId(req.user),
          device: {
            platform: requestMeta.sourceMeta?.platform || '',
            appVersion: requestMeta.sourceMeta?.appVersion || '',
            buildNumber: requestMeta.sourceMeta?.buildNumber || '',
          },
          idempotencyKey: requestMeta.idempotencyKey || '',
          idempotencyReplayCount: 0,
          lastIdempotencySeenAt: requestMeta.idempotencyKey ? new Date() : null,
        },
        commission: {
          model: selectedInstitution?.commissionModel?.type || 'percentage',
          value: toNumber(selectedInstitution?.commissionModel?.value, 0),
          expectedAmount: commissionAmount,
          actualAmount: 0,
          status: 'pending',
        },
      });

      applySlaForLead(lead, 'lead_received');
      addLeadNotificationEvent(lead, {
        eventType: 'lead_created',
        severity: 'info',
        message: 'Lead created and queued for consultant assignment.',
        metadata: {
          sourceChannel: lead.sourceMeta?.sourceChannel || 'web',
          loanCategory: value.loanCategory,
          amount: value.amount,
        },
      });
      await lead.save();

      await createAuditLog(req, {
        actionType: 'lead_created',
        leadId,
        institutionId: String(selectedInstitution?._id || ''),
        details: {
          state: value.state || '',
          district: value.district,
          loanCategory: value.loanCategory,
          amount: value.amount,
          uploadedDocuments: uploadedDocs.length,
          sourceChannel: requestMeta.sourceMeta?.sourceChannel || 'web',
          idempotencyKeyUsed: Boolean(requestMeta.idempotencyKey),
        },
      });

      await publishWorkflowNotificationHook(lead, 'lead_created', {
        sourceChannel: requestMeta.sourceMeta?.sourceChannel || 'web',
        loanCategory: value.loanCategory,
        amount: value.amount,
      });

      return res.status(201).json(buildLeadCreateResponse(lead.toObject(), { replayed: false, key: requestMeta.idempotencyKey || '' }));
    } catch (error) {
      logger.error('finance lead create error:', error);
      deleteUploadedFiles(listUploadedFiles(req.files || {}));
      if (error?.code === 11000 && String(error?.message || '').includes('sourceMeta.createdByUserId')) {
        const requestMeta = req.financeRequestMeta || {};
        if (requestMeta.actorUserId && requestMeta.idempotencyKey) {
          const replayLead = await FinanceLead.findOne({
            'sourceMeta.createdByUserId': requestMeta.actorUserId,
            'sourceMeta.idempotencyKey': requestMeta.idempotencyKey,
          }).lean();
          if (replayLead) {
            return res.status(200).json(buildLeadCreateResponse(replayLead, { replayed: true, key: requestMeta.idempotencyKey }));
          }
        }
      }
      if (error instanceof SyntaxError) {
        return res.status(400).json({ success: false, message: 'Eligibility snapshot format is invalid.' });
      }
      if (String(error?.message || '').includes('eligibility-snapshot')) {
        return res.status(400).json({ success: false, message: 'Eligibility snapshot payload is invalid or too large.' });
      }
      if (String(error?.message || '').includes('empty-file') || String(error?.message || '').includes('file-not-found')) {
        return res.status(400).json({ success: false, message: 'One or more uploaded files failed security checks.' });
      }
      if (String(error?.message || '').includes('infected-file')) {
        return res.status(400).json({ success: false, message: 'One or more uploaded files failed malware scan.' });
      }
      return res.status(500).json({ success: false, message: 'Unable to create finance lead.' });
    }
  }
);

router.get('/leads', authenticate, secureActionLimiter, requireFinanceConsultant, async (req, res) => {
  try {
    const { phone, leadId, consultantId, status, institutionId, limit = 20, page = 1 } = req.query;
    const query = {};
    const isAdmin = isFinanceAdmin(req.user);
    const actorConsultantId = getScopedConsultantId(req.user);

    if (!isAdmin && !actorConsultantId) {
      return res.status(400).json({ success: false, message: 'Consultant profile is missing consultant ID.' });
    }

    if (phone) query.phone = normalizePhone(phone);
    if (leadId) query.leadId = leadId;
    if (consultantId) {
      const requestedConsultantId = String(consultantId).trim();
      if (!isAdmin && requestedConsultantId !== actorConsultantId) {
        return res.status(403).json({
          success: false,
          message: 'You can only access your own consultant leads.',
        });
      }
      query['consultant.consultantId'] = requestedConsultantId;
    } else if (!isAdmin) {
      query['consultant.consultantId'] = actorConsultantId;
    }
    if (status) query.status = status;
    if (institutionId) query['institution.institutionId'] = institutionId;

    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(Math.max(1, Number(limit) || 20), 100);
    const skip = (pageNumber - 1) * pageSize;

    const [leads, totalCount] = await Promise.all([
      FinanceLead.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
      FinanceLead.countDocuments(query),
    ]);

    const includeDocuments = isFinanceAdmin(req.user);
    const leadsView = leads.map((lead) =>
      sanitizeLeadForUserView(lead, { includePhone: true, includeDocuments })
    );

    return res.json({
      success: true,
      data: {
        leads: leadsView,
        pagination: {
          page: pageNumber,
          limit: pageSize,
          totalCount,
          totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
          hasNextPage: skip + leads.length < totalCount,
        },
      },
    });
  } catch (error) {
    logger.error('finance lead tracking fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch lead tracking data.' });
  }
});

router.patch('/leads/:leadId/assign', authenticate, secureActionLimiter, requireFinanceConsultant, async (req, res) => {
  try {
    const { error, value } = assignConsultantSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const lead = await FinanceLead.findOne({ leadId: req.params.leadId });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const isAdmin = isFinanceAdmin(req.user);
    const actorConsultantId = getScopedConsultantId(req.user);
    if (!isAdmin && !actorConsultantId) {
      return res.status(400).json({ success: false, message: 'Consultant profile is missing consultant ID.' });
    }

    if (!isAdmin && value.consultantId !== actorConsultantId) {
      return res.status(403).json({
        success: false,
        message: 'Consultants can only assign leads to their own consultant ID.',
      });
    }

    const alreadyAssignedTo = String(lead.consultant?.consultantId || '').trim();
    if (!isAdmin && alreadyAssignedTo && alreadyAssignedTo !== actorConsultantId) {
      return res.status(403).json({
        success: false,
        message: 'You can only manage leads assigned to your consultant profile.',
      });
    }

    lead.consultant = {
      consultantId: value.consultantId,
      name: value.consultantName,
      phone: value.consultantPhone || '',
      assignedAt: new Date(),
    };
    lead.status = 'consultant_assigned';
    applySlaForLead(lead, 'consultant_assigned');
    addLeadNotificationEvent(lead, {
      eventType: 'consultant_assigned',
      severity: 'info',
      message: `Consultant ${value.consultantName} assigned to lead.`,
      metadata: {
        consultantId: value.consultantId,
      },
    });
    lead.statusTimeline.push({
      status: 'consultant_assigned',
      note: `Assigned to ${value.consultantName}`,
      changedByRole: getAuditActor(req).actorRole,
      changedByName: getAuditActor(req).actorName,
      changedAt: new Date(),
    });

    await lead.save();

    await createAuditLog(req, {
      actionType: 'consultant_assigned',
      leadId: lead.leadId,
      details: {
        consultantId: value.consultantId,
        consultantName: value.consultantName,
      },
    });

    await publishWorkflowNotificationHook(lead, 'consultant_assigned', {
      consultantId: value.consultantId,
      consultantName: value.consultantName,
    });

    return res.json({
      success: true,
      data: { lead: sanitizeLeadForUserView(lead.toObject(), { includePhone: true, includeDocuments: isFinanceAdmin(req.user) }) },
    });
  } catch (error) {
    logger.error('finance consultant assign error:', error);
    return res.status(500).json({ success: false, message: 'Unable to assign consultant.' });
  }
});

router.patch('/leads/:leadId/status', authenticate, secureActionLimiter, requireFinanceConsultant, async (req, res) => {
  try {
    const { error, value } = statusUpdateSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const lead = await FinanceLead.findOne({ leadId: req.params.leadId });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const scopedAccessError = assertConsultantScopedLeadAccess(req.user, lead);
    if (scopedAccessError) {
      return res.status(403).json({ success: false, message: scopedAccessError });
    }

    lead.status = value.status;
    applySlaForLead(lead, value.status);
    addLeadNotificationEvent(lead, {
      eventType: 'lead_status_updated',
      severity: value.status === 'rejected' ? 'warning' : value.status === 'approved' || value.status === 'disbursed' ? 'info' : 'warning',
      message: `Lead status moved to ${value.status}.`,
      metadata: {
        status: value.status,
        note: value.note || '',
      },
    });
    lead.statusTimeline.push({
      status: value.status,
      note: value.note,
      changedByRole: getAuditActor(req).actorRole,
      changedByName: getAuditActor(req).actorName,
      changedAt: new Date(),
    });

    if (value.status === 'disbursed') {
      lead.commission.status = 'eligible';
    }

    await lead.save();

    await createAuditLog(req, {
      actionType: 'lead_status_updated',
      leadId: lead.leadId,
      details: {
        status: value.status,
        note: value.note,
      },
    });

    await publishWorkflowNotificationHook(lead, 'lead_status_updated', {
      status: value.status,
      note: value.note,
    });

    return res.json({
      success: true,
      data: { lead: sanitizeLeadForUserView(lead.toObject(), { includePhone: true, includeDocuments: isFinanceAdmin(req.user) }) },
    });
  } catch (error) {
    logger.error('finance status update error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update lead status.' });
  }
});

router.patch('/leads/:leadId/commission', authenticate, secureActionLimiter, requireFinanceAdmin, async (req, res) => {
  try {
    const { error, value } = commissionUpdateSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const lead = await FinanceLead.findOne({ leadId: req.params.leadId });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    lead.commission.actualAmount = value.actualAmount;
    lead.commission.status = value.status;
    if (value.status === 'paid') {
      lead.commission.paidAt = new Date();
    }
    addLeadNotificationEvent(lead, {
      eventType: 'commission_updated',
      severity: value.status === 'paid' ? 'info' : 'warning',
      message: `Commission status updated to ${value.status}.`,
      metadata: {
        actualAmount: value.actualAmount,
      },
    });
    await lead.save();

    await createAuditLog(req, {
      actionType: 'commission_updated',
      leadId: lead.leadId,
      details: {
        commissionStatus: value.status,
        actualAmount: value.actualAmount,
      },
    });

    return res.json({
      success: true,
      data: { lead: sanitizeLeadForUserView(lead.toObject(), { includePhone: true, includeDocuments: true, includeInternal: true }) },
    });
  } catch (error) {
    logger.error('finance commission update error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update commission.' });
  }
});

router.post('/data-deletion', authenticate, secureActionLimiter, async (req, res) => {
  try {
    const requestedPayload = {
      ...req.body,
      phone: normalizePhone(req.body.phone || req.user?.phone || ''),
    };

    const { error, value } = dataDeletionSchema.validate(requestedPayload, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const accountPhone = normalizePhone(req.user?.phone || '');
    if (!isFinanceAdmin(req.user) && !accountPhone) {
      return res.status(403).json({
        success: false,
        message: 'Please add your account phone number before requesting deletion.',
      });
    }

    if (!isFinanceAdmin(req.user) && accountPhone && value.phone !== accountPhone) {
      return res.status(403).json({
        success: false,
        message: 'You can only request deletion for your own account phone number.',
      });
    }

    const updateResult = await FinanceLead.updateMany(
      { phone: value.phone },
      {
        $set: {
          'dataDeletionRequest.requested': true,
          'dataDeletionRequest.reason': value.reason,
          'dataDeletionRequest.requestedAt': new Date(),
          'dataDeletionRequest.status': 'requested',
        },
      }
    );

    await createAuditLog(req, {
      actionType: 'data_deletion_requested',
      details: {
        phone: value.phone,
        reason: value.reason,
        matchedRecords: updateResult.modifiedCount || 0,
      },
    });

    return res.status(202).json({
      success: true,
      message: 'Data deletion request submitted. Our team will process this request.',
      data: {
        recordsFlagged: updateResult.modifiedCount || 0,
      },
    });
  } catch (error) {
    logger.error('finance data deletion request error:', error);
    return res.status(500).json({ success: false, message: 'Unable to submit data deletion request.' });
  }
});

router.get('/data-deletion/requests', authenticate, secureActionLimiter, requireFinanceAdmin, async (req, res) => {
  try {
    const requests = await FinanceLead.find({ 'dataDeletionRequest.status': 'requested' })
      .sort({ 'dataDeletionRequest.requestedAt': -1 })
      .limit(100)
      .lean();

    return res.json({
      success: true,
      data: {
        requests: requests.map((lead) => ({
          leadId: lead.leadId,
          fullName: lead.fullName,
          phone: lead.phone,
          state: lead.state,
          district: lead.district,
          loanCategory: lead.loanCategory,
          requestedAt: lead.dataDeletionRequest.requestedAt,
          reason: lead.dataDeletionRequest.reason,
          status: lead.dataDeletionRequest.status,
        })),
      },
    });
  } catch (error) {
    logger.error('finance data deletion requests fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch data deletion requests.' });
  }
});

router.patch('/data-deletion/:leadId/process', authenticate, secureActionLimiter, requireFinanceAdmin, async (req, res) => {
  try {
    const lead = await FinanceLead.findOne({ leadId: req.params.leadId });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    if (!lead.dataDeletionRequest.requested || lead.dataDeletionRequest.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'No pending deletion request found for this lead.' });
    }

    lead.fullName = 'Data Removed';
    lead.phone = `DELETED-${lead.leadId}`;
    lead.documents = [];
    lead.documentNotes = '';
    lead.consents = {
      privacy: false,
      kyc: false,
      disclaimer: false,
      timestamp: null,
    };
    lead.whatsappOptIn = false;
    lead.eligibilitySnapshot = null;
    lead.status = 'rejected';
    lead.statusTimeline.push({
      status: 'data_deletion_processed',
      note: 'Personal data anonymized and deletion request processed by admin.',
      changedByRole: 'admin',
      changedByName: String(req.user?.name || req.user?.email || 'Admin').slice(0, 80),
      changedAt: new Date(),
    });
    lead.dataDeletionRequest = {
      requested: true,
      reason: lead.dataDeletionRequest.reason,
      requestedAt: lead.dataDeletionRequest.requestedAt,
      status: 'processed',
      processedBy: String(req.user?.name || req.user?.email || 'Admin').slice(0, 80),
      processedAt: new Date(),
    };

    await lead.save();

    await createAuditLog(req, {
      actionType: 'data_deletion_processed',
      leadId: lead.leadId,
      details: {
        processedBy: lead.dataDeletionRequest.processedBy,
        processedAt: lead.dataDeletionRequest.processedAt,
      },
    });

    return res.json({ success: true, message: 'Deletion request processed and personal data anonymized.' });
  } catch (error) {
    logger.error('finance data deletion process error:', error);
    return res.status(500).json({ success: false, message: 'Unable to process data deletion request.' });
  }
});

router.get('/dashboard/user', authenticate, secureActionLimiter, async (req, res) => {
  try {
    const requestedPhone = normalizePhone(req.query.phone || '');
    const accountPhone = normalizePhone(req.user?.phone || '');
    const isAdmin = isFinanceAdmin(req.user);
    const isConsultant = !isAdmin && isFinanceConsultant(req.user);
    const actorConsultantId = getScopedConsultantId(req.user);
    const pageNumber = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(Math.max(1, Number(req.query.limit) || 25), 100);
    const skip = (pageNumber - 1) * pageSize;
    if (!isAdmin && !isConsultant && !accountPhone) {
      return res.status(403).json({
        success: false,
        message: 'Please add your account phone number before using loan tracking.',
      });
    }

    if (isConsultant && !actorConsultantId) {
      return res.status(400).json({ success: false, message: 'Consultant profile is missing consultant ID.' });
    }

    const phone = isAdmin ? requestedPhone || accountPhone : requestedPhone || accountPhone;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone is required.' });
    }

    if (!isAdmin && !isConsultant && requestedPhone && accountPhone && requestedPhone !== accountPhone) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own loan dashboard.',
      });
    }

    const leadQuery = { phone };
    if (isConsultant) {
      leadQuery['consultant.consultantId'] = actorConsultantId;
    }

    const [leads, totalLeads, statusRows] = await Promise.all([
      FinanceLead.find(leadQuery).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      FinanceLead.countDocuments(leadQuery),
      FinanceLead.aggregate([
        { $match: leadQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = statusRows.reduce((acc, row) => {
      const key = String(row._id || 'unknown');
      acc[key] = Number(row.count || 0);
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        totalLeads,
        statusCounts,
        pagination: {
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.max(1, Math.ceil(totalLeads / pageSize)),
          hasNextPage: skip + leads.length < totalLeads,
        },
        leads: leads.map((lead) => sanitizeLeadForUserView(lead, { includePhone: false, includeDocuments: false })),
      },
    });
  } catch (error) {
    logger.error('finance user dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch user dashboard.' });
  }
});

router.get('/dashboard/consultant', authenticate, secureActionLimiter, requireFinanceConsultant, async (req, res) => {
  try {
    const isPrivileged = isFinanceAdmin(req.user);
    const requestedConsultantId = String(req.query.consultantId || '').trim();
    const accountConsultantId = String(req.user?.consultantId || req.user?._id || req.user?.id || '').trim();
    const consultantId = isPrivileged ? requestedConsultantId || accountConsultantId : accountConsultantId;

    if (!consultantId) {
      return res.status(400).json({ success: false, message: 'Consultant ID is required.' });
    }

    if (!isPrivileged && requestedConsultantId && requestedConsultantId !== accountConsultantId) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own consultant dashboard.',
      });
    }

    const pageNumber = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(Math.max(1, Number(req.query.limit) || 25), 100);
    const skip = (pageNumber - 1) * pageSize;
    const consultantQuery = { 'consultant.consultantId': consultantId };

    const [leads, totalLeads, statusRows] = await Promise.all([
      FinanceLead.find(consultantQuery).sort({ updatedAt: -1 }).skip(skip).limit(pageSize).lean(),
      FinanceLead.countDocuments(consultantQuery),
      FinanceLead.aggregate([
        { $match: consultantQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);
    const statusCounts = statusRows.reduce((acc, row) => {
      const key = String(row._id || 'unknown');
      acc[key] = Number(row.count || 0);
      return acc;
    }, {});
    const sla = buildSlaSummaryForLeads(leads, 24);

    return res.json({
      success: true,
      data: {
        assignedLeads: totalLeads,
        statusCounts,
        slaCounts: {
          overdue: sla.overdue.length,
          dueSoon: sla.dueSoon.length,
          withoutSla: sla.withoutSla.length,
        },
        pagination: {
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.max(1, Math.ceil(totalLeads / pageSize)),
          hasNextPage: skip + leads.length < totalLeads,
        },
        leads: leads.map((lead) => sanitizeLeadForUserView(lead, { includePhone: true, includeDocuments: false })),
      },
    });
  } catch (error) {
    logger.error('finance consultant dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch consultant dashboard.' });
  }
});

router.get('/dashboard/institution', authenticate, secureActionLimiter, requireInstitutionViewer, async (req, res) => {
  try {
    const requestedInstitutionId = String(req.query.institutionId || '').trim();
    const accountInstitutionId = String(req.user?.institutionId || '').trim();
    const isInstitutionScoped =
      !isFinanceAdmin(req.user) && hasAnyRole(req.user, ['institution', 'institution_partner']);
    const institutionId = isInstitutionScoped ? accountInstitutionId : requestedInstitutionId;

    if (!institutionId) {
      return res.status(400).json({ success: false, message: 'Institution ID is required.' });
    }

    if (isInstitutionScoped && requestedInstitutionId && requestedInstitutionId !== accountInstitutionId) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your assigned institution dashboard.',
      });
    }

    const pageNumber = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(Math.max(1, Number(req.query.limit) || 25), 100);
    const skip = (pageNumber - 1) * pageSize;
    const institutionQuery = { 'institution.institutionId': institutionId };

    const [leads, totalLeads, approvedCount] = await Promise.all([
      FinanceLead.find(institutionQuery).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      FinanceLead.countDocuments(institutionQuery),
      FinanceLead.countDocuments({
        ...institutionQuery,
        status: { $in: ['approved', 'disbursed'] },
      }),
    ]);

    const conversionRate = totalLeads ? Number(((approvedCount / totalLeads) * 100).toFixed(2)) : 0;

    return res.json({
      success: true,
      data: {
        totalLeads,
        approvedCount,
        conversionRate,
        pagination: {
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.max(1, Math.ceil(totalLeads / pageSize)),
          hasNextPage: skip + leads.length < totalLeads,
        },
        leads: leads.map((lead) => sanitizeLeadForUserView(lead, { includePhone: true, includeDocuments: false })),
      },
    });
  } catch (error) {
    logger.error('finance institution dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch institution dashboard.' });
  }
});

router.get('/dashboard/sla', authenticate, secureActionLimiter, requireFinanceConsultant, async (req, res) => {
  try {
    const isAdmin = isFinanceAdmin(req.user);
    const requestedConsultantId = String(req.query.consultantId || '').trim();
    const actorConsultantId = getScopedConsultantId(req.user);
    const dueSoonHours = Math.min(Math.max(Number(req.query.dueSoonHours) || 24, 1), 72);
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
    const query = {
      status: { $in: ['lead_received', 'documents_pending', 'consultant_assigned', 'in_review', 'submitted_to_institution', 'approved'] },
    };

    if (!isAdmin) {
      if (!actorConsultantId) {
        return res.status(400).json({ success: false, message: 'Consultant ID is required for SLA dashboard.' });
      }
      query['consultant.consultantId'] = actorConsultantId;
    } else if (requestedConsultantId) {
      query['consultant.consultantId'] = requestedConsultantId;
    }

    const leads = await FinanceLead.find(query)
      .sort({ 'workflowOps.nextActionDueAt': 1, createdAt: -1 })
      .limit(limit)
      .lean();

    const sla = buildSlaSummaryForLeads(leads, dueSoonHours);
    void publishSlaAlertHook({
      consultantId: query['consultant.consultantId'] || '',
      overdueCount: sla.overdue.length,
      dueSoonCount: sla.dueSoon.length,
      withoutSlaCount: sla.withoutSla.length,
    });

    return res.json({
      success: true,
      data: {
        dueSoonHours,
        totalOpenLeads: leads.length,
        counts: {
          overdue: sla.overdue.length,
          dueSoon: sla.dueSoon.length,
          withoutSla: sla.withoutSla.length,
        },
        overdueLeads: sla.overdue.slice(0, 50).map((lead) => sanitizeLeadForUserView(lead, { includePhone: true, includeDocuments: false })),
        dueSoonLeads: sla.dueSoon.slice(0, 50).map((lead) => sanitizeLeadForUserView(lead, { includePhone: true, includeDocuments: false })),
        withoutSlaLeads: sla.withoutSla.slice(0, 50).map((lead) => sanitizeLeadForUserView(lead, { includePhone: true, includeDocuments: false })),
      },
    });
  } catch (error) {
    logger.error('finance sla dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch SLA dashboard.' });
  }
});

router.get('/mobile/bootstrap', authenticate, secureActionLimiter, async (req, res) => {
  try {
    const sourceMeta = getSourceMetaFromRequest(req);
    const accountPhone = normalizePhone(req.user?.phone || '');
    const roleTokens = Array.from(normalizeRoleTokens(req.user));
    const isConsultant = isFinanceConsultant(req.user);
    const isAdmin = isFinanceAdmin(req.user);
    const payload = {
      role: {
        isAdmin,
        isConsultant,
        roleTokens,
      },
      profile: {
        userId: getActorUserId(req.user),
        name: String(req.user?.name || req.user?.email || '').slice(0, 80),
        phone: accountPhone,
        consultantId: getScopedConsultantId(req.user),
      },
      sourceMeta,
    };

    const [institutions, userLeads] = await Promise.all([
      FinanceInstitution.find({ isActive: true })
        .sort({ verifiedPartner: -1, 'ratings.average': -1 })
        .limit(30)
        .lean(),
      accountPhone ? FinanceLead.find({ phone: accountPhone }).sort({ createdAt: -1 }).limit(20).lean() : [],
    ]);

    const statusCounts = userLeads.reduce((acc, lead) => {
      const key = String(lead.status || 'unknown');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        ...payload,
        institutions,
        userDashboard: {
          totalLeads: userLeads.length,
          statusCounts,
          leads: userLeads.map((lead) => sanitizeLeadForUserView(lead, { includePhone: false, includeDocuments: false })),
        },
      },
    });
  } catch (error) {
    logger.error('finance mobile bootstrap error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load finance bootstrap data.' });
  }
});

router.get('/analytics/funnel', authenticate, secureActionLimiter, requireFinanceConsultant, async (req, res) => {
  try {
    const isAdmin = isFinanceAdmin(req.user);
    const requestedConsultantId = String(req.query.consultantId || '').trim();
    const actorConsultantId = getScopedConsultantId(req.user);
    const dateRange = parseDateRange(req.query.from, req.query.to);
    const leadQuery = {};

    if (!isAdmin) {
      if (!actorConsultantId) {
        return res.status(400).json({ success: false, message: 'Consultant ID is required for funnel analytics.' });
      }
      leadQuery['consultant.consultantId'] = actorConsultantId;
    } else if (requestedConsultantId) {
      leadQuery['consultant.consultantId'] = requestedConsultantId;
    }

    if (dateRange) {
      leadQuery.createdAt = dateRange;
    }

    const scopedPhones = await FinanceLead.distinct('phone', leadQuery);
    const eligibilityQuery = {};
    if (dateRange) {
      eligibilityQuery.createdAt = dateRange;
    }
    if (!isAdmin || requestedConsultantId) {
      eligibilityQuery.phone = { $in: scopedPhones };
    }

    const [statusRows, totalLeads, disbursedLeads, approvedLeads, eligibilityRecords] = await Promise.all([
      FinanceLead.aggregate([
        { $match: leadQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      FinanceLead.countDocuments(leadQuery),
      FinanceLead.countDocuments({ ...leadQuery, status: 'disbursed' }),
      FinanceLead.countDocuments({ ...leadQuery, status: 'approved' }),
      FinanceEligibilityRecord.countDocuments(eligibilityQuery),
    ]);

    const statusCounts = statusRows.reduce((acc, row) => {
      acc[String(row._id || 'unknown')] = Number(row.count || 0);
      return acc;
    }, {});

    const conversionToApproved = totalLeads > 0 ? Number(((approvedLeads / totalLeads) * 100).toFixed(2)) : 0;
    const conversionToDisbursed = totalLeads > 0 ? Number(((disbursedLeads / totalLeads) * 100).toFixed(2)) : 0;

    return res.json({
      success: true,
      data: {
        filters: {
          from: req.query.from || '',
          to: req.query.to || '',
          consultantId: isAdmin ? requestedConsultantId : actorConsultantId,
        },
        metrics: {
          eligibilityRecords,
          totalLeads,
          approvedLeads,
          disbursedLeads,
          conversionToApproved,
          conversionToDisbursed,
        },
        statusCounts,
      },
    });
  } catch (error) {
    logger.error('finance funnel analytics error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch funnel analytics.' });
  }
});

router.get('/analytics/source-channels', authenticate, secureActionLimiter, requireFinanceConsultant, async (req, res) => {
  try {
    const isAdmin = isFinanceAdmin(req.user);
    const requestedConsultantId = String(req.query.consultantId || '').trim();
    const actorConsultantId = getScopedConsultantId(req.user);
    const dateRange = parseDateRange(req.query.from, req.query.to);
    const leadQuery = {};

    if (!isAdmin) {
      if (!actorConsultantId) {
        return res.status(400).json({ success: false, message: 'Consultant ID is required for source analytics.' });
      }
      leadQuery['consultant.consultantId'] = actorConsultantId;
    } else if (requestedConsultantId) {
      leadQuery['consultant.consultantId'] = requestedConsultantId;
    }

    if (dateRange) {
      leadQuery.createdAt = dateRange;
    }

    const rows = await FinanceLead.aggregate([
      { $match: leadQuery },
      {
        $project: {
          sourceChannel: {
            $cond: [
              { $or: [{ $eq: ['$sourceMeta.sourceChannel', null] }, { $eq: ['$sourceMeta.sourceChannel', ''] }] },
              'unknown',
              '$sourceMeta.sourceChannel',
            ],
          },
          status: '$status',
        },
      },
      {
        $group: {
          _id: '$sourceChannel',
          totalLeads: { $sum: 1 },
          approvedLeads: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          disbursedLeads: { $sum: { $cond: [{ $eq: ['$status', 'disbursed'] }, 1, 0] } },
        },
      },
      { $sort: { totalLeads: -1 } },
    ]);

    const channels = rows.map((row) => {
      const totalLeads = Number(row.totalLeads || 0);
      const approvedLeads = Number(row.approvedLeads || 0);
      const disbursedLeads = Number(row.disbursedLeads || 0);
      return {
        sourceChannel: String(row._id || 'unknown'),
        totalLeads,
        approvedLeads,
        disbursedLeads,
        approvedConversion: totalLeads > 0 ? Number(((approvedLeads / totalLeads) * 100).toFixed(2)) : 0,
        disbursedConversion: totalLeads > 0 ? Number(((disbursedLeads / totalLeads) * 100).toFixed(2)) : 0,
      };
    });

    return res.json({
      success: true,
      data: {
        filters: {
          from: req.query.from || '',
          to: req.query.to || '',
          consultantId: isAdmin ? requestedConsultantId : actorConsultantId,
        },
        channels,
      },
    });
  } catch (error) {
    logger.error('finance source analytics error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch source analytics.' });
  }
});

router.get('/dashboard/admin', authenticate, secureActionLimiter, requireFinanceAdmin, async (_req, res) => {
  try {
    const [
      totalLeads,
      totalInstitutions,
      openLeads,
      disbursedLeads,
      recentLeads,
      recentAudits,
      pendingDeletionRequests,
    ] = await Promise.all([
      FinanceLead.countDocuments(),
      FinanceInstitution.countDocuments({ isActive: true }),
      FinanceLead.countDocuments({ status: { $in: ['lead_received', 'documents_pending', 'consultant_assigned', 'in_review'] } }),
      FinanceLead.countDocuments({ status: 'disbursed' }),
      FinanceLead.find().sort({ createdAt: -1 }).limit(10).lean(),
      FinanceAuditLog.find().sort({ createdAt: -1 }).limit(20).lean(),
      FinanceLead.countDocuments({ 'dataDeletionRequest.status': 'requested' }),
    ]);

    return res.json({
      success: true,
      data: {
        metrics: {
          totalLeads,
          totalInstitutions,
          openLeads,
          disbursedLeads,
          pendingDeletionRequests,
        },
        recentLeads: recentLeads.map((lead) =>
          sanitizeLeadForUserView(lead, { includePhone: true, includeDocuments: false })
        ),
        recentAudits,
      },
    });
  } catch (error) {
    logger.error('finance admin dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch admin dashboard.' });
  }
});

router.get('/dashboard/commission', authenticate, secureActionLimiter, requireFinanceAdmin, async (_req, res) => {
  try {
    const [totalRows, institutionRows] = await Promise.all([
      FinanceLead.aggregate([
        {
          $group: {
            _id: null,
            expected: { $sum: { $ifNull: ['$commission.expectedAmount', 0] } },
            actual: { $sum: { $ifNull: ['$commission.actualAmount', 0] } },
            paid: {
              $sum: {
                $cond: [
                  { $eq: ['$commission.status', 'paid'] },
                  { $ifNull: ['$commission.actualAmount', 0] },
                  0,
                ],
              },
            },
          },
        },
      ]),
      FinanceLead.aggregate([
        {
          $project: {
            institutionName: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$institution.name', null] },
                    { $eq: ['$institution.name', ''] },
                  ],
                },
                'Unassigned',
                '$institution.name',
              ],
            },
            expectedAmount: { $ifNull: ['$commission.expectedAmount', 0] },
            actualAmount: { $ifNull: ['$commission.actualAmount', 0] },
            isPaid: { $eq: ['$commission.status', 'paid'] },
          },
        },
        {
          $group: {
            _id: '$institutionName',
            leadCount: { $sum: 1 },
            expected: { $sum: '$expectedAmount' },
            actual: { $sum: '$actualAmount' },
            paid: {
              $sum: {
                $cond: ['$isPaid', '$actualAmount', 0],
              },
            },
          },
        },
        { $sort: { expected: -1, leadCount: -1 } },
      ]),
    ]);

    const totals = totalRows[0] || { expected: 0, actual: 0, paid: 0 };

    return res.json({
      success: true,
      data: {
        totals: {
          expected: Number(totals.expected.toFixed(2)),
          actual: Number(totals.actual.toFixed(2)),
          paid: Number(totals.paid.toFixed(2)),
        },
        byInstitution: institutionRows.map((entry) => ({
          institutionName: entry._id || 'Unassigned',
          leadCount: Number(entry.leadCount || 0),
          expected: Number(toNumber(entry.expected, 0).toFixed(2)),
          actual: Number(toNumber(entry.actual, 0).toFixed(2)),
          paid: Number(toNumber(entry.paid, 0).toFixed(2)),
        })),
      },
    });
  } catch (error) {
    logger.error('finance commission dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch commission dashboard.' });
  }
});

router.get('/admin/audit', authenticate, secureActionLimiter, requireFinanceAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const logs = await FinanceAuditLog.find().sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ success: true, data: { logs } });
  } catch (error) {
    logger.error('finance audit fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch audit logs.' });
  }
});

router.bootstrap = bootstrapFinanceInstitutions;
void bootstrapFinanceInstitutions();

module.exports = router;
