const express = require('express');
const router = express.Router();

// Controllers
const PaymentController = require('../controllers/FoodDeliveryPaymentController');
const WalletController = require('../controllers/FoodDeliveryWalletController');
const RefundController = require('../controllers/FoodDeliveryRefundController');

// Middleware
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  initiatePaymentValidation,
  authorizePaymentValidation,
  capturePaymentValidation,
  processWalletPaymentValidation,
  processCODPaymentValidation,
  getPaymentStatusValidation,
  getPaymentByOrderValidation,
  getPaymentHistoryValidation,
  retryPaymentValidation,
  verifyPaymentValidation,
  cancelPaymentValidation,
  addMoneyValidation,
  getTransactionsValidation,
  addLinkedPaymentMethodValidation,
  setBeneficiaryValidation,
  updatePreferencesValidation,
  applyPromoCodeValidation,
  initiateRefundValidation,
  approveRefundValidation,
  rejectRefundValidation,
  processRefundValidation,
  getRefundStatusValidation,
  getRefundByOrderValidation,
  getUserRefundsValidation,
  retryFailedRefundValidation,
  getAnalyticsValidation,
} = require('../middleware/FoodDeliveryPhase5Validations');

// ============ PAYMENT ROUTES ============

/**
 * @route POST /api/v1/payments/initiate
 * @desc Initiate payment for order
 * @access Private
 */
router.post(
  '/payments/initiate',
  authenticateToken,
  initiatePaymentValidation,
  PaymentController.initiatePayment
);

/**
 * @route POST /api/v1/payments/:paymentId/authorize
 * @desc Authorize payment after gateway approval
 * @access Private
 */
router.post(
  '/payments/:paymentId/authorize',
  authenticateToken,
  authorizePaymentValidation,
  PaymentController.authorizePayment
);

/**
 * @route POST /api/v1/payments/:paymentId/capture
 * @desc Capture payment (finalize transaction)
 * @access Private
 */
router.post(
  '/payments/:paymentId/capture',
  authenticateToken,
  capturePaymentValidation,
  PaymentController.capturePayment
);

/**
 * @route POST /api/v1/payments/:paymentId/process-wallet
 * @desc Process payment using wallet balance
 * @access Private
 */
router.post(
  '/payments/:paymentId/process-wallet',
  authenticateToken,
  processWalletPaymentValidation,
  PaymentController.processWalletPayment
);

/**
 * @route POST /api/v1/payments/:paymentId/process-cod
 * @desc Mark payment as COD (cash on delivery)
 * @access Private
 */
router.post(
  '/payments/:paymentId/process-cod',
  authenticateToken,
  processCODPaymentValidation,
  PaymentController.processCODPayment
);

/**
 * @route GET /api/v1/payments/:paymentId
 * @desc Get payment status
 * @access Private
 */
router.get(
  '/payments/:paymentId',
  authenticateToken,
  getPaymentStatusValidation,
  PaymentController.getPaymentStatus
);

/**
 * @route GET /api/v1/orders/:orderId/payment
 * @desc Get payment by order ID
 * @access Private
 */
router.get(
  '/orders/:orderId/payment',
  authenticateToken,
  getPaymentByOrderValidation,
  PaymentController.getPaymentByOrder
);

/**
 * @route GET /api/v1/payments/history
 * @desc Get user payment history
 * @access Private
 */
router.get(
  '/payments/history',
  authenticateToken,
  getPaymentHistoryValidation,
  PaymentController.getPaymentHistory
);

/**
 * @route POST /api/v1/payments/:paymentId/retry
 * @desc Retry failed payment
 * @access Private
 */
router.post(
  '/payments/:paymentId/retry',
  authenticateToken,
  retryPaymentValidation,
  PaymentController.retryPayment
);

/**
 * @route POST /api/v1/payments/:paymentId/verify
 * @desc Verify payment with gateway
 * @access Private
 */
router.post(
  '/payments/:paymentId/verify',
  authenticateToken,
  verifyPaymentValidation,
  PaymentController.verifyPayment
);

/**
 * @route POST /api/v1/payments/:paymentId/cancel
 * @desc Cancel pending payment
 * @access Private
 */
router.post(
  '/payments/:paymentId/cancel',
  authenticateToken,
  cancelPaymentValidation,
  PaymentController.cancelPayment
);

/**
 * @route GET /api/v1/admin/payments/analytics
 * @desc Get payment analytics
 * @access Admin
 */
router.get(
  '/admin/payments/analytics',
  authenticateToken,
  getAnalyticsValidation,
  PaymentController.getPaymentAnalytics
);

// ============ WALLET ROUTES ============

/**
 * @route GET /api/v1/wallet
 * @desc Get wallet details
 * @access Private
 */
router.get('/wallet', authenticateToken, WalletController.getWallet);

/**
 * @route POST /api/v1/wallet/add-money
 * @desc Add money to wallet
 * @access Private
 */
router.post(
  '/wallet/add-money',
  authenticateToken,
  addMoneyValidation,
  WalletController.addMoney
);

/**
 * @route GET /api/v1/wallet/transactions
 * @desc Get wallet transaction history
 * @access Private
 */
router.get(
  '/wallet/transactions',
  authenticateToken,
  getTransactionsValidation,
  WalletController.getTransactions
);

/**
 * @route POST /api/v1/wallet/linked-payment-methods
 * @desc Add linked payment method
 * @access Private
 */
router.post(
  '/wallet/linked-payment-methods',
  authenticateToken,
  addLinkedPaymentMethodValidation,
  WalletController.addLinkedPaymentMethod
);

/**
 * @route POST /api/v1/wallet/beneficiary
 * @desc Set beneficiary for withdrawals
 * @access Private
 */
router.post(
  '/wallet/beneficiary',
  authenticateToken,
  setBeneficiaryValidation,
  WalletController.setBeneficiary
);

/**
 * @route PUT /api/v1/wallet/preferences
 * @desc Update wallet preferences
 * @access Private
 */
router.put(
  '/wallet/preferences',
  authenticateToken,
  updatePreferencesValidation,
  WalletController.updatePreferences
);

/**
 * @route GET /api/v1/wallet/summary
 * @desc Get wallet summary
 * @access Private
 */
router.get('/wallet/summary', authenticateToken, WalletController.getWalletSummary);

/**
 * @route POST /api/v1/wallet/promo
 * @desc Apply promo code
 * @access Private
 */
router.post(
  '/wallet/promo',
  authenticateToken,
  applyPromoCodeValidation,
  WalletController.applyPromoCode
);

/**
 * @route GET /api/v1/admin/wallet/analytics
 * @desc Get wallet analytics
 * @access Admin
 */
router.get(
  '/admin/wallet/analytics',
  authenticateToken,
  getAnalyticsValidation,
  WalletController.getWalletAnalytics
);

// ============ REFUND ROUTES ============

/**
 * @route POST /api/v1/refunds
 * @desc Initiate refund request
 * @access Private
 */
router.post(
  '/refunds',
  authenticateToken,
  initiateRefundValidation,
  RefundController.initiateRefund
);

/**
 * @route POST /api/v1/refunds/:refundId/approve
 * @desc Approve refund
 * @access Admin
 */
router.post(
  '/refunds/:refundId/approve',
  authenticateToken,
  approveRefundValidation,
  RefundController.approveRefund
);

/**
 * @route POST /api/v1/refunds/:refundId/reject
 * @desc Reject refund
 * @access Admin
 */
router.post(
  '/refunds/:refundId/reject',
  authenticateToken,
  rejectRefundValidation,
  RefundController.rejectRefund
);

/**
 * @route POST /api/v1/refunds/:refundId/process
 * @desc Process approved refund
 * @access Admin/System
 */
router.post(
  '/refunds/:refundId/process',
  authenticateToken,
  processRefundValidation,
  RefundController.processRefund
);

/**
 * @route GET /api/v1/refunds/:refundId
 * @desc Get refund status
 * @access Private
 */
router.get(
  '/refunds/:refundId',
  authenticateToken,
  getRefundStatusValidation,
  RefundController.getRefundStatus
);

/**
 * @route GET /api/v1/orders/:orderId/refund
 * @desc Get refund by order ID
 * @access Private
 */
router.get(
  '/orders/:orderId/refund',
  authenticateToken,
  getRefundByOrderValidation,
  RefundController.getRefundByOrder
);

/**
 * @route GET /api/v1/refunds
 * @desc Get user refunds
 * @access Private
 */
router.get(
  '/refunds',
  authenticateToken,
  getUserRefundsValidation,
  RefundController.getUserRefunds
);

/**
 * @route POST /api/v1/refunds/:refundId/retry
 * @desc Retry failed refund
 * @access Admin/System
 */
router.post(
  '/refunds/:refundId/retry',
  authenticateToken,
  retryFailedRefundValidation,
  RefundController.retryFailedRefund
);

/**
 * @route GET /api/v1/admin/refunds/analytics
 * @desc Get refund analytics
 * @access Admin
 */
router.get(
  '/admin/refunds/analytics',
  authenticateToken,
  getAnalyticsValidation,
  RefundController.getRefundAnalytics
);

module.exports = router;
