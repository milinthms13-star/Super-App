/**
 * rideSharingPhase6Routes.js
 * Phase 6: Advanced Booking Options Routes
 * Scheduled Rides, Multiple Stops, Favorite Locations
 */

const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/auth');
const validateRequest = require('../../middleware/validateRequest');

const ScheduledRideService = require('../services/ridesharing/ScheduledRideService');
const MultipleStopService = require('../services/ridesharing/MultipleStopService');
const FavoriteLocationService = require('../services/ridesharing/FavoriteLocationService');

// ============================================
// SCHEDULED RIDES ENDPOINTS (8 routes)
// ============================================

/**
 * POST /scheduled-rides/create
 * Create a scheduled ride for future date/time
 */
router.post('/scheduled-rides/create', authenticateToken, async (req, res) => {
  try {
    const { scheduledDateTime, pickup, dropoff, rideType, paymentMethod, preferredGender, specialRequests } = req.body;

    // Validation
    if (!scheduledDateTime || !pickup || !dropoff || !rideType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: scheduledDateTime, pickup, dropoff, rideType',
      });
    }

    const result = await ScheduledRideService.createScheduledRide(req.user.id, {
      scheduledDateTime,
      pickup,
      dropoff,
      rideType,
      paymentMethod,
      preferredGender,
      specialRequests,
    });

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /scheduled-rides/confirm
 * Confirm scheduled ride booking (process payment)
 */
router.post('/scheduled-rides/confirm', authenticateToken, async (req, res) => {
  try {
    const { scheduleId } = req.body;

    if (!scheduleId) {
      return res.status(400).json({
        success: false,
        message: 'scheduleId is required',
      });
    }

    const result = await ScheduledRideService.confirmScheduledRide(scheduleId, req.user.id);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /scheduled-rides/:scheduleId
 * Get scheduled ride details
 */
router.get('/scheduled-rides/:scheduleId', authenticateToken, async (req, res) => {
  try {
    const result = await ScheduledRideService.getScheduledRide(req.params.scheduleId, req.user.id);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /scheduled-rides
 * Get all scheduled rides (with optional status filter)
 */
router.get('/scheduled-rides', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;

    const result = await ScheduledRideService.getScheduledRides(req.user.id, status);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /scheduled-rides/:scheduleId/cancel
 * Cancel scheduled ride with cancellation charges
 */
router.post('/scheduled-rides/:scheduleId/cancel', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;

    const result = await ScheduledRideService.cancelScheduledRide(
      req.params.scheduleId,
      req.user.id,
      reason || 'user_request'
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /scheduled-rides/:scheduleId/reschedule
 * Reschedule to different date/time
 */
router.post('/scheduled-rides/:scheduleId/reschedule', authenticateToken, async (req, res) => {
  try {
    const { newDateTime } = req.body;

    if (!newDateTime) {
      return res.status(400).json({
        success: false,
        message: 'newDateTime is required',
      });
    }

    const result = await ScheduledRideService.rescheduleRide(
      req.params.scheduleId,
      req.user.id,
      newDateTime
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /scheduled-rides/:scheduleId/reminder-status
 * Update reminder notification status
 */
router.post('/scheduled-rides/:scheduleId/reminder-status', authenticateToken, async (req, res) => {
  try {
    const { reminderType, sent } = req.body;

    if (!reminderType) {
      return res.status(400).json({
        success: false,
        message: 'reminderType is required (day_before, one_hour, fifteen_min)',
      });
    }

    const result = await ScheduledRideService.updateReminderStatus(
      req.params.scheduleId,
      reminderType,
      sent || true
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// MULTIPLE STOP ENDPOINTS (8 routes)
// ============================================

/**
 * POST /multi-stop/create
 * Create multi-stop ride with automatic route optimization
 */
router.post('/multi-stop/create', authenticateToken, async (req, res) => {
  try {
    const { stops, rideType, paymentMethod, optimizeRoute } = req.body;

    if (!stops || !rideType) {
      return res.status(400).json({
        success: false,
        message: 'stops and rideType are required',
      });
    }

    const result = await MultipleStopService.createMultiStopRide(req.user.id, {
      stops,
      rideType,
      paymentMethod,
      optimizeRoute: optimizeRoute !== false,
    });

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /multi-stop/:rideId
 * Get multi-stop ride details
 */
router.get('/multi-stop/:rideId', authenticateToken, async (req, res) => {
  try {
    const result = await MultipleStopService.getMultiStopRide(req.params.rideId, req.user.id);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /multi-stop/history/:limit
 * Get multi-stop ride history
 */
router.get('/multi-stop/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const result = await MultipleStopService.getMultiStopRideHistory(req.user.id, limit);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /multi-stop/:rideId/add-stop
 * Add intermediate stop to existing ride
 */
router.post('/multi-stop/:rideId/add-stop', authenticateToken, async (req, res) => {
  try {
    const { address, lat, lng, contactPerson, contactPhone } = req.body;

    if (!address || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'address, lat, and lng are required',
      });
    }

    const result = await MultipleStopService.addStop(req.params.rideId, req.user.id, {
      address,
      lat,
      lng,
      contactPerson,
      contactPhone,
    });

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /multi-stop/:rideId/remove-stop
 * Remove intermediate stop
 */
router.post('/multi-stop/:rideId/remove-stop', authenticateToken, async (req, res) => {
  try {
    const { stopIndex } = req.body;

    if (stopIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: 'stopIndex is required',
      });
    }

    const result = await MultipleStopService.removeStop(req.params.rideId, req.user.id, stopIndex);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /multi-stop/:rideId/update-stop
 * Update stop details
 */
router.post('/multi-stop/:rideId/update-stop', authenticateToken, async (req, res) => {
  try {
    const { stopIndex, address, lat, lng, contactPerson, contactPhone } = req.body;

    if (stopIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: 'stopIndex is required',
      });
    }

    const result = await MultipleStopService.updateStop(
      req.params.rideId,
      req.user.id,
      stopIndex,
      { address, lat, lng, contactPerson, contactPhone }
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /multi-stop/:rideId/tracking
 * Get live tracking for multi-stop ride
 */
router.get('/multi-stop/:rideId/tracking', authenticateToken, async (req, res) => {
  try {
    const result = await MultipleStopService.getLiveTracking(req.params.rideId, req.user.id);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /multi-stop/:rideId/mark-stop-completed
 * Mark stop as completed (driver only)
 */
router.post('/multi-stop/:rideId/mark-stop-completed', authenticateToken, async (req, res) => {
  try {
    const { stopIndex } = req.body;

    if (stopIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: 'stopIndex is required',
      });
    }

    const result = await MultipleStopService.markStopCompleted(
      req.params.rideId,
      req.user.id,
      stopIndex
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// FAVORITE LOCATIONS ENDPOINTS (10 routes)
// ============================================

/**
 * POST /favorites/add
 * Add favorite location
 */
router.post('/favorites/add', authenticateToken, async (req, res) => {
  try {
    const { address, lat, lng, label, contactPerson, contactPhone } = req.body;

    if (!address || lat === undefined || lng === undefined || !label) {
      return res.status(400).json({
        success: false,
        message: 'address, lat, lng, and label are required',
      });
    }

    // Validate coordinates
    const validation = FavoriteLocationService.validateCoordinates(lat, lng);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const result = await FavoriteLocationService.addFavoriteLocation(req.user.id, {
      address,
      lat,
      lng,
      label,
      contactPerson,
      contactPhone,
    });

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /favorites
 * Get all favorite locations
 */
router.get('/favorites', authenticateToken, async (req, res) => {
  try {
    const result = await FavoriteLocationService.getFavoriteLocations(req.user.id);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /favorites/:favoriteId
 * Get favorite location by ID
 */
router.get('/favorites/:favoriteId', authenticateToken, async (req, res) => {
  try {
    const result = await FavoriteLocationService.getFavoriteLocation(
      req.user.id,
      req.params.favoriteId
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /favorites/label/:label
 * Get favorite by label (home, work, gym, etc.)
 */
router.get('/favorites/label/:label', authenticateToken, async (req, res) => {
  try {
    const result = await FavoriteLocationService.getFavoriteByLabel(req.user.id, req.params.label);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /favorites/:favoriteId
 * Update favorite location
 */
router.put('/favorites/:favoriteId', authenticateToken, async (req, res) => {
  try {
    const result = await FavoriteLocationService.updateFavoriteLocation(
      req.user.id,
      req.params.favoriteId,
      req.body
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /favorites/:favoriteId
 * Delete favorite location
 */
router.delete('/favorites/:favoriteId', authenticateToken, async (req, res) => {
  try {
    const result = await FavoriteLocationService.deleteFavoriteLocation(req.user.id, req.params.favoriteId);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /favorites/:favoriteId/rename
 * Rename favorite location label
 */
router.post('/favorites/:favoriteId/rename', authenticateToken, async (req, res) => {
  try {
    const { newLabel } = req.body;

    if (!newLabel) {
      return res.status(400).json({
        success: false,
        message: 'newLabel is required',
      });
    }

    const result = await FavoriteLocationService.renameFavoriteLocation(
      req.user.id,
      req.params.favoriteId,
      newLabel
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /favorites/quick-pick/:limit
 * Get quick-pick locations (most used)
 */
router.get('/favorites/quick-pick', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const result = await FavoriteLocationService.getQuickPickLocations(req.user.id, limit);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /favorites/track-usage/:favoriteId
 * Track location usage (after ride completion)
 */
router.post('/favorites/track-usage/:favoriteId', authenticateToken, async (req, res) => {
  try {
    const result = await FavoriteLocationService.trackLocationUsage(req.user.id, req.params.favoriteId);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /favorites/search
 * Search favorite locations by address or label
 */
router.get('/favorites/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'search query is required',
      });
    }

    const result = await FavoriteLocationService.searchFavoriteLocations(req.user.id, query);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /favorites/nearby
 * Get nearby favorite locations (within 500m)
 */
router.get('/favorites/nearby', authenticateToken, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'lat and lng query parameters are required',
      });
    }

    const result = await FavoriteLocationService.getNearbyFavorites(
      req.user.id,
      parseFloat(lat),
      parseFloat(lng)
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /favorites/statistics
 * Get location usage statistics
 */
router.get('/favorites/statistics', authenticateToken, async (req, res) => {
  try {
    const result = await FavoriteLocationService.getLocationStatistics(req.user.id);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /favorites/predefined-labels
 * Get predefined location labels (home, work, gym, etc.)
 */
router.get('/favorites/predefined-labels', authenticateToken, async (req, res) => {
  try {
    const labels = FavoriteLocationService.getPredefinedLabels();

    res.status(200).json({
      success: true,
      data: labels,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
