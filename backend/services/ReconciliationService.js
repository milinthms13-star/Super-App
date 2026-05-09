/**
 * Reconciliation Service - Phase 11 Payment Processing
 * Manages payment reconciliation and settlement tracking
 */

const Reconciliation = require('../models/Reconciliation');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class ReconciliationService {
  /**
   * Initiate reconciliation
   */
  static async initiateReconciliation(reconciliationData) {
    try {
      const reconciliationId = `REC_${Date.now()}_${uuidv4().split('-')[0].toUpperCase()}`;

      const reconciliation = new Reconciliation({
        ...reconciliationData,
        reconciliationId,
        status: 'pending',
        reconciliationDate: new Date(),
      });

      await reconciliation.save();
      logger.info(`Reconciliation initiated: ${reconciliationId}`);

      return reconciliation;
    } catch (error) {
      logger.error('Error initiating reconciliation:', error);
      throw error;
    }
  }

  /**
   * Fetch gateway settlement data
   */
  static async fetchGatewayData(gateway, startDate, endDate) {
    try {
      // This would typically call the gateway API to fetch settlement data
      // For now, return mock data structure
      
      const GatewayIntegrations = require('../utils/GatewayIntegrations');
      const settlementData = await GatewayIntegrations.fetchSettlementData(
        gateway,
        startDate,
        endDate
      );

      return {
        gatewaySettledAmount: settlementData.totalAmount,
        gatewayFees: settlementData.totalFees,
        gatewayRefunds: settlementData.totalRefunds,
        gatewayChargebacks: settlementData.totalChargebacks,
        gatewayTransactionCount: settlementData.transactionCount,
        settlementRefNumber: settlementData.settlementId,
        settlementDate: settlementData.settlementDate,
      };
    } catch (error) {
      logger.error('Error fetching gateway data:', error);
      throw error;
    }
  }

  /**
   * Fetch internal payment data
   */
  static async fetchInternalData(gateway, startDate, endDate) {
    try {
      const payments = await Payment.find({
        paymentGateway: gateway,
        status: 'captured',
        createdAt: { $gte: startDate, $lte: endDate },
      });

      const internalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const internalFees = payments.reduce((sum, p) => sum + (p.fees.gatewayFee || 0), 0);
      
      const refunds = payments.filter(p => p.status === 'refunded' || p.status === 'partial_refund');
      const internalRefunds = refunds.reduce((sum, p) => sum + (p.refund.refundAmount || 0), 0);

      return {
        internalAmount,
        internalFees,
        internalRefunds,
        internalChargebacks: 0, // Would be fetched from disputes
        internalTransactionCount: payments.length,
      };
    } catch (error) {
      logger.error('Error fetching internal data:', error);
      throw error;
    }
  }

  /**
   * Match payments with gateway transactions
   */
  static async matchPayments(reconciliation) {
    try {
      const discrepancies = [];
      const unmatchedPayments = [];
      const orphanedTransactions = [];
      let matchedCount = 0;

      // Get payments from this period
      const payments = await Payment.find({
        paymentGateway: reconciliation.gateway,
        status: { $in: ['captured', 'refunded', 'partial_refund'] },
        createdAt: { $gte: reconciliation.startDate, $lte: reconciliation.endDate },
      });

      // Match each payment with gateway transaction
      for (const payment of payments) {
        if (payment.gatewayTransactionId) {
          // Payment has gateway transaction ID - check for matches
          matchedCount += 1;
        } else {
          unmatchedPayments.push({
            paymentId: payment.paymentId,
            amount: payment.amount,
            reason: 'No gateway transaction ID',
          });
        }
      }

      // Update reconciliation with discrepancies
      reconciliation.discrepancies = discrepancies;
      reconciliation.paymentMatching.unmatchedPayments = unmatchedPayments;
      reconciliation.paymentMatching.orphanedTransactions = orphanedTransactions;
      reconciliation.summary.matchedTransactions = matchedCount;
      reconciliation.summary.unmatchedTransactions = unmatchedPayments.length;

      return reconciliation;
    } catch (error) {
      logger.error('Error matching payments:', error);
      throw error;
    }
  }

  /**
   * Execute reconciliation
   */
  static async executeReconciliation(reconciliationId) {
    try {
      const reconciliation = await Reconciliation.findOne({ 
        $or: [{ _id: reconciliationId }, { reconciliationId }] 
      });

      if (!reconciliation) {
        throw new Error('Reconciliation not found');
      }

      reconciliation.status = 'in_progress';
      await reconciliation.save();

      // Fetch data from both sources
      const gatewayData = await this.fetchGatewayData(
        reconciliation.gateway,
        reconciliation.startDate,
        reconciliation.endDate
      );

      const internalData = await this.fetchInternalData(
        reconciliation.gateway,
        reconciliation.startDate,
        reconciliation.endDate
      );

      // Update reconciliation with data
      reconciliation.gatewayData = gatewayData;
      reconciliation.internalData = internalData;

      // Calculate discrepancies
      const totalDiscrepancy = Math.abs(
        gatewayData.gatewaySettledAmount - internalData.internalAmount
      );

      reconciliation.summary.totalDiscrepancy = totalDiscrepancy;
      reconciliation.summary.discrepancyPercentage = 
        internalData.internalAmount > 0 
          ? (totalDiscrepancy / internalData.internalAmount) * 100 
          : 0;

      // Match payments
      await this.matchPayments(reconciliation);

      // Determine if manual review needed
      if (reconciliation.summary.discrepancyPercentage > 1) {
        reconciliation.status = 'manual_review';
      } else {
        reconciliation.status = 'completed';
        reconciliation.approvalWorkflow.approvedAt = new Date();
      }

      await reconciliation.save();
      this.logAudit(reconciliation._id, 'reconciliation_executed', {}, 'system');

      return reconciliation;
    } catch (error) {
      logger.error('Error executing reconciliation:', error);
      throw error;
    }
  }

  /**
   * Approve reconciliation
   */
  static async approveReconciliation(reconciliationId, approverInfo) {
    try {
      const reconciliation = await Reconciliation.findOne({ 
        $or: [{ _id: reconciliationId }, { reconciliationId }] 
      });

      if (!reconciliation) {
        throw new Error('Reconciliation not found');
      }

      reconciliation.status = 'approved';
      reconciliation.approvalWorkflow = {
        approvedBy: approverInfo.approvedBy,
        approvalNotes: approverInfo.notes,
        approvedAt: new Date(),
      };

      await reconciliation.save();
      this.logAudit(reconciliation._id, 'reconciliation_approved', approverInfo, 'admin');

      return reconciliation;
    } catch (error) {
      logger.error('Error approving reconciliation:', error);
      throw error;
    }
  }

  /**
   * Reject reconciliation
   */
  static async rejectReconciliation(reconciliationId, rejectionData) {
    try {
      const reconciliation = await Reconciliation.findOne({ 
        $or: [{ _id: reconciliationId }, { reconciliationId }] 
      });

      if (!reconciliation) {
        throw new Error('Reconciliation not found');
      }

      reconciliation.status = 'failed';
      reconciliation.approvalWorkflow.rejectionReason = rejectionData.reason;

      await reconciliation.save();
      this.logAudit(reconciliation._id, 'reconciliation_rejected', rejectionData, 'admin');

      return reconciliation;
    } catch (error) {
      logger.error('Error rejecting reconciliation:', error);
      throw error;
    }
  }

  /**
   * Get reconciliation details
   */
  static async getReconciliationDetails(reconciliationId) {
    try {
      const reconciliation = await Reconciliation.findOne({ 
        $or: [{ _id: reconciliationId }, { reconciliationId }] 
      });

      if (!reconciliation) {
        throw new Error('Reconciliation not found');
      }

      return reconciliation;
    } catch (error) {
      logger.error('Error fetching reconciliation details:', error);
      throw error;
    }
  }

  /**
   * Get reconciliations for gateway
   */
  static async getReconciliationsByGateway(gatewayName, options = {}) {
    try {
      const { page = 1, limit = 10, status } = options;
      const skip = (page - 1) * limit;

      const query = { gateway: gatewayName };
      if (status) query.status = status;

      const reconciliations = await Reconciliation.find(query)
        .sort({ reconciliationDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Reconciliation.countDocuments(query);

      return {
        reconciliations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching reconciliations:', error);
      throw error;
    }
  }

  /**
   * Resolve discrepancy
   */
  static async resolveDiscrepancy(reconciliationId, discrepancyIndex, resolution) {
    try {
      const reconciliation = await Reconciliation.findOne({ 
        $or: [{ _id: reconciliationId }, { reconciliationId }] 
      });

      if (!reconciliation || !reconciliation.discrepancies[discrepancyIndex]) {
        throw new Error('Discrepancy not found');
      }

      reconciliation.discrepancies[discrepancyIndex].resolved = true;
      reconciliation.discrepancies[discrepancyIndex].resolution = resolution.reason;

      await reconciliation.save();
      this.logAudit(reconciliation._id, 'discrepancy_resolved', { discrepancyIndex, resolution }, 'admin');

      return reconciliation;
    } catch (error) {
      logger.error('Error resolving discrepancy:', error);
      throw error;
    }
  }

  /**
   * Generate reconciliation report
   */
  static async generateReport(reconciliationId) {
    try {
      const reconciliation = await Reconciliation.findOne({ 
        $or: [{ _id: reconciliationId }, { reconciliationId }] 
      });

      if (!reconciliation) {
        throw new Error('Reconciliation not found');
      }

      const report = {
        reconciliationId: reconciliation.reconciliationId,
        gateway: reconciliation.gateway,
        period: `${reconciliation.startDate.toISOString().split('T')[0]} to ${reconciliation.endDate.toISOString().split('T')[0]}`,
        status: reconciliation.status,
        gatewaySettledAmount: reconciliation.gatewayData.gatewaySettledAmount,
        internalAmount: reconciliation.internalData.internalAmount,
        totalDiscrepancy: reconciliation.summary.totalDiscrepancy,
        discrepancyPercentage: reconciliation.summary.discrepancyPercentage,
        matchedTransactions: reconciliation.summary.matchedTransactions,
        unmatchedTransactions: reconciliation.summary.unmatchedTransactions,
        generatedAt: new Date(),
      };

      return report;
    } catch (error) {
      logger.error('Error generating reconciliation report:', error);
      throw error;
    }
  }

  /**
   * Log reconciliation audit trail
   */
  static logAudit(reconciliationId, action, details, performedBy) {
    Reconciliation.findByIdAndUpdate(
      reconciliationId,
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
}

module.exports = ReconciliationService;
