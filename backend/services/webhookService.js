const axios = require('axios');
const crypto = require('crypto');

class WebhookService {
  constructor() {
    this.maxRetries = 5;
    this.retryDelays = [1000, 5000, 15000, 60000, 300000]; // 1s, 5s, 15s, 1m, 5m
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Generate webhook signature for verification
   * @param {Object} payload - Webhook payload
   * @param {string} secret - Webhook secret
   * @returns {string} HMAC signature
   */
  generateSignature(payload, secret) {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Send webhook with retry logic
   * @param {Object} webhookConfig - Webhook configuration
   * @param {Object} payload - Data to send
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Webhook delivery result
   */
  async sendWebhook(webhookConfig, payload, options = {}) {
    const {
      url,
      secret,
      headers = {},
      method = 'POST',
      enableRetry = true
    } = webhookConfig;

    const {
      retryAttempt = 0,
      webhookId,
      eventType
    } = options;

    const deliveryId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Prepare webhook payload with metadata
    const webhookPayload = {
      id: deliveryId,
      timestamp,
      eventType: eventType || 'business_builder.event',
      attemptNumber: retryAttempt + 1,
      data: payload
    };

    // Generate signature if secret is provided
    const signature = secret ? this.generateSignature(webhookPayload, secret) : null;

    // Prepare headers
    const requestHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'MalabarBazaar-Webhook/1.0',
      'X-Webhook-Id': deliveryId,
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Attempt': retryAttempt + 1,
      ...headers
    };

    if (signature) {
      requestHeaders['X-Webhook-Signature'] = signature;
    }

    const startTime = Date.now();
    let response = null;
    let error = null;
    let success = false;

    try {
      response = await axios({
        url,
        method,
        headers: requestHeaders,
        data: webhookPayload,
        timeout: this.timeout,
        validateStatus: (status) => status >= 200 && status < 300
      });

      success = true;
    } catch (err) {
      error = err;
      success = false;
    }

    const duration = Date.now() - startTime;

    // Create delivery log
    const deliveryLog = {
      deliveryId,
      webhookId,
      url,
      eventType,
      attemptNumber: retryAttempt + 1,
      success,
      statusCode: response?.status || error?.response?.status || null,
      responseTime: duration,
      timestamp: new Date(timestamp),
      requestPayload: webhookPayload,
      requestHeaders,
      responseData: success ? response?.data : null,
      errorMessage: error ? error.message : null,
      errorDetails: error?.response?.data || null
    };

    // If failed and retries enabled, schedule retry
    if (!success && enableRetry && retryAttempt < this.maxRetries) {
      const nextRetryDelay = this.retryDelays[retryAttempt];
      
      // Schedule retry (in production, use a job queue like Bull)
      setTimeout(async () => {
        try {
          await this.sendWebhook(
            webhookConfig,
            payload,
            {
              ...options,
              retryAttempt: retryAttempt + 1
            }
          );
        } catch (retryError) {
          console.error('Webhook retry failed:', retryError);
        }
      }, nextRetryDelay);

      deliveryLog.nextRetryAt = new Date(Date.now() + nextRetryDelay);
      deliveryLog.willRetry = true;
    } else {
      deliveryLog.willRetry = false;
    }

    // Save delivery log to database
    await this.saveDeliveryLog(deliveryLog);

    return deliveryLog;
  }

  /**
   * Send multiple webhooks in parallel
   * @param {Array} webhookConfigs - Array of webhook configurations
   * @param {Object} payload - Data to send
   * @returns {Promise<Array>} Array of delivery results
   */
  async sendWebhooks(webhookConfigs, payload, options = {}) {
    const deliveries = webhookConfigs.map(config => 
      this.sendWebhook(config, payload, options)
    );

    return await Promise.allSettled(deliveries);
  }

  /**
   * Save webhook delivery log to database
   * @param {Object} deliveryLog - Delivery log data
   */
  async saveDeliveryLog(deliveryLog) {
    try {
      // In production, save to a WebhookDeliveryLog model
      // For now, just log to console
      console.log('Webhook Delivery Log:', {
        id: deliveryLog.deliveryId,
        url: deliveryLog.url,
        success: deliveryLog.success,
        attempt: deliveryLog.attemptNumber,
        statusCode: deliveryLog.statusCode,
        responseTime: `${deliveryLog.responseTime}ms`,
        willRetry: deliveryLog.willRetry
      });

      // TODO: Implement database storage
      // await WebhookDeliveryLog.create(deliveryLog);
    } catch (error) {
      console.error('Error saving webhook delivery log:', error);
    }
  }

  /**
   * Trigger webhook for business events
   * @param {string} eventType - Event type
   * @param {Object} businessData - Business data
   * @param {Array} webhooks - Configured webhooks
   */
  async triggerBusinessWebhook(eventType, businessData, webhooks = []) {
    if (!webhooks || webhooks.length === 0) {
      return { message: 'No webhooks configured' };
    }

    const payload = {
      eventType,
      business: {
        id: businessData._id,
        name: businessData.name,
        industry: businessData.industry,
        userId: businessData.userId
      },
      timestamp: new Date().toISOString()
    };

    // Add event-specific data
    switch (eventType) {
      case 'business.created':
        payload.data = { business: businessData };
        break;
      case 'business.updated':
        payload.data = { business: businessData };
        break;
      case 'business.deleted':
        payload.data = { businessId: businessData._id };
        break;
      default:
        payload.data = businessData;
    }

    const results = await this.sendWebhooks(webhooks, payload, {
      eventType
    });

    return {
      eventType,
      webhooksTriggered: webhooks.length,
      results: results.map((result, index) => ({
        url: webhooks[index].url,
        success: result.status === 'fulfilled',
        error: result.reason?.message
      }))
    };
  }

  /**
   * Trigger webhook for mini app events
   * @param {string} eventType - Event type
   * @param {Object} miniAppData - Mini app data
   * @param {Array} webhooks - Configured webhooks
   */
  async triggerMiniAppWebhook(eventType, miniAppData, webhooks = []) {
    if (!webhooks || webhooks.length === 0) {
      return { message: 'No webhooks configured' };
    }

    const payload = {
      eventType,
      miniApp: {
        id: miniAppData._id,
        name: miniAppData.name,
        type: miniAppData.type,
        businessId: miniAppData.businessId
      },
      timestamp: new Date().toISOString(),
      data: miniAppData
    };

    const results = await this.sendWebhooks(webhooks, payload, {
      eventType
    });

    return {
      eventType,
      webhooksTriggered: webhooks.length,
      results: results.map((result, index) => ({
        url: webhooks[index].url,
        success: result.status === 'fulfilled',
        error: result.reason?.message
      }))
    };
  }

  /**
   * Trigger webhook for order events
   * @param {string} eventType - Event type
   * @param {Object} orderData - Order data
   * @param {Array} webhooks - Configured webhooks
   */
  async triggerOrderWebhook(eventType, orderData, webhooks = []) {
    if (!webhooks || webhooks.length === 0) {
      return { message: 'No webhooks configured' };
    }

    const payload = {
      eventType,
      order: {
        id: orderData._id,
        orderNumber: orderData.orderNumber,
        status: orderData.status,
        total: orderData.totalAmount,
        businessId: orderData.businessId
      },
      timestamp: new Date().toISOString(),
      data: orderData
    };

    const results = await this.sendWebhooks(webhooks, payload, {
      eventType
    });

    return {
      eventType,
      webhooksTriggered: webhooks.length,
      results: results.map((result, index) => ({
        url: webhooks[index].url,
        success: result.status === 'fulfilled',
        error: result.reason?.message
      }))
    };
  }

  /**
   * Verify webhook signature
   * @param {Object} payload - Received payload
   * @param {string} signature - Received signature
   * @param {string} secret - Webhook secret
   * @returns {boolean} Signature is valid
   */
  verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Get webhook delivery statistics
   * @param {string} webhookId - Webhook ID
   * @param {Object} dateRange - Date range for statistics
   * @returns {Promise<Object>} Webhook statistics
   */
  async getWebhookStats(webhookId, dateRange = {}) {
    // TODO: Implement with actual database queries
    return {
      webhookId,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageResponseTime: 0,
      successRate: 0,
      lastDeliveryAt: null,
      lastSuccessAt: null,
      lastFailureAt: null
    };
  }

  /**
   * Retry failed webhook delivery
   * @param {string} deliveryId - Delivery ID to retry
   * @returns {Promise<Object>} Retry result
   */
  async retryWebhookDelivery(deliveryId) {
    // TODO: Implement with actual database
    // 1. Find the failed delivery log
    // 2. Get the original webhook config and payload
    // 3. Retry the delivery
    throw new Error('Manual retry not yet implemented');
  }

  /**
   * Cancel scheduled webhook retries
   * @param {string} deliveryId - Delivery ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelWebhookRetries(deliveryId) {
    // TODO: Implement retry cancellation
    // This would require a job queue system
    throw new Error('Retry cancellation not yet implemented');
  }
}

module.exports = new WebhookService();
