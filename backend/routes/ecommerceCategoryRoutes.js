/**
 * Ecommerce Category Routes
 * API endpoints for category management
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const CategoryManagementService = require('../services/CategoryManagementService');
const logger = require('../utils/logger');

/**
 * Helper to check if user is admin
 */
const isAdmin = (req) => {
  const role = req.user?.role || req.user?.registrationType || '';
  return role.toLowerCase() === 'admin';
};

/**
 * GET /api/ecommerce/categories
 * Get all top-level categories
 */
router.get('/', async (req, res) => {
  try {
    const categories = await CategoryManagementService.getTopLevelCategories();

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/categories/tree
 * Get category tree (hierarchical structure)
 */
router.get('/tree', async (req, res) => {
  try {
    const tree = await CategoryManagementService.getCategoryTree();

    res.json({
      success: true,
      tree,
    });
  } catch (error) {
    logger.error('Error fetching category tree:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category tree',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/categories/featured
 * Get featured categories
 */
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const categories = await CategoryManagementService.getFeaturedCategories(limit);

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    logger.error('Error fetching featured categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured categories',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/categories/search
 * Search categories
 */
router.get('/search', async (req, res) => {
  try {
    const { q, level, isFeatured, parentCategory, limit } = req.query;

    const categories = await CategoryManagementService.searchCategories(q, {
      level,
      isFeatured,
      parentCategory,
      limit,
    });

    res.json({
      success: true,
      categories,
      count: categories.length,
    });
  } catch (error) {
    logger.error('Error searching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search categories',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/categories/:categoryId
 * Get category details by ID
 */
router.get('/:categoryId', async (req, res) => {
  try {
    const category = await CategoryManagementService.getCategoryById(req.params.categoryId);

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    logger.error('Error fetching category:', error);
    res.status(404).json({
      success: false,
      message: 'Category not found',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/categories/slug/:slug
 * Get category by slug
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const category = await CategoryManagementService.getCategoryBySlug(req.params.slug);

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    logger.error('Error fetching category by slug:', error);
    res.status(404).json({
      success: false,
      message: 'Category not found',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/categories/:categoryId/subcategories
 * Get subcategories of a parent category
 */
router.get('/:categoryId/subcategories', async (req, res) => {
  try {
    const subcategories = await CategoryManagementService.getSubcategories(req.params.categoryId);

    res.json({
      success: true,
      subcategories,
      count: subcategories.length,
    });
  } catch (error) {
    logger.error('Error fetching subcategories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcategories',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/categories/:categoryId/stats
 * Get category statistics
 */
router.get('/:categoryId/stats', async (req, res) => {
  try {
    const stats = await CategoryManagementService.getCategoryStats(req.params.categoryId);

    res.json({
      success: true,
      ...stats,
    });
  } catch (error) {
    logger.error('Error fetching category stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category statistics',
      error: error.message,
    });
  }
});

/**
 * GET /api/ecommerce/categories/:categoryId/breadcrumb
 * Get breadcrumb trail for category
 */
router.get('/:categoryId/breadcrumb', async (req, res) => {
  try {
    const breadcrumb = await CategoryManagementService.getCategoryBreadcrumb(req.params.categoryId);

    res.json({
      success: true,
      breadcrumb,
    });
  } catch (error) {
    logger.error('Error fetching category breadcrumb:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch breadcrumb',
      error: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/categories (Admin only)
 * Create a new category
 */
router.post('/', authenticate, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const category = await CategoryManagementService.createCategory(req.body);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create category',
      error: error.message,
    });
  }
});

/**
 * PUT /api/ecommerce/categories/:categoryId (Admin only)
 * Update category
 */
router.put('/:categoryId', authenticate, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const category = await CategoryManagementService.updateCategory(
      req.params.categoryId,
      req.body
    );

    res.json({
      success: true,
      message: 'Category updated successfully',
      category,
    });
  } catch (error) {
    logger.error('Error updating category:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update category',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/ecommerce/categories/:categoryId (Admin only)
 * Delete category
 */
router.delete('/:categoryId', authenticate, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const forceDelete = req.query.force === 'true';
    const result = await CategoryManagementService.deleteCategory(
      req.params.categoryId,
      forceDelete
    );

    res.json({
      success: true,
      message: result.deleted ? 'Category deleted successfully' : 'Category deactivated',
      ...result,
    });
  } catch (error) {
    logger.error('Error deleting category:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/categories/:categoryId/toggle-featured (Admin only)
 * Toggle featured status
 */
router.post('/:categoryId/toggle-featured', authenticate, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const category = await CategoryManagementService.toggleFeatured(req.params.categoryId);

    res.json({
      success: true,
      message: `Category ${category.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      category,
    });
  } catch (error) {
    logger.error('Error toggling featured status:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to toggle featured status',
      error: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/categories/reorder (Admin only)
 * Reorder categories
 */
router.post('/reorder', authenticate, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { categoryOrders } = req.body;

    if (!Array.isArray(categoryOrders)) {
      return res.status(400).json({
        success: false,
        message: 'categoryOrders must be an array',
      });
    }

    const result = await CategoryManagementService.reorderCategories(categoryOrders);

    res.json({
      success: true,
      message: 'Categories reordered successfully',
      ...result,
    });
  } catch (error) {
    logger.error('Error reordering categories:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to reorder categories',
      error: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/categories/:categoryId/attributes (Admin only)
 * Add attribute to category
 */
router.post('/:categoryId/attributes', authenticate, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const category = await CategoryManagementService.addAttribute(
      req.params.categoryId,
      req.body
    );

    res.json({
      success: true,
      message: 'Attribute added successfully',
      category,
    });
  } catch (error) {
    logger.error('Error adding attribute:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to add attribute',
      error: error.message,
    });
  }
});

/**
 * PUT /api/ecommerce/categories/:categoryId/attributes/:attributeName (Admin only)
 * Update category attribute
 */
router.put('/:categoryId/attributes/:attributeName', authenticate, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const category = await CategoryManagementService.updateAttribute(
      req.params.categoryId,
      req.params.attributeName,
      req.body
    );

    res.json({
      success: true,
      message: 'Attribute updated successfully',
      category,
    });
  } catch (error) {
    logger.error('Error updating attribute:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update attribute',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/ecommerce/categories/:categoryId/attributes/:attributeName (Admin only)
 * Remove attribute from category
 */
router.delete('/:categoryId/attributes/:attributeName', authenticate, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const category = await CategoryManagementService.removeAttribute(
      req.params.categoryId,
      req.params.attributeName
    );

    res.json({
      success: true,
      message: 'Attribute removed successfully',
      category,
    });
  } catch (error) {
    logger.error('Error removing attribute:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to remove attribute',
      error: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/categories/:categoryId/commission-override (Admin only)
 * Set commission override for category
 */
router.post('/:categoryId/commission-override', authenticate, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { rate, minimumAmount } = req.body;

    if (!rate || rate < 0 || rate > 100) {
      return res.status(400).json({
        success: false,
        message: 'Valid commission rate (0-100) is required',
      });
    }

    const category = await CategoryManagementService.setCommissionOverride(
      req.params.categoryId,
      rate,
      minimumAmount
    );

    res.json({
      success: true,
      message: 'Commission override set successfully',
      category,
    });
  } catch (error) {
    logger.error('Error setting commission override:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to set commission override',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/ecommerce/categories/:categoryId/commission-override (Admin only)
 * Remove commission override
 */
router.delete('/:categoryId/commission-override', authenticate, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const category = await CategoryManagementService.removeCommissionOverride(
      req.params.categoryId
    );

    res.json({
      success: true,
      message: 'Commission override removed successfully',
      category,
    });
  } catch (error) {
    logger.error('Error removing commission override:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to remove commission override',
      error: error.message,
    });
  }
});

/**
 * POST /api/ecommerce/categories/update-counts (Admin only)
 * Update product counts for all categories (maintenance)
 */
router.post('/update-counts', authenticate, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const result = await CategoryManagementService.updateCategoryProductCounts();

    res.json({
      success: true,
      message: 'Category product counts updated successfully',
      ...result,
    });
  } catch (error) {
    logger.error('Error updating category product counts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category product counts',
      error: error.message,
    });
  }
});

module.exports = router;
