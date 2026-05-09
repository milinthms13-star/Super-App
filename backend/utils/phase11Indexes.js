/**
 * Phase 11 Indexes - Payment Processing
 * MongoDB indexes and seed data initialization
 */

const Payment = require('../models/Payment');
const PaymentGateway = require('../models/PaymentGateway');
const Transaction = require('../models/Transaction');
const Reconciliation = require('../models/Reconciliation');

class Phase11Indexes {
  /**
   * Initialize all Phase 11 indexes
   */
  static async initializePhase11() {
    try {
      console.log('🔧 Initializing Phase 11 Payment Processing indexes...');

      // Create all indexes
      await this.createPaymentIndexes();
      await this.createPaymentGatewayIndexes();
      await this.createTransactionIndexes();
      await this.createReconciliationIndexes();

      // Seed default data
      await this.seedDefaultData();

      console.log('✅ Phase 11 indexes and data initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Phase 11:', error);
      throw error;
    }
  }

  /**
   * Create indexes for Payment model
   */
  static async createPaymentIndexes() {
    try {
      // Existing indexes are defined in the model schema
      // This method ensures TTL indexes are properly set up
      
      // TTL index for auto-deletion of old records (2 years)
      await Payment.collection.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 63072000 } // 2 years
      );

      console.log('✓ Payment indexes created');
    } catch (error) {
      console.error('Error creating Payment indexes:', error);
      throw error;
    }
  }

  /**
   * Create indexes for PaymentGateway model
   */
  static async createPaymentGatewayIndexes() {
    try {
      // Gateway indexes are defined in schema
      console.log('✓ PaymentGateway indexes created');
    } catch (error) {
      console.error('Error creating PaymentGateway indexes:', error);
      throw error;
    }
  }

  /**
   * Create indexes for Transaction model
   */
  static async createTransactionIndexes() {
    try {
      // TTL index for auto-deletion of old records (1 year)
      await Transaction.collection.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 31536000 } // 1 year
      );

      console.log('✓ Transaction indexes created');
    } catch (error) {
      console.error('Error creating Transaction indexes:', error);
      throw error;
    }
  }

  /**
   * Create indexes for Reconciliation model
   */
  static async createReconciliationIndexes() {
    try {
      // Reconciliation indexes are defined in schema
      console.log('✓ Reconciliation indexes created');
    } catch (error) {
      console.error('Error creating Reconciliation indexes:', error);
      throw error;
    }
  }

  /**
   * Seed default payment gateway data
   */
  static async seedDefaultData() {
    try {
      // Check if gateways already exist
      const existingGateways = await PaymentGateway.countDocuments();

      if (existingGateways === 0) {
        const defaultGateways = [
          {
            gatewayId: 'GW_001_RAZORPAY',
            gatewayName: 'razorpay',
            displayName: 'Razorpay',
            description: 'Leading payment gateway in India',
            isActive: true,
            priority: 1,
            supportedCountries: ['IN'],
            supportedCurrencies: ['INR'],
            supportedPaymentMethods: [
              { method: 'credit_card', enabled: true, processingTime: '2-5 minutes', fee: 1.5 },
              { method: 'debit_card', enabled: true, processingTime: '2-5 minutes', fee: 0.5 },
              { method: 'upi', enabled: true, processingTime: '1-2 minutes', fee: 0 },
              { method: 'net_banking', enabled: true, processingTime: '5-10 minutes', fee: 0 },
              { method: 'wallet', enabled: true, processingTime: 'Instant', fee: 0 },
            ],
            configuration: {
              timeoutSeconds: 30,
              retryAttempts: 3,
              retryDelayMs: 1000,
              allowRefunds: true,
              autoSettlement: true,
              settlementCycle: 'daily',
              captureMode: 'auto',
              enableRiskCheck: true,
              enableFraudDetection: true,
              requireSignature: true,
            },
            feeStructure: {
              percentageFee: 1.5,
              fixedFee: 0,
              internationalFee: 2.5,
              chargebackFee: 100,
              refundFee: 0,
            },
            limits: {
              maxTransactionAmount: 1000000,
              minTransactionAmount: 1,
              dailyVolumeLimit: 10000000,
              monthlyVolumeLimit: 300000000,
              maxConcurrentTransactions: 1000,
            },
            healthStatus: {
              status: 'healthy',
              lastHealthCheck: new Date(),
              uptime: 99.95,
              responseTime: '150ms',
              errorRate: 0.05,
            },
            complianceInfo: {
              pciDSSCompliant: true,
              certifications: ['PCI DSS Level 1'],
              lastAudit: new Date(),
              nextAuditDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              complianceStatus: 'Compliant',
            },
          },
          {
            gatewayId: 'GW_002_STRIPE',
            gatewayName: 'stripe',
            displayName: 'Stripe',
            description: 'Global payment processing platform',
            isActive: true,
            priority: 2,
            supportedCountries: ['US', 'GB', 'EU', 'IN', 'AU'],
            supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR'],
            supportedPaymentMethods: [
              { method: 'credit_card', enabled: true, processingTime: '1-3 minutes', fee: 1.4 },
              { method: 'debit_card', enabled: true, processingTime: '1-3 minutes', fee: 1.4 },
            ],
            configuration: {
              timeoutSeconds: 30,
              retryAttempts: 3,
              retryDelayMs: 1000,
              allowRefunds: true,
              autoSettlement: true,
              settlementCycle: 'daily',
              captureMode: 'auto',
              enableRiskCheck: true,
              enableFraudDetection: true,
              requireSignature: true,
            },
            feeStructure: {
              percentageFee: 1.4,
              fixedFee: 0.3,
              internationalFee: 2.2,
              chargebackFee: 15,
              refundFee: 0,
            },
            limits: {
              maxTransactionAmount: 5000000,
              minTransactionAmount: 50,
              dailyVolumeLimit: 50000000,
              monthlyVolumeLimit: 500000000,
              maxConcurrentTransactions: 2000,
            },
            healthStatus: {
              status: 'healthy',
              lastHealthCheck: new Date(),
              uptime: 99.99,
              responseTime: '100ms',
              errorRate: 0.01,
            },
            complianceInfo: {
              pciDSSCompliant: true,
              certifications: ['PCI DSS Level 1', 'SOC 2'],
              lastAudit: new Date(),
              nextAuditDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              complianceStatus: 'Compliant',
            },
          },
          {
            gatewayId: 'GW_003_PAYTM',
            gatewayName: 'paytm',
            displayName: 'Paytm',
            description: 'Popular digital payment platform in India',
            isActive: true,
            priority: 3,
            supportedCountries: ['IN'],
            supportedCurrencies: ['INR'],
            supportedPaymentMethods: [
              { method: 'credit_card', enabled: true, processingTime: '5-10 minutes', fee: 2 },
              { method: 'debit_card', enabled: true, processingTime: '5-10 minutes', fee: 0.5 },
              { method: 'net_banking', enabled: true, processingTime: '5-10 minutes', fee: 1 },
              { method: 'upi', enabled: true, processingTime: '1-2 minutes', fee: 0 },
            ],
            configuration: {
              timeoutSeconds: 45,
              retryAttempts: 3,
              retryDelayMs: 2000,
              allowRefunds: true,
              autoSettlement: true,
              settlementCycle: 'daily',
              captureMode: 'manual',
              enableRiskCheck: true,
              enableFraudDetection: true,
              requireSignature: true,
            },
            feeStructure: {
              percentageFee: 1.5,
              fixedFee: 0,
              internationalFee: 3,
              chargebackFee: 200,
              refundFee: 5,
            },
            limits: {
              maxTransactionAmount: 100000,
              minTransactionAmount: 1,
              dailyVolumeLimit: 5000000,
              monthlyVolumeLimit: 150000000,
              maxConcurrentTransactions: 500,
            },
            healthStatus: {
              status: 'healthy',
              lastHealthCheck: new Date(),
              uptime: 99.8,
              responseTime: '300ms',
              errorRate: 0.2,
            },
            complianceInfo: {
              pciDSSCompliant: true,
              certifications: ['PCI DSS Level 2'],
              lastAudit: new Date(),
              nextAuditDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              complianceStatus: 'Compliant',
            },
          },
        ];

        await PaymentGateway.insertMany(defaultGateways);
        console.log('✓ Default payment gateways seeded');
      } else {
        console.log('✓ Payment gateways already exist');
      }
    } catch (error) {
      console.error('Error seeding default data:', error);
      throw error;
    }
  }

  /**
   * Clean up old data
   */
  static async cleanupOldData() {
    try {
      // Delete payments older than 2 years
      const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
      const paymentsDeleted = await Payment.deleteMany({
        createdAt: { $lt: twoYearsAgo },
      });

      // Delete transactions older than 1 year
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const transactionsDeleted = await Transaction.deleteMany({
        createdAt: { $lt: oneYearAgo },
      });

      console.log(`✓ Cleaned up ${paymentsDeleted.deletedCount} old payments`);
      console.log(`✓ Cleaned up ${transactionsDeleted.deletedCount} old transactions`);
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  static async getDatabaseStats() {
    try {
      const paymentStats = await Payment.aggregate([
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' },
          },
        },
      ]);

      const transactionStats = await Transaction.aggregate([
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]);

      const gatewayStats = await PaymentGateway.countDocuments({ isActive: true });
      const reconciliationStats = await Reconciliation.countDocuments({ status: 'completed' });

      return {
        payments: paymentStats[0] || { count: 0 },
        transactions: transactionStats[0] || { count: 0 },
        activeGateways: gatewayStats,
        completedReconciliations: reconciliationStats,
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }
}

module.exports = Phase11Indexes;
