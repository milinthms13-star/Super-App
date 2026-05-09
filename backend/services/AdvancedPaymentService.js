/**
 * AdvancedPaymentService.js
 * Handles UPI, BNPL, and EMI payment options
 */

const logger = require('../config/logger');
const crypto = require('crypto');

class AdvancedPaymentService {
  /**
   * Initiate UPI transaction
   */
  static async initiateUPITransaction(order, userId) {
    try {
      // Integration with Razorpay or similar UPI provider
      const UPIProvider = require('../config/paymentProviders/upiProvider');

      const transactionData = {
        orderId: order._id,
        userId,
        amount: order.totalAmount,
        currency: 'INR',
        description: `Order ${order._id}`,
        receipt: `receipt_${order._id}`,
        customer: {
          email: order.email,
          phone: order.phoneNumber,
        },
      };

      const transaction = await UPIProvider.createUPIRequest(transactionData);

      // Store transaction in database
      const UPITransaction = require('../models/UPITransaction');
      const upiTxn = new UPITransaction({
        orderId: order._id,
        userId,
        transactionId: transaction.id,
        vpa: transaction.vpa,
        amount: order.totalAmount,
        status: 'initiated',
        createdAt: new Date(),
      });

      await upiTxn.save();
      logger.info(`UPI transaction initiated: ${transaction.id}`);

      return {
        transactionId: transaction.id,
        vpa: transaction.vpa,
        qrCode: transaction.qrCode,
        timeout: 300, // 5 minutes
      };
    } catch (error) {
      logger.error('Error initiating UPI transaction:', error);
      throw error;
    }
  }

  /**
   * Validate UPI transaction status
   */
  static async validateUPITransaction(transactionId) {
    try {
      const UPIProvider = require('../config/paymentProviders/upiProvider');
      const status = await UPIProvider.getTransactionStatus(transactionId);

      // Update transaction status in database
      const UPITransaction = require('../models/UPITransaction');
      await UPITransaction.findOneAndUpdate(
        { transactionId },
        { status: status.status, completedAt: status.status === 'success' ? new Date() : null }
      );

      return status;
    } catch (error) {
      logger.error('Error validating UPI transaction:', error);
      throw error;
    }
  }

  /**
   * Check BNPL eligibility for user
   */
  static async checkBNPLEligibility(userId, amount) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Eligibility criteria
      const eligibility = {
        isEligible: true,
        reasons: [],
        maxLimit: 100000, // Default limit
      };

      // Check credit score (mock implementation)
      const creditScore = await this._calculateCreditScore(userId);
      if (creditScore < 300) {
        eligibility.isEligible = false;
        eligibility.reasons.push('Low credit score');
        eligibility.maxLimit = 0;
      } else if (creditScore < 500) {
        eligibility.maxLimit = 10000;
      } else if (creditScore < 700) {
        eligibility.maxLimit = 50000;
      } else {
        eligibility.maxLimit = 100000;
      }

      // Check past BNPL payments
      const BNPLTransaction = require('../models/BNPLTransaction');
      const defaultCount = await BNPLTransaction.countDocuments({
        userId,
        status: 'defaulted',
      });

      if (defaultCount > 0) {
        eligibility.isEligible = false;
        eligibility.reasons.push('Previous payment default');
        eligibility.maxLimit = 0;
      }

      // Check amount against limit
      if (amount > eligibility.maxLimit) {
        eligibility.isEligible = false;
        eligibility.reasons.push(`Amount exceeds limit of ₹${eligibility.maxLimit}`);
      }

      return eligibility;
    } catch (error) {
      logger.error('Error checking BNPL eligibility:', error);
      throw error;
    }
  }

  /**
   * Get available BNPL plans
   */
  static async getBNPLPlans(amount) {
    try {
      const plans = [
        {
          duration: 3,
          monthlyPayment: Math.ceil(amount / 3),
          totalAmount: amount,
          interestRate: 0, // 0% interest for BNPL
          features: ['Flexible payment', 'No interest'],
        },
        {
          duration: 6,
          monthlyPayment: Math.ceil(amount / 6),
          totalAmount: amount,
          interestRate: 0,
          features: ['Extended period', 'No interest'],
        },
        {
          duration: 12,
          monthlyPayment: Math.ceil(amount / 12),
          totalAmount: amount,
          interestRate: 2.5,
          features: ['Long term', 'Low interest'],
        },
      ];

      return plans;
    } catch (error) {
      logger.error('Error getting BNPL plans:', error);
      throw error;
    }
  }

  /**
   * Initiate BNPL transaction
   */
  static async initiateBNPLTransaction(order, userId, planDuration) {
    try {
      const BNPLProvider = require('../config/paymentProviders/bnplProvider');

      const eligibility = await this.checkBNPLEligibility(userId, order.totalAmount);
      if (!eligibility.isEligible) {
        throw new Error(`Not eligible for BNPL: ${eligibility.reasons.join(', ')}`);
      }

      const plans = await this.getBNPLPlans(order.totalAmount);
      const selectedPlan = plans.find(p => p.duration === planDuration);

      if (!selectedPlan) {
        throw new Error('Invalid plan duration');
      }

      const bnplData = {
        orderId: order._id,
        userId,
        amount: order.totalAmount,
        plan: selectedPlan,
        monthlyPayment: selectedPlan.monthlyPayment,
      };

      const transaction = await BNPLProvider.createBNPLRequest(bnplData);

      // Store transaction in database
      const BNPLTransaction = require('../models/BNPLTransaction');
      const bnplTxn = new BNPLTransaction({
        orderId: order._id,
        userId,
        transactionId: transaction.id,
        amount: order.totalAmount,
        monthlyPayment: selectedPlan.monthlyPayment,
        duration: planDuration,
        status: 'initiated',
        schedule: this._generatePaymentSchedule(selectedPlan.monthlyPayment, planDuration),
        createdAt: new Date(),
      });

      await bnplTxn.save();
      logger.info(`BNPL transaction initiated: ${transaction.id}`);

      return {
        transactionId: transaction.id,
        plan: selectedPlan,
        paymentSchedule: bnplTxn.schedule,
      };
    } catch (error) {
      logger.error('Error initiating BNPL transaction:', error);
      throw error;
    }
  }

  /**
   * Get EMI options for amount
   */
  static async getEMIOptions(amount) {
    try {
      const emiOptions = [
        {
          tenure: 3,
          rate: 10.5,
          monthlyEMI: this._calculateEMI(amount, 10.5, 3),
          totalAmount: this._calculateEMI(amount, 10.5, 3) * 3 + amount,
          bank: 'HDFC',
        },
        {
          tenure: 6,
          rate: 11,
          monthlyEMI: this._calculateEMI(amount, 11, 6),
          totalAmount: this._calculateEMI(amount, 11, 6) * 6 + amount,
          bank: 'ICICI',
        },
        {
          tenure: 12,
          rate: 11.5,
          monthlyEMI: this._calculateEMI(amount, 11.5, 12),
          totalAmount: this._calculateEMI(amount, 11.5, 12) * 12 + amount,
          bank: 'Axis',
        },
        {
          tenure: 18,
          rate: 12,
          monthlyEMI: this._calculateEMI(amount, 12, 18),
          totalAmount: this._calculateEMI(amount, 12, 18) * 18 + amount,
          bank: 'SBI',
        },
        {
          tenure: 24,
          rate: 12.5,
          monthlyEMI: this._calculateEMI(amount, 12.5, 24),
          totalAmount: this._calculateEMI(amount, 12.5, 24) * 24 + amount,
          bank: 'Kotak',
        },
      ];

      return emiOptions;
    } catch (error) {
      logger.error('Error getting EMI options:', error);
      throw error;
    }
  }

  /**
   * Initiate EMI transaction
   */
  static async initiateEMITransaction(order, userId, emiDetails) {
    try {
      const EMIProvider = require('../config/paymentProviders/emiProvider');

      const emiData = {
        orderId: order._id,
        userId,
        amount: order.totalAmount,
        tenure: emiDetails.tenure,
        rate: emiDetails.rate,
        monthlyEMI: emiDetails.monthlyEMI,
        bank: emiDetails.bank,
      };

      const transaction = await EMIProvider.createEMIRequest(emiData);

      // Store transaction in database
      const EMITransaction = require('../models/EMITransaction');
      const emiTxn = new EMITransaction({
        orderId: order._id,
        userId,
        transactionId: transaction.id,
        amount: order.totalAmount,
        monthlyEMI: emiDetails.monthlyEMI,
        tenure: emiDetails.tenure,
        rate: emiDetails.rate,
        bank: emiDetails.bank,
        status: 'initiated',
        schedule: this._generateEMISchedule(emiDetails.monthlyEMI, emiDetails.tenure),
        createdAt: new Date(),
      });

      await emiTxn.save();
      logger.info(`EMI transaction initiated: ${transaction.id}`);

      return {
        transactionId: transaction.id,
        emiDetails: emiDetails,
        paymentSchedule: emiTxn.schedule,
      };
    } catch (error) {
      logger.error('Error initiating EMI transaction:', error);
      throw error;
    }
  }

  /**
   * Calculate EMI using standard formula
   */
  static _calculateEMI(principal, ratePerAnnum, months) {
    const monthlyRate = ratePerAnnum / 100 / 12;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(emi);
  }

  /**
   * Generate payment schedule for BNPL
   */
  static _generatePaymentSchedule(monthlyPayment, duration) {
    const schedule = [];
    const today = new Date();

    for (let i = 1; i <= duration; i++) {
      const dueDate = new Date(today);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        installment: i,
        dueDate,
        amount: monthlyPayment,
        status: 'pending',
      });
    }

    return schedule;
  }

  /**
   * Generate payment schedule for EMI
   */
  static _generateEMISchedule(monthlyEMI, tenure) {
    const schedule = [];
    const today = new Date();

    for (let i = 1; i <= tenure; i++) {
      const dueDate = new Date(today);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        month: i,
        dueDate,
        emi: monthlyEMI,
        principal: 0,
        interest: 0,
        status: 'pending',
      });
    }

    return schedule;
  }

  /**
   * Calculate credit score (mock implementation)
   */
  static async _calculateCreditScore(userId) {
    try {
      const Order = require('../models/Order');
      const User = require('../models/User');

      const user = await User.findById(userId);
      const completedOrders = await Order.countDocuments({
        userId,
        status: 'completed',
      });

      // Mock credit score calculation
      let score = 300; // Base score

      // Add points for completed orders
      score += Math.min(completedOrders * 20, 300);

      // Add points for account age
      const accountAgeDays = Math.floor(
        (new Date() - user.createdAt) / (1000 * 60 * 60 * 24)
      );
      score += Math.min(Math.floor(accountAgeDays / 30) * 10, 200);

      // Check for disputes
      const disputes = await Order.countDocuments({
        userId,
        status: { $in: ['disputed', 'refunded'] },
      });
      score -= disputes * 50;

      return Math.max(Math.min(score, 900), 0); // Score between 0-900
    } catch (error) {
      logger.error('Error calculating credit score:', error);
      return 300; // Default score
    }
  }
}

module.exports = AdvancedPaymentService;
