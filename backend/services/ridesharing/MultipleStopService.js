/**
 * MultipleStopService.js
 * Phase 6: Multiple Stop Booking Feature
 * Add multiple intermediate stops with route optimization and stop-wise pricing
 */

const MultiStopRide = require('../../models/MultiStopRide');
const DriverProfile = require('../../models/DriverProfile');
const FareCalculationService = require('./FareCalculationService');

class MultipleStopService {
  /**
   * Create multi-stop ride with route optimization
   * Automatically optimizes stops based on proximity
   */
  static async createMultiStopRide(riderId, rideData) {
    try {
      const {
        stops,
        rideType,
        paymentMethod,
        optimizeRoute = true,
      } = rideData;

      // Validate minimum stops (at least 2: pickup + 1 stop + dropoff)
      if (!stops || stops.length < 3) {
        return {
          success: false,
          message: 'At least 2 intermediate stops required (pickup, stop, dropoff)',
        };
      }

      // Validate maximum stops (max 5 stops including pickup & dropoff)
      if (stops.length > 5) {
        return {
          success: false,
          message: 'Maximum 5 stops allowed (including pickup and dropoff)',
        };
      }

      // Prepare stop sequence
      let optimizedStops = stops;

      if (optimizeRoute) {
        // Apply TSP (Traveling Salesman Problem) approximation
        optimizedStops = this.optimizeRoute(stops);
      }

      // Calculate route metrics
      const routeMetrics = this.calculateRouteMetrics(optimizedStops);

      // Calculate multi-stop fare
      const fareData = await this.calculateMultiStopFare(
        optimizedStops,
        rideType
      );

      // Create multi-stop ride
      const multiStopRide = new MultiStopRide({
        riderId,
        stops: optimizedStops,
        rideType,
        totalDistance: routeMetrics.totalDistance,
        estimatedDuration: routeMetrics.estimatedDuration,
        baseFare: fareData.baseFare,
        stopFare: fareData.stopFare,
        waitTimeFare: 0, // Will be calculated after ride
        totalFare: fareData.totalFare,
        paymentMethod,
        status: 'requested',
        routeOptimized: optimizeRoute,
        estimatedCompletionTime: new Date(Date.now() + routeMetrics.estimatedDuration * 60000),
      });

      await multiStopRide.save();

      return {
        success: true,
        message: 'Multi-stop ride created successfully',
        data: {
          rideId: multiStopRide._id,
          stops: optimizedStops,
          totalDistance: routeMetrics.totalDistance,
          estimatedDuration: routeMetrics.estimatedDuration,
          totalFare: fareData.totalFare,
          stopCount: stops.length,
          routeOptimized: optimizeRoute,
        },
      };
    } catch (error) {
      throw new Error(`Error creating multi-stop ride: ${error.message}`);
    }
  }

  /**
   * Optimize route using nearest neighbor algorithm
   * TSP approximation for faster computation
   */
  static optimizeRoute(stops) {
    if (stops.length <= 2) return stops;

    // First and last stops are fixed (pickup and dropoff)
    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];
    const intermediateStops = stops.slice(1, -1);

    // Nearest neighbor algorithm
    let optimized = [firstStop];
    let remaining = [...intermediateStops];

    while (remaining.length > 0) {
      const currentStop = optimized[optimized.length - 1];
      let nearestIdx = 0;
      let minDistance = Number.MAX_VALUE;

      // Find nearest stop
      for (let i = 0; i < remaining.length; i++) {
        const distance = this.calculateDistance(
          currentStop.lat,
          currentStop.lng,
          remaining[i].lat,
          remaining[i].lng
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestIdx = i;
        }
      }

      // Add nearest stop to route
      optimized.push(remaining[nearestIdx]);
      remaining.splice(nearestIdx, 1);
    }

    // Add final dropoff stop
    optimized.push(lastStop);

    return optimized;
  }

  /**
   * Calculate total route distance and duration
   */
  static calculateRouteMetrics(stops) {
    let totalDistance = 0;
    let totalDuration = 0; // in minutes

    // Calculate distance between consecutive stops
    for (let i = 0; i < stops.length - 1; i++) {
      const distance = this.calculateDistance(
        stops[i].lat,
        stops[i].lng,
        stops[i + 1].lat,
        stops[i + 1].lng
      );

      totalDistance += distance;

      // Estimate duration (average 30 km/h city speed)
      const duration = (distance / 30) * 60;
      totalDuration += duration;

      // Add buffer time at each intermediate stop (5 minutes)
      if (i < stops.length - 2) {
        totalDuration += 5;
      }
    }

    return {
      totalDistance: Math.round(totalDistance * 10) / 10,
      estimatedDuration: Math.ceil(totalDuration),
    };
  }

  /**
   * Calculate fare with multi-stop charges
   * Base fare + per-stop charge + wait time
   */
  static async calculateMultiStopFare(stops, rideType) {
    try {
      const rideTypeConfig = FareCalculationService.RIDE_TYPES[rideType];
      const routeMetrics = this.calculateRouteMetrics(stops);

      // Base fare for full route
      const baseFare =
        rideTypeConfig.basefare +
        routeMetrics.totalDistance * rideTypeConfig.costPerKm;

      // Stop charges (₹50 per intermediate stop)
      const stopCount = stops.length - 2; // Exclude pickup and dropoff
      const stopFare = stopCount * 50;

      // Minimum wait time charge (5 min per stop at ₹10/min)
      const waitTimeFare = 0; // Will be calculated during ride

      // Total fare
      const totalFare = Math.round((baseFare + stopFare) * 100) / 100;

      return {
        baseFare: Math.round(baseFare * 100) / 100,
        stopFare,
        waitTimeFare,
        totalFare,
        breakdown: {
          distance: routeMetrics.totalDistance,
          baseCharge: Math.round(rideTypeConfig.basefare * 100) / 100,
          distanceCharge: Math.round(
            routeMetrics.totalDistance * rideTypeConfig.costPerKm * 100
          ) / 100,
          stopCharge: stopFare,
          estimatedWaitTime: '5+ minutes per stop',
        },
      };
    } catch (error) {
      console.error('Error calculating multi-stop fare:', error);
      return {
        baseFare: 0,
        stopFare: 0,
        waitTimeFare: 0,
        totalFare: 0,
      };
    }
  }

  /**
   * Get multi-stop ride details
   */
  static async getMultiStopRide(rideId, riderId) {
    try {
      const ride = await MultiStopRide.findById(rideId).populate([
        { path: 'riderId', select: 'firstName lastName phone' },
        { path: 'driverId', select: 'firstName lastName rating vehicleNumber phone' },
      ]);

      if (!ride) {
        throw new Error('Multi-stop ride not found');
      }

      if (ride.riderId._id.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      return {
        success: true,
        data: ride,
      };
    } catch (error) {
      throw new Error(`Error retrieving multi-stop ride: ${error.message}`);
    }
  }

  /**
   * Get multi-stop ride history
   */
  static async getMultiStopRideHistory(riderId, limit = 20) {
    try {
      const rides = await MultiStopRide.find({ riderId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('driverId', 'firstName lastName rating vehicleNumber');

      return {
        success: true,
        data: rides,
        count: rides.length,
      };
    } catch (error) {
      throw new Error(`Error retrieving multi-stop rides: ${error.message}`);
    }
  }

  /**
   * Add stop to existing ride
   * Can only add before ride starts
   */
  static async addStop(rideId, riderId, newStop) {
    try {
      const ride = await MultiStopRide.findById(rideId);

      if (!ride) {
        throw new Error('Multi-stop ride not found');
      }

      if (ride.riderId.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      if (ride.status !== 'requested' && ride.status !== 'confirmed') {
        return {
          success: false,
          message: 'Cannot add stops after ride has started',
        };
      }

      // Check max stops (5)
      if (ride.stops.length >= 5) {
        return {
          success: false,
          message: 'Maximum 5 stops reached',
        };
      }

      // Insert new stop before dropoff (last stop)
      ride.stops.splice(ride.stops.length - 1, 0, newStop);

      // Recalculate route metrics and fare
      const routeMetrics = this.calculateRouteMetrics(ride.stops);
      const fareData = await this.calculateMultiStopFare(
        ride.stops,
        ride.rideType
      );

      // Update ride
      ride.totalDistance = routeMetrics.totalDistance;
      ride.estimatedDuration = routeMetrics.estimatedDuration;
      ride.totalFare = fareData.totalFare;
      ride.baseFare = fareData.baseFare;
      ride.stopFare = fareData.stopFare;

      await ride.save();

      return {
        success: true,
        message: 'Stop added successfully',
        data: {
          newStopCount: ride.stops.length,
          updatedFare: ride.totalFare,
          fareDifference: fareData.totalFare - ride.totalFare,
          newEstimatedDuration: routeMetrics.estimatedDuration,
        },
      };
    } catch (error) {
      throw new Error(`Error adding stop: ${error.message}`);
    }
  }

  /**
   * Remove stop from ride
   */
  static async removeStop(rideId, riderId, stopIndex) {
    try {
      const ride = await MultiStopRide.findById(rideId);

      if (!ride) {
        throw new Error('Multi-stop ride not found');
      }

      if (ride.riderId.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      // Cannot remove first or last stop
      if (stopIndex === 0 || stopIndex === ride.stops.length - 1) {
        return {
          success: false,
          message: 'Cannot remove pickup or dropoff stop',
        };
      }

      // Remove stop
      const removedStop = ride.stops.splice(stopIndex, 1)[0];

      // Recalculate
      const routeMetrics = this.calculateRouteMetrics(ride.stops);
      const fareData = await this.calculateMultiStopFare(
        ride.stops,
        ride.rideType
      );

      // Update ride
      ride.totalDistance = routeMetrics.totalDistance;
      ride.estimatedDuration = routeMetrics.estimatedDuration;
      ride.totalFare = fareData.totalFare;

      await ride.save();

      return {
        success: true,
        message: 'Stop removed successfully',
        data: {
          removedStop: removedStop.address,
          newStopCount: ride.stops.length,
          updatedFare: ride.totalFare,
          refundAmount: ride.totalFare - fareData.totalFare,
        },
      };
    } catch (error) {
      throw new Error(`Error removing stop: ${error.message}`);
    }
  }

  /**
   * Update stop details (address, contact)
   */
  static async updateStop(rideId, riderId, stopIndex, updatedStop) {
    try {
      const ride = await MultiStopRide.findById(rideId);

      if (!ride) {
        throw new Error('Multi-stop ride not found');
      }

      if (ride.riderId.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      if (stopIndex >= ride.stops.length) {
        throw new Error('Stop index out of bounds');
      }

      // Update stop details
      ride.stops[stopIndex] = {
        ...ride.stops[stopIndex],
        ...updatedStop,
      };

      await ride.save();

      return {
        success: true,
        message: 'Stop updated successfully',
        data: ride.stops[stopIndex],
      };
    } catch (error) {
      throw new Error(`Error updating stop: ${error.message}`);
    }
  }

  /**
   * Get live tracking for multi-stop ride
   */
  static async getLiveTracking(rideId, riderId) {
    try {
      const ride = await MultiStopRide.findById(rideId);

      if (!ride) {
        throw new Error('Multi-stop ride not found');
      }

      if (ride.riderId.toString() !== riderId && ride.driverId.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      // Get driver current location (would be from real-time service)
      const driverLocation = ride.driverCurrentLocation || {
        lat: ride.stops[0].lat,
        lng: ride.stops[0].lng,
      };

      // Calculate remaining distance to next stop
      let nextStopIndex = 0;
      if (ride.currentStopIndex !== undefined) {
        nextStopIndex = ride.currentStopIndex + 1;
      }

      const remainingDistance =
        nextStopIndex < ride.stops.length
          ? this.calculateDistance(
              driverLocation.lat,
              driverLocation.lng,
              ride.stops[nextStopIndex].lat,
              ride.stops[nextStopIndex].lng
            )
          : 0;

      const estimatedTimeToNextStop = Math.ceil((remainingDistance / 30) * 60); // minutes

      return {
        success: true,
        data: {
          rideId: ride._id,
          status: ride.status,
          driverLocation,
          nextStop: ride.stops[nextStopIndex],
          nextStopIndex,
          remainingDistance,
          estimatedTimeToNextStop,
          stopsCompleted: nextStopIndex,
          totalStops: ride.stops.length,
          stops: ride.stops.map((stop, idx) => ({
            index: idx,
            address: stop.address,
            status: idx < nextStopIndex ? 'completed' : idx === nextStopIndex ? 'current' : 'pending',
            arrivalTime: ride.stopArrivalTimes ? ride.stopArrivalTimes[idx] : null,
          })),
        },
      };
    } catch (error) {
      throw new Error(`Error getting live tracking: ${error.message}`);
    }
  }

  /**
   * Mark stop as completed by driver
   */
  static async markStopCompleted(rideId, driverId, stopIndex) {
    try {
      const ride = await MultiStopRide.findById(rideId);

      if (!ride) {
        throw new Error('Multi-stop ride not found');
      }

      if (ride.driverId.toString() !== driverId) {
        throw new Error('Unauthorized');
      }

      // Update current stop index
      if (!ride.stopArrivalTimes) {
        ride.stopArrivalTimes = [];
      }

      ride.stopArrivalTimes[stopIndex] = new Date();
      ride.currentStopIndex = stopIndex;

      // If all stops completed, mark ride as completed
      if (stopIndex === ride.stops.length - 1) {
        ride.status = 'completed';
        ride.completedAt = new Date();

        // Calculate wait time charges
        const waitCharges = this.calculateWaitTimeCharges(
          ride.stopArrivalTimes,
          ride.stops.length
        );
        ride.waitTimeFare = waitCharges.totalWaitCharge;
        ride.totalFare += waitCharges.totalWaitCharge;
      }

      await ride.save();

      return {
        success: true,
        message: `Stop ${stopIndex + 1} marked completed`,
        data: {
          completedStop: stopIndex + 1,
          totalStops: ride.stops.length,
          status: ride.status,
        },
      };
    } catch (error) {
      throw new Error(`Error marking stop completed: ${error.message}`);
    }
  }

  /**
   * Calculate wait time charges
   * ₹10 per minute after 5 minutes at each stop
   */
  static calculateWaitTimeCharges(arrivalTimes, stopCount) {
    let totalWaitTime = 0;
    let totalWaitCharge = 0;

    // Calculate wait time between stops
    for (let i = 0; i < arrivalTimes.length - 1; i++) {
      if (arrivalTimes[i] && arrivalTimes[i + 1]) {
        const waitMinutes =
          (arrivalTimes[i + 1] - arrivalTimes[i]) / 1000 / 60;
        const excessWait = Math.max(0, waitMinutes - 5); // 5 min free per stop
        totalWaitTime += excessWait;
        totalWaitCharge += excessWait * 10; // ₹10 per minute
      }
    }

    return {
      totalWaitTime: Math.round(totalWaitTime * 10) / 10,
      totalWaitCharge: Math.round(totalWaitCharge * 100) / 100,
    };
  }

  /**
   * Calculate distance using haversine formula
   */
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

module.exports = MultipleStopService;
