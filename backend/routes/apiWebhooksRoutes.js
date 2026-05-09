/**
 * apiWebhooksRoutes.js
 * Routes for webhooks, OpenAPI docs, partner integrations, marketplace sync
 */

const express = require('express');
const router = express.Router();
const APIWebhooksService = require('../services/APIWebhooksService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Webhook subscriptions
router.post('/webhooks', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { partnerId, eventType, webhookUrl } = req.body;
    const result = await APIWebhooksService.subscribeToWebhook(
      partnerId,
      eventType,
      webhookUrl
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/webhooks/:partnerId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await APIWebhooksService.getWebhooks(req.params.partnerId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Webhook event triggering (internal)
router.post('/webhooks/trigger', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { eventType, data } = req.body;
    const result = await APIWebhooksService.triggerWebhookEvent(
      eventType,
      data
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// API keys
router.post('/keys', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { partnerId, name } = req.body;
    const result = await APIWebhooksService.generateAPIKey(partnerId, name);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// OpenAPI documentation
router.get('/docs/openapi', async (req, res) => {
  try {
    const result = await APIWebhooksService.getOpenAPIDoc();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// API usage stats
router.get('/stats/:partnerId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await APIWebhooksService.getAPIUsageStats(
      req.params.partnerId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Marketplace integrations
router.post('/integrations', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await APIWebhooksService.createMarketplaceIntegration(
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/integrations/:integrationId/sync', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await APIWebhooksService.syncMarketplaceData(
      req.params.integrationId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
