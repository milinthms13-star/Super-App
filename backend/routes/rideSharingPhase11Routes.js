/**
 * rideSharingPhase11Routes.js
 * Phase 11 Routes: Payment Processing, Fraud Detection, Refunds, Analytics
 * 30+ endpoints consolidating all Phase 11 payment and compliance features
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');

// Services
const PaymentProcessingService = require('../services/ridesharing/PaymentProcessingService');
const FraudDetectionService = require('../services/ridesharing/FraudDetectionService');
const RefundManagementService = require('../services/ridesharing/RefundManagementService');
const PaymentAnalyticsService = require('../services/ridesharing/PaymentAnalyticsService');

// ===================== PAYMENT PROCESSING (11 endpoints) =====================

// Initialize payment method
router.post('/payment/initialize', auth, async (req, res) => {
  try {
    const result = await PaymentProcessingService.initializePaymentMethod(req.user.id, req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Process payment
router.post('/payment/process', auth, async (req, res) => {
  try {
    const result = await PaymentProcessingService.processPayment(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Setup recurring billing
router.post('/payment/recurring/setup', auth, async (req, res) => {
  try {
    const result = await PaymentProcessingService.setupRecurringBilling(req.user.id, req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Process recurring payment
router.post('/payment/recurring/:recurringId/process', auth, async (req, res) => {
  try {
    const result = await PaymentProcessingService.processRecurringPayment(req.params.recurringId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get payment method
router.get('/payment/method/:paymentMethodId', auth, async (req, res) => {
  try {
    const result = await PaymentProcessingService.getPaymentMethod(req.params.paymentMethodId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// List payment methods
router.get('/payment/methods', auth, async (req, res) => {
  try {
    const result = await PaymentProcessingService.listPaymentMethods(req.user.id, req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete payment method
router.delete('/payment/method/:paymentMethodId', auth, async (req, res) => {
  try {
    const result = await PaymentProcessingService.deletePaymentMethod(req.params.paymentMethodId, req.user.id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get transaction history
router.get('/payment/transactions', auth, async (req, res) => {
  try {
    const result = await PaymentProcessingService.getTransactionHistory(req.user.id, req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get transaction details
router.get('/payment/transaction/:transactionId', auth, async (req, res) => {
  try {
    const result = await PaymentProcessingService.getTransactionDetails(req.params.transactionId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate invoice
router.post('/payment/invoice', auth, async (req, res) => {
  try {
    const result = await PaymentProcessingService.generateInvoice(req.body.transactionId, req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Set default payment method
router.post('/payment/method/:paymentMethodId/default', auth, async (req, res) => {
  try {
    const result = await PaymentProcessingService.setDefaultPaymentMethod(req.user.id, req.params.paymentMethodId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================== FRAUD DETECTION (8 endpoints) =====================

// Monitor transaction
router.post('/fraud/monitor', auth, async (req, res) => {
  try {
    const result = await FraudDetectionService.monitorTransaction(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Report fraud
router.post('/fraud/report', auth, async (req, res) => {
  try {
    const result = await FraudDetectionService.reportFraud(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user fraud risk assessment
router.get('/fraud/risk-assessment', auth, async (req, res) => {
  try {
    const result = await FraudDetectionService.getUserFraudRiskAssessment(req.user.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Handle chargeback
router.post('/fraud/chargeback', auth, async (req, res) => {
  try {
    const result = await FraudDetectionService.handleChargeback(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add to blacklist (admin)
router.post('/fraud/blacklist', async (req, res) => {
  try {
    const result = await FraudDetectionService.addToBlacklist(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add to whitelist (admin)
router.post('/fraud/whitelist', async (req, res) => {
  try {
    const result = await FraudDetectionService.addToWhitelist(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get fraud statistics (admin)
router.get('/fraud/statistics', async (req, res) => {
  try {
    const result = await FraudDetectionService.getFraudStatistics(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================== REFUND MANAGEMENT (9 endpoints) =====================

// Process refund
router.post('/refund/process', auth, async (req, res) => {
  try {
    const result = await RefundManagementService.processRefund(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get refund status
router.get('/refund/:refundId', auth, async (req, res) => {
  try {
    const result = await RefundManagementService.getRefundStatus(req.params.refundId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get refund history
router.get('/refund/history', auth, async (req, res) => {
  try {
    const result = await RefundManagementService.getUserRefundHistory(req.user.id, req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create return policy (admin)
router.post('/refund/policy/create', async (req, res) => {
  try {
    const result = await RefundManagementService.createReturnPolicy(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get return policy
router.get('/refund/policy/:serviceType', async (req, res) => {
  try {
    const result = await RefundManagementService.getReturnPolicy(req.params.serviceType, req.query);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Process exchange
router.post('/refund/exchange', auth, async (req, res) => {
  try {
    const result = await RefundManagementService.processExchange(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Initiate chargeback response
router.post('/refund/chargeback/respond', auth, async (req, res) => {
  try {
    const result = await RefundManagementService.initiateChargebackResponse(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit chargeback response
router.post('/refund/chargeback/:responseId/submit', auth, async (req, res) => {
  try {
    const result = await RefundManagementService.submitChargebackResponse(req.params.responseId, req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get refund analytics (admin)
router.get('/refund/analytics', async (req, res) => {
  try {
    const result = await RefundManagementService.getRefundAnalytics(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===================== PAYMENT ANALYTICS (6 endpoints) =====================

// Get transaction analytics
router.get('/analytics/transactions', async (req, res) => {
  try {
    const result = await PaymentAnalyticsService.getTransactionAnalytics(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get revenue report
router.get('/analytics/revenue', async (req, res) => {
  try {
    const result = await PaymentAnalyticsService.getRevenueReport(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get payment method analysis
router.get('/analytics/payment-methods', async (req, res) => {
  try {
    const result = await PaymentAnalyticsService.getPaymentMethodAnalysis(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get conversion metrics
router.get('/analytics/conversion', async (req, res) => {
  try {
    const result = await PaymentAnalyticsService.getConversionMetrics(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get payment trends
router.get('/analytics/trends', async (req, res) => {
  try {
    const result = await PaymentAnalyticsService.getPaymentTrends(req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export analytics report
router.get('/analytics/export/:reportType', async (req, res) => {
  try {
    const result = await PaymentAnalyticsService.exportAnalyticsReport(req.params.reportType, req.query);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
