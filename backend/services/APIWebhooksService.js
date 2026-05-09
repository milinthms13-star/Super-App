/**
 * APIWebhooksService.js
 * Webhooks, API documentation, partner integrations, events
 */

const logger = require('../config/logger');

class APIWebhooksService {
  /**
   * Create webhook subscription
   */
  static async subscribeToWebhook(partnerId, eventType, webhookUrl) {
    try {
      const Webhook = require('../models/Webhook');

      const webhook = new Webhook({
        partnerId,
        eventType, // order.created, order.updated, product.created, etc.
        webhookUrl,
        active: true,
        secret: this._generateSecret(),
        deliveryAttempts: 0,
        lastDelivery: null,
        createdAt: new Date(),
      });

      await webhook.save();

      logger.info(`Webhook subscription created for ${eventType}`);

      return {
        success: true,
        data: webhook,
        message: 'Webhook subscribed',
      };
    } catch (error) {
      logger.error('Error subscribing to webhook:', error);
      throw error;
    }
  }

  /**
   * Get webhook subscriptions
   */
  static async getWebhooks(partnerId) {
    try {
      const Webhook = require('../models/Webhook');

      const webhooks = await Webhook.find({ partnerId }).lean();

      return {
        webhooks,
        total: webhooks.length,
      };
    } catch (error) {
      logger.error('Error getting webhooks:', error);
      throw error;
    }
  }

  /**
   * Trigger webhook event
   */
  static async triggerWebhookEvent(eventType, data) {
    try {
      const Webhook = require('../models/Webhook');
      const WebhookLog = require('../models/WebhookLog');

      const webhooks = await Webhook.find({ eventType, active: true });

      const results = await Promise.all(
        webhooks.map(async webhook => {
          try {
            // Mock webhook delivery
            const payload = {
              event: eventType,
              timestamp: new Date(),
              data,
            };

            const signature = this._generateSignature(
              webhook.secret,
              JSON.stringify(payload)
            );

            const log = new WebhookLog({
              webhookId: webhook._id,
              eventType,
              payload,
              status: 'delivered',
              statusCode: 200,
              deliveredAt: new Date(),
            });

            await log.save();

            webhook.lastDelivery = new Date();
            webhook.deliveryAttempts = (webhook.deliveryAttempts || 0) + 1;
            await webhook.save();

            logger.info(`Webhook delivered: ${eventType} to ${webhook.webhookUrl}`);

            return { success: true, webhookId: webhook._id };
          } catch (error) {
            logger.error(`Error delivering webhook: ${error.message}`);
            return { success: false, error: error.message };
          }
        })
      );

      return {
        eventType,
        delivered: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      };
    } catch (error) {
      logger.error('Error triggering webhook event:', error);
      throw error;
    }
  }

  /**
   * Create API key for partner
   */
  static async generateAPIKey(partnerId, name) {
    try {
      const APIKey = require('../models/APIKey');

      const key = new APIKey({
        partnerId,
        name,
        key: this._generateAPIKey(),
        secret: this._generateSecret(),
        active: true,
        lastUsed: null,
        rateLimit: 1000, // per hour
        createdAt: new Date(),
      });

      await key.save();

      logger.info(`API key generated for partner ${partnerId}`);

      return {
        success: true,
        data: {
          key: key.key,
          secret: key.secret,
          name: key.name,
        },
        message: 'API key created',
      };
    } catch (error) {
      logger.error('Error generating API key:', error);
      throw error;
    }
  }

  /**
   * Get OpenAPI documentation
   */
  static async getOpenAPIDoc() {
    try {
      const doc = {
        openapi: '3.0.0',
        info: {
          title: 'MalaBarbazaar API',
          description: 'Comprehensive e-commerce API with order management, products, users, and more',
          version: '1.0.0',
        },
        servers: [
          { url: process.env.API_URL || 'https://api.malabarbazaar.com' },
        ],
        paths: {
          '/api/ecommerce/products': {
            get: {
              summary: 'List products',
              parameters: [
                { name: 'page', in: 'query', schema: { type: 'integer' } },
                { name: 'limit', in: 'query', schema: { type: 'integer' } },
              ],
              responses: {
                200: { description: 'Success' },
              },
            },
          },
          '/api/ecommerce/orders': {
            post: {
              summary: 'Create order',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: { type: 'object' },
                  },
                },
              },
              responses: {
                201: { description: 'Order created' },
              },
            },
          },
        },
      };

      return doc;
    } catch (error) {
      logger.error('Error getting OpenAPI doc:', error);
      throw error;
    }
  }

  /**
   * Get API usage stats
   */
  static async getAPIUsageStats(partnerId) {
    try {
      const WebhookLog = require('../models/WebhookLog');

      const stats = await WebhookLog.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            totalEvents: { $sum: 1 },
            successCount: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            failureCount: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          },
        },
        { $sort: { _id: -1 } },
      ]);

      return {
        period: '30 days',
        stats,
      };
    } catch (error) {
      logger.error('Error getting API usage stats:', error);
      throw error;
    }
  }

  /**
   * Create marketplace integration
   */
  static async createMarketplaceIntegration(integrationData) {
    try {
      const Integration = require('../models/Integration');

      const integration = new Integration({
        name: integrationData.name,
        platform: integrationData.platform, // shopify, amazon, ebay, etc.
        apiKey: integrationData.apiKey,
        apiSecret: integrationData.apiSecret,
        status: 'active',
        syncSettings: integrationData.syncSettings || {
          syncProducts: true,
          syncOrders: true,
          syncInventory: true,
        },
        lastSync: null,
        createdAt: new Date(),
      });

      await integration.save();

      logger.info(`Marketplace integration created: ${integrationData.platform}`);

      return {
        success: true,
        data: integration,
        message: 'Integration created',
      };
    } catch (error) {
      logger.error('Error creating integration:', error);
      throw error;
    }
  }

  /**
   * Sync marketplace data
   */
  static async syncMarketplaceData(integrationId) {
    try {
      const Integration = require('../models/Integration');

      const integration = await Integration.findById(integrationId);
      if (!integration) throw new Error('Integration not found');

      // Mock sync operation
      const syncResult = {
        productsSynced: Math.floor(Math.random() * 1000),
        ordersSynced: Math.floor(Math.random() * 500),
        inventoryUpdated: Math.floor(Math.random() * 800),
      };

      integration.lastSync = new Date();
      await integration.save();

      logger.info(`Marketplace sync completed for ${integration.platform}`);

      return {
        success: true,
        data: syncResult,
      };
    } catch (error) {
      logger.error('Error syncing marketplace data:', error);
      throw error;
    }
  }

  /**
   * Generate signature for webhook
   */
  static _generateSignature(secret, payload) {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Generate secret
   */
  static _generateSecret() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate API key
   */
  static _generateAPIKey() {
    const crypto = require('crypto');
    return `sk_${crypto.randomBytes(16).toString('hex')}`;
  }
}

module.exports = APIWebhooksService;
