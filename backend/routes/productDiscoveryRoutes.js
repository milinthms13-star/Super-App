/**
 * productDiscoveryRoutes.js
 * Phase 5C - Product discovery, search, filtering, and recommendations endpoints
 */

const express = require('express');
const router = express.Router();
const ProductDiscoveryService = require('../services/ProductDiscoveryService');
const ProductRecommendationService = require('../services/ProductRecommendationService');
const { verifyToken } = require('../middleware/auth');

// ============================================
// SEARCH ENDPOINTS
// ============================================

// GET /api/products/search - Search products with filters
router.get('/search', async (req, res) => {
  try {
    const {
      q = '',
      category = null,
      minPrice = 0,
      maxPrice = Infinity,
      rating = 0,
      inStock = false,
      discount = false,
      sortBy = 'relevance',
      page = 1,
      limit = 20,
    } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const result = await ProductDiscoveryService.searchProducts(q, {
      userId: req.user?.id,
      category,
      minPrice: parseInt(minPrice),
      maxPrice: parseInt(maxPrice),
      rating: parseInt(rating),
      inStock: inStock === 'true',
      discount: discount === 'true',
      sortBy,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/suggestions - Get search suggestions/autocomplete
router.get('/suggestions', async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await ProductDiscoveryService.getSearchSuggestions(q, parseInt(limit));
    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// FILTERING & SORTING
// ============================================

// GET /api/products/filters/:category - Get available filters for category
router.get('/filters/:category', async (req, res) => {
  try {
    const { category } = req.params;

    const filters = await ProductDiscoveryService.getCategoryFilters(category);
    res.json(filters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/trending - Get trending products
router.get('/trending', async (req, res) => {
  try {
    const { category = null, limit = 10 } = req.query;

    const products = await ProductDiscoveryService.getTrendingProducts(
      category,
      parseInt(limit)
    );
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/discounted - Get discounted products
router.get('/discounted', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const products = await ProductDiscoveryService.getDiscountedProducts(parseInt(limit));
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/new - Get new products
router.get('/new', async (req, res) => {
  try {
    const { category = null, limit = 10 } = req.query;

    const products = await ProductDiscoveryService.getNewProducts(category, parseInt(limit));
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// PRODUCT DETAILS & RELATED
// ============================================

// GET /api/products/:productId - Get product details
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await ProductDiscoveryService.getProductDetails(productId, req.user?.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(404).json({ error: 'Product not found' });
  }
});

// GET /api/products/:productId/similar - Get similar products
router.get('/:productId/similar', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 5 } = req.query;

    const similar = await ProductDiscoveryService.getSimilarProducts(productId, parseInt(limit));
    res.json({ success: true, data: similar });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ============================================
// BROWSING & CATEGORIES
// ============================================

// GET /api/products/browse/categories - Get all categories
router.get('/browse/categories', async (req, res) => {
  try {
    const categories = await ProductDiscoveryService.getAllCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/browse/categories/:category/subcategories - Get subcategories
router.get('/browse/categories/:category/subcategories', async (req, res) => {
  try {
    const { category } = req.params;

    const subcategories = await ProductDiscoveryService.getSubcategories(category);
    res.json({ success: true, data: subcategories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/browse/category/:category - Browse by category
router.get('/browse/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await ProductDiscoveryService.browseByCategory(
      category,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// RECOMMENDATIONS (Protected)
// ============================================

// GET /api/products/recommendations/personalized - Get personalized recommendations
router.get('/recommendations/personalized', verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recommendations = await ProductRecommendationService.getPersonalizedRecommendations(
      req.user.id,
      parseInt(limit)
    );
    res.json({ success: true, data: recommendations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/recommendations/recently-viewed - Get recently viewed recommendations
router.get('/recommendations/recently-viewed', verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recommendations = await ProductRecommendationService.getRecommendationsByRecentlyViewed(
      req.user.id,
      parseInt(limit)
    );
    res.json({ success: true, data: recommendations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/recommendations/collaborative - Get collaborative recommendations
router.get('/recommendations/collaborative', verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recommendations = await ProductRecommendationService.getCollaborativeRecommendations(
      req.user.id,
      parseInt(limit)
    );
    res.json({ success: true, data: recommendations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/recommendations/popular - Get popular products
router.get('/recommendations/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const products = await ProductRecommendationService.getPopularProducts(parseInt(limit));
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// HISTORY & VIEWS
// ============================================

// POST /api/products/:productId/view - Log product view
router.post('/:productId/view', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;

    await ProductDiscoveryService.logProductView(req.user.id, productId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/history/recently-viewed - Get recently viewed products
router.get('/history/recently-viewed', verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const products = await ProductDiscoveryService.getRecentlyViewed(
      req.user.id,
      parseInt(limit)
    );
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/history/search - Get search history
router.get('/history/search', verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const history = await ProductDiscoveryService.getSearchHistory(req.user.id, parseInt(limit));
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
