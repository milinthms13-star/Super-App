const mongoose = require('mongoose');

const BusinessBuilderWebhookAuditSchema = new mongoose.Schema({
  webhookId: { type: String, required: true, unique: true },
  receivedAt: { type: Date, default: Date.now },
  source: { type: String, default: 'business-builder' },
  headers: { type: Object, default: {} },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  rawPayload: { type: Object, default: {} },
  processed: { type: Boolean, default: false },
  processedAt: { type: Date },
  processingResult: { type: Object },
  error: { type: String, default: '' },
});

BusinessBuilderWebhookAuditSchema.index({ webhookId: 1 });
BusinessBuilderWebhookAuditSchema.index({ receivedAt: -1 });

module.exports = mongoose.model('BusinessBuilderWebhookAudit', BusinessBuilderWebhookAuditSchema);
