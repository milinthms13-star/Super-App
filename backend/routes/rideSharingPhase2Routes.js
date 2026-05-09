/**
 * rideSharingPhase2Routes.js
 * Phase 2 Safety & Trust features
 * SOS, Verification Badges, Route Safety
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/multer');
const rateLimit = require('express-rate-limit');

const RideShareSOSService = require('../services/RideShareSOSService');
const VerificationBadgeService = require('../services/VerificationBadgeService');
const RouteSafetyService = require('../services/RouteSafetyService');

// Rate limiters
const sosLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 SOS alerts per minute max
  message: 'Too many SOS alerts. Please wait before sending another.',
});

/**
 * ============================================================================
 * PHASE 2.1: SOS EMERGENCY SYSTEM
 * ============================================================================
 */

/**
 * POST /api/ridesharing/phase2/sos/emergency
 * Send emergency SOS alert
 */
router.post('/sos/emergency', authMiddleware, sosLimiter, async (req, res) => {
  try {
    const { rideId, incidentType, description } = req.body;

    if (!rideId || !incidentType) {
      return res.status(400).json({
        success: false,
        message: 'Ride ID and incident type required',
      });
    }

    const result = await RideShareSOSService.sendEmergencyAlert(
      req.user.userId,
      rideId,
      incidentType,
      description
    );

    res.json(result);
  } catch (error) {
    console.error('SOS Emergency Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ridesharing/phase2/sos/upload-evidence
 * Upload incident evidence (images/audio)
 */
router.post(
  '/sos/upload-evidence/:sosId',
  authMiddleware,
  upload.single('file'),
  async (req, res) => {
    try {
      const { sosId } = req.params;
      const { type } = req.body; // 'image' or 'audio'

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided',
        });
      }

      const result = await RideShareSOSService.uploadIncidentEvidence(
        sosId,
        req.file,
        type
      );

      res.json(result);
    } catch (error) {
      console.error('Upload Evidence Error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/ridesharing/phase2/sos/share-trip
 * Create shareable live trip link
 */
router.post('/sos/share-trip', authMiddleware, async (req, res) => {
  try {
    const { rideId, sharedWithEmail, duration } = req.body;

    if (!rideId || !sharedWithEmail) {
      return res.status(400).json({
        success: false,
        message: 'Ride ID and email required',
      });
    }

    const result = await RideShareSOSService.createLiveTripShare(
      rideId,
      sharedWithEmail,
      duration || 24
    );

    res.json(result);
  } catch (error) {
    console.error('Share Trip Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/ridesharing/phase2/sos/:sosId/status
 * Update SOS incident status
 */
router.put('/sos/:sosId/status', authMiddleware, async (req, res) => {
  try {
    const { sosId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status required',
      });
    }

    const result = await RideShareSOSService.updateIncidentStatus(sosId, status, notes);

    res.json(result);
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ridesharing/phase2/sos/active
 * Get active SOS incidents
 */
router.get('/sos/active', authMiddleware, async (req, res) => {
  try {
    const incidents = await RideShareSOSService.getActiveIncidents(req.user.userId);

    res.json({
      success: true,
      incidents,
      count: incidents.length,
    });
  } catch (error) {
    console.error('Get Active Incidents Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ridesharing/phase2/sos/:sosId
 * Get SOS incident details
 */
router.get('/sos/:sosId', authMiddleware, async (req, res) => {
  try {
    const { sosId } = req.params;
    const incident = await RideShareSOSService.getIncidentDetails(sosId);

    res.json({
      success: true,
      incident,
    });
  } catch (error) {
    console.error('Get Incident Details Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * ============================================================================
 * PHASE 2.2: DRIVER & RIDER VERIFICATION
 * ============================================================================
 */

/**
 * POST /api/ridesharing/phase2/verification/check-badges
 * Check and award verification badges
 */
router.post('/verification/check-badges', authMiddleware, async (req, res) => {
  try {
    const { userType } = req.body; // 'driver' or 'rider'

    if (!userType) {
      return res.status(400).json({
        success: false,
        message: 'User type required',
      });
    }

    const result = await VerificationBadgeService.checkAndAwardBadges(
      req.user.userId,
      userType
    );

    res.json(result);
  } catch (error) {
    console.error('Check Badges Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ridesharing/phase2/verification/badges
 * Get user badges
 */
router.get('/verification/badges', authMiddleware, async (req, res) => {
  try {
    const result = await VerificationBadgeService.getUserBadges(req.user.userId);

    res.json(result);
  } catch (error) {
    console.error('Get Badges Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ridesharing/phase2/verification/background-check
 * Verify background check result
 */
router.post('/verification/background-check', authMiddleware, async (req, res) => {
  try {
    const { checkResult, certificate } = req.body;

    if (!checkResult) {
      return res.status(400).json({
        success: false,
        message: 'Check result required',
      });
    }

    const result = await VerificationBadgeService.verifyBackgroundCheck(
      req.user.userId,
      checkResult,
      certificate
    );

    res.json(result);
  } catch (error) {
    console.error('Background Check Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ridesharing/phase2/verification/document-expiry
 * Track document expiry dates
 */
router.get('/verification/document-expiry', authMiddleware, async (req, res) => {
  try {
    const result = await VerificationBadgeService.trackDocumentExpiry(req.user.userId);

    res.json(result);
  } catch (error) {
    console.error('Document Expiry Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ridesharing/phase2/verification/trust-score
 * Calculate rider trust score
 */
router.get('/verification/trust-score', authMiddleware, async (req, res) => {
  try {
    const result = await VerificationBadgeService.calculateRiderTrustScore(
      req.user.userId
    );

    res.json(result);
  } catch (error) {
    console.error('Trust Score Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * ============================================================================
 * PHASE 2.3: ROUTE SAFETY DETECTION
 * ============================================================================
 */

/**
 * POST /api/ridesharing/phase2/safety/check-route
 * Check route safety
 */
router.post('/safety/check-route', authMiddleware, async (req, res) => {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng, time } = req.body;

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({
        success: false,
        message: 'All coordinates required',
      });
    }

    const result = await RouteSafetyService.checkRouteSafety(
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      time || 'night'
    );

    res.json(result);
  } catch (error) {
    console.error('Check Route Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ridesharing/phase2/safety/mark-unsafe-area
 * Mark unsafe route/area
 */
router.post('/safety/mark-unsafe-area', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, description, severity } = req.body;

    if (!latitude || !longitude || !description) {
      return res.status(400).json({
        success: false,
        message: 'Coordinates and description required',
      });
    }

    const result = await RouteSafetyService.markUnsafeRoute(
      latitude,
      longitude,
      description,
      severity
    );

    res.json(result);
  } catch (error) {
    console.error('Mark Unsafe Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ridesharing/phase2/safety/optimize-route
 * Get optimized safe route
 */
router.post('/safety/optimize-route', authMiddleware, async (req, res) => {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng, rideId } = req.body;

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({
        success: false,
        message: 'All coordinates required',
      });
    }

    const result = await RouteSafetyService.optimizeSafeRoute(
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      rideId
    );

    res.json(result);
  } catch (error) {
    console.error('Optimize Route Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ridesharing/phase2/safety/daytime-suggestion
 * Get daytime route suggestions
 */
router.get('/safety/daytime-suggestion', authMiddleware, async (req, res) => {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng } = req.query;

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({
        success: false,
        message: 'All coordinates required',
      });
    }

    const result = await RouteSafetyService.suggestDaytimeRoute(
      parseFloat(pickupLat),
      parseFloat(pickupLng),
      parseFloat(dropoffLat),
      parseFloat(dropoffLng)
    );

    res.json(result);
  } catch (error) {
    console.error('Daytime Suggestion Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ridesharing/phase2/safety/high-crime-areas
 * Get high-crime areas to avoid
 */
router.get('/safety/high-crime-areas', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude required',
      });
    }

    const result = await RouteSafetyService.getHighCrimeAreas(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius) || 2
    );

    res.json(result);
  } catch (error) {
    console.error('High Crime Areas Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
