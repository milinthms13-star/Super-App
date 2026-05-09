/**
 * RentalPackageService.js
 * Phase 7: Rental Packages for Corporate Users
 * Hourly, daily, and monthly rental packages with fixed pricing and benefits
 */

const RentalPackage = require('../../models/RentalPackage');
const RentalBooking = require('../../models/RentalBooking');
const CorporateAccount = require('../../models/CorporateAccount');
const DriverProfile = require('../../models/DriverProfile');

class RentalPackageService {
  /**
   * Create rental package
   */
  static async createRentalPackage(packageData) {
    try {
      const {
        name,
        description,
        duration, // 'hourly', 'daily', 'monthly'
        hours,
        baseCost,
        includedKm,
        extraKmCost,
        vehicleType,
        driverIncluded,
        features,
        cancellationPolicy,
        availableCities,
      } = packageData;

      // Validation
      if (!name || !duration || !baseCost) {
        return {
          success: false,
          message: 'Missing required fields',
        };
      }

      const rentalPackage = new RentalPackage({
        name,
        description,
        duration,
        hours: hours || (duration === 'hourly' ? 1 : duration === 'daily' ? 24 : 720),
        baseCost,
        includedKm,
        extraKmCost,
        vehicleType,
        driverIncluded,
        features: features || [],
        cancellationPolicy,
        availableCities,
        status: 'active',
        createdAt: new Date(),
      });

      await rentalPackage.save();

      return {
        success: true,
        message: 'Rental package created successfully',
        data: {
          packageId: rentalPackage._id,
          name: rentalPackage.name,
          baseCost: rentalPackage.baseCost,
          duration: rentalPackage.duration,
        },
      };
    } catch (error) {
      throw new Error(`Error creating rental package: ${error.message}`);
    }
  }

  /**
   * Get all rental packages
   */
  static async getRentalPackages(filters = {}) {
    try {
      const query = { status: 'active' };

      if (filters.duration) query.duration = filters.duration;
      if (filters.vehicleType) query.vehicleType = filters.vehicleType;

      const packages = await RentalPackage.find(query).sort({ baseCost: 1 }).lean();

      return {
        success: true,
        data: packages,
        count: packages.length,
      };
    } catch (error) {
      throw new Error(`Error retrieving rental packages: ${error.message}`);
    }
  }

  /**
   * Get rental package details
   */
  static async getRentalPackage(packageId) {
    try {
      const rentalPackage = await RentalPackage.findById(packageId);

      if (!rentalPackage) {
        throw new Error('Rental package not found');
      }

      return {
        success: true,
        data: rentalPackage,
      };
    } catch (error) {
      throw new Error(`Error retrieving rental package: ${error.message}`);
    }
  }

  /**
   * Book rental package
   */
  static async bookRentalPackage(riderId, bookingData) {
    try {
      const {
        packageId,
        startDateTime,
        returnDateTime,
        pickupLocation,
        returnLocation,
        driverRequired,
        specialRequests,
        corporateAccountId,
      } = bookingData;

      // Get package
      const rentalPackage = await RentalPackage.findById(packageId);
      if (!rentalPackage) {
        throw new Error('Rental package not found');
      }

      // Calculate rental duration
      const startTime = new Date(startDateTime);
      const returnTime = new Date(returnDateTime);
      const durationMs = returnTime - startTime;
      const durationHours = durationMs / (1000 * 60 * 60);

      if (durationHours < 1) {
        return {
          success: false,
          message: 'Minimum rental period is 1 hour',
        };
      }

      // Calculate cost
      const baseCost = rentalPackage.baseCost;
      let totalCost = baseCost;

      // Additional cost for extra duration
      if (rentalPackage.duration === 'hourly') {
        totalCost = baseCost * Math.ceil(durationHours);
      } else if (rentalPackage.duration === 'daily') {
        const days = Math.ceil(durationHours / 24);
        totalCost = baseCost * days;
      }

      // Create rental booking
      const booking = new RentalBooking({
        riderId,
        packageId,
        packageName: rentalPackage.name,
        corporateAccountId,
        startDateTime: startTime,
        returnDateTime: returnTime,
        durationHours: Math.round(durationHours * 100) / 100,
        pickupLocation,
        returnLocation,
        driverRequired,
        driverIncluded: rentalPackage.driverIncluded,
        vehicleType: rentalPackage.vehicleType,
        includedKm: rentalPackage.includedKm,
        estimatedCost: totalCost,
        specialRequests,
        status: 'pending_confirmation',
        createdAt: new Date(),
      });

      await booking.save();

      return {
        success: true,
        message: 'Rental booking created successfully',
        data: {
          bookingId: booking._id,
          packageName: booking.packageName,
          startTime: booking.startDateTime,
          returnTime: booking.returnDateTime,
          durationHours: booking.durationHours,
          estimatedCost: booking.estimatedCost,
          status: booking.status,
        },
      };
    } catch (error) {
      throw new Error(`Error booking rental package: ${error.message}`);
    }
  }

  /**
   * Confirm rental booking (process payment)
   */
  static async confirmRentalBooking(bookingId, riderId) {
    try {
      const booking = await RentalBooking.findById(bookingId);

      if (!booking) {
        throw new Error('Rental booking not found');
      }

      if (booking.riderId.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      if (booking.status !== 'pending_confirmation') {
        return {
          success: false,
          message: 'Booking already confirmed',
        };
      }

      // If driver required, assign driver
      if (booking.driverRequired) {
        const driver = await DriverProfile.findOne({
          availabilityStatus: 'available',
          vehicleType: booking.vehicleType,
          isVerified: true,
        });

        if (!driver) {
          return {
            success: false,
            message: 'No drivers available for this vehicle type',
          };
        }

        booking.assignedDriver = driver._id;
      }

      booking.status = 'confirmed';
      booking.confirmedAt = new Date();

      await booking.save();

      return {
        success: true,
        message: 'Rental booking confirmed',
        data: {
          bookingId: booking._id,
          status: booking.status,
          totalCost: booking.estimatedCost,
          assignedDriver: booking.assignedDriver || null,
        },
      };
    } catch (error) {
      throw new Error(`Error confirming rental booking: ${error.message}`);
    }
  }

  /**
   * Get rental booking details
   */
  static async getRentalBooking(bookingId, riderId = null) {
    try {
      const booking = await RentalBooking.findById(bookingId)
        .populate('packageId', 'name duration baseCost features')
        .populate('assignedDriver', 'firstName lastName rating vehicleNumber phone');

      if (!booking) {
        throw new Error('Rental booking not found');
      }

      if (riderId && booking.riderId.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      return {
        success: true,
        data: booking,
      };
    } catch (error) {
      throw new Error(`Error retrieving rental booking: ${error.message}`);
    }
  }

  /**
   * Get all rental bookings for a rider
   */
  static async getRentalBookings(riderId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const bookings = await RentalBooking.find({ riderId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('packageId', 'name duration baseCost');

      const total = await RentalBooking.countDocuments({ riderId });

      return {
        success: true,
        data: bookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving rental bookings: ${error.message}`);
    }
  }

  /**
   * Update rental booking status
   */
  static async updateRentalBookingStatus(bookingId, riderId, newStatus) {
    try {
      const booking = await RentalBooking.findById(bookingId);

      if (!booking) {
        throw new Error('Rental booking not found');
      }

      if (booking.riderId.toString() !== riderId) {
        throw new Error('Unauthorized');
      }

      const validStatuses = ['confirmed', 'in_progress', 'completed', 'cancelled'];

      if (!validStatuses.includes(newStatus)) {
        return {
          success: false,
          message: 'Invalid status',
        };
      }

      const previousStatus = booking.status;
      booking.status = newStatus;

      if (newStatus === 'in_progress') {
        booking.startedAt = new Date();
      } else if (newStatus === 'completed') {
        booking.completedAt = new Date();

        // Calculate final cost based on actual distance
        if (booking.actualKmUsed) {
          const extraKm = Math.max(0, booking.actualKmUsed - booking.includedKm);
          const extraCost = extraKm * 5; // ₹5 per extra km
          booking.finalCost = booking.estimatedCost + extraCost;
        } else {
          booking.finalCost = booking.estimatedCost;
        }
      } else if (newStatus === 'cancelled') {
        booking.cancelledAt = new Date();

        // Apply cancellation policy
        const timeDiff = booking.startDateTime - new Date();
        const hoursAhead = timeDiff / (1000 * 60 * 60);

        if (hoursAhead > 24) {
          booking.refundAmount = booking.estimatedCost; // Full refund
        } else if (hoursAhead > 6) {
          booking.refundAmount = booking.estimatedCost * 0.8; // 80% refund
        } else if (hoursAhead > 1) {
          booking.refundAmount = booking.estimatedCost * 0.5; // 50% refund
        } else {
          booking.refundAmount = 0; // No refund
        }
      }

      await booking.save();

      return {
        success: true,
        message: `Rental booking status updated to ${newStatus}`,
        data: {
          bookingId: booking._id,
          previousStatus,
          newStatus: booking.status,
        },
      };
    } catch (error) {
      throw new Error(`Error updating rental booking status: ${error.message}`);
    }
  }

  /**
   * Calculate rental cost with custom duration
   */
  static async calculateRentalCost(packageId, durationHours) {
    try {
      const rentalPackage = await RentalPackage.findById(packageId);

      if (!rentalPackage) {
        throw new Error('Rental package not found');
      }

      let totalCost = rentalPackage.baseCost;

      // Calculate cost based on duration
      if (rentalPackage.duration === 'hourly') {
        totalCost = rentalPackage.baseCost * Math.ceil(durationHours);
      } else if (rentalPackage.duration === 'daily') {
        const days = Math.ceil(durationHours / 24);
        totalCost = rentalPackage.baseCost * days;
      } else if (rentalPackage.duration === 'monthly') {
        totalCost = rentalPackage.baseCost;
      }

      return {
        success: true,
        data: {
          packageName: rentalPackage.name,
          durationHours,
          baseCost: rentalPackage.baseCost,
          totalCost,
          includedKm: rentalPackage.includedKm,
          features: rentalPackage.features,
        },
      };
    } catch (error) {
      throw new Error(`Error calculating rental cost: ${error.message}`);
    }
  }

  /**
   * Get available drivers for rental
   */
  static async getAvailableDrivers(vehicleType, startDateTime, durationHours) {
    try {
      const startTime = new Date(startDateTime);
      const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

      const drivers = await DriverProfile.find({
        vehicleType,
        availabilityStatus: 'available',
        isVerified: true,
      })
        .select('firstName lastName rating vehicleNumber phone licenseNumber')
        .lean();

      // Filter drivers with no conflicting bookings
      const availableDrivers = [];

      for (const driver of drivers) {
        const conflicts = await RentalBooking.countDocuments({
          assignedDriver: driver._id,
          status: { $in: ['confirmed', 'in_progress'] },
          $or: [
            { startDateTime: { $lt: endTime }, returnDateTime: { $gt: startTime } },
          ],
        });

        if (conflicts === 0) {
          availableDrivers.push(driver);
        }
      }

      return {
        success: true,
        data: availableDrivers,
        count: availableDrivers.length,
      };
    } catch (error) {
      throw new Error(`Error retrieving available drivers: ${error.message}`);
    }
  }

  /**
   * Get rental statistics for corporate account
   */
  static async getRentalStatistics(corporateAccountId) {
    try {
      const bookings = await RentalBooking.find({
        corporateAccountId,
      });

      const totalRentals = bookings.length;
      const completedRentals = bookings.filter((b) => b.status === 'completed').length;
      const totalSpent = bookings.reduce((sum, b) => sum + (b.finalCost || b.estimatedCost), 0);
      const averageCost = totalRentals > 0 ? (totalSpent / totalRentals).toFixed(2) : 0;

      // Rental by package type
      const byPackage = {};
      bookings.forEach((booking) => {
        const pkg = booking.packageName;
        if (!byPackage[pkg]) {
          byPackage[pkg] = {
            count: 0,
            totalCost: 0,
          };
        }
        byPackage[pkg].count += 1;
        byPackage[pkg].totalCost += booking.finalCost || booking.estimatedCost;
      });

      return {
        success: true,
        data: {
          totalRentals,
          completedRentals,
          totalSpent: Math.round(totalSpent * 100) / 100,
          averageCost,
          byPackage,
        },
      };
    } catch (error) {
      throw new Error(`Error retrieving rental statistics: ${error.message}`);
    }
  }

  /**
   * Cancel rental booking with refund
   */
  static async cancelRentalBooking(bookingId, riderId, reason = '') {
    try {
      return await this.updateRentalBookingStatus(bookingId, riderId, 'cancelled');
    } catch (error) {
      throw new Error(`Error cancelling rental booking: ${error.message}`);
    }
  }

  /**
   * Get predefined rental packages (templates)
   */
  static getPredefinedPackages() {
    return [
      {
        name: 'Hourly Rental',
        description: '1-hour rental package',
        duration: 'hourly',
        baseCost: 300,
        includedKm: 15,
        extraKmCost: 5,
        features: ['Free cancellation (1+ hour advance)', 'Driver included', 'AC vehicle'],
      },
      {
        name: 'Daily Rental',
        description: '24-hour rental package',
        duration: 'daily',
        baseCost: 2000,
        includedKm: 200,
        extraKmCost: 5,
        features: [
          'Free cancellation (6+ hours advance)',
          'Driver included',
          'Fuel included (up to 200km)',
          'Toll charges included',
        ],
      },
      {
        name: 'Weekly Rental',
        description: '7-day rental package',
        duration: 'weekly',
        baseCost: 10000,
        includedKm: 1500,
        extraKmCost: 4,
        features: [
          'Free cancellation (2+ days advance)',
          'Driver included',
          'Fuel included',
          'Toll charges included',
          'Free cleaning',
        ],
      },
      {
        name: 'Monthly Rental',
        description: '30-day rental package',
        duration: 'monthly',
        baseCost: 30000,
        includedKm: 6000,
        extraKmCost: 3,
        features: [
          'Free cancellation',
          'Driver included',
          'Unlimited fuel',
          'All toll charges included',
          'Free cleaning',
          'Maintenance included',
        ],
      },
    ];
  }
}

module.exports = RentalPackageService;
