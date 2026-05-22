const mongoose = require('mongoose');

const jobReportSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      trim: true,
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    riskCategories: [
      {
        type: String,
        trim: true,
      },
    ],
    moderationStatus: {
      type: String,
      enum: ['pending', 'in_review', 'resolved', 'dismissed', 'escalated'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolutionNote: {
      type: String,
      trim: true,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

jobReportSchema.index({ moderationStatus: 1, priority: 1, createdAt: -1 });
jobReportSchema.index({ riskLevel: 1, createdAt: -1 });
jobReportSchema.index({ jobId: 1, createdAt: -1 });

module.exports = mongoose.model('JobReport', jobReportSchema);
