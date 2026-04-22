const mongoose = require('mongoose');

const SellerAnalyticsSchema = new mongoose.Schema(
  {
    analyticsId: {
      type: String,
      unique: true,
      required: true,
      default: () => `analytics-${Date.now()}`,
    },
    sellerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    sellerName: String,
    shopName: String,
    // Sales metrics
    sales: {
      totalOrders: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
      },
      averageOrderValue: {
        type: Number,
        default: 0,
      },
      ordersByStatus: {
        pending: { type: Number, default: 0 },
        processing: { type: Number, default: 0 },
        shipped: { type: Number, default: 0 },
        delivered: { type: Number, default: 0 },
        cancelled: { type: Number, default: 0 },
        returned: { type: Number, default: 0 },
      },
      dailyRevenue: [
        {
          date: Date,
          revenue: Number,
          orderCount: Number,
        },
      ],
      monthlySummary: [
        {
          month: String, // 'YYYY-MM'
          revenue: Number,
          orderCount: Number,
          avgOrderValue: Number,
        },
      ],
    },
    // Product metrics
    products: {
      totalProducts: {
        type: Number,
        default: 0,
      },
      topSellingProducts: [
        {
          productId: String,
          productName: String,
          unitsSold: Number,
          revenue: Number,
          rating: Number,
        },
      ],
      lowStockProducts: [
        {
          productId: String,
          productName: String,
          currentStock: Number,
          reorderLevel: Number,
        },
      ],
      productPerformance: [
        {
          productId: String,
          productName: String,
          views: Number,
          clicks: Number,
          conversionRate: Number,
          revenue: Number,
          rating: Number,
          reviews: Number,
        },
      ],
    },
    // Customer metrics
    customers: {
      totalCustomers: {
        type: Number,
        default: 0,
      },
      newCustomers: {
        type: Number,
        default: 0,
      },
      repeatCustomers: {
        type: Number,
        default: 0,
      },
      customerRetentionRate: {
        type: Number,
        default: 0,
      },
      topCustomers: [
        {
          customerEmail: String,
          customerName: String,
          totalOrders: Number,
          totalSpent: Number,
          lastOrderDate: Date,
        },
      ],
    },
    // Review & Rating metrics
    reviews: {
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
      ratingDistribution: {
        fiveStar: { type: Number, default: 0 },
        fourStar: { type: Number, default: 0 },
        threeStar: { type: Number, default: 0 },
        twoStar: { type: Number, default: 0 },
        oneStar: { type: Number, default: 0 },
      },
      positiveReviews: [
        {
          reviewId: String,
          productName: String,
          rating: Number,
          comment: String,
          customerName: String,
          createdAt: Date,
        },
      ],
      negativeReviews: [
        {
          reviewId: String,
          productName: String,
          rating: Number,
          comment: String,
          customerName: String,
          createdAt: Date,
        },
      ],
    },
    // Traffic & Engagement
    traffic: {
      totalViews: {
        type: Number,
        default: 0,
      },
      totalClicks: {
        type: Number,
        default: 0,
      },
      conversionRate: {
        type: Number,
        default: 0,
      },
      bounceRate: {
        type: Number,
        default: 0,
      },
      averageSessionDuration: {
        type: Number,
        default: 0, // in seconds
      },
      topTrafficSources: [
        {
          source: String,
          visits: Number,
          conversions: Number,
        },
      ],
    },
    // Financial metrics
    financial: {
      totalEarnings: {
        type: Number,
        default: 0,
      },
      platformCommission: {
        type: Number,
        default: 0,
      },
      refunds: {
        type: Number,
        default: 0,
      },
      payouts: {
        type: Number,
        default: 0,
      },
      pendingPayment: {
        type: Number,
        default: 0,
      },
    },
    // Inventory metrics
    inventory: {
      totalItems: {
        type: Number,
        default: 0,
      },
      outOfStockItems: {
        type: Number,
        default: 0,
      },
      lowStockItems: {
        type: Number,
        default: 0,
      },
      inventoryValue: {
        type: Number,
        default: 0,
      },
      stockTurnoverRate: {
        type: Number,
        default: 0,
      },
    },
    // Performance indicators
    kpis: {
      orderFulfillmentRate: {
        type: Number,
        default: 0,
      },
      returnRate: {
        type: Number,
        default: 0,
      },
      cancellationRate: {
        type: Number,
        default: 0,
      },
      customerSatisfactionScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
    // Comparison period
    period: {
      type: String,
      enum: ['Today', 'This Week', 'This Month', 'This Quarter', 'This Year', 'Custom'],
      default: 'This Month',
    },
    startDate: Date,
    endDate: Date,
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
SellerAnalyticsSchema.index({ sellerEmail: 1, lastUpdated: -1 });
SellerAnalyticsSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SellerAnalytics', SellerAnalyticsSchema);
