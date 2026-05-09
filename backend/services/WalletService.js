/**
 * WalletService.js
 * Manages user wallet operations, balance tracking, add money, transactions
 * 
 * Methods:
 * - getWalletBalance(userId)
 * - addMoneyInitiate(userId, amount)
 * - addMoneyComplete(userId, amount, paymentId)
 * - deductFromWallet(userId, amount, rideId, reason)
 * - addCashback(userId, amount, rideId, reason)
 * - getTransactionHistory(userId, limit, skip)
 * - setWalletPin(userId, pin)
 * - verifyWalletPin(userId, pin)
 * - getWalletSummary(userId)
 */

class WalletService {
  constructor() {
    this.Wallet = require('../models/Wallet');
    this.WalletTransaction = require('../models/WalletTransaction');
    this.User = require('../models/User');
  }

  /**
   * Get wallet balance for user
   */
  async getWalletBalance(userId) {
    try {
      const wallet = await this.Wallet.findOne({ userId });
      if (!wallet) {
        // Create wallet if doesn't exist
        const newWallet = new this.Wallet({
          userId,
          balance: 0,
          currency: 'INR',
          totalAdded: 0,
          totalSpent: 0,
          totalCashback: 0,
          lastUpdated: new Date()
        });
        await newWallet.save();
        return { success: true, balance: 0, wallet: newWallet };
      }
      return { success: true, balance: wallet.balance, wallet };
    } catch (error) {
      console.error('Error getting wallet balance:', error.message);
      throw new Error('Failed to get wallet balance');
    }
  }

  /**
   * Initiate add money transaction
   */
  async addMoneyInitiate(userId, amount) {
    try {
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      if (amount < 50) {
        throw new Error('Minimum amount is ₹50');
      }
      if (amount > 100000) {
        throw new Error('Maximum amount is ₹1,00,000');
      }

      // Create pending transaction
      const transaction = new this.WalletTransaction({
        userId,
        type: 'credit',
        amount,
        source: 'add_money',
        status: 'pending',
        description: `Add money to wallet`,
        transactionDate: new Date()
      });

      await transaction.save();
      return { success: true, transactionId: transaction._id, amount };
    } catch (error) {
      console.error('Error initiating add money:', error.message);
      throw error;
    }
  }

  /**
   * Complete add money payment
   */
  async addMoneyComplete(userId, amount, paymentId) {
    try {
      const wallet = await this.Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Update wallet balance
      wallet.balance += amount;
      wallet.totalAdded += amount;
      wallet.lastUpdated = new Date();
      await wallet.save();

      // Create transaction record
      const transaction = new this.WalletTransaction({
        userId,
        type: 'credit',
        amount,
        source: 'add_money',
        status: 'completed',
        paymentId,
        description: `Money added to wallet`,
        transactionDate: new Date()
      });

      await transaction.save();

      return {
        success: true,
        message: `₹${amount} added to wallet`,
        newBalance: wallet.balance,
        transactionId: transaction._id
      };
    } catch (error) {
      console.error('Error completing add money:', error.message);
      throw error;
    }
  }

  /**
   * Deduct amount from wallet for ride payment
   */
  async deductFromWallet(userId, amount, rideId, reason = 'ride_payment') {
    try {
      const wallet = await this.Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (wallet.balance < amount) {
        return {
          success: false,
          message: 'Insufficient wallet balance',
          availableBalance: wallet.balance,
          required: amount
        };
      }

      // Deduct from wallet
      wallet.balance -= amount;
      wallet.totalSpent += amount;
      wallet.lastUpdated = new Date();
      await wallet.save();

      // Create transaction record
      const transaction = new this.WalletTransaction({
        userId,
        type: 'debit',
        amount,
        source: 'ride_payment',
        status: 'completed',
        rideId,
        description: `Payment for ride: ${rideId}`,
        reason,
        transactionDate: new Date()
      });

      await transaction.save();

      return {
        success: true,
        message: `₹${amount} deducted from wallet`,
        newBalance: wallet.balance,
        transactionId: transaction._id
      };
    } catch (error) {
      console.error('Error deducting from wallet:', error.message);
      throw error;
    }
  }

  /**
   * Add cashback to wallet
   */
  async addCashback(userId, amount, rideId, reason = 'cashback') {
    try {
      const wallet = await this.Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Add cashback
      wallet.balance += amount;
      wallet.totalCashback += amount;
      wallet.lastUpdated = new Date();
      await wallet.save();

      // Create transaction record
      const transaction = new this.WalletTransaction({
        userId,
        type: 'credit',
        amount,
        source: 'cashback',
        status: 'completed',
        rideId,
        description: `Cashback earned: ${reason}`,
        reason,
        transactionDate: new Date()
      });

      await transaction.save();

      return {
        success: true,
        message: `₹${amount} cashback added`,
        newBalance: wallet.balance,
        transactionId: transaction._id
      };
    } catch (error) {
      console.error('Error adding cashback:', error.message);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId, limit = 20, skip = 0) {
    try {
      const transactions = await this.WalletTransaction.find({ userId })
        .sort({ transactionDate: -1 })
        .limit(limit)
        .skip(skip)
        .select('type amount source status description reason transactionDate -userId');

      const total = await this.WalletTransaction.countDocuments({ userId });

      return {
        success: true,
        transactions,
        pagination: {
          total,
          limit,
          skip,
          page: Math.floor(skip / limit) + 1,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting transaction history:', error.message);
      throw error;
    }
  }

  /**
   * Set wallet PIN for security
   */
  async setWalletPin(userId, pin) {
    try {
      if (!pin || pin.length !== 4) {
        throw new Error('PIN must be 4 digits');
      }

      if (!/^\d+$/.test(pin)) {
        throw new Error('PIN must contain only numbers');
      }

      const wallet = await this.Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // In production, hash the PIN
      wallet.pin = pin; // TODO: Use bcrypt for hashing
      wallet.pinSet = true;
      wallet.lastUpdated = new Date();
      await wallet.save();

      return { success: true, message: 'Wallet PIN set successfully' };
    } catch (error) {
      console.error('Error setting wallet PIN:', error.message);
      throw error;
    }
  }

  /**
   * Verify wallet PIN
   */
  async verifyWalletPin(userId, pin) {
    try {
      if (!pin || pin.length !== 4) {
        throw new Error('Invalid PIN format');
      }

      const wallet = await this.Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (!wallet.pinSet) {
        return { success: false, message: 'Wallet PIN not set' };
      }

      // In production, use bcrypt comparison
      const pinMatches = wallet.pin === pin;

      return {
        success: pinMatches,
        message: pinMatches ? 'PIN verified' : 'Invalid PIN',
        verified: pinMatches
      };
    } catch (error) {
      console.error('Error verifying wallet PIN:', error.message);
      throw error;
    }
  }

  /**
   * Get wallet summary with stats
   */
  async getWalletSummary(userId) {
    try {
      const wallet = await this.Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Get statistics
      const thisMonth = new Date();
      thisMonth.setDate(1);

      const monthlyStats = await this.WalletTransaction.aggregate([
        {
          $match: {
            userId,
            transactionDate: { $gte: thisMonth }
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' }
          }
        }
      ]);

      const stats = {
        monthlyAdded: monthlyStats.find(s => s._id === 'credit')?.total || 0,
        monthlySpent: monthlyStats.find(s => s._id === 'debit')?.total || 0
      };

      return {
        success: true,
        wallet: {
          balance: wallet.balance,
          currency: wallet.currency,
          totalAdded: wallet.totalAdded,
          totalSpent: wallet.totalSpent,
          totalCashback: wallet.totalCashback,
          pinSet: wallet.pinSet,
          lastUpdated: wallet.lastUpdated
        },
        monthlyStats: stats
      };
    } catch (error) {
      console.error('Error getting wallet summary:', error.message);
      throw error;
    }
  }

  /**
   * Get low balance alert
   */
  async checkLowBalance(userId, threshold = 100) {
    try {
      const wallet = await this.Wallet.findOne({ userId });
      if (!wallet) {
        return { lowBalance: false };
      }

      return {
        lowBalance: wallet.balance < threshold,
        balance: wallet.balance,
        threshold
      };
    } catch (error) {
      console.error('Error checking low balance:', error.message);
      throw error;
    }
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(userId) {
    try {
      const wallet = await this.Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const totalTransactions = await this.WalletTransaction.countDocuments({ userId });
      const lastTransaction = await this.WalletTransaction.findOne({ userId })
        .sort({ transactionDate: -1 })
        .select('transactionDate type amount');

      return {
        success: true,
        balance: wallet.balance,
        totalTransactions,
        totalAdded: wallet.totalAdded,
        totalSpent: wallet.totalSpent,
        totalCashback: wallet.totalCashback,
        lastTransaction
      };
    } catch (error) {
      console.error('Error getting wallet stats:', error.message);
      throw error;
    }
  }
}

module.exports = new WalletService();
