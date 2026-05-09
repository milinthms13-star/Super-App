/**
 * rideSharingPhase4Routes.js
 * Phase 4: Maps Integration & Route Optimization
 * 16 endpoints for route calculation, ETA, traffic, live tracking
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const RouteOptimizationService = require('../../services/ridesharing/RouteOptimizationService');
const LocationTrackingService = require('../../services/ridesharing/LocationTrackingService');

/**
 * ROUTE OPTIMIZATION ENDPOINTS (8 total)
 */

/**
 * POST /calculate-route
 * Calculate optimal route between pickup and dropoff
 */
router.post('/calculate-route', authMiddleware, async (req, res) => {
  try {
    const { pickup, dropoff, mode } = req.body;

    if (!pickup || !dropoff) {
      return res.status(400).json({
        success: false,
        message: 'Pickup and dropoff coordinates required',
      });
    }

    const route = await RouteOptimizationService.calculateOptimalRoute(
      pickup,
      dropoff,
      mode || 'driving'
    );

    res.json({
      success: true,
      message: 'Route calculated successfully',
      data: route,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /calculate-eta
 * Calculate ETA with real-time traffic
 */
router.post('/calculate-eta', authMiddleware, async (req, res) => {
  try {
    const { currentLocation, destination } = req.body;

    if (!currentLocation || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Current location and destination required',
      });
    }

    const eta = await RouteOptimizationService.calculateETAWithTraffic(
      currentLocation,
      destination
    );

    res.json({
      success: true,
      message: 'ETA calculated successfully',
      data: eta,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /route-options
 * Get multiple route options for comparison
 */
router.post('/route-options', authMiddleware, async (req, res) => {
  try {
    const { pickup, dropoff } = req.body;

    if (!pickup || !dropoff) {
      return res.status(400).json({
        success: false,
        message: 'Pickup and dropoff coordinates required',
      });
    }

    const routes = await RouteOptimizationService.getMultipleRouteOptions(
      pickup,
      dropoff
    );

    res.json({
      success: true,
      message: 'Route options retrieved successfully',
      data: { routes },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /suggest-pickup-points
 * Find nearest pickup point suggestions
 */
router.post('/suggest-pickup-points', authMiddleware, async (req, res) => {
  try {
    const { userLocation, radius } = req.body;

    if (!userLocation) {
      return res.status(400).json({
        success: false,
        message: 'User location required',
      });
    }

    const suggestions = await RouteOptimizationService.suggestNearestPickupPoint(
      userLocation,
      radius || 500
    );

    res.json({
      success: true,
      message: 'Pickup suggestions retrieved successfully',
      data: { suggestions },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /reverse-geocode
 * Convert coordinates to address
 */
router.post('/reverse-geocode', authMiddleware, async (req, res) => {
  try {
    const { location } = req.body;

    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates required',
      });
    }

    const address = await RouteOptimizationService.reverseGeocode(location);

    res.json({
      success: true,
      message: 'Address retrieved successfully',
      data: { address },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /forward-geocode
 * Convert address to coordinates
 */
router.post('/forward-geocode', authMiddleware, async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address string required',
      });
    }

    const location = await RouteOptimizationService.forwardGeocode(address);

    res.json({
      success: true,
      message: 'Coordinates retrieved successfully',
      data: location,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /traffic-data
 * Get traffic layer data for a region
 */
router.post('/traffic-data', authMiddleware, async (req, res) => {
  try {
    const { center, radius } = req.body;

    if (!center) {
      return res.status(400).json({
        success: false,
        message: 'Center coordinates required',
      });
    }

    const trafficData = await RouteOptimizationService.getTrafficData(
      center,
      radius || 2
    );

    res.json({
      success: true,
      message: 'Traffic data retrieved successfully',
      data: trafficData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * LOCATION TRACKING ENDPOINTS (8 total)
 */

/**
 * POST /location/driver-update
 * Update driver's real-time location
 */
router.post('/location/driver-update', authMiddleware, async (req, res) => {
  try {
    const { location, additionalData } = req.body;
    const driverId = req.user.id;

    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Location data required',
      });
    }

    const updated = await LocationTrackingService.updateDriverLocation(
      driverId,
      location,
      additionalData
    );

    res.json({
      success: updated,
      message: 'Driver location updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /location/rider-update
 * Update rider's location
 */
router.post('/location/rider-update', authMiddleware, async (req, res) => {
  try {
    const { location } = req.body;
    const riderId = req.user.id;

    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Location data required',
      });
    }

    const updated = await LocationTrackingService.updateRiderLocation(
      riderId,
      location
    );

    res.json({
      success: updated,
      message: 'Rider location updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /location/driver/:driverId
 * Get driver's current location
 */
router.get('/location/driver/:driverId', authMiddleware, async (req, res) => {
  try {
    const location = await LocationTrackingService.getDriverLocation(
      req.params.driverId
    );

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Driver location not found',
      });
    }

    res.json({
      success: true,
      message: 'Driver location retrieved successfully',
      data: location,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /location/rider/:riderId
 * Get rider's current location
 */
router.get('/location/rider/:riderId', authMiddleware, async (req, res) => {
  try {
    const location = await LocationTrackingService.getRiderLocation(
      req.params.riderId
    );

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Rider location not found',
      });
    }

    res.json({
      success: true,
      message: 'Rider location retrieved successfully',
      data: location,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /location/history/:driverId
 * Get driver's location history
 */
router.get('/location/history/:driverId', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await LocationTrackingService.getDriverLocationHistory(
      req.params.driverId,
      limit
    );

    res.json({
      success: true,
      message: 'Location history retrieved successfully',
      data: { history },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /nearby-drivers
 * Get drivers within a radius
 */
router.post('/nearby-drivers', authMiddleware, async (req, res) => {
  try {
    const { center, radiusMeters } = req.body;

    if (!center) {
      return res.status(400).json({
        success: false,
        message: 'Center coordinates required',
      });
    }

    const drivers = await LocationTrackingService.getDriversNearby(
      center,
      radiusMeters || 5000
    );

    res.json({
      success: true,
      message: 'Nearby drivers retrieved successfully',
      data: { drivers, count: drivers.length },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /ride-tracking/:rideId
 * Get live tracking data for a ride
 */
router.get('/ride-tracking/:rideId', authMiddleware, async (req, res) => {
  try {
    const tracking = await LocationTrackingService.getLiveRideTracking(
      req.params.rideId
    );

    res.json({
      success: true,
      message: 'Ride tracking data retrieved successfully',
      data: tracking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
