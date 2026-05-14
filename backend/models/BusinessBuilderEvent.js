const mongoose = require('mongoose');

const BusinessBuilderEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      unique: true,
      required: true,
      default: () => `bbev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    },
    miniAppId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MiniApp',
      required: true,
      index: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        'view',
        'share',
        'contact_click',
        'whatsapp_click',
        'call_click',
        'lead_submit',
        'order_start',
        'order_paid',
      ],
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['direct', 'qr', 'social', 'poster', 'caption', 'website', 'referral', 'other'],
      default: 'direct',
      index: true,
    },
    sourceAssetId: {
      type: String,
      trim: true,
      maxlength: 80,
      index: true,
    },
    sessionId: {
      type: String,
      trim: true,
      maxlength: 100,
      index: true,
    },
    visitorId: {
      type: String,
      trim: true,
      maxlength: 100,
      index: true,
    },
    utm: {
      source: { type: String, trim: true, maxlength: 100 },
      medium: { type: String, trim: true, maxlength: 100 },
      campaign: { type: String, trim: true, maxlength: 120 },
      term: { type: String, trim: true, maxlength: 120 },
      content: { type: String, trim: true, maxlength: 120 },
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

BusinessBuilderEventSchema.index({ businessId: 1, createdAt: -1 });
BusinessBuilderEventSchema.index({ miniAppId: 1, createdAt: -1 });
BusinessBuilderEventSchema.index({ eventType: 1, createdAt: -1 });

module.exports = mongoose.model('BusinessBuilderEvent', BusinessBuilderEventSchema);
