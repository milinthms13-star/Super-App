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

const router = express.Router();
const { authenticate, hasAdminPrivileges } = authMiddleware;

const SOUTH_KERALA_DISTRICTS = ['Kollam', 'Trivandrum', 'Alappuzha', 'Kottayam', 'Pathanamthitta'];

const LOAN_CATEGORIES = [
  'business',
  'personal',
  'gold',
  'home',
  'vehicle',
  'education',
  'agriculture',
  'women',
  'msme',
];

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
  fullName: Joi.string().trim().min(2).max(80).pattern(/^[A-Za-z ]+$/).required(),
  phone: Joi.string().trim().pattern(/^\d{10}$/).required(),
  district: Joi.string().valid(...SOUTH_KERALA_DISTRICTS).required(),
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
  fullName: Joi.string().trim().allow(''),
  phone: Joi.string().trim().pattern(/^\d{10}$/).allow(''),
  district: Joi.string().valid(...SOUTH_KERALA_DISTRICTS).required(),
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
  consultantName: Joi.string().trim().min(2).max(80).required(),
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
    loanCategories: ['business', 'personal', 'home', 'vehicle', 'msme'],
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
    loanCategories: ['gold', 'vehicle', 'personal', 'education'],
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
    loanCategories: ['agriculture', 'home', 'education', 'business'],
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

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
    await FinanceAuditLog.create({
      ...payload,
      actorRole: payload.actorRole || actor.actorRole,
      actorName: payload.actorName || actor.actorName,
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });
  } catch (error) {
    logger.warn(`finance audit log write failed: ${error.message}`);
  }
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
  };
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

const sanitizeLeadForUserView = (lead = {}, { includePhone = false, includeDocuments = false } = {}) => {
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

  return sanitized;
};

router.get('/institutions', publicReadLimiter, async (req, res) => {
  try {
    await ensureInstitutionsSeeded();

    const { district, type, category, verified } = req.query;
    const query = { isActive: true };

    if (district) {
      query.serviceDistricts = district;
    }
    if (type && type !== 'all') {
      query.type = type;
    }
    if (category && category !== 'all') {
      query.loanCategories = category;
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

    const matchingInstitutions = await FinanceInstitution.find({
      isActive: true,
      serviceDistricts: value.district,
      loanCategories: value.loanCategory,
    })
      .sort({ verifiedPartner: -1, 'ratings.average': -1 })
      .limit(5)
      .lean();

    const record = await FinanceEligibilityRecord.create({
      recordId: `FER-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      fullName: value.fullName || '',
      phone: value.phone || '',
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

router.post(
  '/leads',
  authenticate,
  leadCreateLimiter,
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
        eligibilitySnapshot: req.body.eligibilitySnapshot
          ? JSON.parse(req.body.eligibilitySnapshot)
          : null,
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

      await ensureInstitutionsSeeded();

      let selectedInstitution = null;
      if (value.institutionId) {
        selectedInstitution = await FinanceInstitution.findById(value.institutionId);
      }

      if (!selectedInstitution) {
        selectedInstitution = await FinanceInstitution.findOne({
          isActive: true,
          serviceDistricts: value.district,
          loanCategories: value.loanCategory,
        })
          .sort({ verifiedPartner: -1, 'ratings.average': -1 })
          .lean();
      }

      const uploadedDocs = mapUploadedFiles(req.files || {});
      const leadId = `FIN-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      const commissionAmount = getCommissionAmount(selectedInstitution, value.amount);

      const lead = await FinanceLead.create({
        leadId,
        fullName: value.fullName,
        phone: value.phone,
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
        commission: {
          model: selectedInstitution?.commissionModel?.type || 'percentage',
          value: toNumber(selectedInstitution?.commissionModel?.value, 0),
          expectedAmount: commissionAmount,
          actualAmount: 0,
          status: 'pending',
        },
      });

      await createAuditLog(req, {
        actionType: 'lead_created',
        leadId,
        institutionId: String(selectedInstitution?._id || ''),
        details: {
          district: value.district,
          loanCategory: value.loanCategory,
          amount: value.amount,
          uploadedDocuments: uploadedDocs.length,
        },
      });

      return res.status(201).json({
        success: true,
        data: {
          lead: sanitizeLeadForUserView(lead.toObject(), { includePhone: true, includeDocuments: false }),
        },
      });
    } catch (error) {
      logger.error('finance lead create error:', error);
      if (error instanceof SyntaxError) {
        return res.status(400).json({ success: false, message: 'Eligibility snapshot format is invalid.' });
      }
      return res.status(500).json({ success: false, message: 'Unable to create finance lead.' });
    }
  }
);

router.get('/leads', authenticate, secureActionLimiter, requireFinanceConsultant, async (req, res) => {
  try {
    const { phone, leadId, consultantId, status, institutionId, limit = 20 } = req.query;
    const query = {};

    if (phone) query.phone = phone;
    if (leadId) query.leadId = leadId;
    if (consultantId) query['consultant.consultantId'] = consultantId;
    if (status) query.status = status;
    if (institutionId) query['institution.institutionId'] = institutionId;

    const leads = await FinanceLead.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 20, 100))
      .lean();

    const includeDocuments = isFinanceAdmin(req.user);
    const leadsView = leads.map((lead) =>
      sanitizeLeadForUserView(lead, { includePhone: true, includeDocuments })
    );

    return res.json({ success: true, data: { leads: leadsView } });
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

    lead.consultant = {
      consultantId: value.consultantId,
      name: value.consultantName,
      phone: value.consultantPhone || '',
      assignedAt: new Date(),
    };
    lead.status = 'consultant_assigned';
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

    return res.json({ success: true, data: { lead } });
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

    lead.status = value.status;
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

    return res.json({ success: true, data: { lead } });
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
    await lead.save();

    await createAuditLog(req, {
      actionType: 'commission_updated',
      leadId: lead.leadId,
      details: {
        commissionStatus: value.status,
        actualAmount: value.actualAmount,
      },
    });

    return res.json({ success: true, data: { lead } });
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

router.get('/dashboard/user', authenticate, secureActionLimiter, async (req, res) => {
  try {
    const requestedPhone = normalizePhone(req.query.phone || '');
    const accountPhone = normalizePhone(req.user?.phone || '');
    const isPrivileged = isFinanceConsultant(req.user);
    if (!isPrivileged && !accountPhone) {
      return res.status(403).json({
        success: false,
        message: 'Please add your account phone number before using loan tracking.',
      });
    }

    const phone = isPrivileged ? requestedPhone || accountPhone : accountPhone;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone is required.' });
    }

    if (!isPrivileged && requestedPhone && accountPhone && requestedPhone !== accountPhone) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own loan dashboard.',
      });
    }

    const leads = await FinanceLead.find({ phone }).sort({ createdAt: -1 }).lean();

    const statusCounts = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        totalLeads: leads.length,
        statusCounts,
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

    const leads = await FinanceLead.find({ 'consultant.consultantId': consultantId }).sort({ updatedAt: -1 }).lean();
    const statusCounts = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        assignedLeads: leads.length,
        statusCounts,
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

    const leads = await FinanceLead.find({ 'institution.institutionId': institutionId }).sort({ createdAt: -1 }).lean();

    const approvedCount = leads.filter((lead) => ['approved', 'disbursed'].includes(lead.status)).length;
    const conversionRate = leads.length ? Number(((approvedCount / leads.length) * 100).toFixed(2)) : 0;

    return res.json({
      success: true,
      data: {
        totalLeads: leads.length,
        approvedCount,
        conversionRate,
        leads: leads.map((lead) => sanitizeLeadForUserView(lead, { includePhone: true, includeDocuments: false })),
      },
    });
  } catch (error) {
    logger.error('finance institution dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch institution dashboard.' });
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
    const leads = await FinanceLead.find().lean();

    const totals = leads.reduce(
      (acc, lead) => {
        acc.expected += toNumber(lead.commission?.expectedAmount, 0);
        acc.actual += toNumber(lead.commission?.actualAmount, 0);
        if (lead.commission?.status === 'paid') acc.paid += toNumber(lead.commission?.actualAmount, 0);
        return acc;
      },
      { expected: 0, actual: 0, paid: 0 }
    );

    const byInstitutionMap = {};
    for (const lead of leads) {
      const key = lead.institution?.name || 'Unassigned';
      if (!byInstitutionMap[key]) {
        byInstitutionMap[key] = {
          institutionName: key,
          leadCount: 0,
          expected: 0,
          actual: 0,
          paid: 0,
        };
      }
      byInstitutionMap[key].leadCount += 1;
      byInstitutionMap[key].expected += toNumber(lead.commission?.expectedAmount, 0);
      byInstitutionMap[key].actual += toNumber(lead.commission?.actualAmount, 0);
      if (lead.commission?.status === 'paid') {
        byInstitutionMap[key].paid += toNumber(lead.commission?.actualAmount, 0);
      }
    }

    return res.json({
      success: true,
      data: {
        totals: {
          expected: Number(totals.expected.toFixed(2)),
          actual: Number(totals.actual.toFixed(2)),
          paid: Number(totals.paid.toFixed(2)),
        },
        byInstitution: Object.values(byInstitutionMap).map((entry) => ({
          ...entry,
          expected: Number(entry.expected.toFixed(2)),
          actual: Number(entry.actual.toFixed(2)),
          paid: Number(entry.paid.toFixed(2)),
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

module.exports = router;
