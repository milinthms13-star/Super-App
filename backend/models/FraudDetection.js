/**
 * Fraud Detection Model - Phase 10 Feature 2
 * Fraud detection system with ML anomaly detection
 */

const { Schema, model } = require('mongoose');

const FraudDetectionSchema = new Schema(
  {
    fraudId: {
      type: String,
      unique: true,
      index: true,
      description: 'Unique fraud detection record ID',
    },
    orderId: {
      type: String,
      required: true,
      index: true,
      description: 'Associated order ID',
    },
    userId: {
      type: String,
      required: true,
      index: true,
      description: 'User account ID',
    },
    fraudType: {
      type: String,
      enum: [
        'payment_fraud',
        'refund_abuse',
        'order_cancellation_abuse',
        'location_spoofing',
        'promo_abuse',
        'account_takeover',
        'delivery_fraud',
        'restaurant_fraud',
        'rating_manipulation',
        'duplicate_orders',
      ],
      description: 'Type of fraud detected',
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
      description: 'Risk level assessment (0-100)',
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      description: 'Numerical risk score',
    },
    indicators: {
      type: [{
        indicatorType: String,
        indicatorValue: Schema.Types.Mixed,
        weight: Number,
        confidence: { type: Number, min: 0, max: 1 },
        description: String,
      }],
      default: [],
      description: 'Array of fraud indicators detected',
    },
    userBehavior: {
      orderFrequency: Number,
      unusualOrderSize: Boolean,
      unusualOrderValue: Number,
      unusualDeliveryLocation: Boolean,
      paymentMethodChanges: Number,
      refundRate: Number,
      cancellationRate: Number,
      accountAgeInDays: Number,
      suspiciousLoginCount: Number,
    },
    deviceInfo: {
      deviceId: String,
      ipAddress: String,
      ipCountry: String,
      userAgent: String,
      isVPN: Boolean,
      isProxy: Boolean,
      isMobileApp: Boolean,
    },
    locationData: {
      orderLocationLat: Number,
      orderLocationLng: Number,
      deliveryLocationLat: Number,
      deliveryLocationLng: Number,
      distanceKm: Number,
      isLocationSpoof: Boolean,
      previousLocations: [
        {
          lat: Number,
          lng: Number,
          timestamp: Date,
          distance: Number,
        },
      ],
    },
    paymentData: {
      paymentMethod: String,
      cardNumber: String, // Last 4 digits only
      isNewCard: Boolean,
      cardBIN: String,
      cardCountry: String,
      transactionAmount: Number,
      transactionCurrency: String,
    },
    mlAnalysis: {
      modelVersion: String,
      predictionScore: { type: Number, min: 0, max: 1 },
      anomalyScore: { type: Number, min: 0, max: 1 },
      anomalyType: [String],
      modelConfidence: { type: Number, min: 0, max: 1 },
      analysisDate: Date,
    },
    actions: {
      type: [{
        actionType: String,
        actionTime: Date,
        actionReason: String,
        actionTakenBy: String, // admin_system or user_id
      }],
      default: [],
      description: 'Actions taken in response to fraud detection',
    },
    status: {
      type: String,
      enum: ['flagged', 'investigating', 'confirmed', 'rejected', 'resolved'],
      default: 'flagged',
      description: 'Current fraud detection status',
    },
    manualReview: {
      isUnderReview: Boolean,
      reviewedBy: String,
      reviewTime: Date,
      reviewNotes: String,
      finalDecision: String,
    },
    escalation: {
      isEscalated: Boolean,
      escalationLevel: { type: Number, min: 1, max: 5 },
      escalatedTo: String,
      escalationReason: String,
      escalationTime: Date,
    },
    relatedRecords: {
      relatedOrderIds: [String],
      relatedUserIds: [String],
      relatedRestaurantIds: [String],
      relatedDeliveryPartnerIds: [String],
      relatedPaymentIds: [String],
    },
    disposition: {
      outcome: String, // approved, blocked, manual_review
      dispositionTime: Date,
      dispositionReason: String,
      refundAmount: Number,
      refundStatus: String,
    },
  },
  { timestamps: true, collection: 'fraud_detections' }
);

// Indexes
FraudDetectionSchema.index({ orderId: 1 });
FraudDetectionSchema.index({ userId: 1, createdAt: -1 });
FraudDetectionSchema.index({ riskLevel: 1, status: 1 });
FraudDetectionSchema.index({ fraudType: 1 });
FraudDetectionSchema.index({ 'mlAnalysis.anomalyScore': -1 });
FraudDetectionSchema.index({ status: 1, isUnderReview: 1 });

// Instance methods
FraudDetectionSchema.methods.calculateRiskScore = function () {
  let score = 0;
  this.indicators.forEach((ind) => {
    score += (ind.weight || 0) * (ind.confidence || 0);
  });
  this.riskScore = Math.min(100, score);
  this.riskLevel = this.riskScore > 75 ? 'critical' : this.riskScore > 50 ? 'high' : this.riskScore > 25 ? 'medium' : 'low';
};

FraudDetectionSchema.methods.addIndicator = function (type, value, weight, confidence, desc) {
  this.indicators.push({
    indicatorType: type,
    indicatorValue: value,
    weight,
    confidence,
    description: desc,
  });
};

FraudDetectionSchema.methods.escalate = function (level, reason, escalatedTo) {
  this.escalation = {
    isEscalated: true,
    escalationLevel: level,
    escalatedTo,
    escalationReason: reason,
    escalationTime: new Date(),
  };
};

module.exports = model('FraudDetection', FraudDetectionSchema);
