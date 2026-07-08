const express = require('express');
const router = express.Router();
const webhookService = require('../services/webhookService');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/webhooks/test
 * @desc    Test webhook delivery
 * @access  Private
 */
router.post('/test', authenticate, async (req, res) => {
  try {
    const { url, secret, method = 'POST', headers = {} } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Webhook URL is required'
      });
    }

    const testPayload = {
      test: true,
      message: 'This is a test webhook from MalabarBazaar Business Builder',
      timestamp: new Date().toISOString()
    };

    const webhookConfig = {
      url,
      secret,
      method,
      headers,
      enableRetry: false
    };

    const result = await webhookService.sendWebhook(
      webhookConfig,
      testPayload,
      {
        eventType: 'webhook.test',
        webhookId: 'test'
      }
    );

    res.json({
      success: result.success,
      message: result.success ? 'Webhook test successful' : 'Webhook test failed',
      data: {
        deliveryId: result.deliveryId,
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        errorMessage: result.errorMessage
      }
    });
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to test webhook'
    });
  }
});

/**
 * @route   POST /api/webhooks/trigger/business
 * @desc    Manually trigger business webhook
 * @access  Private
 */
router.post('/trigger/business', authenticate, async (req, res) => {
  try {
    const { eventType, businessData, webhooks } = req.body;

    if (!eventType || !businessData) {
      return res.status(400).json({
        success: false,
        message: 'Event type and business data are required'
      });
    }

    if (!webhooks || webhooks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one webhook configuration is required'
      });
    }

    const result = await webhookService.triggerBusinessWebhook(
      eventType,
      businessData,
      webhooks
    );

    res.json({
      success: true,
      message: 'Business webhook triggered',
      data: result
    });
  } catch (error) {
    console.error('Error triggering business webhook:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to trigger webhook'
    });
  }
});

/**
 * @route   POST /api/webhooks/trigger/miniapp
 * @desc    Manually trigger mini app webhook
 * @access  Private
 */
router.post('/trigger/miniapp', authenticate, async (req, res) => {
  try {
    const { eventType, miniAppData, webhooks } = req.body;

    if (!eventType || !miniAppData) {
      return res.status(400).json({
        success: false,
        message: 'Event type and mini app data are required'
      });
    }

    if (!webhooks || webhooks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one webhook configuration is required'
      });
    }

    const result = await webhookService.triggerMiniAppWebhook(
      eventType,
      miniAppData,
      webhooks
    );

    res.json({
      success: true,
      message: 'Mini app webhook triggered',
      data: result
    });
  } catch (error) {
    console.error('Error triggering mini app webhook:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to trigger webhook'
    });
  }
});

/**
 * @route   POST /api/webhooks/trigger/order
 * @desc    Manually trigger order webhook
 * @access  Private
 */
router.post('/trigger/order', authenticate, async (req, res) => {
  try {
    const { eventType, orderData, webhooks } = req.body;

    if (!eventType || !orderData) {
      return res.status(400).json({
        success: false,
        message: 'Event type and order data are required'
      });
    }

    if (!webhooks || webhooks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one webhook configuration is required'
      });
    }

    const result = await webhookService.triggerOrderWebhook(
      eventType,
      orderData,
      webhooks
    );

    res.json({
      success: true,
      message: 'Order webhook triggered',
      data: result
    });
  } catch (error) {
    console.error('Error triggering order webhook:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to trigger webhook'
    });
  }
});

/**
 * @route   POST /api/webhooks/verify-signature
 * @desc    Verify webhook signature
 * @access  Private
 */
router.post('/verify-signature', authenticate, async (req, res) => {
  try {
    const { payload, signature, secret } = req.body;

    if (!payload || !signature || !secret) {
      return res.status(400).json({
        success: false,
        message: 'Payload, signature, and secret are required'
      });
    }

    const isValid = webhookService.verifySignature(payload, signature, secret);

    res.json({
      success: true,
      message: isValid ? 'Signature is valid' : 'Signature is invalid',
      data: { isValid }
    });
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify signature'
    });
  }
});

/**
 * @route   GET /api/webhooks/stats/:webhookId
 * @desc    Get webhook delivery statistics
 * @access  Private
 */
router.get('/stats/:webhookId', authenticate, async (req, res) => {
  try {
    const { webhookId } = req.params;
    const { startDate, endDate } = req.query;

    const stats = await webhookService.getWebhookStats(webhookId, {
      startDate,
      endDate
    });

    res.json({
      success: true,
      message: 'Webhook statistics retrieved',
      data: stats
    });
  } catch (error) {
    console.error('Error fetching webhook stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch webhook statistics'
    });
  }
});

/**
 * @route   POST /api/webhooks/retry/:deliveryId
 * @desc    Manually retry failed webhook delivery
 * @access  Private
 */
router.post('/retry/:deliveryId', authenticate, async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const result = await webhookService.retryWebhookDelivery(deliveryId);

    res.json({
      success: true,
      message: 'Webhook retry initiated',
      data: result
    });
  } catch (error) {
    console.error('Error retrying webhook:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retry webhook'
    });
  }
});

/**
 * @route   DELETE /api/webhooks/retry/:deliveryId
 * @desc    Cancel scheduled webhook retries
 * @access  Private
 */
router.delete('/retry/:deliveryId', authenticate, async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const result = await webhookService.cancelWebhookRetries(deliveryId);

    res.json({
      success: true,
      message: 'Webhook retries cancelled',
      data: result
    });
  } catch (error) {
    console.error('Error cancelling webhook retries:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel webhook retries'
    });
  }
});

/**
 * @route   POST /api/webhooks/generate-signature
 * @desc    Generate webhook signature for testing
 * @access  Private
 */
router.post('/generate-signature', authenticate, async (req, res) => {
  try {
    const { payload, secret } = req.body;

    if (!payload || !secret) {
      return res.status(400).json({
        success: false,
        message: 'Payload and secret are required'
      });
    }

    const signature = webhookService.generateSignature(payload, secret);

    res.json({
      success: true,
      message: 'Signature generated',
      data: { signature }
    });
  } catch (error) {
    console.error('Error generating signature:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate signature'
    });
  }
});

module.exports = router;
