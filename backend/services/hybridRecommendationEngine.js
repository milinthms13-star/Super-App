/**
 * Hybrid Recommendation Engine - Phase 14
 * Combine collaborative filtering and content-based recommendations
 */

const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const logger = require('./logger');

class HybridRecommendationEngine {
  /**
   * Get personalized recommendations for user
   */
  static async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Get collaborative recommendations (60% weight)
      const collaborativeRecs = await this.getCollaborativeRecommendations(userId, limit);

      // Get content-based recommendations (40% weight)
      const contentRecs = await this.getContentBasedRecommendations(userId, limit);

      // Merge recommendations
      const merged = this.mergeRecommendations(collaborativeRecs, contentRecs, limit);

      logger.info('Recommendations generated', { userId, count: merged.length });

      return {
        recommendations: merged,
        userId,
        generatedAt: new Date(),
        algorithm: 'hybrid'
      };
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Get collaborative filtering recommendations
   */
  static async getCollaborativeRecommendations(userId, limit = 10) {
    try {
      // Get user's order history
      const userOrders = await Order.find({ userId }).populate('products');

      if (userOrders.length === 0) {
        return [];
      }

      // Get product IDs user has purchased
      const userProductIds = new Set();
      userOrders.forEach(order => {
        if (order.products) {
          order.products.forEach(p => userProductIds.add(p._id.toString()));
        }
      });

      // Find similar users (users who bought similar products)
      const similarUsers = await this.findSimilarUsers(userId, userProductIds);

      // Get recommendations from similar users
      const recommendations = {};

      for (const similarUser of similarUsers.slice(0, 5)) {
        const similarUserOrders = await Order.find({ userId: similarUser._id }).populate('products');

        similarUserOrders.forEach(order => {
          if (order.products) {
            order.products.forEach(product => {
              const productId = product._id.toString();

              if (!userProductIds.has(productId)) {
                if (!recommendations[productId]) {
                  recommendations[productId] = {
                    product,
                    score: 0,
                    count: 0
                  };
                }

                recommendations[productId].score += similarUser.similarity;
                recommendations[productId].count += 1;
              }
            });
          }
        });
      }

      return Object.values(recommendations)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(r => ({
          productId: r.product._id,
          productName: r.product.name,
          score: r.score / r.count,
          type: 'collaborative'
        }));
    } catch (error) {
      logger.error('Error generating collaborative recommendations:', error);
      return [];
    }
  }

  /**
   * Get content-based recommendations
   */
  static async getContentBasedRecommendations(userId, limit = 10) {
    try {
      // Get user's purchase history
      const userOrders = await Order.find({ userId }).populate('products');

      if (userOrders.length === 0) {
        return [];
      }

      // Extract user preferences from purchase history
      const userPreferences = this.extractUserPreferences(userOrders);

      // Find products similar to user's preferences
      const allProducts = await Product.find({ status: 'active' }).limit(500);

      const recommendations = allProducts
        .filter(p => !this.hasUserPurchased(userOrders, p._id))
        .map(product => ({
          product,
          score: this.calculateContentSimilarity(product, userPreferences)
        }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(r => ({
          productId: r.product._id,
          productName: r.product.name,
          score: r.score,
          type: 'content-based'
        }));

      return recommendations;
    } catch (error) {
      logger.error('Error generating content-based recommendations:', error);
      return [];
    }
  }

  /**
   * Find similar users based on product overlap
   */
  static async findSimilarUsers(userId, userProductIds) {
    try {
      const users = await User.find({ _id: { $ne: userId }, status: 'active' }).limit(100);
      const userSimilarities = [];

      for (const otherUser of users) {
        const otherOrders = await Order.find({ userId: otherUser._id });
        const otherProductIds = new Set();

        otherOrders.forEach(order => {
          if (order.products) {
            order.products.forEach(p => otherProductIds.add(p._id.toString()));
          }
        });

        // Calculate Jaccard similarity
        const intersection = [...userProductIds].filter(p => otherProductIds.has(p)).length;
        const union = new Set([...userProductIds, ...otherProductIds]).size;
        const similarity = union > 0 ? intersection / union : 0;

        if (similarity > 0) {
          userSimilarities.push({
            _id: otherUser._id,
            similarity
          });
        }
      }

      return userSimilarities.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      logger.error('Error finding similar users:', error);
      return [];
    }
  }

  /**
   * Extract user preferences from purchase history
   */
  static extractUserPreferences(orders) {
    const preferences = {
      categories: {},
      priceRange: { min: Infinity, max: 0, avg: 0 },
      averageRating: 0
    };

    let totalPrice = 0;
    let totalRating = 0;
    let productCount = 0;

    orders.forEach(order => {
      if (order.products) {
        order.products.forEach(product => {
          // Category preferences
          if (product.category) {
            preferences.categories[product.category] = (preferences.categories[product.category] || 0) + 1;
          }

          // Price range
          if (product.price) {
            preferences.priceRange.min = Math.min(preferences.priceRange.min, product.price);
            preferences.priceRange.max = Math.max(preferences.priceRange.max, product.price);
            totalPrice += product.price;
          }

          // Rating
          if (product.rating) {
            totalRating += product.rating;
          }

          productCount += 1;
        });
      }
    });

    if (productCount > 0) {
      preferences.priceRange.avg = totalPrice / productCount;
      preferences.averageRating = totalRating / productCount;
    }

    return preferences;
  }

  /**
   * Calculate content similarity score
   */
  static calculateContentSimilarity(product, userPreferences) {
    let score = 0;

    // Category match
    if (userPreferences.categories[product.category]) {
      score += 40;
    }

    // Price range match
    if (
      product.price >= userPreferences.priceRange.min &&
      product.price <= userPreferences.priceRange.max
    ) {
      score += 30;
    }

    // Rating match
    if (product.rating >= userPreferences.averageRating - 0.5) {
      score += 20;
    }

    // Popularity
    if (product.purchaseCount > 100) {
      score += 10;
    }

    return score;
  }

  /**
   * Check if user has purchased product
   */
  static hasUserPurchased(orders, productId) {
    return orders.some(order =>
      order.products && order.products.some(p => p._id.toString() === productId.toString())
    );
  }

  /**
   * Merge collaborative and content-based recommendations
   */
  static mergeRecommendations(collaborativeRecs, contentRecs, limit) {
    const merged = [];
    const seen = new Set();

    // Add collaborative recommendations first (higher weight)
    collaborativeRecs.forEach(rec => {
      if (merged.length < limit) {
        merged.push({
          ...rec,
          finalScore: rec.score * 0.6
        });
        seen.add(rec.productId.toString());
      }
    });

    // Add content-based recommendations
    contentRecs.forEach(rec => {
      if (merged.length < limit && !seen.has(rec.productId.toString())) {
        merged.push({
          ...rec,
          finalScore: rec.score * 0.4
        });
        seen.add(rec.productId.toString());
      }
    });

    return merged.sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Get trending recommendations
   */
  static async getTrendingRecommendations(limit = 10) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const trendingOrders = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $unwind: '$products'
        },
        {
          $group: {
            _id: '$products',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: limit
        }
      ]);

      return trendingOrders.map(item => ({
        productId: item._id,
        purchaseCount: item.count,
        type: 'trending'
      }));
    } catch (error) {
      logger.error('Error getting trending recommendations:', error);
      return [];
    }
  }
}

module.exports = HybridRecommendationEngine;
