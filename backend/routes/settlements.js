/**
 * Settlement Routes
 * Handles vendor settlement reports, commission calculations, and payment tracking
 */

const express = require('express');
const router = express.Router();
const Settlement = require('../models/Settlement');
const Order = require('../models/Order');
const SellerAnalytics = require('../models/SellerAnalytics');
const { authenticate } = require('../middleware/auth');
const { commissionService } = require('../utils');
const {
  calculateVendorSettlement,
  generateSettlementReport,
  qualifiesForSettlement,
} = require('../utils/commissionService');
const { COMMISSION_CONFIG } = require('../config/constants');
const logger = require('../utils/logger');

const roundCurrency = (value) => Math.round(value * 100) / 100;

/**
 * GET /api/settlements/list
 * Get settlement history for authenticated vendor or all settlements (admin)
 * Query params: vendorEmail (optional, admin only), status, page, limit, sortBy
 */
router.get('/list', authenticate, async (req, res) => {
  try {
    const { vendorEmail, status, page = 1, limit = 10, sortBy = '-createdAt' } = req.query;
    const userEmail = req.user?.email;

    // Vendors can only view their own settlements
    const query = {};
    if (!userEmail?.includes('admin')) {
      query.vendorEmail = userEmail;
    } else if (vendorEmail) {
      query.vendorEmail = vendorEmail.toLowerCase();
    }

    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const settlements = await Settlement.find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Settlement.countDocuments(query);

    return res.json({
      success: true,
      data: settlements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
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
    const userEmail = req.user?.email;

    const settlement = await Settlement.findOne({ settlementId });

    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    // Vendors can only view their own settlements
    if (!userEmail?.includes('admin') && settlement.vendorEmail !== userEmail) {
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
    const userEmail = req.user?.email;
    if (!userEmail?.includes('admin')) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { vendorEmail, startDate, endDate } = req.body;

    if (!vendorEmail) {
      return res.status(400).json({ success: false, message: 'vendorEmail is required' });
    }

    const periodStart = new Date(startDate || Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
    const periodEnd = new Date(endDate || Date.now());

    // Get all orders for this vendor in the period
    const orders = await Order.find({
      'items.sellerEmail': vendorEmail.toLowerCase(),
      createdAt: { $gte: periodStart, $lte: periodEnd },
    });

    if (orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No orders found for this vendor in the specified period',
      });
    }

    // Calculate settlement
    const calculatedSettlement = calculateVendorSettlement(orders, vendorEmail, {
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
      vendorEmail: vendorEmail.toLowerCase(),
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
      vendorEmail: vendorEmail.toLowerCase(),
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

    logger.info(`Settlement generated: ${newSettlement.settlementId} for ${vendorEmail}`);

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
    const userEmail = req.user?.email;
    if (!userEmail?.includes('admin')) {
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
    const userEmail = req.user?.email;
    if (!userEmail?.includes('admin')) {
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
    const vendorEmail = req.user?.email;

    const settlements = await Settlement.find({ vendorEmail })
      .sort('-createdAt')
      .limit(20)
      .lean();

    const summary = {
      totalSettlements: settlements.length,
      pending: settlements.filter((s) => s.status === 'Pending').length,
      processing: settlements.filter((s) => s.status === 'Processing').length,
      completed: settlements.filter((s) => s.status === 'Completed').length,
      failed: settlements.filter((s) => s.status === 'Failed').number,
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
