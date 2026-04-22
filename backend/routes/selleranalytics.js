const express = require('express');
const router = express.Router();
const SellerAnalytics = require('../models/SellerAnalytics');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Review = require('../models/Review');
const { authenticate } = require('../middleware/auth');

// Get seller analytics dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { period = 'This Month', startDate, endDate } = req.query;

    let analytics = await SellerAnalytics.findOne({
      sellerEmail: req.user.email,
    });

    if (!analytics) {
      analytics = new SellerAnalytics({
        sellerEmail: req.user.email,
        sellerName: req.user.name,
      });
      await analytics.save();
    }

    // Calculate date range
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case 'Today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'This Week':
        start = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'This Month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'This Quarter':
        start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'This Year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'Custom':
        start = new Date(startDate);
        end = new Date(endDate);
        break;
    }

    analytics.period = period;
    analytics.startDate = start;
    analytics.endDate = end;

    // Fetch and update metrics
    const orders = await Order.find({
      sellerId: req.user.email,
      createdAt: { $gte: start, $lte: end },
    });

    const products = await Product.find({ sellerId: req.user.email });
    const reviews = await Review.find({
      sellerId: req.user.email,
    });

    // Update sales metrics
    analytics.sales.totalOrders = orders.length;
    analytics.sales.totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    analytics.sales.averageOrderValue =
      orders.length > 0 ? analytics.sales.totalRevenue / orders.length : 0;

    // Update order status breakdown
    analytics.sales.ordersByStatus = {
      pending: orders.filter((o) => o.status === 'Pending').length,
      processing: orders.filter((o) => o.status === 'Processing').length,
      shipped: orders.filter((o) => o.status === 'Shipped').length,
      delivered: orders.filter((o) => o.status === 'Delivered').length,
      cancelled: orders.filter((o) => o.status === 'Cancelled').length,
      returned: orders.filter((o) => o.status === 'Returned').length,
    };

    // Update product metrics
    analytics.products.totalProducts = products.length;
    analytics.products.topSellingProducts = products
      .sort((a, b) => (b.unitsSold || 0) - (a.unitsSold || 0))
      .slice(0, 5)
      .map((p) => ({
        productId: p._id,
        productName: p.name,
        unitsSold: p.unitsSold || 0,
        revenue: (p.unitsSold || 0) * p.price,
        rating: p.rating || 0,
      }));

    // Update review metrics
    analytics.reviews.totalReviews = reviews.length;
    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      analytics.reviews.averageRating = parseFloat(avgRating.toFixed(2));

      analytics.reviews.ratingDistribution = {
        fiveStar: reviews.filter((r) => r.rating === 5).length,
        fourStar: reviews.filter((r) => r.rating === 4).length,
        threeStar: reviews.filter((r) => r.rating === 3).length,
        twoStar: reviews.filter((r) => r.rating === 2).length,
        oneStar: reviews.filter((r) => r.rating === 1).length,
      };

      analytics.reviews.positiveReviews = reviews
        .filter((r) => r.rating >= 4)
        .slice(0, 5)
        .map((r) => ({
          reviewId: r._id,
          productName: r.productName,
          rating: r.rating,
          comment: r.comment,
          customerName: r.customerName,
          createdAt: r.createdAt,
        }));

      analytics.reviews.negativeReviews = reviews
        .filter((r) => r.rating <= 2)
        .slice(0, 5)
        .map((r) => ({
          reviewId: r._id,
          productName: r.productName,
          rating: r.rating,
          comment: r.comment,
          customerName: r.customerName,
          createdAt: r.createdAt,
        }));
    }

    // Update KPIs
    analytics.kpis.orderFulfillmentRate =
      analytics.sales.totalOrders > 0
        ? ((analytics.sales.ordersByStatus.delivered / analytics.sales.totalOrders) * 100).toFixed(2)
        : 0;

    analytics.kpis.returnRate =
      analytics.sales.totalOrders > 0
        ? ((analytics.sales.ordersByStatus.returned / analytics.sales.totalOrders) * 100).toFixed(2)
        : 0;

    analytics.kpis.cancellationRate =
      analytics.sales.totalOrders > 0
        ? ((analytics.sales.ordersByStatus.cancelled / analytics.sales.totalOrders) * 100).toFixed(2)
        : 0;

    analytics.kpis.customerSatisfactionScore =
      analytics.reviews.averageRating > 0 ? (analytics.reviews.averageRating / 5) * 100 : 0;

    analytics.lastUpdated = new Date();
    await analytics.save();

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics dashboard',
      error: error.message,
    });
  }
});

// Get sales trends
router.get('/trends/sales', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await Order.find({
      sellerId: req.user.email,
      createdAt: { $gte: startDate },
    }).sort({ createdAt: 1 });

    // Group by date
    const trends = {};
    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!trends[date]) {
        trends[date] = { date, revenue: 0, orderCount: 0 };
      }
      trends[date].revenue += order.totalAmount || 0;
      trends[date].orderCount += 1;
    });

    const trendArray = Object.values(trends);

    res.json({
      success: true,
      data: trendArray,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching sales trends',
      error: error.message,
    });
  }
});

// Get product performance
router.get('/products/performance', authenticate, async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user.email });

    const performance = products.map((p) => ({
      productId: p._id,
      productName: p.name,
      views: p.views || 0,
      clicks: p.clicks || 0,
      conversionRate:
        p.views > 0 ? (((p.clicks || 0) / p.views) * 100).toFixed(2) : 0,
      revenue: (p.unitsSold || 0) * p.price,
      rating: p.rating || 0,
      reviews: p.reviewCount || 0,
    }));

    res.json({
      success: true,
      data: performance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product performance',
      error: error.message,
    });
  }
});

// Get customer insights
router.get('/customers/insights', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ sellerId: req.user.email });

    // Get unique customers
    const customerMap = {};
    orders.forEach((order) => {
      if (!customerMap[order.customerEmail]) {
        customerMap[order.customerEmail] = {
          customerEmail: order.customerEmail,
          customerName: order.customerName,
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: null,
        };
      }
      customerMap[order.customerEmail].totalOrders += 1;
      customerMap[order.customerEmail].totalSpent += order.totalAmount || 0;
      customerMap[order.customerEmail].lastOrderDate = order.createdAt;
    });

    const customers = Object.values(customerMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    const insights = {
      totalCustomers: Object.keys(customerMap).length,
      topCustomers: customers,
      averageCustomerValue:
        Object.keys(customerMap).length > 0
          ? Object.values(customerMap).reduce((sum, c) => sum + c.totalSpent, 0) /
            Object.keys(customerMap).length
          : 0,
    };

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching customer insights',
      error: error.message,
    });
  }
});

// Get inventory metrics
router.get('/inventory/metrics', authenticate, async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user.email });

    const metrics = {
      totalItems: products.reduce((sum, p) => sum + (p.stock || 0), 0),
      outOfStockItems: products.filter((p) => p.stock === 0).length,
      lowStockItems: products.filter((p) => p.stock > 0 && p.stock <= 5).length,
      inventoryValue: products.reduce((sum, p) => sum + (p.stock || 0) * p.price, 0),
    };

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory metrics',
      error: error.message,
    });
  }
});

module.exports = router;
