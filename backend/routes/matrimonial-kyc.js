/**
 * Matrimonial KYC & Verification Routes
 */

const fs = require('fs');
const path = require('path');

const express = require('express');
const multer = require('multer');

const router = express.Router();
const KYC = require('../models/KYC');
const BlueTick = require('../models/BlueTick');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const KYC_UPLOAD_DIR = path.join(__dirname, '../uploads/matrimonial-kyc');
const ALLOWED_DOCUMENT_TYPES = new Set([
  'aadhaar',
  'pan',
  'passport',
  'voterId',
  'drivingLicense',
]);

const ensureUploadDirectory = () => {
  if (!fs.existsSync(KYC_UPLOAD_DIR)) {
    fs.mkdirSync(KYC_UPLOAD_DIR, { recursive: true });
  }
};

const sanitizeFileSegment = (value = '') =>
  String(value || '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'upload';

const storeLocalUpload = (buffer, originalName, prefix) => {
  ensureUploadDirectory();
  const extension = path.extname(originalName || '') || '.bin';
  const fileName = `${sanitizeFileSegment(prefix)}-${Date.now()}${extension}`;
  const absolutePath = path.join(KYC_UPLOAD_DIR, fileName);
  fs.writeFileSync(absolutePath, buffer);
  return `/uploads/matrimonial-kyc/${fileName}`;
};

const resolveProfileId = async (req, explicitProfileId) => {
  if (explicitProfileId) {
    return explicitProfileId;
  }

  const userId = req.user?._id || req.user?.id;
  const userEmail = req.user?.email;
  const lookupConditions = [];

  if (userId) {
    lookupConditions.push({ userId });
  }

  if (userEmail) {
    lookupConditions.push({ email: userEmail });
  }

  if (!lookupConditions.length) {
    return '';
  }

  const profile = await MatrimonialProfile.findOne({ $or: lookupConditions }).select('_id');
  return profile?._id ? String(profile._id) : '';
};

const calculateRiskScore = ({ documentUploaded = false, livenessScore = null }) => {
  if (typeof livenessScore === 'number') {
    return Math.max(5, Math.min(90, 100 - Math.round(livenessScore)));
  }

  return documentUploaded ? 35 : 50;
};

/**
 * POST /api/matrimonial/kyc/upload
 * Upload KYC documents
 */
router.post('/kyc/upload', authenticate, upload.single('document'), async (req, res) => {
  try {
    const profileId = await resolveProfileId(req, req.body.profileId);
    const documentType = String(req.body.documentType || '');
    const fileUrl =
      req.body.fileUrl ||
      (req.file
        ? storeLocalUpload(
            req.file.buffer,
            req.file.originalname,
            `${profileId || 'profile'}-${documentType}`
          )
        : '');

    if (!profileId || !documentType || !fileUrl) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!ALLOWED_DOCUMENT_TYPES.has(documentType)) {
      return res.status(400).json({ success: false, message: 'Unsupported document type' });
    }

    let kyc = await KYC.findOne({ profileId });

    if (!kyc) {
      kyc = new KYC({ profileId, status: 'pending' });
    }

    kyc.documents[documentType] = {
      ...(kyc.documents?.[documentType] || {}),
      uploadedAt: new Date(),
      url: fileUrl,
      fileName: req.file?.originalname || path.basename(fileUrl),
      status: 'pending',
    };
    kyc.status = 'under_review';
    kyc.riskScore = calculateRiskScore({
      documentUploaded: true,
      livenessScore: kyc.selfie?.livenessScore,
    });

    await kyc.save();

    return res.json({
      success: true,
      message: `${documentType} uploaded for verification`,
      status: kyc.status,
      riskScore: kyc.riskScore,
      data: {
        status: kyc.status,
        riskScore: kyc.riskScore,
        documentType,
        fileUrl,
      },
    });
  } catch (error) {
    logger.error(`Error uploading KYC: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/matrimonial/kyc/selfie
 * Upload selfie for liveness verification
 */
router.post('/kyc/selfie', authenticate, async (req, res) => {
  try {
    const profileId = await resolveProfileId(req, req.body.profileId);
    const selfieImage = String(req.body.selfieImage || '');

    if (!profileId || !selfieImage) {
      return res.status(400).json({ success: false, message: 'Profile ID and selfie image required' });
    }

    const [, base64Payload = ''] = selfieImage.split(',');
    const imageBuffer = Buffer.from(base64Payload || selfieImage, 'base64');

    if (!imageBuffer.length) {
      return res.status(400).json({ success: false, message: 'Invalid selfie image payload' });
    }

    let kyc = await KYC.findOne({ profileId });
    if (!kyc) {
      kyc = new KYC({ profileId, status: 'pending' });
    }

    const selfieUrl = storeLocalUpload(imageBuffer, 'selfie.jpg', `${profileId}-selfie`);
    const livenessScore = 88;
    const riskScore = calculateRiskScore({ livenessScore });

    kyc.selfie = {
      ...(kyc.selfie || {}),
      uploadedAt: new Date(),
      url: selfieUrl,
      fileName: 'selfie.jpg',
      livenessScore,
      status: 'pending',
    };
    kyc.status = 'under_review';
    kyc.riskScore = riskScore;

    await kyc.save();

    return res.json({
      success: true,
      message: 'Selfie uploaded for liveness verification',
      livenessScore,
      riskScore,
      data: {
        status: kyc.status,
        livenessScore,
        riskScore,
        selfieUrl,
      },
    });
  } catch (error) {
    logger.error(`Error uploading selfie KYC: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/matrimonial/kyc/status
 * Get KYC verification status
 */
router.get('/kyc/status', authenticate, async (req, res) => {
  try {
    const profileId = await resolveProfileId(req, req.query.profileId || req.body.profileId);

    const kyc = await KYC.findOne({ profileId });

    if (!kyc) {
      return res.status(404).json({ success: false, message: 'KYC not found' });
    }

    return res.json({
      success: true,
      status: kyc.status,
      riskScore: kyc.riskScore,
      data: {
        status: kyc.status,
        riskScore: kyc.riskScore,
        verifiedDocuments: Object.entries(kyc.documents || {})
          .filter(([, doc]) => doc && doc.status === 'verified')
          .map(([type]) => type),
        isApproved: kyc.status === 'approved',
        rejectionReason: kyc.rejectionReason,
      },
    });
  } catch (error) {
    logger.error(`Error fetching KYC status: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/matrimonial/kyc/:kycId/approve
 * Admin: Approve KYC verification
 */
router.patch('/kyc/:kycId/approve', authenticate, async (req, res) => {
  try {
    const { kycId } = req.params;
    const { notes } = req.body;

    const kyc = await KYC.findByIdAndUpdate(
      kycId,
      {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: req.user?.email,
        approvalNotes: notes,
      },
      { new: true }
    );

    const blueTick = await require('../utils/blueTickService').autoIssueBlueTick(kyc.profileId);

    logger.info(`KYC approved for profile ${kyc.profileId}`);

    return res.json({
      success: true,
      message: 'KYC approved',
      data: kyc,
      blueTick,
    });
  } catch (error) {
    logger.error(`Error approving KYC: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/matrimonial/kyc/:kycId/reject
 * Admin: Reject KYC verification
 */
router.patch('/kyc/:kycId/reject', authenticate, async (req, res) => {
  try {
    const { kycId } = req.params;
    const { reason, notes } = req.body;

    const kyc = await KYC.findByIdAndUpdate(
      kycId,
      {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: req.user?.email,
        rejectionReason: reason,
        rejectionNotes: notes,
        canReapply: true,
        reapplyAfterDays: 30,
      },
      { new: true }
    );

    logger.info(`KYC rejected for profile ${kyc.profileId}`);

    return res.json({
      success: true,
      message: 'KYC rejected',
      data: kyc,
    });
  } catch (error) {
    logger.error(`Error rejecting KYC: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/matrimonial/blue-tick/request
 * Request blue tick verification
 */
router.post('/blue-tick/request', authenticate, async (req, res) => {
  try {
    const { profileId } = req.body;

    const eligibility = await require('../utils/blueTickService').calculateEligibilityScore(profileId);

    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        message: 'Profile not eligible for blue tick',
        score: eligibility.score,
        missingRequirements: Object.keys(eligibility.details).filter((key) => !eligibility.details[key]),
      });
    }

    const blueTick = await BlueTick.findOneAndUpdate(
      { profileId },
      { status: 'pending_review' },
      { new: true, upsert: true }
    );

    return res.json({
      success: true,
      message: 'Blue tick request submitted for review',
      data: blueTick,
    });
  } catch (error) {
    logger.error(`Error requesting blue tick: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/matrimonial/blue-tick/status
 * Check blue tick status
 */
router.get('/blue-tick/status', authenticate, async (req, res) => {
  try {
    const { profileId } = req.query;

    const blueTick = await BlueTick.findOne({ profileId });

    if (!blueTick) {
      return res.json({
        success: true,
        data: {
          hasBlueTick: false,
          status: 'not_issued',
          eligibilityScore: 0,
          requirementsMet: {},
        },
      });
    }

    return res.json({
      success: true,
      data: {
        hasBlueTick: blueTick.status === 'approved' && new Date() < blueTick.expiryDate,
        status: blueTick.status,
        issuedAt: blueTick.issuedAt,
        expiryDate: blueTick.expiryDate,
        eligibilityScore: blueTick.eligibilityScore,
        requirementsMet: blueTick.requirementsMet || {},
      },
    });
  } catch (error) {
    logger.error(`Error fetching blue tick status: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
