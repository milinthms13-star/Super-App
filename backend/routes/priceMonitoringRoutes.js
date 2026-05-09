const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PriceMonitoringService = require('../services/PriceMonitoringService');
const logger = require('../utils/logger');

/**
 * Phase 3: Price Monitoring & Dynamic Pricing Routes
 * Handles price tracking, watchlists, dynamic pricing, competitor analysis
 */

/**
 * GET /api/ecommerce/pricing/history/:productId
 * Get price history for a product
 * Query params: days (default 30)
 */
router.get('/history/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { days = 30 } = req.query;

    const result = await PriceMonitoringService.getPriceHistory(productId, days);

    res.json({
      success: true,
      data: result,
      message: 'Price history retrieved',
    });
  } catch (error) {
    logger.error('Error fetching price history:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/pricing/trend/:productId
 * Get price trend analysis
 * Query params: days (default 30)
 */
router.get('/trend/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { days = 30 } = req.query;

    const result = await PriceMonitoringService.calculatePriceTrend(
      productId,
      days
    );

    res.json({
      success: true,
      data: result,
      message: 'Price trend calculated',
    });
  } catch (error) {
    logger.error('Error calculating price trend:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/pricing/watchlist
 * Add product to user's price watchlist
 */
router.post('/watchlist', auth, async (req, res) => {
  try {
    const { userId } = req;
    const { productId, targetPrice } = req.body;

    if (!productId || !targetPrice) {
      return res.status(400).json({
        success: false,
        message: 'productId and targetPrice are required',
      });
    }

    const result = await PriceMonitoringService.addToWatchList(
      userId,
      productId,
      targetPrice
    );

    res.json({
      success: true,
      data: result,
      message: 'Product added to watchlist',
    });
  } catch (error) {
    logger.error('Error adding to watchlist:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/ecommerce/pricing/watchlist/:productId
 * Remove product from watchlist
 */
router.delete('/watchlist/:productId', auth, async (req, res) => {
  try {
    const { userId } = req;
    const { productId } = req.params;

    const result = await PriceMonitoringService.removeFromWatchList(
      userId,
      productId
    );

    res.json({
      success: true,
      data: result,
      message: 'Product removed from watchlist',
    });
  } catch (error) {
    logger.error('Error removing from watchlist:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/pricing/alerts
 * Get price drop alerts for user's watchlist
 */
router.get('/alerts', auth, async (req, res) => {
  try {
    const { userId } = req;

    const result = await PriceMonitoringService.getPriceDropAlerts(userId);

    res.json({
      success: true,
      data: result,
      message: 'Price alerts retrieved',
    });
  } catch (error) {
    logger.error('Error fetching price alerts:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/pricing/dynamic/:productId
 * Apply dynamic pricing to product (admin only)
 */
router.post('/dynamic/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await PriceMonitoringService.applyDynamicPricing(productId);

    res.json({
      success: true,
      data: result,
      message: 'Dynamic pricing applied',
    });
  } catch (error) {
    logger.error('Error applying dynamic pricing:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/pricing/competitor/:productId
 * Get competitor pricing for product
 */
router.get('/competitor/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await PriceMonitoringService.getCompetitorPricing(productId);

    res.json({
      success: true,
      data: result,
      message: 'Competitor pricing retrieved',
    });
  } catch (error) {
    logger.error('Error fetching competitor pricing:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/pricing/bands/:category
 * Get category price bands analysis
 */
router.get('/bands/:category', async (req, res) => {
  try {
    const { category } = req.params;

    const result = await PriceMonitoringService.getCategoryPriceBands(
      category
    );

    res.json({
      success: true,
      data: result,
      message: 'Category price bands retrieved',
    });
  } catch (error) {
    logger.error('Error fetching price bands:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
