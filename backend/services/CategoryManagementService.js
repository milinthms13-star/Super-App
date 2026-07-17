/**
 * Category Management Service
 * Handles category CRUD operations and hierarchy management
 */

const EcommerceCategory = require('../models/EcommerceCategory');
const Product = require('../models/Product');
const logger = require('../utils/logger');

class CategoryManagementService {
  /**
   * Create a new category
   */
  static async createCategory(categoryData) {
    try {
      const category = new EcommerceCategory(categoryData);
      await category.save();

      logger.info(`Category created: ${category.name} (${category.slug})`);
      return category;
    } catch (error) {
      logger.error('Error creating category:', error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  static async getCategoryById(categoryId) {
    try {
      const category = await EcommerceCategory.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }
      return category;
    } catch (error) {
      logger.error('Error fetching category:', error);
      throw error;
    }
  }

  /**
   * Get category by slug
   */
  static async getCategoryBySlug(slug) {
    try {
      const category = await EcommerceCategory.getCategoryBySlug(slug);
      if (!category) {
        throw new Error('Category not found');
      }
      return category;
    } catch (error) {
      logger.error('Error fetching category by slug:', error);
      throw error;
    }
  }

  /**
   * Get all top-level categories
   */
  static async getTopLevelCategories() {
    try {
      const categories = await EcommerceCategory.getTopLevelCategories();
      return categories;
    } catch (error) {
      logger.error('Error fetching top-level categories:', error);
      throw error;
    }
  }

  /**
   * Get featured categories
   */
  static async getFeaturedCategories(limit = 6) {
    try {
      const categories = await EcommerceCategory.getFeaturedCategories(limit);
      return categories;
    } catch (error) {
      logger.error('Error fetching featured categories:', error);
      throw error;
    }
  }

  /**
   * Get category tree (hierarchical structure)
   */
  static async getCategoryTree() {
    try {
      const tree = await EcommerceCategory.buildCategoryTree();
      return tree;
    } catch (error) {
      logger.error('Error building category tree:', error);
      throw error;
    }
  }

  /**
   * Get subcategories for a parent category
   */
  static async getSubcategories(parentId) {
    try {
      const parent = await EcommerceCategory.findById(parentId);
      if (!parent) {
        throw new Error('Parent category not found');
      }

      const subcategories = await parent.getChildren();
      return subcategories;
    } catch (error) {
      logger.error('Error fetching subcategories:', error);
      throw error;
    }
  }

  /**
   * Update category
   */
  static async updateCategory(categoryId, updates) {
    try {
      const category = await EcommerceCategory.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      // Update fields
      Object.keys(updates).forEach((key) => {
        if (updates[key] !== undefined && key !== '_id') {
          category[key] = updates[key];
        }
      });

      await category.save();

      logger.info(`Category updated: ${category.name} (${category.slug})`);
      return category;
    } catch (error) {
      logger.error('Error updating category:', error);
      throw error;
    }
  }

  /**
   * Delete category (soft delete by marking inactive)
   */
  static async deleteCategory(categoryId, forceDelete = false) {
    try {
      const category = await EcommerceCategory.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      // Check if category has products
      const productCount = await Product.countDocuments({ categoryId });
      if (productCount > 0 && !forceDelete) {
        throw new Error(
          `Cannot delete category with ${productCount} products. Please reassign products first or use force delete.`
        );
      }

      // Check if category has subcategories
      const hasChildren = await category.hasChildren();
      if (hasChildren && !forceDelete) {
        throw new Error(
          'Cannot delete category with subcategories. Please delete subcategories first or use force delete.'
        );
      }

      if (forceDelete) {
        await EcommerceCategory.findByIdAndDelete(categoryId);
        logger.info(`Category force deleted: ${category.name}`);
      } else {
        category.isActive = false;
        await category.save();
        logger.info(`Category deactivated: ${category.name}`);
      }

      return { success: true, deleted: forceDelete };
    } catch (error) {
      logger.error('Error deleting category:', error);
      throw error;
    }
  }

  /**
   * Reorder categories (update display order)
   */
  static async reorderCategories(categoryOrders) {
    try {
      const updates = categoryOrders.map(({ categoryId, displayOrder }) =>
        EcommerceCategory.findByIdAndUpdate(categoryId, { displayOrder })
      );

      await Promise.all(updates);

      logger.info(`Reordered ${categoryOrders.length} categories`);
      return { success: true, count: categoryOrders.length };
    } catch (error) {
      logger.error('Error reordering categories:', error);
      throw error;
    }
  }

  /**
   * Toggle featured status
   */
  static async toggleFeatured(categoryId) {
    try {
      const category = await EcommerceCategory.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      category.isFeatured = !category.isFeatured;
      await category.save();

      logger.info(`Category ${category.isFeatured ? 'featured' : 'unfeatured'}: ${category.name}`);
      return category;
    } catch (error) {
      logger.error('Error toggling featured status:', error);
      throw error;
    }
  }

  /**
   * Add attribute to category
   */
  static async addAttribute(categoryId, attributeData) {
    try {
      const category = await EcommerceCategory.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      // Check if attribute already exists
      const existingAttr = category.attributes.find((attr) => attr.name === attributeData.name);
      if (existingAttr) {
        throw new Error('Attribute with this name already exists');
      }

      category.attributes.push(attributeData);
      await category.save();

      logger.info(`Attribute added to category ${category.name}: ${attributeData.name}`);
      return category;
    } catch (error) {
      logger.error('Error adding attribute:', error);
      throw error;
    }
  }

  /**
   * Update category attribute
   */
  static async updateAttribute(categoryId, attributeName, updates) {
    try {
      const category = await EcommerceCategory.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      const attribute = category.attributes.find((attr) => attr.name === attributeName);
      if (!attribute) {
        throw new Error('Attribute not found');
      }

      Object.keys(updates).forEach((key) => {
        if (updates[key] !== undefined) {
          attribute[key] = updates[key];
        }
      });

      await category.save();

      logger.info(`Attribute updated in category ${category.name}: ${attributeName}`);
      return category;
    } catch (error) {
      logger.error('Error updating attribute:', error);
      throw error;
    }
  }

  /**
   * Remove attribute from category
   */
  static async removeAttribute(categoryId, attributeName) {
    try {
      const category = await EcommerceCategory.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      category.attributes = category.attributes.filter((attr) => attr.name !== attributeName);
      await category.save();

      logger.info(`Attribute removed from category ${category.name}: ${attributeName}`);
      return category;
    } catch (error) {
      logger.error('Error removing attribute:', error);
      throw error;
    }
  }

  /**
   * Set commission override for category
   */
  static async setCommissionOverride(categoryId, rate, minimumAmount = null) {
    try {
      const category = await EcommerceCategory.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      category.commissionOverride = {
        enabled: true,
        rate,
        minimumAmount,
      };

      await category.save();

      logger.info(`Commission override set for category ${category.name}: ${rate}%`);
      return category;
    } catch (error) {
      logger.error('Error setting commission override:', error);
      throw error;
    }
  }

  /**
   * Remove commission override
   */
  static async removeCommissionOverride(categoryId) {
    try {
      const category = await EcommerceCategory.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      category.commissionOverride = {
        enabled: false,
        rate: null,
        minimumAmount: null,
      };

      await category.save();

      logger.info(`Commission override removed for category ${category.name}`);
      return category;
    } catch (error) {
      logger.error('Error removing commission override:', error);
      throw error;
    }
  }

  /**
   * Get category statistics
   */
  static async getCategoryStats(categoryId) {
    try {
      const category = await EcommerceCategory.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      // Get product counts
      const totalProducts = await Product.countDocuments({ categoryId });
      const activeProducts = await Product.countDocuments({ categoryId, isActive: true });
      const approvedProducts = await Product.countDocuments({
        categoryId,
        approvalStatus: 'approved',
      });

      // Get subcategory count
      const subcategories = await EcommerceCategory.countDocuments({
        parentCategory: categoryId,
        isActive: true,
      });

      // Calculate average price
      const priceAgg = await Product.aggregate([
        { $match: { categoryId: category._id, isActive: true } },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
          },
        },
      ]);

      const priceStats = priceAgg[0] || { avgPrice: 0, minPrice: 0, maxPrice: 0 };

      return {
        category: {
          id: category._id,
          name: category.name,
          slug: category.slug,
          level: category.level,
        },
        products: {
          total: totalProducts,
          active: activeProducts,
          approved: approvedProducts,
          pending: totalProducts - approvedProducts,
        },
        subcategories,
        pricing: {
          average: priceStats.avgPrice,
          min: priceStats.minPrice,
          max: priceStats.maxPrice,
        },
        updated: category.stats,
      };
    } catch (error) {
      logger.error('Error getting category stats:', error);
      throw error;
    }
  }

  /**
   * Search categories
   */
  static async searchCategories(query, filters = {}) {
    try {
      const searchQuery = {
        isActive: true,
      };

      if (query) {
        searchQuery.$or = [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { slug: { $regex: query, $options: 'i' } },
        ];
      }

      if (filters.level !== undefined) {
        searchQuery.level = parseInt(filters.level);
      }

      if (filters.isFeatured !== undefined) {
        searchQuery.isFeatured = filters.isFeatured === 'true';
      }

      if (filters.parentCategory) {
        searchQuery.parentCategory = filters.parentCategory;
      }

      const categories = await EcommerceCategory.find(searchQuery)
        .sort({ displayOrder: 1, name: 1 })
        .limit(parseInt(filters.limit) || 50);

      return categories;
    } catch (error) {
      logger.error('Error searching categories:', error);
      throw error;
    }
  }

  /**
   * Update category product counts (maintenance function)
   */
  static async updateCategoryProductCounts() {
    try {
      const categories = await EcommerceCategory.find({ isActive: true });

      for (const category of categories) {
        const totalProducts = await Product.countDocuments({ categoryId: category._id });
        const activeProducts = await Product.countDocuments({
          categoryId: category._id,
          isActive: true,
        });

        category.stats.productCount = totalProducts;
        category.stats.activeProductCount = activeProducts;
        await category.save();
      }

      logger.info(`Updated product counts for ${categories.length} categories`);
      return { success: true, updated: categories.length };
    } catch (error) {
      logger.error('Error updating category product counts:', error);
      throw error;
    }
  }

  /**
   * Get breadcrumb trail for a category
   */
  static async getCategoryBreadcrumb(categoryId) {
    try {
      const category = await EcommerceCategory.findById(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      const breadcrumb = [];
      let current = category;

      while (current) {
        breadcrumb.unshift({
          id: current._id,
          name: current.name,
          slug: current.slug,
          level: current.level,
        });

        if (current.parentCategory) {
          current = await EcommerceCategory.findById(current.parentCategory);
        } else {
          current = null;
        }
      }

      return breadcrumb;
    } catch (error) {
      logger.error('Error getting category breadcrumb:', error);
      throw error;
    }
  }
}

module.exports = CategoryManagementService;
