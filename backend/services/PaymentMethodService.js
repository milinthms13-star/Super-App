/**
 * PaymentMethodService.js
 * Manages payment methods with encryption and fraud detection
 */

const PaymentMethod = require('../models/PaymentMethod');
const crypto = require('crypto');

class PaymentMethodService {
  static instance;

  constructor() {
    this.encryptionKey = process.env.PAYMENT_ENCRYPTION_KEY || 'default-key';
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new PaymentMethodService();
    }
    return this.instance;
  }

  // Add payment method
  async addPaymentMethod(userId, methodData) {
    this.validatePaymentData(methodData);

    const fingerprint = PaymentMethod.createFingerprint(methodData.methodType, methodData);

    // Check if payment method already exists
    const existing = await PaymentMethod.findByFingerprint(fingerprint);
    if (existing) {
      throw new Error('This payment method is already registered');
    }

    const paymentMethod = new PaymentMethod({
      userId,
      ...methodData,
      fingerprint
    });

    // For cards, extract last 4 digits
    if (methodData.methodType === 'card' && methodData.cardNumber) {
      paymentMethod.cardLast4 = methodData.cardNumber.slice(-4);
      // Encrypt card number (in production, use Razorpay tokenization)
      paymentMethod.cardNumber = this.encrypt(methodData.cardNumber);
    }

    // Generate tokenized reference (from payment gateway in production)
    paymentMethod.tokenizedReference = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await paymentMethod.save();
    return paymentMethod.maskSensitiveData();
  }

  // Get payment methods
  async getPaymentMethods(userId) {
    const methods = await PaymentMethod.getActivePaymentMethods(userId);
    return methods.map((m) => m.maskSensitiveData());
  }

  // Get default payment method
  async getDefaultPaymentMethod(userId, methodType = null) {
    const method = await PaymentMethod.getDefault(userId, methodType);
    if (!method) {
      return null;
    }
    return method.maskSensitiveData();
  }

  // Set default payment method
  async setDefaultPaymentMethod(userId, methodId) {
    const method = await PaymentMethod.findOne({ _id: methodId, userId });
    if (!method) {
      throw new Error('Payment method not found');
    }

    await method.setAsDefault();
    return method.maskSensitiveData();
  }

  // Verify payment method
  async verifyPaymentMethod(userId, methodId, code) {
    const method = await PaymentMethod.findOne({ _id: methodId, userId });
    if (!method) {
      throw new Error('Payment method not found');
    }

    await method.verifyPaymentMethod(code);
    return method.maskSensitiveData();
  }

  // Generate verification code
  async generateVerificationCode(userId, methodId) {
    const method = await PaymentMethod.findOne({ _id: methodId, userId });
    if (!method) {
      throw new Error('Payment method not found');
    }

    const code = method.generateVerificationCode();
    await method.save();

    return { code, expiresAt: method.verificationExpires };
  }

  // Delete payment method
  async deletePaymentMethod(userId, methodId) {
    const method = await PaymentMethod.findOne({ _id: methodId, userId });
    if (!method) {
      throw new Error('Payment method not found');
    }

    method.isActive = false;

    // If this was default, set another as default
    if (method.isDefault) {
      const nextMethod = await PaymentMethod.findOne({
        userId,
        isActive: true,
        methodType: method.methodType,
        _id: { $ne: methodId }
      });

      if (nextMethod) {
        await nextMethod.setAsDefault();
      }
    }

    await method.save();
    return { success: true, message: 'Payment method deleted' };
  }

  // Record successful payment
  async recordSuccessfulPayment(userId, methodId, transactionAmount) {
    const method = await PaymentMethod.findOne({ _id: methodId, userId });
    if (!method) {
      throw new Error('Payment method not found');
    }

    await method.recordUsage();

    // Update risk score (reduce if many successful payments)
    if (method.usageCount % 10 === 0 && method.riskScore > 0) {
      method.riskScore = Math.max(0, method.riskScore - 5);
      await method.save();
    }

    return method.maskSensitiveData();
  }

  // Record failed payment
  async recordFailedPayment(userId, methodId, reason = '') {
    const method = await PaymentMethod.findOne({ _id: methodId, userId });
    if (!method) {
      throw new Error('Payment method not found');
    }

    await method.recordFailure(reason);

    // Update risk score
    method.riskScore = Math.min(100, method.riskScore + 15);
    await method.save();

    return method.maskSensitiveData();
  }

  // Check for fraud
  async checkFraud(userId, methodId, transactionAmount, ipAddress = null) {
    const method = await PaymentMethod.findOne({ _id: methodId, userId });
    if (!method) {
      throw new Error('Payment method not found');
    }

    const fraudChecks = [];
    let totalRiskScore = method.riskScore;

    // Check 1: Consecutive failures
    if (method.consecutiveFailures >= 3) {
      fraudChecks.push('Multiple failed attempts');
      totalRiskScore += 25;
    }

    // Check 2: Unusual amount
    if (transactionAmount > 100000) {
      fraudChecks.push('Large transaction amount');
      totalRiskScore += 10;
    }

    // Check 3: Multiple rapid transactions (if payment gateway provides this)
    // In production, query transaction history
    if (method.usageCount === 0) {
      fraudChecks.push('New payment method');
      totalRiskScore += 10;
    }

    const isFraudulent = totalRiskScore > 50;

    if (isFraudulent) {
      method.isFraudulent = true;
      method.fraudReasons = fraudChecks;
      await method.save();
    }

    return {
      isFraudulent,
      riskScore: totalRiskScore,
      fraudReasons: fraudChecks
    };
  }

  // Validate payment data
  validatePaymentData(methodData) {
    if (!methodData.methodType) {
      throw new Error('Payment method type required');
    }

    if (methodData.methodType === 'card') {
      if (!methodData.cardNumber || !/^\d{13,19}$/.test(methodData.cardNumber)) {
        throw new Error('Invalid card number');
      }
      if (!methodData.expiryMonth || !methodData.expiryYear) {
        throw new Error('Card expiry required');
      }
      if (!methodData.cardHolderName) {
        throw new Error('Card holder name required');
      }
    } else if (methodData.methodType === 'upi') {
      if (!methodData.upiId || !/^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/.test(methodData.upiId)) {
        throw new Error('Invalid UPI ID');
      }
    } else if (methodData.methodType === 'wallet') {
      if (!methodData.walletProvider) {
        throw new Error('Wallet provider required');
      }
    }
  }

  // Encryption helper
  encrypt(data) {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  // Decryption helper
  decrypt(encrypted) {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Get payment method by ID
  async getPaymentMethodById(userId, methodId) {
    const method = await PaymentMethod.findOne({ _id: methodId, userId, isActive: true });
    if (!method) {
      throw new Error('Payment method not found');
    }
    return method.maskSensitiveData();
  }

  // Get methods by type
  async getMethodsByType(userId, methodType) {
    const methods = await PaymentMethod.find({
      userId,
      methodType,
      isActive: true
    });
    return methods.map((m) => m.maskSensitiveData());
  }
}

module.exports = PaymentMethodService.getInstance();
