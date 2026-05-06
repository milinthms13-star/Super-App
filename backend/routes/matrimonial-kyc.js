/**
 * Matrimonial KYC & Verification Routes
 */

const express = require('express');
const router = express.Router();
const KYC = require('../models/KYC');
const BlueTick = require('../models/BlueTick');
const { authenticate } = require('../middleware/auth');
const { blueTickService } = require('../utils/blueTickService');
const logger = require('../utils/logger');

/**
 * POST /api/matrimonial/kyc/upload
 * Upload KYC documents
 */
router.post('/kyc/upload', authenticate, async (req, res) => {
  try {
    const profileId = req.body.profileId;
    const documentType = req.body.documentType; // 'aadhaar', 'pan', 'selfie'
    const fileUrl = req.body.fileUrl; // S3 URL

    if (!profileId || !documentType || !fileUrl) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    let kyc = await KYC.findOne({ profileId });

    if (!kyc) {
      kyc = new KYC({ profileId, status: 'pending' });
    }

    // Update document
    if (kyc.documents[documentType]) {
      kyc.documents[documentType].uploadedAt = new Date();
      kyc.documents[documentType].url = fileUrl;
      kyc.documents[documentType].status = 'pending';
    }

    kyc.status = 'under_review';
    await kyc.save();

    return res.json({
      success: true,
      message: `${documentType} uploaded for verification`,
      data: kyc,
    });
  } catch (error) {
    logger.error(`Error uploading KYC: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/matrimonial/kyc/status
 * Get KYC verification status
 */
router.get('/kyc/status', authenticate, async (req, res) => {
  try {
    const profileId = req.body.profileId || req.query.profileId;

    const kyc = await KYC.findOne({ profileId });

    if (!kyc) {
      return res.status(404).json({ success: false, message: 'KYC not found' });
    }

    return res.json({
      success: true,
      data: {
        status: kyc.status,
        riskScore: kyc.riskScore,
        verifiedDocuments: Object.entries(kyc.documents)
          .filter(([_, doc]) => doc.status === 'verified')
          .map(([type, _]) => type),
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
    // TODO: Check if user is admin
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

    // Auto-issue blue tick
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
        missingRequirements: Object.keys(eligibility.details).filter((k) => !eligibility.details[k]),
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
      },
    });
  } catch (error) {
    logger.error(`Error fetching blue tick status: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
