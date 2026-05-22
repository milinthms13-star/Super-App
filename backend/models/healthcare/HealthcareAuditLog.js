const mongoose = require('mongoose');

const healthcareAuditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, trim: true, index: true },
    resourceType: { type: String, required: true, trim: true, index: true },
    resourceId: { type: String, required: true, trim: true, index: true },
    details: { type: String, default: '', trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

healthcareAuditLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('HealthcareAuditLog', healthcareAuditLogSchema);
