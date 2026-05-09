/**
 * Vendor Performance Analytics Service
 * Phase 7: Multi-Vendor Optimization
 * 
 * Tracks vendor performance metrics including:
 * - Sales performance & trends
 * - Customer satisfaction & ratings
 * - Fulfillment efficiency
 * - Return/refund rates
 * - Growth metrics
 */

const Order = require('../models/Order');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Settlement = require('../models/Settlement');
const logger = require('../utils/logger');

class VendorPerformanceService {
  /**
   * Calculate comprehensive vendor performance metrics
   */
  async getVendorPerformanceMetrics(vendorId, daysBack = 30) {
    try {
      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      // Fetch relevant data
      const [orders, products, reviews, settlements] = await Promise.all([
        Order.find({
          sellerId: vendorId,
          createdAt: { $gte: startDate }
        }).lean(),
        Product.find({ vendorId }).lean(),
        Review.find({ vendorId, createdAt: { $gte: startDate } }).lean(),
        Settlement.find({ vendorId, createdAt: { $gte: startDate } }).lean()
      ]);

      // Calculate metrics
      const salesMetrics = this._calculateSalesMetrics(orders);
      const fulfillmentMetrics = this._calculateFulfillmentMetrics(orders);
      const customerSatisfaction = this._calculateCustomerSatisfaction(reviews);
      const productMetrics = this._calculateProductMetrics(products);
      const revenueMetrics = this._calculateRevenueMetrics(settlements);

      return {
        vendorId,
        period: {
          startDate,
          endDate: new Date(),
          days: daysBack
        },
        sales: salesMetrics,
        fulfillment: fulfillmentMetrics,
        customerSatisfaction,
        products: productMetrics,
        revenue: revenueMetrics,
        overallScore: this._calculateOverallScore(
          salesMetrics,
          fulfillmentMetrics,
          customerSatisfaction,
          productMetrics
        ),
        recommendations: this._generateRecommendations(
          salesMetrics,
          fulfillmentMetrics,
          customerSatisfaction
        )
      };
    } catch (error) {
      logger.error('Error calculating vendor performance metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate sales performance metrics
   */
  _calculateSalesMetrics(orders) {
    if (orders.length === 0) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        totalItems: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        returnedOrders: 0,
        conversionRate: 0,
        growthRate: 0
      };
    }

    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const returnedOrders = orders.filter(o => o.status === 'returned').length;
    
    const totalRevenue = orders.reduce((sum, order) => {
      const revenue = order.items?.reduce((itemSum, item) => 
        itemSum + (item.price * item.quantity), 0) || 0;
      return sum + revenue;
    }, 0);

    const totalItems = orders.reduce((sum, order) => 
      sum + (order.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0), 0);

    return {
      totalOrders: orders.length,
      totalRevenue: Math.round(totalRevenue),
      averageOrderValue: Math.round(totalRevenue / orders.length),
      totalItems,
      completedOrders,
      cancelledOrders,
      returnedOrders,
      conversionRate: ((completedOrders / orders.length) * 100).toFixed(2),
      cancellationRate: ((cancelledOrders / orders.length) * 100).toFixed(2),
      returnRate: ((returnedOrders / orders.length) * 100).toFixed(2)
    };
  }

  /**
   * Calculate fulfillment efficiency metrics
   */
  _calculateFulfillmentMetrics(orders) {
    if (orders.length === 0) {
      return {
        onTimeDelivery: 0,
        averageFulfillmentTime: 0,
        preparedOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        fulfillmentScore: 0
      };
    }

    let onTimeCount = 0;
    let totalFulfillmentTime = 0;
    let fulfillmentCount = 0;

    orders.forEach(order => {
      if (order.deliveredAt) {
        const createdTime = new Date(order.createdAt).getTime();
        const deliveredTime = new Date(order.deliveredAt).getTime();
        const fulfillmentTime = (deliveredTime - createdTime) / (1000 * 60 * 60); // hours

        totalFulfillmentTime += fulfillmentTime;
        fulfillmentCount++;

        if (fulfillmentTime <= 48) { // 2 days SLA
          onTimeCount++;
        }
      }
    });

    const preparedOrders = orders.filter(o => o.status === 'prepared').length;
    const shippedOrders = orders.filter(o => o.status === 'shipped').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

    return {
      onTimeDelivery: fulfillmentCount > 0 
        ? ((onTimeCount / fulfillmentCount) * 100).toFixed(2) 
        : 0,
      averageFulfillmentTime: fulfillmentCount > 0 
        ? Math.round(totalFulfillmentTime / fulfillmentCount) 
        : 0,
      preparedOrders,
      shippedOrders,
      deliveredOrders,
      fulfillmentScore: fulfillmentCount > 0 
        ? Math.min((onTimeCount / fulfillmentCount) * 100, 100).toFixed(2) 
        : 0
    };
  }

  /**
   * Calculate customer satisfaction metrics
   */
  _calculateCustomerSatisfaction(reviews) {
    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {
          fiveStar: 0,
          fourStar: 0,
          threeStar: 0,
          twoStar: 0,
          oneStar: 0
        },
        satisfactionScore: 0
      };
    }

    const ratingDistribution = {
      fiveStar: 0,
      fourStar: 0,
      threeStar: 0,
      twoStar: 0,
      oneStar: 0
    };

    let totalRating = 0;

    reviews.forEach(review => {
      totalRating += review.rating;
      
      switch (Math.floor(review.rating)) {
        case 5:
          ratingDistribution.fiveStar++;
          break;
        case 4:
          ratingDistribution.fourStar++;
          break;
        case 3:
          ratingDistribution.threeStar++;
          break;
        case 2:
          ratingDistribution.twoStar++;
          break;
        case 1:
          ratingDistribution.oneStar++;
          break;
      }
    });

    const averageRating = (totalRating / reviews.length).toFixed(2);
    const satisfactionScore = (averageRating / 5) * 100;

    return {
      averageRating,
      totalReviews: reviews.length,
      ratingDistribution,
      satisfactionScore: satisfactionScore.toFixed(2)
    };
  }

  /**
   * Calculate product performance metrics
   */
  _calculateProductMetrics(products) {
    return {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.status === 'active').length,
      inactiveProducts: products.filter(p => p.status === 'inactive').length,
      lowStockProducts: products.filter(p => p.stock <= 10).length,
      outOfStockProducts: products.filter(p => p.stock === 0).length,
      averagePrice: products.length > 0 
        ? Math.round(products.reduce((sum, p) => sum + p.price, 0) / products.length)
        : 0
    };
  }

  /**
   * Calculate revenue metrics from settlements
   */
  _calculateRevenueMetrics(settlements) {
    if (settlements.length === 0) {
      return {
        totalSettlements: 0,
        totalAmount: 0,
        pendingAmount: 0,
        paidAmount: 0,
        rejectedAmount: 0
      };
    }

    const totalAmount = settlements.reduce((sum, s) => sum + (s.amount || 0), 0);
    const paidAmount = settlements
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    const pendingAmount = settlements
      .filter(s => s.status === 'pending')
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    const rejectedAmount = settlements
      .filter(s => s.status === 'rejected')
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    return {
      totalSettlements: settlements.length,
      totalAmount: Math.round(totalAmount),
      pendingAmount: Math.round(pendingAmount),
      paidAmount: Math.round(paidAmount),
      rejectedAmount: Math.round(rejectedAmount)
    };
  }

  /**
   * Calculate overall performance score (0-100)
   */
  _calculateOverallScore(sales, fulfillment, satisfaction, products) {
    const weights = {
      fulfillment: 0.35,
      satisfaction: 0.35,
      sales: 0.20,
      products: 0.10
    };

    let score = 0;

    // Fulfillment score (0-100)
    score += parseFloat(fulfillment.fulfillmentScore || 0) * weights.fulfillment;

    // Satisfaction score (0-100)
    score += parseFloat(satisfaction.satisfactionScore || 0) * weights.satisfaction;

    // Sales conversion score (0-100)
    const conversionScore = parseFloat(sales.conversionRate || 0);
    score += Math.min(conversionScore, 100) * weights.sales;

    // Product health score
    const totalProducts = products.totalProducts || 1;
    const activeRatio = (products.activeProducts / totalProducts) * 100;
    score += Math.min(activeRatio, 100) * weights.products;

    return Math.round(score);
  }

  /**
   * Generate performance improvement recommendations
   */
  _generateRecommendations(sales, fulfillment, satisfaction) {
    const recommendations = [];

    // Fulfillment recommendations
    const onTimeDelivery = parseFloat(fulfillment.onTimeDelivery);
    if (onTimeDelivery < 85) {
      recommendations.push({
        type: 'fulfillment',
        priority: 'high',
        message: `On-time delivery rate is ${onTimeDelivery}%. Improve logistics to meet 85%+ target.`,
        action: 'Review fulfillment processes and optimize warehouse operations'
      });
    }

    // Customer satisfaction recommendations
    const avgRating = parseFloat(satisfaction.averageRating);
    if (avgRating < 4.0) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        message: `Average rating is ${avgRating}. Improve product quality and customer service.`,
        action: 'Analyze negative reviews and address common complaints'
      });
    }

    // Sales conversion recommendations
    const conversionRate = parseFloat(sales.conversionRate);
    if (conversionRate < 70) {
      recommendations.push({
        type: 'sales',
        priority: 'medium',
        message: `Order completion rate is ${conversionRate}%. Consider optimizing pricing or offers.`,
        action: 'Review pricing strategy and consider promotional campaigns'
      });
    }

    // Cancellation rate recommendations
    const cancellationRate = parseFloat(sales.cancellationRate);
    if (cancellationRate > 5) {
      recommendations.push({
        type: 'operations',
        priority: 'medium',
        message: `Cancellation rate is ${cancellationRate}%. Improve inventory management.`,
        action: 'Implement better inventory forecasting to avoid overselling'
      });
    }

    // Return rate recommendations
    const returnRate = parseFloat(sales.returnRate);
    if (returnRate > 3) {
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        message: `Return rate is ${returnRate}%. Review product descriptions and quality control.`,
        action: 'Audit product listings and improve quality assurance'
      });
    }

    return recommendations;
  }

  /**
   * Get vendor comparison benchmark
   */
  async getVendorBenchmark(vendorId, daysBack = 30) {
    try {
      const vendorMetrics = await this.getVendorPerformanceMetrics(vendorId, daysBack);

      // Calculate platform averages (simplified)
      const platformBenchmark = {
        averageOrderValue: 1200,
        averageRating: 4.2,
        onTimeDeliveryRate: 88,
        cancellationRate: 3.5,
        returnRate: 2.1,
        conversionRate: 75
      };

      return {
        vendor: vendorMetrics,
        benchmark: platformBenchmark,
        comparison: {
          orderValueGap: vendorMetrics.sales.averageOrderValue - platformBenchmark.averageOrderValue,
          ratingGap: parseFloat(vendorMetrics.customerSatisfaction.averageRating) - platformBenchmark.averageRating,
          deliveryGap: parseFloat(vendorMetrics.fulfillment.onTimeDelivery) - platformBenchmark.onTimeDeliveryRate,
          cancellationGap: platformBenchmark.cancellationRate - parseFloat(vendorMetrics.sales.cancellationRate),
          returnGap: platformBenchmark.returnRate - parseFloat(vendorMetrics.sales.returnRate),
          conversionGap: parseFloat(vendorMetrics.sales.conversionRate) - platformBenchmark.conversionRate
        }
      };
    } catch (error) {
      logger.error('Error calculating vendor benchmark:', error);
      throw error;
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(vendorId, daysBack = 30) {
    try {
      const metrics = await this.getVendorPerformanceMetrics(vendorId, daysBack);
      const benchmark = await this.getVendorBenchmark(vendorId, daysBack);

      return {
        reportDate: new Date(),
        vendorId,
        summary: {
          score: metrics.overallScore,
          status: metrics.overallScore >= 80 ? 'excellent' : metrics.overallScore >= 60 ? 'good' : 'needs_improvement',
          period: `${daysBack} days`
        },
        metrics,
        benchmark,
        insights: {
          strengths: this._identifyStrengths(metrics),
          weaknesses: this._identifyWeaknesses(metrics),
          opportunities: metrics.recommendations
        }
      };
    } catch (error) {
      logger.error('Error generating performance report:', error);
      throw error;
    }
  }

  /**
   * Identify vendor strengths
   */
  _identifyStrengths(metrics) {
    const strengths = [];

    if (parseFloat(metrics.fulfillment.onTimeDelivery) > 90) {
      strengths.push('Excellent on-time delivery performance');
    }

    if (parseFloat(metrics.customerSatisfaction.averageRating) >= 4.5) {
      strengths.push('Outstanding customer satisfaction');
    }

    if (parseFloat(metrics.sales.conversionRate) > 80) {
      strengths.push('High order completion rate');
    }

    if (metrics.sales.totalRevenue > 100000) {
      strengths.push('Strong revenue generation');
    }

    return strengths;
  }

  /**
   * Identify vendor weaknesses
   */
  _identifyWeaknesses(metrics) {
    const weaknesses = [];

    if (parseFloat(metrics.fulfillment.onTimeDelivery) < 75) {
      weaknesses.push('Fulfillment delays affecting customer satisfaction');
    }

    if (parseFloat(metrics.customerSatisfaction.averageRating) < 3.5) {
      weaknesses.push('Low customer ratings requiring immediate attention');
    }

    if (parseFloat(metrics.sales.cancellationRate) > 8) {
      weaknesses.push('High order cancellation rate');
    }

    if (parseFloat(metrics.sales.returnRate) > 5) {
      weaknesses.push('Elevated return rates indicating quality issues');
    }

    if (metrics.products.outOfStockProducts > metrics.products.activeProducts * 0.2) {
      weaknesses.push('Significant out-of-stock inventory');
    }

    return weaknesses;
  }
}

module.exports = new VendorPerformanceService();
