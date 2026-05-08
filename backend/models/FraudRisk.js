const mongoose = require('mongoose');

const FraudRiskSchema = new mongoose.Schema(
  {
    // Risk Identification
    riskId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ['payment', 'refund', 'wallet', 'user'],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Risk Scoring
    overallRiskScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
      index: true,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      index: true,
    },

    // Risk Factors
    riskFactors: [
      {
        factor: String, // e.g., "rapid_multiple_payments", "unusual_amount"
        weight: Number, // 0-100
        description: String,
        evidenceValue: mongoose.Schema.Types.Mixed,
      },
    ],

    // Transaction Pattern Analysis
    patternFlags: [
      {
        pattern: String, // e.g., "unusual_time", "new_device", "multiple_failures"
        frequency: Number,
        lastOccurrence: Date,
        riskContribution: Number,
      },
    ],

    // User Behavior Analysis
    behaviorAnalysis: {
      historicalPatterns: {
        avgTransactionAmount: Number,
        avgTransactionsPerDay: Number,
        preferredPaymentMethods: [String],
        usualTimeZone: String,
        usualRegions: [String],
      },
      anomalies: [
        {
          type: String,
          deviation: Number, // Standard deviations from mean
          severity: String,
        },
      ],
    },

    // Device & Network Analysis
    deviceAnalysis: {
      deviceId: String,
      deviceType: String,
      osVersion: String,
      isNewDevice: Boolean,
      deviceReputation: Number, // 0-100
      ipAddress: String,
      countryCode: String,
      isVpnDetected: Boolean,
      isProxyDetected: Boolean,
    },

    // Velocity Checks
    velocityAnalysis: {
      paymentsInLast1Hour: Number,
      paymentsInLast24Hours: Number,
      refundsInLast7Days: Number,
      failuresInLast1Hour: Number,
      geographicVelocity: {
        citiesInLast24Hours: Number,
        countriesInLast7Days: Number,
      },
    },

    // Amount Analysis
    amountAnalysis: {
      requestAmount: Number,
      userAverageAmount: Number,
      percentageDeviation: Number,
      isUnusuallyHigh: Boolean,
      isUnusuallyLow: Boolean,
    },

    // Refund Pattern Analysis
    refundAnalysis: {
      refundRate: Number, // percentage
      historicalRefunds: Number,
      refundsInLast30Days: Number,
      issuePattern: String,
      isRepeatRefundRequest: Boolean,
    },

    // External Risk Signals
    externalSignals: [
      {
        source: String, // e.g., "chargeback", "report", "blacklist"
        signal: String,
        severity: String,
        timestamp: Date,
      },
    ],

    // Verification Status
    verified: {
      type: Boolean,
      default: false,
    },
    verificationMethod: String,
    verificationAt: Date,
    verificationResult: String,

    // Action & Investigation
    actionTaken: {
      type: String,
      enum: ['none', 'review', 'hold', 'block', 'contact_user', 'auto_approve'],
      default: 'none',
      index: true,
    },
    investigationStatus: {
      type: String,
      enum: ['open', 'in_progress', 'closed', 'appealed'],
      default: 'open',
    },
    investigationNotes: String,
    resolvedAt: Date,
    resolution: String,

    // Appeal Process
    appeal: {
      appealedAt: Date,
      appealReason: String,
      appealedBy: mongoose.Schema.Types.ObjectId,
      appealStatus: String,
      appealResolution: String,
    },

    // Machine Learning Insights
    mlAnalysis: {
      modelVersion: String,
      confidenceScore: Number,
      modelPrediction: String,
      featureImportance: mongoose.Schema.Types.Mixed,
    },

    // Timeline & Status
    status: {
      type: String,
      enum: ['pending_review', 'approved', 'rejected', 'appealed', 'resolved'],
      default: 'pending_review',
      index: true,
    },
    reviewedBy: mongoose.Schema.Types.ObjectId,
    reviewedAt: Date,

    // Metadata
    notes: String,
    tags: [String],

    // Timestamp
    detectedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: Date,
  },
  {
    timestamps: true,
    collection: 'fraud_risks',
  }
);

// Indexes
FraudRiskSchema.index({ userId: 1, detectedAt: -1 });
FraudRiskSchema.index({ entityType: 1, riskLevel: 1 });
FraudRiskSchema.index({ overallRiskScore: -1, status: 1 });
FraudRiskSchema.index({ detectedAt: -1 });
FraudRiskSchema.index({ actionTaken: 1, status: 1 });

module.exports = mongoose.model('FraudRisk', FraudRiskSchema);
