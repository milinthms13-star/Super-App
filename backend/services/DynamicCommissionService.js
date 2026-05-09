/**
 * Dynamic Commission Management Service
 * Phase 7: Advanced Revenue Features
 * 
 * Manages:
 * - Performance-based commission tiers
 * - Category-specific commissions
 * - Volume-based discounts
 * - Historical commission tracking
 * - Commission reconciliation
 */

const Commission = require('../models/Commission');
const Order = require('../models/Order');
const Settlement = require('../models/Settlement');
const VendorPerformanceService = require('./VendorPerformanceService');
const logger = require('../utils/logger');

class DynamicCommissionService {
  /**
   * Calculate commission based on multiple factors
   */
  async calculateDynamicCommission(orderId, vendorId) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      // Get base commission
      const baseCommission = await this._getBaseCommission(vendorId, order.category);

      // Get performance multiplier
      const performanceMultiplier = await this._getPerformanceMultiplier(vendorId);

      // Get volume discount
      const volumeDiscount = await this._getVolumeDiscount(vendorId);

      // Get seasonal adjustment
      const seasonalAdjustment = this._getSeasonalAdjustment(order.category);

      // Calculate final commission
      const orderValue = order.items.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0);

      const finalCommissionRate = baseCommission 
        * performanceMultiplier 
        * (1 - volumeDiscount) 
        * seasonalAdjustment;

      const commissionAmount = Math.round(orderValue * (finalCommissionRate / 100));

      return {
        orderId,
        vendorId,
        orderValue: Math.round(orderValue),
        baseCommissionRate: baseCommission,
        performanceMultiplier: performanceMultiplier.toFixed(2),
        volumeDiscount: (volumeDiscount * 100).toFixed(2),
        seasonalAdjustment: seasonalAdjustment.toFixed(2),
        finalCommissionRate: finalCommissionRate.toFixed(2),
        commissionAmount,
        breakdown: {
          baseAmount: Math.round(orderValue * (baseCommission / 100)),
          performanceAdjustment: Math.round(orderValue * (baseCommission / 100) * (performanceMultiplier - 1)),
          volumeAdjustment: -Math.round(orderValue * (baseCommission / 100) * volumeDiscount),
          seasonalAdjustment: Math.round(orderValue * (baseCommission / 100) * (seasonalAdjustment - 1))
        }
      };
    } catch (error) {
      logger.error('Error calculating dynamic commission:', error);
      throw error;
    }
  }

  /**
   * Get base commission for category
   */
  async _getBaseCommission(vendorId, category) {
    try {
      const commission = await Commission.findOne({ vendorId, category });

      if (commission) {
        return commission.rate;
      }

      // Default category commissions
      const defaultRates = {
        electronics: 12,
        fashion: 18,
        home: 15,
        food: 20,
        beauty: 15,
        sports: 14,
        default: 16
      };

      return defaultRates[category?.toLowerCase()] || defaultRates.default;
    } catch (error) {
      logger.error('Error fetching base commission:', error);
      return 16; // Default fallback
    }
  }

  /**
   * Get performance-based multiplier (0.8x to 1.2x)
   */
  async _getPerformanceMultiplier(vendorId) {
    try {
      const metrics = await VendorPerformanceService.getVendorPerformanceMetrics(vendorId, 30);

      const overallScore = metrics.overallScore;

      if (overallScore >= 90) return 1.2; // 20% bonus
      if (overallScore >= 80) return 1.1; // 10% bonus
      if (overallScore >= 70) return 1.0; // No adjustment
      if (overallScore >= 60) return 0.95; // 5% penalty
      return 0.85; // 15% penalty
    } catch (error) {
      logger.warn('Error calculating performance multiplier, using default:', error);
      return 1.0;
    }
  }

  /**
   * Get volume-based discount (0 to 0.15)
   */
  async _getVolumeDiscount(vendorId) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const orders = await Order.find({
        sellerId: vendorId,
        createdAt: { $gte: thirtyDaysAgo },
        status: 'delivered'
      });

      const totalVolume = orders.reduce((sum, order) => 
        sum + order.items.reduce((s, item) => s + (item.price * item.quantity), 0), 0);

      if (totalVolume >= 1000000) return 0.15; // 15% discount
      if (totalVolume >= 500000) return 0.12; // 12% discount
      if (totalVolume >= 250000) return 0.10; // 10% discount
      if (totalVolume >= 100000) return 0.05; // 5% discount
      return 0.0;
    } catch (error) {
      logger.warn('Error calculating volume discount, using default:', error);
      return 0.0;
    }
  }

  /**
   * Get seasonal adjustment
   */
  _getSeasonalAdjustment(category) {
    const month = new Date().getMonth();
    const isFestiveSeason = [10, 11, 0, 1].includes(month); // Oct-Jan
    const isOffseasonCategory = ['fashion', 'home', 'sports'].includes(category?.toLowerCase());

    if (isFestiveSeason && isOffseasonCategory) return 0.9; // 10% commission reduction during festive season for off-season categories
    if (isFestiveSeason) return 1.05; // 5% commission increase during festive season
    return 1.0;
  }

  /**
   * Create commission tier configuration
   */
  async createCommissionTier(vendorId, config) {
    try {
      const {
        category,
        baseRate,
        performanceTiers,
        volumeTiers,
        specialRules
      } = config;

      const commission = new Commission({
        vendorId,
        category,
        rate: baseRate,
        performanceTiers: performanceTiers || [
          { minScore: 90, multiplier: 1.2 },
          { minScore: 80, multiplier: 1.1 },
          { minScore: 70, multiplier: 1.0 },
          { minScore: 60, multiplier: 0.95 },
          { minScore: 0, multiplier: 0.85 }
        ],
        volumeTiers: volumeTiers || [
          { minVolume: 1000000, discount: 0.15 },
          { minVolume: 500000, discount: 0.12 },
          { minVolume: 250000, discount: 0.10 },
          { minVolume: 100000, discount: 0.05 }
        ],
        specialRules,
        createdAt: new Date(),
        active: true
      });

      await commission.save();

      logger.info(`Commission tier created for vendor ${vendorId} in category ${category}`);

      return commission;
    } catch (error) {
      logger.error('Error creating commission tier:', error);
      throw error;
    }
  }

  /**
   * Get commission history
   */
  async getCommissionHistory(vendorId, limit = 100) {
    try {
      const settlements = await Settlement.find({ vendorId })
        .select('vendorId amount commissionRate createdAt status')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return settlements.map(s => ({
        ...s,
        commissionAmount: Math.round(s.amount * (s.commissionRate / 100))
      }));
    } catch (error) {
      logger.error('Error fetching commission history:', error);
      throw error;
    }
  }

  /**
   * Reconcile commissions
   */
  async reconcileCommissions(vendorId, startDate, endDate) {
    try {
      const orders = await Order.find({
        sellerId: vendorId,
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      });

      let totalRevenue = 0;
      let totalCommissions = 0;
      const commissionBreakdown = {};

      for (const order of orders) {
        const orderRevenue = order.items.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0);

        const commission = await this.calculateDynamicCommission(order._id, vendorId);

        totalRevenue += orderRevenue;
        totalCommissions += commission.commissionAmount;

        const category = order.category || 'uncategorized';
        if (!commissionBreakdown[category]) {
          commissionBreakdown[category] = { revenue: 0, commission: 0, orders: 0 };
        }
        commissionBreakdown[category].revenue += orderRevenue;
        commissionBreakdown[category].commission += commission.commissionAmount;
        commissionBreakdown[category].orders += 1;
      }

      return {
        vendorId,
        period: { startDate, endDate },
        totalOrders: orders.length,
        totalRevenue: Math.round(totalRevenue),
        totalCommissions: Math.round(totalCommissions),
        netRevenue: Math.round(totalRevenue - totalCommissions),
        averageCommissionRate: orders.length > 0 
          ? ((totalCommissions / totalRevenue) * 100).toFixed(2)
          : 0,
        breakdown: Object.entries(commissionBreakdown).reduce((acc, [category, data]) => {
          acc[category] = {
            ...data,
            revenue: Math.round(data.revenue),
            commission: Math.round(data.commission),
            rate: ((data.commission / data.revenue) * 100).toFixed(2)
          };
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Error reconciling commissions:', error);
      throw error;
    }
  }

  /**
   * Update commission configuration
   */
  async updateCommissionConfig(vendorId, category, newConfig) {
    try {
      const commission = await Commission.findOneAndUpdate(
        { vendorId, category },
        newConfig,
        { new: true }
      );

      logger.info(`Commission config updated for vendor ${vendorId} in category ${category}`);

      return commission;
    } catch (error) {
      logger.error('Error updating commission config:', error);
      throw error;
    }
  }

  /**
   * Get commission comparison (vendor vs platform average)
   */
  async getCommissionComparison(vendorId, category) {
    try {
      const vendorCommission = await Commission.findOne({ vendorId, category });

      // Calculate platform average (simplified)
      const allCommissions = await Commission.find({ category });
      const platformAverage = allCommissions.length > 0
        ? allCommissions.reduce((sum, c) => sum + c.rate, 0) / allCommissions.length
        : 16;

      const vendorRate = vendorCommission?.rate || (await this._getBaseCommission(vendorId, category));

      return {
        vendorId,
        category,
        vendorRate,
        platformAverage: platformAverage.toFixed(2),
        difference: (vendorRate - platformAverage).toFixed(2),
        isAboveAverage: vendorRate > platformAverage
      };
    } catch (error) {
      logger.error('Error getting commission comparison:', error);
      throw error;
    }
  }
}

module.exports = new DynamicCommissionService();
