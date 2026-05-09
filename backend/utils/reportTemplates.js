/**
 * Report Templates - Phase 13
 * Predefined report structures and configurations
 */

const reportTemplates = {
  // Financial Reports
  daily_revenue: {
    name: 'Daily Revenue Report',
    category: 'financial',
    description: 'Daily revenue, transactions, and success rates',
    sections: [
      {
        title: 'Revenue Summary',
        metrics: ['totalRevenue', 'transactionCount', 'successRate', 'averageTransactionValue']
      },
      {
        title: 'Payment Breakdown',
        metrics: ['creditCard', 'debitCard', 'upi', 'wallet', 'other']
      },
      {
        title: 'Top Merchants',
        type: 'table',
        columns: ['merchant', 'revenue', 'transactions', 'rate']
      }
    ],
    frequency: ['daily'],
    recipients: ['finance', 'admin'],
    defaultFormat: 'pdf'
  },

  weekly_sales: {
    name: 'Weekly Sales Summary',
    category: 'financial',
    description: 'Weekly sales aggregation and trends',
    sections: [
      {
        title: 'Sales Metrics',
        metrics: ['totalSales', 'orderCount', 'averageOrderValue', 'weekOverWeekGrowth']
      },
      {
        title: 'Category Performance',
        type: 'chart',
        chartType: 'pie',
        metric: 'category'
      },
      {
        title: 'Daily Trend',
        type: 'chart',
        chartType: 'line',
        metric: 'dailyRevenue'
      }
    ],
    frequency: ['weekly'],
    recipients: ['management', 'finance'],
    defaultFormat: 'pdf'
  },

  monthly_pnl: {
    name: 'Monthly P&L Statement',
    category: 'financial',
    description: 'Monthly profit and loss statement',
    sections: [
      {
        title: 'Income',
        metrics: ['revenue', 'otherIncome']
      },
      {
        title: 'Expenses',
        metrics: ['commission', 'settlement', 'refund', 'operationalCost']
      },
      {
        title: 'Net Profit',
        metrics: ['netProfit', 'profitMargin']
      },
      {
        title: 'Comparison',
        type: 'comparison',
        compareWith: 'previousMonth'
      }
    ],
    frequency: ['monthly'],
    recipients: ['cfo', 'management'],
    defaultFormat: 'pdf'
  },

  settlement_reconciliation: {
    name: 'Settlement Reconciliation Report',
    category: 'financial',
    description: 'Settlement and payment matching results',
    sections: [
      {
        title: 'Reconciliation Summary',
        metrics: ['totalSettlements', 'matchedCount', 'discrepancies', 'discrepancyRate']
      },
      {
        title: 'Discrepancy Details',
        type: 'table',
        columns: ['settlementId', 'paymentId', 'type', 'amount']
      },
      {
        title: 'Action Items',
        type: 'list',
        metric: 'unresolvedDiscrepancies'
      }
    ],
    frequency: ['daily', 'weekly', 'monthly'],
    recipients: ['finance', 'reconciliation_team'],
    defaultFormat: 'pdf'
  },

  commission_report: {
    name: 'Commission Report',
    category: 'financial',
    description: 'Commission tracking and payout details',
    sections: [
      {
        title: 'Commission Summary',
        metrics: ['totalCommission', 'pendingCommission', 'paidCommission', 'holdAmount']
      },
      {
        title: 'Commission Breakdown',
        type: 'table',
        columns: ['commissionType', 'amount', 'rate', 'status']
      },
      {
        title: 'Tax Calculation',
        metrics: ['baseAmount', 'taxRate', 'taxAmount', 'netAmount']
      }
    ],
    frequency: ['weekly', 'monthly'],
    recipients: ['finance', 'partner'],
    defaultFormat: 'pdf'
  },

  invoice_aging: {
    name: 'Invoice Aging Report',
    category: 'financial',
    description: 'Invoice aging analysis and collection status',
    sections: [
      {
        title: 'Aging Summary',
        metrics: ['current', 'past30', 'past60', 'past90', 'past120']
      },
      {
        title: 'Aging Distribution',
        type: 'chart',
        chartType: 'bar',
        metric: 'agingBucket'
      },
      {
        title: 'Overdue Invoices',
        type: 'table',
        columns: ['invoiceId', 'amount', 'daysOverdue', 'customer', 'action']
      },
      {
        title: 'Collection Rate',
        metrics: ['collectionRate', 'daysToPayment', 'collectionTrend']
      }
    ],
    frequency: ['weekly', 'monthly'],
    recipients: ['accounting', 'management'],
    defaultFormat: 'pdf'
  },

  tax_compliance: {
    name: 'Tax Compliance Report',
    category: 'compliance',
    description: 'Tax calculation and compliance reporting',
    sections: [
      {
        title: 'Tax Summary',
        metrics: ['totalTaxable', 'sgst', 'cgst', 'igst', 'totalTax']
      },
      {
        title: 'Tax Breakdown',
        type: 'chart',
        chartType: 'pie',
        metric: 'taxType'
      },
      {
        title: 'Invoices with Tax',
        type: 'table',
        columns: ['invoiceId', 'taxableAmount', 'taxType', 'taxAmount']
      },
      {
        title: 'Compliance Checklist',
        type: 'checklist',
        items: ['gstRegistration', 'invoiceNumbering', 'taxCalculation', 'documentation']
      }
    ],
    frequency: ['monthly', 'quarterly'],
    recipients: ['compliance', 'finance', 'tax_advisor'],
    defaultFormat: 'pdf'
  },

  // Operational Reports
  transaction_report: {
    name: 'Transaction Report',
    category: 'operational',
    description: 'Detailed transaction history and analysis',
    sections: [
      {
        title: 'Transaction Summary',
        metrics: ['totalTransactions', 'totalAmount', 'successCount', 'failureCount', 'successRate']
      },
      {
        title: 'Transaction Details',
        type: 'table',
        columns: ['transactionId', 'amount', 'merchant', 'customer', 'method', 'status', 'timestamp']
      },
      {
        title: 'Status Distribution',
        type: 'chart',
        chartType: 'pie',
        metric: 'status'
      }
    ],
    frequency: ['daily', 'weekly'],
    recipients: ['operations', 'finance'],
    defaultFormat: 'csv'
  },

  subscription_management: {
    name: 'Subscription Management Report',
    category: 'operational',
    description: 'Subscription status and recurring revenue',
    sections: [
      {
        title: 'Subscription Metrics',
        metrics: ['activeSubscriptions', 'newSubscriptions', 'cancelledSubscriptions', 'mrr', 'churnRate']
      },
      {
        title: 'Subscription Status',
        type: 'chart',
        chartType: 'pie',
        metric: 'subscriptionStatus'
      },
      {
        title: 'Plan Distribution',
        type: 'table',
        columns: ['planName', 'subscribers', 'revenue', 'growthRate']
      }
    ],
    frequency: ['weekly', 'monthly'],
    recipients: ['product', 'finance'],
    defaultFormat: 'pdf'
  },

  // Dashboard Widget Definitions
  dashboardWidgets: {
    payment_dashboard: [
      { id: 'total_revenue', title: 'Total Revenue', type: 'metric', size: 'small' },
      { id: 'success_rate', title: 'Success Rate', type: 'gauge', size: 'small' },
      { id: 'avg_transaction', title: 'Avg Transaction Value', type: 'metric', size: 'small' },
      { id: 'transaction_trend', title: 'Transaction Trend', type: 'chart', chartType: 'line', size: 'large' },
      { id: 'payment_methods', title: 'Payment Methods', type: 'chart', chartType: 'pie', size: 'medium' },
      { id: 'top_merchants', title: 'Top Merchants', type: 'table', size: 'large' }
    ],
    subscription_dashboard: [
      { id: 'active_subs', title: 'Active Subscriptions', type: 'metric', size: 'small' },
      { id: 'mrr', title: 'Monthly Recurring Revenue', type: 'metric', size: 'small' },
      { id: 'churn_rate', title: 'Churn Rate', type: 'gauge', size: 'small' },
      { id: 'growth_trend', title: 'Growth Trend', type: 'chart', chartType: 'line', size: 'large' },
      { id: 'revenue_by_plan', title: 'Revenue by Plan', type: 'chart', chartType: 'bar', size: 'medium' }
    ],
    settlement_dashboard: [
      { id: 'pending_settlements', title: 'Pending Settlements', type: 'metric', size: 'small' },
      { id: 'settlement_amount', title: 'Total Settlement Amount', type: 'metric', size: 'small' },
      { id: 'success_rate', title: 'Settlement Success Rate', type: 'gauge', size: 'small' },
      { id: 'settlement_timeline', title: 'Settlement Timeline', type: 'chart', chartType: 'line', size: 'large' },
      { id: 'top_requesters', title: 'Top Settlement Requesters', type: 'table', size: 'medium' }
    ],
    invoice_dashboard: [
      { id: 'total_invoiced', title: 'Total Invoiced', type: 'metric', size: 'small' },
      { id: 'outstanding', title: 'Outstanding Amount', type: 'metric', size: 'small' },
      { id: 'days_to_payment', title: 'Avg Days to Payment', type: 'metric', size: 'small' },
      { id: 'aging_analysis', title: 'Aging Analysis', type: 'chart', chartType: 'bar', size: 'large' },
      { id: 'invoice_status', title: 'Invoice Status', type: 'chart', chartType: 'pie', size: 'medium' }
    ]
  }
};

module.exports = reportTemplates;
