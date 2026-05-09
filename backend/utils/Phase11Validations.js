/**
 * Phase 11 Validations - Payment Processing
 * Input validation for all payment-related endpoints
 */

const { body } = require('express-validator');

class Phase11Validations {
  /**
   * Validate payment creation
   */
  static validatePaymentCreation() {
    return [
      body('orderId').notEmpty().trim().isString().withMessage('Order ID is required'),
      body('userId').notEmpty().trim().isString().withMessage('User ID is required'),
      body('amount')
        .notEmpty()
        .isFloat({ min: 0.01 })
        .withMessage('Valid amount is required (minimum 0.01)'),
      body('paymentMethod')
        .notEmpty()
        .isIn(['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'cod', 'bank_transfer'])
        .withMessage('Valid payment method is required'),
      body('paymentGateway')
        .notEmpty()
        .isIn(['razorpay', 'stripe', 'paytm', 'phonepe', 'googlepay', 'wallet', 'cod', 'none'])
        .withMessage('Valid payment gateway is required'),
      body('currency')
        .optional()
        .isIn(['INR', 'USD', 'EUR', 'GBP'])
        .withMessage('Valid currency is required'),
      body('metadata').optional().isObject().withMessage('Metadata must be an object'),
    ];
  }

  /**
   * Validate refund initiation
   */
  static validateRefund() {
    return [
      body('reason').notEmpty().isString().withMessage('Refund reason is required'),
      body('amount')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Refund amount must be greater than 0'),
      body('autoRefund')
        .optional()
        .isBoolean()
        .withMessage('autoRefund must be boolean'),
    ];
  }

  /**
   * Validate reconciliation initiation
   */
  static validateReconciliationInit() {
    return [
      body('gateway')
        .notEmpty()
        .isIn(['razorpay', 'stripe', 'paytm', 'phonepe', 'googlepay', 'flutterwave', 'square', 'paypal'])
        .withMessage('Valid gateway is required'),
      body('reconciliationType')
        .notEmpty()
        .isIn(['daily', 'weekly', 'monthly', 'manual', 'custom'])
        .withMessage('Valid reconciliation type is required'),
      body('startDate')
        .notEmpty()
        .isISO8601()
        .withMessage('Valid start date is required'),
      body('endDate')
        .notEmpty()
        .isISO8601()
        .withMessage('Valid end date is required'),
    ];
  }

  /**
   * Validate payment gateway configuration
   */
  static validateGatewayConfig() {
    return [
      body('gatewayName')
        .notEmpty()
        .isIn(['razorpay', 'stripe', 'paytm', 'phonepe', 'googlepay', 'flutterwave', 'square', 'paypal'])
        .withMessage('Valid gateway name is required'),
      body('displayName')
        .optional()
        .isString()
        .withMessage('Display name must be a string'),
      body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be boolean'),
      body('priority')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Priority must be a positive integer'),
      body('credentials')
        .notEmpty()
        .isObject()
        .withMessage('Credentials must be an object'),
      body('credentials.apiKey')
        .notEmpty()
        .isString()
        .withMessage('API key is required'),
      body('credentials.apiSecret')
        .notEmpty()
        .isString()
        .withMessage('API secret is required'),
      body('credentials.merchantId')
        .optional()
        .isString()
        .withMessage('Merchant ID must be a string'),
    ];
  }

  /**
   * Validate fee structure update
   */
  static validateFeeStructure() {
    return [
      body('baseFee')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Base fee must be non-negative'),
      body('percentageFee')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Percentage fee must be between 0 and 100'),
      body('fixedFee')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Fixed fee must be non-negative'),
      body('internationalFee')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('International fee must be non-negative'),
    ];
  }

  /**
   * Validate transaction retry
   */
  static validateTransactionRetry() {
    return [
      body('reason')
        .optional()
        .isString()
        .withMessage('Reason must be a string'),
    ];
  }

  /**
   * Validate webhook payload
   */
  static validateWebhook() {
    return [
      body('event')
        .notEmpty()
        .isString()
        .withMessage('Event is required'),
      body('data')
        .notEmpty()
        .isObject()
        .withMessage('Data must be an object'),
    ];
  }

  /**
   * Validate payment status update
   */
  static validatePaymentStatusUpdate() {
    return [
      body('status')
        .notEmpty()
        .isIn(['pending', 'initiated', 'processing', 'captured', 'failed', 'cancelled', 'refunded', 'partial_refund'])
        .withMessage('Valid status is required'),
      body('reason')
        .optional()
        .isString()
        .withMessage('Reason must be a string'),
    ];
  }

  /**
   * Validate transaction creation
   */
  static validateTransactionCreation() {
    return [
      body('paymentId')
        .notEmpty()
        .isString()
        .withMessage('Payment ID is required'),
      body('orderId')
        .notEmpty()
        .isString()
        .withMessage('Order ID is required'),
      body('userId')
        .notEmpty()
        .isString()
        .withMessage('User ID is required'),
      body('transactionType')
        .notEmpty()
        .isIn(['debit', 'credit', 'reversal', 'adjustment', 'chargeback', 'dispute'])
        .withMessage('Valid transaction type is required'),
      body('amount')
        .notEmpty()
        .isFloat({ min: 0.01 })
        .withMessage('Valid amount is required'),
      body('paymentMethod')
        .notEmpty()
        .isString()
        .withMessage('Payment method is required'),
    ];
  }

  /**
   * Validate discount application
   */
  static validateDiscountApplication() {
    return [
      body('couponCode')
        .notEmpty()
        .isString()
        .trim()
        .withMessage('Coupon code is required'),
      body('paymentId')
        .notEmpty()
        .isString()
        .withMessage('Payment ID is required'),
    ];
  }

  /**
   * Validate wallet payment
   */
  static validateWalletPayment() {
    return [
      body('amount')
        .notEmpty()
        .isFloat({ min: 0.01 })
        .withMessage('Valid amount is required'),
      body('walletId')
        .notEmpty()
        .isString()
        .withMessage('Wallet ID is required'),
      body('orderId')
        .notEmpty()
        .isString()
        .withMessage('Order ID is required'),
    ];
  }
}

module.exports = Phase11Validations;
