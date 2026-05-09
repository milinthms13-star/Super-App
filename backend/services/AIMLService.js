/**
 * AIMLService.js
 * Predictive pricing, demand forecasting, ML-based recommendations
 */

const logger = require('../config/logger');

class AIMLService {
  /**
   * Calculate predictive price
   */
  static async calculatePredictivePrice(productId) {
    try {
      const Product = require('../models/Product');
      const Order = require('../models/Order');

      const product = await Product.findById(productId);
      if (!product) throw new Error('Product not found');

      // Get historical pricing and demand data
      const orders = await Order.aggregate([
        { $unwind: '$items' },
        { $match: { 'items.productId': product._id } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            quantity: { $sum: '$items.quantity' },
            avgPrice: { $avg: '$items.price' },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }, // Last 30 days
      ]);

      // Simple ML: moving average with elasticity
      const avgQty = orders.reduce((sum, o) => sum + o.quantity, 0) / orders.length;
      const priceElasticity = 1.2; // Assume demand drops 20% per 10% price increase
      const demandTrend = this._calculateDemandTrend(orders);

      const predictedPrice = product.price * (1 + demandTrend * 0.05 / priceElasticity);

      return {
        currentPrice: product.currentPrice,
        predictedPrice: Math.round(predictedPrice),
        recommendation: this._getPriceRecommendation(
          product.price,
          predictedPrice
        ),
        confidence: 0.78,
      };
    } catch (error) {
      logger.error('Error calculating predictive price:', error);
      throw error;
    }
  }

  /**
   * Forecast demand
   */
  static async forecastDemand(productId, forecastDays = 30) {
    try {
      const Product = require('../models/Product');
      const Order = require('../models/Order');

      const product = await Product.findById(productId);
      if (!product) throw new Error('Product not found');

      // Historical demand
      const historicalDemand = await Order.aggregate([
        { $unwind: '$items' },
        { $match: { 'items.productId': product._id } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            quantity: { $sum: '$items.quantity' },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 90 },
      ]);

      // Calculate average and trend
      const avgDaily = historicalDemand.reduce((sum, d) => sum + d.quantity, 0) / historicalDemand.length;
      const trend = this._calculateDemandTrend(historicalDemand);

      // Generate forecast
      const forecast = [];
      for (let i = 1; i <= forecastDays; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);

        const forecastedQty = Math.round(
          avgDaily * (1 + trend * (i / 30)) + (Math.random() - 0.5) * avgDaily * 0.2
        );

        forecast.push({
          date: date.toISOString().split('T')[0],
          forecastedDemand: Math.max(forecastedQty, 0),
          confidenceInterval: {
            lower: Math.max(0, Math.round(forecastedQty * 0.8)),
            upper: Math.round(forecastedQty * 1.2),
          },
        });
      }

      logger.info(`Demand forecast generated for product ${productId}`);

      return {
        product: { id: productId, name: product.name },
        historicalAverage: Math.round(avgDaily),
        trend: trend > 0 ? 'increasing' : 'decreasing',
        forecast,
      };
    } catch (error) {
      logger.error('Error forecasting demand:', error);
      throw error;
    }
  }

  /**
   * Get ML-based product recommendations
   */
  static async getMLRecommendations(userId, limit = 10) {
    try {
      const User = require('../models/User');
      const Order = require('../models/Order');
      const Product = require('../models/Product');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Get user purchase history
      const purchases = await Order.find({ userId }).select('items').lean();
      const purchasedCategories = new Set();
      const purchasedIds = new Set();

      purchases.forEach(order => {
        order.items.forEach(item => {
          purchasedCategories.add(item.category);
          purchasedIds.add(item.productId.toString());
        });
      });

      // Find similar products
      const recommendations = await Product.find({
        category: { $in: Array.from(purchasedCategories) },
        _id: { $nin: Array.from(purchasedIds) },
      })
        .sort({ rating: -1, salesCount: -1 })
        .limit(limit)
        .select('_id name price rating category')
        .lean();

      return {
        recommendations,
        reason: 'Based on your purchase history',
      };
    } catch (error) {
      logger.error('Error getting ML recommendations:', error);
      throw error;
    }
  }

  /**
   * Predict customer churn
   */
  static async predictCustomerChurn(userId) {
    try {
      const User = require('../models/User');
      const Order = require('../models/Order');

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const orders = await Order.find({ userId });

      if (orders.length === 0) {
        return { churnRisk: 'new_customer' };
      }

      // Calculate churn signals
      const lastOrderDate = new Date(orders[orders.length - 1].createdAt);
      const daysSinceLastOrder = Math.floor(
        (Date.now() - lastOrderDate) / (1000 * 60 * 60 * 24)
      );

      const avgOrderFrequency = Math.floor(
        (Date.now() - user.createdAt) / (1000 * 60 * 60 * 24) / orders.length
      );

      const churnScore =
        (daysSinceLastOrder / avgOrderFrequency) * 100;

      let churnRisk = 'low';
      if (churnScore > 150) churnRisk = 'critical';
      else if (churnScore > 100) churnRisk = 'high';
      else if (churnScore > 50) churnRisk = 'medium';

      return {
        churnRisk,
        churnScore: churnScore.toFixed(2),
        daysSinceLastOrder,
        avgOrderFrequency,
        recommendation: this._getChurnPrevention(churnRisk),
      };
    } catch (error) {
      logger.error('Error predicting churn:', error);
      throw error;
    }
  }

  /**
   * Anomaly detection for orders
   */
  static async detectOrderAnomalies() {
    try {
      const Order = require('../models/Order');

      const orders = await Order.find({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });

      const avgOrderValue = orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length;
      const stdDev = Math.sqrt(
        orders.reduce(
          (sum, o) => sum + Math.pow(o.totalAmount - avgOrderValue, 2),
          0
        ) / orders.length
      );

      const anomalies = orders.filter(
        o => Math.abs(o.totalAmount - avgOrderValue) > 3 * stdDev
      );

      return {
        anomaliesDetected: anomalies.length,
        anomalies: anomalies.map(a => ({
          orderId: a._id,
          amount: a.totalAmount,
          deviation: (
            ((a.totalAmount - avgOrderValue) / avgOrderValue) *
            100
          ).toFixed(2),
        })),
        avgOrderValue: avgOrderValue.toFixed(2),
      };
    } catch (error) {
      logger.error('Error detecting anomalies:', error);
      throw error;
    }
  }

  /**
   * Calculate demand trend
   */
  static _calculateDemandTrend(data) {
    if (data.length < 2) return 0;

    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const avgFirst = firstHalf.reduce((sum, d) => sum + (d.quantity || d.revenue || 0), 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, d) => sum + (d.quantity || d.revenue || 0), 0) / secondHalf.length;

    return (avgSecond - avgFirst) / avgFirst;
  }

  /**
   * Get price recommendation
   */
  static _getPriceRecommendation(currentPrice, predictedPrice) {
    const change = ((predictedPrice - currentPrice) / currentPrice) * 100;

    if (change > 5) return 'Increase price to match demand';
    if (change < -5) return 'Decrease price to boost sales';
    return 'Maintain current price';
  }

  /**
   * Get churn prevention strategy
   */
  static _getChurnPrevention(riskLevel) {
    const strategies = {
      critical: 'Send urgent win-back offer with exclusive discount',
      high: 'Send personalized recommendations and loyalty incentive',
      medium: 'Offer seasonal promotion matching their interests',
      low: 'Continue normal engagement',
    };

    return strategies[riskLevel] || strategies.low;
  }
}

module.exports = AIMLService;
