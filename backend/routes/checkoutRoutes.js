/**
 * checkoutRoutes.js
 * Phase 5D - Checkout and payment orchestration endpoints
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const CheckoutService = require('../services/CheckoutService');
const InvoiceService = require('../services/InvoiceService');
const logger = require('../utils/logger');

// ============================================
// CART VALIDATION & CALCULATION
// ============================================

/**
 * POST /checkout/validate-cart
 * Validate cart items and calculate totals with taxes/delivery
 */
router.post('/validate-cart', verifyToken, async (req, res) => {
  try {
    const { items, couponCode } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const validation = await CheckoutService.validateCartAndCalculateTotals(
      req.user.id,
      items,
      couponCode
    );

    if (validation.errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
        validItems: validation.items,
      });
    }

    res.json({
      success: true,
      data: {
        items: validation.items,
        breakdown: {
          subtotal: validation.subtotal,
          taxes: validation.taxes,
          delivery: validation.deliveryFee,
          discount: validation.discounts,
          total: validation.total,
        },
        coupon: validation.appliedCoupon,
      },
    });
  } catch (err) {
    logger.error('Cart validation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ORDER CREATION
// ============================================

/**
 * POST /checkout/create-order
 * Create order and prepare for payment
 */
router.post('/create-order', verifyToken, async (req, res) => {
  try {
    const {
      items,
      deliveryAddress,
      paymentMethod,
      paymentGateway = 'razorpay',
      couponCode,
    } = req.body;

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    if (!deliveryAddress) {
      return res.status(400).json({ error: 'Delivery address is required' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    // Create order
    const orderResult = await CheckoutService.createOrder(req.user.id, {
      items,
      deliveryAddress,
      paymentMethod,
      paymentGateway,
      couponCode,
    });

    res.json({
      success: true,
      data: orderResult,
    });
  } catch (err) {
    logger.error('Order creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// PAYMENT INITIALIZATION
// ============================================

/**
 * POST /checkout/initialize-payment
 * Initialize payment with gateway (Razorpay/Stripe)
 */
router.post('/initialize-payment', verifyToken, async (req, res) => {
  try {
    const { orderId, gateway = 'razorpay' } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const paymentDetails = await CheckoutService.initializePayment(
      orderId,
      req.user.id,
      gateway
    );

    res.json({
      success: true,
      data: paymentDetails,
    });
  } catch (err) {
    logger.error('Payment initialization error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// PAYMENT VERIFICATION
// ============================================

/**
 * POST /checkout/verify-razorpay
 * Verify Razorpay payment after successful transaction
 */
router.post('/verify-razorpay', verifyToken, async (req, res) => {
  try {
    const { paymentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const result = await CheckoutService.verifyPayment(paymentId, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    res.json({
      success: true,
      data: result,
      message: 'Payment verified successfully',
    });
  } catch (err) {
    logger.error('Razorpay verification error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /checkout/verify-stripe
 * Verify Stripe payment after successful transaction
 */
router.post('/verify-stripe', verifyToken, async (req, res) => {
  try {
    const { paymentId, stripePaymentIntentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const result = await CheckoutService.verifyPayment(paymentId, {
      stripePaymentIntentId,
    });

    res.json({
      success: true,
      data: result,
      message: 'Payment verified successfully',
    });
  } catch (err) {
    logger.error('Stripe verification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// REFUNDS
// ============================================

/**
 * POST /checkout/:orderId/refund
 * Process refund for order
 */
router.post('/:orderId/refund', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const result = await CheckoutService.processRefund(
      orderId,
      reason || 'Customer requested refund'
    );

    res.json({
      success: true,
      data: result,
      message: 'Refund processed successfully',
    });
  } catch (err) {
    logger.error('Refund processing error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// INVOICES & RECEIPTS
// ============================================

/**
 * GET /checkout/:orderId/invoice
 * Generate and download invoice for order
 */
router.get('/:orderId/invoice', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { format = 'pdf' } = req.query;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const invoice = await InvoiceService.generateInvoice(orderId);

    if (format === 'json') {
      return res.json({
        success: true,
        data: invoice,
      });
    }

    // Generate PDF
    const pdfBuffer = await InvoiceService.generateInvoicePDF(invoice);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${orderId}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error('Invoice generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /checkout/:orderId/receipt
 * Get payment receipt for order
 */
router.get('/:orderId/receipt', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const receipt = await InvoiceService.generateReceipt(orderId);

    res.json({
      success: true,
      data: receipt,
    });
  } catch (err) {
    logger.error('Receipt generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// PAYMENT STATUS
// ============================================

/**
 * GET /checkout/:orderId/payment-status
 * Check payment status for order
 */
router.get('/:orderId/payment-status', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    // Find order
    const order = await require('../models/Order').findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    // Find payment
    const Payment = require('../models/Payment');
    const payment = await Payment.findOne({ orderId: order._id.toString() });
    let paymentStatus = payment ? payment.status : 'not_initiated';
    let paymentDetails = payment ? {
      paymentId: payment.paymentId || payment._id,
      status: payment.status,
      gateway: payment.paymentGateway,
      amount: payment.amount,
      transactionId: payment.transactionId || payment.gatewayTransactionId,
      refund: payment.refund || null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    } : null;
    res.json({
      success: true,
      data: {
        orderId: order._id,
        orderStatus: order.status,
        paymentStatus,
        paymentDetails,
      },
    });
  } catch (err) {
    logger.error('Payment status error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
