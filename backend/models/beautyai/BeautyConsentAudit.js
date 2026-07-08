const mongoose = require('mongoose');

const beautyConsentAuditSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    requestId: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
      index: true,
    },
    action: {
      type: String,
      enum: ['plan_generation', 'selfie_analysis'],
      required: true,
      index: true,
    },
    consentGiven: {
      type: Boolean,
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      trim: true,
      default: '',
      maxlength: 160,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
      maxlength: 220,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
    },
    userAgent: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

beautyConsentAuditSchema.index({ action: 1, createdAt: -1 });
beautyConsentAuditSchema.index({ userId: 1, createdAt: -1 });
beautyConsentAuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports =
  mongoose.models.BeautyConsentAudit ||
  mongoose.model('BeautyConsentAudit', beautyConsentAuditSchema);
