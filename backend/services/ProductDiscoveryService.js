/**
 * ProductDiscoveryService.js
 * Phase 5C - Advanced product search, filtering, sorting, and discovery
 */

const Product = require('../models/Product');
const SearchHistory = require('../models/SearchHistory');
const RecentlyViewed = require('../models/RecentlyViewed');
const logger = require('./logger');

class ProductDiscoveryService {
  static instance;

  static getInstance() {
    if (!this.instance) {
      this.instance = new ProductDiscoveryService();
    }
    return this.instance;
  }

  // ============================================
  // SEARCH FUNCTIONALITY
  // ============================================

  /**
   * Advanced product search with filters and sorting
   */
  async searchProducts(query, filters = {}, options = {}) {
    try {
      const {
        userId = null,
        category = null,
        minPrice = 0,
        maxPrice = Infinity,
        rating = 0,
        inStock = false,
        discount = false,
        sortBy = 'relevance', // relevance, price_asc, price_desc, rating, newest
        page = 1,
        limit = 20,
      } = { ...filters, ...options };

      const skip = (page - 1) * limit;
      const searchQuery = {
        $and: [
          {
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } },
              { category: { $regex: query, $options: 'i' } },
            ],
          },
        ],
      };

      // Apply category filter
      if (category) {
        searchQuery.$and.push({ category });
      }

      // Apply price filter
      searchQuery.$and.push({
        price: { $gte: minPrice, $lte: maxPrice },
      });

      // Apply rating filter
      if (rating > 0) {
        searchQuery.$and.push({ 'ratingAggregated.average': { $gte: rating } });
      }

      // Apply stock filter
      if (inStock) {
        searchQuery.$and.push({ stock: { $gt: 0 } });
      }

      // Apply discount filter
      if (discount) {
        searchQuery.$and.push({ discountPercentage: { $gt: 0 } });
      }

      // Determine sort order
      let sortOrder = { _id: -1 }; // Default: newest first
      switch (sortBy) {
        case 'price_asc':
          sortOrder = { price: 1 };
          break;
        case 'price_desc':
          sortOrder = { price: -1 };
          break;
        case 'rating':
          sortOrder = { 'ratingAggregated.average': -1 };
          break;
        case 'relevance':
          sortOrder = { score: { $meta: 'textScore' } };
          break;
      }

      // Execute search
      const totalCount = await Product.countDocuments(searchQuery);
      const products = await Product.find(searchQuery)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .select('name price discountPercentage rating image category stock')
        .lean();

      // Log search history if user is logged in
      if (userId) {
        await this.logSearchHistory(userId, query);
      }

      return {
        success: true,
        query,
        results: products,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
          hasMore: skip + limit < totalCount,
        },
      };
    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Search with autocomplete suggestions
   */
  async getSearchSuggestions(query, limit = 10) {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const suggestions = await Product.aggregate([
        {
          $match: {
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { category: { $regex: query, $options: 'i' } },
            ],
          },
        },
        {
          $group: {
            _id: null,
            names: { $push: '$name' },
            categories: { $addToSet: '$category' },
          },
        },
        {
          $project: {
            suggestions: {
              $slice: [
                {
                  $concatArrays: [
                    { $slice: ['$names', limit / 2] },
                    { $slice: ['$categories', limit / 2] },
                  ],
                },
                limit,
              ],
            },
          },
        },
      ]);

      return suggestions[0]?.suggestions || [];
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      throw error;
    }
  }

  // ============================================
  // FILTERING & SORTING
  // ============================================

  /**
   * Get available filters for a category
   */
  async getCategoryFilters(category) {
    try {
      const products = await Product.find({ category }).lean();

      if (products.length === 0) {
        return {
          category,
          filters: {
            priceRange: { min: 0, max: 0 },
            brands: [],
            colors: [],
            ratings: [],
          },
        };
      }

      // Extract unique filter values
      const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
      const colors = [...new Set(products.map(p => p.color).filter(Boolean))];
      const priceRange = {
        min: Math.min(...products.map(p => p.price)),
        max: Math.max(...products.map(p => p.price)),
      };
      const ratings = [1, 2, 3, 4, 5];

      return {
        category,
        filters: {
          priceRange,
          brands: brands.slice(0, 20),
          colors: colors.slice(0, 20),
          ratings,
        },
      };
    } catch (error) {
      logger.error('Error getting category filters:', error);
      throw error;
    }
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(category = null, limit = 10) {
    try {
      const query = {};
      if (category) {
        query.category = category;
      }

      const trending = await Product.find(query)
        .sort({ 'analytics.views': -1, 'ratingAggregated.average': -1 })
        .limit(limit)
        .select('name price image category rating')
        .lean();

      return trending;
    } catch (error) {
      logger.error('Error fetching trending products:', error);
      throw error;
    }
  }

  /**
   * Get discounted products
   */
  async getDiscountedProducts(limit = 10) {
    try {
      const now = new Date();
      const discounted = await Product.find({
        discountPercentage: { $gt: 0 },
        $or: [
          { discountEndDate: { $gt: now } },
          { discountEndDate: null },
        ],
      })
        .sort({ discountPercentage: -1 })
        .limit(limit)
        .select('name price discountPercentage image category')
        .lean();

      return discounted;
    } catch (error) {
      logger.error('Error fetching discounted products:', error);
      throw error;
    }
  }

  /**
   * Get new/recently added products
   */
  async getNewProducts(category = null, limit = 10) {
    try {
      const query = {};
      if (category) {
        query.category = category;
      }

      const newProducts = await Product.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('name price image category rating')
        .lean();

      return newProducts;
    } catch (error) {
      logger.error('Error fetching new products:', error);
      throw error;
    }
  }

  // ============================================
  // RECENTLY VIEWED & HISTORY
  // ============================================

  /**
   * Log product view
   */
  async logProductView(userId, productId) {
    try {
      let viewed = await RecentlyViewed.findOne({ userId });

      if (!viewed) {
        viewed = new RecentlyViewed({
          userId,
          products: [{ productId, viewedAt: new Date() }],
        });
      } else {
        // Remove if exists and re-add to put it at the top
        viewed.products = viewed.products.filter(p => p.productId.toString() !== productId);
        viewed.products.unshift({ productId, viewedAt: new Date() });
        // Keep only last 50 viewed products
        viewed.products = viewed.products.slice(0, 50);
      }

      await viewed.save();
      return viewed;
    } catch (error) {
      logger.error('Error logging product view:', error);
      throw error;
    }
  }

  /**
   * Get recently viewed products
   */
  async getRecentlyViewed(userId, limit = 10) {
    try {
      const viewed = await RecentlyViewed.findOne({ userId })
        .populate({
          path: 'products.productId',
          model: 'Product',
          select: 'name price image category rating',
        })
        .lean();

      if (!viewed || !viewed.products) {
        return [];
      }

      return viewed.products
        .slice(0, limit)
        .map(p => p.productId)
        .filter(Boolean);
    } catch (error) {
      logger.error('Error fetching recently viewed products:', error);
      throw error;
    }
  }

  /**
   * Log search query
   */
  async logSearchHistory(userId, query) {
    try {
      let history = await SearchHistory.findOne({ userId });

      if (!history) {
        history = new SearchHistory({
          userId,
          searches: [{ query, searchedAt: new Date() }],
        });
      } else {
        const existing = history.searches.find(s => s.query.toLowerCase() === query.toLowerCase());
        if (existing) {
          existing.count += 1;
          existing.searchedAt = new Date();
        } else {
          history.searches.unshift({ query, count: 1, searchedAt: new Date() });
        }
        // Keep only last 100 searches
        history.searches = history.searches.slice(0, 100);
      }

      await history.save();
      return history;
    } catch (error) {
      logger.error('Error logging search history:', error);
      throw error;
    }
  }

  /**
   * Get search history for user
   */
  async getSearchHistory(userId, limit = 10) {
    try {
      const history = await SearchHistory.findOne({ userId }).lean();

      if (!history) {
        return [];
      }

      return history.searches
        .sort((a, b) => new Date(b.searchedAt) - new Date(a.searchedAt))
        .slice(0, limit)
        .map(s => ({
          query: s.query,
          count: s.count,
          searchedAt: s.searchedAt,
        }));
    } catch (error) {
      logger.error('Error fetching search history:', error);
      throw error;
    }
  }

  // ============================================
  // PRODUCT DETAILS & RELATED PRODUCTS
  // ============================================

  /**
   * Get product details with related products
   */
  async getProductDetails(productId, userId = null) {
    try {
      const product = await Product.findById(productId).lean();

      if (!product) {
        throw new Error('Product not found');
      }

      // Log view if user is logged in
      if (userId) {
        await this.logProductView(userId, productId);
      }

      // Get related products (same category, different product)
      const relatedProducts = await Product.find({
        category: product.category,
        _id: { $ne: productId },
      })
        .sort({ 'ratingAggregated.average': -1 })
        .limit(5)
        .select('name price image rating discountPercentage')
        .lean();

      return {
        product,
        related: relatedProducts,
      };
    } catch (error) {
      logger.error('Error fetching product details:', error);
      throw error;
    }
  }

  /**
   * Get similar products
   */
  async getSimilarProducts(productId, limit = 5) {
    try {
      const product = await Product.findById(productId).lean();

      if (!product) {
        throw new Error('Product not found');
      }

      const similar = await Product.find({
        $or: [
          { category: product.category },
          { subcategory: product.subcategory },
        ],
        _id: { $ne: productId },
      })
        .sort({ 'ratingAggregated.average': -1, price: -1 })
        .limit(limit)
        .select('name price image category rating')
        .lean();

      return similar;
    } catch (error) {
      logger.error('Error fetching similar products:', error);
      throw error;
    }
  }

  // ============================================
  // BROWSE FUNCTIONALITY
  // ============================================

  /**
   * Get all categories
   */
  async getAllCategories() {
    try {
      const categories = await Product.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      return categories;
    } catch (error) {
      logger.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get subcategories for a category
   */
  async getSubcategories(category) {
    try {
      const subcategories = await Product.aggregate([
        {
          $match: { category },
        },
        {
          $group: {
            _id: '$subcategory',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      return subcategories.filter(s => s._id);
    } catch (error) {
      logger.error('Error fetching subcategories:', error);
      throw error;
    }
  }

  /**
   * Browse products by category
   */
  async browseByCategory(category, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const query = { category };

      const totalCount = await Product.countDocuments(query);
      const products = await Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name price image category rating discountPercentage')
        .lean();

      return {
        category,
        products,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
          hasMore: skip + limit < totalCount,
        },
      };
    } catch (error) {
      logger.error('Error browsing by category:', error);
      throw error;
    }
  }
}

module.exports = ProductDiscoveryService.getInstance();
