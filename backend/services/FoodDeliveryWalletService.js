const FoodDeliveryWallet = require('../models/FoodDeliveryWallet');
const FoodDeliveryWalletTransaction = require('../models/FoodDeliveryWalletTransaction');

class WalletService {
  /**
   * Create wallet for user
   */
  static async createWallet(userId) {
    try {
      const existingWallet = await FoodDeliveryWallet.findOne({ userId });
      if (existingWallet) {
        return existingWallet;
      }

      const wallet = new FoodDeliveryWallet({
        userId,
        balance: 0,
        status: 'active',
      });

      await wallet.save();
      return wallet;
    } catch (error) {
      throw new Error(`Wallet creation failed: ${error.message}`);
    }
  }

  /**
   * Get user wallet
   */
  static async getWallet(userId) {
    try {
      let wallet = await FoodDeliveryWallet.findOne({ userId }).populate('recentTransactions');
      if (!wallet) {
        wallet = await this.createWallet(userId);
      }

      return wallet;
    } catch (error) {
      throw new Error(`Failed to get wallet: ${error.message}`);
    }
  }

  /**
   * Add money to wallet
   */
  static async addMoney(userId, amount, source = 'manual', details = {}) {
    try {
      let wallet = await this.getWallet(userId);

      if (!wallet.canAddMoney) {
        throw new Error('Daily wallet add limit exceeded');
      }

      if (wallet.balance + amount > wallet.limits.maxBalance) {
        throw new Error('Adding this amount would exceed wallet limit');
      }

      wallet.addMoney(amount, source);
      wallet.totalTransactionsCount += 1;
      wallet.totalMoneyAdded += amount;
      wallet.lastTransactionAt = new Date();

      // Update daily usage
      const today = new Date().toDateString();
      if (!wallet.dailyUsage || wallet.dailyUsage.date.toDateString() !== today) {
        wallet.dailyUsage = {
          date: new Date(),
          amountAdded: amount,
          amountUsed: 0,
          transactionCount: 1,
        };
      } else {
        wallet.dailyUsage.amountAdded += amount;
        wallet.dailyUsage.transactionCount += 1;
      }

      await wallet.save();

      // Create transaction record
      const transaction = new FoodDeliveryWalletTransaction({
        walletId: wallet._id,
        userId,
        transactionType: 'credit',
        amount,
        source,
        description: details.description || `Added ${amount} to wallet via ${source}`,
        balance: wallet.balance,
        status: 'completed',
        metadata: details.metadata || {},
      });

      await transaction.save();

      // Add to wallet's recent transactions
      wallet.recentTransactions.unshift(transaction._id);
      if (wallet.recentTransactions.length > 50) {
        wallet.recentTransactions.pop();
      }
      await wallet.save();

      return wallet;
    } catch (error) {
      throw new Error(`Failed to add money: ${error.message}`);
    }
  }

  /**
   * Use wallet balance (for payment)
   */
  static async useBalance(userId, amount, orderId, details = {}) {
    try {
      const wallet = await this.getWallet(userId);

      if (amount > wallet.balance) {
        throw new Error(`Insufficient balance. Available: ${wallet.balance}, Required: ${amount}`);
      }

      wallet.useBalance(amount);
      wallet.totalTransactionsCount += 1;
      wallet.totalMoneyUsed += amount;
      wallet.lastTransactionAt = new Date();

      // Calculate average transaction
      wallet.averageTransaction = wallet.totalMoneyUsed / wallet.totalTransactionsCount;

      await wallet.save();

      // Create transaction record
      const transaction = new FoodDeliveryWalletTransaction({
        walletId: wallet._id,
        userId,
        orderId,
        transactionType: 'debit',
        amount,
        source: 'payment',
        description: details.description || `Paid for order ${orderId}`,
        balance: wallet.balance,
        status: 'completed',
        metadata: details.metadata || {},
      });

      await transaction.save();

      // Add to wallet's recent transactions
      wallet.recentTransactions.unshift(transaction._id);
      if (wallet.recentTransactions.length > 50) {
        wallet.recentTransactions.pop();
      }
      await wallet.save();

      return wallet;
    } catch (error) {
      throw new Error(`Failed to use balance: ${error.message}`);
    }
  }

  /**
   * Add cashback
   */
  static async addCashback(userId, amount, reason, expiryDays = 30) {
    try {
      const wallet = await this.getWallet(userId);

      wallet.addCashback(amount, reason, expiryDays);
      await wallet.save();

      // Create transaction for pending cashback
      const transaction = new FoodDeliveryWalletTransaction({
        walletId: wallet._id,
        userId,
        transactionType: 'cashback_pending',
        amount,
        source: 'cashback',
        description: reason,
        balance: wallet.balance,
        status: 'pending',
        metadata: { expiryDays },
      });

      await transaction.save();

      return wallet;
    } catch (error) {
      throw new Error(`Failed to add cashback: ${error.message}`);
    }
  }

  /**
   * Credit pending cashback
   */
  static async creditCashback(userId, amount) {
    try {
      const wallet = await this.getWallet(userId);

      const pendingCB = wallet.pendingCashback.find((cb) => cb.status === 'pending' && cb.amount === amount);
      if (!pendingCB) {
        throw new Error('Pending cashback not found');
      }

      wallet.creditCashback(amount);
      wallet.lastTransactionAt = new Date();
      await wallet.save();

      // Create transaction
      const transaction = new FoodDeliveryWalletTransaction({
        walletId: wallet._id,
        userId,
        transactionType: 'cashback_credited',
        amount,
        source: 'cashback',
        description: `Cashback credited: ${pendingCB.reason}`,
        balance: wallet.balance,
        status: 'completed',
      });

      await transaction.save();

      return wallet;
    } catch (error) {
      throw new Error(`Failed to credit cashback: ${error.message}`);
    }
  }

  /**
   * Add promotional credit
   */
  static async addPromoCredit(userId, promoCode, amount, expiryDays = 7) {
    try {
      const wallet = await this.getWallet(userId);

      wallet.addPromoCredit(promoCode, amount, expiryDays);
      await wallet.save();

      return wallet;
    } catch (error) {
      throw new Error(`Failed to add promo credit: ${error.message}`);
    }
  }

  /**
   * Get wallet transactions
   */
  static async getTransactions(userId, limit = 20, skip = 0) {
    try {
      const transactions = await FoodDeliveryWalletTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return transactions;
    } catch (error) {
      throw new Error(`Failed to get transactions: ${error.message}`);
    }
  }

  /**
   * Freeze wallet (suspicious activity)
   */
  static async freezeWallet(userId, reason, expiryDays = 30) {
    try {
      const wallet = await this.getWallet(userId);

      wallet.freeze(reason, expiryDays);
      await wallet.save();

      return wallet;
    } catch (error) {
      throw new Error(`Failed to freeze wallet: ${error.message}`);
    }
  }

  /**
   * Unfreeze wallet
   */
  static async unfreezeWallet(userId) {
    try {
      const wallet = await this.getWallet(userId);

      wallet.unfreeze();
      await wallet.save();

      return wallet;
    } catch (error) {
      throw new Error(`Failed to unfreeze wallet: ${error.message}`);
    }
  }

  /**
   * Update wallet limits
   */
  static async updateLimits(userId, limits) {
    try {
      const wallet = await this.getWallet(userId);

      wallet.limits = { ...wallet.limits, ...limits };
      await wallet.save();

      return wallet;
    } catch (error) {
      throw new Error(`Failed to update limits: ${error.message}`);
    }
  }

  /**
   * Add linked payment method
   */
  static async addLinkedPaymentMethod(userId, method, details) {
    try {
      const wallet = await this.getWallet(userId);

      wallet.linkedPaymentMethods.push({
        type: method.type,
        value: method.value,
        method: method.method,
        isDefault: wallet.linkedPaymentMethods.length === 0, // First one is default
        addedAt: new Date(),
      });

      await wallet.save();

      return wallet;
    } catch (error) {
      throw new Error(`Failed to add payment method: ${error.message}`);
    }
  }

  /**
   * Get wallet summary
   */
  static async getWalletSummary(userId) {
    try {
      const wallet = await this.getWallet(userId);

      return wallet.toSummary();
    } catch (error) {
      throw new Error(`Failed to get wallet summary: ${error.message}`);
    }
  }

  /**
   * Set beneficiary for withdrawal
   */
  static async setBeneficiary(userId, beneficiaryDetails) {
    try {
      const wallet = await this.getWallet(userId);

      wallet.beneficiary = beneficiaryDetails;
      wallet.beneficiary.verifiedAt = new Date();
      await wallet.save();

      return wallet;
    } catch (error) {
      throw new Error(`Failed to set beneficiary: ${error.message}`);
    }
  }

  /**
   * Get wallet analytics
   */
  static async getWalletAnalytics(startDate, endDate) {
    try {
      const analytics = await FoodDeliveryWallet.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalBalance: { $sum: '$balance' },
            avgBalance: { $avg: '$balance' },
            totalCashback: { $sum: '$cashbackEarned' },
            totalPoints: { $sum: '$loyaltyPoints' },
          },
        },
      ]);

      return analytics;
    } catch (error) {
      throw new Error(`Failed to get wallet analytics: ${error.message}`);
    }
  }
}

module.exports = WalletService;
