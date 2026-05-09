/**
 * PaymentProcessingService.js
 * Phase 11: Payment Processing & Advanced Payment Methods
 * Handles multiple payment methods, authorization, recurring billing, invoicing
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

class PaymentProcessingService {
  /**
   * Initialize payment method for user
   * Supports: credit_card, debit_card, digital_wallet, bank_transfer, upi
   */
  static async initializePaymentMethod(userId, methodData) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_methods');

      const paymentMethodId = `pm_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const methodRecord = {
        paymentMethodId,
        userId,
        methodType: methodData.methodType,
        provider: methodData.provider, // stripe, razorpay, paypal
        tokenized: this._tokenizePaymentData(methodData),
        last4: methodData.last4 || methodData.accountNumber?.slice(-4),
        expiryDate: methodData.expiryDate,
        holderName: methodData.holderName,
        isDefault: methodData.isDefault || false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          billingAddress: methodData.billingAddress,
          verificationStatus: 'pending'
        }
      };

      const result = await collection.insertOne(methodRecord);
      return {
        success: true,
        message: 'Payment method initialized successfully',
        data: {
          paymentMethodId,
          methodType: methodData.methodType,
          last4: methodRecord.last4,
          createdAt: methodRecord.createdAt
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Process payment transaction
   */
  static async processPayment(paymentData) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_transactions');

      const transactionId = `txn_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      
      // Validate payment amount
      if (paymentData.amount <= 0 || paymentData.amount > 999999.99) {
        throw new Error('Invalid payment amount');
      }

      const transaction = {
        transactionId,
        userId: paymentData.userId,
        paymentMethodId: paymentData.paymentMethodId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        status: 'processing',
        description: paymentData.description,
        orderId: paymentData.orderId,
        rideId: paymentData.rideId,
        metadata: {
          ipAddress: paymentData.ipAddress,
          deviceId: paymentData.deviceId,
          userAgent: paymentData.userAgent
        },
        gatewayResponse: null,
        authorizationCode: null,
        processedAt: null,
        completedAt: null,
        failureReason: null,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Simulate payment gateway processing
      transaction.status = 'authorized';
      transaction.authorizationCode = crypto.randomBytes(16).toString('hex');
      transaction.processedAt = new Date();

      await collection.insertOne(transaction);

      // Create payment receipt
      await this._createPaymentReceipt(transactionId, paymentData);

      return {
        success: true,
        message: 'Payment processed successfully',
        data: {
          transactionId,
          status: transaction.status,
          amount: transaction.amount,
          authorizationCode: transaction.authorizationCode,
          processedAt: transaction.processedAt
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Setup recurring billing
   */
  static async setupRecurringBilling(userId, recurringData) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('recurring_billing');

      const recurringId = `rec_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      
      // Validate cycle
      const validCycles = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
      if (!validCycles.includes(recurringData.billingCycle)) {
        throw new Error('Invalid billing cycle');
      }

      const nextChargeDate = this._calculateNextChargeDate(new Date(), recurringData.billingCycle);

      const recurringRecord = {
        recurringId,
        userId,
        paymentMethodId: recurringData.paymentMethodId,
        amount: recurringData.amount,
        currency: recurringData.currency || 'USD',
        billingCycle: recurringData.billingCycle,
        description: recurringData.description,
        startDate: recurringData.startDate || new Date(),
        endDate: recurringData.endDate,
        nextChargeDate,
        chargeHistory: [],
        totalChargesCount: 0,
        failedChargesCount: 0,
        isActive: true,
        retryPolicy: {
          maxRetries: 3,
          retryInterval: 'daily' // daily or weekly
        },
        notifications: {
          onSuccess: true,
          onFailure: true,
          beforeCharge: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await collection.insertOne(recurringRecord);

      return {
        success: true,
        message: 'Recurring billing setup successfully',
        data: {
          recurringId,
          amount: recurringRecord.amount,
          billingCycle: recurringRecord.billingCycle,
          nextChargeDate,
          isActive: recurringRecord.isActive
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Process scheduled recurring payment
   */
  static async processRecurringPayment(recurringId) {
    try {
      const db = mongoose.connection.db;
      const recurringCollection = db.collection('recurring_billing');
      const transactionCollection = db.collection('payment_transactions');

      const recurring = await recurringCollection.findOne({ recurringId });
      if (!recurring) {
        throw new Error('Recurring billing not found');
      }

      if (!recurring.isActive) {
        throw new Error('Recurring billing is not active');
      }

      // Process payment
      const paymentData = {
        userId: recurring.userId,
        paymentMethodId: recurring.paymentMethodId,
        amount: recurring.amount,
        currency: recurring.currency,
        description: `${recurring.description} - Recurring charge`
      };

      const paymentResult = await this.processPayment(paymentData);

      if (paymentResult.success) {
        // Update recurring record
        const nextChargeDate = this._calculateNextChargeDate(new Date(), recurring.billingCycle);
        
        await recurringCollection.updateOne(
          { recurringId },
          {
            $push: { chargeHistory: {
              transactionId: paymentResult.data.transactionId,
              chargedAt: new Date(),
              amount: recurring.amount,
              status: 'successful'
            }},
            $set: {
              nextChargeDate,
              totalChargesCount: recurring.totalChargesCount + 1,
              updatedAt: new Date()
            }
          }
        );

        return {
          success: true,
          message: 'Recurring payment processed successfully',
          data: {
            recurringId,
            transactionId: paymentResult.data.transactionId,
            amount: recurring.amount,
            nextChargeDate
          }
        };
      } else {
        // Handle failure
        await recurringCollection.updateOne(
          { recurringId },
          {
            $push: { chargeHistory: {
              chargedAt: new Date(),
              amount: recurring.amount,
              status: 'failed',
              reason: paymentResult.message
            }},
            $set: {
              failedChargesCount: recurring.failedChargesCount + 1,
              updatedAt: new Date()
            }
          }
        );

        return {
          success: false,
          message: 'Recurring payment failed',
          data: { recurringId, failureReason: paymentResult.message }
        };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get payment method details
   */
  static async getPaymentMethod(paymentMethodId) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_methods');

      const method = await collection.findOne({ paymentMethodId });
      if (!method) {
        throw new Error('Payment method not found');
      }

      // Mask sensitive data
      const maskedMethod = {
        paymentMethodId: method.paymentMethodId,
        methodType: method.methodType,
        provider: method.provider,
        last4: method.last4,
        holderName: method.holderName,
        expiryDate: method.expiryDate,
        isDefault: method.isDefault,
        isActive: method.isActive,
        createdAt: method.createdAt
      };

      return {
        success: true,
        message: 'Payment method retrieved successfully',
        data: maskedMethod
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * List user payment methods
   */
  static async listPaymentMethods(userId, filters = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_methods');

      const query = { userId };
      if (filters.isActive !== undefined) query.isActive = filters.isActive;
      if (filters.methodType) query.methodType = filters.methodType;

      const methods = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .lean()
        .toArray();

      // Mask sensitive data
      const maskedMethods = methods.map(m => ({
        paymentMethodId: m.paymentMethodId,
        methodType: m.methodType,
        provider: m.provider,
        last4: m.last4,
        holderName: m.holderName,
        expiryDate: m.expiryDate,
        isDefault: m.isDefault,
        isActive: m.isActive,
        createdAt: m.createdAt
      }));

      return {
        success: true,
        message: 'Payment methods retrieved successfully',
        data: {
          methods: maskedMethods,
          count: maskedMethods.length,
          defaultMethod: maskedMethods.find(m => m.isDefault)
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Delete payment method
   */
  static async deletePaymentMethod(paymentMethodId, userId) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_methods');

      const method = await collection.findOne({ paymentMethodId, userId });
      if (!method) {
        throw new Error('Payment method not found');
      }

      // Soft delete by marking inactive
      await collection.updateOne(
        { paymentMethodId },
        { $set: { isActive: false, deletedAt: new Date() } }
      );

      return {
        success: true,
        message: 'Payment method deleted successfully',
        data: { paymentMethodId }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get transaction history
   */
  static async getTransactionHistory(userId, filters = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_transactions');

      const query = { userId };
      if (filters.status) query.status = filters.status;
      if (filters.rideId) query.rideId = filters.rideId;
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const transactions = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .toArray();

      const totalCount = await collection.countDocuments(query);

      return {
        success: true,
        message: 'Transaction history retrieved successfully',
        data: {
          transactions,
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
   * Get transaction details
   */
  static async getTransactionDetails(transactionId) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_transactions');

      const transaction = await collection.findOne({ transactionId });
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return {
        success: true,
        message: 'Transaction details retrieved successfully',
        data: transaction
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Generate invoice
   */
  static async generateInvoice(transactionId, invoiceData) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('invoices');

      const invoiceId = `inv_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      
      const invoice = {
        invoiceId,
        transactionId,
        userId: invoiceData.userId,
        amount: invoiceData.amount,
        currency: invoiceData.currency || 'USD',
        billTo: {
          name: invoiceData.billToName,
          email: invoiceData.billToEmail,
          address: invoiceData.billToAddress
        },
        lineItems: invoiceData.lineItems || [],
        tax: invoiceData.tax || 0,
        discount: invoiceData.discount || 0,
        total: invoiceData.amount,
        status: 'generated',
        issuedAt: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paidAt: null,
        createdAt: new Date()
      };

      await collection.insertOne(invoice);

      return {
        success: true,
        message: 'Invoice generated successfully',
        data: {
          invoiceId,
          transactionId,
          total: invoice.total,
          issuedAt: invoice.issuedAt,
          dueDate: invoice.dueDate
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Set payment as default
   */
  static async setDefaultPaymentMethod(userId, paymentMethodId) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_methods');

      // Verify method exists
      const method = await collection.findOne({ paymentMethodId, userId });
      if (!method) {
        throw new Error('Payment method not found');
      }

      // Unset previous default
      await collection.updateMany({ userId }, { $set: { isDefault: false } });

      // Set new default
      await collection.updateOne(
        { paymentMethodId },
        { $set: { isDefault: true, updatedAt: new Date() } }
      );

      return {
        success: true,
        message: 'Default payment method updated successfully',
        data: { paymentMethodId }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Verify payment (webhook from gateway)
   */
  static async verifyPayment(transactionId, gatewayVerification) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_transactions');

      const transaction = await collection.findOne({ transactionId });
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const status = gatewayVerification.status === 'success' ? 'completed' : 'failed';

      await collection.updateOne(
        { transactionId },
        {
          $set: {
            status,
            gatewayResponse: gatewayVerification,
            completedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      return {
        success: true,
        message: 'Payment verified successfully',
        data: {
          transactionId,
          status,
          verifiedAt: new Date()
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Helper: Tokenize payment data (mock implementation)
   */
  static _tokenizePaymentData(methodData) {
    // In production, this would call payment gateway API
    return `token_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Helper: Calculate next charge date
   */
  static _calculateNextChargeDate(currentDate, billingCycle) {
    const nextDate = new Date(currentDate);
    switch (billingCycle) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'annual':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
    return nextDate;
  }

  /**
   * Helper: Create payment receipt
   */
  static async _createPaymentReceipt(transactionId, paymentData) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('payment_receipts');

      const receipt = {
        receiptId: `rec_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
        transactionId,
        userId: paymentData.userId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        createdAt: new Date()
      };

      await collection.insertOne(receipt);
    } catch (error) {
      // Log but don't fail
      console.error('Failed to create payment receipt:', error);
    }
  }
}

module.exports = PaymentProcessingService;
