const mongoose = require('mongoose');

const WalletAnalyticsSchema = new mongoose.Schema(
  {
    // Time Period
    period: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'],
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    year: Number,
    month: Number,
    week: Number,
    day: Number,
    hour: Number,

    // Wallet User Metrics
    totalWallets: {
      type: Number,
      default: 0,
    },
    activeWallets: {
      type: Number,
      default: 0,
    },
    frozenWallets: {
      type: Number,
      default: 0,
    },
    kycVerifiedWallets: {
      type: Number,
      default: 0,
    },
    newWallets: {
      type: Number,
      default: 0,
    },

    // Transaction Metrics
    totalTransactions: {
      type: Number,
      default: 0,
    },
    creditTransactions: {
      type: Number,
      default: 0,
    },
    debitTransactions: {
      type: Number,
      default: 0,
    },
    totalCredits: {
      type: Number,
      default: 0,
    },
    totalDebits: {
      type: Number,
      default: 0,
    },
    avgTransactionAmount: {
      type: Number,
      default: 0,
    },

    // Balance Metrics
    totalBalance: {
      type: Number,
      default: 0,
    },
    avgBalance: {
      type: Number,
      default: 0,
    },
    minBalance: {
      type: Number,
      default: 0,
    },
    maxBalance: {
      type: Number,
      default: 0,
    },
    totalPromotionalBalance: {
      type: Number,
      default: 0,
    },
    avgPromotionalBalance: {
      type: Number,
      default: 0,
    },

    // Cashback Metrics
    cashbackEarned: {
      type: Number,
      default: 0,
    },
    cashbackCredited: {
      type: Number,
      default: 0,
    },
    cashbackExpired: {
      type: Number,
      default: 0,
    },
    pendingCashback: {
      type: Number,
      default: 0,
    },
    avgCashbackPerUser: {
      type: Number,
      default: 0,
    },
    cashbackRedemptionRate: {
      type: Number,
      default: 0,
    },

    // Loyalty Points Metrics
    pointsEarned: {
      type: Number,
      default: 0,
    },
    pointsRedeemed: {
      type: Number,
      default: 0,
    },
    pointsExpired: {
      type: Number,
      default: 0,
    },
    totalPointsBalance: {
      type: Number,
      default: 0,
    },
    pointsRedemptionRate: {
      type: Number,
      default: 0,
    },

    // Transaction Source Breakdown
    bySource: {
      manual: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      payment: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      cashback: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      refund: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      promotion: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    },

    // Transaction Type Breakdown
    byType: {
      credit: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      debit: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      cashback_pending: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
      cashback_credited: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    },

    // Linked Payment Methods
    linkedPaymentMethods: {
      upi: { type: Number, default: 0 },
      card: { type: Number, default: 0 },
      netbanking: { type: Number, default: 0 },
    },

    // Freeze Metrics
    freezeEvents: {
      type: Number,
      default: 0,
    },
    unfreezeEvents: {
      type: Number,
      default: 0,
    },
    avgFreezeDuration: {
      type: Number,
      default: 0,
    },

    // Limit Compliance
    usersReachedDailyLimit: {
      type: Number,
      default: 0,
    },
    usersReachedMonthlyLimit: {
      type: Number,
      default: 0,
    },
    usersReachedMaxBalance: {
      type: Number,
      default: 0,
    },

    // User Behavior
    usersWithMultiplePaymentMethods: {
      type: Number,
      default: 0,
    },
    usersWithBeneficiary: {
      type: Number,
      default: 0,
    },
    usersWithAutoTopup: {
      type: Number,
      default: 0,
    },

    // Promo Code Usage
    promoCodesApplied: {
      type: Number,
      default: 0,
    },
    totalPromoCodeValue: {
      type: Number,
      default: 0,
    },
    uniquePromoCodes: {
      type: Number,
      default: 0,
    },

    // Geographic Distribution
    byRegion: {
      type: Map,
      of: {
        wallets: Number,
        totalBalance: Number,
        activeUsers: Number,
      },
    },

    // Device Type Distribution
    byDeviceType: {
      mobile: { wallets: { type: Number, default: 0 }, transactions: { type: Number, default: 0 } },
      web: { wallets: { type: Number, default: 0 }, transactions: { type: Number, default: 0 } },
      app: { wallets: { type: Number, default: 0 }, transactions: { type: Number, default: 0 } },
    },

    // Timestamp
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'wallet_analytics',
  }
);

// Indexes
WalletAnalyticsSchema.index({ date: -1, period: 1 });
WalletAnalyticsSchema.index({ period: 1, date: -1 });
WalletAnalyticsSchema.index({ year: 1, month: 1, day: 1 });

module.exports = mongoose.model('WalletAnalytics', WalletAnalyticsSchema);
