/**
 * BusinessIntelligenceService.js
 * BI dashboards, custom queries, data warehousing
 */

const logger = require('../config/logger');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Review = require('../models/Review');

class BusinessIntelligenceService {
  /**
   * Get executive dashboard (high-level KPIs)
   */
  static async getExecutiveDashboard(period = 30) {
    try {
      const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

      const [totalRevenue, totalOrders, activeUsers, topProducts] = await Promise.all([
        Order.aggregate([
          { $match: { createdAt: { $gte: startDate }, status: { $in: ['confirmed', 'delivered'] } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]),
        Order.countDocuments({ createdAt: { $gte: startDate } }),
        User.countDocuments({ lastSeenAt: { $gte: startDate } }),
        Product.find({}).sort({ sales: -1 }).limit(5)
      ]);

      return {
        success: true,
        period,
        kpis: {
          totalRevenue: totalRevenue[0]?.total || 0,
          totalOrders,
          activeUsers,
          topProducts: topProducts.map(p => ({ name: p.name, sales: p.sales }))
        }
      };
    } catch (error) {
      logger.error(`Executive dashboard error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Revenue analytics by period
   */
  static async getRevenueAnalytics(period = 'daily', startDate, endDate) {
    try {
      const groupBy = {
        'daily': { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        'weekly': { $isoWeek: '$createdAt' },
        'monthly': { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
      };

      const revenue = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
            status: { $in: ['confirmed', 'delivered'] }
          }
        },
        {
          $group: {
            _id: groupBy[period] || groupBy.daily,
            total: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
            avgOrderValue: { $avg: '$totalAmount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return { success: true, period, revenue };
    } catch (error) {
      logger.error(`Revenue analytics error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Customer segmentation analysis
   */
  static async getCustomerSegmentation() {
    try {
      const segments = await Order.aggregate([
        {
          $group: {
            _id: '$buyerId',
            orderCount: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
            avgOrderValue: { $avg: '$totalAmount' }
          }
        },
        {
          $facet: {
            highValue: [
              { $match: { totalSpent: { $gte: 10000 } } },
              { $count: 'count' }
            ],
            midValue: [
              { $match: { totalSpent: { $gte: 1000, $lt: 10000 } } },
              { $count: 'count' }
            ],
            lowValue: [
              { $match: { totalSpent: { $lt: 1000 } } },
              { $count: 'count' }
            ],
            frequent: [
              { $match: { orderCount: { $gte: 10 } } },
              { $count: 'count' }
            ]
          }
        }
      ]);

      return {
        success: true,
        segmentation: segments[0]
      };
    } catch (error) {
      logger.error(`Customer segmentation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Product performance analytics
   */
  static async getProductPerformance(vendorId = null) {
    try {
      let match = {};
      if (vendorId) match.vendorId = vendorId;

      const performance = await Product.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$category',
            totalProducts: { $sum: 1 },
            avgPrice: { $avg: '$price' },
            avgRating: { $avg: '$averageRating' },
            totalReviews: { $sum: { $size: { $ifNull: ['$reviews', []] } } }
          }
        },
        { $sort: { totalProducts: -1 } }
      ]);

      return { success: true, performance };
    } catch (error) {
      logger.error(`Product performance error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Custom data query builder
   */
  static async executeCustomQuery(queryConfig) {
    try {
      const { model, match, group, sort, limit = 100 } = queryConfig;
      
      let pipeline = [];
      if (match) pipeline.push({ $match: match });
      if (group) pipeline.push({ $group: group });
      if (sort) pipeline.push({ $sort: sort });
      pipeline.push({ $limit: limit });

      const Model = { Product, Order, User, Review }[model];
      if (!Model) throw new Error('Invalid model');

      const results = await Model.aggregate(pipeline);

      return { success: true, model, resultCount: results.length, results };
    } catch (error) {
      logger.error(`Custom query error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cohort retention analysis
   */
  static async getCohortAnalysis(period = 'monthly') {
    try {
      const cohorts = await User.aggregate([
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m', date: '$createdAt' }
            },
            newUsers: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Calculate retention (simplified)
      const retention = cohorts.map((cohort, idx) => ({
        cohort: cohort._id,
        size: cohort.newUsers,
        retention: idx > 0 ? ((cohorts[idx - 1].newUsers - cohort.newUsers) / cohorts[idx - 1].newUsers * 100).toFixed(2) : 100
      }));

      return { success: true, retention };
    } catch (error) {
      logger.error(`Cohort analysis error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Inventory forecasting
   */
  static async getInventoryForecast() {
    try {
      const forecast = await Product.aggregate([
        {
          $lookup: {
            from: 'orders',
            localField: '_id',
            foreignField: 'products.productId',
            as: 'orders'
          }
        },
        {
          $project: {
            name: 1,
            stock: 1,
            sales: { $size: '$orders' },
            predictedDaysUntilStockout: {
              $cond: [
                { $eq: [{ $size: '$orders' }, 0] },
                'N/A',
                { $divide: ['$stock', { $divide: [{ $size: '$orders' }, 30] }] }
              ]
            }
          }
        },
        { $sort: { predictedDaysUntilStockout: 1 } }
      ]);

      return { success: true, forecast };
    } catch (error) {
      logger.error(`Inventory forecast error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Data warehouse snapshot
   */
  static async createDataWarehouseSnapshot() {
    try {
      const [productCount, orderCount, userCount, totalRevenue] = await Promise.all([
        Product.countDocuments(),
        Order.countDocuments(),
        User.countDocuments(),
        Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }])
      ]);

      const snapshot = {
        timestamp: new Date(),
        metrics: {
          products: productCount,
          orders: orderCount,
          users: userCount,
          totalRevenue: totalRevenue[0]?.total || 0
        }
      };

      logger.info('Data warehouse snapshot created');
      return { success: true, snapshot };
    } catch (error) {
      logger.error(`Data warehouse snapshot error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = BusinessIntelligenceService;
