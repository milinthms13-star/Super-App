const express = require('express');
const router = express.Router();
const MarketplaceService = require('../services/MarketplaceService');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

/**
 * @route   GET /api/marketplace/products
 * @desc    Get marketplace products with filters
 * @access  Public
 */
router.get('/products', async (req, res) => {
  try {
    const result = await MarketplaceService.getMarketplaceProducts(req.query);
    res.json(result);
  } catch (error) {
    console.error('Get marketplace products error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/marketplace/products/:productId
 * @desc    Get product details
 * @access  Public
 */
router.get('/products/:productId', async (req, res) => {
  try {
    const result = await MarketplaceService.getProductDetails(req.params.productId);
    
    // Track recently viewed if user is authenticated
    if (req.user) {
      await MarketplaceService.addToRecentlyViewed(req.user.id, req.params.productId);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Get product details error:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/marketplace/search
 * @desc    Search products with autocomplete
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit } = req.query;
    const results = await MarketplaceService.searchProducts(q, limit);
    res.json({ success: true, results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/marketplace/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get('/featured', async (req, res) => {
  try {
    const { limit } = req.query;
    const products = await MarketplaceService.getFeaturedProducts(limit);
    res.json({ success: true, products });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/marketplace/new-arrivals
 * @desc    Get new arrival products
 * @access  Public
 */
router.get('/new-arrivals', async (req, res) => {
  try {
    const { limit } = req.query;
    const products = await MarketplaceService.getNewArrivals(limit);
    res.json({ success: true, products });
  } catch (error) {
    console.error('Get new arrivals error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/marketplace/trending
 * @desc    Get trending products
 * @access  Public
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit } = req.query;
    const products = await MarketplaceService.getTrendingProducts(limit);
    res.json({ success: true, products });
  } catch (error) {
    console.error('Get trending products error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/marketplace/category/:categoryId
 * @desc    Get products by category
 * @access  Public
 */
router.get('/category/:categoryId', async (req, res) => {
  try {
    const result = await MarketplaceService.getProductsByCategory(
      req.params.categoryId,
      req.query
    );
    res.json(result);
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/marketplace/filters
 * @desc    Get filter options
 * @access  Public
 */
router.get('/filters', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const filters = await MarketplaceService.getFilterOptions(categoryId);
    res.json({ success: true, filters });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/marketplace/stats
 * @desc    Get marketplace statistics
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await MarketplaceService.getMarketplaceStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * WISHLIST ROUTES
 */

/**
 * @route   POST /api/marketplace/wishlist/add
 * @desc    Add product to wishlist
 * @access  Private
 */
router.post('/wishlist/add', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.body;
    const result = await MarketplaceService.addToWishlist(req.user.id, productId);
    res.json(result);
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/marketplace/wishlist/remove
 * @desc    Remove product from wishlist
 * @access  Private
 */
router.post('/wishlist/remove', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.body;
    const result = await MarketplaceService.removeFromWishlist(req.user.id, productId);
    res.json(result);
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/marketplace/wishlist
 * @desc    Get user's wishlist
 * @access  Private
 */
router.get('/wishlist', authenticateToken, async (req, res) => {
  try {
    const products = await MarketplaceService.getWishlist(req.user.id);
    res.json({ success: true, products });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * RECENTLY VIEWED ROUTES
 */

/**
 * @route   GET /api/marketplace/recently-viewed
 * @desc    Get recently viewed products
 * @access  Private
 */
router.get('/recently-viewed', authenticateToken, async (req, res) => {
  try {
    const products = await MarketplaceService.getRecentlyViewed(req.user.id);
    res.json({ success: true, products });
  } catch (error) {
    console.error('Get recently viewed error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * RECOMMENDATIONS ROUTES
 */

/**
 * @route   GET /api/marketplace/recommendations
 * @desc    Get product recommendations
 * @access  Private/Public
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { limit } = req.query;
    const userId = req.user?.id;
    const products = await MarketplaceService.getRecommendations(userId, limit);
    res.json({ success: true, products });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
