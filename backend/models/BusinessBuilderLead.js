const mongoose = require('mongoose');

const BusinessBuilderLeadSchema = new mongoose.Schema(
  {
    leadId: {
      type: String,
      unique: true,
      required: true,
      default: () => `lead-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
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
    customer: {
      name: { type: String, trim: true, maxlength: 120 },
      phone: { type: String, trim: true, maxlength: 20 },
      email: { type: String, trim: true, lowercase: true, maxlength: 160 },
      message: { type: String, trim: true, maxlength: 1200 },
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
    utm: {
      source: { type: String, trim: true, maxlength: 100 },
      medium: { type: String, trim: true, maxlength: 100 },
      campaign: { type: String, trim: true, maxlength: 120 },
      term: { type: String, trim: true, maxlength: 120 },
      content: { type: String, trim: true, maxlength: 120 },
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
      default: 'new',
      index: true,
    },
    convertedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessBuilderOrder',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

BusinessBuilderLeadSchema.index({ businessId: 1, createdAt: -1 });
BusinessBuilderLeadSchema.index({ miniAppId: 1, createdAt: -1 });

module.exports = mongoose.model('BusinessBuilderLead', BusinessBuilderLeadSchema);
