/**
 * paymentMethodRoutes.js
 * Payment method management endpoints
 */

const express = require('express');
const router = express.Router();
const PaymentMethodService = require('../services/PaymentMethodService');
const { verifyToken } = require('../middleware/auth');

// Middleware
const validatePaymentMethod = (req, res, next) => {
  try {
    PaymentMethodService.validatePaymentData(req.body);
    next();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/user/payment-methods - Get all payment methods
router.get('/', verifyToken, async (req, res) => {
  try {
    const methods = await PaymentMethodService.getPaymentMethods(req.user.id);
    res.json({ success: true, data: methods });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/payment-methods - Add payment method
router.post('/', verifyToken, validatePaymentMethod, async (req, res) => {
  try {
    const method = await PaymentMethodService.addPaymentMethod(req.user.id, req.body);
    res.status(201).json({ success: true, data: method });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/user/payment-methods/:methodId - Get payment method by ID
router.get('/:methodId', verifyToken, async (req, res) => {
  try {
    const method = await PaymentMethodService.getPaymentMethodById(req.user.id, req.params.methodId);
    res.json({ success: true, data: method });
  } catch (err) {
    res.status(404).json({ error: 'Payment method not found' });
  }
});

// DELETE /api/user/payment-methods/:methodId - Delete payment method
router.delete('/:methodId', verifyToken, async (req, res) => {
  try {
    const result = await PaymentMethodService.deletePaymentMethod(req.user.id, req.params.methodId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/payment-methods/:methodId/default - Set as default
router.post('/:methodId/default', verifyToken, async (req, res) => {
  try {
    const method = await PaymentMethodService.setDefaultPaymentMethod(
      req.user.id,
      req.params.methodId
    );
    res.json({ success: true, data: method });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/user/payment-methods/default/:type - Get default by type
router.get('/default/:type', verifyToken, async (req, res) => {
  try {
    const method = await PaymentMethodService.getDefaultPaymentMethod(
      req.user.id,
      req.params.type
    );

    if (!method) {
      return res.status(404).json({ error: 'No default payment method' });
    }

    res.json({ success: true, data: method });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/user/payment-methods/type/:type - Get methods by type
router.get('/type/:type', verifyToken, async (req, res) => {
  try {
    const methods = await PaymentMethodService.getMethodsByType(req.user.id, req.params.type);
    res.json({ success: true, data: methods });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/payment-methods/:methodId/verify - Generate verification code
router.post('/:methodId/verify', verifyToken, async (req, res) => {
  try {
    const result = await PaymentMethodService.generateVerificationCode(
      req.user.id,
      req.params.methodId
    );

    if (process.env.NODE_ENV === 'development') {
      result.code; // Log for testing
    }

    res.json({
      success: true,
      data: {
        message: 'Verification code sent',
        expiresAt: result.expiresAt
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/payment-methods/:methodId/confirm - Confirm verification
router.post('/:methodId/confirm', verifyToken, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    const method = await PaymentMethodService.verifyPaymentMethod(
      req.user.id,
      req.params.methodId,
      code
    );

    res.json({ success: true, data: method });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/payment-methods/:methodId/check-fraud - Check fraud
router.post('/:methodId/check-fraud', verifyToken, async (req, res) => {
  try {
    const { transactionAmount } = req.body;

    if (!transactionAmount) {
      return res.status(400).json({ error: 'Transaction amount required' });
    }

    const fraud = await PaymentMethodService.checkFraud(
      req.user.id,
      req.params.methodId,
      transactionAmount,
      req.ip
    );

    res.json({ success: true, data: fraud });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
