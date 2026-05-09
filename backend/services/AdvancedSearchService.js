/**
 * AdvancedSearchService.js
 * Full-text search, filters, facets, auto-complete
 */

const logger = require('../config/logger');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

class AdvancedSearchService {
  /**
   * Full-text search across products
   */
  static async searchProducts(query, filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      let searchQuery = {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      };

      // Apply filters
      if (filters.minPrice) searchQuery.price = { $gte: filters.minPrice };
      if (filters.maxPrice) searchQuery.price = { ...searchQuery.price, $lte: filters.maxPrice };
      if (filters.category) searchQuery.category = filters.category;
      if (filters.vendor) searchQuery.vendorId = filters.vendor;
      if (filters.minRating) searchQuery.averageRating = { $gte: filters.minRating };
      if (filters.inStock !== undefined) searchQuery.stock = { $gt: filters.inStock ? 0 : -1 };

      const [products, total] = await Promise.all([
        Product.find(searchQuery)
          .skip(skip)
          .limit(limit)
          .populate('vendorId', 'username'),
        Product.countDocuments(searchQuery)
      ]);

      return {
        success: true,
        query,
        results: products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error(`Search products error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search with facets (category counts, price ranges, etc.)
   */
  static async searchWithFacets(query, limit = 20) {
    try {
      const searchRegex = { $regex: query, $options: 'i' };
      
      const facets = await Product.aggregate([
        {
          $match: {
            $or: [
              { name: searchRegex },
              { description: searchRegex },
              { tags: { $in: [query] } }
            ]
          }
        },
        {
          $facet: {
            categories: [
              { $group: { _id: '$category', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            priceRanges: [
              {
                $bucket: {
                  groupBy: '$price',
                  boundaries: [0, 100, 500, 1000, 5000, 10000],
                  default: 'Other',
                  output: { count: { $sum: 1 } }
                }
              }
            ],
            vendors: [
              { $group: { _id: '$vendorId', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ],
            ratingRanges: [
              {
                $bucket: {
                  groupBy: '$averageRating',
                  boundaries: [0, 2, 3, 4, 5],
                  default: 'No Rating',
                  output: { count: { $sum: 1 } }
                }
              }
            ]
          }
        }
      ]);

      return { success: true, facets: facets[0] };
    } catch (error) {
      logger.error(`Search with facets error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Auto-complete suggestions
   */
  static async getAutocompleteSuggestions(query, type = 'product', limit = 10) {
    try {
      let suggestions = [];

      if (type === 'product') {
        suggestions = await Product.find({
          name: { $regex: `^${query}`, $options: 'i' }
        }).select('name').limit(limit);
      } else if (type === 'category') {
        suggestions = await Product.distinct('category', {
          category: { $regex: `^${query}`, $options: 'i' }
        }).limit(limit);
      } else if (type === 'vendor') {
        suggestions = await User.find({
          username: { $regex: `^${query}`, $options: 'i' },
          role: 'vendor'
        }).select('username').limit(limit);
      }

      return {
        success: true,
        type,
        suggestions: suggestions.map(s => s.name || s.username || s),
        count: suggestions.length
      };
    } catch (error) {
      logger.error(`Autocomplete error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Advanced order search
   */
  static async searchOrders(userId, filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      let searchQuery = { $or: [{ buyerId: userId }, { vendorId: userId }] };

      if (filters.status) searchQuery.status = filters.status;
      if (filters.minAmount) searchQuery.totalAmount = { $gte: filters.minAmount };
      if (filters.maxAmount) searchQuery.totalAmount = { ...searchQuery.totalAmount, $lte: filters.maxAmount };
      if (filters.dateFrom) searchQuery.createdAt = { $gte: new Date(filters.dateFrom) };
      if (filters.dateTo) searchQuery.createdAt = { ...searchQuery.createdAt, $lte: new Date(filters.dateTo) };

      const [orders, total] = await Promise.all([
        Order.find(searchQuery)
          .skip(skip)
          .limit(limit)
          .populate('products.productId', 'name price')
          .sort({ createdAt: -1 }),
        Order.countDocuments(searchQuery)
      ]);

      return {
        success: true,
        results: orders,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error) {
      logger.error(`Order search error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Saved search
   */
  static async saveSearch(userId, name, query, filters) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            savedSearches: {
              name,
              query,
              filters,
              savedAt: new Date()
            }
          }
        },
        { new: true }
      );

      return { success: true, savedSearches: user.savedSearches };
    } catch (error) {
      logger.error(`Save search error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's saved searches
   */
  static async getSavedSearches(userId) {
    try {
      const user = await User.findById(userId).select('savedSearches');
      return { success: true, savedSearches: user?.savedSearches || [] };
    } catch (error) {
      logger.error(`Get saved searches error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete saved search
   */
  static async deleteSavedSearch(userId, searchId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { savedSearches: { _id: searchId } } },
        { new: true }
      );

      return { success: true, savedSearches: user.savedSearches };
    } catch (error) {
      logger.error(`Delete saved search error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search history tracking
   */
  static async trackSearchQuery(userId, query) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            searchHistory: {
              query,
              searchedAt: new Date()
            }
          }
        },
        { new: true }
      );

      return { success: true };
    } catch (error) {
      logger.error(`Track search error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get trending searches
   */
  static async getTrendingSearches(limit = 10) {
    try {
      const trends = await User.aggregate([
        { $unwind: '$searchHistory' },
        { $group: { _id: '$searchHistory.query', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);

      return {
        success: true,
        trendingSearches: trends.map(t => ({ query: t._id, searches: t.count }))
      };
    } catch (error) {
      logger.error(`Get trending searches error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AdvancedSearchService;
