/**
 * LocationTrackingService.js
 * Real-time location tracking and updates for drivers and riders
 */

const redis = require('redis');
const { RideRequest, Driver } = require('../../models');

class LocationTrackingService {
  constructor() {
    this.redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    });

    this.redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.LOCATION_EXPIRY = 300; // 5 minutes in seconds
    this.LOCATION_HISTORY_LIMIT = 100; // Store last 100 locations
  }

  /**
   * Update driver's real-time location
   * @param {String} driverId - Driver's user ID
   * @param {Object} location - {lat, lng, accuracy, timestamp}
   * @param {Object} additionalData - {speed, heading, altitude}
   * @returns {Promise<Boolean>}
   */
  async updateDriverLocation(driverId, location, additionalData = {}) {
    try {
      if (!driverId || !this.validateLocation(location)) {
        throw new Error('Invalid driver ID or location data');
      }

      const timestamp = location.timestamp || new Date().toISOString();
      const locationData = {
        driverId,
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy || 20,
        speed: additionalData.speed || 0,
        heading: additionalData.heading || 0,
        altitude: additionalData.altitude || 0,
        timestamp,
      };

      // Store current location (with 5-min expiry)
      const currentLocationKey = `location:driver:${driverId}:current`;
      await this.redisClient.setex(
        currentLocationKey,
        this.LOCATION_EXPIRY,
        JSON.stringify(locationData)
      );

      // Store location history (append to list)
      const historyKey = `location:driver:${driverId}:history`;
      await this.redisClient.lpush(historyKey, JSON.stringify(locationData));
      await this.redisClient.ltrim(historyKey, 0, this.LOCATION_HISTORY_LIMIT - 1);

      // Update driver's active rides with ETA
      await this.updateRideETAs(driverId, location);

      return true;
    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  }

  /**
   * Update rider's location (pickup or during ride)
   * @param {String} riderId - Rider's user ID
   * @param {Object} location - {lat, lng, accuracy, timestamp}
   * @returns {Promise<Boolean>}
   */
  async updateRiderLocation(riderId, location) {
    try {
      if (!riderId || !this.validateLocation(location)) {
        throw new Error('Invalid rider ID or location data');
      }

      const timestamp = location.timestamp || new Date().toISOString();
      const locationData = {
        riderId,
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy || 20,
        timestamp,
      };

      // Store current location (with 5-min expiry)
      const currentLocationKey = `location:rider:${riderId}:current`;
      await this.redisClient.setex(
        currentLocationKey,
        this.LOCATION_EXPIRY,
        JSON.stringify(locationData)
      );

      // Store location history
      const historyKey = `location:rider:${riderId}:history`;
      await this.redisClient.lpush(historyKey, JSON.stringify(locationData));
      await this.redisClient.ltrim(historyKey, 0, this.LOCATION_HISTORY_LIMIT - 1);

      return true;
    } catch (error) {
      console.error('Error updating rider location:', error);
      throw error;
    }
  }

  /**
   * Get driver's current location
   * @param {String} driverId
   * @returns {Promise<Object|null>}
   */
  async getDriverLocation(driverId) {
    try {
      const key = `location:driver:${driverId}:current`;
      const locationData = await this.redisClient.get(key);
      return locationData ? JSON.parse(locationData) : null;
    } catch (error) {
      console.error('Error getting driver location:', error);
      throw error;
    }
  }

  /**
   * Get rider's current location
   * @param {String} riderId
   * @returns {Promise<Object|null>}
   */
  async getRiderLocation(riderId) {
    try {
      const key = `location:rider:${riderId}:current`;
      const locationData = await this.redisClient.get(key);
      return locationData ? JSON.parse(locationData) : null;
    } catch (error) {
      console.error('Error getting rider location:', error);
      throw error;
    }
  }

  /**
   * Get driver's location history
   * @param {String} driverId
   * @param {Number} limit - Number of records to fetch
   * @returns {Promise<Array>}
   */
  async getDriverLocationHistory(driverId, limit = 50) {
    try {
      const key = `location:driver:${driverId}:history`;
      const history = await this.redisClient.lrange(key, 0, limit - 1);
      return history.map(item => JSON.parse(item));
    } catch (error) {
      console.error('Error getting driver location history:', error);
      throw error;
    }
  }

  /**
   * Get multiple drivers' locations for map display
   * @param {Array} driverIds
   * @returns {Promise<Object>} - Map of driverId -> location
   */
  async getMultipleDriverLocations(driverIds) {
    try {
      const locations = {};

      for (const driverId of driverIds) {
        const location = await this.getDriverLocation(driverId);
        if (location) {
          locations[driverId] = location;
        }
      }

      return locations;
    } catch (error) {
      console.error('Error getting multiple driver locations:', error);
      throw error;
    }
  }

  /**
   * Get drivers within a radius (geospatial query)
   * @param {Object} center - {lat, lng}
   * @param {Number} radiusMeters - Search radius
   * @returns {Promise<Array>}
   */
  async getDriversNearby(center, radiusMeters = 5000) {
    try {
      // For simplicity, fetch all drivers and filter (in production, use geospatial DB)
      const drivers = await Driver.find({ isOnline: true, availabilityStatus: 'available' });
      
      const nearby = [];
      for (const driver of drivers) {
        const location = await this.getDriverLocation(driver._id.toString());
        if (location) {
          const distance = this.calculateDistance(center, location);
          if (distance <= radiusMeters / 1000) { // Convert to km
            nearby.push({
              driverId: driver._id,
              location,
              distance: Math.round(distance * 1000), // Convert back to meters
              rating: driver.rating,
              vehicleType: driver.vehicleType,
            });
          }
        }
      }

      return nearby.sort((a, b) => a.distance - b.distance);
    } catch (error) {
      console.error('Error getting nearby drivers:', error);
      throw error;
    }
  }

  /**
   * Track ride in progress
   * @param {String} rideId - Ride request ID
   * @param {String} driverId - Driver's user ID
   * @param {String} riderId - Rider's user ID
   * @returns {Promise<Object>} - Tracking data
   */
  async trackRideInProgress(rideId, driverId, riderId) {
    try {
      const driverLocation = await this.getDriverLocation(driverId);
      const riderLocation = await this.getRiderLocation(riderId);

      if (!driverLocation) {
        throw new Error('Driver location not available');
      }

      // Calculate distance between driver and rider
      const distance = this.calculateDistance(driverLocation, riderLocation);

      return {
        rideId,
        driverId,
        riderId,
        driverLocation,
        riderLocation,
        distanceBetween: Math.round(distance * 1000), // In meters
        trackingTimestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error tracking ride:', error);
      throw error;
    }
  }

  /**
   * Get live tracking data for ride
   * @param {String} rideId
   * @returns {Promise<Object>}
   */
  async getLiveRideTracking(rideId) {
    try {
      const ride = await RideRequest.findById(rideId);
      if (!ride) {
        throw new Error('Ride not found');
      }

      const driverLocation = await this.getDriverLocation(ride.driverId.toString());
      const riderLocation = await this.getRiderLocation(ride.riderId.toString());

      if (!driverLocation) {
        throw new Error('Driver location not available');
      }

      return {
        rideId,
        status: ride.status,
        driverLocation,
        riderLocation,
        pickupLocation: {
          lat: ride.pickup.lat,
          lng: ride.pickup.lng,
        },
        dropoffLocation: {
          lat: ride.dropoff.lat,
          lng: ride.dropoff.lng,
        },
        distanceToPickup: this.calculateDistance(driverLocation, {
          lat: ride.pickup.lat,
          lng: ride.pickup.lng,
        }),
        distanceToDropoff: this.calculateDistance(
          driverLocation,
          {
            lat: ride.dropoff.lat,
            lng: ride.dropoff.lng,
          }
        ),
        trackingTimestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting live ride tracking:', error);
      throw error;
    }
  }

  /**
   * Clear location data for user
   * @param {String} userId
   * @param {String} userType - 'driver' or 'rider'
   * @returns {Promise<Boolean>}
   */
  async clearUserLocation(userId, userType = 'driver') {
    try {
      const currentKey = `location:${userType}:${userId}:current`;
      const historyKey = `location:${userType}:${userId}:history`;

      await this.redisClient.del(currentKey);
      await this.redisClient.del(historyKey);

      return true;
    } catch (error) {
      console.error('Error clearing user location:', error);
      throw error;
    }
  }

  /**
   * Helper: Update ETAs for all active rides of a driver
   * @private
   */
  async updateRideETAs(driverId, driverLocation) {
    try {
      const activeRides = await RideRequest.find({
        driverId,
        status: { $in: ['accepted', 'arrived', 'in_progress'] },
      });

      for (const ride of activeRides) {
        // This would integrate with RouteOptimizationService
        const etaKey = `eta:ride:${ride._id}`;
        const etaData = {
          updatedAt: new Date().toISOString(),
          lastKnownLocation: driverLocation,
        };
        await this.redisClient.setex(etaKey, 600, JSON.stringify(etaData));
      }
    } catch (error) {
      console.error('Error updating ride ETAs:', error);
    }
  }

  /**
   * Helper: Validate location object
   * @private
   */
  validateLocation(location) {
    return location &&
      typeof location.lat === 'number' &&
      typeof location.lng === 'number' &&
      location.lat >= -90 && location.lat <= 90 &&
      location.lng >= -180 && location.lng <= 180;
  }

  /**
   * Helper: Calculate distance between two points
   * @private
   */
  calculateDistance(from, to) {
    const R = 6371; // Earth's radius in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

module.exports = new LocationTrackingService();
