/**
 * Churn Prediction Service - Phase 14
 * Predict user and merchant churn risk
 */

const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const logger = require('./logger');

class ChurnPredictionService {
  /**
   * Calculate churn risk score for user
   */
  static async getUserChurnRisk(userId, lookbackDays = 90) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - lookbackDays);

      // Gather user activity metrics
      const metrics = await this.getUserMetrics(userId, startDate, endDate);

      // Calculate churn score
      const churnScore = this.calculateChurnScore(metrics, user);

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(metrics, churnScore);

      return {
        userId,
        churnRisk: churnScore,
        riskLevel: this.getRiskLevel(churnScore),
        riskFactors,
        metrics,
        recommendations: this.getRetentionRecommendations(riskFactors),
        analysisDate: new Date()
      };
    } catch (error) {
      logger.error('Error calculating churn risk:', error);
      throw error;
    }
  }

  /**
   * Get user activity metrics
   */
  static async getUserMetrics(userId, startDate, endDate) {
    const orders = await Order.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const payments = await Payment.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed'
    });

    const subscriptions = await Subscription.find({
      userId,
      status: 'active'
    });

    const lastOrder = await Order.findOne({ userId }).sort({ createdAt: -1 });
    const daysSinceLastOrder = lastOrder
      ? Math.floor((new Date() - lastOrder.createdAt) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      orderCount: orders.length,
      totalSpend: payments.reduce((sum, p) => sum + p.amount, 0),
      averageOrderValue: orders.length > 0 ? payments.reduce((sum, p) => sum + p.amount, 0) / orders.length : 0,
      daysSinceLastOrder,
      activeSubscriptions: subscriptions.length,
      orderTrend: this.calculateOrderTrend(orders),
      spendTrend: this.calculateSpendTrend(payments)
    };
  }

  /**
   * Calculate churn score (0-100)
   */
  static calculateChurnScore(metrics, user) {
    let score = 0;

    // Recency (40% weight)
    if (metrics.daysSinceLastOrder < 7) score += 0; // Very active
    else if (metrics.daysSinceLastOrder < 30) score += 10;
    else if (metrics.daysSinceLastOrder < 60) score += 25;
    else if (metrics.daysSinceLastOrder < 90) score += 40;
    else score += 40; // High risk

    // Frequency (30% weight)
    if (metrics.orderCount > 20) score += 0; // Very frequent
    else if (metrics.orderCount > 10) score += 7.5;
    else if (metrics.orderCount > 5) score += 15;
    else if (metrics.orderCount > 2) score += 20;
    else score += 30; // Low frequency

    // Monetary (20% weight)
    const avgSpend = metrics.totalSpend / Math.max(metrics.orderCount, 1);
    if (avgSpend > 5000) score += 0; // High value
    else if (avgSpend > 2000) score += 5;
    else if (avgSpend > 500) score += 10;
    else score += 20;

    // Subscription status (10% weight)
    if (metrics.activeSubscriptions > 0) score -= 10; // Lower risk if subscribed

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Identify risk factors
   */
  static identifyRiskFactors(metrics, churnScore) {
    const factors = [];

    if (metrics.daysSinceLastOrder > 60) {
      factors.push({
        factor: 'Inactivity',
        severity: 'high',
        description: `No orders in ${metrics.daysSinceLastOrder} days`
      });
    }

    if (metrics.orderTrend === 'declining') {
      factors.push({
        factor: 'Declining Activity',
        severity: 'high',
        description: 'Order frequency is decreasing'
      });
    }

    if (metrics.spendTrend === 'declining') {
      factors.push({
        factor: 'Declining Spend',
        severity: 'medium',
        description: 'Average order value is decreasing'
      });
    }

    if (metrics.orderCount === 0) {
      factors.push({
        factor: 'New User',
        severity: 'medium',
        description: 'No purchase history'
      });
    }

    if (metrics.averageOrderValue < 100) {
      factors.push({
        factor: 'Low Order Value',
        severity: 'low',
        description: 'Low average order value'
      });
    }

    return factors;
  }

  /**
   * Get risk level
   */
  static getRiskLevel(score) {
    if (score < 20) return 'low';
    if (score < 50) return 'medium';
    if (score < 75) return 'high';
    return 'critical';
  }

  /**
   * Get retention recommendations
   */
  static getRetentionRecommendations(riskFactors) {
    const recommendations = [];

    riskFactors.forEach(factor => {
      switch (factor.factor) {
        case 'Inactivity':
          recommendations.push('Send re-engagement email with special offer');
          recommendations.push('Offer personalized recommendations');
          break;
        case 'Declining Activity':
          recommendations.push('Send loyalty rewards promotion');
          recommendations.push('Highlight new products in their category');
          break;
        case 'Declining Spend':
          recommendations.push('Offer discount on future purchases');
          recommendations.push('Send premium product recommendations');
          break;
        case 'New User':
          recommendations.push('Send onboarding email series');
          recommendations.push('Offer first-purchase discount');
          break;
      }
    });

    return [...new Set(recommendations)];
  }

  /**
   * Calculate order trend
   */
  static calculateOrderTrend(orders) {
    if (orders.length < 2) return 'stable';

    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const recentOrders = orders.filter(o => new Date(o.createdAt) > twoWeeksAgo).length;
    const previousOrders = orders.filter(o => new Date(o.createdAt) > fourWeeksAgo && new Date(o.createdAt) <= twoWeeksAgo).length;

    if (recentOrders > previousOrders) return 'growing';
    if (recentOrders < previousOrders) return 'declining';
    return 'stable';
  }

  /**
   * Calculate spend trend
   */
  static calculateSpendTrend(payments) {
    if (payments.length < 2) return 'stable';

    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const recentSpend = payments
      .filter(p => new Date(p.createdAt) > twoWeeksAgo)
      .reduce((sum, p) => sum + p.amount, 0);

    const previousSpend = payments
      .filter(p => new Date(p.createdAt) > fourWeeksAgo && new Date(p.createdAt) <= twoWeeksAgo)
      .reduce((sum, p) => sum + p.amount, 0);

    if (recentSpend > previousSpend) return 'growing';
    if (recentSpend < previousSpend) return 'declining';
    return 'stable';
  }

  /**
   * Get high-risk users for bulk action
   */
  static async getHighRiskUsers(riskLevel = 'high', limit = 100) {
    try {
      const users = await User.find({ status: 'active' }).limit(limit * 2);

      const riskScores = await Promise.all(
        users.map(user => this.getUserChurnRisk(user._id))
      );

      return riskScores
        .filter(r => r.riskLevel === riskLevel || (riskLevel === 'high' && ['high', 'critical'].includes(r.riskLevel)))
        .sort((a, b) => b.churnRisk - a.churnRisk)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error getting high-risk users:', error);
      throw error;
    }
  }
}

module.exports = ChurnPredictionService;
