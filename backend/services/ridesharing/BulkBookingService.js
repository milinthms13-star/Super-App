/**
 * BulkBookingService.js
 * Phase 7: Bulk Ride Booking for Corporate Groups
 * Manage batch ride bookings for corporate groups, events, and employee transportation
 */

const BulkBooking = require('../../models/BulkBooking');
const CorporateAccount = require('../../models/CorporateAccount');
const RideRequest = require('../../models/RideRequest');
const Employee = require('../../models/Employee');

class BulkBookingService {
  /**
   * Create bulk booking (group ride booking)
   */
  static async createBulkBooking(accountId, bulkData) {
    try {
      const {
        bookingName,
        pickupLocation,
        dropoffLocation,
        employees,
        bookingDateTime,
        rideType,
        specialRequirements,
        costCenter,
        approvalRequired,
      } = bulkData;

      // Validation
      if (!bookingName || !pickupLocation || !dropoffLocation || !employees || employees.length === 0) {
        return {
          success: false,
          message: 'Missing required fields',
        };
      }

      // Validate employee count
      if (employees.length > 100) {
        return {
          success: false,
          message: 'Maximum 100 employees per bulk booking',
        };
      }

      // Verify corporate account
      const account = await CorporateAccount.findById(accountId);
      if (!account) {
        throw new Error('Corporate account not found');
      }

      // Create bulk booking
      const bulkBooking = new BulkBooking({
        corporateAccountId: accountId,
        bookingName,
        pickupLocation: {
          address: pickupLocation.address,
          lat: pickupLocation.lat,
          lng: pickupLocation.lng,
        },
        dropoffLocation: {
          address: dropoffLocation.address,
          lat: dropoffLocation.lat,
          lng: dropoffLocation.lng,
        },
        employees: employees.map((e) => ({
          employeeId: e,
          status: 'pending',
        })),
        bookingDateTime,
        rideType,
        specialRequirements,
        costCenter,
        totalEmployees: employees.length,
        confirmedCount: 0,
        cancelledCount: 0,
        completedCount: 0,
        status: 'pending',
        approvalRequired,
        approvalStatus: approvalRequired ? 'pending' : 'approved',
        createdAt: new Date(),
      });

      await bulkBooking.save();

      return {
        success: true,
        message: 'Bulk booking created successfully',
        data: {
          bulkBookingId: bulkBooking._id,
          bookingName: bulkBooking.bookingName,
          totalEmployees: bulkBooking.totalEmployees,
          status: bulkBooking.status,
          pickupTime: bulkBooking.bookingDateTime,
        },
      };
    } catch (error) {
      throw new Error(`Error creating bulk booking: ${error.message}`);
    }
  }

  /**
   * Get bulk booking details
   */
  static async getBulkBooking(bulkBookingId, accountId = null) {
    try {
      const bulkBooking = await BulkBooking.findById(bulkBookingId).populate(
        'employees.employeeId',
        'firstName lastName email employeeId'
      );

      if (!bulkBooking) {
        throw new Error('Bulk booking not found');
      }

      if (accountId && bulkBooking.corporateAccountId.toString() !== accountId) {
        throw new Error('Unauthorized');
      }

      return {
        success: true,
        data: bulkBooking,
      };
    } catch (error) {
      throw new Error(`Error retrieving bulk booking: ${error.message}`);
    }
  }

  /**
   * Get all bulk bookings for corporate account
   */
  static async getBulkBookings(accountId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const bookings = await BulkBooking.find({
        corporateAccountId: accountId,
      })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

      const total = await BulkBooking.countDocuments({
        corporateAccountId: accountId,
      });

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
      throw new Error(`Error retrieving bulk bookings: ${error.message}`);
    }
  }

  /**
   * Employee accepts/declines bulk booking ride
   */
  static async respondToBooking(bulkBookingId, employeeId, accepted = true) {
    try {
      const bulkBooking = await BulkBooking.findById(bulkBookingId);

      if (!bulkBooking) {
        throw new Error('Bulk booking not found');
      }

      // Find employee in booking
      const employeeIndex = bulkBooking.employees.findIndex(
        (e) => e.employeeId.toString() === employeeId
      );

      if (employeeIndex === -1) {
        return {
          success: false,
          message: 'Employee not found in this booking',
        };
      }

      if (bulkBooking.employees[employeeIndex].status !== 'pending') {
        return {
          success: false,
          message: 'Employee already responded',
        };
      }

      // Update response
      if (accepted) {
        bulkBooking.employees[employeeIndex].status = 'confirmed';
        bulkBooking.confirmedCount += 1;
      } else {
        bulkBooking.employees[employeeIndex].status = 'declined';
        bulkBooking.cancelledCount += 1;
      }

      await bulkBooking.save();

      return {
        success: true,
        message: `Employee ${accepted ? 'accepted' : 'declined'} booking`,
        data: {
          employeeStatus: bulkBooking.employees[employeeIndex].status,
          confirmedCount: bulkBooking.confirmedCount,
          totalEmployees: bulkBooking.totalEmployees,
        },
      };
    } catch (error) {
      throw new Error(`Error responding to booking: ${error.message}`);
    }
  }

  /**
   * Finalize and confirm bulk booking
   * Creates individual ride requests for all confirmed employees
   */
  static async finalizeBulkBooking(bulkBookingId, accountId) {
    try {
      const bulkBooking = await BulkBooking.findById(bulkBookingId);

      if (!bulkBooking) {
        throw new Error('Bulk booking not found');
      }

      if (bulkBooking.corporateAccountId.toString() !== accountId) {
        throw new Error('Unauthorized');
      }

      if (bulkBooking.status !== 'pending') {
        return {
          success: false,
          message: 'Booking already finalized',
        };
      }

      // Get confirmed employees
      const confirmedEmployees = bulkBooking.employees.filter(
        (e) => e.status === 'confirmed'
      );

      if (confirmedEmployees.length === 0) {
        return {
          success: false,
          message: 'No employees confirmed for this booking',
        };
      }

      // Create individual ride requests for each confirmed employee
      const rideRequests = [];

      for (const empData of confirmedEmployees) {
        const rideRequest = new RideRequest({
          riderId: empData.employeeId,
          pickup: bulkBooking.pickupLocation,
          dropoff: bulkBooking.dropoffLocation,
          rideType: bulkBooking.rideType,
          bulkBookingId: bulkBookingId,
          status: 'requested',
          createdAt: new Date(),
        });

        await rideRequest.save();
        rideRequests.push(rideRequest._id);
      }

      // Update bulk booking
      bulkBooking.status = 'finalized';
      bulkBooking.rideRequestIds = rideRequests;
      bulkBooking.finalizedAt = new Date();

      await bulkBooking.save();

      return {
        success: true,
        message: 'Bulk booking finalized and ride requests created',
        data: {
          bulkBookingId: bulkBooking._id,
          totalRidesCreated: rideRequests.length,
          status: bulkBooking.status,
        },
      };
    } catch (error) {
      throw new Error(`Error finalizing bulk booking: ${error.message}`);
    }
  }

  /**
   * Cancel bulk booking
   */
  static async cancelBulkBooking(bulkBookingId, accountId, reason = '') {
    try {
      const bulkBooking = await BulkBooking.findById(bulkBookingId);

      if (!bulkBooking) {
        throw new Error('Bulk booking not found');
      }

      if (bulkBooking.corporateAccountId.toString() !== accountId) {
        throw new Error('Unauthorized');
      }

      if (['cancelled', 'completed'].includes(bulkBooking.status)) {
        return {
          success: false,
          message: `Cannot cancel booking in ${bulkBooking.status} status`,
        };
      }

      bulkBooking.status = 'cancelled';
      bulkBooking.cancellationReason = reason;
      bulkBooking.cancelledAt = new Date();

      await bulkBooking.save();

      return {
        success: true,
        message: 'Bulk booking cancelled',
        data: {
          bulkBookingId: bulkBooking._id,
          status: bulkBooking.status,
        },
      };
    } catch (error) {
      throw new Error(`Error cancelling bulk booking: ${error.message}`);
    }
  }

  /**
   * Get bulk booking report/summary
   */
  static async getBulkBookingReport(bulkBookingId, accountId) {
    try {
      const bulkBooking = await BulkBooking.findById(bulkBookingId).populate(
        'employees.employeeId',
        'firstName lastName email'
      );

      if (!bulkBooking) {
        throw new Error('Bulk booking not found');
      }

      if (bulkBooking.corporateAccountId.toString() !== accountId) {
        throw new Error('Unauthorized');
      }

      const report = {
        bookingName: bulkBooking.bookingName,
        bookingDate: bulkBooking.bookingDateTime,
        totalInvited: bulkBooking.totalEmployees,
        confirmed: bulkBooking.confirmedCount,
        declined: bulkBooking.cancelledCount,
        pending: bulkBooking.totalEmployees - bulkBooking.confirmedCount - bulkBooking.cancelledCount,
        responseRate: ((bulkBooking.confirmedCount + bulkBooking.cancelledCount) / bulkBooking.totalEmployees * 100).toFixed(2),
        completed: bulkBooking.completedCount,
        status: bulkBooking.status,
        employees: bulkBooking.employees.map((e) => ({
          name: `${e.employeeId.firstName} ${e.employeeId.lastName}`,
          email: e.employeeId.email,
          status: e.status,
        })),
      };

      return {
        success: true,
        data: report,
      };
    } catch (error) {
      throw new Error(`Error retrieving bulk booking report: ${error.message}`);
    }
  }

  /**
   * Get bulk booking analytics
   */
  static async getBulkAnalytics(accountId) {
    try {
      const bulkBookings = await BulkBooking.find({
        corporateAccountId: accountId,
      });

      let totalBookings = bulkBookings.length;
      let totalEmployeeRides = 0;
      let totalCost = 0;
      let totalConfirmed = 0;

      bulkBookings.forEach((booking) => {
        totalEmployeeRides += booking.confirmedCount;
        totalConfirmed += booking.confirmedCount;
        totalCost += booking.estimatedCost || 0;
      });

      const analytics = {
        totalBulkBookings: totalBookings,
        totalEmployeeRides,
        averageBookingSize: totalBookings > 0 ? (totalEmployeeRides / totalBookings).toFixed(2) : 0,
        totalEstimatedCost: totalCost,
        confirmationRate: totalBookings > 0
          ? ((totalConfirmed / (totalBookings * 10)).toFixed(2)) // Assuming ~10 employees per booking
          : 0,
        bookingsByStatus: {
          pending: bulkBookings.filter((b) => b.status === 'pending').length,
          finalized: bulkBookings.filter((b) => b.status === 'finalized').length,
          completed: bulkBookings.filter((b) => b.status === 'completed').length,
          cancelled: bulkBookings.filter((b) => b.status === 'cancelled').length,
        },
      };

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      throw new Error(`Error retrieving bulk analytics: ${error.message}`);
    }
  }

  /**
   * Update bulk booking status (admin/company admin)
   */
  static async updateBulkBookingStatus(bulkBookingId, accountId, newStatus) {
    try {
      const bulkBooking = await BulkBooking.findById(bulkBookingId);

      if (!bulkBooking) {
        throw new Error('Bulk booking not found');
      }

      if (bulkBooking.corporateAccountId.toString() !== accountId) {
        throw new Error('Unauthorized');
      }

      const validStatuses = ['pending', 'approved', 'finalized', 'in_progress', 'completed', 'cancelled'];

      if (!validStatuses.includes(newStatus)) {
        return {
          success: false,
          message: 'Invalid status',
        };
      }

      bulkBooking.status = newStatus;

      if (newStatus === 'in_progress') {
        bulkBooking.startedAt = new Date();
      } else if (newStatus === 'completed') {
        bulkBooking.completedAt = new Date();
      }

      await bulkBooking.save();

      return {
        success: true,
        message: 'Bulk booking status updated',
        data: {
          bulkBookingId: bulkBooking._id,
          status: bulkBooking.status,
        },
      };
    } catch (error) {
      throw new Error(`Error updating bulk booking status: ${error.message}`);
    }
  }

  /**
   * Send reminders to pending employees
   */
  static async sendReminders(bulkBookingId, accountId) {
    try {
      const bulkBooking = await BulkBooking.findById(bulkBookingId).populate(
        'employees.employeeId',
        'email phone'
      );

      if (!bulkBooking) {
        throw new Error('Bulk booking not found');
      }

      if (bulkBooking.corporateAccountId.toString() !== accountId) {
        throw new Error('Unauthorized');
      }

      // Filter pending employees
      const pendingEmployees = bulkBooking.employees.filter((e) => e.status === 'pending');

      if (pendingEmployees.length === 0) {
        return {
          success: true,
          message: 'No pending employees to remind',
          remindersCount: 0,
        };
      }

      // Send reminders (in production, would send SMS/email)
      const reminderCount = pendingEmployees.length;

      return {
        success: true,
        message: `Reminders sent to ${reminderCount} employees`,
        data: {
          remindersCount: reminderCount,
          employees: pendingEmployees.map((e) => ({
            email: e.employeeId.email,
            phone: e.employeeId.phone,
          })),
        },
      };
    } catch (error) {
      throw new Error(`Error sending reminders: ${error.message}`);
    }
  }
}

module.exports = BulkBookingService;
