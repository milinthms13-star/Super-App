const mongoose = require('mongoose');

const astrologyWebhookAuditSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, trim: true, default: 'razorpay' },
    eventId: { type: String, required: true, trim: true },
    eventName: { type: String, default: '', trim: true, index: true },
    signature: { type: String, default: '', trim: true },
    signatureValid: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: [
        'received',
        'processed',
        'ignored',
        'duplicate',
        'invalid_signature',
        'invalid_payload',
        'error',
      ],
      default: 'received',
      index: true,
    },
    requestPath: { type: String, default: '', trim: true },
    orderId: { type: String, default: '', trim: true, index: true },
    paymentId: { type: String, default: '', trim: true, index: true },
    bookingId: { type: String, default: '', trim: true, index: true },
    payloadHash: { type: String, default: '', trim: true },
    payloadSize: { type: Number, default: 0, min: 0 },
    sourceIp: { type: String, default: '', trim: true },
    headersSnapshot: { type: Object, default: {} },
    metadata: { type: Object, default: {} },
    failureReason: { type: String, default: '', trim: true },
    replayCount: { type: Number, default: 0, min: 0 },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

astrologyWebhookAuditSchema.index({ provider: 1, eventId: 1 }, { unique: true });
astrologyWebhookAuditSchema.index({ createdAt: -1, status: 1 });

module.exports =
  mongoose.models.AstrologyWebhookAudit ||
  mongoose.model('AstrologyWebhookAudit', astrologyWebhookAuditSchema);
