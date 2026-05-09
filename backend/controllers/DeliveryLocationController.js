/**
 * Delivery Location Controller - Phase 9 Feature A
 * REST endpoints for delivery partner GPS tracking
 */

const DeliveryLocationService = require('../services/DeliveryLocationService');

class DeliveryLocationController {
  /**
   * POST /api/phase9/location/initialize
   * Initialize delivery partner location tracking
   */
  static async initializeTracking(req, res) {
    try {
      const { deliveryPartnerId, restaurantId } = req.body;

      if (!deliveryPartnerId || !restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'deliveryPartnerId and restaurantId are required',
        });
      }

      const result = await DeliveryLocationService.initializeTracking(deliveryPartnerId, restaurantId);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/location/:deliveryPartnerId/update
   * Update GPS location
   */
  static async updateLocation(req, res) {
    try {
      const { deliveryPartnerId } = req.params;
      const { latitude, longitude, accuracy, speed, heading } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
      }

      const result = await DeliveryLocationService.updateLocation(
        deliveryPartnerId,
        latitude,
        longitude,
        accuracy,
        speed,
        heading
      );
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/phase9/location/:deliveryPartnerId/stop
   * Record stop location
   */
  static async recordStop(req, res) {
    try {
      const { deliveryPartnerId } = req.params;
      const { latitude, longitude, stopType, duration } = req.body;

      if (!latitude || !longitude || !stopType) {
        return res.status(400).json({
          success: false,
          message: 'Latitude, longitude, and stopType are required',
        });
      }

      const result = await DeliveryLocationService.recordStop(deliveryPartnerId, latitude, longitude, stopType, duration);
      res.status(result.success ? 201 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/location/:deliveryPartnerId/status
   * Update online status
   */
  static async updateOnlineStatus(req, res) {
    try {
      const { deliveryPartnerId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required',
        });
      }

      const result = await DeliveryLocationService.updateOnlineStatus(deliveryPartnerId, status);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/location/nearby
   * Get available partners nearby
   */
  static async getAvailablePartnersNearby(req, res) {
    try {
      const { latitude, longitude, radius } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
      }

      const result = await DeliveryLocationService.getAvailablePartnersNearby(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(radius) || 5
      );
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/location/:deliveryPartnerId/efficiency
   * Calculate efficiency score
   */
  static async calculateEfficiencyScore(req, res) {
    try {
      const { deliveryPartnerId } = req.params;

      const result = await DeliveryLocationService.calculateEfficiencyScore(deliveryPartnerId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/location/:deliveryPartnerId/history
   * Get location history
   */
  static async getLocationHistory(req, res) {
    try {
      const { deliveryPartnerId } = req.params;
      const { limit } = req.query;

      const result = await DeliveryLocationService.getLocationHistory(deliveryPartnerId, parseInt(limit) || 50);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/location/:deliveryPartnerId/geofence
   * Get geofence alerts
   */
  static async getGeofenceAlerts(req, res) {
    try {
      const { deliveryPartnerId } = req.params;

      const result = await DeliveryLocationService.getGeofenceAlerts(deliveryPartnerId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/phase9/location/:deliveryPartnerId/metrics
   * Update today's metrics
   */
  static async updateTodayMetrics(req, res) {
    try {
      const { deliveryPartnerId } = req.params;

      const result = await DeliveryLocationService.updateTodayMetrics(deliveryPartnerId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/phase9/location/:deliveryPartnerId/connectivity
   * Get connectivity status
   */
  static async getConnectivityStatus(req, res) {
    try {
      const { deliveryPartnerId } = req.params;

      const result = await DeliveryLocationService.getConnectivityStatus(deliveryPartnerId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = DeliveryLocationController;
