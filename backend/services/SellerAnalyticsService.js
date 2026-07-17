/**
 * Seller Analytics Service
 * Provides comprehensive analytics for seller dashboard
 */

const EcommerceSellerProfile = require('../models/EcommerceSellerProfile');
const EcommerceTransaction = require('../models/EcommerceTransaction');
const Product = require('../models/Product');
const Order = require('../models/Order');
const logger = require('../utils/logger');

class SellerAnalyticsService {
  /**
   * Get comprehensive dashboard overview
   */
  static async getDashboardOverview(sellerId) {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      if (!seller) {
        throw new Error('Seller not found');
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get current month stats
      const currentMonthStats = await this.getRevenueSummary(sellerId, startOfMonth, now);
      
      // Get last month stats
      const lastMonthStats = await this.getRevenueSummary(sellerId, startOfLastMonth, endOfLastMonth);

      // Get product stats
      const productStats = await this.getProductStats(sellerId);

      // Get top products
      const topProducts = await this.getTopProducts(sellerId, 5);

      // Get recent orders
      const recentOrders = await this.getRecentOrders(sellerId, 10);

      // Calculate growth rates
      const revenueGrowth = this.calculateGrowth(
        currentMonthStats.totalRevenue,
        lastMonthStats.totalRevenue
      );
      const ordersGrowth = this.calculateGrowth(
        currentMonthStats.totalOrders,
        lastMonthStats.totalOrders
      );

      return {
        seller: {
          id: seller._id,
          businessName: seller.businessName,
          subscriptionPlan: seller.subscription.plan,
          commissionRate: seller.commissionConfig.rate,
        },
        currentMonth: currentMonthStats,
        lastMonth: lastMonthStats,
        growth: {
          revenue: revenueGrowth,
          orders: ordersGrowth,
        },
        products: productStats,
        topProducts,
        recentOrders,
        metrics: seller.metrics,
      };
    } catch (error) {
      logger.error('Error getting dashboard overview:', error);
      throw error;
    }
  }

  /**
   * Get revenue summary for a period
   */
  static async getRevenueSummary(sellerId, startDate, endDate) {
    try {
      const transactions = await EcommerceTransaction.find({
        sellerId,
        status: 'completed',
        type: 'sale',
        createdAt: { $gte: startDate, $lte: endDate },
      });

      const summary = {
        totalRevenue: 0,
        totalCommission: 0,
        netRevenue: 0,
        totalOrders: transactions.length,
        averageOrderValue: 0,
        totalGST: 0,
      };

      transactions.forEach((txn) => {
        summary.totalRevenue += txn.productAmount;
        summary.totalCommission += txn.commission.totalCommission;
        summary.totalGST += txn.commission.gst.amount;
        summary.netRevenue += txn.settlement.netAmount;
      });

      summary.averageOrderValue = summary.totalOrders > 0 
        ? summary.totalRevenue / summary.totalOrders 
        : 0;

      return summary;
    } catch (error) {
      logger.error('Error getting revenue summary:', error);
      throw error;
    }
  }

  /**
   * Get product statistics
   */
  static async getProductStats(sellerId) {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      
      const totalProducts = await Product.countDocuments({ sellerProfileId: sellerId });
      const activeProducts = await Product.countDocuments({ 
        sellerProfileId: sellerId, 
        isActive: true 
      });
      const approvedProducts = await Product.countDocuments({ 
        sellerProfileId: sellerId, 
        approvalStatus: 'approved' 
      });
      const pendingProducts = await Product.countDocuments({ 
        sellerProfileId: sellerId, 
        approvalStatus: 'pending' 
      });
      const rejectedProducts = await Product.countDocuments({ 
        sellerProfileId: sellerId, 
        approvalStatus: 'rejected' 
      });

      // Get products running low on stock
      const lowStockProducts = await Product.countDocuments({
        sellerProfileId: sellerId,
        isActive: true,
        stock: { $lte: 10, $gt: 0 },
      });

      // Get out of stock products
      const outOfStockProducts = await Product.countDocuments({
        sellerProfileId: sellerId,
        isActive: true,
        stock: 0,
      });

      return {
        total: totalProducts,
        active: activeProducts,
        approved: approvedProducts,
        pending: pendingProducts,
        rejected: rejectedProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
        productLimit: seller.getProductLimit(),
      };
    } catch (error) {
      logger.error('Error getting product stats:', error);
      throw error;
    }
  }

  /**
   * Get top performing products
   */
  static async getTopProducts(sellerId, limit = 10) {
    try {
      const products = await Product.find({ 
        sellerProfileId: sellerId,
        isActive: true 
      })
        .sort({ unitsSold: -1, views: -1 })
        .limit(limit)
        .lean();

      return products.map((product) => ({
        id: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
        stock: product.stock,
        unitsSold: product.unitsSold || 0,
        views: product.views || 0,
        rating: product.rating || 0,
        revenue: (product.unitsSold || 0) * product.price,
      }));
    } catch (error) {
      logger.error('Error getting top products:', error);
      throw error;
    }
  }

  /**
   * Get recent orders
   */
  static async getRecentOrders(sellerId, limit = 20) {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      
      const orders = await Order.find({
        'items.sellerEmail': seller.sellerEmail,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return orders.map((order) => ({
        id: order._id,
        orderNumber: order._id.toString().slice(-8).toUpperCase(),
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items.filter(item => item.sellerEmail === seller.sellerEmail),
      }));
    } catch (error) {
      logger.error('Error getting recent orders:', error);
      throw error;
    }
  }

  /**
   * Get sales trend data
   */
  static async getSalesTrend(sellerId, period = 'month') {
    try {
      let groupFormat;
      let startDate = new Date();

      switch (period) {
        case 'week':
          groupFormat = '%Y-%m-%d';
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          groupFormat = '%Y-%m-%d';
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          groupFormat = '%Y-W%U';
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          groupFormat = '%Y-%m';
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          groupFormat = '%Y-%m-%d';
          startDate.setMonth(startDate.getMonth() - 1);
      }

      const trend = await EcommerceTransaction.aggregate([
        {
          $match: {
            sellerId: sellerId,
            status: 'completed',
            type: 'sale',
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: groupFormat, date: '$createdAt' },
            },
            revenue: { $sum: '$productAmount' },
            commission: { $sum: '$commission.totalCommission' },
            netRevenue: { $sum: '$settlement.netAmount' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return trend.map((item) => ({
        date: item._id,
        revenue: item.revenue,
        commission: item.commission,
        netRevenue: item.netRevenue,
        orders: item.orders,
      }));
    } catch (error) {
      logger.error('Error getting sales trend:', error);
      throw error;
    }
  }

  /**
   * Get category performance
   */
  static async getCategoryPerformance(sellerId) {
    try {
      const products = await Product.find({ 
        sellerProfileId: sellerId,
        isActive: true 
      }).lean();

      const categoryMap = {};

      products.forEach((product) => {
        const category = product.category || 'Uncategorized';
        
        if (!categoryMap[category]) {
          categoryMap[category] = {
            category,
            productCount: 0,
            totalRevenue: 0,
            totalViews: 0,
            totalSold: 0,
          };
        }

        categoryMap[category].productCount += 1;
        categoryMap[category].totalRevenue += (product.unitsSold || 0) * product.price;
        categoryMap[category].totalViews += product.views || 0;
        categoryMap[category].totalSold += product.unitsSold || 0;
      });

      return Object.values(categoryMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
    } catch (error) {
      logger.error('Error getting category performance:', error);
      throw error;
    }
  }

  /**
   * Get inventory alerts
   */
  static async getInventoryAlerts(sellerId) {
    try {
      // Low stock products (stock <= 10)
      const lowStock = await Product.find({
        sellerProfileId: sellerId,
        isActive: true,
        stock: { $lte: 10, $gt: 0 },
      })
        .sort({ stock: 1 })
        .limit(10)
        .lean();

      // Out of stock products
      const outOfStock = await Product.find({
        sellerProfileId: sellerId,
        isActive: true,
        stock: 0,
      })
        .limit(10)
        .lean();

      // Expiring products (if applicable)
      const expiringProducts = await Product.find({
        sellerProfileId: sellerId,
        isActive: true,
        expiryApplicable: true,
        expiryDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      })
        .sort({ expiryDate: 1 })
        .limit(10)
        .lean();

      return {
        lowStock: lowStock.map(p => ({
          id: p._id,
          name: p.name,
          stock: p.stock,
          image: p.image,
        })),
        outOfStock: outOfStock.map(p => ({
          id: p._id,
          name: p.name,
          image: p.image,
        })),
        expiring: expiringProducts.map(p => ({
          id: p._id,
          name: p.name,
          expiryDate: p.expiryDate,
          stock: p.stock,
          image: p.image,
        })),
      };
    } catch (error) {
      logger.error('Error getting inventory alerts:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics compared to goals
   */
  static async getPerformanceMetrics(sellerId) {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const monthlyStats = await this.getRevenueSummary(sellerId, startOfMonth, now);

      // Calculate metrics
      const metrics = {
        revenue: {
          current: monthlyStats.totalRevenue,
          goal: seller.metrics.lastMonthRevenue * 1.1, // 10% growth goal
          achievement: 0,
        },
        orders: {
          current: monthlyStats.totalOrders,
          goal: Math.ceil(seller.metrics.totalOrders / 12), // Monthly average
          achievement: 0,
        },
        commission: {
          current: monthlyStats.totalCommission,
          rate: seller.commissionConfig.rate,
        },
        fulfillment: {
          rate: seller.metrics.fulfillmentRate || 0,
          goal: 95,
        },
        response: {
          rate: seller.metrics.responseRate || 0,
          goal: 90,
        },
      };

      metrics.revenue.achievement = metrics.revenue.goal > 0
        ? (metrics.revenue.current / metrics.revenue.goal) * 100
        : 0;

      metrics.orders.achievement = metrics.orders.goal > 0
        ? (metrics.orders.current / metrics.orders.goal) * 100
        : 0;

      return metrics;
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate growth percentage
   */
  static calculateGrowth(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Get customer insights
   */
  static async getCustomerInsights(sellerId) {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      
      const orders = await Order.find({
        'items.sellerEmail': seller.sellerEmail,
      }).lean();

      const customerMap = {};
      
      orders.forEach((order) => {
        const email = order.customerEmail;
        
        if (!customerMap[email]) {
          customerMap[email] = {
            email,
            name: order.customerName,
            orders: 0,
            totalSpent: 0,
          };
        }

        const sellerItems = order.items.filter(item => item.sellerEmail === seller.sellerEmail);
        const orderTotal = sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        customerMap[email].orders += 1;
        customerMap[email].totalSpent += orderTotal;
      });

      const customers = Object.values(customerMap);
      
      // Calculate insights
      const totalCustomers = customers.length;
      const repeatCustomers = customers.filter(c => c.orders > 1).length;
      const avgOrdersPerCustomer = totalCustomers > 0 
        ? customers.reduce((sum, c) => sum + c.orders, 0) / totalCustomers 
        : 0;
      const avgSpendPerCustomer = totalCustomers > 0
        ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / totalCustomers
        : 0;

      // Get top customers
      const topCustomers = customers
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      return {
        totalCustomers,
        repeatCustomers,
        repeatRate: totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0,
        avgOrdersPerCustomer: avgOrdersPerCustomer.toFixed(2),
        avgSpendPerCustomer: avgSpendPerCustomer.toFixed(2),
        topCustomers,
      };
    } catch (error) {
      logger.error('Error getting customer insights:', error);
      throw error;
    }
  }
}

module.exports = SellerAnalyticsService;
