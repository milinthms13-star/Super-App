/**
 * Phase 13 - Dashboard Metrics Model
 * Aggregated metrics for main dashboard display
 */

const mongoose = require('mongoose');

const dashboardMetricsSchema = new mongoose.Schema(
  {
    metricsId: {
      type: String,
      unique: true,
      required: true,
    },
    
    dashboardType: {
      type: String,
      enum: ['executive', 'restaurant', 'admin', 'finance'],
      required: true,
    },
    
    entityId: {
      type: String, // restaurantId, adminId, etc.
    },
    
    // Time Range
    generatedFor: {
      type: String,
      enum: ['today', 'this_week', 'this_month', 'this_quarter', 'this_year', 'all_time'],
      default: 'this_month',
    },
    
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    
    // Key Performance Indicators (KPIs)
    kpis: {
      // Payment KPIs
      totalPayments: {
        value: Number,
        trend: Number, // percentage change from previous period
        status: String, // 'up', 'down', 'stable'
      },
      
      totalRevenue: {
        value: Number,
        trend: Number,
        status: String,
      },
      
      averagePaymentValue: {
        value: Number,
        trend: Number,
        status: String,
      },
      
      paymentSuccessRate: {
        value: Number,
        trend: Number,
        status: String,
      },
      
      // Commission KPIs
      totalCommissions: {
        value: Number,
        trend: Number,
        status: String,
      },
      
      totalCommissionPayable: {
        value: Number,
        trend: Number,
        status: String,
      },
      
      commissionApprovalRate: {
        value: Number,
        trend: Number,
        status: String,
      },
      
      // Invoice KPIs
      totalInvoices: {
        value: Number,
        trend: Number,
        status: String,
      },
      
      outstandingAmount: {
        value: Number,
        trend: Number,
        status: String,
      },
      
      collectionRate: {
        value: Number,
        trend: Number,
        status: String,
      },
      
      dso: {
        value: Number, // days
        trend: Number,
        status: String,
      },
      
      // Settlement KPIs
      totalSettlements: {
        value: Number,
        trend: Number,
        status: String,
      },
      
      settlementSuccessRate: {
        value: Number,
        trend: Number,
        status: String,
      },
      
      averageSettlementTime: {
        value: Number, // hours
        trend: Number,
        status: String,
      },
    },
    
    // Quick Metrics (for cards)
    quickMetrics: [
      {
        metricName: String,
        value: Number,
        unit: String,
        icon: String,
        color: String, // 'success', 'warning', 'danger', 'info'
        trend: Number, // percentage
      },
    ],
    
    // Charts Data
    charts: {
      // Revenue Chart (Last 7/30 days)
      revenueChart: [
        {
          period: String, // date or week/month
          amount: Number,
          count: Number,
        },
      ],
      
      // Payment Methods Pie Chart
      paymentMethodsDistribution: [
        {
          method: String,
          value: Number,
          percentage: Number,
          color: String,
        },
      ],
      
      // Commission Status Pie Chart
      commissionStatusDistribution: [
        {
          status: String,
          value: Number,
          percentage: Number,
          color: String,
        },
      ],
      
      // Invoice Status Pie Chart
      invoiceStatusDistribution: [
        {
          status: String,
          value: Number,
          percentage: Number,
          color: String,
        },
      ],
      
      // Settlement Status Pie Chart
      settlementStatusDistribution: [
        {
          status: String,
          value: Number,
          percentage: Number,
          color: String,
        },
      ],
      
      // Gateway Performance Bar Chart
      gatewayPerformance: [
        {
          gateway: String,
          successRate: Number,
          failureRate: Number,
          averageTime: Number,
        },
      ],
    },
    
    // Top Entities
    topEntities: {
      topRestaurants: [
        {
          restaurantId: String,
          restaurantName: String,
          revenue: Number,
          transactions: Number,
          rank: Number,
        },
      ],
      
      topCustomers: [
        {
          customerId: String,
          customerName: String,
          totalSpent: Number,
          transactionCount: Number,
          rank: Number,
        },
      ],
      
      topPaymentMethods: [
        {
          method: String,
          count: Number,
          percentage: Number,
          rank: Number,
        },
      ],
    },
    
    // Alerts & Notifications
    alerts: [
      {
        alertId: String,
        type: String, // 'warning', 'error', 'info', 'success'
        title: String,
        message: String,
        metric: String,
        threshold: Number,
        currentValue: Number,
        icon: String,
        actionUrl: String,
        createdAt: Date,
      },
    ],
    
    // Summary Cards
    summaryCards: [
      {
        title: String,
        value: String,
        subtitle: String,
        trend: Number,
        status: String, // 'up', 'down', 'stable'
        icon: String,
        backgroundColor: String,
        onClick: String, // route/action
      },
    ],
    
    // Data Tables
    tables: {
      recentTransactions: [
        {
          transactionId: String,
          date: Date,
          description: String,
          amount: Number,
          status: String,
          paymentMethod: String,
        },
      ],
      
      pendingApprovals: [
        {
          itemId: String,
          itemType: String, // commission, settlement, invoice
          amount: Number,
          pendingDays: Number,
          requiredAction: String,
        },
      ],
      
      overdueItems: [
        {
          itemId: String,
          itemType: String,
          amount: Number,
          overdueDays: Number,
          priority: String, // low, medium, high
        },
      ],
    },
    
    // Export Data
    exportOptions: {
      formats: ['pdf', 'excel', 'csv'],
      lastExportedAt: Date,
      lastExportedBy: String,
    },
    
    // Cache Info
    cacheInfo: {
      isCached: Boolean,
      cachedAt: Date,
      cacheTTL: Number, // seconds
    },
  },
  {
    timestamps: true,
    indexes: [
      { dashboardType: 1, entityId: 1 },
      { generatedAt: -1 },
    ],
  }
);

// Helper Methods
dashboardMetricsSchema.methods.getKpiStatus = function (kpiName) {
  const kpi = this.kpis[kpiName];
  return kpi ? kpi.status : null;
};

dashboardMetricsSchema.methods.getHighestAlert = function () {
  if (this.alerts.length === 0) return null;
  const priority = { error: 0, warning: 1, info: 2, success: 3 };
  return this.alerts.reduce((highest, current) =>
    priority[current.type] < priority[highest.type] ? current : highest
  );
};

dashboardMetricsSchema.methods.getTopRestaurant = function () {
  if (this.topEntities.topRestaurants.length === 0) return null;
  return this.topEntities.topRestaurants[0];
};

dashboardMetricsSchema.methods.getRecentTransactionCount = function () {
  return this.tables.recentTransactions.length;
};

dashboardMetricsSchema.methods.getPendingApprovalCount = function () {
  return this.tables.pendingApprovals.length;
};

dashboardMetricsSchema.methods.getOverdueCount = function () {
  return this.tables.overdueItems.length;
};

module.exports = mongoose.model('DashboardMetrics', dashboardMetricsSchema);
