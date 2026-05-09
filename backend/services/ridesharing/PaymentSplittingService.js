/**
 * PaymentSplittingService.js
 * Phase 12: Advanced Payment Splitting & Commission Management
 * Payment splits for shared rides, commission calculations, settlement
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

class PaymentSplittingService {
  /**
   * Create payment split configuration
   */
  static async createSplitConfiguration(splitData) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_splits');

      const splitConfigId = `spl_cfg_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      // Validate split percentages sum to 100
      const totalPercentage = splitData.splits.reduce((sum, s) => sum + s.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error('Split percentages must sum to 100%');
      }

      const config = {
        splitConfigId,
        transactionType: splitData.transactionType,
        splits: splitData.splits.map(s => ({
          recipientId: s.recipientId,
          recipientType: s.recipientType,
          percentage: s.percentage,
          fixedAmount: s.fixedAmount || null,
          description: s.description,
          accountNumber: s.accountNumber || null
        })),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await collection.insertOne(config);

      return {
        success: true,
        message: 'Payment split configuration created successfully',
        data: {
          splitConfigId,
          transactionType: config.transactionType,
          splits: config.splits
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Process payment split
   */
  static async processPaymentSplit(splitData) {
    try {
      const db = mongoose.connection.db;
      const splitsCollection = db.collection('payment_splits');
      const settlementsCollection = db.collection('payment_settlements');

      const splitId = `split_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      // Get split configuration
      const config = await splitsCollection.findOne(
        { splitConfigId: splitData.splitConfigId }
      );

      if (!config) {
        throw new Error('Split configuration not found');
      }

      // Calculate individual splits
      const settlements = [];
      let totalProcessed = 0;

      for (const split of config.splits) {
        let amount = splitData.totalAmount * (split.percentage / 100);
        if (split.fixedAmount) {
          amount = split.fixedAmount;
        }

        const settlement = {
          settlementId: `settle_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          transactionId: splitData.transactionId,
          splitConfigId: config.splitConfigId,
          recipientId: split.recipientId,
          recipientType: split.recipientType,
          amount: Math.round(amount * 100) / 100,
          percentage: split.percentage,
          currency: splitData.currency,
          status: 'pending',
          createdAt: new Date(),
          estimatedSettlementDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        };

        settlements.push(settlement);
        totalProcessed += settlement.amount;
      }

      // Insert all settlements
      const insertResult = await settlementsCollection.insertMany(settlements);

      return {
        success: true,
        message: 'Payment split processed successfully',
        data: {
          splitId,
          transactionId: splitData.transactionId,
          totalAmount: splitData.totalAmount,
          totalProcessed: Math.round(totalProcessed * 100) / 100,
          settlementCount: settlements.length,
          settlements: settlements.map(s => ({
            settlementId: s.settlementId,
            recipientId: s.recipientId,
            amount: s.amount,
            percentage: s.percentage
          }))
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Calculate commission
   */
  static async calculateCommission(commissionData) {
    try {
      const db = mongoose.connection.db;
      const commissionsCollection = db.collection('commissions');

      const commissionId = `comm_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      let commissionAmount = 0;
      const calculations = [];

      // Base commission
      const baseCommission = commissionData.amount * (commissionData.basePercentage / 100);
      calculations.push({
        type: 'base',
        percentage: commissionData.basePercentage,
        amount: Math.round(baseCommission * 100) / 100
      });
      commissionAmount += baseCommission;

      // Surge pricing commission (if applicable)
      if (commissionData.surgeFactor > 1) {
        const surgeCommission = baseCommission * (commissionData.surgeFactor - 1);
        calculations.push({
          type: 'surge',
          surgeFactor: commissionData.surgeFactor,
          amount: Math.round(surgeCommission * 100) / 100
        });
        commissionAmount += surgeCommission;
      }

      // Volume bonus (negative commission for high volume)
      if (commissionData.monthlyVolume > 10000) {
        const volumeDiscount = baseCommission * 0.10;
        calculations.push({
          type: 'volume_bonus',
          discount: 10,
          amount: -Math.round(volumeDiscount * 100) / 100
        });
        commissionAmount -= volumeDiscount;
      }

      const record = {
        commissionId,
        transactionId: commissionData.transactionId,
        userId: commissionData.userId,
        amount: commissionData.amount,
        commissionAmount: Math.round(commissionAmount * 100) / 100,
        commissionPercentage: Math.round((commissionAmount / commissionData.amount) * 10000) / 100,
        calculations,
        status: 'pending_settlement',
        createdAt: new Date(),
        settlementDate: null
      };

      await commissionsCollection.insertOne(record);

      return {
        success: true,
        message: 'Commission calculated successfully',
        data: {
          commissionId,
          transactionId: commissionData.transactionId,
          totalAmount: commissionData.amount,
          commissionAmount: record.commissionAmount,
          commissionPercentage: record.commissionPercentage,
          calculations
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get settlement details
   */
  static async getSettlementDetails(settlementId) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_settlements');

      const settlement = await collection.findOne(
        { settlementId }
      );

      if (!settlement) {
        throw new Error('Settlement not found');
      }

      return {
        success: true,
        message: 'Settlement details retrieved successfully',
        data: settlement
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get user settlements
   */
  static async getUserSettlements(userId, filters = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_settlements');

      const query = { recipientId: userId };
      
      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.startDate) {
        query.createdAt = { $gte: new Date(filters.startDate) };
      }

      if (filters.endDate) {
        query.createdAt = query.createdAt || {};
        query.createdAt.$lte = new Date(filters.endDate);
      }

      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;

      const settlements = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const totalCount = await collection.countDocuments(query);

      // Calculate totals
      const totals = {
        pending: 0,
        processing: 0,
        completed: 0
      };

      settlements.forEach(s => {
        totals[s.status] = (totals[s.status] || 0) + s.amount;
      });

      return {
        success: true,
        message: 'User settlements retrieved successfully',
        data: {
          settlements,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit)
          },
          totals
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Process settlement batch
   */
  static async processSettlementBatch(batchData) {
    try {
      const db = mongoose.connection.db;
      const settlementsCollection = db.collection('payment_settlements');
      const batchCollection = db.collection('settlement_batches');

      const batchId = `batch_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      // Get pending settlements for recipients
      const pendingSettlements = await settlementsCollection
        .find({ 
          status: 'pending',
          recipientId: { $in: batchData.recipientIds },
          createdAt: { $lte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
        .toArray();

      if (pendingSettlements.length === 0) {
        throw new Error('No pending settlements to process');
      }

      // Group by recipient and calculate totals
      const settlementsByRecipient = {};
      pendingSettlements.forEach(s => {
        if (!settlementsByRecipient[s.recipientId]) {
          settlementsByRecipient[s.recipientId] = { count: 0, total: 0 };
        }
        settlementsByRecipient[s.recipientId].count += 1;
        settlementsByRecipient[s.recipientId].total += s.amount;
      });

      // Create batch record
      const batch = {
        batchId,
        settledAt: new Date(),
        settlementCount: pendingSettlements.length,
        settlementsByRecipient: Object.entries(settlementsByRecipient).map(([recipientId, data]) => ({
          recipientId,
          count: data.count,
          total: Math.round(data.total * 100) / 100
        })),
        status: 'processing',
        totalAmount: Math.round(pendingSettlements.reduce((sum, s) => sum + s.amount, 0) * 100) / 100
      };

      await batchCollection.insertOne(batch);

      // Update settlements to 'processing'
      const settlementIds = pendingSettlements.map(s => s.settlementId);
      await settlementsCollection.updateMany(
        { settlementId: { $in: settlementIds } },
        { $set: { status: 'processing' } }
      );

      return {
        success: true,
        message: 'Settlement batch processed successfully',
        data: {
          batchId,
          status: 'processing',
          settlementCount: batch.settlementCount,
          totalAmount: batch.totalAmount,
          settlementsByRecipient: batch.settlementsByRecipient
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get commission reports
   */
  static async getCommissionReports(filters = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('commissions');

      const query = {};

      if (filters.userId) {
        query.userId = filters.userId;
      }

      if (filters.startDate) {
        query.createdAt = { $gte: new Date(filters.startDate) };
      }

      if (filters.endDate) {
        query.createdAt = query.createdAt || {};
        query.createdAt.$lte = new Date(filters.endDate);
      }

      const commissions = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      // Calculate aggregates
      const totals = {
        transactionAmount: 0,
        commissionAmount: 0,
        avgCommissionPercentage: 0
      };

      commissions.forEach(c => {
        totals.transactionAmount += c.amount;
        totals.commissionAmount += c.commissionAmount;
      });

      if (commissions.length > 0) {
        totals.avgCommissionPercentage = Math.round(
          (totals.commissionAmount / totals.transactionAmount) * 10000
        ) / 100;
      }

      return {
        success: true,
        message: 'Commission reports retrieved successfully',
        data: {
          commissions,
          totals: {
            transactionAmount: Math.round(totals.transactionAmount * 100) / 100,
            commissionAmount: Math.round(totals.commissionAmount * 100) / 100,
            avgCommissionPercentage: totals.avgCommissionPercentage
          }
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get split performance metrics
   */
  static async getSplitPerformanceMetrics(splitConfigId, filters = {}) {
    try {
      const db = mongoose.connection.db;
      const splitsCollection = db.collection('payment_splits');
      const settlementsCollection = db.collection('payment_settlements');

      const config = await splitsCollection.findOne(
        { splitConfigId }
      );

      if (!config) {
        throw new Error('Split configuration not found');
      }

      const query = { splitConfigId };

      if (filters.startDate) {
        query.createdAt = { $gte: new Date(filters.startDate) };
      }

      if (filters.endDate) {
        query.createdAt = query.createdAt || {};
        query.createdAt.$lte = new Date(filters.endDate);
      }

      const settlements = await settlementsCollection
        .find(query)
        .toArray();

      // Calculate metrics per split
      const metrics = {};
      let totalAmount = 0;

      settlements.forEach(s => {
        if (!metrics[s.recipientId]) {
          metrics[s.recipientId] = {
            recipientId: s.recipientId,
            count: 0,
            total: 0,
            avgAmount: 0
          };
        }
        metrics[s.recipientId].count += 1;
        metrics[s.recipientId].total += s.amount;
        totalAmount += s.amount;
      });

      Object.values(metrics).forEach(m => {
        m.avgAmount = Math.round((m.total / m.count) * 100) / 100;
      });

      return {
        success: true,
        message: 'Split performance metrics retrieved successfully',
        data: {
          splitConfigId,
          totalTransactions: settlements.length,
          totalAmount: Math.round(totalAmount * 100) / 100,
          recipientMetrics: Object.values(metrics)
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Reconcile payments and splits
   */
  static async reconcilePaymentsAndSplits(reconciliationData) {
    try {
      const db = mongoose.connection.db;
      const transactionsCollection = db.collection('payment_transactions');
      const splitsCollection = db.collection('payment_settlements');
      const reconciliationCollection = db.collection('reconciliation_records');

      const reconciliationId = `recon_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      // Get transactions in period
      const transactions = await transactionsCollection
        .find({
          status: 'completed',
          createdAt: {
            $gte: new Date(reconciliationData.startDate),
            $lte: new Date(reconciliationData.endDate)
          }
        })
        .toArray();

      // Get corresponding splits
      const splits = await splitsCollection
        .find({
          status: 'completed',
          createdAt: {
            $gte: new Date(reconciliationData.startDate),
            $lte: new Date(reconciliationData.endDate)
          }
        })
        .toArray();

      // Validate totals match
      const transactionTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
      const splitsTotal = splits.reduce((sum, s) => sum + s.amount, 0);
      const variance = Math.abs(transactionTotal - splitsTotal);
      const variancePercentage = Math.round((variance / transactionTotal) * 10000) / 100;

      const reconciliation = {
        reconciliationId,
        startDate: new Date(reconciliationData.startDate),
        endDate: new Date(reconciliationData.endDate),
        transactionCount: transactions.length,
        splitCount: splits.length,
        transactionTotal: Math.round(transactionTotal * 100) / 100,
        splitsTotal: Math.round(splitsTotal * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePercentage,
        status: variancePercentage < 0.01 ? 'reconciled' : 'requires_review',
        createdAt: new Date()
      };

      await reconciliationCollection.insertOne(reconciliation);

      return {
        success: true,
        message: 'Reconciliation completed',
        data: {
          reconciliationId,
          status: reconciliation.status,
          transactionTotal: reconciliation.transactionTotal,
          splitsTotal: reconciliation.splitsTotal,
          variance: reconciliation.variance,
          variancePercentage: reconciliation.variancePercentage
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = PaymentSplittingService;
