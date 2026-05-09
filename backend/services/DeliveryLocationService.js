/**
 * Delivery Location Service - Phase 9 Feature A
 * Real-time GPS tracking, geofencing, delivery partner location management
 */

const DeliveryPartnerLocation = require('../models/DeliveryPartnerLocation');

class DeliveryLocationService {
  /**
   * Initialize delivery partner location tracking
   */
  static async initializeTracking(deliveryPartnerId, restaurantId) {
    try {
      const locationId = `LOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const location = new DeliveryPartnerLocation({
        locationId,
        deliveryPartnerId,
        restaurantId,
        onlineStatus: 'online',
      });

      await location.save();
      return { success: true, data: location };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Update real-time GPS location
   */
  static async updateLocation(deliveryPartnerId, latitude, longitude, accuracy = 10, speed = 0, heading = 0) {
    try {
      const location = await DeliveryPartnerLocation.findOne({ deliveryPartnerId });
      if (!location) {
        return { success: false, message: 'Location record not found' };
      }

      // Update current location with GeoJSON
      location.location = {
        type: 'Point',
        coordinates: [longitude, latitude],
      };

      location.address = `${latitude}, ${longitude}`;
      location.updatedAt = new Date();
      location.accuracy = accuracy;
      location.speed = speed;
      location.heading = heading;

      // Add to movement history (keep last 100)
      location.movementHistory.push({
        lat: latitude,
        long: longitude,
        timestamp: new Date(),
        speed,
        heading,
      });

      if (location.movementHistory.length > 100) {
        location.movementHistory.shift();
      }

      await location.save();
      return { success: true, data: location, message: 'Location updated' };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Record stop location
   */
  static async recordStop(deliveryPartnerId, latitude, longitude, stopType, duration) {
    try {
      const location = await DeliveryPartnerLocation.findOne({ deliveryPartnerId });
      if (!location) {
        return { success: false, message: 'Location record not found' };
      }

      location.lastStopsHistory.push({
        lat: latitude,
        long: longitude,
        arrivedAt: new Date(),
        leftAt: null,
        duration,
        type: stopType,
      });

      if (location.lastStopsHistory.length > 50) {
        location.lastStopsHistory.shift();
      }

      await location.save();
      return { success: true, data: location, message: 'Stop recorded' };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Update online status
   */
  static async updateOnlineStatus(deliveryPartnerId, status) {
    try {
      const location = await DeliveryPartnerLocation.findOne({ deliveryPartnerId });
      if (!location) {
        return { success: false, message: 'Location record not found' };
      }

      location.onlineStatus = status;
      await location.save();

      return { success: true, data: location, message: 'Online status updated' };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get delivery partners within radius
   */
  static async getAvailablePartnersNearby(latitude, longitude, radiusKm = 5) {
    try {
      const partners = await DeliveryPartnerLocation.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusKm * 1000,
          },
        },
        onlineStatus: 'online',
      }).limit(10);

      return {
        success: true,
        data: partners,
        message: `Found ${partners.length} available partners`,
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Calculate efficiency score for delivery partner
   */
  static async calculateEfficiencyScore(deliveryPartnerId) {
    try {
      const location = await DeliveryPartnerLocation.findOne({ deliveryPartnerId });
      if (!location) {
        return { success: false, message: 'Location record not found' };
      }

      // Calculate efficiency based on multiple factors
      const avgDeliveryTime = location.analytics.averageDeliveryTime || 30;
      const onTimePercentage = location.analytics.onTimePercentage || 80;
      const avgSpeed = location.speed || 20;

      // Efficiency score formula
      const timeScore = Math.min(100, (25 / avgDeliveryTime) * 100);
      const punctualityScore = onTimePercentage * 1;
      const speedScore = Math.min(100, (avgSpeed / 40) * 100);

      const efficiencyScore = (timeScore * 0.3 + punctualityScore * 0.5 + speedScore * 0.2);

      location.analytics.efficiencyScore = Math.min(100, Math.round(efficiencyScore));
      await location.save();

      return {
        success: true,
        data: {
          deliveryPartnerId,
          efficiencyScore: location.analytics.efficiencyScore,
          timeScore,
          punctualityScore,
          speedScore,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get location history for delivery partner
   */
  static async getLocationHistory(deliveryPartnerId, limit = 50) {
    try {
      const location = await DeliveryPartnerLocation.findOne({ deliveryPartnerId });
      if (!location) {
        return { success: false, message: 'Location record not found' };
      }

      const history = location.movementHistory.slice(-limit);

      return {
        success: true,
        data: {
          deliveryPartnerId,
          totalRecords: location.movementHistory.length,
          history,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get geofence alerts
   */
  static async getGeofenceAlerts(deliveryPartnerId) {
    try {
      const location = await DeliveryPartnerLocation.findOne({ deliveryPartnerId });
      if (!location) {
        return { success: false, message: 'Location record not found' };
      }

      const recentGeofences = location.geofences.filter((g) => !g.leftAt);

      return {
        success: true,
        data: {
          deliveryPartnerId,
          activeGeofences: recentGeofences,
          totalGeofencesEntered: location.geofences.length,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Update today's metrics
   */
  static async updateTodayMetrics(deliveryPartnerId) {
    try {
      const location = await DeliveryPartnerLocation.findOne({ deliveryPartnerId });
      if (!location) {
        return { success: false, message: 'Location record not found' };
      }

      // Calculate distance from movement history
      let totalDistance = 0;
      for (let i = 1; i < location.movementHistory.length; i++) {
        const prev = location.movementHistory[i - 1];
        const curr = location.movementHistory[i];
        // Simple distance calculation (in real app, use haversine)
        totalDistance += Math.sqrt(Math.pow(curr.lat - prev.lat, 2) + Math.pow(curr.long - prev.long, 2)) * 111;
      }

      location.todayMetrics.totalDistance = totalDistance;

      // Calculate total time
      const firstMove = location.movementHistory[0];
      const lastMove = location.movementHistory[location.movementHistory.length - 1];
      if (firstMove && lastMove) {
        const timeDiff = (lastMove.timestamp - firstMove.timestamp) / (1000 * 60);
        location.todayMetrics.totalTime = timeDiff;
      }

      await location.save();

      return {
        success: true,
        data: location.todayMetrics,
        message: 'Today metrics updated',
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }

  /**
   * Get connectivity status
   */
  static async getConnectivityStatus(deliveryPartnerId) {
    try {
      const location = await DeliveryPartnerLocation.findOne({ deliveryPartnerId });
      if (!location) {
        return { success: false, message: 'Location record not found' };
      }

      return {
        success: true,
        data: {
          deliveryPartnerId,
          isConnected: location.connectivity.isConnected,
          lastSyncTime: location.connectivity.lastSyncTime,
          signalStrength: location.connectivity.signalStrength,
          connectionType: location.connectivity.connectionType,
        },
      };
    } catch (error) {
      return { success: false, message: error.message, errors: [error] };
    }
  }
}

module.exports = DeliveryLocationService;
