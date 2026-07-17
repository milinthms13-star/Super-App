const express = require('express');
const router = express.Router();
const paymentService = require('../services/PaymentService');
const auditLogService = require('../services/auditLogService');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/payments/orders
 * @desc    Create a payment order
 * @access  Private
 */
router.post('/orders', authenticate, async (req, res) => {
  try {
    const {
      amount,
      currency,
      receipt,
      notes,
      businessId,
      orderId
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    const order = await paymentService.createOrder({
      amount,
      currency,
      receipt,
      notes,
      businessId,
      orderId
    });

    // Log the action
    await auditLogService.log({
      userId: req.user.id,
      action: 'order.create',
      resourceType: 'Order',
      resourceId: order.id,
      resourceName: order.receipt,
      metadata: {
        amount,
        currency,
        ip: req.ip,
        userAgent: req.get('user-agent')
      },
      businessId
    });

    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment order'
    });
  }
});

/**
 * @route   POST /api/payments/verify
 * @desc    Verify payment signature
 * @access  Private
 */
router.post('/verify', authenticate, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification data'
      });
    }

    const isValid = paymentService.verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (isValid) {
      // Log successful payment
      await auditLogService.log({
        userId: req.user.id,
        action: 'invoice.pay',
        resourceType: 'Order',
        resourceId: razorpay_order_id,
        metadata: {
          paymentId: razorpay_payment_id,
          ip: req.ip,
          userAgent: req.get('user-agent')
        },
        success: true
      });
    }

    res.json({
      success: true,
      message: isValid ? 'Payment verified successfully' : 'Payment verification failed',
      data: {
        verified: isValid,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      }
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment'
    });
  }
});

/**
 * @route   POST /api/payments/capture/:paymentId
 * @desc    Capture a payment
 * @access  Private
 */
router.post('/capture/:paymentId', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, currency } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    const payment = await paymentService.capturePayment(
      paymentId,
      amount,
      currency
    );

    res.json({
      success: true,
      message: 'Payment captured successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error capturing payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to capture payment'
    });
  }
});

/**
 * @route   GET /api/payments/:paymentId
 * @desc    Get payment details
 * @access  Private
 */
router.get('/:paymentId', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await paymentService.getPayment(paymentId);

    res.json({
      success: true,
      message: 'Payment details retrieved successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payment details'
    });
  }
});

/**
 * @route   POST /api/payments/refund/:paymentId
 * @desc    Refund a payment
 * @access  Private
 */
router.post('/refund/:paymentId', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, notes, speed } = req.body;

    const refund = await paymentService.refundPayment(paymentId, {
      amount,
      notes,
      speed
    });

    // Log the refund
    await auditLogService.log({
      userId: req.user.id,
      action: 'order.update',
      resourceType: 'Order',
      resourceId: paymentId,
      metadata: {
        refundId: refund.id,
        amount: refund.amount,
        ip: req.ip,
        userAgent: req.get('user-agent')
      },
      severity: 'warning'
    });

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      data: refund
    });
  } catch (error) {
    console.error('Error refunding payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to refund payment'
    });
  }
});

/**
 * @route   GET /api/payments/:paymentId/refunds
 * @desc    Get all refunds for a payment
 * @access  Private
 */
router.get('/:paymentId/refunds', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const refunds = await paymentService.getRefunds(paymentId);

    res.json({
      success: true,
      message: 'Refunds retrieved successfully',
      data: refunds
    });
  } catch (error) {
    console.error('Error fetching refunds:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch refunds'
    });
  }
});

/**
 * @route   POST /api/payments/links
 * @desc    Create a payment link
 * @access  Private
 */
router.post('/links', authenticate, async (req, res) => {
  try {
    const {
      amount,
      currency,
      description,
      customer,
      notify,
      reminder_enable,
      notes,
      callback_url,
      callback_method,
      expire_by
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      });
    }

    const paymentLink = await paymentService.createPaymentLink({
      amount,
      currency,
      description,
      customer,
      notify,
      reminder_enable,
      notes,
      callback_url,
      callback_method,
      expire_by
    });

    res.status(201).json({
      success: true,
      message: 'Payment link created successfully',
      data: paymentLink
    });
  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment link'
    });
  }
});

/**
 * @route   POST /api/payments/links/:linkId/cancel
 * @desc    Cancel a payment link
 * @access  Private
 */
router.post('/links/:linkId/cancel', authenticate, async (req, res) => {
  try {
    const { linkId } = req.params;

    const result = await paymentService.cancelPaymentLink(linkId);

    res.json({
      success: true,
      message: 'Payment link cancelled successfully',
      data: result
    });
  } catch (error) {
    console.error('Error cancelling payment link:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel payment link'
    });
  }
});

/**
 * @route   POST /api/payments/subscriptions
 * @desc    Create a subscription
 * @access  Private
 */
router.post('/subscriptions', authenticate, async (req, res) => {
  try {
    const {
      planId,
      customerId,
      quantity,
      totalCount,
      startAt,
      expireBy,
      addons,
      notes,
      notify
    } = req.body;

    if (!planId || !customerId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID and Customer ID are required'
      });
    }

    const subscription = await paymentService.createSubscription({
      planId,
      customerId,
      quantity,
      totalCount,
      startAt,
      expireBy,
      addons,
      notes,
      notify
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create subscription'
    });
  }
});

/**
 * @route   POST /api/payments/subscriptions/:subscriptionId/cancel
 * @desc    Cancel a subscription
 * @access  Private
 */
router.post('/subscriptions/:subscriptionId/cancel', authenticate, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { cancelAtCycleEnd = false } = req.body;

    const result = await paymentService.cancelSubscription(
      subscriptionId,
      cancelAtCycleEnd
    );

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: result
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel subscription'
    });
  }
});

/**
 * @route   POST /api/payments/customers
 * @desc    Create a customer
 * @access  Private
 */
router.post('/customers', authenticate, async (req, res) => {
  try {
    const {
      name,
      email,
      contact,
      failExisting,
      gstin,
      notes
    } = req.body;

    if (!name || !email || !contact) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and contact are required'
      });
    }

    const customer = await paymentService.createCustomer({
      name,
      email,
      contact,
      failExisting,
      gstin,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create customer'
    });
  }
});

/**
 * @route   POST /api/payments/checkout-config
 * @desc    Generate Razorpay checkout configuration
 * @access  Private
 */
router.post('/checkout-config', authenticate, async (req, res) => {
  try {
    const config = paymentService.generateCheckoutConfig(req.body);

    res.json({
      success: true,
      message: 'Checkout configuration generated',
      data: config
    });
  } catch (error) {
    console.error('Error generating checkout config:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate checkout configuration'
    });
  }
});

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Razorpay webhooks
 * @access  Public (but verified)
 */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return res.status(400).json({
        success: false,
        message: 'Missing webhook signature or secret'
      });
    }

    const body = JSON.stringify(req.body);
    const isValid = paymentService.verifyWebhookSignature(
      body,
      signature,
      webhookSecret
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    // Process webhook event
    const event = req.body.event;
    const payload = req.body.payload;

    console.log('Razorpay Webhook Event:', event);
    console.log('Payload:', payload);

    // Handle different webhook events
    switch (event) {
      case 'payment.authorized':
        // Handle payment authorized
        break;
      case 'payment.captured':
        // Handle payment captured
        break;
      case 'payment.failed':
        // Handle payment failed
        break;
      case 'order.paid':
        // Handle order paid
        break;
      case 'refund.created':
        // Handle refund created
        break;
      case 'subscription.charged':
        // Handle subscription charged
        break;
      default:
        console.log('Unhandled webhook event:', event);
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process webhook'
    });
  }
});

/**
 * @route   GET /api/payments/analytics
 * @desc    Get payment analytics
 * @access  Private
 */
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const filters = req.query;

    const analytics = await paymentService.getPaymentAnalytics(filters);

    res.json({
      success: true,
      message: 'Payment analytics retrieved successfully',
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payment analytics'
    });
  }
});

module.exports = router;
