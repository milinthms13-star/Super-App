/**
 * MarketplaceSearchService.js
 * Advanced search with fuzzy matching, filters, facets, and ranking
 */

const logger = require('../config/logger');

class MarketplaceSearchService {
  /**
   * Perform advanced product search with filters
   */
  static async searchProducts(query, filters = {}, options = {}) {
    try {
      const Product = require('../models/Product');
      const User = require('../models/User');

      const {
        page = 1,
        limit = 20,
        sortBy = 'relevance',
        userId = null,
      } = options;

      const skip = (page - 1) * limit;

      // Build search query with fuzzy matching
      const searchRegex = this._buildFuzzyRegex(query);

      let dbQuery = {
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
          { tags: searchRegex },
        ],
        ...(filters.category && { category: filters.category }),
        ...(filters.minPrice && { price: { $gte: filters.minPrice } }),
        ...(filters.maxPrice && {
          price: { $lte: filters.maxPrice, ...(filters.minPrice && { $gte: filters.minPrice }) },
        }),
        ...(filters.rating && { rating: { $gte: filters.rating } }),
        ...(filters.inStock !== undefined && { stock: filters.inStock ? { $gt: 0 } : 0 }),
        ...(filters.seller && { sellerId: filters.seller }),
      };

      // Get total count
      const total = await Product.countDocuments(dbQuery);

      // Determine sort
      let sortObj = { createdAt: -1 };
      if (sortBy === 'price-asc') {
        sortObj = { price: 1 };
      } else if (sortBy === 'price-desc') {
        sortObj = { price: -1 };
      } else if (sortBy === 'rating') {
        sortObj = { rating: -1, salesCount: -1 };
      } else if (sortBy === 'relevance') {
        sortObj = { _id: 1 }; // TODO: implement text search scoring
      }

      // Execute search
      const products = await Product.find(dbQuery)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

      // Track search
      if (userId) {
        await this._trackSearch(userId, query, products.length);
      }

      logger.info(`Search executed: query="${query}", results=${products.length}`);

      return {
        success: true,
        data: {
          query,
          products,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
          filters: filters,
        },
        message: `Found ${products.length} products`,
      };
    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions/autocomplete
   */
  static async getSearchSuggestions(query, limit = 10) {
    try {
      const Product = require('../models/Product');

      // Get unique product names matching query
      const suggestions = await Product.aggregate([
        {
          $match: {
            name: { $regex: query, $options: 'i' },
          },
        },
        {
          $group: {
            _id: '$name',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: limit,
        },
        {
          $project: {
            _id: 0,
            suggestion: '$_id',
            popularity: '$count',
          },
        },
      ]);

      // Also get popular categories
      const categories = await Product.aggregate([
        {
          $match: {
            category: { $regex: query, $options: 'i' },
          },
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 5,
        },
        {
          $project: {
            _id: 0,
            suggestion: '$_id',
            type: { $literal: 'category' },
          },
        },
      ]);

      return {
        query,
        suggestions: [...suggestions, ...categories].slice(0, limit),
      };
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      throw error;
    }
  }

  /**
   * Get faceted search results
   */
  static async getFacetedResults(query, filters = {}) {
    try {
      const Product = require('../models/Product');

      const searchRegex = this._buildFuzzyRegex(query);

      let dbQuery = {
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
        ],
      };

      // Get category facets
      const categoryFacets = await Product.aggregate([
        { $match: dbQuery },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Get price range facets
      const priceFacets = await Product.aggregate([
        { $match: dbQuery },
        {
          $bucket: {
            groupBy: '$price',
            boundaries: [0, 100, 500, 1000, 5000, 10000, 50000],
            default: '50000+',
            output: {
              count: { $sum: 1 },
            },
          },
        },
      ]);

      // Get rating facets
      const ratingFacets = await Product.aggregate([
        { $match: dbQuery },
        {
          $group: {
            _id: { $floor: '$rating' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]);

      return {
        query,
        facets: {
          categories: categoryFacets,
          priceRanges: priceFacets,
          ratings: ratingFacets,
        },
      };
    } catch (error) {
      logger.error('Error getting faceted results:', error);
      throw error;
    }
  }

  /**
   * Get trending searches
   */
  static async getTrendingSearches(limit = 10, period = '7') {
    try {
      const User = require('../models/User');

      const daysBack = parseInt(period);
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      // Aggregate trending searches from user searchHistory
      const trending = await User.aggregate([
        {
          $unwind: '$searchHistory',
        },
        {
          $match: {
            'searchHistory.timestamp': { $gte: dateThreshold },
          },
        },
        {
          $group: {
            _id: '$searchHistory.query',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      return {
        period: `${daysBack} days`,
        searches: trending.map(t => ({
          query: t._id,
          searchCount: t.count,
        })),
      };
    } catch (error) {
      logger.error('Error getting trending searches:', error);
      throw error;
    }
  }

  /**
   * Search sellers/vendors
   */
  static async searchSellers(query, limit = 20) {
    try {
      const Vendor = require('../models/Vendor');

      const searchRegex = this._buildFuzzyRegex(query);

      const sellers = await Vendor.find({
        $or: [{ storeName: searchRegex }, { description: searchRegex }],
        status: 'approved',
      })
        .select('storeName rating description')
        .limit(limit)
        .lean();

      return {
        query,
        sellers,
      };
    } catch (error) {
      logger.error('Error searching sellers:', error);
      throw error;
    }
  }

  /**
   * Advanced filter search
   */
  static async advancedFilter(filters = {}) {
    try {
      const Product = require('../models/Product');

      const {
        minPrice = 0,
        maxPrice = 999999,
        categories = [],
        ratings = [],
        inStock = true,
        sortBy = 'createdAt',
        page = 1,
        limit = 20,
      } = filters;

      const skip = (page - 1) * limit;

      let dbQuery = {
        price: { $gte: minPrice, $lte: maxPrice },
      };

      if (categories.length > 0) {
        dbQuery.category = { $in: categories };
      }

      if (ratings.length > 0) {
        dbQuery.rating = { $in: ratings };
      }

      if (inStock) {
        dbQuery.stock = { $gt: 0 };
      }

      const total = await Product.countDocuments(dbQuery);

      const products = await Product.find(dbQuery)
        .sort({ [sortBy]: -1 })
        .skip(skip)
        .limit(limit);

      return {
        success: true,
        data: {
          products,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      logger.error('Error in advanced filter:', error);
      throw error;
    }
  }

  /**
   * Get personalized search results (learning from user history)
   */
  static async getPersonalizedSearch(userId, query, limit = 20) {
    try {
      const User = require('../models/User');
      const Product = require('../models/Product');

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get user's search/view history to infer preferences
      const searchRegex = this._buildFuzzyRegex(query);

      let baseProducts = await Product.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
        ],
      }).limit(limit);

      // Rank based on user preferences (categories they've searched before)
      if (user.searchHistory && user.searchHistory.length > 0) {
        const preferredCategories = new Map();

        user.searchHistory.slice(-50).forEach(search => {
          // Count category mentions in recent searches
          if (search.query) {
            preferredCategories.set(
              search.query,
              (preferredCategories.get(search.query) || 0) + 1
            );
          }
        });

        // Boost products in preferred categories
        baseProducts.sort((a, b) => {
          const aPreference = preferredCategories.get(a.category) || 0;
          const bPreference = preferredCategories.get(b.category) || 0;
          return bPreference - aPreference;
        });
      }

      return {
        query,
        userId,
        products: baseProducts,
        personalized: true,
      };
    } catch (error) {
      logger.error('Error in personalized search:', error);
      throw error;
    }
  }

  /**
   * Track search query for analytics
   */
  static async _trackSearch(userId, query, resultCount) {
    try {
      const User = require('../models/User');

      await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            searchHistory: {
              query,
              resultCount,
              timestamp: new Date(),
            },
          },
        },
        { new: true }
      );
    } catch (error) {
      logger.error('Error tracking search:', error);
    }
  }

  /**
   * Build fuzzy regex for flexible matching
   */
  static _buildFuzzyRegex(query) {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escapedQuery, 'i');
  }
}

module.exports = MarketplaceSearchService;
