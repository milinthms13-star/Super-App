/**
 * PaymentGateway Model - Phase 11 Payment Processing
 * Payment gateway configuration and integration management
 */

const { Schema } = require('mongoose');

const paymentGatewaySchema = new Schema(
  {
    gatewayId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    gatewayName: {
      type: String,
      required: true,
      enum: ['razorpay', 'stripe', 'paytm', 'phonepe', 'googlepay', 'flutterwave', 'square', 'paypal'],
      index: true,
    },
    displayName: String,
    description: String,
    isActive: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 1 },
    supportedCountries: [String],
    supportedCurrencies: [String],
    supportedPaymentMethods: [
      {
        method: String,
        enabled: Boolean,
        processingTime: String,
        fee: Number,
      },
    ],
    credentials: {
      apiKey: { type: String, select: false },
      apiSecret: { type: String, select: false },
      merchantId: String,
      accountId: String,
      webhook_secret: { type: String, select: false },
      encryptionKey: { type: String, select: false },
      otherCredentials: Schema.Types.Mixed,
    },
    configuration: {
      timeoutSeconds: { type: Number, default: 30 },
      retryAttempts: { type: Number, default: 3 },
      retryDelayMs: { type: Number, default: 1000 },
      allowRefunds: { type: Boolean, default: true },
      autoSettlement: { type: Boolean, default: true },
      settlementCycle: String,
      captureMode: { type: String, enum: ['auto', 'manual'], default: 'auto' },
      webhookUrl: String,
      ipWhitelist: [String],
      enableRiskCheck: { type: Boolean, default: true },
      enableFraudDetection: { type: Boolean, default: true },
      requireSignature: { type: Boolean, default: true },
    },
    feeStructure: {
      baseFee: Number,
      percentageFee: Number,
      minAmount: Number,
      maxAmount: Number,
      fixedFee: Number,
      feePerTransaction: Number,
      internationalFee: Number,
      chargebackFee: Number,
      refundFee: Number,
    },
    limits: {
      maxTransactionAmount: Number,
      minTransactionAmount: Number,
      dailyVolumeLimit: Number,
      monthlyVolumeLimit: Number,
      maxConcurrentTransactions: Number,
    },
    statistics: {
      totalTransactions: { type: Number, default: 0 },
      successfulTransactions: { type: Number, default: 0 },
      failedTransactions: { type: Number, default: 0 },
      totalVolume: { type: Number, default: 0 },
      totalFees: { type: Number, default: 0 },
      averageProcessingTime: String,
      successRate: { type: Number, default: 0 },
      lastTransactionAt: Date,
    },
    healthStatus: {
      status: { type: String, enum: ['healthy', 'degraded', 'down'], default: 'healthy' },
      lastHealthCheck: Date,
      uptime: Number,
      responseTime: String,
      errorRate: Number,
    },
    complianceInfo: {
      pciDSSCompliant: Boolean,
      certifications: [String],
      lastAudit: Date,
      nextAuditDue: Date,
      complianceStatus: String,
    },
    webhookEvents: [
      {
        eventType: String,
        enabled: Boolean,
        endpoint: String,
        retryPolicy: Schema.Types.Mixed,
      },
    ],
    testMode: {
      enabled: { type: Boolean, default: false },
      testApiKey: { type: String, select: false },
      testMerchantId: String,
    },
    auditLog: [
      {
        timestamp: Date,
        action: String,
        performedBy: String,
        details: Schema.Types.Mixed,
      },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'payment_gateways',
  }
);

paymentGatewaySchema.index({ gatewayName: 1, isActive: 1 });
paymentGatewaySchema.index({ priority: -1, isActive: 1 });
paymentGatewaySchema.index({ lastTransactionAt: -1 });

paymentGatewaySchema.methods.isHealthy = function () {
  return this.healthStatus.status === 'healthy';
};

paymentGatewaySchema.methods.canProcessPayment = function () {
  return this.isActive && this.isHealthy();
};

paymentGatewaySchema.methods.isConfigured = function () {
  return this.credentials.apiKey && this.credentials.apiSecret;
};

module.exports = require('mongoose').model('PaymentGateway', paymentGatewaySchema);
