/**
 * Ecommerce Commission Routes
 * API endpoints for commission calculation and management
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const CommissionCalculationService = require('../services/CommissionCalculationService');
const EcommerceSellerProfile = require('../models/EcommerceSellerProfile');
const EcommerceTransaction = require('../models/EcommerceTransaction');
const logger = require('../utils/logger');

/**
 * Helper to check if user is admin
 */
const isAdmin = (req) => {
  const role = req.user?.role || req.user?.registrationType || '';
  return role.toLowerCase() === 'admin';
};

/**
 * POST /api/ecommerce/commission/calculate
 * Calculate commission for an order
 */
router.post('/calculate', authenticate, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    const commissionData = await CommissionCalculationService.calculateOrderCommission(orderId);

    res.json({
      success: true,
      commission: commissionData,
    });
  } catch (error) {
    logger.error('Error calculating commission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate commission',
      error: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/commission/preview
 * Preview commission for cart items
 */
router.post('/preview', authenticate, async (req, res) => {
  try {
    const { items, sellerEmail } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required',
      });
    }

    const seller = await EcommerceSellerProfile.findOne({ 
      sellerEmail: sellerEmail || req.user.email 
    });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    const preview = await CommissionCalculationService.previewCommission(
      items,
      seller.sellerEmail
    );

    res.json({
      success: true,
      preview,
    });
  } catch (error) {
    logger.error('Error previewing commission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview commission',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/commission/summary
 * Get commission summary for authenticated seller
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const seller = await EcommerceSellerProfile.findOne({ sellerEmail: req.user.email });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    const summary = await CommissionCalculationService.getSellerCommissionSummary(
      seller._id,
      startDate,
      endDate
    );

    res.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    logger.error('Error fetching commission summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commission summary',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/commission/transactions
 * Get commission transactions for seller
 */
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;

    const seller = await EcommerceSellerProfile.findOne({ sellerEmail: req.user.email });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    const query = {
      sellerId: seller._id,
      type: 'sale',
    };

    if (status) {
      query['settlement.status'] = status;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const transactions = await EcommerceTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('orderId', 'customerEmail customerName status createdAt');

    const total = await EcommerceTransaction.countDocuments(query);

    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/commission/comparison
 * Compare commission rates across plans
 */
router.get('/comparison', async (req, res) => {
  try {
    const { amount = 1000, category = 'General' } = req.query;

    const comparison = await CommissionCalculationService.getCommissionComparison(
      parseFloat(amount),
      category
    );

    res.json({
      success: true,
      ...comparison,
    });
  } catch (error) {
    logger.error('Error getting commission comparison:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get commission comparison',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/commission/pending-settlements
 * Get pending settlement transactions
 */
router.get('/pending-settlements', authenticate, async (req, res) => {
  try {
    const seller = await EcommerceSellerProfile.findOne({ sellerEmail: req.user.email });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    const pendingTransactions = await EcommerceTransaction.getPendingSettlements(seller._id);

    const summary = {
      count: pendingTransactions.length,
      totalAmount: pendingTransactions.reduce((sum, txn) => sum + txn.settlement.netAmount, 0),
      nextSettlementDate: pendingTransactions[0]?.settlement.scheduledDate || null,
    };

    res.json({
      success: true,
      summary,
      transactions: pendingTransactions,
    });
  } catch (error) {
    logger.error('Error fetching pending settlements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending settlements',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/commission/earnings-breakdown
 * Get detailed earnings breakdown
 */
router.get('/earnings-breakdown', authenticate, async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const seller = await EcommerceSellerProfile.findOne({ sellerEmail: req.user.email });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const summary = await CommissionCalculationService.getSellerCommissionSummary(
      seller._id,
      startDate,
      endDate
    );

    res.json({
      success: true,
      period,
      ...summary,
    });
  } catch (error) {
    logger.error('Error fetching earnings breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings breakdown',
      error: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/commission/apply-category
 * Apply category-specific commission
 */
router.post('/apply-category', authenticate, async (req, res) => {
  try {
    const { categoryId, orderAmount } = req.body;

    if (!categoryId || !orderAmount) {
      return res.status(400).json({
        success: false,
        message: 'Category ID and order amount are required',
      });
    }

    const seller = await EcommerceSellerProfile.findOne({ sellerEmail: req.user.email });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    const result = await CommissionCalculationService.applyCategoryCommission(
      seller._id,
      categoryId,
      parseFloat(orderAmount)
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error applying category commission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply category commission',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/commission/platform-summary (Admin only)
 * Get platform-wide commission summary
 */
router.get('/platform-summary', authenticate, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { startDate, endDate } = req.query;

    const summary = await CommissionCalculationService.getPlatformCommissionSummary(
      startDate,
      endDate
    );

    res.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    logger.error('Error fetching platform commission summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform commission summary',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/commission/transaction/:transactionId
 * Get detailed transaction information
 */
router.get('/transaction/:transactionId', authenticate, async (req, res) => {
  try {
    const transaction = await EcommerceTransaction.findOne({
      transactionId: req.params.transactionId,
    }).populate('orderId sellerId');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // Check if user has access to this transaction
    if (!isAdmin(req) && transaction.sellerEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      transaction,
    });
  } catch (error) {
    logger.error('Error fetching transaction details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction details',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/commission/revenue-report
 * Get revenue and commission report
 */
router.get('/revenue-report', authenticate, async (req, res) => {
  try {
    const { groupBy = 'month', startDate, endDate } = req.query;

    const seller = await EcommerceSellerProfile.findOne({ sellerEmail: req.user.email });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    const match = {
      sellerId: seller._id,
      type: 'sale',
      status: 'completed',
    };

    if (startDate && endDate) {
      match.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Determine grouping format
    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-W%U';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m';
    }

    const report = await EcommerceTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: '$createdAt' },
          },
          revenue: { $sum: '$productAmount' },
          commission: { $sum: '$commission.totalCommission' },
          netEarnings: { $sum: '$settlement.netAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      groupBy,
      report,
    });
  } catch (error) {
    logger.error('Error generating revenue report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate revenue report',
      error: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/commission/create-transaction
 * Create transaction record for an order (Admin/System)
 */
router.post('/create-transaction', authenticate, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required',
      });
    }

    // Calculate commission
    const commissionData = await CommissionCalculationService.calculateOrderCommission(orderId);

    // Create transaction records
    const transactions = await CommissionCalculationService.createTransactionRecords(
      orderId,
      commissionData
    );

    res.json({
      success: true,
      message: 'Transaction records created successfully',
      transactions,
      commissionData,
    });
  } catch (error) {
    logger.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/commission/stats
 * Get quick commission stats for seller dashboard
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const seller = await EcommerceSellerProfile.findOne({ sellerEmail: req.user.email });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found',
      });
    }

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // This month stats
    const thisMonth = await EcommerceTransaction.getSellerRevenue(
      seller._id,
      thisMonthStart,
      now
    );

    // Last month stats
    const lastMonth = await EcommerceTransaction.getSellerRevenue(
      seller._id,
      lastMonthStart,
      lastMonthEnd
    );

    // Pending settlements
    const pendingSettlements = await EcommerceTransaction.find({
      sellerId: seller._id,
      'settlement.status': { $in: ['pending', 'processing'] },
    });

    const pendingAmount = pendingSettlements.reduce(
      (sum, txn) => sum + txn.settlement.netAmount,
      0
    );

    res.json({
      success: true,
      stats: {
        thisMonth: {
          revenue: thisMonth.totalRevenue,
          commission: thisMonth.totalCommission,
          netRevenue: thisMonth.netRevenue,
          orders: thisMonth.transactionCount,
        },
        lastMonth: {
          revenue: lastMonth.totalRevenue,
          commission: lastMonth.totalCommission,
          netRevenue: lastMonth.netRevenue,
          orders: lastMonth.transactionCount,
        },
        pending: {
          count: pendingSettlements.length,
          amount: pendingAmount,
        },
        commissionRate: seller.commissionConfig.rate,
        subscriptionPlan: seller.subscription.plan,
      },
    });
  } catch (error) {
    logger.error('Error fetching commission stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commission stats',
      error: error.message,
    });
  }
});

module.exports = router;
