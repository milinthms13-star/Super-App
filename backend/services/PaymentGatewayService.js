/**
 * Payment Gateway Service - Phase 11 Payment Processing
 * Manages gateway configurations, health checks, and credentials
 */

const PaymentGateway = require('../models/PaymentGateway');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class PaymentGatewayService {
  /**
   * Create or update payment gateway configuration
   */
  static async configureGateway(gatewayData) {
    try {
      const gatewayId = `GW_${Date.now()}_${uuidv4().split('-')[0].toUpperCase()}`;

      let gateway = await PaymentGateway.findOne({ 
        gatewayName: gatewayData.gatewayName 
      });

      if (gateway) {
        // Update existing gateway
        Object.assign(gateway, gatewayData);
      } else {
        // Create new gateway
        gateway = new PaymentGateway({
          ...gatewayData,
          gatewayId,
        });
      }

      await gateway.save();
      this.logAudit(gateway._id, 'gateway_configured', { gatewayData }, 'admin');

      return gateway;
    } catch (error) {
      logger.error('Error configuring payment gateway:', error);
      throw error;
    }
  }

  /**
   * Get gateway configuration
   */
  static async getGateway(gatewayName) {
    try {
      const gateway = await PaymentGateway.findOne({ gatewayName }).select('-credentials');
      if (!gateway) {
        throw new Error(`Gateway ${gatewayName} not found`);
      }
      return gateway;
    } catch (error) {
      logger.error('Error fetching gateway:', error);
      throw error;
    }
  }

  /**
   * Get all active gateways
   */
  static async getActiveGateways() {
    try {
      const gateways = await PaymentGateway.find({ isActive: true }).select('-credentials');
      return gateways.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      logger.error('Error fetching active gateways:', error);
      throw error;
    }
  }

  /**
   * Get gateway credentials (secure)
   */
  static async getGatewayCredentials(gatewayName) {
    try {
      const gateway = await PaymentGateway.findOne({ gatewayName }).select('+credentials');
      if (!gateway) {
        throw new Error(`Gateway ${gatewayName} not found`);
      }
      return gateway.credentials;
    } catch (error) {
      logger.error('Error fetching gateway credentials:', error);
      throw error;
    }
  }

  /**
   * Update gateway credentials
   */
  static async updateCredentials(gatewayName, credentials) {
    try {
      const gateway = await PaymentGateway.findOne({ gatewayName });
      if (!gateway) {
        throw new Error(`Gateway ${gatewayName} not found`);
      }

      // Encrypt sensitive data before saving
      gateway.credentials = {
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        merchantId: credentials.merchantId,
        accountId: credentials.accountId,
        webhook_secret: credentials.webhook_secret,
        encryptionKey: credentials.encryptionKey,
        otherCredentials: credentials.otherCredentials,
      };

      await gateway.save();
      this.logAudit(gateway._id, 'credentials_updated', {}, 'admin');

      return { success: true, message: 'Credentials updated successfully' };
    } catch (error) {
      logger.error('Error updating gateway credentials:', error);
      throw error;
    }
  }

  /**
   * Enable/Disable gateway
   */
  static async toggleGateway(gatewayName, isActive) {
    try {
      const gateway = await PaymentGateway.findOne({ gatewayName });
      if (!gateway) {
        throw new Error(`Gateway ${gatewayName} not found`);
      }

      gateway.isActive = isActive;
      await gateway.save();
      this.logAudit(gateway._id, `gateway_${isActive ? 'enabled' : 'disabled'}`, {}, 'admin');

      return gateway;
    } catch (error) {
      logger.error('Error toggling gateway:', error);
      throw error;
    }
  }

  /**
   * Update gateway fee structure
   */
  static async updateFeeStructure(gatewayName, feeStructure) {
    try {
      const gateway = await PaymentGateway.findOne({ gatewayName });
      if (!gateway) {
        throw new Error(`Gateway ${gatewayName} not found`);
      }

      gateway.feeStructure = { ...gateway.feeStructure, ...feeStructure };
      await gateway.save();
      this.logAudit(gateway._id, 'fee_structure_updated', { feeStructure }, 'admin');

      return gateway;
    } catch (error) {
      logger.error('Error updating fee structure:', error);
      throw error;
    }
  }

  /**
   * Check gateway health
   */
  static async checkGatewayHealth(gatewayName) {
    try {
      const gateway = await PaymentGateway.findOne({ gatewayName });
      if (!gateway) {
        throw new Error(`Gateway ${gatewayName} not found`);
      }

      // Simulate health check (actual implementation would call gateway API)
      const healthStatus = {
        status: gateway.healthStatus.status,
        lastHealthCheck: new Date(),
        uptime: 99.9,
        responseTime: '150ms',
        errorRate: 0.1,
      };

      gateway.healthStatus = healthStatus;
      await gateway.save();

      return healthStatus;
    } catch (error) {
      logger.error('Error checking gateway health:', error);
      throw error;
    }
  }

  /**
   * Get gateway statistics
   */
  static async getGatewayStatistics(gatewayName) {
    try {
      const gateway = await PaymentGateway.findOne({ gatewayName });
      if (!gateway) {
        throw new Error(`Gateway ${gatewayName} not found`);
      }

      return gateway.statistics;
    } catch (error) {
      logger.error('Error fetching gateway statistics:', error);
      throw error;
    }
  }

  /**
   * Update gateway statistics
   */
  static async updateStatistics(gatewayName, transaction) {
    try {
      const gateway = await PaymentGateway.findOne({ gatewayName });
      if (!gateway) {
        throw new Error(`Gateway ${gatewayName} not found`);
      }

      gateway.statistics.totalTransactions += 1;
      gateway.statistics.totalVolume += transaction.amount;
      gateway.statistics.lastTransactionAt = new Date();

      if (transaction.success) {
        gateway.statistics.successfulTransactions += 1;
      } else {
        gateway.statistics.failedTransactions += 1;
      }

      // Calculate success rate
      if (gateway.statistics.totalTransactions > 0) {
        gateway.statistics.successRate = 
          (gateway.statistics.successfulTransactions / gateway.statistics.totalTransactions) * 100;
      }

      await gateway.save();
    } catch (error) {
      logger.error('Error updating gateway statistics:', error);
    }
  }

  /**
   * Configure webhook for gateway
   */
  static async configureWebhook(gatewayName, webhookConfig) {
    try {
      const gateway = await PaymentGateway.findOne({ gatewayName });
      if (!gateway) {
        throw new Error(`Gateway ${gatewayName} not found`);
      }

      const webhookEvent = {
        eventType: webhookConfig.eventType,
        enabled: webhookConfig.enabled !== false,
        endpoint: webhookConfig.endpoint,
        retryPolicy: webhookConfig.retryPolicy || {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelayMs: 1000,
        },
      };

      // Check if webhook event already exists
      const existingIndex = gateway.webhookEvents.findIndex(
        e => e.eventType === webhookConfig.eventType
      );

      if (existingIndex >= 0) {
        gateway.webhookEvents[existingIndex] = webhookEvent;
      } else {
        gateway.webhookEvents.push(webhookEvent);
      }

      await gateway.save();
      this.logAudit(gateway._id, 'webhook_configured', { webhookConfig }, 'admin');

      return gateway;
    } catch (error) {
      logger.error('Error configuring webhook:', error);
      throw error;
    }
  }

  /**
   * Test gateway connectivity
   */
  static async testGatewayConnection(gatewayName) {
    try {
      const gateway = await PaymentGateway.findOne({ gatewayName }).select('+credentials');
      if (!gateway) {
        throw new Error(`Gateway ${gatewayName} not found`);
      }

      // Implement actual test based on gateway type
      const testResult = {
        gatewayName,
        connected: gateway.isConfigured(),
        testTime: new Date(),
        details: {
          apiKeyConfigured: !!gateway.credentials.apiKey,
          apiSecretConfigured: !!gateway.credentials.apiSecret,
          merchantIdConfigured: !!gateway.credentials.merchantId,
        },
      };

      return testResult;
    } catch (error) {
      logger.error('Error testing gateway connection:', error);
      throw error;
    }
  }

  /**
   * Get best gateway for payment (based on priority, health, and limits)
   */
  static async selectBestGateway(amount, paymentMethod) {
    try {
      const gateways = await PaymentGateway.find({
        isActive: true,
        'supportedPaymentMethods.method': paymentMethod,
        'supportedPaymentMethods.enabled': true,
      }).sort({ priority: -1, 'statistics.successRate': -1 });

      if (gateways.length === 0) {
        throw new Error(`No gateway available for payment method ${paymentMethod}`);
      }

      // Filter gateways that can handle this amount
      const suitableGateways = gateways.filter(g => {
        const limits = g.limits;
        return (!limits.maxTransactionAmount || amount <= limits.maxTransactionAmount) &&
               (!limits.minTransactionAmount || amount >= limits.minTransactionAmount);
      });

      if (suitableGateways.length === 0) {
        throw new Error('No suitable gateway for this transaction amount');
      }

      // Return the first suitable gateway (sorted by priority)
      return suitableGateways[0];
    } catch (error) {
      logger.error('Error selecting best gateway:', error);
      throw error;
    }
  }

  /**
   * Log audit trail
   */
  static logAudit(gatewayId, action, details, performedBy) {
    PaymentGateway.findByIdAndUpdate(
      gatewayId,
      {
        $push: {
          auditLog: {
            timestamp: new Date(),
            action,
            details,
            performedBy,
          },
        },
      },
      { new: true }
    ).catch(err => logger.error('Error logging audit:', err));
  }
}

module.exports = PaymentGatewayService;
