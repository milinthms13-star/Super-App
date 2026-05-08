/**
 * FraudAlert Schema
 * Manages real-time fraud alerts with severity levels and acknowledgment workflow
 */

const mongoose = require('mongoose');

const fraudAlertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      unique: true,
      required: true,
      index: true,
      description: 'Unique identifier for the fraud alert',
    },

    triggeredBy: {
      type: String,
      enum: ['ml_model', 'rule_engine', 'behavioral_analysis', 'manual_report', 'pattern_match'],
      required: true,
      description: 'Source that triggered the alert',
    },

    mlModelId: {
      type: String,
      description: 'ID of ML model that generated this alert (if applicable)',
    },

    entityType: {
      type: String,
      enum: ['payment', 'refund', 'wallet', 'user', 'device'],
      required: true,
      index: true,
      description: 'Type of entity flagged',
    },

    entityId: {
      type: String,
      required: true,
      index: true,
      description: 'ID of the flagged entity',
    },

    userId: {
      type: String,
      required: true,
      index: true,
      description: 'User associated with the alert',
    },

    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      index: true,
      description: 'Severity level of the fraud alert',
    },

    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
      description: 'Risk score from ML model (0-100)',
    },

    confidence: {
      type: Number,
      min: 0,
      max: 1,
      description: 'Confidence score of the alert (0-1)',
    },

    status: {
      type: String,
      enum: ['open', 'acknowledged', 'investigating', 'resolved', 'dismissed', 'escalated'],
      default: 'open',
      index: true,
      description: 'Current status of the alert',
    },

    category: {
      type: String,
      enum: [
        'unusual_amount',
        'velocity_abuse',
        'new_device',
        'geographic_anomaly',
        'repeated_failures',
        'refund_abuse',
        'account_takeover',
        'money_mule',
        'testing_cards',
        'merchant_fraud',
        'identity_theft',
        'other',
      ],
      description: 'Fraud category',
    },

    indicators: [
      {
        indicator: String,
        description: String,
        weight: Number,
        detected: Boolean,
      },
    ],

    triggerData: {
      transactionAmount: Number,
      transactionCurrency: String,
      paymentMethod: String,
      deviceInfo: {
        deviceId: String,
        type: String,
        os: String,
        ipAddress: String,
        isNewDevice: Boolean,
      },
      locationInfo: {
        latitude: Number,
        longitude: Number,
        country: String,
        city: String,
        detectedVelocity: Number,
      },
      temporalInfo: {
        timeOfTransaction: Date,
        dayOfWeek: Number,
        hourOfDay: Number,
        isOutsideNormalHours: Boolean,
      },
      merchantInfo: {
        merchantId: String,
        merchantCategory: String,
        merchantRiskScore: Number,
      },
    },

    deviations: {
      amountDeviation: {
        userAverage: Number,
        detectedAmount: Number,
        percentageChange: Number,
        zScore: Number,
      },
      frequencyDeviation: {
        expectedFrequency: Number,
        detectedFrequency: Number,
        percentageChange: Number,
      },
      locationDeviation: {
        lastLocation: String,
        currentLocation: String,
        distanceKm: Number,
        timeToTravelHours: Number,
        isPhysicallyPossible: Boolean,
      },
      deviceDeviation: {
        previousDevices: [String],
        currentDevice: String,
        isNewDevice: Boolean,
        changeFrequency: Number,
      },
    },

    acknowledgment: {
      acknowledgedAt: Date,
      acknowledgedBy: String,
      acknowledgedByRole: String,
      notes: String,
    },

    investigation: {
      investigationId: String,
      investigatedBy: String,
      investigatedAt: Date,
      findings: String,
      recommendedAction: String,
      evidenceCollected: [String],
    },

    action: {
      actionTaken: {
        type: String,
        enum: ['none', 'block', 'challenge', 'manual_review', 'contact_user', 'freeze_account'],
        description: 'Action taken in response to alert',
      },
      actionAt: Date,
      actionBy: String,
      actionReason: String,
    },

    resolution: {
      resolvedAt: Date,
      resolvedBy: String,
      resolution: {
        type: String,
        enum: ['fraud_confirmed', 'false_positive', 'legitimate_activity', 'unknown'],
      },
      feedback: String,
      feedbackUsedForRetraining: Boolean,
    },

    escalation: {
      escalatedAt: Date,
      escalatedTo: String,
      escalationReason: String,
      escalationPriority: String,
    },

    notifications: {
      userNotified: {
        type: Boolean,
        default: false,
      },
      notificationChannels: {
        type: [String],
        enum: ['email', 'sms', 'app_notification', 'push_notification'],
      },
      notifiedAt: [Date],
      notificationResponse: {
        type: String,
        enum: ['confirmed', 'denied', 'no_response'],
      },
    },

    relatedAlerts: [
      {
        alertId: String,
        similarity: Number,
        description: String,
      },
    ],

    patternMatches: [
      {
        patternId: String,
        patternType: String,
        deviationScore: Number,
      },
    ],

    tags: {
      type: [String],
      description: 'Tags for filtering and categorization',
    },

    priority: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
      description: 'Alert priority (1=highest, 10=lowest)',
    },

    expiresAt: {
      type: Date,
      description: 'When alert should be auto-archived if not resolved',
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: -1,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'fraudalerts',
    toJSON: { virtuals: true },
  }
);

// TTL index for auto-expiration
fraudAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Indexes for fast queries
fraudAlertSchema.index({ userId: 1, status: 1, createdAt: -1 });
fraudAlertSchema.index({ severity: 1, status: 1 });
fraudAlertSchema.index({ entityType: 1, entityId: 1 });
fraudAlertSchema.index({ status: 1, priority: -1 });
fraudAlertSchema.index({ riskScore: -1, status: 1 });
fraudAlertSchema.index({ createdAt: -1 });
fraudAlertSchema.index({ mlModelId: 1, createdAt: -1 });

// Virtual for time since creation
fraudAlertSchema.virtual('ageInMinutes').get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60));
});

// Virtual for time since creation
fraudAlertSchema.virtual('isUrgent').get(function () {
  return this.severity === 'critical' && this.status === 'open';
});

// Virtual for complete information
fraudAlertSchema.virtual('isResolved').get(function () {
  return ['resolved', 'dismissed'].includes(this.status);
});

// Method to acknowledge alert
fraudAlertSchema.methods.acknowledge = function (acknowledgedBy, role, notes) {
  this.status = 'acknowledged';
  this.acknowledgment = {
    acknowledgedAt: new Date(),
    acknowledgedBy,
    acknowledgedByRole: role,
    notes,
  };
  return this.save();
};

// Method to escalate alert
fraudAlertSchema.methods.escalate = function (escalatedTo, reason, priority) {
  this.status = 'escalated';
  this.escalation = {
    escalatedAt: new Date(),
    escalatedTo,
    escalationReason: reason,
    escalationPriority: priority,
  };
  if (priority) {
    this.priority = Math.min(priority, 1);
  }
  return this.save();
};

// Method to resolve alert
fraudAlertSchema.methods.resolve = function (resolution, resolvedBy, feedback) {
  this.status = 'resolved';
  this.resolution = {
    resolvedAt: new Date(),
    resolvedBy,
    resolution,
    feedback,
    feedbackUsedForRetraining: false,
  };
  return this.save();
};

// Method to record action
fraudAlertSchema.methods.recordAction = function (action, actionBy, reason) {
  this.action = {
    actionTaken: action,
    actionAt: new Date(),
    actionBy,
    actionReason: reason,
  };
  return this.save();
};

// Method to notify user
fraudAlertSchema.methods.notifyUser = function (channels) {
  this.notifications.userNotified = true;
  this.notifications.notificationChannels = channels;
  this.notifications.notifiedAt.push(new Date());
  return this.save();
};

module.exports = mongoose.model('FraudAlert', fraudAlertSchema);
