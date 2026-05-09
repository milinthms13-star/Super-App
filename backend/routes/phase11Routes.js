/**
 * Phase 11 Routes - Payment Processing
 * All payment-related API routes
 */

const express = require('express');
const router = express.Router();

const PaymentController = require('../controllers/PaymentController');
const ReconciliationController = require('../controllers/ReconciliationController');
const TransactionController = require('../controllers/TransactionController');
const Phase11Validations = require('../utils/Phase11Validations');

// Middleware
const { body, query, param, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// ===== PAYMENT ENDPOINTS =====

/**
 * Create a new payment
 * POST /api/v1/payments
 */
router.post(
  '/payments',
  Phase11Validations.validatePaymentCreation(),
  validateRequest,
  PaymentController.createPayment
);

/**
 * Process payment with gateway
 * POST /api/v1/payments/:paymentId/process
 */
router.post(
  '/payments/:paymentId/process',
  param('paymentId').notEmpty().trim(),
  validateRequest,
  PaymentController.processPayment
);

/**
 * Capture authorized payment
 * POST /api/v1/payments/:paymentId/capture
 */
router.post(
  '/payments/:paymentId/capture',
  param('paymentId').notEmpty().trim(),
  validateRequest,
  PaymentController.capturePayment
);

/**
 * Verify payment status
 * GET /api/v1/payments/:paymentId/verify
 */
router.get(
  '/payments/:paymentId/verify',
  param('paymentId').notEmpty().trim(),
  validateRequest,
  PaymentController.verifyPayment
);

/**
 * Get payment details
 * GET /api/v1/payments/:paymentId
 */
router.get(
  '/payments/:paymentId',
  param('paymentId').notEmpty().trim(),
  validateRequest,
  PaymentController.getPayment
);

/**
 * Get user payments
 * GET /api/v1/payments/user/:userId
 */
router.get(
  '/payments/user/:userId',
  param('userId').notEmpty().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest,
  PaymentController.getUserPayments
);

/**
 * Initiate refund
 * POST /api/v1/payments/:paymentId/refund
 */
router.post(
  '/payments/:paymentId/refund',
  param('paymentId').notEmpty().trim(),
  Phase11Validations.validateRefund(),
  validateRequest,
  PaymentController.initiateRefund
);

/**
 * Get refund status
 * GET /api/v1/refunds/:refundId
 */
router.get(
  '/refunds/:refundId',
  param('refundId').notEmpty().trim(),
  validateRequest,
  PaymentController.getRefundStatus
);

/**
 * Get user refunds
 * GET /api/v1/refunds/user/:userId
 */
router.get(
  '/refunds/user/:userId',
  param('userId').notEmpty().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest,
  PaymentController.getUserRefunds
);

/**
 * Retry payment
 * POST /api/v1/payments/:paymentId/retry
 */
router.post(
  '/payments/:paymentId/retry',
  param('paymentId').notEmpty().trim(),
  validateRequest,
  PaymentController.retryPayment
);

/**
 * Cancel payment
 * POST /api/v1/payments/:paymentId/cancel
 */
router.post(
  '/payments/:paymentId/cancel',
  param('paymentId').notEmpty().trim(),
  body('reason').optional().isString(),
  validateRequest,
  PaymentController.cancelPayment
);

/**
 * Get payment analytics
 * GET /api/v1/payments/analytics/summary
 */
router.get(
  '/payments/analytics/summary',
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validateRequest,
  PaymentController.getPaymentAnalytics
);

/**
 * Get available payment gateways
 * GET /api/v1/payment-gateways
 */
router.get(
  '/payment-gateways',
  PaymentController.getAvailableGateways
);

/**
 * Select best gateway for payment
 * POST /api/v1/payment-gateways/select
 */
router.post(
  '/payment-gateways/select',
  body('amount').isFloat({ min: 0 }),
  body('paymentMethod').notEmpty().isString(),
  validateRequest,
  PaymentController.selectBestGateway
);

/**
 * Payment webhook handler
 * POST /api/v1/payments/webhook/:gatewayName
 */
router.post(
  '/payments/webhook/:gatewayName',
  param('gatewayName').notEmpty().trim(),
  PaymentController.handleWebhook
);

// ===== TRANSACTION ENDPOINTS =====

/**
 * Get transaction details
 * GET /api/v1/transactions/:transactionId
 */
router.get(
  '/transactions/:transactionId',
  param('transactionId').notEmpty().trim(),
  validateRequest,
  TransactionController.getTransaction
);

/**
 * Get user transactions
 * GET /api/v1/transactions/user/:userId
 */
router.get(
  '/transactions/user/:userId',
  param('userId').notEmpty().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest,
  TransactionController.getUserTransactions
);

/**
 * Get payment transactions
 * GET /api/v1/transactions/payment/:paymentId
 */
router.get(
  '/transactions/payment/:paymentId',
  param('paymentId').notEmpty().trim(),
  validateRequest,
  TransactionController.getPaymentTransactions
);

/**
 * Retry transaction
 * POST /api/v1/transactions/:transactionId/retry
 */
router.post(
  '/transactions/:transactionId/retry',
  param('transactionId').notEmpty().trim(),
  validateRequest,
  TransactionController.retryTransaction
);

/**
 * Reverse transaction
 * POST /api/v1/transactions/:transactionId/reverse
 */
router.post(
  '/transactions/:transactionId/reverse',
  param('transactionId').notEmpty().trim(),
  body('reason').notEmpty().isString(),
  validateRequest,
  TransactionController.reverseTransaction
);

/**
 * Get transaction statistics
 * GET /api/v1/transactions/stats/summary
 */
router.get(
  '/transactions/stats/summary',
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validateRequest,
  TransactionController.getTransactionStats
);

/**
 * Export transactions
 * GET /api/v1/transactions/export
 */
router.get(
  '/transactions/export',
  query('format').optional().isIn(['json', 'csv']),
  validateRequest,
  TransactionController.exportTransactions
);

/**
 * Get failed transactions
 * GET /api/v1/transactions/failed/retry-pending
 */
router.get(
  '/transactions/failed/retry-pending',
  TransactionController.getFailedTransactions
);

// ===== RECONCILIATION ENDPOINTS =====

/**
 * Initiate reconciliation
 * POST /api/v1/reconciliations
 */
router.post(
  '/reconciliations',
  Phase11Validations.validateReconciliationInit(),
  validateRequest,
  ReconciliationController.initiateReconciliation
);

/**
 * Execute reconciliation
 * POST /api/v1/reconciliations/:reconciliationId/execute
 */
router.post(
  '/reconciliations/:reconciliationId/execute',
  param('reconciliationId').notEmpty().trim(),
  validateRequest,
  ReconciliationController.executeReconciliation
);

/**
 * Get reconciliation details
 * GET /api/v1/reconciliations/:reconciliationId
 */
router.get(
  '/reconciliations/:reconciliationId',
  param('reconciliationId').notEmpty().trim(),
  validateRequest,
  ReconciliationController.getReconciliationDetails
);

/**
 * Get reconciliations for gateway
 * GET /api/v1/reconciliations/gateway/:gatewayName
 */
router.get(
  '/reconciliations/gateway/:gatewayName',
  param('gatewayName').notEmpty().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest,
  ReconciliationController.getReconciliationsByGateway
);

/**
 * Approve reconciliation
 * POST /api/v1/reconciliations/:reconciliationId/approve
 */
router.post(
  '/reconciliations/:reconciliationId/approve',
  param('reconciliationId').notEmpty().trim(),
  body('approvedBy').notEmpty().isString(),
  validateRequest,
  ReconciliationController.approveReconciliation
);

/**
 * Reject reconciliation
 * POST /api/v1/reconciliations/:reconciliationId/reject
 */
router.post(
  '/reconciliations/:reconciliationId/reject',
  param('reconciliationId').notEmpty().trim(),
  body('reason').notEmpty().isString(),
  validateRequest,
  ReconciliationController.rejectReconciliation
);

/**
 * Resolve discrepancy
 * POST /api/v1/reconciliations/:reconciliationId/discrepancies/:index/resolve
 */
router.post(
  '/reconciliations/:reconciliationId/discrepancies/:index/resolve',
  param('reconciliationId').notEmpty().trim(),
  param('index').isInt({ min: 0 }),
  body('reason').notEmpty().isString(),
  validateRequest,
  ReconciliationController.resolveDiscrepancy
);

/**
 * Get reconciliation report
 * GET /api/v1/reconciliations/:reconciliationId/report
 */
router.get(
  '/reconciliations/:reconciliationId/report',
  param('reconciliationId').notEmpty().trim(),
  validateRequest,
  ReconciliationController.generateReport
);

/**
 * Get reconciliation summary
 * GET /api/v1/reconciliations/:reconciliationId/summary
 */
router.get(
  '/reconciliations/:reconciliationId/summary',
  param('reconciliationId').notEmpty().trim(),
  validateRequest,
  ReconciliationController.getReconciliationSummary
);

module.exports = router;
