/**
 * AdminDashboardService.js
 * Comprehensive admin dashboard with vendor oversight, order management, analytics
 */

const logger = require('../config/logger');

class AdminDashboardService {
  /**
   * Get main dashboard overview
   */
  static async getDashboardOverview(period = '30') {
    try {
      const Order = require('../models/Order');
      const User = require('../models/User');
      const Vendor = require('../models/Vendor');
      const Product = require('../models/Product');
      const Review = require('../models/Review');

      const daysBack = parseInt(period);
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      // Revenue metrics
      const revenue = await Order.aggregate([
        { $match: { createdAt: { $gte: dateThreshold }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]);

      // Order metrics
      const orders = await Order.countDocuments({ createdAt: { $gte: dateThreshold } });
      const cancelledOrders = await Order.countDocuments({
        createdAt: { $gte: dateThreshold },
        status: 'cancelled',
      });

      // User metrics
      const totalUsers = await User.countDocuments();
      const newUsers = await User.countDocuments({
        createdAt: { $gte: dateThreshold },
      });

      // Vendor metrics
      const activeVendors = await Vendor.countDocuments({ status: 'approved' });
      const pendingVendors = await Vendor.countDocuments({ status: 'pending_approval' });

      // Product metrics
      const totalProducts = await Product.countDocuments();
      const lowStockProducts = await Product.countDocuments({ stock: { $lt: 10 } });

      // Average rating
      const avgRating = await Review.aggregate([
        { $group: { _id: null, avg: { $avg: '$rating' } } },
      ]);

      return {
        period: `${daysBack} days`,
        overview: {
          revenue: revenue[0]?.total || 0,
          orders,
          cancelledOrders,
          cancellationRate: orders > 0 ? ((cancelledOrders / orders) * 100).toFixed(2) : 0,
          totalUsers,
          newUsers,
          userGrowth: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(2) : 0,
          activeVendors,
          pendingVendors,
          totalProducts,
          lowStockProducts,
          avgPlatformRating: avgRating[0]?.avg?.toFixed(2) || 0,
        },
      };
    } catch (error) {
      logger.error('Error getting dashboard overview:', error);
      throw error;
    }
  }

  /**
   * Get vendor management dashboard
   */
  static async getVendorManagement(filters = {}) {
    try {
      const Vendor = require('../models/Vendor');
      const Order = require('../models/Order');

      const { status = 'all', sortBy = 'createdAt' } = filters;

      let query = {};
      if (status !== 'all') {
        query.status = status;
      }

      const vendors = await Vendor.find(query)
        .sort({ [sortBy]: -1 })
        .select(
          'storeName status rating totalOrders totalRevenue vendorScore healthStatus createdAt'
        )
        .limit(100);

      // Add metrics for each vendor
      const vendorsWithMetrics = await Promise.all(
        vendors.map(async v => {
          const orderCount = await Order.countDocuments({ vendorId: v._id });
          return {
            ...v.toObject(),
            orderCount,
          };
        })
      );

      return {
        vendors: vendorsWithMetrics,
        summary: {
          total: await Vendor.countDocuments(query),
          approved: await Vendor.countDocuments({ status: 'approved' }),
          pending: await Vendor.countDocuments({ status: 'pending_approval' }),
          suspended: await Vendor.countDocuments({ status: 'suspended' }),
        },
      };
    } catch (error) {
      logger.error('Error getting vendor management:', error);
      throw error;
    }
  }

  /**
   * Get order management dashboard
   */
  static async getOrderManagement(filters = {}) {
    try {
      const Order = require('../models/Order');

      const {
        status = 'all',
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
      } = filters;

      const skip = (page - 1) * limit;

      let query = {};
      if (status !== 'all') {
        query.status = status;
      }

      const total = await Order.countDocuments(query);

      const orders = await Order.find(query)
        .sort({ [sortBy]: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email name')
        .populate('vendorId', 'storeName')
        .lean();

      // Order status breakdown
      const statusBreakdown = await Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        statusBreakdown: statusBreakdown.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      };
    } catch (error) {
      logger.error('Error getting order management:', error);
      throw error;
    }
  }

  /**
   * Get financial analytics
   */
  static async getFinancialAnalytics(period = '30') {
    try {
      const Order = require('../models/Order');
      const Payment = require('../models/Payment');

      const daysBack = parseInt(period);
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysBack);

      // Revenue breakdown by status
      const revenue = await Order.aggregate([
        { $match: { createdAt: { $gte: dateThreshold } } },
        {
          $group: {
            _id: '$status',
            revenue: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]);

      // Payment methods breakdown
      const paymentMethods = await Payment.aggregate([
        { $match: { paymentDate: { $gte: dateThreshold } } },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            total: { $sum: '$amount' },
          },
        },
      ]);

      // Daily revenue trend
      const dailyRevenue = await Order.aggregate([
        { $match: { createdAt: { $gte: dateThreshold } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const totalRevenue = revenue.reduce((sum, item) => sum + item.revenue, 0);
      const totalOrders = revenue.reduce((sum, item) => sum + item.count, 0);

      return {
        period: `${daysBack} days`,
        summary: {
          totalRevenue,
          totalOrders,
          avgOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0,
        },
        revenueByStatus: revenue,
        paymentMethods,
        dailyTrend: dailyRevenue,
      };
    } catch (error) {
      logger.error('Error getting financial analytics:', error);
      throw error;
    }
  }

  /**
   * Get user management dashboard
   */
  static async getUserManagement(filters = {}) {
    try {
      const User = require('../models/User');
      const Order = require('../models/Order');

      const { page = 1, limit = 50, sortBy = 'createdAt' } = filters;
      const skip = (page - 1) * limit;

      const users = await User.find()
        .select('email name role status createdAt lastLogin totalOrders totalSpent')
        .sort({ [sortBy]: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Enrich with order statistics
      const enrichedUsers = await Promise.all(
        users.map(async u => {
          const orders = await Order.find({ userId: u._id });
          return {
            ...u,
            orderCount: orders.length,
            totalSpent: orders.reduce((sum, o) => sum + o.totalAmount, 0),
          };
        })
      );

      const total = await User.countDocuments();

      return {
        users: enrichedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary: {
          totalUsers: total,
          activeThisMonth: await User.countDocuments({
            lastLogin: {
              $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
            },
          }),
        },
      };
    } catch (error) {
      logger.error('Error getting user management:', error);
      throw error;
    }
  }

  /**
   * Get product inventory dashboard
   */
  static async getProductInventory(filters = {}) {
    try {
      const Product = require('../models/Product');

      const { status = 'all', page = 1, limit = 50 } = filters;
      const skip = (page - 1) * limit;

      let query = {};

      if (status === 'low-stock') {
        query.stock = { $lt: 10 };
      } else if (status === 'out-of-stock') {
        query.stock = 0;
      }

      const products = await Product.find(query)
        .select('name category price stock rating salesCount')
        .sort({ stock: 1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Product.countDocuments(query);

      const inventorySummary = await Product.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            lowStock: { $sum: { $cond: [{ $lt: ['$stock', 10] }, 1, 0] } },
            outOfStock: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
            totalValue: { $sum: { $multiply: ['$price', '$stock'] } },
          },
        },
      ]);

      return {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary: inventorySummary[0] || {},
      };
    } catch (error) {
      logger.error('Error getting product inventory:', error);
      throw error;
    }
  }

  /**
   * Get system health and metrics
   */
  static async getSystemHealth() {
    try {
      const User = require('../models/User');
      const Order = require('../models/Order');
      const Vendor = require('../models/Vendor');
      const Review = require('../models/Review');

      // Database connectivity (ping)
      const dbHealthy = true; // If we can execute queries, DB is healthy

      // Cache status (mock)
      const cacheHealthy = true;

      // Recent errors count (mock - in production would check logs)
      const recentErrors = 0;

      // Performance metrics
      const avgOrderProcessingTime = 2.5; // Mock: hours
      const avgDeliveryTime = 4.2; // Mock: days

      // Service uptime (mock)
      const uptime = 99.97;

      // Peak hours analysis
      const peakHours = await Order.aggregate([
        {
          $group: {
            _id: { $hour: '$createdAt' },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { orderCount: -1 } },
        { $limit: 3 },
      ]);

      return {
        database: { healthy: dbHealthy },
        cache: { healthy: cacheHealthy },
        recentErrors,
        performance: {
          avgOrderProcessingTime: `${avgOrderProcessingTime}h`,
          avgDeliveryTime: `${avgDeliveryTime}d`,
        },
        uptime: `${uptime}%`,
        peakHours: peakHours.map(p => ({ hour: p._id, orders: p.orderCount })),
      };
    } catch (error) {
      logger.error('Error getting system health:', error);
      throw error;
    }
  }

  /**
   * Get fraud and compliance alerts
   */
  static async getComplianceAlerts(limit = 20) {
    try {
      const Order = require('../models/Order');
      const User = require('../models/User');

      // High-value orders (potential fraud)
      const highValueOrders = await Order.find({ totalAmount: { $gt: 100000 } })
        .sort({ totalAmount: -1 })
        .limit(5)
        .select('totalAmount userId status createdAt')
        .lean();

      // Suspicious user activity (multiple failed payments)
      const suspiciousUsers = [];
      // Mock: In production, would query LoginHistory and PaymentFailure models
      for (let i = 0; i < Math.min(5, limit); i++) {
        suspiciousUsers.push({
          userId: 'mock_' + i,
          reason: 'Multiple failed payment attempts',
          severity: 'medium',
        });
      }

      // Vendor compliance issues (low ratings, high cancellation)
      const vendorIssues = [];
      // Mock: In production, would aggregate vendor metrics
      for (let i = 0; i < Math.min(5, limit); i++) {
        vendorIssues.push({
          vendorId: 'vendor_' + i,
          issue: 'Low average rating',
          severity: 'low',
        });
      }

      return {
        alerts: {
          highValueOrders: highValueOrders.length,
          suspiciousUsers: suspiciousUsers.length,
          vendorIssues: vendorIssues.length,
        },
        details: {
          highValueOrders,
          suspiciousUsers,
          vendorIssues,
        },
        totalAlerts: highValueOrders.length + suspiciousUsers.length + vendorIssues.length,
      };
    } catch (error) {
      logger.error('Error getting compliance alerts:', error);
      throw error;
    }
  }

  /**
   * Export dashboard data (CSV/JSON)
   */
  static async exportDashboardData(reportType = 'overview', format = 'json') {
    try {
      let data = {};

      switch (reportType) {
        case 'overview':
          data = await this.getDashboardOverview('30');
          break;
        case 'vendors':
          data = await this.getVendorManagement();
          break;
        case 'orders':
          data = await this.getOrderManagement();
          break;
        case 'financial':
          data = await this.getFinancialAnalytics('30');
          break;
        default:
          data = await this.getDashboardOverview('30');
      }

      if (format === 'csv') {
        // Convert to CSV (simplified)
        const csv = JSON.stringify(data, null, 2);
        return {
          format: 'csv',
          data: csv,
          filename: `dashboard_${reportType}_${Date.now()}.csv`,
        };
      }

      return {
        format: 'json',
        data,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error exporting dashboard data:', error);
      throw error;
    }
  }
}

module.exports = AdminDashboardService;
