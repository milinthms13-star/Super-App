/**
 * FoodDeliveryAnalytics Schema
 * Advanced analytics for orders, restaurants, riders, and business metrics
 * Aggregates performance data for dashboards and insights
 */

const mongoose = require('mongoose');

const foodDeliveryAnalyticsSchema = new mongoose.Schema(
  {
    analyticsId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: true,
      index: true,
    },

    // Order Analytics
    orders: {
      totalOrders: {
        type: Number,
        default: 0,
      },
      completedOrders: {
        type: Number,
        default: 0,
      },
      cancelledOrders: {
        type: Number,
        default: 0,
      },
      failedOrders: {
        type: Number,
        default: 0,
      },
      scheduledOrders: {
        type: Number,
        default: 0,
      },
      cancelRatio: Number,
      avgOrderValue: Number,
      medianOrderValue: Number,
      totalOrderValue: {
        type: Number,
        default: 0,
      },
      orderValueBrackets: {
        under100: Number,
        between100_200: Number,
        between200_500: Number,
        between500_1000: Number,
        over1000: Number,
      },
    },

    // Revenue Analytics
    revenue: {
      grossRevenue: {
        type: Number,
        default: 0,
      },
      platformFeeCollected: {
        type: Number,
        default: 0,
      },
      taxCollected: {
        type: Number,
        default: 0,
      },
      discountsGiven: {
        type: Number,
        default: 0,
      },
      netRevenue: {
        type: Number,
        default: 0,
      },
      deliveryCharges: {
        type: Number,
        default: 0,
      },
      revenueByCategory: {
        type: Map,
        of: Number,
      },
    },

    // Delivery Analytics
    delivery: {
      avgDeliveryTime: Number,
      medianDeliveryTime: Number,
      onTimeDeliveries: Number,
      lateDeliveries: Number,
      onTimePercentage: Number,
      avgDeliveryDistance: Number,
      totalDeliveryDistance: Number,
      deliveryPartnerUtilization: Number,
      busiestDeliveryHour: String,
    },

    // User Analytics
    users: {
      activeUsers: {
        type: Number,
        default: 0,
      },
      newUsers: {
        type: Number,
        default: 0,
      },
      returningUsers: {
        type: Number,
        default: 0,
      },
      userRetentionRate: Number,
      userChurnRate: Number,
      avgUsersPerOrder: Number,
      userSegmentation: {
        frequent: Number,
        occasional: Number,
        rare: Number,
        inactive: Number,
      },
    },

    // Restaurant Analytics
    restaurants: {
      activeRestaurants: {
        type: Number,
        default: 0,
      },
      topPerformingRestaurants: [
        {
          restaurantId: mongoose.Schema.Types.ObjectId,
          orders: Number,
          revenue: Number,
          avgRating: Number,
          cancellationRate: Number,
        },
      ],
      restaurantsByCategory: {
        type: Map,
        of: Number,
      },
      avgRestaurantRevenue: Number,
      avgOrdersPerRestaurant: Number,
    },

    // Payment Analytics
    payments: {
      totalTransactions: Number,
      successfulPayments: Number,
      failedPayments: Number,
      paymentSuccessRate: Number,
      paymentMethodBreakdown: {
        wallet: Number,
        card: Number,
        upi: Number,
        cod: Number,
      },
      avgTransactionValue: Number,
    },

    // Rating & Satisfaction
    ratings: {
      avgOrderRating: Number,
      avgDeliveryRating: Number,
      avgRestaurantRating: Number,
      ratingDistribution: {
        fiveStar: Number,
        fourStar: Number,
        threeStar: Number,
        twoStar: Number,
        oneStar: Number,
      },
      complaintsReceived: Number,
      complaintResolutionRate: Number,
    },

    // Peak Time Analysis
    peakHours: [
      {
        hour: String,
        orders: Number,
        revenue: Number,
        activeUsers: Number,
      },
    ],

    peakDays: [
      {
        day: String,
        orders: Number,
        revenue: Number,
      },
    ],

    // Traffic & Engagement
    traffic: {
      totalSessions: Number,
      avgSessionDuration: Number,
      uniqueVisitors: Number,
      pageViews: Number,
      appOpens: Number,
      searchesPerformed: Number,
      topSearches: [
        {
          query: String,
          count: Number,
        },
      ],
    },

    // Promo & Loyalty
    promotions: {
      activeCouponCodes: Number,
      couponUsageCount: Number,
      totalDiscountsUsed: {
        type: Number,
        default: 0,
      },
      avgDiscountValue: Number,
      loyaltyPointsRedeemed: Number,
      referralBonus: {
        type: Number,
        default: 0,
      },
    },

    // Operational Metrics
    operations: {
      avgPrepTime: Number,
      avgAcceptanceTime: Number,
      cancellationReasons: {
        type: Map,
        of: Number,
      },
      returnOrders: Number,
      replacementOrders: Number,
      foodQualityComplaints: Number,
      deliveryQualityComplaints: Number,
    },

    // Competitive Analysis
    competition: {
      marketShare: Number,
      avgPriceComparison: Number,
      deliveryFeeComparison: Number,
      userPreferenceScore: Number,
    },

    // Rider Analytics
    riders: {
      activeRiders: Number,
      totalOrdersDelivered: Number,
      avgOrdersPerRider: Number,
      riderEarnings: {
        totalEarnings: Number,
        avgEarningsPerRider: Number,
      },
      riderRatings: {
        avgRating: Number,
        topRatedRiders: [
          {
            riderId: mongoose.Schema.Types.ObjectId,
            rating: Number,
            deliveries: Number,
          },
        ],
      },
    },

    // Predictive Metrics
    forecasts: {
      predictedOrdersNextDay: Number,
      predictedRevenueNextDay: Number,
      predictedActiveUsersNextDay: Number,
      seasonalTrend: String,
    },

    notes: String,
  },
  {
    timestamps: true,
    collection: 'fooddeliveryanalytics',
  }
);

// Indexes
foodDeliveryAnalyticsSchema.index({ date: -1 });
foodDeliveryAnalyticsSchema.index({ period: 1, date: -1 });
foodDeliveryAnalyticsSchema.index({ 'orders.totalOrders': -1 });
foodDeliveryAnalyticsSchema.index({ 'revenue.grossRevenue': -1 });

// Methods
foodDeliveryAnalyticsSchema.methods.calculateMetrics = function () {
  // Calculate derived metrics
  if (this.orders.totalOrders > 0) {
    this.orders.cancelRatio = (this.orders.cancelledOrders / this.orders.totalOrders) * 100;
  }

  if (this.users.activeUsers > 0) {
    this.users.userRetentionRate = (this.users.returningUsers / this.users.activeUsers) * 100;
    this.users.userChurnRate = 100 - this.users.userRetentionRate;
  }

  if (this.payments.totalTransactions > 0) {
    this.payments.paymentSuccessRate = (this.payments.successfulPayments / this.payments.totalTransactions) * 100;
  }

  if (this.delivery.onTimeDeliveries + this.delivery.lateDeliveries > 0) {
    this.delivery.onTimePercentage =
      (this.delivery.onTimeDeliveries / (this.delivery.onTimeDeliveries + this.delivery.lateDeliveries)) * 100;
  }

  // Calculate net revenue
  this.revenue.netRevenue =
    this.revenue.grossRevenue - this.revenue.discountsGiven + this.revenue.platformFeeCollected;

  return this.save();
};

foodDeliveryAnalyticsSchema.methods.getOrderConversion = function () {
  if (this.users.activeUsers === 0) return 0;
  return (this.orders.totalOrders / this.users.activeUsers) * 100;
};

foodDeliveryAnalyticsSchema.methods.getRevenuePerUser = function () {
  if (this.users.activeUsers === 0) return 0;
  return this.revenue.netRevenue / this.users.activeUsers;
};

foodDeliveryAnalyticsSchema.methods.getTopCategory = function () {
  if (!this.restaurants.restaurantsByCategory || this.restaurants.restaurantsByCategory.size === 0) {
    return null;
  }
  return [...this.restaurants.restaurantsByCategory.entries()].sort((a, b) => b[1] - a[1])[0];
};

module.exports = mongoose.model('FoodDeliveryAnalytics', foodDeliveryAnalyticsSchema);
