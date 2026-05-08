const WalletAnalytics = require('../models/WalletAnalytics');
const FoodDeliveryWallet = require('../models/FoodDeliveryWallet');
const FoodDeliveryWalletTransaction = require('../models/FoodDeliveryWalletTransaction');

class WalletAnalyticsService {
  /**
   * Generate daily wallet analytics
   */
  static async generateDailyAnalytics(date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get transactions for the day
      const transactions = await FoodDeliveryWalletTransaction.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      });

      // Get wallet snapshots
      const wallets = await FoodDeliveryWallet.find({});

      const analytics = this._calculateMetrics(transactions, wallets, 'daily', date);
      await WalletAnalytics.updateOne(
        {
          date: startOfDay,
          period: 'daily',
        },
        analytics,
        { upsert: true }
      );

      return analytics;
    } catch (error) {
      throw new Error(`Daily wallet analytics failed: ${error.message}`);
    }
  }

  /**
   * Get wallet analytics range
   */
  static async getAnalyticsRange(startDate, endDate, period = 'daily') {
    try {
      const analytics = await WalletAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
        period,
      }).sort({ date: -1 });

      return analytics;
    } catch (error) {
      throw new Error(`Failed to fetch wallet analytics: ${error.message}`);
    }
  }

  /**
   * Get wallet health metrics
   */
  static async getWalletHealth(startDate, endDate) {
    try {
      const analytics = await WalletAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      const health = {
        totalActiveWallets: 0,
        kycVerifiedPercentage: 0,
        averageBalance: 0,
        totalBalance: 0,
        trend: [],
      };

      let totalWallets = 0;
      let totalKyc = 0;

      analytics.forEach((day) => {
        health.totalActiveWallets = day.activeWallets;
        health.totalBalance += day.totalBalance;
        totalWallets += day.totalWallets;
        totalKyc += day.kycVerifiedWallets;

        health.trend.push({
          date: day.date,
          activeWallets: day.activeWallets,
          totalBalance: day.totalBalance,
        });
      });

      if (analytics.length > 0) {
        health.kycVerifiedPercentage = 
          totalWallets > 0 ? (totalKyc / totalWallets) * 100 : 0;
        health.averageBalance = health.totalBalance / analytics.length;
      }

      return health;
    } catch (error) {
      throw new Error(`Failed to get wallet health: ${error.message}`);
    }
  }

  /**
   * Get cashback metrics
   */
  static async getCashbackMetrics(startDate, endDate) {
    try {
      const analytics = await WalletAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      const metrics = {
        totalEarned: 0,
        totalCredited: 0,
        totalExpired: 0,
        pendingTotal: 0,
        redemptionRate: 0,
        trend: [],
      };

      analytics.forEach((day) => {
        metrics.totalEarned += day.cashbackEarned;
        metrics.totalCredited += day.cashbackCredited;
        metrics.totalExpired += day.cashbackExpired;
        metrics.pendingTotal += day.pendingCashback;

        metrics.trend.push({
          date: day.date,
          earned: day.cashbackEarned,
          credited: day.cashbackCredited,
          expired: day.cashbackExpired,
        });
      });

      if (metrics.totalEarned > 0) {
        metrics.redemptionRate = (metrics.totalCredited / metrics.totalEarned) * 100;
      }

      return metrics;
    } catch (error) {
      throw new Error(`Failed to get cashback metrics: ${error.message}`);
    }
  }

  /**
   * Get transaction volume metrics
   */
  static async getTransactionVolume(startDate, endDate) {
    try {
      const analytics = await WalletAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      const metrics = {
        totalTransactions: 0,
        creditTransactions: 0,
        debitTransactions: 0,
        avgPerTransaction: 0,
        trend: [],
      };

      analytics.forEach((day) => {
        metrics.totalTransactions += day.totalTransactions;
        metrics.creditTransactions += day.creditTransactions;
        metrics.debitTransactions += day.debitTransactions;

        metrics.trend.push({
          date: day.date,
          total: day.totalTransactions,
          credits: day.creditTransactions,
          debits: day.debitTransactions,
        });
      });

      if (metrics.totalTransactions > 0) {
        metrics.avgPerTransaction = 
          (metrics.creditTransactions + metrics.debitTransactions) / metrics.totalTransactions;
      }

      return metrics;
    } catch (error) {
      throw new Error(`Failed to get transaction volume: ${error.message}`);
    }
  }

  /**
   * Get user segmentation
   */
  static async getUserSegmentation(startDate, endDate) {
    try {
      const analytics = await WalletAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      const segmentation = {
        activeUsers: 0,
        kycVerifiedUsers: 0,
        usersWithMultipleMethods: 0,
        usersWithAutoTopup: 0,
        usersReachedLimits: 0,
      };

      let maxActive = 0;
      let maxKyc = 0;
      let maxMultiple = 0;

      analytics.forEach((day) => {
        maxActive = Math.max(maxActive, day.activeWallets);
        maxKyc = Math.max(maxKyc, day.kycVerifiedWallets);
        maxMultiple = Math.max(maxMultiple, day.usersWithMultiplePaymentMethods || 0);
        segmentation.usersWithAutoTopup += day.usersWithAutoTopup || 0;
        segmentation.usersReachedLimits += 
          (day.usersReachedDailyLimit || 0) + (day.usersReachedMonthlyLimit || 0);
      });

      segmentation.activeUsers = maxActive;
      segmentation.kycVerifiedUsers = maxKyc;
      segmentation.usersWithMultipleMethods = maxMultiple;

      return segmentation;
    } catch (error) {
      throw new Error(`Failed to get user segmentation: ${error.message}`);
    }
  }

  /**
   * Get promo code performance
   */
  static async getPromoCodePerformance(startDate, endDate) {
    try {
      const analytics = await WalletAnalytics.find({
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      const performance = {
        totalCodesApplied: 0,
        totalPromoValue: 0,
        uniquePromos: 0,
        avgValuePerCode: 0,
      };

      analytics.forEach((day) => {
        performance.totalCodesApplied += day.promoCodesApplied || 0;
        performance.totalPromoValue += day.totalPromoCodeValue || 0;
        performance.uniquePromos = Math.max(performance.uniquePromos, day.uniquePromoCodes || 0);
      });

      if (performance.totalCodesApplied > 0) {
        performance.avgValuePerCode = performance.totalPromoValue / performance.totalCodesApplied;
      }

      return performance;
    } catch (error) {
      throw new Error(`Failed to get promo code performance: ${error.message}`);
    }
  }

  /**
   * Private: Calculate wallet metrics
   */
  static _calculateMetrics(transactions, wallets, period, date) {
    const bySource = {
      manual: { count: 0, amount: 0 },
      payment: { count: 0, amount: 0 },
      cashback: { count: 0, amount: 0 },
      refund: { count: 0, amount: 0 },
      promotion: { count: 0, amount: 0 },
    };

    let totalCredits = 0;
    let totalDebits = 0;
    let creditCount = 0;
    let debitCount = 0;
    let totalBalance = 0;
    let promoTotal = 0;
    let cashbackEarned = 0;

    transactions.forEach((txn) => {
      if (bySource[txn.source]) {
        bySource[txn.source].count += 1;
        bySource[txn.source].amount += txn.amount;
      }

      if (txn.isCredit) {
        totalCredits += txn.amount;
        creditCount += 1;
      } else {
        totalDebits += txn.amount;
        debitCount += 1;
      }
    });

    wallets.forEach((wallet) => {
      totalBalance += wallet.balance;
      promoTotal += wallet.promotionalBalance || 0;

      wallet.pendingCashback.forEach((cb) => {
        if (cb.status === 'pending') {
          cashbackEarned += cb.amount;
        }
      });
    });

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    return {
      period,
      date: startOfDay,
      year: startOfDay.getFullYear(),
      month: startOfDay.getMonth() + 1,
      day: startOfDay.getDate(),
      totalWallets: wallets.length,
      activeWallets: wallets.filter((w) => w.status === 'active').length,
      frozenWallets: wallets.filter((w) => w.status === 'frozen').length,
      kycVerifiedWallets: wallets.filter((w) => w.kycVerified).length,
      totalTransactions: transactions.length,
      creditTransactions: creditCount,
      debitTransactions: debitCount,
      totalCredits,
      totalDebits,
      avgTransactionAmount: transactions.length > 0 ? 
        (totalCredits + totalDebits) / transactions.length : 0,
      totalBalance,
      avgBalance: wallets.length > 0 ? totalBalance / wallets.length : 0,
      totalPromotionalBalance: promoTotal,
      cashbackEarned,
      bySource,
    };
  }
}

module.exports = WalletAnalyticsService;
