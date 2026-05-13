const mongoose = require('mongoose');

const financeAuditLogSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      enum: [
        'eligibility_saved',
        'lead_created',
        'consultant_assigned',
        'lead_status_updated',
        'commission_updated',
        'data_deletion_requested',
      ],
      required: true,
      index: true,
    },
    actorRole: { type: String, default: 'system', trim: true },
    actorName: { type: String, default: 'System', trim: true },
    leadId: { type: String, default: '', trim: true, index: true },
    institutionId: { type: String, default: '', trim: true, index: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: '', trim: true },
    userAgent: { type: String, default: '', trim: true },
    timestamp: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true }
);

financeAuditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('FinanceAuditLog', financeAuditLogSchema);
