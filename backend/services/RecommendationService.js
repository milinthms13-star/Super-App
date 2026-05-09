/**
 * RecommendationService.js
 * AI-powered recommendation engine using collaborative filtering and ML
 */

const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const logger = require('../config/logger');

class RecommendationService {
  /**
   * Get frequently bought together (FBT) products
   * Uses co-purchase patterns from order history
   */
  static async getFrequentlyBoughtTogether(productId, limit = 5) {
    try {
      // Find all orders containing this product
      const orders = await Order.find({
        'items._id': productId,
        status: { $ne: 'cancelled' },
      }).select('items');

      // Extract other product IDs from those orders
      const productMap = {};
      orders.forEach(order => {
        const orderProducts = order.items.map(item => item._id.toString());
        const otherProducts = orderProducts.filter(id => id !== productId.toString());

        otherProducts.forEach(otherId => {
          productMap[otherId] = (productMap[otherId] || 0) + 1;
        });
      });

      // Sort by frequency and get top products
      const topProductIds = Object.entries(productMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => id);

      const frequentlyBought = await Product.find({
        _id: { $in: topProductIds },
      }).select('name price image rating discountPercentage');

      return frequentlyBought.map(p => ({
        ...p.toObject(),
        reason: 'frequently_bought_together',
      }));
    } catch (error) {
      logger.error('Error getting frequently bought together:', error);
      throw error;
    }
  }

  /**
   * Get personalized recommendations for user
   * Uses user's purchase history, wishlist, and browsing behavior
   */
  static async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get user's behavior data
      const userOrders = await Order.find({ userId })
        .select('items')
        .sort({ createdAt: -1 })
        .limit(50);

      const userWishlist = user.wishlist || [];
      const userRecentlyViewed = user.recentlyViewed || [];

      // Collect categories and products user is interested in
      const interestingCategories = new Set();
      const purchasedProductIds = new Set();

      userOrders.forEach(order => {
        order.items.forEach(item => {
          interestingCategories.add(item.category);
          purchasedProductIds.add(item._id.toString());
        });
      });

      userWishlist.forEach(id => {
        purchasedProductIds.add(id.toString());
      });

      userRecentlyViewed.forEach(id => {
        purchasedProductIds.add(id.toString());
      });

      // Find products in same categories, ranked by popularity
      const recommendations = await Product.find({
        category: { $in: Array.from(interestingCategories) },
        _id: { $nin: Array.from(purchasedProductIds) },
      })
        .sort({ rating: -1, salesCount: -1, unitsSold: -1 })
        .limit(limit)
        .select('name price image rating discountPercentage category');

      return recommendations.map(p => ({
        ...p.toObject(),
        reason: 'personalized_recommendations',
      }));
    } catch (error) {
      logger.error('Error getting personalized recommendations:', error);
      throw error;
    }
  }

  /**
   * Get similar products (content-based recommendation)
   */
  static async getSimilarProducts(productId, limit = 8) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Find products with same category and similar price range
      const priceRange = product.price * 0.3;
      const similar = await Product.find({
        _id: { $ne: productId },
        category: product.category,
        price: {
          $gte: product.price - priceRange,
          $lte: product.price + priceRange,
        },
      })
        .sort({ rating: -1, salesCount: -1 })
        .limit(limit)
        .select('name price image rating discountPercentage brand');

      return similar.map(p => ({
        ...p.toObject(),
        reason: 'similar_products',
      }));
    } catch (error) {
      logger.error('Error getting similar products:', error);
      throw error;
    }
  }

  /**
   * Get trending products (time-based popularity)
   */
  static async getTrendingProducts(limit = 10, timeWindowDays = 30) {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - timeWindowDays);

      // Find products sold recently
      const trending = await Product.find({
        lastSoldAt: { $gte: dateThreshold },
      })
        .sort({ salesCount: -1, unitsSold: -1, lastSoldAt: -1 })
        .limit(limit)
        .select('name price image rating discountPercentage salesCount');

      return trending.map(p => ({
        ...p.toObject(),
        reason: 'trending',
      }));
    } catch (error) {
      logger.error('Error getting trending products:', error);
      throw error;
    }
  }

  /**
   * Get smart upsell recommendations (higher-priced alternatives)
   */
  static async getSmartUpsell(productId, limit = 5) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Find premium products in same category (20-50% higher price)
      const upsellPrice = {
        $gte: product.price * 1.2,
        $lte: product.price * 1.5,
      };

      const upsells = await Product.find({
        _id: { $ne: productId },
        category: product.category,
        price: upsellPrice,
        rating: { $gte: product.rating || 0 },
      })
        .sort({ rating: -1, discountPercentage: -1 })
        .limit(limit)
        .select('name price image rating discountPercentage mrp');

      return upsells.map(p => ({
        ...p.toObject(),
        reason: 'smart_upsell',
        savingPercentage: Math.round(((p.mrp - p.price) / p.mrp) * 100),
      }));
    } catch (error) {
      logger.error('Error getting smart upsell:', error);
      throw error;
    }
  }

  /**
   * Get smart cross-sell recommendations (complementary products)
   */
  static async getSmartCrossSell(productId, limit = 5) {
    try {
      // Get frequently bought together products
      const fbt = await this.getFrequentlyBoughtTogether(productId, limit);
      return fbt.map(p => ({
        ...p,
        reason: 'smart_cross_sell',
      }));
    } catch (error) {
      logger.error('Error getting smart cross-sell:', error);
      throw error;
    }
  }

  /**
   * Get category-specific recommendations
   */
  static async getCategoryRecommendations(category, userId = null, limit = 10) {
    try {
      let query = { category };

      if (userId) {
        const user = await User.findById(userId);
        if (user && user.recentlyViewed) {
          query._id = { $nin: user.recentlyViewed };
        }
      }

      const recommendations = await Product.find(query)
        .sort({ rating: -1, salesCount: -1 })
        .limit(limit)
        .select('name price image rating discountPercentage salesCount');

      return recommendations.map(p => ({
        ...p.toObject(),
        reason: 'category_recommendations',
      }));
    } catch (error) {
      logger.error('Error getting category recommendations:', error);
      throw error;
    }
  }

  /**
   * Get discount-based recommendations (products on sale)
   */
  static async getDiscountRecommendations(userId = null, limit = 10) {
    try {
      let query = {
        discountPercentage: { $gte: 10 },
        discountStartDate: { $lte: new Date() },
        discountEndDate: { $gte: new Date() },
      };

      if (userId) {
        const user = await User.findById(userId);
        if (user && user.recentlyViewed) {
          query._id = { $nin: user.recentlyViewed };
        }
      }

      const recommendations = await Product.find(query)
        .sort({ discountPercentage: -1, rating: -1 })
        .limit(limit)
        .select('name price image rating discountPercentage mrp');

      return recommendations.map(p => ({
        ...p.toObject(),
        reason: 'discount_alert',
        savingAmount: Math.round(p.mrp - p.price),
      }));
    } catch (error) {
      logger.error('Error getting discount recommendations:', error);
      throw error;
    }
  }

  /**
   * Track user view for recommendation calculation
   */
  static async trackUserView(userId, productId) {
    try {
      await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            recentlyViewed: {
              $each: [productId],
              $slice: -50, // Keep last 50
            },
          },
        },
        { new: true }
      );
    } catch (error) {
      logger.error('Error tracking user view:', error);
    }
  }

  /**
   * Calculate recommendation score for product (0-100)
   */
  static async calculateRecommendationScore(productId, userId = null) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      let score = 0;

      // Rating score (0-30)
      score += Math.min((product.rating || 0) * 6, 30);

      // Sales score (0-25)
      const maxSales = 1000; // Adjust based on your data
      score += Math.min((product.salesCount || 0 / maxSales) * 25, 25);

      // Discount score (0-20)
      score += Math.min((product.discountPercentage || 0) * 0.2, 20);

      // Freshness score (0-15)
      const daysSinceCreation = Math.floor(
        (new Date() - product.createdAt) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceCreation < 7) score += 15;
      else if (daysSinceCreation < 30) score += 10;
      else if (daysSinceCreation < 90) score += 5;

      // Stock score (0-10)
      if (product.stock > 100) score += 10;
      else if (product.stock > 50) score += 7;
      else if (product.stock > 0) score += 3;

      return Math.min(score, 100);
    } catch (error) {
      logger.error('Error calculating recommendation score:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive recommendations (multiple strategies)
   */
  static async getComprehensiveRecommendations(userId, options = {}) {
    try {
      const {
        includePersonalized = true,
        includeTrending = true,
        includeDiscount = true,
        limit = 20,
      } = options;

      const recommendations = {};

      if (includePersonalized) {
        recommendations.personalized = await this.getPersonalizedRecommendations(
          userId,
          Math.ceil(limit / 3)
        );
      }

      if (includeTrending) {
        recommendations.trending = await this.getTrendingProducts(
          Math.ceil(limit / 3)
        );
      }

      if (includeDiscount) {
        recommendations.onSale = await this.getDiscountRecommendations(
          userId,
          Math.ceil(limit / 3)
        );
      }

      return recommendations;
    } catch (error) {
      logger.error('Error getting comprehensive recommendations:', error);
      throw error;
    }
  }
}

module.exports = RecommendationService;
