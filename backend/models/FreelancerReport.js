const mongoose = require('mongoose');

const freelancerReportSchema = new mongoose.Schema(
  {
    reportCode: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    targetType: { type: String, enum: ['provider', 'customer', 'job', 'booking'], required: true, index: true },
    targetId: { type: String, required: true, trim: true, index: true },
    reportedByName: { type: String, trim: true, default: '' },
    reportedByPhone: { type: String, trim: true, default: '' },
    reason: { type: String, trim: true, required: true },
    details: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['open', 'reviewed', 'actioned', 'dismissed'], default: 'open', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FreelancerReport', freelancerReportSchema);
