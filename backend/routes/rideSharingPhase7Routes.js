/**
 * rideSharingPhase7Routes.js
 * Phase 7: Corporate & Rental Features Routes
 * Endpoints for corporate accounts, bulk bookings, expense tracking, and rental packages
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const CorporateAccountService = require('../services/ridesharing/CorporateAccountService');
const BulkBookingService = require('../services/ridesharing/BulkBookingService');
const ExpenseTrackingService = require('../services/ridesharing/ExpenseTrackingService');
const RentalPackageService = require('../services/ridesharing/RentalPackageService');

// ==================== CORPORATE ACCOUNT ENDPOINTS ====================

/**
 * POST /api/ridesharing/phase7/corporate/account
 * Create new corporate account
 */
router.post('/corporate/account', auth, async (req, res) => {
  try {
    const result = await CorporateAccountService.createCorporateAccount(
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/corporate/account/:accountId
 * Get corporate account details
 */
router.get('/corporate/account/:accountId', auth, async (req, res) => {
  try {
    const result = await CorporateAccountService.getCorporateAccount(
      req.params.accountId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/ridesharing/phase7/corporate/account/:accountId
 * Update corporate account details
 */
router.put('/corporate/account/:accountId', auth, async (req, res) => {
  try {
    const result = await CorporateAccountService.updateCorporateAccount(
      req.params.accountId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase7/corporate/:accountId/employee
 * Add employee to corporate account
 */
router.post('/corporate/:accountId/employee', auth, async (req, res) => {
  try {
    const result = await CorporateAccountService.addEmployee(
      req.params.accountId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/corporate/:accountId/employees
 * Get all employees in corporate account
 */
router.get('/corporate/:accountId/employees', auth, async (req, res) => {
  try {
    const result = await CorporateAccountService.getEmployees(
      req.params.accountId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/ridesharing/phase7/corporate/:accountId/employee/:employeeId
 * Remove employee from corporate account
 */
router.delete('/corporate/:accountId/employee/:employeeId', auth, async (req, res) => {
  try {
    const result = await CorporateAccountService.removeEmployee(
      req.params.accountId,
      req.params.employeeId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase7/corporate/:accountId/budget
 * Set department budget
 */
router.post('/corporate/:accountId/budget', auth, async (req, res) => {
  try {
    const result = await CorporateAccountService.setDepartmentBudget(
      req.params.accountId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/corporate/:accountId/budget
 * Get budget information
 */
router.get('/corporate/:accountId/budget', auth, async (req, res) => {
  try {
    const result = await CorporateAccountService.getBudgetInfo(
      req.params.accountId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== BULK BOOKING ENDPOINTS ====================

/**
 * POST /api/ridesharing/phase7/bulk/booking
 * Create bulk booking for group
 */
router.post('/bulk/booking', auth, async (req, res) => {
  try {
    const result = await BulkBookingService.createBulkBooking(
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/bulk/booking/:bookingId
 * Get bulk booking details
 */
router.get('/bulk/booking/:bookingId', auth, async (req, res) => {
  try {
    const result = await BulkBookingService.getBulkBooking(
      req.params.bookingId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase7/bulk/booking/:bookingId/ride
 * Add ride to bulk booking
 */
router.post('/bulk/booking/:bookingId/ride', auth, async (req, res) => {
  try {
    const result = await BulkBookingService.addRideToBulkBooking(
      req.params.bookingId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/bulk/booking/:bookingId/status
 * Get bulk booking group status
 */
router.get('/bulk/booking/:bookingId/status', auth, async (req, res) => {
  try {
    const result = await BulkBookingService.getGroupStatus(
      req.params.bookingId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase7/bulk/booking/:bookingId/confirm
 * Confirm bulk booking
 */
router.post('/bulk/booking/:bookingId/confirm', auth, async (req, res) => {
  try {
    const result = await BulkBookingService.confirmBulkBooking(
      req.params.bookingId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/ridesharing/phase7/bulk/booking/:bookingId
 * Cancel bulk booking
 */
router.delete('/bulk/booking/:bookingId', auth, async (req, res) => {
  try {
    const result = await BulkBookingService.cancelBulkBooking(
      req.params.bookingId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/bulk/bookings
 * Get all bulk bookings for user
 */
router.get('/bulk/bookings', auth, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const result = await BulkBookingService.getUserBulkBookings(
      req.user.id,
      page,
      limit
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== EXPENSE TRACKING ENDPOINTS ====================

/**
 * POST /api/ridesharing/phase7/expense/track
 * Track expense from ride
 */
router.post('/expense/track', auth, async (req, res) => {
  try {
    const result = await ExpenseTrackingService.trackExpense(
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/expense/user
 * Get user expenses
 */
router.get('/expense/user', auth, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const result = await ExpenseTrackingService.getUserExpenses(
      req.user.id,
      page,
      limit
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/expense/corporate/:accountId
 * Get corporate account expenses
 */
router.get('/expense/corporate/:accountId', auth, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const result = await ExpenseTrackingService.getCorporateExpenses(
      req.params.accountId,
      page,
      limit
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/expense/report/:accountId
 * Generate expense report for corporate account
 */
router.get('/expense/report/:accountId', auth, async (req, res) => {
  try {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const result = await ExpenseTrackingService.generateExpenseReport(
      req.params.accountId,
      startDate,
      endDate
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/expense/invoice/:accountId
 * Generate invoice for corporate account
 */
router.get('/expense/invoice/:accountId', auth, async (req, res) => {
  try {
    const month = req.query.month;
    const year = req.query.year;
    const result = await ExpenseTrackingService.generateInvoice(
      req.params.accountId,
      month,
      year
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/expense/analytics/:accountId
 * Get expense analytics
 */
router.get('/expense/analytics/:accountId', auth, async (req, res) => {
  try {
    const result = await ExpenseTrackingService.getExpenseAnalytics(
      req.params.accountId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== RENTAL PACKAGE ENDPOINTS ====================

/**
 * POST /api/ridesharing/phase7/rental/package
 * Create rental package
 */
router.post('/rental/package', auth, async (req, res) => {
  try {
    const result = await RentalPackageService.createRentalPackage(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/rental/packages
 * Get all rental packages
 */
router.get('/rental/packages', async (req, res) => {
  try {
    const filters = {
      duration: req.query.duration,
      vehicleType: req.query.vehicleType,
    };
    const result = await RentalPackageService.getRentalPackages(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/rental/package/:packageId
 * Get rental package details
 */
router.get('/rental/package/:packageId', async (req, res) => {
  try {
    const result = await RentalPackageService.getRentalPackage(
      req.params.packageId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase7/rental/booking
 * Book rental package
 */
router.post('/rental/booking', auth, async (req, res) => {
  try {
    const result = await RentalPackageService.bookRentalPackage(
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/rental/booking/:bookingId
 * Get rental booking details
 */
router.get('/rental/booking/:bookingId', auth, async (req, res) => {
  try {
    const result = await RentalPackageService.getRentalBooking(
      req.params.bookingId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/rental/bookings
 * Get all rental bookings for user
 */
router.get('/rental/bookings', auth, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const result = await RentalPackageService.getRentalBookings(
      req.user.id,
      page,
      limit
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ridesharing/phase7/rental/booking/:bookingId/confirm
 * Confirm rental booking
 */
router.post('/rental/booking/:bookingId/confirm', auth, async (req, res) => {
  try {
    const result = await RentalPackageService.confirmRentalBooking(
      req.params.bookingId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/ridesharing/phase7/rental/booking/:bookingId/status
 * Update rental booking status
 */
router.put('/rental/booking/:bookingId/status', auth, async (req, res) => {
  try {
    const result = await RentalPackageService.updateRentalBookingStatus(
      req.params.bookingId,
      req.user.id,
      req.body.status
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/ridesharing/phase7/rental/booking/:bookingId
 * Cancel rental booking
 */
router.delete('/rental/booking/:bookingId', auth, async (req, res) => {
  try {
    const result = await RentalPackageService.cancelRentalBooking(
      req.params.bookingId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/rental/cost
 * Calculate rental cost
 */
router.get('/rental/cost', async (req, res) => {
  try {
    const result = await RentalPackageService.calculateRentalCost(
      req.query.packageId,
      req.query.durationHours
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/rental/available-drivers
 * Get available drivers
 */
router.get('/rental/available-drivers', async (req, res) => {
  try {
    const result = await RentalPackageService.getAvailableDrivers(
      req.query.vehicleType,
      req.query.startDateTime,
      req.query.durationHours
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/rental/statistics/:accountId
 * Get rental statistics
 */
router.get('/rental/statistics/:accountId', auth, async (req, res) => {
  try {
    const result = await RentalPackageService.getRentalStatistics(
      req.params.accountId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ridesharing/phase7/rental/predefined-packages
 * Get predefined rental package templates
 */
router.get('/rental/predefined-packages', (req, res) => {
  try {
    const packages = RentalPackageService.getPredefinedPackages();
    res.json({ success: true, data: packages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
