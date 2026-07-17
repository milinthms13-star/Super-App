/**
 * Commission Processing Service
 * Handles automated commission processing and settlement scheduling
 */

const EcommerceTransaction = require('../models/EcommerceTransaction');
const EcommercePayout = require('../models/EcommercePayout');
const EcommerceSellerProfile = require('../models/EcommerceSellerProfile');
const Order = require('../models/Order');
const CommissionCalculationService = require('./CommissionCalculationService');
const logger = require('../utils/logger');

class CommissionProcessingService {
  /**
   * Process commission for a completed order
   */
  static async processOrderCommission(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if commission already processed
      const existing = await EcommerceTransaction.findOne({ orderId });
      if (existing) {
        logger.info(`Commission already processed for order ${orderId}`);
        return { alreadyProcessed: true, transactions: [existing] };
      }

      // Calculate commission
      const commissionData = await CommissionCalculationService.calculateOrderCommission(
        orderId,
        order
      );

      // Create transaction records
      const transactions = await CommissionCalculationService.createTransactionRecords(
        orderId,
        commissionData
      );

      logger.info(`Processed commission for order ${orderId}: ${transactions.length} transactions created`);

      return {
        success: true,
        transactions,
        commissionData,
      };
    } catch (error) {
      logger.error(`Error processing order commission for ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Generate payout for a seller
   */
  static async generateSellerPayout(sellerId, periodType = 'weekly') {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      if (!seller) {
        throw new Error('Seller not found');
      }

      // Calculate period dates
      const endDate = new Date();
      const startDate = new Date();

      switch (periodType) {
        case 'daily':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'bi-weekly':
          startDate.setDate(startDate.getDate() - 14);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      // Get eligible transactions
      const transactions = await EcommerceTransaction.find({
        sellerId: seller._id,
        status: 'completed',
        'settlement.status': 'pending',
        createdAt: { $gte: startDate, $lte: endDate },
      });

      if (transactions.length === 0) {
        logger.info(`No eligible transactions for payout: seller ${seller.sellerEmail}`);
        return { success: true, message: 'No transactions to process' };
      }

      // Calculate totals
      const summary = {
        totalOrders: transactions.length,
        totalRevenue: 0,
        totalCommission: 0,
        totalGST: 0,
        totalDeductions: 0,
        netPayable: 0,
      };

      transactions.forEach((txn) => {
        summary.totalRevenue += txn.productAmount;
        summary.totalCommission += txn.commission.amount;
        summary.totalGST += txn.commission.gst.amount;
        summary.totalDeductions += txn.commission.totalCommission;
        summary.netPayable += txn.settlement.netAmount;
      });

      // Create payout record
      const payout = new EcommercePayout({
        sellerId: seller._id,
        sellerEmail: seller.sellerEmail,
        sellerName: seller.businessName,
        period: {
          type: periodType,
          startDate,
          endDate,
        },
        summary,
        transactions: transactions.map((txn) => ({
          transactionId: txn._id,
          orderId: txn.orderId,
          amount: txn.productAmount,
          commission: txn.commission.totalCommission,
          date: txn.createdAt,
        })),
        bankDetails: {
          accountHolderName: seller.bankDetails.accountHolderName,
          accountNumber: seller.bankDetails.accountNumber,
          ifscCode: seller.bankDetails.ifscCode,
          bankName: seller.bankDetails.bankName,
          branchName: seller.bankDetails.branchName,
        },
        status: 'pending',
        paymentMethod: 'bank_transfer',
      });

      await payout.save();

      // Update transaction settlement status
      for (const txn of transactions) {
        txn.settlement.status = 'processing';
        await txn.save();
      }

      logger.info(`Payout ${payout.payoutId} generated for seller ${seller.sellerEmail}: ₹${summary.netPayable}`);

      return {
        success: true,
        payout,
      };
    } catch (error) {
      logger.error('Error generating seller payout:', error);
      throw error;
    }
  }

  /**
   * Generate payouts for all eligible sellers
   */
  static async generateAllPayouts(periodType = 'weekly') {
    try {
      // Get sellers with pending settlements
      const sellersWithPending = await EcommerceTransaction.aggregate([
        {
          $match: {
            status: 'completed',
            'settlement.status': 'pending',
          },
        },
        {
          $group: {
            _id: '$sellerId',
            pendingAmount: { $sum: '$settlement.netAmount' },
            transactionCount: { $sum: 1 },
          },
        },
      ]);

      const results = {
        processed: 0,
        failed: 0,
        totalAmount: 0,
        payouts: [],
      };

      for (const seller of sellersWithPending) {
        try {
          const result = await this.generateSellerPayout(seller._id, periodType);
          if (result.success && result.payout) {
            results.processed++;
            results.totalAmount += result.payout.summary.netPayable;
            results.payouts.push(result.payout);
          }
        } catch (error) {
          logger.error(`Failed to generate payout for seller ${seller._id}:`, error);
          results.failed++;
        }
      }

      logger.info(`Payout generation complete: ${results.processed} processed, ${results.failed} failed`);

      return results;
    } catch (error) {
      logger.error('Error generating all payouts:', error);
      throw error;
    }
  }

  /**
   * Process refund and adjust commission
   */
  static async processRefundCommission(orderId, refundAmount, reason) {
    try {
      const transactions = await EcommerceTransaction.find({ orderId });

      if (transactions.length === 0) {
        throw new Error('No transactions found for this order');
      }

      const refundTransactions = [];

      for (const originalTxn of transactions) {
        const seller = await EcommerceSellerProfile.findById(originalTxn.sellerId);
        if (!seller) continue;

        // Calculate proportional refund
        const refundProportion = refundAmount / originalTxn.productAmount;
        const refundCommission = originalTxn.commission.totalCommission * refundProportion;
        const refundNet = originalTxn.settlement.netAmount * refundProportion;

        // Create refund transaction
        const refundTxn = new EcommerceTransaction({
          transactionId: `REFUND-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          orderId: originalTxn.orderId,
          sellerId: originalTxn.sellerId,
          sellerEmail: originalTxn.sellerEmail,
          buyerId: originalTxn.buyerId,
          buyerEmail: originalTxn.buyerEmail,
          type: 'refund',
          orderAmount: -refundAmount,
          productAmount: -refundAmount,
          totalAmount: -refundAmount,
          currency: 'INR',
          commission: {
            type: originalTxn.commission.type,
            rate: originalTxn.commission.rate,
            amount: -refundCommission,
            totalCommission: -refundCommission,
            category: originalTxn.commission.category,
            subscriptionPlan: originalTxn.commission.subscriptionPlan,
          },
          settlement: {
            grossAmount: -refundAmount,
            netAmount: -refundNet,
            status: 'completed',
          },
          refund: {
            requested: true,
            requestedAt: new Date(),
            reason,
            amount: refundAmount,
            status: 'processed',
            processedAt: new Date(),
          },
          status: 'completed',
        });

        await refundTxn.save();
        refundTransactions.push(refundTxn);

        // Update seller metrics
        seller.metrics.totalRevenue = Math.max(0, seller.metrics.totalRevenue - refundAmount);
        seller.metrics.totalCommissionPaid = Math.max(0, seller.metrics.totalCommissionPaid - refundCommission);
        await seller.save();

        logger.info(`Refund transaction created: ${refundTxn.transactionId} for seller ${seller.sellerEmail}`);
      }

      return {
        success: true,
        refundTransactions,
      };
    } catch (error) {
      logger.error('Error processing refund commission:', error);
      throw error;
    }
  }

  /**
   * Apply penalty or adjustment to seller
   */
  static async applySellerAdjustment(sellerId, amount, reason, type = 'penalty') {
    try {
      const seller = await EcommerceSellerProfile.findById(sellerId);
      if (!seller) {
        throw new Error('Seller not found');
      }

      const adjustmentTxn = new EcommerceTransaction({
        transactionId: `ADJ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        orderId: null,
        sellerId: seller._id,
        sellerEmail: seller.sellerEmail,
        buyerId: null,
        buyerEmail: 'system@superapp.com',
        type: type,
        orderAmount: 0,
        productAmount: 0,
        totalAmount: -Math.abs(amount),
        currency: 'INR',
        commission: {
          type: 'flat',
          rate: 0,
          amount: 0,
          totalCommission: 0,
        },
        settlement: {
          grossAmount: 0,
          netAmount: -Math.abs(amount),
          deductions: [
            {
              type: type,
              amount: Math.abs(amount),
              description: reason,
            },
          ],
          status: 'completed',
        },
        status: 'completed',
        notes: reason,
      });

      await adjustmentTxn.save();

      logger.info(`Adjustment applied: ${adjustmentTxn.transactionId} for seller ${seller.sellerEmail}: ₹${amount}`);

      return {
        success: true,
        transaction: adjustmentTxn,
      };
    } catch (error) {
      logger.error('Error applying seller adjustment:', error);
      throw error;
    }
  }

  /**
   * Reconcile transactions and payouts
   */
  static async reconcileTransactions(startDate, endDate) {
    try {
      const transactions = await EcommerceTransaction.find({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        reconciled: false,
      });

      let reconciledCount = 0;
      const discrepancies = [];

      for (const txn of transactions) {
        try {
          // Verify order exists
          if (txn.orderId) {
            const order = await Order.findById(txn.orderId);
            if (!order) {
              discrepancies.push({
                transactionId: txn.transactionId,
                issue: 'Order not found',
              });
              continue;
            }
          }

          // Verify seller exists
          const seller = await EcommerceSellerProfile.findById(txn.sellerId);
          if (!seller) {
            discrepancies.push({
              transactionId: txn.transactionId,
              issue: 'Seller not found',
            });
            continue;
          }

          // Mark as reconciled
          txn.reconciled = true;
          txn.reconciledAt = new Date();
          await txn.save();

          reconciledCount++;
        } catch (error) {
          logger.error(`Error reconciling transaction ${txn.transactionId}:`, error);
          discrepancies.push({
            transactionId: txn.transactionId,
            issue: error.message,
          });
        }
      }

      logger.info(`Reconciliation complete: ${reconciledCount} reconciled, ${discrepancies.length} discrepancies`);

      return {
        success: true,
        reconciled: reconciledCount,
        discrepancies,
      };
    } catch (error) {
      logger.error('Error reconciling transactions:', error);
      throw error;
    }
  }

  /**
   * Get commission processing queue status
   */
  static async getProcessingQueueStatus() {
    try {
      const pendingOrders = await Order.countDocuments({
        status: 'Delivered',
        commission: { $exists: false },
      });

      const pendingSettlements = await EcommerceTransaction.countDocuments({
        status: 'completed',
        'settlement.status': 'pending',
      });

      const processingPayouts = await EcommercePayout.countDocuments({
        status: 'processing',
      });

      const unreconciled = await EcommerceTransaction.countDocuments({
        reconciled: false,
        createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Older than 1 day
      });

      return {
        pendingOrders,
        pendingSettlements,
        processingPayouts,
        unreconciled,
      };
    } catch (error) {
      logger.error('Error getting queue status:', error);
      throw error;
    }
  }
}

module.exports = CommissionProcessingService;
