/**
 * ProductRecommendationService.js
 * Phase 5C - AI-powered personalized product recommendations
 */

const Product = require('../models/Product');
const Order = require('../models/Order');
const Wishlist = require('../models/Wishlist');
const UserPreferences = require('../models/UserPreferences');
const RecentlyViewed = require('../models/RecentlyViewed');
const logger = require('./logger');

class ProductRecommendationService {
  static instance;

  static getInstance() {
    if (!this.instance) {
      this.instance = new ProductRecommendationService();
    }
    return this.instance;
  }

  // ============================================
  // PERSONALIZED RECOMMENDATIONS
  // ============================================

  /**
   * Get personalized recommendations for user
   */
  async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      const userProfile = await this.buildUserProfile(userId);

      if (!userProfile || Object.keys(userProfile).length === 0) {
        // New user - return popular products
        return await this.getPopularProducts(limit);
      }

      const recommendations = [];

      // 1. Category-based recommendations (40%)
      if (userProfile.preferredCategories && userProfile.preferredCategories.length > 0) {
        const categoryRecs = await this.getRecommendationsByCategories(
          userProfile.preferredCategories,
          Math.floor(limit * 0.4)
        );
        recommendations.push(...categoryRecs);
      }

      // 2. Similar to purchased (30%)
      if (userProfile.purchasedProductIds && userProfile.purchasedProductIds.length > 0) {
        const purchaseRecs = await this.getRecommendationsSimilarToPurchased(
          userProfile.purchasedProductIds,
          Math.floor(limit * 0.3)
        );
        recommendations.push(...purchaseRecs);
      }

      // 3. Price range-based (20%)
      if (userProfile.avgPriceSpent) {
        const priceRecs = await this.getRecommendationsByPriceRange(
          userProfile.avgPriceSpent,
          Math.floor(limit * 0.2)
        );
        recommendations.push(...priceRecs);
      }

      // 4. Trending in user's interest (10%)
      if (userProfile.preferredCategories && userProfile.preferredCategories.length > 0) {
        const trendingRecs = await this.getTrendingInCategories(
          userProfile.preferredCategories,
          Math.floor(limit * 0.1)
        );
        recommendations.push(...trendingRecs);
      }

      // Deduplicate and shuffle
      const uniqueRecs = this.deduplicateAndShuffle(recommendations, limit);
      return uniqueRecs;
    } catch (error) {
      logger.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Get recommendations based on recently viewed
   */
  async getRecommendationsByRecentlyViewed(userId, limit = 10) {
    try {
      const viewed = await RecentlyViewed.findOne({ userId })
        .populate('products.productId', 'category subcategory')
        .lean();

      if (!viewed || viewed.products.length === 0) {
        return [];
      }

      const categories = [...new Set(
        viewed.products.map(p => p.productId?.category).filter(Boolean)
      )];

      if (categories.length === 0) {
        return [];
      }

      const recommendations = await Product.find({
        category: { $in: categories },
        _id: { $nin: viewed.products.map(p => p.productId?._id).filter(Boolean) },
      })
        .sort({ 'ratingAggregated.average': -1, 'analytics.views': -1 })
        .limit(limit)
        .select('name price image category rating discountPercentage')
        .lean();

      return recommendations;
    } catch (error) {
      logger.error('Error getting recently viewed recommendations:', error);
      return [];
    }
  }

  /**
   * Get collaborative filtering recommendations
   * Based on users with similar purchase patterns
   */
  async getCollaborativeRecommendations(userId, limit = 10) {
    try {
      // Get user's purchase history
      const userOrders = await Order.find({ userId }).select('products').lean();
      const userProductIds = new Set();
      userOrders.forEach(order => {
        order.products?.forEach(p => userProductIds.add(p.productId?.toString()));
      });

      // Find similar users (who bought similar products)
      const similarUsers = await Order.aggregate([
        {
          $match: {
            userId: { $ne: userId },
            'products.productId': { $in: Array.from(userProductIds) },
          },
        },
        {
          $group: {
            _id: '$userId',
            commonProducts: { $sum: 1 },
          },
        },
        {
          $sort: { commonProducts: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      if (similarUsers.length === 0) {
        return [];
      }

      // Get top products from similar users that current user hasn't bought
      const similarUserIds = similarUsers.map(u => u._id);
      const recommendations = await Order.aggregate([
        {
          $match: {
            userId: { $in: similarUserIds },
          },
        },
        {
          $unwind: '$products',
        },
        {
          $match: {
            'products.productId': { $nin: Array.from(userProductIds) },
          },
        },
        {
          $group: {
            _id: '$products.productId',
            popularity: { $sum: 1 },
          },
        },
        {
          $sort: { popularity: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      const recProductIds = recommendations.map(r => r._id);
      const products = await Product.find({ _id: { $in: recProductIds } })
        .select('name price image category rating')
        .lean();

      return products;
    } catch (error) {
      logger.error('Error getting collaborative recommendations:', error);
      return [];
    }
  }

  /**
   * Get trending products
   */
  async getPopularProducts(limit = 10) {
    try {
      const products = await Product.find()
        .sort({ 'analytics.views': -1, 'ratingAggregated.average': -1 })
        .limit(limit)
        .select('name price image category rating')
        .lean();

      return products;
    } catch (error) {
      logger.error('Error getting popular products:', error);
      return [];
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Build user profile from order history and preferences
   */
  async buildUserProfile(userId) {
    try {
      const orders = await Order.find({ userId }).select('products totalAmount').lean();
      const wishlist = await Wishlist.findOne({ userId }).lean();
      const prefs = await UserPreferences.findOne({ userId }).lean();

      const profile = {
        preferredCategories: new Set(),
        purchasedProductIds: new Set(),
        avgPriceSpent: 0,
        totalSpent: 0,
        purchaseCount: 0,
      };

      // Analyze purchase history
      let totalSpent = 0;
      orders.forEach(order => {
        totalSpent += order.totalAmount || 0;
        order.products?.forEach(p => {
          profile.purchasedProductIds.add(p.productId?.toString());
          if (p.category) {
            profile.preferredCategories.add(p.category);
          }
        });
      });

      profile.purchaseCount = orders.length;
      profile.totalSpent = totalSpent;
      profile.avgPriceSpent = profile.purchaseCount > 0 ? totalSpent / profile.purchaseCount : 0;

      // Include wishlist items
      wishlist?.items?.forEach(item => {
        if (item.productId) {
          profile.preferredCategories.add(item.category);
        }
      });

      // Convert sets to arrays
      profile.preferredCategories = Array.from(profile.preferredCategories);
      profile.purchasedProductIds = Array.from(profile.purchasedProductIds);

      return profile;
    } catch (error) {
      logger.error('Error building user profile:', error);
      return {};
    }
  }

  /**
   * Get recommendations by preferred categories
   */
  async getRecommendationsByCategories(categories, limit = 5) {
    try {
      const products = await Product.find({ category: { $in: categories } })
        .sort({ 'ratingAggregated.average': -1, stock: -1 })
        .limit(limit)
        .select('name price image category rating')
        .lean();

      return products;
    } catch (error) {
      logger.error('Error getting category recommendations:', error);
      return [];
    }
  }

  /**
   * Get recommendations similar to purchased products
   */
  async getRecommendationsSimilarToPurchased(productIds, limit = 5) {
    try {
      const purchasedProducts = await Product.find({ _id: { $in: productIds } })
        .select('category subcategory')
        .lean();

      const categories = [...new Set(purchasedProducts.map(p => p.category))];

      const similar = await Product.find({
        category: { $in: categories },
        _id: { $nin: productIds },
      })
        .sort({ 'ratingAggregated.average': -1 })
        .limit(limit)
        .select('name price image category rating')
        .lean();

      return similar;
    } catch (error) {
      logger.error('Error getting similar product recommendations:', error);
      return [];
    }
  }

  /**
   * Get recommendations by price range
   */
  async getRecommendationsByPriceRange(avgPrice, limit = 5) {
    try {
      const range = {
        min: Math.max(0, avgPrice * 0.5),
        max: avgPrice * 1.5,
      };

      const products = await Product.find({
        price: { $gte: range.min, $lte: range.max },
      })
        .sort({ 'ratingAggregated.average': -1 })
        .limit(limit)
        .select('name price image category rating')
        .lean();

      return products;
    } catch (error) {
      logger.error('Error getting price-based recommendations:', error);
      return [];
    }
  }

  /**
   * Get trending products in specific categories
   */
  async getTrendingInCategories(categories, limit = 5) {
    try {
      const trending = await Product.find({ category: { $in: categories } })
        .sort({ 'analytics.views': -1 })
        .limit(limit)
        .select('name price image category rating')
        .lean();

      return trending;
    } catch (error) {
      logger.error('Error getting trending recommendations:', error);
      return [];
    }
  }

  /**
   * Deduplicate and shuffle recommendations
   */
  deduplicateAndShuffle(items, limit) {
    const seen = new Set();
    const unique = [];

    for (const item of items) {
      const id = item._id?.toString();
      if (id && !seen.has(id)) {
        seen.add(id);
        unique.push(item);
      }
    }

    // Shuffle array
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    return unique.slice(0, limit);
  }
}

module.exports = ProductRecommendationService.getInstance();
