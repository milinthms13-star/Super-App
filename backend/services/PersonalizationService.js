/**
 * PersonalizationService.js
 * AI-powered homepage personalization based on user behavior
 */

const RecommendationService = require('./RecommendationService');
const SmartSearchService = require('./SmartSearchService');
const logger = require('../config/logger');

class PersonalizationService {
  /**
   * Get personalized homepage for user
   */
  static async getPersonalizedHomepage(userId, options = {}) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      const sections = {
        personalGreeting: {
          title: `Welcome back, ${user.name.split(' ')[0]}!`,
          description: 'Here are personalized recommendations just for you',
        },
        sections: [],
      };

      // 1. Frequently Viewed Categories
      const viewedCategories = await this._getFrequentlyViewedCategories(userId, 3);
      if (viewedCategories.length > 0) {
        sections.sections.push({
          title: 'Your Favorite Categories',
          type: 'categories',
          data: viewedCategories,
        });
      }

      // 2. Personalized Recommendations
      const personalized = await RecommendationService.getPersonalizedRecommendations(
        userId,
        6
      );
      if (personalized.length > 0) {
        sections.sections.push({
          title: 'Recommended for You',
          type: 'products',
          data: personalized,
        });
      }

      // 3. Trending Products
      const trending = await RecommendationService.getTrendingProducts(6, 7);
      if (trending.length > 0) {
        sections.sections.push({
          title: 'Trending Now',
          type: 'products',
          data: trending,
        });
      }

      // 4. Recently Viewed
      const recentlyViewed = await this._getRecentlyViewedProducts(userId, 4);
      if (recentlyViewed.length > 0) {
        sections.sections.push({
          title: 'Continue Shopping',
          type: 'products',
          data: recentlyViewed,
        });
      }

      // 5. Deals & Discounts
      const deals = await RecommendationService.getDiscountRecommendations(userId, 6);
      if (deals.length > 0) {
        sections.sections.push({
          title: 'Special Deals for You',
          type: 'products',
          data: deals,
        });
      }

      // 6. Similar to Recent Purchases
      const lastPurchase = await this._getLastPurchase(userId);
      if (lastPurchase) {
        const similar = await RecommendationService.getSimilarProducts(
          lastPurchase._id,
          4
        );
        if (similar.length > 0) {
          sections.sections.push({
            title: `Similar to ${lastPurchase.name}`,
            type: 'products',
            data: similar,
          });
        }
      }

      // 7. Frequently Bought Together
      if (lastPurchase) {
        const fbt = await RecommendationService.getFrequentlyBoughtTogether(
          lastPurchase._id,
          4
        );
        if (fbt.length > 0) {
          sections.sections.push({
            title: 'Frequently Bought Together',
            type: 'products',
            data: fbt,
          });
        }
      }

      // 8. Wishlist Reminders
      const wishlistItems = await this._getWishlistReminders(userId, 4);
      if (wishlistItems.length > 0) {
        sections.sections.push({
          title: 'Items in Your Wishlist',
          type: 'products',
          data: wishlistItems,
        });
      }

      return sections;
    } catch (error) {
      logger.error('Error getting personalized homepage:', error);
      throw error;
    }
  }

  /**
   * Get personalized feed for user
   */
  static async getPersonalizedFeed(userId, options = {}) {
    try {
      const { page = 1, pageSize = 20 } = options;

      // Combine different feed sources
      const feedItems = [];

      // 1. New arrivals in user's interest categories
      const newArrivals = await this._getNewArrivals(userId, 5);
      feedItems.push(...newArrivals.map(item => ({
        type: 'new_arrival',
        product: item,
        timestamp: new Date(),
      })));

      // 2. Price drops on wishlist items
      const priceDrops = await this._getPriceDropNotifications(userId, 5);
      feedItems.push(...priceDrops.map(item => ({
        type: 'price_drop',
        product: item.product,
        oldPrice: item.oldPrice,
        newPrice: item.newPrice,
        timestamp: item.timestamp,
      })));

      // 3. Coming soon items
      const comingSoon = await this._getComingSoonItems(userId, 3);
      feedItems.push(...comingSoon.map(item => ({
        type: 'coming_soon',
        product: item,
        releaseDate: item.releaseDate,
        timestamp: new Date(),
      })));

      // 4. Personalized deals
      const personalizedDeals = await this._getPersonalizedDeals(userId, 5);
      feedItems.push(...personalizedDeals.map(item => ({
        type: 'deal',
        product: item,
        discountPercentage: item.discountPercentage,
        expiresAt: item.discountExpiresAt,
        timestamp: new Date(),
      })));

      // 5. Flash sales
      const flashSales = await this._getFlashSales(5);
      feedItems.push(...flashSales.map(item => ({
        type: 'flash_sale',
        product: item,
        saleEndsAt: item.saleEndsAt,
        timestamp: new Date(),
      })));

      // Sort by timestamp (newest first)
      feedItems.sort((a, b) => b.timestamp - a.timestamp);

      // Pagination
      const startIdx = (page - 1) * pageSize;
      const paginatedItems = feedItems.slice(startIdx, startIdx + pageSize);

      return {
        items: paginatedItems,
        pagination: {
          page,
          pageSize,
          total: feedItems.length,
          totalPages: Math.ceil(feedItems.length / pageSize),
        },
      };
    } catch (error) {
      logger.error('Error getting personalized feed:', error);
      throw error;
    }
  }

  /**
   * Get user behavior profile
   */
  static async getUserBehaviorProfile(userId) {
    try {
      const User = require('../models/User');
      const SearchHistory = require('../models/SearchHistory');
      const Order = require('../models/Order');
      const Product = require('../models/Product');

      const user = await User.findById(userId);

      // Get top search categories
      const topSearches = await SearchHistory.find({ users: userId })
        .sort({ count: -1 })
        .limit(5)
        .select('query count');

      // Get purchase patterns
      const purchases = await Order.find({ userId, status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(20);

      // Get top purchased categories
      const categoryMap = {};
      for (const order of purchases) {
        for (const item of order.items) {
          const product = await Product.findById(item.productId);
          categoryMap[product?.category] = (categoryMap[product?.category] || 0) + 1;
        }
      }

      const topCategories = Object.entries(categoryMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      // Calculate average order value
      const avgOrderValue = purchases.length > 0
        ? purchases.reduce((sum, order) => sum + order.totalAmount, 0) /
          purchases.length
        : 0;

      // Purchase frequency
      const purchaseFrequency = {
        total: purchases.length,
        averageDaysInterval: purchases.length > 1
          ? Math.floor(
              (new Date() - purchases[purchases.length - 1].createdAt) /
                (1000 * 60 * 60 * 24) /
                (purchases.length - 1)
            )
          : 0,
      };

      // Price preference
      const pricePoints = purchases
        .flatMap(order => order.items.map(item => item.price))
        .sort((a, b) => a - b);

      const pricePreference = {
        min: Math.min(...pricePoints),
        max: Math.max(...pricePoints),
        median: pricePoints[Math.floor(pricePoints.length / 2)],
      };

      return {
        userId,
        topSearches: topSearches.map(s => s.query),
        topCategories: topCategories.map(([cat]) => cat),
        purchaseFrequency,
        avgOrderValue: Math.round(avgOrderValue),
        pricePreference,
        accountAge: Math.floor(
          (new Date() - user.createdAt) / (1000 * 60 * 60 * 24)
        ),
      };
    } catch (error) {
      logger.error('Error getting user behavior profile:', error);
      throw error;
    }
  }

  /**
   * Get personalized bundle recommendations
   */
  static async getBundleRecommendations(userId) {
    try {
      const lastPurchase = await this._getLastPurchase(userId);
      if (!lastPurchase) {
        return [];
      }

      // Get frequently bought together items
      const fbt = await RecommendationService.getFrequentlyBoughtTogether(
        lastPurchase._id,
        4
      );

      // Create bundle with discount
      const bundleItems = [lastPurchase, ...fbt.slice(0, 3)];
      const bundlePrice = bundleItems.reduce(
        (sum, item) => sum + (item.price || 0),
        0
      );
      const bundleDiscount = Math.floor(bundlePrice * 0.15); // 15% bundle discount

      return {
        bundleId: `bundle_${lastPurchase._id}`,
        items: bundleItems,
        regularPrice: bundlePrice,
        bundlePrice: bundlePrice - bundleDiscount,
        discountPercentage: 15,
      };
    } catch (error) {
      logger.error('Error getting bundle recommendations:', error);
      throw error;
    }
  }

  // Helper methods

  static async _getFrequentlyViewedCategories(userId, limit) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);

      if (!user || !user.recentlyViewed) {
        return [];
      }

      return user.recentlyViewed.slice(0, limit);
    } catch (error) {
      logger.error('Error getting frequently viewed categories:', error);
      return [];
    }
  }

  static async _getRecentlyViewedProducts(userId, limit) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);

      if (!user || !user.recentlyViewed) {
        return [];
      }

      const Product = require('../models/Product');
      return await Product.find({
        _id: { $in: user.recentlyViewed },
      })
        .limit(limit);
    } catch (error) {
      logger.error('Error getting recently viewed products:', error);
      return [];
    }
  }

  static async _getLastPurchase(userId) {
    try {
      const Order = require('../models/Order');
      const order = await Order.findOne({
        userId,
        status: 'completed',
      })
        .sort({ createdAt: -1 });

      if (order && order.items.length > 0) {
        const Product = require('../models/Product');
        return await Product.findById(order.items[0].productId);
      }

      return null;
    } catch (error) {
      logger.error('Error getting last purchase:', error);
      return null;
    }
  }

  static async _getWishlistReminders(userId, limit) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);

      if (!user || !user.wishlist) {
        return [];
      }

      const Product = require('../models/Product');
      return await Product.find({
        _id: { $in: user.wishlist },
      })
        .limit(limit);
    } catch (error) {
      logger.error('Error getting wishlist reminders:', error);
      return [];
    }
  }

  static async _getNewArrivals(userId, limit) {
    try {
      const Product = require('../models/Product');
      const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 7));

      return await Product.find({
        createdAt: { $gte: sevenDaysAgo },
      })
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      logger.error('Error getting new arrivals:', error);
      return [];
    }
  }

  static async _getPriceDropNotifications(userId, limit) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);

      if (!user || !user.wishlist) {
        return [];
      }

      const Product = require('../models/Product');
      const wishlistProducts = await Product.find({
        _id: { $in: user.wishlist },
      }).limit(limit);

      // Mock price drop data
      return wishlistProducts.map(product => ({
        product,
        oldPrice: product.price * 1.1,
        newPrice: product.price,
        timestamp: new Date(),
      }));
    } catch (error) {
      logger.error('Error getting price drop notifications:', error);
      return [];
    }
  }

  static async _getComingSoonItems(userId, limit) {
    try {
      const Product = require('../models/Product');
      return await Product.find({
        stock: 0,
        preorderEnabled: true,
      })
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      logger.error('Error getting coming soon items:', error);
      return [];
    }
  }

  static async _getPersonalizedDeals(userId, limit) {
    try {
      const Product = require('../models/Product');
      return await Product.find({
        discountPercentage: { $gte: 10 },
        discountExpiresAt: { $gte: new Date() },
      })
        .sort({ discountPercentage: -1 })
        .limit(limit);
    } catch (error) {
      logger.error('Error getting personalized deals:', error);
      return [];
    }
  }

  static async _getFlashSales(limit) {
    try {
      const Product = require('../models/Product');
      return await Product.find({
        isFlashSale: true,
        saleEndsAt: { $gte: new Date() },
      })
        .sort({ discountPercentage: -1 })
        .limit(limit);
    } catch (error) {
      logger.error('Error getting flash sales:', error);
      return [];
    }
  }
}

module.exports = PersonalizationService;
