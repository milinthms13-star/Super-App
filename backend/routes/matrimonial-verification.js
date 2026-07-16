/**
 * Verification Routes
 * Document upload, verification status, trust score management
 */

const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const VerificationDocument = require('../models/VerificationDocument');
const TrustScore = require('../models/TrustScore');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const { uploadToS3 } = require('../config/s3');
const verificationService = require('../services/verificationService');
const logger = require('../utils/logger');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB for videos
  },
});

router.use(authenticate);

// Get trust score
router.get('/trust-score', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    let trustScore = await TrustScore.findOne({ profileId: profile._id });
    
    if (!trustScore) {
      trustScore = await TrustScore.create({
        profileId: profile._id,
        userId: req.user._id,
      });
    }

    res.json({
      success: true,
      data: trustScore,
    });
  } catch (error) {
    logger.error('Get trust score failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trust score',
    });
  }
});

// Upload verification document
router.post('/upload-document', upload.single('document'), async (req, res) => {
  try {
    const { documentType, documentNumber, backSide } = req.body;

    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Upload to S3
    const documentUrl = await uploadToS3(
      req.file.buffer,
      `matrimonial/verifications/${profile._id}/${documentType}-${Date.now()}.${req.file.originalname.split('.').pop()}`,
      req.file.mimetype
    );

    // Create verification document record
    const verificationDoc = await VerificationDocument.create({
      profileId: profile._id,
      userId: req.user._id,
      documentType,
      documentNumber,
      documentUrl,
      verificationStatus: 'pending',
      submittedAt: new Date(),
    });

    // Auto-verify if possible (for certain document types)
    if (documentType === 'aadhaar' && documentNumber) {
      const verification = await verificationService.verifyAadhaar(documentNumber, 'consent_token');
      
      if (verification.success) {
        verificationDoc.verificationStatus = 'verified';
        verificationDoc.autoVerified = true;
        verificationDoc.extractedData = verification.extractedData;
        verificationDoc.verifiedAt = new Date();
        await verificationDoc.save();

        // Update trust score
        await verificationService.updateTrustScore(profile._id, 'photoId', true);
      }
    }

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: verificationDoc,
    });
  } catch (error) {
    logger.error('Document upload failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload document',
    });
  }
});

// Upload video profile
router.post('/upload-video', upload.single('video'), async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Upload video to S3
    const videoUrl = await uploadToS3(
      req.file.buffer,
      `matrimonial/video-profiles/${profile._id}/${Date.now()}.${req.file.originalname.split('.').pop()}`,
      req.file.mimetype
    );

    // Verify video
    const verification = await verificationService.verifyVideoProfile(req.file.buffer);

    // Create verification record
    const verificationDoc = await VerificationDocument.create({
      profileId: profile._id,
      userId: req.user._id,
      documentType: 'video_intro',
      documentUrl: videoUrl,
      verificationStatus: verification.success ? 'verified' : 'pending',
      confidenceScore: verification.confidenceScore,
      autoVerified: verification.success,
      verifiedAt: verification.success ? new Date() : null,
    });

    // Update trust score
    if (verification.success) {
      await verificationService.updateTrustScore(profile._id, 'videoProfile', true);
    }

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: verificationDoc,
    });
  } catch (error) {
    logger.error('Video upload failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload video',
    });
  }
});

// Verify LinkedIn profile
router.post('/verify-linkedin', async (req, res) => {
  try {
    const { linkedInUrl } = req.body;

    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    const verification = await verificationService.verifyLinkedIn(
      linkedInUrl,
      profile.name
    );

    if (verification.success) {
      // Update trust score
      await verificationService.updateTrustScore(profile._id, 'employment', true);
    }

    res.json({
      success: true,
      data: verification,
    });
  } catch (error) {
    logger.error('LinkedIn verification failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify LinkedIn profile',
    });
  }
});

// Get verification documents
router.get('/documents', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    const documents = await VerificationDocument.find({ profileId: profile._id })
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    logger.error('Get documents failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
    });
  }
});

// Admin: Get pending verifications
router.get('/admin/pending', authenticate, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const documents = await VerificationDocument.find({
      verificationStatus: 'pending',
    })
      .populate('profileId', 'name age location')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    logger.error('Get pending verifications failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending verifications',
    });
  }
});

// Admin: Verify/Reject document
router.patch('/admin/:documentId/verify', authenticate, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { action, rejectionReason, extractedData } = req.body;

    const document = await VerificationDocument.findById(req.params.documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    if (action === 'verify') {
      document.verificationStatus = 'verified';
      document.verifiedAt = new Date();
      document.verifiedBy = req.user._id;
      if (extractedData) {
        document.extractedData = extractedData;
      }

      // Update trust score based on document type
      const verificationTypeMap = {
        aadhaar: 'photoId',
        pan: 'photoId',
        passport: 'photoId',
        driving_license: 'photoId',
        income_proof: 'income',
        salary_slip: 'income',
        itr: 'income',
        employment_letter: 'employment',
        address_proof: 'address',
        education_certificate: 'education',
      };

      const verificationType = verificationTypeMap[document.documentType];
      if (verificationType) {
        await verificationService.updateTrustScore(
          document.profileId,
          verificationType,
          true
        );
      }
    } else if (action === 'reject') {
      document.verificationStatus = 'rejected';
      document.rejectionReason = rejectionReason;
    }

    await document.save();

    res.json({
      success: true,
      message: `Document ${action}ed successfully`,
      data: document,
    });
  } catch (error) {
    logger.error('Verify document failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify document',
    });
  }
});

module.exports = router;
