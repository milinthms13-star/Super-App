/**
 * Transaction Controller - Phase 11 Payment Processing
 * Handles API endpoints for transaction operations
 */

const TransactionService = require('../services/TransactionService');
const logger = require('../utils/logger');

class TransactionController {
  /**
   * Get transaction details
   * GET /api/v1/transactions/:transactionId
   */
  static async getTransaction(req, res) {
    try {
      const { transactionId } = req.params;

      const transaction = await TransactionService.getTransaction(transactionId);

      res.status(200).json({
        success: true,
        data: transaction,
        message: 'Transaction retrieved successfully',
      });
    } catch (error) {
      logger.error('Error fetching transaction:', error);
      res.status(404).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Get user transactions
   * GET /api/v1/transactions/user/:userId
   */
  static async getUserTransactions(req, res) {
    try {
      const { userId } = req.params;
      const { page, limit, status, type } = req.query;

      const result = await TransactionService.getTransactionsByUser(userId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status,
        type,
      });

      res.status(200).json({
        success: true,
        data: result.transactions,
        pagination: result.pagination,
        message: 'User transactions retrieved successfully',
      });
    } catch (error) {
      logger.error('Error fetching user transactions:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Get payment transactions
   * GET /api/v1/transactions/payment/:paymentId
   */
  static async getPaymentTransactions(req, res) {
    try {
      const { paymentId } = req.params;

      const transactions = await TransactionService.getTransactionsByPayment(paymentId);

      res.status(200).json({
        success: true,
        data: transactions,
        message: 'Payment transactions retrieved successfully',
      });
    } catch (error) {
      logger.error('Error fetching payment transactions:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Retry failed transaction
   * POST /api/v1/transactions/:transactionId/retry
   */
  static async retryTransaction(req, res) {
    try {
      const { transactionId } = req.params;

      const transaction = await TransactionService.retryTransaction(transactionId);

      res.status(200).json({
        success: true,
        data: transaction,
        message: 'Transaction retry initiated successfully',
      });
    } catch (error) {
      logger.error('Error retrying transaction:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Reverse transaction
   * POST /api/v1/transactions/:transactionId/reverse
   */
  static async reverseTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      const { reason } = req.body;

      const result = await TransactionService.reverseTransaction(transactionId, reason);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Transaction reversed successfully',
      });
    } catch (error) {
      logger.error('Error reversing transaction:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Get transaction statistics
   * GET /api/v1/transactions/stats/summary
   */
  static async getTransactionStats(req, res) {
    try {
      const { startDate, endDate, userId, gateway } = req.query;

      const stats = await TransactionService.getTransactionStats({
        startDate,
        endDate,
        userId,
        gateway,
      });

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Transaction statistics retrieved successfully',
      });
    } catch (error) {
      logger.error('Error fetching transaction stats:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Export transactions
   * GET /api/v1/transactions/export
   */
  static async exportTransactions(req, res) {
    try {
      const { format, startDate, endDate } = req.query;

      const data = await TransactionService.exportTransactions({
        format: format || 'json',
        startDate,
        endDate,
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
        res.status(200).send(data);
      } else {
        res.status(200).json({
          success: true,
          data,
          message: 'Transactions exported successfully',
        });
      }
    } catch (error) {
      logger.error('Error exporting transactions:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }

  /**
   * Get failed transactions needing retry
   * GET /api/v1/transactions/failed/retry-pending
   */
  static async getFailedTransactions(req, res) {
    try {
      const transactions = await TransactionService.getFailedTransactionsForRetry();

      res.status(200).json({
        success: true,
        data: transactions,
        count: transactions.length,
        message: 'Failed transactions retrieved successfully',
      });
    } catch (error) {
      logger.error('Error fetching failed transactions:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [error.message],
      });
    }
  }
}

module.exports = TransactionController;
