/**
 * Phase 13 - Invoice Analytics Model
 * Invoice metrics, aging analysis, and collection tracking
 */

const mongoose = require('mongoose');

const invoiceAnalyticsSchema = new mongoose.Schema(
  {
    analyticsId: {
      type: String,
      unique: true,
      required: true,
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    
    // Invoice Summary
    totalInvoices: {
      count: Number,
      totalAmount: Number,
      totalTaxAmount: Number,
      totalAmountPaid: Number,
      totalOutstanding: Number,
    },
    
    // Invoice by Status
    byStatus: {
      draft: { count: Number, amount: Number },
      sent: { count: Number, amount: Number },
      viewed: { count: Number, amount: Number },
      pending: { count: Number, amount: Number },
      partial: { count: Number, amount: Number },
      paid: { count: Number, amount: Number },
      overdue: { count: Number, amount: Number },
      cancelled: { count: Number, amount: Number },
    },
    
    // Aging Analysis (Days Outstanding)
    agingBucket: [
      {
        bucket: String, // '0-30', '31-60', '61-90', '90+'
        count: Number,
        totalAmount: Number,
        percentage: Number,
      },
    ],
    
    // Collection Metrics
    collectionMetrics: {
      paidInvoices: Number,
      partiallyPaidInvoices: Number,
      unpaidInvoices: Number,
      overdueInvoices: Number,
      collectionRate: Number, // percentage
      averageDaysToCollect: Number,
    },
    
    // Invoice Value Analysis
    valueAnalysis: {
      averageInvoiceValue: Number,
      medianInvoiceValue: Number,
      highestInvoiceValue: Number,
      lowestInvoiceValue: Number,
      totalTaxCollected: Number,
    },
    
    // Invoice Type Distribution
    byInvoiceType: [
      {
        type: String, // tax_invoice, receipt, proforma, credit_note, debit_note
        count: Number,
        totalAmount: Number,
        percentage: Number,
      },
    ],
    
    // Payment Method Analysis
    paymentMethodBreakdown: [
      {
        method: String,
        invoiceCount: Number,
        totalAmount: Number,
        averagePaymentTime: Number, // days
      },
    ],
    
    // Tax Breakdown
    taxAnalysis: {
      totalTax: Number,
      sgst: Number,
      cgst: Number,
      igst: Number,
      otherTax: Number,
      byTaxRate: [
        {
          rate: Number,
          count: Number,
          amount: Number,
        },
      ],
    },
    
    // Send Channel Analysis
    sendChannelAnalysis: [
      {
        channel: String, // email, sms, whatsapp
        invoiceCount: Number,
        viewRate: Number, // percentage
        paymentRate: Number, // percentage
      },
    ],
    
    // Payment Terms Analysis
    paymentTermsAnalysis: [
      {
        terms: String, // e.g., 'net_30', 'net_60'
        invoiceCount: Number,
        averagePaymentTime: Number, // days
        collectionRate: Number, // percentage
      },
    ],
    
    // Overdue Analysis
    overdueAnalysis: {
      totalOverdueInvoices: Number,
      totalOverdueAmount: Number,
      averageOverdueDays: Number,
      daysOverdueBuckets: [
        {
          bucket: String, // '0-30 days', '31-60 days', '60+ days'
          count: Number,
          amount: Number,
        },
      ],
    },
    
    // Top Customers
    topCustomers: [
      {
        customerId: String,
        customerName: String,
        invoiceCount: Number,
        totalAmount: Number,
        totalPaid: Number,
        collectionRate: Number, // percentage
        rank: Number,
      },
    ],
    
    // Invoice Trend
    dailyInvoiceTrend: [
      {
        date: Date,
        createdCount: Number,
        createdAmount: Number,
        paidAmount: Number,
      },
    ],
    
    // DSO (Days Sales Outstanding)
    dso: Number, // days
    dsoBenchmark: Number, // target days
    
    // Previous Period Comparison
    previousPeriodComparison: {
      invoiceGrowth: Number, // percentage
      collectionGrowth: Number, // percentage
      dsoChange: Number, // days
    },
    
    // Discount Analysis
    discountAnalysis: {
      totalDiscounts: Number,
      invoicesWithDiscount: Number,
      averageDiscountPercentage: Number,
      totalDiscountAmount: Number,
    },
    
    // Status
    status: {
      type: String,
      enum: ['draft', 'finalized', 'archived'],
      default: 'draft',
    },
    
    // Metadata
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    generatedBy: String,
    notes: String,
  },
  {
    timestamps: true,
    indexes: [
      { period: 1, startDate: -1 },
      { startDate: 1, endDate: 1 },
    ],
  }
);

// Helper Methods
invoiceAnalyticsSchema.methods.isFinalized = function () {
  return this.status === 'finalized';
};

invoiceAnalyticsSchema.methods.getOutstandingAmount = function () {
  return this.totalInvoices.totalOutstanding || 0;
};

invoiceAnalyticsSchema.methods.getCollectionRate = function () {
  if (this.totalInvoices.totalAmount === 0) return 0;
  return (this.totalInvoices.totalAmountPaid / this.totalInvoices.totalAmount) * 100;
};

invoiceAnalyticsSchema.methods.getOverduePercentage = function () {
  if (this.totalInvoices.count === 0) return 0;
  return (this.byStatus.overdue.count / this.totalInvoices.count) * 100;
};

invoiceAnalyticsSchema.methods.getMostCommonAgingBucket = function () {
  if (this.agingBucket.length === 0) return null;
  return this.agingBucket.reduce((max, current) =>
    current.count > max.count ? current : max
  );
};

invoiceAnalyticsSchema.methods.getTopCustomer = function () {
  if (this.topCustomers.length === 0) return null;
  return this.topCustomers[0];
};

module.exports = mongoose.model('InvoiceAnalytics', invoiceAnalyticsSchema);
