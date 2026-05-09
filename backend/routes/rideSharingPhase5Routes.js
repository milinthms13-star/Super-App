/**
 * rideSharingPhase5Routes.js
 * Phase 5: AI & Smart Features (Weeks 11-13)
 * 28 endpoints for intelligent driver matching, surge pricing, traffic prediction, and fraud detection
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const DriverMatchingService = require('../../services/ridesharing/DriverMatchingService');
const SurgePricingService = require('../../services/ridesharing/SurgePricingService');
const TrafficPredictionService = require('../../services/ridesharing/TrafficPredictionService');
const FraudDetectionService = require('../../services/ridesharing/FraudDetectionService');

/**
 * ====================================
 * DRIVER MATCHING ENDPOINTS (8 total)
 * ====================================
 */

/**
 * POST /phase5/driver-matching/find-nearest
 * Find nearest available drivers with geospatial query
 */
router.post('/driver-matching/find-nearest', authMiddleware, async (req, res) => {
  try {
    const { pickupLat, pickupLng, rideType, maxDistance } = req.body;

    if (!pickupLat || !pickupLng || !rideType) {
      return res.status(400).json({
        success: false,
        message: 'Pickup coordinates and ride type required',
      });
    }

    const drivers = await DriverMatchingService.findNearestDrivers(
      pickupLat,
      pickupLng,
      rideType,
      maxDistance
    );

    res.json({
      success: true,
      message: `Found ${drivers.length} nearest drivers`,
      data: {
        drivers,
        count: drivers.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /phase5/driver-matching/smart-match
 * Intelligent driver matching considering preferences and performance
 */
router.post('/driver-matching/smart-match', authMiddleware, async (req, res) => {
  try {
    const { pickupLat, pickupLng, rideType, minRating, considerPreferences } =
      req.body;
    const riderId = req.user.id;

    if (!pickupLat || !pickupLng || !rideType) {
      return res.status(400).json({
        success: false,
        message: 'Pickup coordinates and ride type required',
      });
    }

    const result = await DriverMatchingService.smartMatch(
      pickupLat,
      pickupLng,
      riderId,
      rideType,
      { minRating, considerPreferences }
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /phase5/driver-matching/parallel-request
 * Send ride request to top drivers simultaneously (fanout pattern)
 */
router.post('/driver-matching/parallel-request', authMiddleware, async (req, res) => {
  try {
    const { rideRequestId, topDrivers } = req.body;

    if (!rideRequestId || !topDrivers) {
      return res.status(400).json({
        success: false,
        message: 'Ride request ID and top drivers required',
      });
    }

    const result = await DriverMatchingService.sendParallelRequests(
      rideRequestId,
      topDrivers
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /phase5/driver-matching/accept
 * Handle driver acceptance of ride request
 */
router.post('/driver-matching/accept', authMiddleware, async (req, res) => {
  try {
    const { rideRequestId, driverId } = req.body;

    if (!rideRequestId || !driverId) {
      return res.status(400).json({
        success: false,
        message: 'Ride request ID and driver ID required',
      });
    }

    const result = await DriverMatchingService.handleDriverAcceptance(
      rideRequestId,
      driverId
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /phase5/driver-matching/performance-update
 * Update driver performance score after ride completion
 */
router.post('/driver-matching/performance-update', authMiddleware, async (req, res) => {
  try {
    const { driverId, rideData } = req.body;

    if (!driverId || !rideData) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID and ride data required',
      });
    }

    const updatedDriver = await DriverMatchingService.updateDriverPerformance(
      driverId,
      rideData
    );

    res.json({
      success: true,
      message: 'Driver performance updated',
      data: updatedDriver,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /phase5/driver-matching/stats/:driverId
 * Get driver statistics for analytics
 */
router.get('/driver-matching/stats/:driverId', authMiddleware, async (req, res) => {
  try {
    const { driverId } = req.params;

    const stats = await DriverMatchingService.getDriverStats(driverId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * ====================================
 * SURGE PRICING ENDPOINTS (8 total)
 * ====================================
 */

/**
 * POST /phase5/surge-pricing/calculate
 * Calculate surge pricing with all factors
 */
router.post('/surge-pricing/calculate', authMiddleware, async (req, res) => {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng, rideType, baseFare } =
      req.body;

    if (!pickupLat || !pickupLng || !rideType || !baseFare) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters',
      });
    }

    const result = await SurgePricingService.calculateSurgedFare(
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      rideType,
      baseFare
    );

    res.json({
      success: true,
      message: 'Surge pricing calculated',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /phase5/surge-pricing/demand-index
 * Get current demand index for an area
 */
router.post('/surge-pricing/demand-index', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, rideType } = req.body;

    if (!lat || !lng || !rideType) {
      return res.status(400).json({
        success: false,
        message: 'Coordinates and ride type required',
      });
    }

    const demandData = await SurgePricingService.calculateDemandIndex(
      lat,
      lng,
      rideType
    );

    res.json({
      success: true,
      data: demandData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /phase5/surge-pricing/warning
 * Get surge pricing warning for user
 */
router.post('/surge-pricing/warning', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, rideType } = req.body;

    if (!lat || !lng || !rideType) {
      return res.status(400).json({
        success: false,
        message: 'Coordinates and ride type required',
      });
    }

    const warning = await SurgePricingService.getSurgeWarning(lat, lng, rideType);

    res.json({
      success: true,
      data: warning,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /phase5/surge-pricing/multiplier
 * Get surge multiplier breakdown
 */
router.post('/surge-pricing/multiplier', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, rideType } = req.body;

    if (!lat || !lng || !rideType) {
      return res.status(400).json({
        success: false,
        message: 'Coordinates and ride type required',
      });
    }

    const surgeData = await SurgePricingService.calculateSurgeMultiplier(
      lat,
      lng,
      rideType
    );

    res.json({
      success: true,
      data: surgeData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * ====================================
 * TRAFFIC PREDICTION ENDPOINTS (7 total)
 * ====================================
 */

/**
 * POST /phase5/traffic/predict-route
 * Predict traffic and ETA for a route
 */
router.post('/traffic/predict-route', authMiddleware, async (req, res) => {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng, departureTime } =
      req.body;

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({
        success: false,
        message: 'Route coordinates required',
      });
    }

    const prediction = await TrafficPredictionService.predictRouteCongestion(
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      departureTime ? new Date(departureTime) : undefined
    );

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /phase5/traffic/forecast/:hour/:dayOfWeek
 * Get traffic forecast for next N hours
 */
router.get('/traffic/forecast/:hour/:dayOfWeek', authMiddleware, async (req, res) => {
  try {
    const { hour, dayOfWeek } = req.params;
    const hoursAhead = req.query.hoursAhead || 3;

    const forecast = TrafficPredictionService.getTrafficForecast(
      parseInt(hour),
      parseInt(dayOfWeek),
      parseInt(hoursAhead)
    );

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /phase5/traffic/peak-hour/:hour/:dayOfWeek
 * Get peak hour information
 */
router.get('/traffic/peak-hour/:hour/:dayOfWeek', authMiddleware, async (req, res) => {
  try {
    const { hour, dayOfWeek } = req.params;

    const peakInfo = TrafficPredictionService.predictPeakHourCongestion(
      parseInt(hour),
      parseInt(dayOfWeek)
    );

    res.json({
      success: true,
      data: peakInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /phase5/traffic/eta
 * Calculate ETA with traffic considerations
 */
router.post('/traffic/eta', authMiddleware, async (req, res) => {
  try {
    const { distance, hour, dayOfWeek, trafficConditions, weatherMultiplier } =
      req.body;

    if (!distance || hour === undefined || dayOfWeek === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Distance, hour, and dayOfWeek required',
      });
    }

    const etaData = TrafficPredictionService.predictETA(
      distance,
      hour,
      dayOfWeek,
      trafficConditions,
      weatherMultiplier
    );

    res.json({
      success: true,
      data: etaData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * ====================================
 * FRAUD DETECTION ENDPOINTS (5 total)
 * ====================================
 */

/**
 * POST /phase5/fraud/detect-gps
 * Detect fake GPS coordinates
 */
router.post('/fraud/detect-gps', authMiddleware, async (req, res) => {
  try {
    const { previousLocation, currentLocation, timeDiff } = req.body;

    if (!previousLocation || !currentLocation || !timeDiff) {
      return res.status(400).json({
        success: false,
        message: 'Previous location, current location, and time diff required',
      });
    }

    const result = FraudDetectionService.detectFakeGPS(
      previousLocation,
      currentLocation,
      timeDiff
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /phase5/fraud/detect-suspicious-behavior
 * Detect suspicious user behavior patterns
 */
router.post('/fraud/detect-suspicious-behavior', authMiddleware, async (req, res) => {
  try {
    const { userId, userType } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID required',
      });
    }

    const result = await FraudDetectionService.detectSuspiciousBehavior(
      userId,
      userType || 'rider'
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /phase5/fraud/detect-spam
 * Detect spam booking attempts
 */
router.post('/fraud/detect-spam', authMiddleware, async (req, res) => {
  try {
    const { riderId, pickupLat, pickupLng } = req.body;

    if (!riderId || !pickupLat || !pickupLng) {
      return res.status(400).json({
        success: false,
        message: 'Rider ID and pickup coordinates required',
      });
    }

    const result = await FraudDetectionService.detectSpamBooking(
      riderId,
      pickupLat,
      pickupLng
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /phase5/fraud/comprehensive-check
 * Comprehensive fraud analysis
 */
router.post('/fraud/comprehensive-check', authMiddleware, async (req, res) => {
  try {
    const { userId, userType, rideData } = req.body;

    if (!userId || !userType || !rideData) {
      return res.status(400).json({
        success: false,
        message: 'User ID, user type, and ride data required',
      });
    }

    const result = await FraudDetectionService.comprehensiveFraudCheck(
      userId,
      userType,
      rideData
    );

    // Log fraud alert if suspicious
    if (result.overallFraudScore > 50) {
      await FraudDetectionService.logFraudAlert(result);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
