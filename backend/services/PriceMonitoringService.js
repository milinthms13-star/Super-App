/**
 * PriceMonitoringService.js
 * Dynamic pricing, price drops, and competitor analysis
 */

const logger = require('../config/logger');

class PriceMonitoringService {
  /**
   * Get price history for a product
   */
  static async getPriceHistory(productId, days = 30) {
    try {
      const PriceHistory = require('../models/PriceHistory');
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      const history = await PriceHistory.find({
        productId,
        createdAt: { $gte: dateThreshold },
      })
        .sort({ createdAt: 1 })
        .select('price discount createdAt');

      if (history.length === 0) {
        return [];
      }

      return history.map(h => ({
        date: h.createdAt,
        price: h.price,
        discount: h.discount,
        discountedPrice: h.price - (h.price * h.discount) / 100,
      }));
    } catch (error) {
      logger.error('Error getting price history:', error);
      throw error;
    }
  }

  /**
   * Calculate price trend (up/down/stable)
   */
  static async calculatePriceTrend(productId, days = 30) {
    try {
      const history = await this.getPriceHistory(productId, days);

      if (history.length < 2) {
        return { trend: 'stable', changePercent: 0 };
      }

      const oldPrice = history[0].price;
      const newPrice = history[history.length - 1].price;

      const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;

      let trend = 'stable';
      if (changePercent > 5) trend = 'up';
      if (changePercent < -5) trend = 'down';

      return {
        trend,
        changePercent: Math.round(changePercent * 100) / 100,
        oldPrice,
        newPrice,
        minPrice: Math.min(...history.map(h => h.price)),
        maxPrice: Math.max(...history.map(h => h.price)),
      };
    } catch (error) {
      logger.error('Error calculating price trend:', error);
      throw error;
    }
  }

  /**
   * Add price to watch list
   */
  static async addToWatchList(userId, productId, targetPrice) {
    try {
      const User = require('../models/User');

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Initialize watchlist if not exists
      if (!user.watchlist) {
        user.watchlist = [];
      }

      // Check if already watching
      const existing = user.watchlist.find(
        w => w.productId?.toString() === productId
      );
      if (existing) {
        return {
          message: 'Product already in watchlist',
          watchlistEntry: existing,
        };
      }

      // Add to watchlist
      user.watchlist.push({
        productId,
        targetPrice,
        addedAt: new Date(),
        priceDropNotified: false,
      });

      await user.save();
      logger.info(`Product added to watchlist: ${productId}`);

      return {
        message: 'Added to price watch list',
        watchlistEntry: {
          productId,
          targetPrice,
          addedAt: new Date(),
        },
      };
    } catch (error) {
      logger.error('Error adding to watchlist:', error);
      throw error;
    }
  }

  /**
   * Remove from price watch list
   */
  static async removeFromWatchList(userId, productId) {
    try {
      const User = require('../models/User');

      await User.findByIdAndUpdate(userId, {
        $pull: { watchlist: { productId } },
      });

      logger.info(`Product removed from watchlist: ${productId}`);

      return {
        message: 'Removed from price watch list',
      };
    } catch (error) {
      logger.error('Error removing from watchlist:', error);
      throw error;
    }
  }

  /**
   * Get price drop alerts
   */
  static async getPriceDropAlerts(userId) {
    try {
      const User = require('../models/User');
      const Product = require('../models/Product');

      const user = await User.findById(userId);
      if (!user || !user.watchlist) {
        return [];
      }

      const alerts = [];

      for (const watch of user.watchlist) {
        const product = await Product.findById(watch.productId);
        if (!product) continue;

        const currentPrice = product.price - (product.price * product.discountPercentage) / 100;

        if (currentPrice <= watch.targetPrice && !watch.priceDropNotified) {
          alerts.push({
            productId: product._id,
            productName: product.name,
            targetPrice: watch.targetPrice,
            currentPrice,
            savings: watch.targetPrice - currentPrice,
            discountPercentage: product.discountPercentage,
            image: product.image,
          });
        }
      }

      return alerts;
    } catch (error) {
      logger.error('Error getting price drop alerts:', error);
      throw error;
    }
  }

  /**
   * Apply dynamic pricing based on demand/inventory
   */
  static async applyDynamicPricing(productId) {
    try {
      const Product = require('../models/Product');
      const Order = require('../models/Order');

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Calculate demand score (orders in last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentOrders = await Order.countDocuments({
        'items.productId': productId,
        createdAt: { $gte: sevenDaysAgo },
      });

      // Calculate inventory score
      const inventoryRatio = product.stock / (product.stock + recentOrders + 1);

      // Dynamic pricing adjustment
      let priceMultiplier = 1.0;

      // High demand + low stock = price increase
      if (recentOrders > 50 && inventoryRatio < 0.2) {
        priceMultiplier = 1.15; // 15% increase
      } else if (recentOrders > 30 && inventoryRatio < 0.3) {
        priceMultiplier = 1.1; // 10% increase
      }
      // Low demand + high stock = price decrease
      else if (recentOrders < 10 && inventoryRatio > 0.7) {
        priceMultiplier = 0.9; // 10% decrease
      } else if (recentOrders < 5 && inventoryRatio > 0.8) {
        priceMultiplier = 0.85; // 15% decrease
      }

      const newPrice = Math.round(product.price * priceMultiplier);

      // Record price change
      const PriceHistory = require('../models/PriceHistory');
      const priceRecord = new PriceHistory({
        productId,
        price: newPrice,
        discount: product.discountPercentage || 0,
        reason: `Demand: ${recentOrders} orders, Inventory: ${inventoryRatio.toFixed(2)}`,
        createdAt: new Date(),
      });

      await priceRecord.save();

      return {
        productId,
        oldPrice: product.price,
        newPrice,
        priceChange: priceMultiplier - 1,
        reason: `Based on demand (${recentOrders} orders) and stock (${inventoryRatio.toFixed(2)})`,
      };
    } catch (error) {
      logger.error('Error applying dynamic pricing:', error);
      throw error;
    }
  }

  /**
   * Get competitor pricing comparison
   */
  static async getCompetitorPricing(productId) {
    try {
      const Product = require('../models/Product');

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Mock competitor data
      const competitors = [
        {
          name: 'Amazon',
          price: Math.round(product.price * 0.95),
          rating: 4.6,
          delivery: '1-2 days',
        },
        {
          name: 'Flipkart',
          price: Math.round(product.price * 0.98),
          rating: 4.5,
          delivery: '2-3 days',
        },
        {
          name: 'Snapdeal',
          price: Math.round(product.price * 1.05),
          rating: 4.2,
          delivery: '3-5 days',
        },
      ];

      const avgCompetitorPrice =
        competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length;
      const ourPrice =
        product.price - (product.price * product.discountPercentage) / 100;

      return {
        ourPrice,
        competitorPrices: competitors,
        avgCompetitorPrice,
        pricePosition:
          ourPrice < avgCompetitorPrice ? 'Below Market' : 'Above Market',
        recommendation:
          ourPrice > avgCompetitorPrice
            ? 'Consider reducing price to stay competitive'
            : 'Competitive pricing',
      };
    } catch (error) {
      logger.error('Error getting competitor pricing:', error);
      throw error;
    }
  }

  /**
   * Get best-selling price points for category
   */
  static async getCategoryPriceBands(category, limit = 10) {
    try {
      const Product = require('../models/Product');

      const products = await Product.find({ category }).limit(100);

      if (products.length === 0) {
        return [];
      }

      const prices = products.map(p => p.price).sort((a, b) => a - b);

      const bands = [
        {
          range: `Below ₹${prices[Math.floor(prices.length * 0.25)]}`,
          count: products.filter(
            p => p.price < prices[Math.floor(prices.length * 0.25)]
          ).length,
          avgRating: this._calculateAvgRating(
            products.filter(
              p => p.price < prices[Math.floor(prices.length * 0.25)]
            )
          ),
        },
        {
          range: `₹${prices[Math.floor(prices.length * 0.25)]}-${prices[Math.floor(prices.length * 0.5)]}`,
          count: products.filter(
            p =>
              p.price >=
                prices[Math.floor(prices.length * 0.25)] &&
              p.price < prices[Math.floor(prices.length * 0.5)]
          ).length,
          avgRating: this._calculateAvgRating(
            products.filter(
              p =>
                p.price >=
                  prices[Math.floor(prices.length * 0.25)] &&
                p.price < prices[Math.floor(prices.length * 0.5)]
            )
          ),
        },
        {
          range: `₹${prices[Math.floor(prices.length * 0.5)]}-${prices[Math.floor(prices.length * 0.75)]}`,
          count: products.filter(
            p =>
              p.price >=
                prices[Math.floor(prices.length * 0.5)] &&
              p.price < prices[Math.floor(prices.length * 0.75)]
          ).length,
          avgRating: this._calculateAvgRating(
            products.filter(
              p =>
                p.price >=
                  prices[Math.floor(prices.length * 0.5)] &&
                p.price < prices[Math.floor(prices.length * 0.75)]
            )
          ),
        },
        {
          range: `Above ₹${prices[Math.floor(prices.length * 0.75)]}`,
          count: products.filter(
            p => p.price >= prices[Math.floor(prices.length * 0.75)]
          ).length,
          avgRating: this._calculateAvgRating(
            products.filter(
              p => p.price >= prices[Math.floor(prices.length * 0.75)]
            )
          ),
        },
      ];

      return bands;
    } catch (error) {
      logger.error('Error getting category price bands:', error);
      throw error;
    }
  }

  /**
   * Calculate average rating
   */
  static _calculateAvgRating(products) {
    if (products.length === 0) return 0;
    const sum = products.reduce((total, p) => total + (p.rating || 0), 0);
    return Math.round((sum / products.length) * 10) / 10;
  }

  /**
   * Record price update
   */
  static async recordPriceUpdate(productId, newPrice, discount = 0, reason = '') {
    try {
      const PriceHistory = require('../models/PriceHistory');

      const record = new PriceHistory({
        productId,
        price: newPrice,
        discount,
        reason,
        createdAt: new Date(),
      });

      await record.save();
      logger.info(`Price recorded: ${productId} - ₹${newPrice}`);

      return record;
    } catch (error) {
      logger.error('Error recording price update:', error);
      throw error;
    }
  }
}

module.exports = PriceMonitoringService;
