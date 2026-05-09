/**
 * Payment Utilities - Phase 11 Payment Processing
 * Helper functions for payment operations
 */

const crypto = require('crypto');
const logger = require('./logger');

class PaymentUtils {
  /**
   * Generate unique payment ID
   */
  static generatePaymentId() {
    return `PAY_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Generate transaction ID
   */
  static generateTransactionId() {
    return `TXN_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Generate refund ID
   */
  static generateRefundId() {
    return `REF_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Encrypt sensitive payment data
   */
  static encryptPaymentData(data, encryptionKey) {
    try {
      const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      logger.error('Error encrypting payment data:', error);
      throw error;
    }
  }

  /**
   * Decrypt sensitive payment data
   */
  static decryptPaymentData(encryptedData, encryptionKey) {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Error decrypting payment data:', error);
      throw error;
    }
  }

  /**
   * Validate card details
   */
  static validateCardDetails(cardData) {
    const { cardNumber, expiryMonth, expiryYear, cvv } = cardData;

    // Validate card number using Luhn algorithm
    if (!this.validateLuhn(cardNumber)) {
      throw new Error('Invalid card number');
    }

    // Validate expiry date
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (
      parseInt(expiryYear) < currentYear ||
      (parseInt(expiryYear) === currentYear && parseInt(expiryMonth) < currentMonth)
    ) {
      throw new Error('Card has expired');
    }

    // Validate CVV
    if (!cvv || !/^\d{3,4}$/.test(cvv)) {
      throw new Error('Invalid CVV');
    }

    return true;
  }

  /**
   * Validate Luhn algorithm for card numbers
   */
  static validateLuhn(cardNumber) {
    const digits = cardNumber.replace(/\D/g, '');
    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate UPI ID
   */
  static validateUpiId(upiId) {
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$/;
    return upiRegex.test(upiId);
  }

  /**
   * Mask sensitive payment data for logging
   */
  static maskCardNumber(cardNumber) {
    const lastFour = cardNumber.slice(-4);
    return `****-****-****-${lastFour}`;
  }

  /**
   * Mask UPI ID
   */
  static maskUpiId(upiId) {
    const parts = upiId.split('@');
    const firstPart = parts[0].substring(0, 2) + '*'.repeat(Math.max(0, parts[0].length - 4)) + parts[0].substring(parts[0].length - 2);
    return `${firstPart}@${parts[1]}`;
  }

  /**
   * Calculate transaction fee
   */
  static calculateTransactionFee(amount, feePercentage, fixedFee = 0) {
    const percentageFee = (amount * feePercentage) / 100;
    return percentageFee + fixedFee;
  }

  /**
   * Calculate net amount after fees
   */
  static calculateNetAmount(amount, feePercentage, fixedFee = 0) {
    const fee = this.calculateTransactionFee(amount, feePercentage, fixedFee);
    return amount - fee;
  }

  /**
   * Format amount for currency
   */
  static formatAmount(amount, currency = 'INR') {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    });
    return formatter.format(amount);
  }

  /**
   * Generate webhook signature
   */
  static generateWebhookSignature(payload, secret) {
    const message = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = this.generateWebhookSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Get payment method display name
   */
  static getPaymentMethodName(method) {
    const names = {
      credit_card: 'Credit Card',
      debit_card: 'Debit Card',
      upi: 'UPI',
      net_banking: 'Net Banking',
      wallet: 'Wallet',
      cod: 'Cash on Delivery',
      bank_transfer: 'Bank Transfer',
    };
    return names[method] || method;
  }

  /**
   * Get payment gateway display name
   */
  static getGatewayName(gateway) {
    const names = {
      razorpay: 'Razorpay',
      stripe: 'Stripe',
      paytm: 'Paytm',
      phonepe: 'PhonePe',
      googlepay: 'Google Pay',
      wallet: 'Wallet',
      cod: 'Cash on Delivery',
      none: 'None',
    };
    return names[gateway] || gateway;
  }

  /**
   * Get payment status color code
   */
  static getStatusColor(status) {
    const colors = {
      pending: '#FFA500',      // Orange
      initiated: '#87CEEB',    // Sky Blue
      processing: '#FFD700',   // Gold
      captured: '#90EE90',     // Light Green
      failed: '#FF6B6B',       // Red
      cancelled: '#808080',    // Gray
      refunded: '#4169E1',     // Royal Blue
      partial_refund: '#20B2AA', // Light Sea Green
    };
    return colors[status] || '#000000';
  }

  /**
   * Check if payment is successful
   */
  static isPaymentSuccessful(status) {
    return ['captured', 'refunded', 'partial_refund'].includes(status);
  }

  /**
   * Check if payment is pending
   */
  static isPaymentPending(status) {
    return ['pending', 'initiated', 'processing'].includes(status);
  }

  /**
   * Check if payment is failed
   */
  static isPaymentFailed(status) {
    return ['failed', 'cancelled'].includes(status);
  }

  /**
   * Convert amount to paisa (smallest unit for INR)
   */
  static convertToSmallestUnit(amount, currency = 'INR') {
    const units = {
      INR: 100,  // 1 INR = 100 paisa
      USD: 100,  // 1 USD = 100 cents
      EUR: 100,  // 1 EUR = 100 cents
      GBP: 100,  // 1 GBP = 100 pence
    };
    const unit = units[currency] || 100;
    return Math.round(amount * unit);
  }

  /**
   * Convert from smallest unit to amount
   */
  static convertFromSmallestUnit(smallestUnit, currency = 'INR') {
    const units = {
      INR: 100,
      USD: 100,
      EUR: 100,
      GBP: 100,
    };
    const unit = units[currency] || 100;
    return smallestUnit / unit;
  }

  /**
   * Check if amount is within transaction limits
   */
  static isAmountWithinLimits(amount, minAmount, maxAmount) {
    return amount >= minAmount && amount <= maxAmount;
  }

  /**
   * Calculate discount amount
   */
  static calculateDiscount(amount, discountPercentage) {
    return (amount * discountPercentage) / 100;
  }

  /**
   * Calculate amount after discount
   */
  static calculateAmountAfterDiscount(amount, discountPercentage) {
    return amount - this.calculateDiscount(amount, discountPercentage);
  }

  /**
   * Calculate GST
   */
  static calculateGST(amount, gstPercentage = 18) {
    return (amount * gstPercentage) / 100;
  }

  /**
   * Calculate total with GST
   */
  static calculateTotalWithGST(amount, gstPercentage = 18) {
    return amount + this.calculateGST(amount, gstPercentage);
  }

  /**
   * Is international payment
   */
  static isInternationalPayment(currency) {
    return currency !== 'INR';
  }

  /**
   * Get retry delay in milliseconds
   */
  static getRetryDelay(retryCount, baseDelay = 1000) {
    // Exponential backoff: baseDelay * 2^retryCount
    return baseDelay * Math.pow(2, retryCount);
  }

  /**
   * Should retry based on error code
   */
  static shouldRetry(errorCode) {
    const retryableErrors = [
      'TIMEOUT',
      'CONNECTION_ERROR',
      'RATE_LIMIT',
      'TEMPORARILY_UNAVAILABLE',
      'GATEWAY_ERROR',
    ];
    return retryableErrors.includes(errorCode);
  }
}

module.exports = PaymentUtils;
