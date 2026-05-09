/**
 * Ecommerce Phase 7 Routes
 * Advanced Revenue & Multi-Vendor Optimization Features
 * 
 * Endpoints for:
 * - Vendor performance analytics
 * - Flash sales management
 * - Dynamic commission calculations
 * - Revenue optimization
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createModerateRateLimiter } = require('../middleware/rateLimiter');

const VendorPerformanceService = require('../services/VendorPerformanceService');
const FlashSaleService = require('../services/FlashSaleService');
const DynamicCommissionService = require('../services/DynamicCommissionService');

const logger = require('../utils/logger');

const rateLimiter = createModerateRateLimiter();

// ============= VENDOR PERFORMANCE ENDPOINTS =============

/**
 * GET /api/ecommerce/phase7/vendor/:vendorId/performance
 * Get vendor performance metrics
 */
router.get('/vendor/:vendorId/performance', authenticate, rateLimiter, async (req, res) => {
  try {
    const { vendorId } = req.params;
    const daysBack = parseInt(req.query.daysBack) || 30;

    // Authorization: only vendor can view their own metrics
    if (req.user.role !== 'admin' && req.user.id !== vendorId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view these metrics'
      });
    }

    const metrics = await VendorPerformanceService.getVendorPerformanceMetrics(vendorId, daysBack);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error fetching vendor performance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ecommerce/phase7/vendor/:vendorId/performance/benchmark
 * Get vendor performance benchmark comparison
 */
router.get('/vendor/:vendorId/performance/benchmark', authenticate, rateLimiter, async (req, res) => {
  try {
    const { vendorId } = req.params;
    const daysBack = parseInt(req.query.daysBack) || 30;

    if (req.user.role !== 'admin' && req.user.id !== vendorId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const benchmark = await VendorPerformanceService.getVendorBenchmark(vendorId, daysBack);

    res.json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    logger.error('Error fetching vendor benchmark:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ecommerce/phase7/vendor/:vendorId/performance/report
 * Generate comprehensive performance report
 */
router.get('/vendor/:vendorId/performance/report', authenticate, rateLimiter, async (req, res) => {
  try {
    const { vendorId } = req.params;
    const daysBack = parseInt(req.query.daysBack) || 30;

    if (req.user.role !== 'admin' && req.user.id !== vendorId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const report = await VendorPerformanceService.generatePerformanceReport(vendorId, daysBack);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error generating performance report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= FLASH SALE ENDPOINTS =============

/**
 * POST /api/ecommerce/phase7/flashsales
 * Create a new flash sale
 */
router.post('/flashsales', authenticate, authorize(['vendor', 'admin']), rateLimiter, async (req, res) => {
  try {
    const saleData = {
      ...req.body,
      vendorId: req.user.id
    };

    const result = await FlashSaleService.createFlashSale(saleData);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error creating flash sale:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ecommerce/phase7/flashsales/active
 * Get active flash sales
 */
router.get('/flashsales/active', rateLimiter, async (req, res) => {
  try {
    const filters = {
      vendorId: req.query.vendorId,
      maxStartTime: req.query.maxStartTime
    };

    const sales = await FlashSaleService.getActiveFlashSales(filters);

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    logger.error('Error fetching active flash sales:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ecommerce/phase7/flashsales/:saleId/impact
 * Get flash sale impact analytics
 */
router.get('/flashsales/:saleId/impact', authenticate, rateLimiter, async (req, res) => {
  try {
    const { saleId } = req.params;

    const impact = await FlashSaleService.getPromotionImpact(saleId);

    res.json({
      success: true,
      data: impact
    });
  } catch (error) {
    logger.error('Error calculating promotion impact:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ecommerce/phase7/flashsales/:saleId/end
 * End flash sale early
 */
router.post('/flashsales/:saleId/end', authenticate, authorize(['vendor', 'admin']), rateLimiter, async (req, res) => {
  try {
    const { saleId } = req.params;
    const { reason } = req.body;

    const result = await FlashSaleService.endFlashSaleEarly(saleId, reason);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error ending flash sale:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ecommerce/phase7/products/:productId/discounts
 * Get timed discounts for product
 */
router.get('/products/:productId/discounts', rateLimiter, async (req, res) => {
  try {
    const { productId } = req.params;

    const discounts = await FlashSaleService.getTimedDiscounts(productId);

    res.json({
      success: true,
      data: discounts
    });
  } catch (error) {
    logger.error('Error fetching timed discounts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ecommerce/phase7/products/:productId/bulk-offer
 * Create bulk purchase offer
 */
router.post('/products/:productId/bulk-offer', authenticate, authorize(['vendor', 'admin']), rateLimiter, async (req, res) => {
  try {
    const { productId } = req.params;
    const { tiers } = req.body;

    const offer = await FlashSaleService.createBulkOffer(productId, tiers);

    res.json({
      success: true,
      data: offer
    });
  } catch (error) {
    logger.error('Error creating bulk offer:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ecommerce/phase7/products/:productId/bulk-discount
 * Calculate bulk discount
 */
router.get('/products/:productId/bulk-discount', rateLimiter, async (req, res) => {
  try {
    const { productId } = req.params;
    const quantity = parseInt(req.query.quantity) || 1;

    const discount = await FlashSaleService.calculateBulkDiscount(productId, quantity);

    res.json({
      success: true,
      data: discount
    });
  } catch (error) {
    logger.error('Error calculating bulk discount:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= DYNAMIC COMMISSION ENDPOINTS =============

/**
 * POST /api/ecommerce/phase7/orders/:orderId/commission
 * Calculate dynamic commission for order
 */
router.post('/orders/:orderId/commission', authenticate, authorize(['admin']), rateLimiter, async (req, res) => {
  try {
    const { orderId } = req.params;
    const vendorId = req.body.vendorId;

    const commission = await DynamicCommissionService.calculateDynamicCommission(orderId, vendorId);

    res.json({
      success: true,
      data: commission
    });
  } catch (error) {
    logger.error('Error calculating commission:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ecommerce/phase7/vendor/:vendorId/commission/history
 * Get commission history
 */
router.get('/vendor/:vendorId/commission/history', authenticate, rateLimiter, async (req, res) => {
  try {
    const { vendorId } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    if (req.user.role !== 'admin' && req.user.id !== vendorId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const history = await DynamicCommissionService.getCommissionHistory(vendorId, limit);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error fetching commission history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ecommerce/phase7/vendor/:vendorId/commission/reconcile
 * Reconcile commissions for period
 */
router.post('/vendor/:vendorId/commission/reconcile', authenticate, authorize(['admin']), rateLimiter, async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { startDate, endDate } = req.body;

    const reconciliation = await DynamicCommissionService.reconcileCommissions(
      vendorId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: reconciliation
    });
  } catch (error) {
    logger.error('Error reconciling commissions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ecommerce/phase7/commission/tier
 * Create commission tier configuration
 */
router.post('/commission/tier', authenticate, authorize(['admin']), rateLimiter, async (req, res) => {
  try {
    const config = req.body;

    const tier = await DynamicCommissionService.createCommissionTier(config.vendorId, config);

    res.json({
      success: true,
      data: tier
    });
  } catch (error) {
    logger.error('Error creating commission tier:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ecommerce/phase7/vendor/:vendorId/commission/comparison
 * Get commission comparison
 */
router.get('/vendor/:vendorId/commission/comparison', authenticate, rateLimiter, async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { category } = req.query;

    if (req.user.role !== 'admin' && req.user.id !== vendorId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const comparison = await DynamicCommissionService.getCommissionComparison(vendorId, category);

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    logger.error('Error getting commission comparison:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
