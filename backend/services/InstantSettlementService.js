/**
 * Instant Settlement Service - Phase 12
 * On-demand settlement processing
 */

const InstantSettlement = require('../models/InstantSettlement');
const PaymentGateway = require('../models/PaymentGateway');
const GatewayIntegrations = require('../utils/GatewayIntegrations');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

class InstantSettlementService {
  /**
   * Create settlement request
   */
  static async createSettlementRequest(settlementData) {
    try {
      const settlementId = `SETTLE_${uuidv4()}`;
      const gateway = await PaymentGateway.findOne({ gatewayName: settlementData.paymentGateway });

      if (!gateway) {
        throw new Error('Payment gateway not found');
      }

      const settlementFeePercentage = gateway.feeStructure?.settlementFee || 0.5;
      const settlementFee = (settlementData.settlementAmount * settlementFeePercentage) / 100;
      const netAmount = settlementData.settlementAmount - settlementFee;

      const settlement = new InstantSettlement({
        settlementId,
        ...settlementData,
        settlementFee,
        settlementFeePercentage,
        netAmount,
        status: 'pending',
      });

      await settlement.save();

      logger.info(`Settlement request created: ${settlementId}`, {
        requestedBy: settlementData.requestedBy,
        amount: settlementData.settlementAmount,
      });

      return settlement;
    } catch (error) {
      logger.error('Error creating settlement request:', error);
      throw error;
    }
  }

  /**
   * Approve settlement
   */
  static async approveSettlement(settlementId, approvedBy, notes) {
    try {
      const settlement = await InstantSettlement.findOne({ settlementId });
      if (!settlement || !settlement.canBeApproved()) {
        throw new Error('Settlement cannot be approved');
      }

      settlement.approve(approvedBy, notes);
      settlement.status = 'processing';
      settlement.processingStartedAt = new Date();
      settlement.processingStatus = {
        currentStep: 'bank_verification',
        lastUpdated: new Date(),
      };

      settlement.auditTrail.push({
        timestamp: new Date(),
        action: 'approved',
        performedBy: approvedBy,
        details: { notes },
      });

      await settlement.save();

      logger.info(`Settlement approved: ${settlementId}`, { approvedBy });
      return settlement;
    } catch (error) {
      logger.error('Error approving settlement:', error);
      throw error;
    }
  }

  /**
   * Reject settlement
   */
  static async rejectSettlement(settlementId, reason) {
    try {
      const settlement = await InstantSettlement.findOne({ settlementId });
      if (!settlement) {
        throw new Error('Settlement not found');
      }

      settlement.reject(reason);
      settlement.auditTrail.push({
        timestamp: new Date(),
        action: 'rejected',
        performedBy: 'admin',
        details: { reason },
      });

      await settlement.save();

      logger.info(`Settlement rejected: ${settlementId}`, { reason });
      return settlement;
    } catch (error) {
      logger.error('Error rejecting settlement:', error);
      throw error;
    }
  }

  /**
   * Process settlement
   */
  static async processSettlement(settlementId) {
    try {
      const settlement = await InstantSettlement.findOne({ settlementId });
      if (!settlement || settlement.status !== 'approved') {
        throw new Error('Settlement cannot be processed');
      }

      settlement.processingStatus = {
        currentStep: 'payment_gateway_initiation',
        lastUpdated: new Date(),
      };
      await settlement.save();

      // Call payment gateway for settlement
      const gatewayData = await PaymentGateway.findOne({
        gatewayName: settlement.paymentGateway,
      });

      const settlementResult = await GatewayIntegrations.executeGatewayAction(
        gatewayData,
        'settlement',
        {
          amount: settlement.netAmount,
          bankDetails: settlement.bankDetails,
          reference: settlementId,
        }
      );

      if (settlementResult.success) {
        settlement.markAsCompleted(settlementResult.transactionId);
        settlement.gatewayReferenceId = settlementResult.referenceId;
        settlement.expectedDeliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days

        settlement.auditTrail.push({
          timestamp: new Date(),
          action: 'processing_completed',
          performedBy: 'system',
          details: { gatewayTransactionId: settlementResult.transactionId },
        });

        await settlement.save();

        logger.info(`Settlement processed: ${settlementId}`, settlementResult);
      } else {
        settlement.status = 'failed';
        settlement.failureReason = settlementResult.error;

        settlement.auditTrail.push({
          timestamp: new Date(),
          action: 'processing_failed',
          performedBy: 'system',
          details: { error: settlementResult.error },
        });

        await settlement.save();

        throw new Error(`Gateway processing failed: ${settlementResult.error}`);
      }

      return settlement;
    } catch (error) {
      logger.error('Error processing settlement:', error);
      throw error;
    }
  }

  /**
   * Verify bank account
   */
  static async verifyBankAccount(settlementId, verified) {
    try {
      const settlement = await InstantSettlement.findOne({ settlementId });
      if (!settlement) {
        throw new Error('Settlement not found');
      }

      settlement.bankDetails.verified = verified;
      settlement.verification = {
        bankAccountVerified: verified,
        verifiedAt: new Date(),
        verifiedBy: 'admin',
      };

      await settlement.save();

      logger.info(`Bank account ${verified ? 'verified' : 'rejected'}: ${settlementId}`);
      return settlement;
    } catch (error) {
      logger.error('Error verifying bank account:', error);
      throw error;
    }
  }

  /**
   * Get settlement by ID
   */
  static async getSettlement(settlementId) {
    try {
      return await InstantSettlement.findOne({ settlementId });
    } catch (error) {
      logger.error('Error fetching settlement:', error);
      throw error;
    }
  }

  /**
   * Get pending settlements
   */
  static async getPendingSettlements(requestedBy) {
    try {
      return await InstantSettlement.find({
        requestedBy,
        status: { $in: ['pending', 'approved', 'processing'] },
      }).sort({ createdAt: -1 });
    } catch (error) {
      logger.error('Error fetching pending settlements:', error);
      throw error;
    }
  }

  /**
   * Get settlement history
   */
  static async getSettlementHistory(requestedBy, options = {}) {
    try {
      const query = { requestedBy };
      const skip = (options.page - 1) * (options.limit || 20);

      return await InstantSettlement.find(query)
        .sort({ settlementDate: -1 })
        .skip(skip)
        .limit(options.limit || 20);
    } catch (error) {
      logger.error('Error fetching settlement history:', error);
      throw error;
    }
  }

  /**
   * Get settlement statistics
   */
  static async getSettlementStats(requestedBy) {
    try {
      const stats = await InstantSettlement.aggregate([
        { $match: { requestedBy } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$settlementAmount' },
            totalFees: { $sum: '$settlementFee' },
            totalNetAmount: { $sum: '$netAmount' },
          },
        },
      ]);

      return stats;
    } catch (error) {
      logger.error('Error fetching settlement stats:', error);
      throw error;
    }
  }
}

module.exports = InstantSettlementService;
