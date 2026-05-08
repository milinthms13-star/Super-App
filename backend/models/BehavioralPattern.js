/**
 * BehavioralPattern Schema
 * Tracks user behavioral patterns for anomaly detection
 * Learns normal user behavior and flags deviations
 */

const mongoose = require('mongoose');

const behavioralPatternSchema = new mongoose.Schema(
  {
    patternId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },

    entityType: {
      type: String,
      enum: ['user', 'payment_method', 'device', 'location'],
      required: true,
    },

    entityId: {
      type: String,
      required: true,
    },

    patternType: {
      type: String,
      enum: [
        'transaction_amount',
        'transaction_frequency',
        'payment_method_usage',
        'time_of_day',
        'geographic_location',
        'device_type',
        'refund_behavior',
        'velocity',
        'merchant_category',
        'wallet_behavior',
      ],
      required: true,
      index: true,
    },

    normalBehavior: {
      mean: Number,
      standardDeviation: Number,
      min: Number,
      max: Number,
      median: Number,
      percentile25: Number,
      percentile75: Number,
      distribution: {
        type: String,
        enum: ['normal', 'uniform', 'exponential', 'bimodal', 'unknown'],
      },
    },

    anomalyThresholds: {
      lowThreshold: Number,
      highThreshold: Number,
      zScoreThreshold: {
        type: Number,
        default: 3,
      },
      confidenceLevel: {
        type: Number,
        default: 0.95,
        min: 0.9,
        max: 0.99,
      },
    },

    timePattern: {
      preferredTimeWindow: {
        startHour: Number,
        endHour: Number,
        dayOfWeek: [Number],
      },
      seasonality: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'none'],
      },
      peakHours: [Number],
      quietPeriods: [Number],
    },

    geographicPattern: {
      primaryLocations: [
        {
          location: String,
          latitude: Number,
          longitude: Number,
          frequency: Number,
          lastSeen: Date,
        },
      ],
      allowedRadius: {
        type: Number,
        default: 50,
      },
      travelVelocity: {
        maxKmPerHour: Number,
      },
    },

    devicePattern: {
      primaryDevices: [
        {
          deviceId: String,
          deviceType: String,
          os: String,
          frequency: Number,
          lastUsed: Date,
        },
      ],
      allowedDevices: [String],
      newDeviceDeviation: {
        type: Number,
        default: 2,
      },
    },

    paymentMethodPattern: {
      preferredMethods: [
        {
          method: String,
          frequency: Number,
          percentageOfTotal: Number,
          lastUsed: Date,
        },
      ],
      methodSwitchFrequency: Number,
      unusualMethodThreshold: Number,
    },

    frequencyPattern: {
      transactionsPerDay: {
        mean: Number,
        stdDev: Number,
      },
      transactionsPerWeek: {
        mean: Number,
        stdDev: Number,
      },
      transactionsPerMonth: {
        mean: Number,
        stdDev: Number,
      },
      inactivityThresholdDays: {
        type: Number,
        default: 30,
      },
    },

    amountPattern: {
      smallTransaction: {
        mean: Number,
        stdDev: Number,
        frequency: Number,
      },
      mediumTransaction: {
        mean: Number,
        stdDev: Number,
        frequency: Number,
      },
      largeTransaction: {
        mean: Number,
        stdDev: Number,
        frequency: Number,
        threshold: Number,
      },
      bulkThreshold: Number,
    },

    refundPattern: {
      refundRate: Number,
      avgRefundAmount: Number,
      refundsPerMonth: Number,
      reasonDistribution: {
        type: Map,
        of: Number,
      },
      immediateRefundPercentage: Number,
      suspiciousRefundScore: Number,
    },

    velocityPattern: {
      cardsUsed: {
        perHour: Number,
        perDay: Number,
        perWeek: Number,
      },
      recipientsUsed: {
        perDay: Number,
        perWeek: Number,
      },
      geographicVelocity: Number,
    },

    learningStatus: {
      dataPoints: {
        type: Number,
        default: 0,
      },
      confidenceScore: {
        type: Number,
        min: 0,
        max: 1,
      },
      isStable: {
        type: Boolean,
        default: false,
      },
      minDataPointsRequired: {
        type: Number,
        default: 30,
      },
    },

    anomalies: {
      detectedCount: {
        type: Number,
        default: 0,
      },
      lastAnomalyAt: Date,
      anomalyRate: Number,
      recentAnomalies: [
        {
          detectedAt: Date,
          value: Number,
          zScore: Number,
          flaggedAs: String,
        },
      ],
    },

    status: {
      type: String,
      enum: ['learning', 'active', 'inactive', 'archived'],
      default: 'learning',
      index: true,
    },

    tags: [String],
  },
  {
    timestamps: true,
    collection: 'behavioralpatterns',
    toJSON: { virtuals: true },
  }
);

// Indexes for fast queries
behavioralPatternSchema.index({ userId: 1, patternType: 1, status: 1 });
behavioralPatternSchema.index({ entityType: 1, entityId: 1 });
behavioralPatternSchema.index({ 'learningStatus.confidenceScore': -1 });
behavioralPatternSchema.index({ 'anomalies.detectedCount': -1 });
behavioralPatternSchema.index({ createdAt: -1 });

// Virtual for pattern readiness
behavioralPatternSchema.virtual('isReady').get(function () {
  return (
    this.status === 'active' &&
    this.learningStatus.isStable &&
    this.learningStatus.dataPoints >= this.learningStatus.minDataPointsRequired
  );
});

// Method to detect anomaly
behavioralPatternSchema.methods.isAnomaly = function (value) {
  if (!this.normalBehavior.mean || !this.normalBehavior.standardDeviation) {
    return false;
  }

  const zScore = (value - this.normalBehavior.mean) / this.normalBehavior.standardDeviation;
  return Math.abs(zScore) > this.anomalyThresholds.zScoreThreshold;
};

// Method to calculate z-score
behavioralPatternSchema.methods.calculateZScore = function (value) {
  if (!this.normalBehavior.standardDeviation) return 0;
  return (value - this.normalBehavior.mean) / this.normalBehavior.standardDeviation;
};

// Method to update pattern with new data
behavioralPatternSchema.methods.addDataPoint = async function (value) {
  this.learningStatus.dataPoints += 1;

  // Recalculate statistics (simplified - in production, use streaming algorithms)
  if (this.learningStatus.dataPoints >= this.learningStatus.minDataPointsRequired) {
    this.learningStatus.isStable = true;
    this.learningStatus.confidenceScore = Math.min(this.learningStatus.dataPoints / 100, 1);
  }

  return this.save();
};

// Method to record anomaly
behavioralPatternSchema.methods.recordAnomaly = function (value, zScore) {
  this.anomalies.detectedCount += 1;
  this.anomalies.lastAnomalyAt = new Date();
  this.anomalies.anomalyRate = this.anomalies.detectedCount / this.learningStatus.dataPoints;

  this.anomalies.recentAnomalies.push({
    detectedAt: new Date(),
    value,
    zScore,
    flaggedAs: 'anomaly',
  });

  // Keep only last 100 anomalies
  if (this.anomalies.recentAnomalies.length > 100) {
    this.anomalies.recentAnomalies = this.anomalies.recentAnomalies.slice(-100);
  }

  return this.save();
};

module.exports = mongoose.model('BehavioralPattern', behavioralPatternSchema);
