const mongoose = require('mongoose');

/**
 * SpamReport Schema
 * Tracks spam detection results and abuse reports for SOS incidents
 */
const spamReportSchema = new mongoose.Schema(
  {
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SosIncident',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Automated detection
    automatedDetection: {
      enabled: {
        type: Boolean,
        default: true,
      },
      score: {
        type: Number,
        min: 0,
        max: 1,
        required: true, // 0-1 spam score
      },
      level: {
        type: String,
        enum: ['clean', 'suspicious', 'spam'],
        required: true,
      },
      reasons: [String],
      breakdown: {
        frequencyScore: Number,
        timePatternScore: Number,
        locationScore: Number,
        contentScore: Number,
        behaviorScore: Number,
      },
      detectedAt: {
        type: Date,
        default: Date.now,
      },
    },
    // Manual reports from community
    manualReports: {
      count: {
        type: Number,
        default: 0,
      },
      reports: [
        {
          reportedBy: mongoose.Schema.Types.ObjectId,
          reason: {
            type: String,
            enum: ['false_alarm', 'location_spoof', 'test_alert', 'abuse', 'other'],
          },
          description: String,
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    // Admin review
    adminReview: {
      status: {
        type: String,
        enum: ['pending', 'reviewed', 'appealed'],
        default: 'pending',
      },
      verdict: {
        type: String,
        enum: ['false_alarm', 'legitimate', 'malicious', 'pending'],
        default: 'pending',
      },
      reviewer: mongoose.Schema.Types.ObjectId,
      notes: String,
      reviewedAt: Date,
    },
    // Action taken
    action: {
      type: {
        type: String,
        enum: ['none', 'flagged', 'deleted', 'user_warned', 'user_suspended', 'user_banned'],
        default: 'none',
      },
      reason: String,
      details: mongoose.Schema.Types.Mixed,
      takenAt: Date,
      takenBy: mongoose.Schema.Types.ObjectId,
    },
    // Statistics
    stats: {
      contactsNotified: {
        type: Number,
        default: 0,
      },
      resourcesWasted: {
        type: String,
        enum: ['police', 'ambulance', 'fire', 'volunteers', 'none'],
      },
      severity: {
        type: String,
        enum: ['minor', 'moderate', 'severe'],
      },
    },
    // Appeal process
    appeal: {
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none',
      },
      message: String,
      submittedAt: Date,
      reviewedAt: Date,
      decisionBy: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

// Indexes
spamReportSchema.index({ incidentId: 1 });
spamReportSchema.index({ userId: 1, createdAt: -1 });
spamReportSchema.index({ 'automatedDetection.level': 1 });
spamReportSchema.index({ 'action.type': 1 });
spamReportSchema.index({ 'adminReview.status': 1 });

module.exports = mongoose.model('SpamReport', spamReportSchema);
