/**
 * Transaction Service - Phase 11 Payment Processing
 * Manages transaction ledger and history tracking
 */

const Transaction = require('../models/Transaction');
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

class TransactionService {
  /**
   * Create a new transaction
   */
  static async createTransaction(transactionData) {
    try {
      const transactionId = `TXN_${Date.now()}_${randomUUID().split('-')[0].toUpperCase()}`;

      const transaction = new Transaction({
        ...transactionData,
        transactionId,
        status: transactionData.status || 'pending',
      });

      await transaction.save();
      logger.info(`Transaction created: ${transactionId}`);

      return transaction;
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction details
   */
  static async getTransaction(transactionId) {
    try {
      const transaction = await Transaction.findOne({ 
        $or: [{ _id: transactionId }, { transactionId }] 
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return transaction;
    } catch (error) {
      logger.error('Error fetching transaction:', error);
      throw error;
    }
  }

  /**
   * Get transactions for user
   */
  static async getTransactionsByUser(userId, options = {}) {
    try {
      const { page = 1, limit = 10, status, type } = options;
      const skip = (page - 1) * limit;

      const query = { userId };
      if (status) query.status = status;
      if (type) query.transactionType = type;

      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Transaction.countDocuments(query);

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching user transactions:', error);
      throw error;
    }
  }

  /**
   * Get transactions for payment
   */
  static async getTransactionsByPayment(paymentId) {
    try {
      const transactions = await Transaction.find({ paymentId }).sort({ createdAt: -1 });
      return transactions;
    } catch (error) {
      logger.error('Error fetching payment transactions:', error);
      throw error;
    }
  }

  /**
   * Update transaction status
   */
  static async updateTransactionStatus(transactionId, status, details) {
    try {
      const transaction = await Transaction.findOne({ 
        $or: [{ _id: transactionId }, { transactionId }] 
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      transaction.status = status;
      
      if (details) {
        if (details.failureInfo) {
          transaction.failureInfo = { ...transaction.failureInfo, ...details.failureInfo };
        }
        if (details.balanceAfter !== undefined) {
          transaction.balanceAfter = details.balanceAfter;
        }
      }

      await transaction.save();
      this.logAudit(transaction._id, `status_updated_to_${status}`, details, 'system');

      return transaction;
    } catch (error) {
      logger.error('Error updating transaction status:', error);
      throw error;
    }
  }

  /**
   * Retry failed transaction
   */
  static async retryTransaction(transactionId) {
    try {
      const transaction = await Transaction.findOne({ 
        $or: [{ _id: transactionId }, { transactionId }] 
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (!transaction.canBeRetried()) {
        throw new Error('Transaction cannot be retried');
      }

      transaction.failureInfo.retryCount += 1;
      transaction.status = 'pending';
      
      await transaction.save();
      this.logAudit(transaction._id, 'retry_initiated', {}, 'system');

      return transaction;
    } catch (error) {
      logger.error('Error retrying transaction:', error);
      throw error;
    }
  }

  /**
   * Reverse transaction
   */
  static async reverseTransaction(transactionId, reason) {
    try {
      const transaction = await Transaction.findOne({ 
        $or: [{ _id: transactionId }, { transactionId }] 
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Create reversal transaction
      const reversalId = `REV_${Date.now()}_${randomUUID().split('-')[0].toUpperCase()}`;
      
      const reversal = new Transaction({
        transactionId: reversalId,
        paymentId: transaction.paymentId,
        orderId: transaction.orderId,
        userId: transaction.userId,
        transactionType: 'reversal',
        amount: transaction.amount,
        currency: transaction.currency,
        description: `Reversal of ${transaction.transactionId}: ${reason}`,
        status: 'completed',
        reference: {
          originalTransactionId: transaction.transactionId,
        },
      });

      await reversal.save();

      // Mark original as reversed
      transaction.status = 'reversed';
      await transaction.save();

      this.logAudit(transaction._id, 'reversed', { reason, reversalId }, 'admin');

      return { original: transaction, reversal };
    } catch (error) {
      logger.error('Error reversing transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction statistics for a period
   */
  static async getTransactionStats(options = {}) {
    try {
      const { startDate, endDate, userId, gateway } = options;

      const matchStage = {};
      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
      }
      if (userId) matchStage.userId = userId;
      if (gateway) matchStage.gateway = gateway;

      const stats = await Transaction.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$transactionType',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' },
            minAmount: { $min: '$amount' },
            maxAmount: { $max: '$amount' },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]);

      return stats;
    } catch (error) {
      logger.error('Error fetching transaction stats:', error);
      throw error;
    }
  }

  /**
   * Get failed transactions needing retry
   */
  static async getFailedTransactionsForRetry() {
    try {
      const transactions = await Transaction.find({
        status: 'failed',
        'failureInfo.canRetry': true,
        'failureInfo.retryCount': { $lt: '$failureInfo.maxRetries' },
      });

      return transactions;
    } catch (error) {
      logger.error('Error fetching failed transactions:', error);
      throw error;
    }
  }

  /**
   * Log transaction audit trail
   */
  static logAudit(transactionId, action, details, performedBy) {
    Transaction.findByIdAndUpdate(
      transactionId,
      {
        $push: {
          auditLog: {
            timestamp: new Date(),
            action,
            details,
            performedBy,
          },
        },
      },
      { new: true }
    ).catch(err => logger.error('Error logging audit:', err));
  }

  /**
   * Export transactions
   */
  static async exportTransactions(options = {}) {
    try {
      const { format = 'json', startDate, endDate } = options;

      const query = {};
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const transactions = await Transaction.find(query);

      if (format === 'csv') {
        // Implement CSV export
        return this.convertToCSV(transactions);
      }

      return transactions;
    } catch (error) {
      logger.error('Error exporting transactions:', error);
      throw error;
    }
  }

  /**
   * Convert transactions to CSV format
   */
  static convertToCSV(transactions) {
    const headers = ['Transaction ID', 'Payment ID', 'Order ID', 'User ID', 'Type', 'Amount', 'Status', 'Created At'];
    const rows = transactions.map(t => [
      t.transactionId,
      t.paymentId,
      t.orderId,
      t.userId,
      t.transactionType,
      t.amount,
      t.status,
      t.createdAt.toISOString(),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csv;
  }
}

module.exports = TransactionService;
