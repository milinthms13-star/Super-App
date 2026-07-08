/**
 * Payment Webhook Routes
 * Handles Razorpay webhook events
 */

const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');

/**
 * POST /api/matrimonial/webhooks/razorpay
 * Razorpay webhook endpoint
 */
router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    
    if (!signature) {
      logger.warn('Webhook received without signature');
      return res.status(400).json({
        success: false,
        message: 'Missing signature'
      });
    }

    // Parse body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // Verify webhook signature
    const isValid = paymentService.verifyWebhookSignature(body, signature);
    
    if (!isValid) {
      logger.warn('Invalid webhook signature');
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Extract event and payload
    const { event, payload } = body;
    
    logger.info(`Webhook received: ${event}`);

    // Process webhook asynchronously
    setImmediate(async () => {
      try {
        await paymentService.processWebhook(event, payload);
      } catch (error) {
        logger.error(`Error processing webhook ${event}:`, error);
      }
    });

    // Respond immediately
    res.status(200).json({
      success: true,
      message: 'Webhook received'
    });

  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

/**
 * POST /api/matrimonial/webhooks/razorpay/test
 * Test webhook endpoint (development only)
 */
router.post('/razorpay/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Test endpoint not available in production'
    });
  }

  try {
    const { event, payload } = req.body;

    await paymentService.processWebhook(event, payload);

    res.json({
      success: true,
      message: 'Test webhook processed'
    });
  } catch (error) {
    logger.error('Test webhook error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
