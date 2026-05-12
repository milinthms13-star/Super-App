/**
 * Payment Service - Phase 11 Payment Processing
 * Handles payment creation, processing, verification, and lifecycle management
 */

const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const PaymentGateway = require('../models/PaymentGateway');
const FraudDetection = require('../models/FraudDetection');
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

class PaymentService {
  /**
   * Create a new payment
   */
  static async createPayment(paymentData) {
    try {
      const paymentId = `PAY_${Date.now()}_${randomUUID().split('-')[0].toUpperCase()}`;
      
      // Validate gateway
      const gateway = await PaymentGateway.findOne({ 
        gatewayName: paymentData.paymentGateway,
        isActive: true 
      });
      if (!gateway) {
        throw new Error(`Payment gateway ${paymentData.paymentGateway} not available`);
      }

      const payment = new Payment({
        ...paymentData,
        paymentId,
        status: 'initiated',
        fees: {
          gatewayFee: this.calculateGatewayFee(paymentData.amount, gateway),
          platformFee: this.calculatePlatformFee(paymentData.amount),
          totalCharged: paymentData.amount,
        },
      });

      // Perform risk assessment
      const riskAssessment = await this.assessRisk(paymentData);
      payment.riskAssessment = riskAssessment;

      await payment.save();
      
      // Log in audit trail
      this.logAudit(payment._id, 'payment_created', { paymentData }, 'system');

      return payment;
    } catch (error) {
      logger.error('Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Process payment with gateway
   */
  static async processPayment(paymentId, gatewayPayload) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Check if payment is already processing
      if (payment.status === 'processing' || payment.status === 'captured') {
        throw new Error('Payment is already being processed');
      }

      payment.status = 'processing';
      
      // Process with gateway
      const gatewayResponse = await this.callPaymentGateway(
        payment.paymentGateway,
        'process',
        { ...gatewayPayload, amount: payment.amount }
      );

      if (gatewayResponse.success) {
        payment.status = 'captured';
        payment.gatewayTransactionId = gatewayResponse.transactionId;
        payment.gatewayOrderId = gatewayResponse.orderId;
        
        // Create transaction record
        await TransactionService.createTransaction({
          paymentId: payment.paymentId,
          orderId: payment.orderId,
          userId: payment.userId,
          transactionType: 'debit',
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          gateway: payment.paymentGateway,
          status: 'completed',
        });
      } else {
        payment.status = 'failed';
        throw new Error(gatewayResponse.error || 'Gateway payment processing failed');
      }

      await payment.save();
      this.logAudit(payment._id, 'payment_processed', { gatewayResponse }, 'system');

      return payment;
    } catch (error) {
      logger.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Capture payment after authorization
   */
  static async capturePayment(paymentId) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'initiated' && payment.status !== 'processing') {
        throw new Error(`Cannot capture payment in ${payment.status} status`);
      }

      const captureResponse = await this.callPaymentGateway(
        payment.paymentGateway,
        'capture',
        {
          gatewayTransactionId: payment.gatewayTransactionId,
          amount: payment.amount,
        }
      );

      if (captureResponse.success) {
        payment.status = 'captured';
        payment.metadata.capturedAt = new Date();
        await payment.save();
        this.logAudit(payment._id, 'payment_captured', {}, 'system');
        return payment;
      } else {
        throw new Error(captureResponse.error || 'Capture failed');
      }
    } catch (error) {
      logger.error('Error capturing payment:', error);
      throw error;
    }
  }

  /**
   * Verify payment status with gateway
   */
  static async verifyPayment(paymentId) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      const verifyResponse = await this.callPaymentGateway(
        payment.paymentGateway,
        'verify',
        { gatewayTransactionId: payment.gatewayTransactionId }
      );

      if (verifyResponse.status === 'captured' || verifyResponse.status === 'authorized') {
        if (payment.status !== 'captured') {
          payment.status = 'captured';
          await payment.save();
        }
      } else if (verifyResponse.status === 'failed') {
        payment.status = 'failed';
        await payment.save();
      }

      return payment;
    } catch (error) {
      logger.error('Error verifying payment:', error);
      throw error;
    }
  }

  /**
   * Initiate refund
   */
  static async initiateRefund(paymentId, refundData) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (!payment.canBeRefunded()) {
        throw new Error('Payment cannot be refunded in current state');
      }

      const refundId = `REF_${Date.now()}_${randomUUID().split('-')[0].toUpperCase()}`;
      const refundAmount = refundData.amount || payment.amount;

      const refundResponse = await this.callPaymentGateway(
        payment.paymentGateway,
        'refund',
        {
          gatewayTransactionId: payment.gatewayTransactionId,
          amount: refundAmount,
          reason: refundData.reason,
        }
      );

      if (refundResponse.success) {
        payment.refund = {
          refundId,
          refundAmount,
          refundReason: refundData.reason,
          refundInitiatedAt: new Date(),
          refundStatus: 'processing',
          refundReference: refundResponse.refundId,
          autoRefund: refundData.autoRefund || false,
        };

        if (refundAmount === payment.amount) {
          payment.status = 'refunded';
        } else {
          payment.status = 'partial_refund';
        }

        await payment.save();

        // Create credit transaction
        await TransactionService.createTransaction({
          paymentId: payment.paymentId,
          orderId: payment.orderId,
          userId: payment.userId,
          transactionType: 'credit',
          amount: refundAmount,
          paymentMethod: payment.paymentMethod,
          gateway: payment.paymentGateway,
          status: 'pending',
          reference: { refundId },
        });

        this.logAudit(payment._id, 'refund_initiated', { refundData }, 'system');
        return payment;
      } else {
        throw new Error(refundResponse.error || 'Refund initiation failed');
      }
    } catch (error) {
      logger.error('Error initiating refund:', error);
      throw error;
    }
  }

  /**
   * Get payment details
   */
  static async getPaymentDetails(paymentId) {
    try {
      const payment = await Payment.findOne({ 
        $or: [{ _id: paymentId }, { paymentId }] 
      });
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      return payment;
    } catch (error) {
      logger.error('Error fetching payment details:', error);
      throw error;
    }
  }

  /**
   * Get payments for user
   */
  static async getPaymentsByUser(userId, options = {}) {
    try {
      const { page = 1, limit = 10, status, paymentMethod } = options;
      const skip = (page - 1) * limit;

      const query = { userId };
      if (status) query.status = status;
      if (paymentMethod) query.paymentMethod = paymentMethod;

      const payments = await Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Payment.countDocuments(query);

      return {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching user payments:', error);
      throw error;
    }
  }

  /**
   * Assess risk for payment
   */
  static async assessRisk(paymentData) {
    try {
      // Check fraud detection system
      const fraudCheck = await FraudDetection.findOne({
        $or: [
          { 'deviceInfo.ipAddress': paymentData.metadata?.deviceInfo?.ipAddress },
          { 'customerInfo.email': paymentData.metadata?.customerInfo?.email },
        ],
      }).sort({ createdAt: -1 });

      let riskScore = 0;
      let riskLevel = 'low';
      let flaggedReason = null;

      if (fraudCheck && fraudCheck.riskScore > 70) {
        riskScore = Math.min(fraudCheck.riskScore + 10, 100);
        flaggedReason = 'High fraud history detected';
      }

      // Check for unusual payment amount
      if (paymentData.amount > 10000) {
        riskScore += 15;
      }

      // Check for multiple failed attempts
      const recentFailures = await Payment.countDocuments({
        userId: paymentData.userId,
        status: 'failed',
        createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) },
      });

      if (recentFailures > 3) {
        riskScore += 20;
        flaggedReason = 'Multiple failed payment attempts';
      }

      if (riskScore > 70) {
        riskLevel = 'critical';
      } else if (riskScore > 50) {
        riskLevel = 'high';
      } else if (riskScore > 30) {
        riskLevel = 'medium';
      }

      return {
        riskScore: Math.min(riskScore, 100),
        riskLevel,
        assessedAt: new Date(),
        flaggedReason,
        requiresVerification: riskScore > 50,
        verificationMethod: riskScore > 50 ? 'otp' : null,
      };
    } catch (error) {
      logger.error('Error assessing payment risk:', error);
      return { riskScore: 0, riskLevel: 'low', assessedAt: new Date() };
    }
  }

  /**
   * Calculate gateway fee
   */
  static calculateGatewayFee(amount, gateway) {
    const feeStructure = gateway.feeStructure;
    let fee = 0;

    if (feeStructure.percentageFee) {
      fee += (amount * feeStructure.percentageFee) / 100;
    }

    if (feeStructure.fixedFee) {
      fee += feeStructure.fixedFee;
    }

    if (feeStructure.minAmount && fee < feeStructure.minAmount) {
      fee = feeStructure.minAmount;
    }

    if (feeStructure.maxAmount && fee > feeStructure.maxAmount) {
      fee = feeStructure.maxAmount;
    }

    return fee;
  }

  /**
   * Calculate platform fee
   */
  static calculatePlatformFee(amount) {
    // Platform fee: 0.5% + fixed Rs. 2
    const platformFeePercentage = 0.5;
    const platformFixedFee = 2;
    
    return (amount * platformFeePercentage) / 100 + platformFixedFee;
  }

  /**
   * Call payment gateway API
   */
  static async callPaymentGateway(gatewayName, action, payload) {
    try {
      const gateway = await PaymentGateway.findOne({ 
        gatewayName, 
        isActive: true 
      }).select('+credentials');

      if (!gateway) {
        throw new Error(`Gateway ${gatewayName} not found`);
      }

      // Gateway integration handled by GatewayIntegrations utility
      const GatewayIntegrations = require('../utils/GatewayIntegrations');
      return await GatewayIntegrations.executeGatewayAction(gateway, action, payload);
    } catch (error) {
      logger.error(`Error calling payment gateway ${gatewayName}:`, error);
      throw error;
    }
  }

  /**
   * Log audit trail
   */
  static logAudit(paymentId, action, details, performedBy) {
    // Push to auditLog array
    Payment.findByIdAndUpdate(
      paymentId,
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
   * Get payment analytics
   */
  static async getPaymentAnalytics(options = {}) {
    try {
      const { startDate, endDate, groupBy = 'day' } = options;

      const matchStage = { status: 'captured' };
      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
      }

      const analytics = await Payment.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: `$${groupBy}`,
            totalAmount: { $sum: '$amount' },
            transactionCount: { $sum: 1 },
            averageAmount: { $avg: '$amount' },
            totalFees: { $sum: '$fees.gatewayFee' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return analytics;
    } catch (error) {
      logger.error('Error fetching payment analytics:', error);
      throw error;
    }
  }
}

module.exports = PaymentService;
