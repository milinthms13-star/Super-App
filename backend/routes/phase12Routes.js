/**
 * Phase 12 Routes - Advanced Payment Features
 * Subscription, Payment Links, Invoices, Settlements, Commissions
 */

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');

const SubscriptionController = require('../controllers/SubscriptionController');
const PaymentLinkController = require('../controllers/PaymentLinkController');
const InvoiceController = require('../controllers/InvoiceController');
const SettlementCommissionController = require('../controllers/SettlementCommissionController');
const Phase12Validations = require('../utils/Phase12Validations');

// ============= SUBSCRIPTION ROUTES =============

router.post(
  '/subscriptions',
  Phase12Validations.validateSubscriptionCreation(),
  SubscriptionController.createSubscription
);

router.get('/subscriptions/:subscriptionId', SubscriptionController.getSubscription);

router.get('/subscriptions/user/:userId', SubscriptionController.getUserSubscriptions);

router.post(
  '/subscriptions/:subscriptionId/activate',
  SubscriptionController.activateSubscription
);

router.post(
  '/subscriptions/:subscriptionId/pause',
  body('reason').optional().isString(),
  SubscriptionController.pauseSubscription
);

router.post(
  '/subscriptions/:subscriptionId/resume',
  SubscriptionController.resumeSubscription
);

router.post(
  '/subscriptions/:subscriptionId/cancel',
  body('reason').optional().isString(),
  SubscriptionController.cancelSubscription
);

router.get(
  '/subscriptions/user/:userId/stats',
  SubscriptionController.getSubscriptionStats
);

// ============= PAYMENT LINK ROUTES =============

router.post(
  '/payment-links',
  Phase12Validations.validatePaymentLinkCreation(),
  PaymentLinkController.createLink
);

router.get('/payment-links/:linkToken', PaymentLinkController.getLink);

router.post('/payment-links/:linkToken/click', PaymentLinkController.trackClick);

router.post(
  '/payment-links/:linkToken/record-payment',
  body('paymentId').notEmpty(),
  body('amount').isFloat({ min: 0.01 }),
  body('status').isIn(['pending', 'completed', 'failed']),
  PaymentLinkController.recordPayment
);

router.get(
  '/payment-links/creator/:createdBy',
  PaymentLinkController.getLinksByCreator
);

router.post(
  '/payment-links/:linkToken/share',
  body('shareMethod').isIn(['email', 'sms', 'whatsapp', 'link_copy', 'qr_scan']),
  body('sharedWith').notEmpty(),
  PaymentLinkController.shareLink
);

router.delete(
  '/payment-links/:linkToken',
  body('reason').optional().isString(),
  PaymentLinkController.cancelLink
);

router.get(
  '/payment-links/:linkToken/analytics',
  PaymentLinkController.getLinkAnalytics
);

router.get(
  '/payment-links/creator/:createdBy/stats',
  PaymentLinkController.getLinkStats
);

// ============= INVOICE ROUTES =============

router.post(
  '/invoices',
  Phase12Validations.validateInvoiceCreation(),
  InvoiceController.createInvoice
);

router.get('/invoices/:invoiceId', InvoiceController.getInvoice);

router.post(
  '/invoices/:invoiceId/send',
  body('sendTo').isEmail(),
  body('method').isIn(['email', 'sms', 'whatsapp']),
  InvoiceController.sendInvoice
);

router.post(
  '/invoices/:invoiceId/record-payment',
  body('paymentId').notEmpty(),
  body('amount').isFloat({ min: 0.01 }),
  InvoiceController.recordPayment
);

router.get('/invoices/:invoiceId/pdf', InvoiceController.getInvoicePDF);

router.get('/invoices', InvoiceController.getInvoices);

router.get('/invoices/overdue', InvoiceController.getOverdueInvoices);

router.post(
  '/invoices/:invoiceId/mark-viewed',
  body('viewedBy').optional().isString(),
  InvoiceController.markAsViewed
);

router.get('/invoices/stats', InvoiceController.getInvoiceStats);

router.delete(
  '/invoices/:invoiceId',
  body('reason').optional().isString(),
  InvoiceController.cancelInvoice
);

// ============= SETTLEMENT ROUTES =============

router.post(
  '/settlements',
  Phase12Validations.validateSettlementCreation(),
  SettlementCommissionController.createSettlement
);

router.get('/settlements/:settlementId', SettlementCommissionController.getSettlement);

router.post(
  '/settlements/:settlementId/approve',
  body('notes').optional().isString(),
  SettlementCommissionController.approveSettlement
);

router.post(
  '/settlements/:settlementId/reject',
  body('reason').notEmpty(),
  SettlementCommissionController.rejectSettlement
);

router.post(
  '/settlements/:settlementId/process',
  SettlementCommissionController.processSettlement
);

router.get(
  '/settlements/user/:userId',
  SettlementCommissionController.getUserSettlements
);

router.get(
  '/settlements/user/:userId/stats',
  SettlementCommissionController.getSettlementStats
);

// ============= COMMISSION ROUTES =============

router.post(
  '/commissions',
  Phase12Validations.validateCommissionCreation(),
  SettlementCommissionController.createCommission
);

router.get('/commissions/:commissionId', SettlementCommissionController.getCommission);

router.post(
  '/commissions/:commissionId/approve',
  body('notes').optional().isString(),
  SettlementCommissionController.approveCommission
);

router.post(
  '/commissions/:commissionId/hold',
  body('reason').notEmpty(),
  body('holdDays').optional().isInt({ min: 1, max: 365 }),
  SettlementCommissionController.holdCommission
);

router.get(
  '/commissions/restaurant/:restaurantId',
  SettlementCommissionController.getRestaurantCommissions
);

router.get(
  '/commissions/restaurant/:restaurantId/stats',
  SettlementCommissionController.getRestaurantStats
);

module.exports = router;
