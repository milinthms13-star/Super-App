const Product = require('../models/Product');
const Order = require('../models/Order');
const UserBehavior = require('../models/UserBehavior');
const ProductSimilarity = require('../models/ProductSimilarity');
const User = require('../models/User');
const redis = require('redis');

/**
 * AI Recommendation Engine Service
 * Provides personalized recommendations using collaborative filtering, content-based filtering,
 * and market basket analysis
 * Uses Redis caching for performance optimization
 */
class RecommendationEngine {
  static redisClient = null;
  static CACHE_TTL = 3600; // 1 hour

  /**
   * Initialize Redis client
   */
  static initializeRedis() {
    if (!this.redisClient) {
      this.redisClient = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        db: 1 // Use separate DB for recommendations
      });
      this.redisClient.on('error', (err) => console.error('Redis error:', err));
    }
    return this.redisClient;
  }

  /**
   * Get personalized recommendations for user
   * Combines multiple recommendation types
   * @param {String} userId - User ID
   * @param {Number} limit - Max recommendations (default: 10)
   * @returns {Object} {success, message, data}
   */
  static async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      // Check cache first
      const cacheKey = `recs:user:${userId}:${limit}`;
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return {
          success: true,
          message: 'Recommendations retrieved (from cache)',
          data: JSON.parse(cached)
        };
      }

      // Get user behavior
      const userBehavior = await UserBehavior.findOne({ userId });

      if (!userBehavior) {
        // New user - return trending products
        return await this.getTrendingProducts(limit);
      }

      // Combine multiple recommendation strategies
      const [collaborative, contentBased, frequentlyBought] = await Promise.all([
        this.getCollaborativeFiltering(userId, Math.ceil(limit * 0.4)),
        this.getContentBasedFiltering(userId, Math.ceil(limit * 0.3)),
        this.getFrequentlyBoughtTogether(userBehavior.purchases, Math.ceil(limit * 0.3))
      ]);

      // Merge and deduplicate
      const recommendations = this.mergeRecommendations(
        collaborative,
        contentBased,
        frequentlyBought
      ).slice(0, limit);

      // Enrich with product details
      const enriched = await this.enrichRecommendations(recommendations);

      // Cache results
      await this.setCache(cacheKey, JSON.stringify(enriched), this.CACHE_TTL);

      return {
        success: true,
        message: 'Personalized recommendations generated',
        data: enriched
      };
    } catch (error) {
      console.error('Personalization Error:', error);
      return {
        success: false,
        message: 'Failed to generate recommendations',
        data: null
      };
    }
  }

  /**
   * Collaborative Filtering
   * Find users with similar purchase history and recommend their products
   * @param {String} userId - User ID
   * @param {Number} limit - Max recommendations
   * @returns {Promise<Array>}
   */
  static async getCollaborativeFiltering(userId, limit = 5) {
    try {
      // Get current user's purchase history
      const userOrders = await Order.find({ userId, status: 'delivered' })
        .select('products')
        .lean();

      const userProductIds = new Set();
      userOrders.forEach(order => {
        order.products.forEach(p => userProductIds.add(p.productId.toString()));
      });

      // Find similar users (who bought similar products)
      const similarUsers = await Order.aggregate([
        {
          $match: {
            userId: { $ne: userId },
            status: 'delivered'
          }
        },
        { $unwind: '$products' },
        {
          $group: {
            _id: '$userId',
            productIds: { $push: '$products.productId' },
            orderCount: { $sum: 1 }
          }
        },
        {
          $project: {
            similarity: {
              $size: {
                $setIntersection: [
                  { $map: { input: '$productIds', as: 'p', in: { $toString: '$$p' } } },
                  Array.from(userProductIds)
                ]
              }
            },
            userId: '$_id'
          }
        },
        {
          $match: { similarity: { $gt: 0 } }
        },
        { $sort: { similarity: -1 } },
        { $limit: 50 }
      ]);

      // Get products from similar users that current user hasn't bought
      const recommendedProductIds = new Set();
      for (const similar of similarUsers) {
        const similarUserOrders = await Order.find(
          { userId: similar.userId, status: 'delivered' },
          { products: 1 }
        ).lean();

        similarUserOrders.forEach(order => {
          order.products.forEach(p => {
            if (!userProductIds.has(p.productId.toString())) {
              recommendedProductIds.add(p.productId.toString());
            }
          });
        });

        if (recommendedProductIds.size >= limit) break;
      }

      return Array.from(recommendedProductIds).slice(0, limit);
    } catch (error) {
      console.error('Collaborative Filtering Error:', error);
      return [];
    }
  }

  /**
   * Content-Based Filtering
   * Recommend products similar to what user has purchased
   * @param {String} userId - User ID
   * @param {Number} limit - Max recommendations
   * @returns {Promise<Array>}
   */
  static async getContentBasedFiltering(userId, limit = 5) {
    try {
      // Get user's purchase history
      const userOrders = await Order.find({ userId, status: 'delivered' })
        .select('products')
        .lean();

      const purchasedProductIds = userOrders.flatMap(o =>
        o.products.map(p => p.productId.toString())
      );

      if (purchasedProductIds.length === 0) return [];

      // Find similar products
      const similarProducts = await ProductSimilarity.find({
        productId: { $in: purchasedProductIds }
      })
        .select('similarProducts')
        .lean();

      const recommendedIds = new Set();
      similarProducts.forEach(ps => {
        ps.similarProducts
          .filter(sp => sp.similarityScore > 0.6)
          .sort((a, b) => b.similarityScore - a.similarityScore)
          .forEach(sp => {
            if (!purchasedProductIds.includes(sp.similarProductId.toString())) {
              recommendedIds.add(sp.similarProductId.toString());
            }
          });
      });

      return Array.from(recommendedIds).slice(0, limit);
    } catch (error) {
      console.error('Content-Based Filtering Error:', error);
      return [];
    }
  }

  /**
   * Get frequently bought together products
   * Uses market basket analysis
   * @param {Array} purchasedProductIds - Products user has purchased
   * @param {Number} limit - Max recommendations
   * @returns {Promise<Array>}
   */
  static async getFrequentlyBoughtTogether(purchasedProductIds, limit = 5) {
    try {
      if (!purchasedProductIds || purchasedProductIds.length === 0) return [];

      // Get recently purchased product
      const lastProduct = purchasedProductIds[purchasedProductIds.length - 1];

      // Find orders containing this product
      const orders = await Order.find({
        'products.productId': lastProduct,
        status: 'delivered'
      })
        .select('products')
        .lean();

      // Count frequency of products bought with it
      const frequencyMap = new Map();
      orders.forEach(order => {
        order.products.forEach(p => {
          const pid = p.productId.toString();
          if (pid !== lastProduct.toString()) {
            frequencyMap.set(pid, (frequencyMap.get(pid) || 0) + 1);
          }
        });
      });

      // Sort by frequency
      return Array.from(frequencyMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(entry => entry[0]);
    } catch (error) {
      console.error('Frequently Bought Together Error:', error);
      return [];
    }
  }

  /**
   * Get trending products
   * Best for new users without purchase history
   * @param {Number} limit - Max products
   * @param {Number} days - Trending in last N days (default: 30)
   * @returns {Object} {success, message, data}
   */
  static async getTrendingProducts(limit = 10, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const trending = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: 'delivered'
          }
        },
        { $unwind: '$products' },
        {
          $group: {
            _id: '$products.productId',
            totalSales: { $sum: '$products.quantity' },
            totalRevenue: { $sum: '$products.price' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { totalSales: -1 } },
        { $limit: limit }
      ]);

      const enriched = await this.enrichRecommendations(
        trending.map(t => t._id.toString())
      );

      return {
        success: true,
        message: 'Trending products retrieved',
        data: enriched
      };
    } catch (error) {
      console.error('Trending Products Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve trending products',
        data: null
      };
    }
  }

  /**
   * Get upsell recommendations
   * Recommend products with higher price based on cart value
   * @param {Array} cartItems - Items in user's cart
   * @param {Number} limit - Max recommendations
   * @returns {Object} {success, message, data}
   */
  static async getUpsellRecommendations(cartItems, limit = 5) {
    try {
      if (!cartItems || cartItems.length === 0) return [];

      // Calculate cart value
      const cartValue = cartItems.reduce((sum, item) => sum + item.price, 0);

      // Get categories from cart items
      const cartProducts = await Product.find({
        _id: { $in: cartItems.map(ci => ci.productId) }
      }).select('category');

      const categories = [...new Set(cartProducts.map(p => p.category))];

      // Find higher-price products in same categories
      const upsellProducts = await Product.find({
        category: { $in: categories },
        _id: { $nin: cartItems.map(ci => ci.productId) },
        price: { $gt: cartValue * 0.15, $lt: cartValue * 0.5 }, // 15-50% of cart value
        status: 'active'
      })
        .select('_id name price image category rating')
        .sort({ rating: -1 })
        .limit(limit)
        .lean();

      return {
        success: true,
        message: 'Upsell recommendations generated',
        data: upsellProducts
      };
    } catch (error) {
      console.error('Upsell Recommendations Error:', error);
      return {
        success: false,
        message: 'Failed to generate upsell recommendations',
        data: null
      };
    }
  }

  /**
   * Get cross-sell recommendations
   * Recommend complementary products
   * @param {String} productId - Product ID
   * @param {Number} limit - Max recommendations
   * @returns {Object} {success, message, data}
   */
  static async getCrossSellRecommendations(productId, limit = 5) {
    try {
      // Find product and its category
      const product = await Product.findById(productId).select('category price');

      if (!product) {
        return {
          success: false,
          message: 'Product not found',
          data: null
        };
      }

      // Define complementary categories based on category
      const complementaryMap = {
        'smartphones': ['phone-cases', 'screen-protectors', 'chargers', 'earphones'],
        'laptops': ['laptop-bags', 'mouse', 'chargers', 'laptops-stands'],
        'watches': ['watch-bands', 'watch-screen-protectors'],
        'cameras': ['camera-bags', 'memory-cards', 'tripods', 'lenses']
      };

      const complementary = complementaryMap[product.category] || [];

      // Find products in complementary categories
      const crossSell = await Product.find({
        category: { $in: complementary },
        _id: { $ne: productId },
        price: { $lt: product.price * 0.3 }, // Usually cheaper complementary items
        status: 'active'
      })
        .select('_id name price image category rating')
        .sort({ rating: -1 })
        .limit(limit)
        .lean();

      return {
        success: true,
        message: 'Cross-sell recommendations generated',
        data: crossSell
      };
    } catch (error) {
      console.error('Cross-sell Error:', error);
      return {
        success: false,
        message: 'Failed to generate cross-sell recommendations',
        data: null
      };
    }
  }

  /**
   * Similar products for a given product
   * @param {String} productId - Product ID
   * @param {Number} limit - Max recommendations
   * @returns {Object} {success, message, data}
   */
  static async getSimilarProducts(productId, limit = 10) {
    try {
      const similar = await ProductSimilarity.findOne({ productId })
        .lean();

      if (!similar) {
        // If no similarity data, find by category
        const product = await Product.findById(productId).select('category price');

        const categoryProducts = await Product.find({
          category: product.category,
          _id: { $ne: productId },
          status: 'active'
        })
          .select('_id name price image category rating')
          .sort({ rating: -1 })
          .limit(limit)
          .lean();

        return {
          success: true,
          message: 'Similar products (category-based)',
          data: categoryProducts
        };
      }

      // Get similar product details
      const similarIds = similar.similarProducts
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit)
        .map(sp => sp.similarProductId);

      const products = await Product.find({
        _id: { $in: similarIds }
      })
        .select('_id name price image category rating')
        .lean();

      return {
        success: true,
        message: 'Similar products retrieved',
        data: products
      };
    } catch (error) {
      console.error('Similar Products Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve similar products',
        data: null
      };
    }
  }

  /**
   * Track user behavior (views, searches, purchases, ratings)
   * @param {String} userId - User ID
   * @param {String} eventType - 'view', 'search', 'purchase', 'rating'
   * @param {Object} data - Event data
   * @returns {Promise<void>}
   */
  static async trackUserBehavior(userId, eventType, data) {
    try {
      let userBehavior = await UserBehavior.findOne({ userId });

      if (!userBehavior) {
        userBehavior = new UserBehavior({ userId });
      }

      if (eventType === 'view') {
        userBehavior.viewedProducts.push({
          productId: data.productId,
          viewedAt: new Date(),
          timeSpent: data.timeSpent || 0
        });
      } else if (eventType === 'search') {
        userBehavior.searchQueries.push(data.query);
      } else if (eventType === 'purchase') {
        userBehavior.purchases.push({
          productId: data.productId,
          purchasedAt: new Date(),
          amount: data.amount
        });
      } else if (eventType === 'rating') {
        const existing = userBehavior.ratings.find(
          r => r.productId.toString() === data.productId.toString()
        );
        if (existing) {
          existing.rating = data.rating;
        } else {
          userBehavior.ratings.push({
            productId: data.productId,
            rating: data.rating,
            ratedAt: new Date()
          });
        }
      }

      userBehavior.updatedAt = new Date();
      await userBehavior.save();

      // Invalidate recommendation cache for this user
      await this.invalidateUserCache(userId);
    } catch (error) {
      console.error('Track Behavior Error:', error);
    }
  }

  /**
   * Calculate product similarity scores
   * Runs periodically (e.g., nightly)
   * @returns {Object} {success, message, data}
   */
  static async calculateProductSimilarities() {
    try {
      const products = await Product.find({ status: 'active' })
        .select('_id name category price description rating')
        .lean();

      let calculatedCount = 0;

      for (const product of products) {
        const similarities = products
          .filter(p => p._id.toString() !== product._id.toString())
          .map(p => ({
            similarProductId: p._id,
            similarityScore: this.calculateSimilarity(product, p),
            reason: this.getSimilarityReason(product, p)
          }))
          .filter(s => s.similarityScore > 0.3)
          .sort((a, b) => b.similarityScore - a.similarityScore)
          .slice(0, 20);

        if (similarities.length > 0) {
          await ProductSimilarity.updateOne(
            { productId: product._id },
            {
              productId: product._id,
              similarProducts: similarities,
              updatedAt: new Date()
            },
            { upsert: true }
          );
          calculatedCount++;
        }
      }

      return {
        success: true,
        message: 'Product similarities calculated',
        data: { calculatedCount, totalProducts: products.length }
      };
    } catch (error) {
      console.error('Calculate Similarities Error:', error);
      return {
        success: false,
        message: 'Failed to calculate similarities',
        data: null
      };
    }
  }

  /**
   * Calculate similarity between two products
   * @param {Object} p1 - Product 1
   * @param {Object} p2 - Product 2
   * @returns {Number} Similarity score (0-1)
   */
  static calculateSimilarity(p1, p2) {
    let score = 0;

    // Category match (40% weight)
    if (p1.category === p2.category) score += 0.4;

    // Price similarity (30% weight) - within 50% range
    const priceDiff = Math.abs(p1.price - p2.price) / Math.max(p1.price, p2.price);
    if (priceDiff <= 0.5) score += 0.3 * (1 - priceDiff);

    // Rating similarity (20% weight)
    const ratingDiff = Math.abs(p1.rating - p2.rating) / 5;
    score += 0.2 * (1 - ratingDiff);

    // Description similarity (10% weight) - keyword overlap
    const keywords1 = p1.description.toLowerCase().split(' ');
    const keywords2 = p2.description.toLowerCase().split(' ');
    const overlap = keywords1.filter(k => keywords2.includes(k)).length;
    const keywordSimilarity = overlap / Math.max(keywords1.length, keywords2.length);
    score += 0.1 * keywordSimilarity;

    return Math.min(score, 1);
  }

  /**
   * Determine reason for similarity
   * @param {Object} p1 - Product 1
   * @param {Object} p2 - Product 2
   * @returns {String}
   */
  static getSimilarityReason(p1, p2) {
    if (p1.category === p2.category) return 'category';
    if (Math.abs(p1.price - p2.price) / Math.max(p1.price, p2.price) <= 0.2) return 'price';
    return 'features';
  }

  /**
   * Helper: Merge recommendation lists
   * @param {...Array} arrays - Arrays to merge
   * @returns {Array}
   */
  static mergeRecommendations(...arrays) {
    const merged = [];
    const seen = new Set();

    arrays.forEach(arr => {
      arr.forEach(id => {
        if (!seen.has(id.toString())) {
          merged.push(id);
          seen.add(id.toString());
        }
      });
    });

    return merged;
  }

  /**
   * Enrich recommendations with product details
   * @param {Array} productIds - Product IDs
   * @returns {Promise<Array>}
   */
  static async enrichRecommendations(productIds) {
    const products = await Product.find({
      _id: { $in: productIds }
    })
      .select('_id name price image category rating reviews seller')
      .populate('seller', 'name rating')
      .lean();

    return products;
  }

  /**
   * Cache operations
   */
  static async setCache(key, value, ttl) {
    try {
      const client = this.initializeRedis();
      client.setex(key, ttl, value);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  static async getFromCache(key) {
    try {
      const client = this.initializeRedis();
      return new Promise((resolve, reject) => {
        client.get(key, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  static async invalidateUserCache(userId) {
    try {
      const client = this.initializeRedis();
      const pattern = `recs:user:${userId}:*`;
      client.keys(pattern, (err, keys) => {
        if (err) return;
        if (keys.length > 0) {
          client.del(...keys);
        }
      });
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
}

module.exports = RecommendationEngine;
