const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload'); // multer middleware
const DriverKYCService = require('../services/DriverKYCService');
const DriverProfile = require('../models/DriverProfile');

/**
 * POST /api/ridesharing/driver/kyc-upload
 * Upload a single KYC document
 */
router.post('/kyc-upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { documentType } = req.body;

    if (!documentType) {
      return res.status(400).json({
        success: false,
        error: 'Document type is required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'File is required'
      });
    }

    // Upload document to S3
    const documentUrl = await DriverKYCService.uploadDocument(
      req.file,
      documentType,
      req.userId
    );

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      url: documentUrl,
      documentType
    });
  } catch (error) {
    console.error('KYC upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload document'
    });
  }
});

/**
 * POST /api/ridesharing/driver/kyc-submit
 * Submit all KYC documents for verification
 */
router.post('/kyc-submit', authenticate, async (req, res) => {
  try {
    const { documents } = req.body;

    if (!documents) {
      return res.status(400).json({
        success: false,
        error: 'Documents object is required'
      });
    }

    const result = await DriverKYCService.submitKYC(req.userId, documents);

    res.status(200).json(result);
  } catch (error) {
    console.error('KYC submit error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit KYC'
    });
  }
});

/**
 * GET /api/ridesharing/driver/kyc-status
 * Get KYC verification status
 */
router.get('/kyc-status', authenticate, async (req, res) => {
  try {
    const status = await DriverKYCService.checkKYCStatus(req.userId);

    res.status(200).json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('KYC status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch KYC status'
    });
  }
});

/**
 * GET /api/ridesharing/driver/verification-summary
 * Get complete verification summary
 */
router.get('/verification-summary', authenticate, async (req, res) => {
  try {
    const summary = await DriverKYCService.getVerificationSummary(req.userId);

    res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Verification summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch verification summary'
    });
  }
});

/**
 * PUT /api/ridesharing/driver/vehicle-info
 * Update vehicle information
 */
router.put('/vehicle-info', authenticate, async (req, res) => {
  try {
    const vehicleData = req.body;

    const result = await DriverKYCService.updateVehicleInfo(req.userId, vehicleData);

    res.status(200).json(result);
  } catch (error) {
    console.error('Vehicle update error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update vehicle information'
    });
  }
});

/**
 * GET /api/ridesharing/driver/profile
 * Get driver profile
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const driverProfile = await DriverProfile.findOne({ userId: req.userId });

    if (!driverProfile) {
      return res.status(404).json({
        success: false,
        error: 'Driver profile not found'
      });
    }

    res.status(200).json({
      success: true,
      profile: driverProfile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch profile'
    });
  }
});

/**
 * PUT /api/ridesharing/driver/profile
 * Update driver profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, profilePhoto, emergencyContact } = req.body;

    const driverProfile = await DriverProfile.findOne({ userId: req.userId });

    if (!driverProfile) {
      return res.status(404).json({
        success: false,
        error: 'Driver profile not found'
      });
    }

    if (phone) driverProfile.phone = phone;
    if (profilePhoto) driverProfile.vehicle.profilePhoto = profilePhoto;
    if (emergencyContact) driverProfile.emergencyContact = emergencyContact;

    await driverProfile.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: driverProfile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update profile'
    });
  }
});

/**
 * PUT /api/ridesharing/driver/status
 * Go online/offline
 */
router.put('/status', authenticate, async (req, res) => {
  try {
    const { isOnline } = req.body;

    const driverProfile = await DriverProfile.findOne({ userId: req.userId });

    if (!driverProfile) {
      return res.status(404).json({
        success: false,
        error: 'Driver profile not found'
      });
    }

    // Check if KYC is approved before going online
    if (isOnline && driverProfile.kycStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'KYC verification required before going online'
      });
    }

    driverProfile.isOnline = isOnline;
    driverProfile.lastOnlineAt = new Date();
    driverProfile.availabilityStatus = isOnline ? 'available' : 'offline';

    await driverProfile.save();

    res.status(200).json({
      success: true,
      message: isOnline ? 'You are now online' : 'You are now offline',
      isOnline: driverProfile.isOnline
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update status'
    });
  }
});

/**
 * GET /api/ridesharing/driver/earnings
 * Get driver earnings summary
 */
router.get('/earnings', authenticate, async (req, res) => {
  try {
    const { period = 'today' } = req.query;

    const driverProfile = await DriverProfile.findOne({ userId: req.userId });

    if (!driverProfile) {
      return res.status(404).json({
        success: false,
        error: 'Driver profile not found'
      });
    }

    const earnings = {
      totalEarnings: driverProfile.statistics.totalEarnings,
      averagePerRide: driverProfile.statistics.averageEarningsPerRide,
      totalRides: driverProfile.statistics.totalRides,
      period: period
    };

    res.status(200).json({
      success: true,
      earnings
    });
  } catch (error) {
    console.error('Earnings fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch earnings'
    });
  }
});

/**
 * GET /api/ridesharing/driver/statistics
 * Get driver statistics
 */
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const driverProfile = await DriverProfile.findOne({ userId: req.userId });

    if (!driverProfile) {
      return res.status(404).json({
        success: false,
        error: 'Driver profile not found'
      });
    }

    const stats = {
      totalRides: driverProfile.statistics.totalRides,
      completedRides: driverProfile.statistics.completedRides,
      cancelledRides: driverProfile.statistics.cancelledRides,
      cancelRatePercent: driverProfile.statistics.cancelRatePercent,
      averageRating: driverProfile.averageRating,
      totalRatings: driverProfile.totalRatings,
      totalEarnings: driverProfile.statistics.totalEarnings,
      totalDrivingHours: driverProfile.statistics.totalDrivingHours,
      acceptanceRate: driverProfile.statistics.acceptanceRate
    };

    res.status(200).json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Statistics fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch statistics'
    });
  }
});

module.exports = router;
