/**
 * AdvancedFilterService.js
 * Handles advanced product filtering with multi-criteria aggregation
 */

const Product = require('../models/Product');
const logger = require('../config/logger');

class AdvancedFilterService {
  /**
   * Build aggregation pipeline for filtered products
   */
  static buildFilterPipeline(filters = {}) {
    const pipeline = [];

    // Stage 1: Match filters
    const matchStage = {};

    // Price range filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      matchStage.price = {};
      if (filters.minPrice !== undefined) matchStage.price.$gte = filters.minPrice;
      if (filters.maxPrice !== undefined) matchStage.price.$lte = filters.maxPrice;
    }

    // Rating filter
    if (filters.minRating !== undefined) {
      matchStage.rating = { $gte: filters.minRating };
    }

    // Brand/Manufacturer filter
    if (filters.brands && filters.brands.length > 0) {
      matchStage.brand = { $in: filters.brands };
    }

    // Category filter
    if (filters.category) {
      matchStage.category = filters.category;
    }

    // Subcategory filter
    if (filters.subcategory) {
      matchStage.subcategory = filters.subcategory;
    }

    // Availability filter
    if (filters.inStock !== undefined) {
      if (filters.inStock) {
        matchStage.stock = { $gt: 0 };
      } else {
        matchStage.stock = { $lte: 0 };
      }
    }

    // Discount range filter
    if (filters.minDiscount !== undefined || filters.maxDiscount !== undefined) {
      matchStage.discountPercentage = {};
      if (filters.minDiscount !== undefined) matchStage.discountPercentage.$gte = filters.minDiscount;
      if (filters.maxDiscount !== undefined) matchStage.discountPercentage.$lte = filters.maxDiscount;
    }

    // Delivery time filter (in days)
    if (filters.maxDeliveryDays !== undefined) {
      matchStage.estimatedDeliveryDays = { $lte: filters.maxDeliveryDays };
    }

    // Free shipping filter
    if (filters.freeShipping !== undefined && filters.freeShipping) {
      matchStage.freeShipping = true;
    }

    // New product filter (last N days)
    if (filters.newProductDays !== undefined) {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - filters.newProductDays);
      matchStage.createdAt = { $gte: dateThreshold };
    }

    // Digital product filter
    if (filters.isDigital !== undefined) {
      matchStage.isDigital = filters.isDigital;
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    return pipeline;
  }

  /**
   * Get available filter aggregations/facets
   */
  static async getFilterAggregations(category = null, subcategory = null) {
    try {
      const matchStage = {};
      if (category) matchStage.category = category;
      if (subcategory) matchStage.subcategory = subcategory;

      const pipeline = [
        matchStage && Object.keys(matchStage).length > 0 ? { $match: matchStage } : null,
        {
          $facet: {
            priceRange: [
              { $group: { _id: null, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } },
            ],
            ratingOptions: [
              {
                $bucket: {
                  groupBy: '$rating',
                  boundaries: [0, 2, 3, 4, 4.5],
                  default: 'unrated',
                  output: { count: { $sum: 1 } },
                },
              },
            ],
            brands: [
              { $group: { _id: '$brand', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 50 },
            ],
            discountRanges: [
              {
                $bucket: {
                  groupBy: '$discountPercentage',
                  boundaries: [0, 10, 25, 50, 75, 100],
                  default: 'no-discount',
                  output: { count: { $sum: 1 } },
                },
              },
            ],
            deliveryTimeRanges: [
              {
                $bucket: {
                  groupBy: '$estimatedDeliveryDays',
                  boundaries: [1, 2, 3, 7, 14],
                  default: 'unknown',
                  output: { count: { $sum: 1 } },
                },
              },
            ],
            freeShippingCount: [
              { $match: { freeShipping: true } },
              { $count: 'count' },
            ],
            stockStatus: [
              {
                $group: {
                  _id: { $cond: [{ $gt: ['$stock', 0] }, 'in-stock', 'out-of-stock'] },
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ].filter(Boolean);

      const result = await Product.aggregate(pipeline);
      return result[0] || {};
    } catch (error) {
      logger.error('Error getting filter aggregations:', error);
      throw error;
    }
  }

  /**
   * Search products with advanced filters
   */
  static async searchWithFilters(searchQuery = '', filters = {}, options = {}) {
    try {
      const {
        page = 1,
        pageSize = 20,
        sortBy = 'relevance',
        sortOrder = -1,
      } = options;

      const pipeline = this.buildFilterPipeline(filters);

      // Search stage
      if (searchQuery) {
        pipeline.push({
          $match: {
            $or: [
              { name: { $regex: searchQuery, $options: 'i' } },
              { description: { $regex: searchQuery, $options: 'i' } },
              { category: { $regex: searchQuery, $options: 'i' } },
              { brand: { $regex: searchQuery, $options: 'i' } },
            ],
          },
        });
      }

      // Sorting
      const sortMap = {
        relevance: { score: { $meta: 'textScore' } },
        price_low: { price: 1 },
        price_high: { price: -1 },
        rating: { rating: -1 },
        newest: { createdAt: -1 },
        discount: { discountPercentage: -1 },
        popularity: { salesCount: -1 },
      };

      if (sortMap[sortBy]) {
        pipeline.push({ $sort: sortMap[sortBy] });
      }

      // Pagination
      pipeline.push(
        { $skip: (page - 1) * pageSize },
        { $limit: pageSize }
      );

      const products = await Product.aggregate(pipeline);

      // Get total count
      const countPipeline = this.buildFilterPipeline(filters);
      if (searchQuery) {
        countPipeline.push({
          $match: {
            $or: [
              { name: { $regex: searchQuery, $options: 'i' } },
              { description: { $regex: searchQuery, $options: 'i' } },
              { category: { $regex: searchQuery, $options: 'i' } },
              { brand: { $regex: searchQuery, $options: 'i' } },
            ],
          },
        });
      }
      countPipeline.push({ $count: 'total' });
      const countResult = await Product.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      return {
        products,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      logger.error('Error searching with filters:', error);
      throw error;
    }
  }

  /**
   * Get filter suggestions based on user behavior
   */
  static async getFilterSuggestions(userId) {
    try {
      // Get user's frequently searched categories
      const SearchHistory = require('../models/SearchHistory');
      const recentSearches = await SearchHistory.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10);

      // Get trending filters
      const suggestions = {
        categories: [],
        brands: [],
        priceRanges: [],
        discountRanges: [],
      };

      // Extract categories from searches
      if (recentSearches.length > 0) {
        suggestions.categories = [...new Set(recentSearches.map(s => s.category))];
      }

      // Get trending brands
      const pipeline = [
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ];
      const trendingBrands = await Product.aggregate(pipeline);
      suggestions.brands = trendingBrands.map(b => ({ name: b._id, count: b.count }));

      return suggestions;
    } catch (error) {
      logger.error('Error getting filter suggestions:', error);
      throw error;
    }
  }

  /**
   * Save user filter preferences
   */
  static async saveFilterPreferences(userId, filters) {
    try {
      const User = require('../models/User');
      await User.findByIdAndUpdate(
        userId,
        { $set: { 'preferences.savedFilters': filters } },
        { new: true }
      );
      logger.info(`Saved filter preferences for user ${userId}`);
    } catch (error) {
      logger.error('Error saving filter preferences:', error);
      throw error;
    }
  }

  /**
   * Get user's saved filters
   */
  static async getSavedFilters(userId) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);
      return user?.preferences?.savedFilters || [];
    } catch (error) {
      logger.error('Error getting saved filters:', error);
      throw error;
    }
  }
}

module.exports = AdvancedFilterService;
