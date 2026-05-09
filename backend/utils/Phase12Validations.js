/**
 * Phase 12 Validations - Advanced Payment Features
 * Input validation for all Phase 12 endpoints
 */

const { body } = require('express-validator');

class Phase12Validations {
  /**
   * Subscription creation validation
   */
  static validateSubscriptionCreation() {
    return [
      body('orderId').notEmpty().withMessage('Order ID is required'),
      body('userId').notEmpty().withMessage('User ID is required'),
      body('planType')
        .isIn(['daily', 'weekly', 'monthly', 'custom'])
        .withMessage('Invalid plan type'),
      body('billingAmount')
        .isFloat({ min: 0.01 })
        .withMessage('Billing amount must be at least ₹0.01'),
      body('paymentMethod')
        .isIn(['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet'])
        .withMessage('Invalid payment method'),
      body('paymentGateway').notEmpty().withMessage('Payment gateway is required'),
      body('startDate').isISO8601().withMessage('Invalid start date'),
    ];
  }

  /**
   * Payment link creation validation
   */
  static validatePaymentLinkCreation() {
    return [
      body('createdBy').notEmpty().withMessage('Created by is required'),
      body('createdByType')
        .isIn(['restaurant', 'admin', 'user'])
        .withMessage('Invalid creator type'),
      body('paymentAmount')
        .isFloat({ min: 0.01 })
        .withMessage('Payment amount must be at least ₹0.01'),
      body('description').optional().isString(),
      body('purpose')
        .optional()
        .isIn(['order_payment', 'invoice_payment', 'subscription', 'refund', 'adjustment', 'custom']),
      body('expiryDays').optional().isInt({ min: 1, max: 365 }),
      body('acceptedPaymentMethods')
        .optional()
        .isArray()
        .withMessage('Must be an array'),
      body('acceptedGateways').optional().isArray().withMessage('Must be an array'),
    ];
  }

  /**
   * Invoice creation validation
   */
  static validateInvoiceCreation() {
    return [
      body('linkedPaymentId').notEmpty().withMessage('Payment ID is required'),
      body('invoiceDate').isISO8601().withMessage('Invalid invoice date'),
      body('items')
        .isArray({ min: 1 })
        .withMessage('At least one item is required'),
      body('items.*.itemName').notEmpty(),
      body('items.*.quantity').isInt({ min: 1 }),
      body('items.*.unitPrice').isFloat({ min: 0 }),
      body('billFrom.name').optional().isString(),
      body('billFrom.email').optional().isEmail(),
      body('billTo.name').notEmpty().withMessage('Bill to name is required'),
      body('billTo.email').optional().isEmail(),
    ];
  }

  /**
   * Settlement creation validation
   */
  static validateSettlementCreation() {
    return [
      body('requestedBy').notEmpty().withMessage('Requested by is required'),
      body('requestedByType')
        .isIn(['restaurant', 'admin', 'system'])
        .withMessage('Invalid requester type'),
      body('paymentGateway').notEmpty().withMessage('Payment gateway is required'),
      body('settlementAmount')
        .isFloat({ min: 0.01 })
        .withMessage('Settlement amount must be at least ₹0.01'),
      body('bankDetails.accountNumber')
        .notEmpty()
        .withMessage('Account number is required'),
      body('bankDetails.ifscCode')
        .notEmpty()
        .withMessage('IFSC code is required'),
      body('bankDetails.bankName').notEmpty().withMessage('Bank name is required'),
    ];
  }

  /**
   * Commission creation validation
   */
  static validateCommissionCreation() {
    return [
      body('linkedPaymentId').notEmpty().withMessage('Payment ID is required'),
      body('linkedRestaurantId').notEmpty().withMessage('Restaurant ID is required'),
      body('commissionType')
        .isIn(['restaurant', 'delivery_partner', 'promo', 'platform', 'other'])
        .withMessage('Invalid commission type'),
      body('orderAmount')
        .isFloat({ min: 0.01 })
        .withMessage('Order amount must be at least ₹0.01'),
      body('commissionRate')
        .isFloat({ min: 0, max: 100 })
        .withMessage('Commission rate must be between 0 and 100'),
    ];
  }

  /**
   * Subscription pause/cancel validation
   */
  static validateSubscriptionAction() {
    return [
      body('reason').optional().isString().trim(),
    ];
  }

  /**
   * Payment link share validation
   */
  static validateLinkShare() {
    return [
      body('shareMethod')
        .isIn(['email', 'sms', 'whatsapp', 'link_copy', 'qr_scan'])
        .withMessage('Invalid share method'),
      body('sharedWith').notEmpty().withMessage('Shared with information is required'),
    ];
  }

  /**
   * Invoice send validation
   */
  static validateInvoiceSend() {
    return [
      body('sendTo').isEmail().withMessage('Valid email is required'),
      body('method')
        .optional()
        .isIn(['email', 'sms', 'whatsapp'])
        .withMessage('Invalid send method'),
    ];
  }

  /**
   * Settlement approval validation
   */
  static validateSettlementApproval() {
    return [
      body('notes').optional().isString().trim(),
    ];
  }

  /**
   * Commission hold validation
   */
  static validateCommissionHold() {
    return [
      body('reason').notEmpty().withMessage('Hold reason is required'),
      body('holdDays')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Hold days must be between 1 and 365'),
    ];
  }

  /**
   * Batch commission creation validation
   */
  static validateBulkCommissionCreation() {
    return [
      body('commissions')
        .isArray({ min: 1 })
        .withMessage('At least one commission is required'),
      body('commissions.*.linkedPaymentId').notEmpty(),
      body('commissions.*.linkedRestaurantId').notEmpty(),
      body('commissions.*.commissionType').isIn([
        'restaurant',
        'delivery_partner',
        'promo',
        'platform',
        'other',
      ]),
      body('commissions.*.orderAmount').isFloat({ min: 0.01 }),
      body('commissions.*.commissionRate').isFloat({ min: 0, max: 100 }),
    ];
  }
}

module.exports = Phase12Validations;
