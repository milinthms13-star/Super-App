/**
 * performanceOptimizationRoutes.js
 * Routes for caching, performance monitoring, CDN
 */

const express = require('express');
const router = express.Router();
const PerformanceOptimizationService = require('../services/PerformanceOptimizationService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Cache management
router.post('/cache/invalidate/:key', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await PerformanceOptimizationService.invalidateCache(
      req.params.key
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/cache/warm', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await PerformanceOptimizationService.warmCache();
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/cache/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await PerformanceOptimizationService.getCacheStats();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Performance monitoring
router.get('/metrics', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { period = '1h' } = req.query;
    const result = await PerformanceOptimizationService.getPerformanceMetrics(
      period
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Query optimization
router.get('/query-optimization', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await PerformanceOptimizationService.optimizeQueries();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// CDN endpoints
router.post('/cdn/enable', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { assetPath } = req.body;
    const result = await PerformanceOptimizationService.enableCDN(assetPath);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Image optimization
router.post('/images/optimize', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { imagePath, targetSize = 'medium' } = req.body;
    const result = await PerformanceOptimizationService.optimizeImage(
      imagePath,
      targetSize
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Batch operations
router.post('/batch/update-products', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { productIds, updateData } = req.body;
    const result = await PerformanceOptimizationService.batchUpdateProducts(
      productIds,
      updateData
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Lazy loading
router.get('/products/lazy-load', async (req, res) => {
  try {
    const { skip = 0, limit = 20 } = req.query;
    const result = await PerformanceOptimizationService.lazyLoadProducts(
      skip,
      limit
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
