/**
 * AdvancedRecommendationEngine.js
 * ML-powered product recommendations with collaborative filtering
 */

const logger = require('../config/logger');

class AdvancedRecommendationEngine {
  /**
   * Get personalized recommendations for user
   */
  static async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      const User = require('../models/User');
      const Order = require('../models/Order');
      const Product = require('../models/Product');

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get user's purchase history
      const userOrders = await Order.find({ userId }).select('items');
      const purchasedProductIds = new Set();
      const categoryPreferences = {};

      for (const order of userOrders) {
        for (const item of order.items) {
          purchasedProductIds.add(item.productId.toString());

          // Track category preferences
          const product = await Product.findById(item.productId);
          if (product) {
            categoryPreferences[product.category] =
              (categoryPreferences[product.category] || 0) + 1;
          }
        }
      }

      // Get top categories
      const topCategories = Object.entries(categoryPreferences)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([cat]) => cat);

      // Find similar products in top categories
      const recommendations = await Product.find({
        category: { $in: topCategories },
        _id: { $nin: Array.from(purchasedProductIds) },
      })
        .sort({ rating: -1, salesCount: -1 })
        .limit(limit);

      return {
        userId,
        recommendations: recommendations.map(p => ({
          _id: p._id,
          name: p.name,
          category: p.category,
          price: p.price,
          rating: p.rating,
          reason: 'Based on your purchases in this category',
        })),
        reasonTag: 'personalized',
      };
    } catch (error) {
      logger.error('Error getting personalized recommendations:', error);
      throw error;
    }
  }

  /**
   * Get collaborative filtering recommendations
   */
  static async getCollaborativeRecommendations(userId, limit = 10) {
    try {
      const User = require('../models/User');
      const Order = require('../models/Order');
      const Product = require('../models/Product');

      // Get user's purchases
      const userOrders = await Order.find({ userId });
      const userPurchases = new Set();

      userOrders.forEach(o => {
        o.items.forEach(item => {
          userPurchases.add(item.productId.toString());
        });
      });

      // Find similar users (same category purchases)
      const userCategories = new Set();
      for (const order of userOrders) {
        for (const item of order.items) {
          const product = await Product.findById(item.productId);
          if (product) userCategories.add(product.category);
        }
      }

      // Find other users with same category interests
      const similarUsers = await User.find({
        _id: { $ne: userId },
      }).limit(50);

      // Track recommendations from similar users
      const recommendationScores = {};

      for (const similarUser of similarUsers) {
        const similarUserOrders = await Order.find({
          userId: similarUser._id,
        });

        for (const order of similarUserOrders) {
          for (const item of order.items) {
            const productId = item.productId.toString();

            if (!userPurchases.has(productId)) {
              recommendationScores[productId] =
                (recommendationScores[productId] || 0) + 1;
            }
          }
        }
      }

      // Get top recommendations
      const topProductIds = Object.entries(recommendationScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([id]) => id);

      const recommendations = await Product.find({
        _id: { $in: topProductIds },
      });

      return {
        userId,
        recommendations: recommendations.map(p => ({
          _id: p._id,
          name: p.name,
          price: p.price,
          rating: p.rating,
          reason: 'Popular with users like you',
        })),
        reasonTag: 'collaborative_filtering',
      };
    } catch (error) {
      logger.error('Error getting collaborative recommendations:', error);
      throw error;
    }
  }

  /**
   * Get trending products
   */
  static async getTrendingProducts(limit = 10, period = '7') {
    try {
      const Order = require('../models/Order');
      const Product = require('../models/Product');

      const daysBack = parseInt(period);
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      // Aggregate top-selling products
      const trendingIds = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: dateThreshold },
          },
        },
        {
          $unwind: '$items',
        },
        {
          $group: {
            _id: '$items.productId',
            count: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      const trending = await Product.find({
        _id: { $in: trendingIds.map(t => t._id) },
      });

      return {
        period: `${daysBack} days`,
        products: trending.map(p => ({
          _id: p._id,
          name: p.name,
          category: p.category,
          price: p.price,
          rating: p.rating,
          trendScore: trendingIds.find(t => t._id.toString() === p._id.toString())
            ?.count || 0,
        })),
        reasonTag: 'trending',
      };
    } catch (error) {
      logger.error('Error getting trending products:', error);
      throw error;
    }
  }

  /**
   * Get "you may also like" recommendations
   */
  static async getAlsoLikeRecommendations(productId, limit = 5) {
    try {
      const Product = require('../models/Product');

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Find similar products (same category, similar price range)
      const priceMin = product.price * 0.7;
      const priceMax = product.price * 1.3;

      const similar = await Product.find({
        category: product.category,
        _id: { $ne: productId },
        price: { $gte: priceMin, $lte: priceMax },
      })
        .sort({ rating: -1, salesCount: -1 })
        .limit(limit);

      return {
        baseProductId: productId,
        recommendations: similar.map(p => ({
          _id: p._id,
          name: p.name,
          price: p.price,
          rating: p.rating,
          reason: 'Similar products you may like',
        })),
        reasonTag: 'you_may_also_like',
      };
    } catch (error) {
      logger.error('Error getting also-like recommendations:', error);
      throw error;
    }
  }

  /**
   * Get frequently bought together
   */
  static async getFrequentlyBoughtTogether(productId, limit = 5) {
    try {
      const Product = require('../models/Product');
      const Order = require('../models/Order');

      // Find orders containing this product
      const ordersWithProduct = await Order.find({
        'items.productId': productId,
      });

      // Track products bought together
      const productCounts = {};

      ordersWithProduct.forEach(order => {
        order.items.forEach(item => {
          if (item.productId.toString() !== productId.toString()) {
            const id = item.productId.toString();
            productCounts[id] = (productCounts[id] || 0) + 1;
          }
        });
      });

      // Get top products
      const topProductIds = Object.entries(productCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([id]) => id);

      const products = await Product.find({
        _id: { $in: topProductIds },
      });

      return {
        baseProductId: productId,
        recommendations: products.map(p => ({
          _id: p._id,
          name: p.name,
          price: p.price,
          rating: p.rating,
          reason: 'Frequently bought together',
        })),
        reasonTag: 'frequently_bought_together',
      };
    } catch (error) {
      logger.error('Error getting frequently bought together:', error);
      throw error;
    }
  }

  /**
   * Get seasonal recommendations
   */
  static async getSeasonalRecommendations(limit = 10) {
    try {
      const Product = require('../models/Product');

      // Mock seasonal tags (in production, would pull from product metadata)
      const currentMonth = new Date().getMonth();

      let seasonalTags = [];

      // Simple seasonal logic
      if (currentMonth >= 11 || currentMonth === 0) {
        seasonalTags = ['winter', 'holiday', 'gift'];
      } else if (currentMonth >= 2 && currentMonth < 5) {
        seasonalTags = ['spring', 'summer-prep'];
      } else if (currentMonth >= 5 && currentMonth < 8) {
        seasonalTags = ['summer', 'travel'];
      } else {
        seasonalTags = ['monsoon', 'autumn'];
      }

      const recommendations = await Product.find({
        tags: { $in: seasonalTags },
      })
        .sort({ rating: -1 })
        .limit(limit);

      return {
        season: this._getCurrentSeason(),
        recommendations: recommendations.map(p => ({
          _id: p._id,
          name: p.name,
          price: p.price,
          rating: p.rating,
          reason: 'Seasonal recommendations',
        })),
        reasonTag: 'seasonal',
      };
    } catch (error) {
      logger.error('Error getting seasonal recommendations:', error);
      throw error;
    }
  }

  static _getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 11 || month === 0) return 'winter';
    if (month >= 2 && month < 5) return 'spring';
    if (month >= 5 && month < 8) return 'summer';
    return 'autumn';
  }
}

module.exports = AdvancedRecommendationEngine;
