const mongoose = require('mongoose');

const freelancerPaymentEventSchema = new mongoose.Schema(
  {
    eventCode: { type: String, trim: true, required: true, unique: true, index: true },
    bookingCode: { type: String, trim: true, default: '', index: true },
    eventType: { type: String, trim: true, required: true, index: true },
    amount: { type: Number, min: 0, default: 0 },
    status: { type: String, trim: true, default: '' },
    source: { type: String, trim: true, default: 'system', index: true },
    idempotencyKey: { type: String, trim: true, default: '', index: true },
    externalEventId: { type: String, trim: true, default: undefined },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

freelancerPaymentEventSchema.index(
  { externalEventId: 1 },
  {
    unique: true,
    partialFilterExpression: { externalEventId: { $exists: true, $type: 'string', $ne: '' } },
  }
);
freelancerPaymentEventSchema.index({ bookingCode: 1, createdAt: -1 });

module.exports = mongoose.model('FreelancerPaymentEvent', freelancerPaymentEventSchema);
