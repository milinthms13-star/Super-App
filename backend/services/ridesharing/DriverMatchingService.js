/**
 * DriverMatchingService.js
 * Phase 5: Intelligent Driver Matching
 * Advanced driver allocation using geospatial queries, preferences, and ratings
 */

const DriverProfile = require('../../models/DriverProfile');
const RideRequest = require('../../models/RideRequest');
const RiderProfile = require('../../models/RiderProfile');

class DriverMatchingService {
  /**
   * Find nearest available drivers using geospatial queries
   * MongoDB 2dsphere index required on drivers collection
   */
  static async findNearestDrivers(pickupLat, pickupLng, rideType, maxDistance = 5000) {
    try {
      const drivers = await DriverProfile.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [parseFloat(pickupLng), parseFloat(pickupLat)],
            },
            distanceField: 'distance',
            maxDistance: maxDistance, // 5km in meters
            query: {
              availabilityStatus: 'available',
              vehicleType: rideType,
              isOnline: true,
              kycStatus: 'approved',
              isVerified: true,
            },
            spherical: true,
          },
        },
        {
          $limit: 10, // Get top 10 nearest drivers
        },
        {
          $sort: { rating: -1, distance: 1 },
        },
        {
          $project: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            phone: 1,
            currentLat: 1,
            currentLng: 1,
            distance: 1,
            vehicleType: 1,
            vehicleNumber: 1,
            rating: 1,
            totalRides: 1,
            acceptanceRate: 1,
            cancellationRate: 1,
            performanceScore: 1,
            isVerified: 1,
          },
        },
      ]);

      return drivers;
    } catch (error) {
      throw new Error(`Error finding nearest drivers: ${error.message}`);
    }
  }

  /**
   * Filter drivers based on preference matching
   * Considers rider preferences, driver specializations
   */
  static async filterByPreference(drivers, riderId, rideType) {
    try {
      const rider = await RiderProfile.findById(riderId);

      if (!rider || !rider.driverPreferences) {
        return drivers; // Return all drivers if no preferences
      }

      const preferences = rider.driverPreferences;
      const filtered = drivers.filter((driver) => {
        let score = 100;

        // Gender preference
        if (
          preferences.preferredGender &&
          preferences.preferredGender !== 'any' &&
          driver.gender !== preferences.preferredGender
        ) {
          score -= 30;
        }

        // Language preference
        if (
          preferences.preferredLanguages &&
          preferences.preferredLanguages.length > 0 &&
          !preferences.preferredLanguages.some((lang) =>
            driver.languages?.includes(lang)
          )
        ) {
          score -= 15;
        }

        // AC preference
        if (
          preferences.preferAC &&
          driver.vehicleFeatures?.acAvailable === false
        ) {
          score -= 20;
        }

        // Music preference
        if (
          preferences.musicPreference === 'quiet' &&
          driver.musicPreference === 'loud'
        ) {
          score -= 10;
        }

        driver.preferenceScore = score;
        return score >= 50; // Keep drivers with 50+ score
      });

      // Sort by preference score, then rating
      return filtered.sort(
        (a, b) => b.preferenceScore - a.preferenceScore || b.rating - a.rating
      );
    } catch (error) {
      console.error('Error filtering by preference:', error);
      return drivers; // Return original list if filtering fails
    }
  }

  /**
   * Apply rating-based filtering
   * Prioritize high-rated drivers for premium experiences
   */
  static filterByRating(drivers, minRating = 3.5) {
    return drivers.filter((driver) => {
      const rating = driver.rating || 0;
      return rating >= minRating;
    });
  }

  /**
   * Intelligent driver matching algorithm
   * Considers: distance, rating, preferences, performance, acceptance rate
   */
  static async smartMatch(pickupLat, pickupLng, riderId, rideType, options = {}) {
    try {
      const maxDistance = options.maxDistance || 5000; // 5km default
      const minRating = options.minRating || 3.0;
      const considerPreferences = options.considerPreferences !== false;

      // Step 1: Find nearest drivers
      const nearestDrivers = await this.findNearestDrivers(
        pickupLat,
        pickupLng,
        rideType,
        maxDistance
      );

      if (nearestDrivers.length === 0) {
        return {
          success: false,
          message: 'No available drivers in your area',
          data: null,
        };
      }

      // Step 2: Apply preference filtering
      let matchedDrivers = nearestDrivers;
      if (considerPreferences) {
        matchedDrivers = await this.filterByPreference(
          nearestDrivers,
          riderId,
          rideType
        );
      }

      // Step 3: Apply rating filter
      matchedDrivers = this.filterByRating(matchedDrivers, minRating);

      if (matchedDrivers.length === 0) {
        // Fallback: return nearest without rating filter
        matchedDrivers = nearestDrivers.slice(0, 5);
      }

      // Step 4: Apply performance scoring
      matchedDrivers = this.applyPerformanceScoring(matchedDrivers);

      // Return top 3 drivers for parallel requests
      return {
        success: true,
        message: 'Drivers matched successfully',
        data: {
          topDrivers: matchedDrivers.slice(0, 3),
          allDrivers: matchedDrivers,
          totalAvailable: nearestDrivers.length,
        },
      };
    } catch (error) {
      throw new Error(`Error in smart matching: ${error.message}`);
    }
  }

  /**
   * Apply performance scoring to drivers
   * Factors: acceptance rate, cancellation rate, completion rate, rating
   */
  static applyPerformanceScoring(drivers) {
    return drivers.map((driver) => {
      let performanceScore = 100;

      // Acceptance rate (max +30 points)
      const acceptanceRate = driver.acceptanceRate || 0;
      performanceScore += acceptanceRate > 0.8 ? 30 : acceptanceRate > 0.6 ? 20 : 10;

      // Cancellation rate (max -30 points)
      const cancellationRate = driver.cancellationRate || 0;
      performanceScore -= cancellationRate > 0.2 ? 30 : cancellationRate > 0.1 ? 15 : 0;

      // Rating-based bonus (max +20 points)
      const rating = driver.rating || 3.0;
      performanceScore += rating > 4.5 ? 20 : rating > 4.0 ? 15 : 10;

      // Total rides (experience bonus, max +10 points)
      const totalRides = driver.totalRides || 0;
      performanceScore += totalRides > 500 ? 10 : totalRides > 100 ? 5 : 0;

      driver.matchingScore = Math.max(0, Math.min(100, performanceScore));
      return driver;
    });
  }

  /**
   * Multi-driver parallel request (fanout pattern)
   * Send ride request to top 3-5 drivers simultaneously
   */
  static async sendParallelRequests(rideRequestId, topDrivers) {
    try {
      const rideRequest = await RideRequest.findById(rideRequestId);

      if (!rideRequest) {
        throw new Error('Ride request not found');
      }

      const driverIds = topDrivers.map((d) => d._id);
      const requests = [];

      for (const driverId of driverIds) {
        const driverRequest = await DriverProfile.findByIdAndUpdate(
          driverId,
          {
            $push: {
              pendingRequests: {
                rideRequestId,
                sentAt: new Date(),
                expiresAt: new Date(Date.now() + 30000), // 30 second timeout
              },
            },
          },
          { new: true }
        );

        requests.push({
          driverId: driverId,
          sentAt: new Date(),
          expiresAt: new Date(Date.now() + 30000),
          status: 'pending',
        });
      }

      // Update ride request with pending drivers
      await RideRequest.findByIdAndUpdate(rideRequestId, {
        $set: {
          pendingDrivers: requests,
          matchingStatus: 'broadcast',
          broadcastAt: new Date(),
        },
      });

      return {
        success: true,
        message: `Request sent to ${driverIds.length} drivers`,
        data: {
          rideRequestId,
          driverCount: driverIds.length,
          requestsSent: requests,
        },
      };
    } catch (error) {
      throw new Error(`Error sending parallel requests: ${error.message}`);
    }
  }

  /**
   * Handle driver acceptance
   * Accept first response, reject others
   */
  static async handleDriverAcceptance(rideRequestId, driverId) {
    try {
      const rideRequest = await RideRequest.findById(rideRequestId);

      if (!rideRequest) {
        throw new Error('Ride request not found');
      }

      // Mark as accepted
      await RideRequest.findByIdAndUpdate(rideRequestId, {
        $set: {
          driverId,
          status: 'accepted',
          acceptedAt: new Date(),
          matchingStatus: 'matched',
        },
      });

      // Update driver as on-ride
      await DriverProfile.findByIdAndUpdate(driverId, {
        availabilityStatus: 'onride',
        currentRideId: rideRequestId,
        $pull: { pendingRequests: { _id: { $exists: true } } },
      });

      // Reject other drivers (send rejection notifications)
      const otherDrivers = rideRequest.pendingDrivers
        .filter((d) => d.driverId.toString() !== driverId.toString())
        .map((d) => d.driverId);

      for (const otherDriverId of otherDrivers) {
        await DriverProfile.findByIdAndUpdate(otherDriverId, {
          $pull: {
            pendingRequests: { rideRequestId },
          },
        });
      }

      return {
        success: true,
        message: 'Driver accepted successfully',
        data: {
          rideRequestId,
          driverId,
          status: 'accepted',
        },
      };
    } catch (error) {
      throw new Error(`Error handling acceptance: ${error.message}`);
    }
  }

  /**
   * Calculate smart cancellation penalties
   * Factors: cancellation frequency, time of cancellation, reason
   */
  static calculateCancellationPenalty(driver, cancelledAt, reason = 'other') {
    let penalty = 0;
    const cancellationRate = driver.cancellationRate || 0;

    // Base penalty: 10 points
    penalty = 10;

    // High frequency penalty: +20 points if cancellation rate > 20%
    if (cancellationRate > 0.2) {
      penalty += 20;
    }

    // Late cancellation penalty: +15 points if cancelled <1 minute after acceptance
    const timeSinceAcceptance = (new Date() - cancelledAt) / 1000 / 60;
    if (timeSinceAcceptance < 1) {
      penalty += 15;
    }

    // Reason-based penalties
    const reasonPenalties = {
      vehicle_issue: 5,
      system_crash: 0, // No penalty
      customer_behavior: 3,
      traffic: 2,
      other: 10,
    };

    penalty += reasonPenalties[reason] || 10;

    // Cap at 50 points
    return Math.min(50, penalty);
  }

  /**
   * Update driver performance score
   * Called after each completed or cancelled ride
   */
  static async updateDriverPerformance(driverId, rideData) {
    try {
      const driver = await DriverProfile.findById(driverId);

      if (!driver) {
        throw new Error('Driver not found');
      }

      const totalRides = driver.totalRides || 0;
      const completedRides = driver.completedRides || 0;
      const cancelledRides = driver.cancelledRides || 0;

      // Update ride counts
      driver.totalRides = totalRides + 1;
      if (rideData.status === 'completed') {
        driver.completedRides = completedRides + 1;
        driver.rating = this.updateRating(driver.rating, rideData.rating);
      } else if (rideData.status === 'cancelled') {
        driver.cancelledRides = cancelledRides + 1;
      }

      // Calculate acceptance and cancellation rates
      driver.acceptanceRate = driver.totalRides > 0 ? 
        (driver.totalRides - (driver.rejectedRequests || 0)) / driver.totalRides : 0;
      driver.cancellationRate = driver.totalRides > 0 ? 
        driver.cancelledRides / driver.totalRides : 0;

      // Update performance score
      const completionRate = driver.totalRides > 0 ? 
        driver.completedRides / driver.totalRides : 0;
      
      driver.performanceScore = this.calculatePerformanceScore({
        rating: driver.rating,
        acceptanceRate: driver.acceptanceRate,
        cancellationRate: driver.cancellationRate,
        completionRate: completionRate,
        totalRides: driver.totalRides,
      });

      await driver.save();

      return driver;
    } catch (error) {
      throw new Error(`Error updating performance: ${error.message}`);
    }
  }

  /**
   * Calculate weighted performance score
   */
  static calculatePerformanceScore(metrics) {
    const weights = {
      rating: 0.35,
      acceptanceRate: 0.25,
      completionRate: 0.25,
      cancellationRate: -0.15,
    };

    let score = 0;
    score += (metrics.rating / 5) * 100 * weights.rating;
    score += (metrics.acceptanceRate || 0) * 100 * weights.acceptanceRate;
    score += (metrics.completionRate || 0) * 100 * weights.completionRate;
    score += (1 - (metrics.cancellationRate || 0)) * 100 * weights.cancellationRate;

    // Experience bonus (max 10 points for 500+ rides)
    if (metrics.totalRides >= 500) {
      score += 10;
    } else if (metrics.totalRides >= 100) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Update rider rating (running average)
   */
  static updateRating(currentRating, newRating) {
    if (!currentRating || currentRating === 0) {
      return newRating;
    }
    // Simple moving average
    return (currentRating + newRating) / 2;
  }

  /**
   * Get driver statistics for analytics
   */
  static async getDriverStats(driverId) {
    try {
      const driver = await DriverProfile.findById(driverId);

      if (!driver) {
        throw new Error('Driver not found');
      }

      return {
        _id: driver._id,
        totalRides: driver.totalRides || 0,
        completedRides: driver.completedRides || 0,
        cancelledRides: driver.cancelledRides || 0,
        rating: driver.rating || 0,
        acceptanceRate: driver.acceptanceRate || 0,
        cancellationRate: driver.cancellationRate || 0,
        performanceScore: driver.performanceScore || 0,
        isVerified: driver.isVerified,
        availabilityStatus: driver.availabilityStatus,
      };
    } catch (error) {
      throw new Error(`Error getting driver stats: ${error.message}`);
    }
  }
}

module.exports = DriverMatchingService;
