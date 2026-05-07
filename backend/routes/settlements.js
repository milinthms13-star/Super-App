/**
 * Settlement Routes
 * Handles vendor settlement reports, commission calculations, and payment tracking
 */

const express = require('express');
const router = express.Router();
const Settlement = require('../models/Settlement');
const Order = require('../models/Order');
const { authenticate } = require('../middleware/auth');
const {
  calculateVendorSettlement,
  qualifiesForSettlement,
} = require('../utils/commissionService');
const { ADMIN_EMAIL, COMMISSION_CONFIG, DEFAULT_LIMIT, MAX_LIMIT } = require('../config/constants');
const logger = require('../utils/logger');

const roundCurrency = (value) => Math.round(value * 100) / 100;
const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();
const isAdminUser = (req) =>
  normalizeEmail(req.user?.email) === ADMIN_EMAIL ||
  String(req.user?.role || req.user?.registrationType || '').trim().toLowerCase() === 'admin';
const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};
const parsePagination = (pageValue, limitValue) => {
  const page = Math.max(1, parseInt(pageValue, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(limitValue, 10) || DEFAULT_LIMIT));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

/**
 * GET /api/settlements/list
 * Get settlement history for authenticated vendor or all settlements (admin)
 * Query params: vendorEmail (optional, admin only), status, page, limit, sortBy
 */
router.get('/list', authenticate, async (req, res) => {
  try {
    const { vendorEmail, status, sortBy = '-createdAt' } = req.query;
    const userEmail = normalizeEmail(req.user?.email);
    const { page, limit, skip } = parsePagination(req.query?.page, req.query?.limit);

    // Vendors can only view their own settlements
    const query = {};
    if (!isAdminUser(req)) {
      query.vendorEmail = userEmail;
    } else if (vendorEmail) {
      query.vendorEmail = normalizeEmail(vendorEmail);
    }

    if (status) {
      if (!COMMISSION_CONFIG.SETTLEMENT_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${COMMISSION_CONFIG.SETTLEMENT_STATUSES.join(', ')}`,
        });
      }
      query.status = status;
    }
    const settlements = await Settlement.find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Settlement.countDocuments(query);

    return res.json({
      success: true,
      data: settlements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(`Error fetching settlements: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/settlements/:settlementId
 * Get detailed settlement report
 */
router.get('/:settlementId', authenticate, async (req, res) => {
  try {
    const { settlementId } = req.params;
    const userEmail = normalizeEmail(req.user?.email);

    const settlement = await Settlement.findOne({ settlementId });

    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    // Vendors can only view their own settlements
    if (!isAdminUser(req) && normalizeEmail(settlement.vendorEmail) !== userEmail) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.json({ success: true, data: settlement });
  } catch (error) {
    logger.error(`Error fetching settlement details: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/settlements/generate
 * Generate new settlement for vendor(s) - Admin only
 * Body: { vendorEmail, startDate, endDate }
 */
router.post('/generate', authenticate, async (req, res) => {
  try {
    const userEmail = normalizeEmail(req.user?.email);
    if (!isAdminUser(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { vendorEmail, startDate, endDate } = req.body;
    const normalizedVendorEmail = normalizeEmail(vendorEmail);

    if (!normalizedVendorEmail) {
      return res.status(400).json({ success: false, message: 'vendorEmail is required' });
    }

    const parsedStartDate = parseDateValue(startDate);
    const parsedEndDate = parseDateValue(endDate);
    const periodStart =
      parsedStartDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = parsedEndDate || new Date();

    if (startDate && !parsedStartDate) {
      return res.status(400).json({ success: false, message: 'startDate is invalid' });
    }

    if (endDate && !parsedEndDate) {
      return res.status(400).json({ success: false, message: 'endDate is invalid' });
    }

    if (periodEnd < periodStart) {
      return res.status(400).json({
        success: false,
        message: 'endDate must be on or after startDate',
      });
    }

    // Get all orders for this vendor in the period
    const orders = await Order.find({
      'items.sellerEmail': normalizedVendorEmail,
      createdAt: { $gte: periodStart, $lte: periodEnd },
    });

    if (orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No orders found for this vendor in the specified period',
      });
    }

    // Calculate settlement
    const calculatedSettlement = calculateVendorSettlement(orders, normalizedVendorEmail, {
      periodStartDate: periodStart,
      periodEndDate: periodEnd,
    });

    if (calculatedSettlement.summary.netPayable <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Net payable amount must be greater than zero',
      });
    }

    // Check if settlement qualifies
    const qualifies = qualifiesForSettlement(
      calculatedSettlement.summary.netPayable,
      COMMISSION_CONFIG.SETTLEMENT_MIN_AMOUNT
    );

    if (!qualifies) {
      return res.status(400).json({
        success: false,
        message: `Settlement amount (${calculatedSettlement.summary.netPayable}) is below minimum threshold (${COMMISSION_CONFIG.SETTLEMENT_MIN_AMOUNT})`,
      });
    }

    // Check for existing settlement in same period
    const existingSettlement = await Settlement.findOne({
      vendorEmail: normalizedVendorEmail,
      periodStartDate: { $lte: periodStart },
      periodEndDate: { $gte: periodEnd },
    });

    if (existingSettlement) {
      return res.status(400).json({
        success: false,
        message: 'Settlement already exists for this period',
      });
    }

    // Create settlement document
    const newSettlement = new Settlement({
      vendorEmail: normalizedVendorEmail,
      vendorName: calculatedSettlement.orders[0]?.sellerName || '',
      businessName: calculatedSettlement.orders[0]?.businessName || '',
      periodStartDate: periodStart,
      periodEndDate: periodEnd,
      summary: calculatedSettlement.summary,
      orders: calculatedSettlement.orders,
      status: 'Pending',
      createdBy: userEmail,
    });

    await newSettlement.save();

    logger.info(`Settlement generated: ${newSettlement.settlementId} for ${normalizedVendorEmail}`);

    return res.json({
      success: true,
      message: 'Settlement generated successfully',
      data: newSettlement,
    });
  } catch (error) {
    logger.error(`Error generating settlement: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/settlements/:settlementId/mark-completed
 * Mark settlement as completed and record payment details - Admin only
 * Body: { paymentMethod, transactionId, accountDetails, notes }
 */
router.patch('/:settlementId/mark-completed', authenticate, async (req, res) => {
  try {
    const userEmail = normalizeEmail(req.user?.email);
    if (!isAdminUser(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { settlementId } = req.params;
    const { paymentMethod, transactionId, accountDetails, notes } = req.body;

    const settlement = await Settlement.findOne({ settlementId });

    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    if (settlement.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Settlement already completed' });
    }

    // Update settlement with payment details
    settlement.status = 'Completed';
    settlement.payment = {
      method: paymentMethod || 'bank_transfer',
      accountDetails: accountDetails || null,
      transactionId: transactionId || null,
      completedAt: new Date(),
      notes: notes || '',
    };
    settlement.processedBy = userEmail;

    await settlement.save();

    logger.info(`Settlement completed: ${settlementId} via ${paymentMethod}`);

    return res.json({
      success: true,
      message: 'Settlement marked as completed',
      data: settlement,
    });
  } catch (error) {
    logger.error(`Error completing settlement: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/settlements/:settlementId/update-status
 * Update settlement status (hold, reject, retry, etc.) - Admin only
 * Body: { status, adminNotes }
 */
router.patch('/:settlementId/update-status', authenticate, async (req, res) => {
  try {
    const userEmail = normalizeEmail(req.user?.email);
    if (!isAdminUser(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { settlementId } = req.params;
    const { status, adminNotes } = req.body;

    if (!COMMISSION_CONFIG.SETTLEMENT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${COMMISSION_CONFIG.SETTLEMENT_STATUSES.join(', ')}`,
      });
    }

    const settlement = await Settlement.findOne({ settlementId });

    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    settlement.status = status;
    if (adminNotes) {
      settlement.adminNotes = adminNotes;
    }
    settlement.processedBy = userEmail;

    await settlement.save();

    logger.info(`Settlement status updated: ${settlementId} → ${status}`);

    return res.json({
      success: true,
      message: 'Settlement status updated',
      data: settlement,
    });
  } catch (error) {
    logger.error(`Error updating settlement status: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/settlements/vendor-dashboard
 * Get dashboard summary for vendor - list pending and completed settlements
 */
router.get('/dashboard/vendor', authenticate, async (req, res) => {
  try {
    const vendorEmail = normalizeEmail(req.user?.email);

    const settlements = await Settlement.find({ vendorEmail })
      .sort('-createdAt')
      .limit(20)
      .lean();

    const summary = {
      totalSettlements: settlements.length,
      pending: settlements.filter((s) => s.status === 'Pending').length,
      processing: settlements.filter((s) => s.status === 'Processing').length,
      completed: settlements.filter((s) => s.status === 'Completed').length,
      failed: settlements.filter((s) => s.status === 'Failed').length,
      onHold: settlements.filter((s) => s.status === 'OnHold').length,
      totalEarnings: roundCurrency(
        settlements
          .filter((s) => s.status === 'Completed')
          .reduce((sum, s) => sum + (s.summary?.netPayable || 0), 0)
      ),
      pendingEarnings: roundCurrency(
        settlements
          .filter((s) => s.status === 'Pending')
          .reduce((sum, s) => sum + (s.summary?.netPayable || 0), 0)
      ),
    };

    return res.json({
      success: true,
      summary,
      recentSettlements: settlements,
    });
  } catch (error) {
    logger.error(`Error fetching vendor dashboard: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
