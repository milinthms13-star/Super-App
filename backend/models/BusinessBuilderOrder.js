const mongoose = require('mongoose');

const BusinessBuilderOrderItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 180 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const BusinessBuilderOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
      default: () => `bb-order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessBuilderLead',
      index: true,
    },
    customer: {
      name: { type: String, trim: true, maxlength: 120 },
      phone: { type: String, trim: true, maxlength: 20 },
      email: { type: String, trim: true, lowercase: true, maxlength: 160 },
      address: { type: String, trim: true, maxlength: 300 },
    },
    items: {
      type: [BusinessBuilderOrderItemSchema],
      default: [],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      maxlength: 10,
    },
    subtotalAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    taxAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      min: 0,
      default: 0,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'initiated',
        'pending_payment',
        'paid',
        'confirmed',
        'processing',
        'completed',
        'cancelled',
        'failed',
      ],
      default: 'initiated',
      index: true,
    },
    payment: {
      gateway: {
        type: String,
        enum: ['razorpay', 'stripe', 'upi', 'manual', 'other'],
        default: 'razorpay',
      },
      status: {
        type: String,
        enum: ['not_started', 'pending', 'paid', 'failed', 'refunded'],
        default: 'not_started',
      },
      orderReference: { type: String, trim: true, maxlength: 140, index: true },
      paymentReference: { type: String, trim: true, maxlength: 140 },
      method: { type: String, trim: true, maxlength: 80 },
      paidAt: Date,
      webhookPayload: mongoose.Schema.Types.Mixed,
    },
    attribution: {
      source: {
        type: String,
        enum: ['direct', 'qr', 'social', 'poster', 'caption', 'website', 'referral', 'other'],
        default: 'direct',
      },
      sourceAssetId: { type: String, trim: true, maxlength: 80 },
      utm: {
        source: { type: String, trim: true, maxlength: 100 },
        medium: { type: String, trim: true, maxlength: 100 },
        campaign: { type: String, trim: true, maxlength: 120 },
        term: { type: String, trim: true, maxlength: 120 },
        content: { type: String, trim: true, maxlength: 120 },
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1600,
    },
    timeline: [
      {
        status: { type: String, trim: true, maxlength: 40 },
        note: { type: String, trim: true, maxlength: 200 },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

BusinessBuilderOrderSchema.index({ businessId: 1, createdAt: -1 });
BusinessBuilderOrderSchema.index({ miniAppId: 1, createdAt: -1 });
BusinessBuilderOrderSchema.index({ 'payment.orderReference': 1 });
BusinessBuilderOrderSchema.index({ 'attribution.source': 1, createdAt: -1 });

BusinessBuilderOrderSchema.pre('save', function updateTotals(next) {
  if (Array.isArray(this.items) && this.items.length > 0) {
    const computedSubtotal = this.items.reduce((sum, item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const lineTotal = quantity * unitPrice;
      item.total = Number.isFinite(lineTotal) && lineTotal >= 0 ? lineTotal : 0;
      return sum + item.total;
    }, 0);
    this.subtotalAmount = computedSubtotal;
  }

  const subtotal = Number(this.subtotalAmount || 0);
  const discount = Number(this.discountAmount || 0);
  const tax = Number(this.taxAmount || 0);
  this.totalAmount = Math.max(subtotal - discount + tax, 0);
  next();
});

BusinessBuilderOrderSchema.methods.pushStatus = function pushStatus(status, note = '') {
  this.status = status;
  this.timeline.push({
    status,
    note: String(note || '').slice(0, 200),
    at: new Date(),
  });
  return this;
};

module.exports = mongoose.model('BusinessBuilderOrder', BusinessBuilderOrderSchema);
