/**
 * taxCalculationRoutes.js
 * API endpoints for tax and GST calculations
 */

const express = require('express');
const router = express.Router();
const TaxCalculationService = require('../services/TaxCalculationService');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');
const logger = require('../config/logger');

/**
 * POST /api/tax/calculate
 * Calculate tax for product
 */
router.post('/calculate', async (req, res) => {
  try {
    const { price, gstRate } = req.body;

    if (!price || !gstRate) {
      return res.status(400).json({
        success: false,
        message: 'Price and GST rate are required',
      });
    }

    const taxCalculation = TaxCalculationService.calculateGST(price, gstRate);

    res.json({
      success: true,
      data: taxCalculation,
    });
  } catch (error) {
    logger.error('Calculate tax error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate tax',
      error: error.message,
    });
  }
});

/**
 * POST /api/tax/order-tax
 * Calculate tax for complete order
 */
router.post('/order-tax', async (req, res) => {
  try {
    const { order } = req.body;

    if (!order || !order.items) {
      return res.status(400).json({
        success: false,
        message: 'Order with items is required',
      });
    }

    const taxCalculation = await TaxCalculationService.calculateOrderTax(order);

    res.json({
      success: true,
      data: taxCalculation,
    });
  } catch (error) {
    logger.error('Calculate order tax error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate order tax',
      error: error.message,
    });
  }
});

/**
 * GET /api/tax/invoice/:orderId
 * Generate GST invoice
 */
router.get('/invoice/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const invoice = await TaxCalculationService.generateGSTInvoice(orderId);

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error('Generate invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message,
    });
  }
});

/**
 * POST /api/tax/state-wise
 * Calculate state-wise tax (IGST/SGST/CGST)
 */
router.post('/state-wise', async (req, res) => {
  try {
    const { price, gstRate, buyerState, sellerState } = req.body;

    if (!price || !gstRate || !buyerState || !sellerState) {
      return res.status(400).json({
        success: false,
        message: 'Price, GST rate, buyer state, and seller state are required',
      });
    }

    const taxCalculation = TaxCalculationService.calculateStateWiseTax(
      price,
      gstRate,
      buyerState,
      sellerState
    );

    res.json({
      success: true,
      data: taxCalculation,
    });
  } catch (error) {
    logger.error('Calculate state-wise tax error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate state-wise tax',
      error: error.message,
    });
  }
});

/**
 * POST /api/tax/validate-gst
 * Validate GST number
 */
router.post('/validate-gst', async (req, res) => {
  try {
    const { gstNumber } = req.body;

    if (!gstNumber) {
      return res.status(400).json({
        success: false,
        message: 'GST number is required',
      });
    }

    const isValid = TaxCalculationService.validateGSTNumber(gstNumber);

    res.json({
      success: true,
      data: {
        gstNumber,
        isValid,
        message: isValid ? 'Valid GST number' : 'Invalid GST number format',
      },
    });
  } catch (error) {
    logger.error('Validate GST error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate GST number',
      error: error.message,
    });
  }
});

/**
 * POST /api/tax/apply-discount
 * Apply discount with tax calculation
 */
router.post('/apply-discount', async (req, res) => {
  try {
    const { price, discountPercentage, gstRate } = req.body;

    if (price === undefined || discountPercentage === undefined || !gstRate) {
      return res.status(400).json({
        success: false,
        message: 'Price, discount percentage, and GST rate are required',
      });
    }

    const result = TaxCalculationService.applyDiscount(
      price,
      discountPercentage,
      gstRate
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Apply discount error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply discount',
      error: error.message,
    });
  }
});

/**
 * GET /api/tax/report
 * Generate tax report for seller
 */
router.get('/report', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const report = await TaxCalculationService.generateTaxReport(
      req.userId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Generate tax report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate tax report',
      error: error.message,
    });
  }
});

/**
 * GET /api/tax/hsn-code
 * Get HSN code for product category
 */
router.get('/hsn-code', async (req, res) => {
  try {
    const { category } = req.query;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required',
      });
    }

    const hsnCode = TaxCalculationService.getHSNCode(category);

    res.json({
      success: true,
      data: { category, hsnCode },
    });
  } catch (error) {
    logger.error('Get HSN code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get HSN code',
      error: error.message,
    });
  }
});

module.exports = router;
