/**
 * ScheduledRideService.js
 * Phase 6: Schedule Ride Feature
 * Book rides for future dates/times with advance fare calculation and reminders
 */

const ScheduledRide = require('../../models/ScheduledRide');
const RiderProfile = require('../../models/RiderProfile');
const DriverProfile = require('../../models/DriverProfile');
const FareCalculationService = require('./FareCalculationService');
const SurgePricingService = require('./SurgePricingService');

class ScheduledRideService {
  /**
   * Create a scheduled ride booking
   * Minimum 30 minutes advance booking required
   */
  static async createScheduledRide(riderId, rideData) {
    try {
      const {
        scheduledDateTime,
        pickup,
        dropoff,
        rideType,
        paymentMethod,
        preferredGender,
        specialRequests,
      } = rideData;

      // Validation: Check if scheduled time is at least 30 minutes in future
      const scheduledTime = new Date(scheduledDateTime);
      const now = new Date();
      const minutesAhead = (scheduledTime - now) / 1000 / 60;

      if (minutesAhead < 30) {
        return {
          success: false,
          message: 'Scheduled rides must be booked at least 30 minutes in advance',
        };
      }

      // Calculate advance fare
      const fareData = await this.calculateAdvanceFare(
        pickup,
        dropoff,
        rideType,
        scheduledDateTime
      );

      // Create scheduled ride
      const scheduledRide = new ScheduledRide({
        riderId,
        scheduledDateTime: scheduledTime,
        pickup,
        dropoff,
        rideType,
        estimatedDistance: fareData.distance,
        estimatedDuration: fareData.duration,
        baseFare: fareData.baseFare,
        surgeFactor: fareData.surgeFactor,
        estimatedFare: fareData.estimatedFare,
        paymentMethod,
        preferredGender,
        specialRequests,
        status: 'scheduled',
        reminders: {
          day_before: false,
          one_hour: false,
          fifteen_min: false,
        },
      });

      await scheduledRide.save();

      return {
        success: true,
        message: 'Scheduled ride created successfully',
        data: {
          scheduleId: scheduledRide._id,
          scheduledTime: scheduledRide.scheduledDateTime,
          estimatedFare: scheduledRide.estimatedFare,
          pickupAddress: scheduledRide.pickup.address,
          dropoffAddress: scheduledRide.dropoff.address,
          status: 'scheduled',
        },
      };
    } catch (error) {
      throw new Error(`Error creating scheduled ride: ${error.message}`);
    }
  }

  /**
   * Calculate advance fare based on predicted conditions
   * Uses historical patterns + surge prediction
   */
  static async calculateAdvanceFare(pickup, dropoff, rideType, scheduledDateTime) {
    try {
      // Basic distance calculation
      const distance = this.calculateDistance(
        pickup.lat,
        pickup.lng,
        dropoff.lat,
        dropoff.lng
      );

      // Get base fare
      const rideTypeConfig = FareCalculationService.RIDE_TYPES[rideType];
      const baseFare = rideTypeConfig.basefare + distance * rideTypeConfig.costPerKm;

      // Estimate duration (simplified)
      const estimatedDuration = (distance / 30) * 60; // Average 30 km/h

      // Predict surge factor for scheduled time
      const surgeFactor = await SurgePricingService.calculateSurgeMultiplier(
        pickup.lat,
        pickup.lng,
        rideType,
        new Date(scheduledDateTime)
      );

      // Final fare
      const estimatedFare = Math.round(baseFare * surgeFactor.surgeFactor * 100) / 100;

      return {
        distance: Math.round(distance * 10) / 10,
        duration: Math.ceil(estimatedDuration),
        baseFare: Math.round(baseFare * 100) / 100,
        surgeFactor: surgeFactor.surgeFactor,
        estimatedFare,
      };
    } catch (error) {
      console.error('Error calculating advance fare:', error);
      // Return default if calculation fails
      return {
        distance: 0,
        duration: 0,
        baseFare: 0,
        surgeFactor: 1.0,
        estimatedFare: 0,
      };
    }
  }

  /**
   * Confirm scheduled ride booking (charge payment)
   */
  static async confirmScheduledRide(scheduleId, riderId) {
    try {
      const scheduledRide = await ScheduledRide.findById(scheduleId);

      if (!scheduledRide) {
        throw new Error('Scheduled ride not found');
      }

      if (scheduledRide.riderId.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      if (scheduledRide.status !== 'scheduled') {
        throw new Error('Ride cannot be confirmed in current status');
      }

      // Check again if still at least 30 minutes ahead
      const now = new Date();
      const minutesAhead = (scheduledRide.scheduledDateTime - now) / 1000 / 60;

      if (minutesAhead < 30) {
        return {
          success: false,
          message: 'Ride is too close to current time to confirm',
        };
      }

      // Process payment (would call payment gateway)
      // For now, just mark as confirmed
      scheduledRide.status = 'confirmed';
      scheduledRide.confirmedAt = new Date();

      await scheduledRide.save();

      // Schedule reminders
      await this.scheduleReminders(scheduleId);

      return {
        success: true,
        message: 'Scheduled ride confirmed',
        data: {
          scheduleId: scheduledRide._id,
          status: 'confirmed',
          fare: scheduledRide.estimatedFare,
          reminders: [
            `24 hours before: ${this.formatDateTime(
              new Date(scheduledRide.scheduledDateTime - 24 * 60 * 60 * 1000)
            )}`,
            `1 hour before: ${this.formatDateTime(
              new Date(scheduledRide.scheduledDateTime - 60 * 60 * 1000)
            )}`,
            `15 minutes before: ${this.formatDateTime(
              new Date(scheduledRide.scheduledDateTime - 15 * 60 * 1000)
            )}`,
          ],
        },
      };
    } catch (error) {
      throw new Error(`Error confirming scheduled ride: ${error.message}`);
    }
  }

  /**
   * Schedule reminder notifications
   */
  static async scheduleReminders(scheduleId) {
    try {
      const scheduledRide = await ScheduledRide.findById(scheduleId);

      if (!scheduledRide) {
        throw new Error('Scheduled ride not found');
      }

      // In production, integrate with job queue (Bull, RabbitMQ)
      // For now, just mark reminders as scheduled

      const reminders = {
        day_before: new Date(scheduledRide.scheduledDateTime - 24 * 60 * 60 * 1000),
        one_hour: new Date(scheduledRide.scheduledDateTime - 60 * 60 * 1000),
        fifteen_min: new Date(scheduledRide.scheduledDateTime - 15 * 60 * 1000),
      };

      scheduledRide.reminders = {
        day_before: false,
        one_hour: false,
        fifteen_min: false,
        scheduled: {
          day_before: reminders.day_before,
          one_hour: reminders.one_hour,
          fifteen_min: reminders.fifteen_min,
        },
      };

      await scheduledRide.save();

      return {
        success: true,
        reminders_scheduled: true,
      };
    } catch (error) {
      console.error('Error scheduling reminders:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Auto-assign driver closer to scheduled time (2 hours before)
   */
  static async autoAssignDriver(scheduleId) {
    try {
      const scheduledRide = await ScheduledRide.findById(scheduleId);

      if (!scheduledRide) {
        throw new Error('Scheduled ride not found');
      }

      if (scheduledRide.status !== 'confirmed') {
        throw new Error('Ride must be confirmed to assign driver');
      }

      // Get nearest available drivers
      const drivers = await DriverProfile.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [scheduledRide.pickup.lng, scheduledRide.pickup.lat],
            },
            distanceField: 'distance',
            maxDistance: 10000, // 10km
            query: {
              availabilityStatus: 'available',
              vehicleType: scheduledRide.rideType,
              isVerified: true,
            },
            spherical: true,
          },
        },
        { $limit: 5 },
        { $sort: { rating: -1 } },
      ]);

      if (drivers.length === 0) {
        return {
          success: false,
          message: 'No available drivers in your area for this time',
        };
      }

      // Select highest-rated driver
      const assignedDriver = drivers[0];

      scheduledRide.driverId = assignedDriver._id;
      scheduledRide.status = 'assigned';
      scheduledRide.assignedAt = new Date();
      scheduledRide.estimatedPickupTime = new Date(
        scheduledRide.scheduledDateTime
      );

      await scheduledRide.save();

      // Notify driver (would send via push notification/SMS)

      return {
        success: true,
        message: 'Driver assigned successfully',
        data: {
          driverId: assignedDriver._id,
          driverName: assignedDriver.firstName,
          driverRating: assignedDriver.rating,
          vehicleNumber: assignedDriver.vehicleNumber,
        },
      };
    } catch (error) {
      throw new Error(`Error auto-assigning driver: ${error.message}`);
    }
  }

  /**
   * Get scheduled ride details
   */
  static async getScheduledRide(scheduleId, riderId) {
    try {
      const scheduledRide = await ScheduledRide.findById(scheduleId).populate([
        { path: 'riderId', select: 'firstName lastName phone' },
        { path: 'driverId', select: 'firstName lastName rating vehicleNumber phone' },
      ]);

      if (!scheduledRide) {
        throw new Error('Scheduled ride not found');
      }

      if (scheduledRide.riderId._id.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      return {
        success: true,
        data: scheduledRide,
      };
    } catch (error) {
      throw new Error(`Error retrieving scheduled ride: ${error.message}`);
    }
  }

  /**
   * Get all scheduled rides for a rider
   */
  static async getScheduledRides(riderId, status = null) {
    try {
      const query = { riderId };

      if (status) {
        query.status = status;
      }

      const rides = await ScheduledRide.find(query)
        .sort({ scheduledDateTime: -1 })
        .limit(20)
        .populate('driverId', 'firstName lastName rating vehicleNumber');

      return {
        success: true,
        data: rides,
        count: rides.length,
      };
    } catch (error) {
      throw new Error(`Error retrieving scheduled rides: ${error.message}`);
    }
  }

  /**
   * Cancel scheduled ride
   * Different cancellation policies based on time before ride
   */
  static async cancelScheduledRide(scheduleId, riderId, cancelReason = 'user_request') {
    try {
      const scheduledRide = await ScheduledRide.findById(scheduleId);

      if (!scheduledRide) {
        throw new Error('Scheduled ride not found');
      }

      if (scheduledRide.riderId.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      const now = new Date();
      const minutesUntilRide = (scheduledRide.scheduledDateTime - now) / 1000 / 60;

      // Calculate cancellation charges
      let cancellationCharge = 0;

      if (minutesUntilRide < 30) {
        // Less than 30 min: 100% cancellation charge
        cancellationCharge = scheduledRide.estimatedFare;
      } else if (minutesUntilRide < 60) {
        // 30-60 min: 50% cancellation charge
        cancellationCharge = scheduledRide.estimatedFare * 0.5;
      } else if (minutesUntilRide < 120) {
        // 1-2 hours: 20% cancellation charge
        cancellationCharge = scheduledRide.estimatedFare * 0.2;
      }
      // More than 2 hours: free cancellation

      scheduledRide.status = 'cancelled';
      scheduledRide.cancelledAt = new Date();
      scheduledRide.cancellationReason = cancelReason;
      scheduledRide.cancellationCharge = cancellationCharge;

      await scheduledRide.save();

      return {
        success: true,
        message: 'Scheduled ride cancelled',
        data: {
          scheduleId: scheduledRide._id,
          originalFare: scheduledRide.estimatedFare,
          cancellationCharge,
          refundAmount: scheduledRide.estimatedFare - cancellationCharge,
          policy: this.getCancellationPolicy(minutesUntilRide),
        },
      };
    } catch (error) {
      throw new Error(`Error cancelling scheduled ride: ${error.message}`);
    }
  }

  /**
   * Get cancellation policy text
   */
  static getCancellationPolicy(minutesUntilRide) {
    if (minutesUntilRide < 30) {
      return 'Less than 30 min: 100% cancellation charge (Full fare charged)';
    }
    if (minutesUntilRide < 60) {
      return '30-60 min: 50% cancellation charge';
    }
    if (minutesUntilRide < 120) {
      return '1-2 hours: 20% cancellation charge';
    }
    return 'More than 2 hours: Free cancellation (Full refund)';
  }

  /**
   * Reschedule to different time
   */
  static async rescheduleRide(scheduleId, riderId, newDateTime) {
    try {
      const scheduledRide = await ScheduledRide.findById(scheduleId);

      if (!scheduledRide) {
        throw new Error('Scheduled ride not found');
      }

      if (scheduledRide.riderId.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      const now = new Date();
      const newTime = new Date(newDateTime);
      const minutesAhead = (newTime - now) / 1000 / 60;

      if (minutesAhead < 30) {
        return {
          success: false,
          message: 'New time must be at least 30 minutes in future',
        };
      }

      // Recalculate fare for new time
      const fareData = await this.calculateAdvanceFare(
        scheduledRide.pickup,
        scheduledRide.dropoff,
        scheduledRide.rideType,
        newDateTime
      );

      // Update ride
      scheduledRide.scheduledDateTime = newTime;
      scheduledRide.estimatedFare = fareData.estimatedFare;
      scheduledRide.surgeFactor = fareData.surgeFactor;
      scheduledRide.rescheduledAt = new Date();
      scheduledRide.rescheduleCount = (scheduledRide.rescheduleCount || 0) + 1;

      // Reset reminders
      scheduledRide.reminders = {
        day_before: false,
        one_hour: false,
        fifteen_min: false,
      };

      await scheduledRide.save();

      return {
        success: true,
        message: 'Ride rescheduled successfully',
        data: {
          newTime: scheduledRide.scheduledDateTime,
          newFare: scheduledRide.estimatedFare,
          priceDifference: fareData.estimatedFare - scheduledRide.estimatedFare,
        },
      };
    } catch (error) {
      throw new Error(`Error rescheduling ride: ${error.message}`);
    }
  }

  /**
   * Update reminder notification status
   */
  static async updateReminderStatus(scheduleId, reminderType, sent = true) {
    try {
      const scheduledRide = await ScheduledRide.findById(scheduleId);

      if (!scheduledRide) {
        throw new Error('Scheduled ride not found');
      }

      if (reminderType === 'day_before') {
        scheduledRide.reminders.day_before = sent;
      } else if (reminderType === 'one_hour') {
        scheduledRide.reminders.one_hour = sent;
      } else if (reminderType === 'fifteen_min') {
        scheduledRide.reminders.fifteen_min = sent;
      }

      await scheduledRide.save();

      return {
        success: true,
        message: `${reminderType} reminder updated`,
      };
    } catch (error) {
      throw new Error(`Error updating reminder: ${error.message}`);
    }
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

  /**
   * Format date/time for display
   */
  static formatDateTime(date) {
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

module.exports = ScheduledRideService;
