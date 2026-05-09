/**
 * RefundManagementService.js
 * Phase 11: Refund Management & Return Policies
 * Handles refunds, partial refunds, return policies, chargeback management
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

class RefundManagementService {
  /**
   * Process refund for transaction
   */
  static async processRefund(refundData) {
    try {
      const db = mongoose.connection.db;
      const refundCollection = db.collection('refunds');
      const transactionCollection = db.collection('payment_transactions');

      // Verify transaction exists
      const transaction = await transactionCollection.findOne({
        transactionId: refundData.transactionId
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'completed') {
        throw new Error('Only completed transactions can be refunded');
      }

      // Check if already refunded
      const existingRefund = await refundCollection.findOne({
        transactionId: refundData.transactionId,
        status: 'completed'
      });

      if (existingRefund && existingRefund.amount >= transaction.amount) {
        throw new Error('Transaction already fully refunded');
      }

      const refundId = `refund_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const refundAmount = refundData.amount || transaction.amount;

      // Validate refund amount
      if (refundAmount <= 0 || refundAmount > transaction.amount) {
        throw new Error('Invalid refund amount');
      }

      const refund = {
        refundId,
        transactionId: refundData.transactionId,
        userId: transaction.userId,
        orderId: transaction.orderId,
        rideId: transaction.rideId,
        amount: refundAmount,
        currency: transaction.currency,
        refundType: refundData.refundType || 'full', // full, partial, exchange
        reason: refundData.reason,
        reasonCode: refundData.reasonCode, // customer_request, service_issue, duplicate, fraud, etc
        initiatedBy: refundData.initiatedBy, // 'user', 'customer_support', 'system'
        status: 'processing',
        refundMethod: refundData.refundMethod || 'original_payment', // original_payment, wallet, account_credit
        originalPaymentMethod: transaction.paymentMethodId,
        gatewayRefundId: null,
        processedAt: null,
        completedAt: null,
        failureReason: null,
        retryCount: 0,
        maxRetries: 3,
        notes: refundData.notes || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await refundCollection.insertOne(refund);

      // Update transaction
      await transactionCollection.updateOne(
        { transactionId: refundData.transactionId },
        {
          $push: { refunds: { refundId, amount: refundAmount } },
          $set: { updatedAt: new Date() }
        }
      );

      return {
        success: true,
        message: 'Refund processed successfully',
        data: {
          refundId,
          transactionId: refundData.transactionId,
          amount: refundAmount,
          status: refund.status,
          createdAt: refund.createdAt
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get refund status
   */
  static async getRefundStatus(refundId) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('refunds');

      const refund = await collection.findOne({ refundId });
      if (!refund) {
        throw new Error('Refund not found');
      }

      // Calculate refund progress
      const progressPercentage = this._calculateRefundProgress(refund);

      return {
        success: true,
        message: 'Refund status retrieved successfully',
        data: {
          refundId,
          transactionId: refund.transactionId,
          amount: refund.amount,
          currency: refund.currency,
          status: refund.status,
          progressPercentage,
          estimatedCompletionDate: this._estimateCompletionDate(refund),
          failureReason: refund.failureReason,
          createdAt: refund.createdAt,
          completedAt: refund.completedAt
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get refund history for user
   */
  static async getUserRefundHistory(userId, filters = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('refunds');

      const query = { userId };
      if (filters.status) query.status = filters.status;
      if (filters.refundType) query.refundType = filters.refundType;
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const refunds = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .toArray();

      const totalCount = await collection.countDocuments(query);

      return {
        success: true,
        message: 'Refund history retrieved successfully',
        data: {
          refunds,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Create return policy
   */
  static async createReturnPolicy(policyData) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('return_policies');

      const policyId = `rp_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      const policy = {
        policyId,
        policyName: policyData.policyName,
        serviceType: policyData.serviceType, // 'ride', 'rental', 'delivery'
        returnWindowDays: policyData.returnWindowDays,
        returnWindowHours: policyData.returnWindowHours || 0,
        refundPercentage: policyData.refundPercentage, // 100 for full, 50 for 50%, etc
        conditions: policyData.conditions || [],
        exceptions: policyData.exceptions || [],
        cancellationFee: policyData.cancellationFee || 0,
        restockingFee: policyData.restockingFee || 0,
        requiresApproval: policyData.requiresApproval || true,
        isActive: policyData.isActive !== false,
        description: policyData.description,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await collection.insertOne(policy);

      return {
        success: true,
        message: 'Return policy created successfully',
        data: {
          policyId,
          policyName: policy.policyName,
          returnWindowDays: policy.returnWindowDays,
          refundPercentage: policy.refundPercentage
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get applicable return policy
   */
  static async getReturnPolicy(serviceType, filters = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('return_policies');

      const policy = await collection.findOne({
        serviceType,
        isActive: true
      });

      if (!policy) {
        throw new Error('Return policy not found for this service');
      }

      return {
        success: true,
        message: 'Return policy retrieved successfully',
        data: {
          policyId: policy.policyId,
          policyName: policy.policyName,
          returnWindowDays: policy.returnWindowDays,
          returnWindowHours: policy.returnWindowHours,
          refundPercentage: policy.refundPercentage,
          cancellationFee: policy.cancellationFee,
          restockingFee: policy.restockingFee,
          conditions: policy.conditions,
          exceptions: policy.exceptions
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Process exchange (replace refund)
   */
  static async processExchange(exchangeData) {
    try {
      const db = mongoose.connection.db;
      const exchangeCollection = db.collection('exchanges');
      const transactionCollection = db.collection('payment_transactions');

      // Verify original transaction
      const transaction = await transactionCollection.findOne({
        transactionId: exchangeData.originalTransactionId
      });

      if (!transaction) {
        throw new Error('Original transaction not found');
      }

      const exchangeId = `exch_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      const exchange = {
        exchangeId,
        originalTransactionId: exchangeData.originalTransactionId,
        newTransactionId: exchangeData.newTransactionId,
        userId: transaction.userId,
        originalAmount: transaction.amount,
        newAmount: exchangeData.newAmount,
        priceDifference: exchangeData.newAmount - transaction.amount,
        reason: exchangeData.reason,
        status: 'processing',
        originalItem: exchangeData.originalItem,
        newItem: exchangeData.newItem,
        processedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await exchangeCollection.insertOne(exchange);

      return {
        success: true,
        message: 'Exchange processed successfully',
        data: {
          exchangeId,
          status: exchange.status,
          priceDifference: exchange.priceDifference
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Initiate chargeback response
   */
  static async initiateChargebackResponse(chargebackData) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('chargeback_responses');

      const responseId = `cbr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      const response = {
        responseId,
        chargebackId: chargebackData.chargebackId,
        transactionId: chargebackData.transactionId,
        userId: chargebackData.userId,
        chargebackReason: chargebackData.chargebackReason,
        evidence: chargebackData.evidence || [],
        documents: chargebackData.documents || [],
        merchantStatement: chargebackData.merchantStatement,
        proofOfDelivery: chargebackData.proofOfDelivery,
        proofOfAuthorization: chargebackData.proofOfAuthorization,
        communicationHistory: chargebackData.communicationHistory || [],
        status: 'preparing',
        submittedAt: null,
        responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        resolution: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await collection.insertOne(response);

      return {
        success: true,
        message: 'Chargeback response initiated successfully',
        data: {
          responseId,
          chargebackId: chargebackData.chargebackId,
          status: response.status,
          responseDeadline: response.responseDeadline
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Submit chargeback response
   */
  static async submitChargebackResponse(responseId, submissionData) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('chargeback_responses');

      const response = await collection.findOne({ responseId });
      if (!response) {
        throw new Error('Chargeback response not found');
      }

      await collection.updateOne(
        { responseId },
        {
          $set: {
            status: 'submitted',
            submittedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      return {
        success: true,
        message: 'Chargeback response submitted successfully',
        data: {
          responseId,
          status: 'submitted',
          submittedAt: new Date()
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get refund analytics
   */
  static async getRefundAnalytics(filters = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('refunds');

      const dateFilter = {
        createdAt: {
          $gte: new Date(filters.startDate || Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      };

      if (filters.endDate) {
        dateFilter.createdAt.$lte = new Date(filters.endDate);
      }

      const refunds = await collection
        .find(dateFilter)
        .lean()
        .toArray();

      // Calculate metrics
      const totalRefundCount = refunds.length;
      const totalRefundAmount = refunds.reduce((sum, r) => sum + r.amount, 0);
      const avgRefundAmount = totalRefundCount > 0 ? totalRefundAmount / totalRefundCount : 0;

      // Group by reason
      const refundsByReason = {};
      refunds.forEach(r => {
        refundsByReason[r.reasonCode] = (refundsByReason[r.reasonCode] || 0) + 1;
      });

      // Group by status
      const refundsByStatus = {};
      refunds.forEach(r => {
        refundsByStatus[r.status] = (refundsByStatus[r.status] || 0) + 1;
      });

      const analytics = {
        totalRefundCount,
        totalRefundAmount,
        avgRefundAmount: Math.round(avgRefundAmount * 100) / 100,
        refundsByReason,
        refundsByStatus,
        processingTimeAverage: this._calculateAvgProcessingTime(refunds),
        period: {
          startDate: dateFilter.createdAt.$gte,
          endDate: filters.endDate ? new Date(filters.endDate) : new Date()
        }
      };

      return {
        success: true,
        message: 'Refund analytics retrieved successfully',
        data: analytics
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Cancel refund
   */
  static async cancelRefund(refundId, cancellationData) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('refunds');

      const refund = await collection.findOne({ refundId });
      if (!refund) {
        throw new Error('Refund not found');
      }

      if (['completed', 'failed', 'cancelled'].includes(refund.status)) {
        throw new Error(`Cannot cancel refund with status: ${refund.status}`);
      }

      await collection.updateOne(
        { refundId },
        {
          $set: {
            status: 'cancelled',
            cancellationReason: cancellationData.reason,
            cancelledAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      return {
        success: true,
        message: 'Refund cancelled successfully',
        data: {
          refundId,
          status: 'cancelled',
          cancelledAt: new Date()
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Helper: Calculate refund progress
   */
  static _calculateRefundProgress(refund) {
    if (refund.status === 'completed') return 100;
    if (refund.status === 'failed' || refund.status === 'cancelled') return 0;
    if (refund.status === 'processing') return 50;
    return 25;
  }

  /**
   * Helper: Estimate completion date
   */
  static _estimateCompletionDate(refund) {
    if (refund.completedAt) return refund.completedAt;
    
    const daysToAdd = refund.refundMethod === 'original_payment' ? 5 : 3;
    return new Date(refund.createdAt.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  }

  /**
   * Helper: Calculate average processing time
   */
  static _calculateAvgProcessingTime(refunds) {
    const completedRefunds = refunds.filter(r => r.completedAt);
    if (completedRefunds.length === 0) return 0;

    const totalTime = completedRefunds.reduce((sum, r) => {
      return sum + (r.completedAt - r.createdAt);
    }, 0);

    const avgTimeMs = totalTime / completedRefunds.length;
    return Math.round(avgTimeMs / (24 * 60 * 60 * 1000)); // Convert to days
  }
}

module.exports = RefundManagementService;
