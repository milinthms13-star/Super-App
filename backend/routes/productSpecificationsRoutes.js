/**
 * productSpecificationsRoutes.js
 * API endpoints for product specifications and comparisons
 */

const express = require('express');
const router = express.Router();
const ProductSpecificationService = require('../services/ProductSpecificationService');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');
const logger = require('../config/logger');

/**
 * GET /api/product-specs/:productId
 * Get product specifications
 */
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const specs = await ProductSpecificationService.getProductSpecifications(
      productId
    );

    res.json({
      success: true,
      data: specs,
    });
  } catch (error) {
    logger.error('Get product specifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product specifications',
      error: error.message,
    });
  }
});

/**
 * POST /api/product-specs/:productId
 * Update product specifications (Admin only)
 */
router.post('/:productId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { specifications } = req.body;

    const updatedProduct = await ProductSpecificationService.updateProductSpecifications(
      productId,
      specifications
    );

    res.json({
      success: true,
      message: 'Product specifications updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    logger.error('Update product specifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product specifications',
      error: error.message,
    });
  }
});

/**
 * POST /api/product-specs/compare
 * Compare multiple products
 */
router.post('/compare', async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 2 product IDs for comparison',
      });
    }

    const comparison = await ProductSpecificationService.compareProducts(
      productIds
    );

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    logger.error('Compare products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare products',
      error: error.message,
    });
  }
});

/**
 * GET /api/product-specs/:productId/similar
 * Get similar products
 */
router.get('/:productId/similar', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 5 } = req.query;

    const similar = await ProductSpecificationService.getSimilarProducts(
      productId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: similar,
    });
  } catch (error) {
    logger.error('Get similar products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get similar products',
      error: error.message,
    });
  }
});

/**
 * GET /api/product-specs/:productId/warranty
 * Get warranty information
 */
router.get('/:productId/warranty', async (req, res) => {
  try {
    const { productId } = req.params;
    const warranty = await ProductSpecificationService.getProductWarranty(
      productId
    );

    res.json({
      success: true,
      data: warranty,
    });
  } catch (error) {
    logger.error('Get product warranty error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product warranty',
      error: error.message,
    });
  }
});

/**
 * GET /api/product-specs/category/:category/spec-values
 * Get specification values for category
 */
router.get('/category/:category/spec-values', async (req, res) => {
  try {
    const { category } = req.params;
    const { specKey } = req.query;

    if (!specKey) {
      return res.status(400).json({
        success: false,
        message: 'specKey query parameter is required',
      });
    }

    const values = await ProductSpecificationService.getCategorySpecificationValues(
      category,
      specKey
    );

    res.json({
      success: true,
      data: values,
    });
  } catch (error) {
    logger.error('Get specification values error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get specification values',
      error: error.message,
    });
  }
});

/**
 * POST /api/product-specs/search
 * Search products by specifications
 */
router.post('/search', async (req, res) => {
  try {
    const { category, specFilters } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required',
      });
    }

    const products = await ProductSpecificationService.searchBySpecifications(
      category,
      specFilters
    );

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    logger.error('Search by specifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search by specifications',
      error: error.message,
    });
  }
});

module.exports = router;
