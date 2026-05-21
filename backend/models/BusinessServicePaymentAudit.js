const mongoose = require('mongoose');

const businessServicePaymentAuditSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, trim: true, index: true },
    paymentId: { type: String, default: '', trim: true, index: true },
    action: { type: String, required: true, trim: true, index: true },
    status: { type: String, required: true, trim: true, index: true },
    actorEmail: { type: String, default: '', trim: true, lowercase: true, index: true },
    actorRole: { type: String, default: '', trim: true },
    gateway: { type: String, default: '', trim: true, index: true },
    idempotencyKey: { type: String, default: '', trim: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

businessServicePaymentAuditSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $exists: true, $type: 'string', $ne: '' } },
  }
);
businessServicePaymentAuditSchema.index({ orderId: 1, action: 1, createdAt: -1 });

module.exports = mongoose.model('BusinessServicePaymentAudit', businessServicePaymentAuditSchema);
