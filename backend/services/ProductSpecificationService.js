/**
 * ProductSpecificationService.js
 * Handles product specifications, comparisons, and detailed attributes
 */

const Product = require('../models/Product');
const logger = require('../config/logger');

class ProductSpecificationService {
  /**
   * Create specification schema for a product category
   */
  static async createCategorySpecificationSchema(category, specifications) {
    try {
      const SpecificationSchema = require('../models/SpecificationSchema');

      const schema = new SpecificationSchema({
        category,
        specifications,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await schema.save();
      logger.info(`Created specification schema for category: ${category}`);
      return schema;
    } catch (error) {
      logger.error('Error creating specification schema:', error);
      throw error;
    }
  }

  /**
   * Update product specifications
   */
  static async updateProductSpecifications(productId, specifications) {
    try {
      const product = await Product.findByIdAndUpdate(
        productId,
        {
          $set: {
            specifications: specifications,
            specsUpdatedAt: new Date(),
          },
        },
        { new: true }
      );

      logger.info(`Updated specifications for product ${productId}`);
      return product;
    } catch (error) {
      logger.error('Error updating product specifications:', error);
      throw error;
    }
  }

  /**
   * Get detailed product specifications
   */
  static async getProductSpecifications(productId) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      return {
        productId: product._id,
        name: product.name,
        category: product.category,
        specifications: product.specifications || {},
        warranty: product.warranty || null,
        return_period: product.returnPeriod || null,
        brand: product.brand,
      };
    } catch (error) {
      logger.error('Error getting product specifications:', error);
      throw error;
    }
  }

  /**
   * Compare multiple products
   */
  static async compareProducts(productIds) {
    try {
      const products = await Product.find({ _id: { $in: productIds } });

      if (products.length === 0) {
        throw new Error('No products found');
      }

      // Group specifications by keys for easy comparison
      const specKeys = new Set();
      products.forEach(p => {
        if (p.specifications) {
          Object.keys(p.specifications).forEach(key => specKeys.add(key));
        }
      });

      const comparison = {
        products: products.map(p => ({
          id: p._id,
          name: p.name,
          price: p.price,
          mrp: p.mrp,
          discountPercentage: p.discountPercentage,
          rating: p.rating,
          image: p.image,
          stock: p.stock,
          brand: p.brand,
          specifications: p.specifications || {},
        })),
        specificationKeys: Array.from(specKeys),
        comparisonTable: this._buildComparisonTable(products, specKeys),
      };

      return comparison;
    } catch (error) {
      logger.error('Error comparing products:', error);
      throw error;
    }
  }

  /**
   * Build comparison table for display
   */
  static _buildComparisonTable(products, specKeys) {
    const table = [];

    specKeys.forEach(key => {
      const row = {
        specKey: key,
        values: products.map(p => ({
          productId: p._id,
          productName: p.name,
          value: p.specifications?.[key] || 'N/A',
        })),
      };
      table.push(row);
    });

    return table;
  }

  /**
   * Get products with similar specifications
   */
  static async getSimilarProducts(productId, limit = 5) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Find products with same category and similar price range
      const similar = await Product.find({
        _id: { $ne: productId },
        category: product.category,
        price: {
          $gte: product.price * 0.7,
          $lte: product.price * 1.3,
        },
      })
        .limit(limit)
        .select('_id name price mrp rating image brand discountPercentage');

      return similar;
    } catch (error) {
      logger.error('Error getting similar products:', error);
      throw error;
    }
  }

  /**
   * Get warranty information for product
   */
  static async getProductWarranty(productId) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      return {
        productId: product._id,
        productName: product.name,
        warrantyDetails: product.warranty || {
          type: 'No warranty',
          period: null,
          coverage: [],
        },
        returnPolicy: product.returnPolicy || {
          returnable: false,
          returnPeriodDays: 0,
        },
      };
    } catch (error) {
      logger.error('Error getting product warranty:', error);
      throw error;
    }
  }

  /**
   * Search products by specifications
   */
  static async searchBySpecifications(category, specFilters) {
    try {
      const matchConditions = { category };

      // Build MongoDB query from spec filters
      Object.keys(specFilters).forEach(key => {
        const value = specFilters[key];
        matchConditions[`specifications.${key}`] = value;
      });

      const products = await Product.find(matchConditions)
        .select('_id name price rating image brand specifications');

      return products;
    } catch (error) {
      logger.error('Error searching by specifications:', error);
      throw error;
    }
  }

  /**
   * Get specification values for a category (for filter dropdowns)
   */
  static async getCategorySpecificationValues(category, specKey) {
    try {
      const values = await Product.distinct(`specifications.${specKey}`, {
        category,
      });

      return values.filter(v => v !== null && v !== undefined);
    } catch (error) {
      logger.error('Error getting specification values:', error);
      throw error;
    }
  }

  /**
   * Bulk update product specifications
   */
  static async bulkUpdateSpecifications(productIds, specifications) {
    try {
      const result = await Product.updateMany(
        { _id: { $in: productIds } },
        {
          $set: {
            specifications: specifications,
            specsUpdatedAt: new Date(),
          },
        }
      );

      logger.info(`Updated specifications for ${result.modifiedCount} products`);
      return result;
    } catch (error) {
      logger.error('Error bulk updating specifications:', error);
      throw error;
    }
  }
}

module.exports = ProductSpecificationService;
