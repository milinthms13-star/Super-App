const mongoose = require('mongoose');

/**
 * AbuseReport Model - Phase 2 Feature 3
 * Tracks user-submitted abuse reports for moderation
 * 
 * Fields:
 * - reportedBy: User who filed the report
 * - reportedUser: User being reported
 * - reportedMessage: Message or content being reported (if applicable)
 * - reason: Category of abuse (harassment, spam, NSFW, fraud, other)
 * - description: Detailed description from reporter
 * - status: Investigation status (pending, investigating, resolved, dismissed)
 * - priority: Moderation priority (low, medium, high, critical)
 * - resolution: How it was resolved
 * - evidence: Attachments/links to support report
 */

const abuseReportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reportedMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      index: true,
      description: 'Message being reported (if applicable)'
    },
    reason: {
      type: String,
      enum: ['harassment', 'spam', 'nsfw', 'fraud', 'violence', 'hate_speech', 'other'],
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ['pending', 'investigating', 'resolved', 'dismissed', 'appeal_pending'],
      default: 'pending',
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
      description: 'Moderation priority level'
    },
    resolution: {
      type: String,
      enum: ['user_warned', 'message_removed', 'user_suspended', 'user_banned', 'dismissed_false_report'],
      description: 'Action taken'
    },
    evidence: {
      screenshots: [String], // URLs to uploaded screenshots
      messageContent: String, // Original message content (if encrypted, stored for reference)
      additionalNotes: String
    },
    moderator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      description: 'Admin who handled the report'
    },
    moderationNotes: {
      type: String,
      maxlength: 500,
      description: 'Internal notes from moderator'
    },
    investigatedAt: Date,
    resolvedAt: Date,
    resolutionDetails: {
      actionTaken: String,
      warnings: Number,
      suspensionDays: Number,
      messageRemoved: Boolean,
      appealable: Boolean
    },
    // Appeal mechanism
    appealStatus: {
      type: String,
      enum: ['not_appealed', 'pending', 'approved', 'rejected'],
      default: 'not_appealed'
    },
    appeal: {
      appealedBy: mongoose.Schema.Types.ObjectId,
      appealedAt: Date,
      appealReason: String,
      appealResponse: String,
      respondedAt: Date
    },
    // Metrics
    relatedReports: [mongoose.Schema.Types.ObjectId], // Other reports against same user
    reportScore: {
      type: Number,
      default: 0,
      description: 'Confidence score of report validity'
    }
  },
  {
    timestamps: true,
    collection: 'abuse_reports'
  }
);

// Indexes
abuseReportSchema.index({ reportedBy: 1, createdAt: -1 });
abuseReportSchema.index({ reportedUser: 1, status: 1 });
abuseReportSchema.index({ status: 1, priority: 1 });
abuseReportSchema.index({ createdAt: -1 });
abuseReportSchema.index({ reason: 1, status: 1 });

// Static Methods

/**
 * Create abuse report
 */
abuseReportSchema.statics.createReport = async function(reportData) {
  try {
    const report = new this({
      reportedBy: reportData.reportedBy,
      reportedUser: reportData.reportedUser,
      reportedMessage: reportData.reportedMessage,
      reason: reportData.reason,
      description: reportData.description,
      priority: this._calculatePriority(reportData.reason),
      evidence: reportData.evidence || {}
    });

    await report.save();
    return report;
  } catch (error) {
    throw error;
  }
};

/**
 * Get pending reports for moderation queue
 */
abuseReportSchema.statics.getPendingReports = async function(limit = 20) {
  return this.find({ status: 'pending' })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit)
    .populate('reportedBy', 'name email')
    .populate('reportedUser', 'name email')
    .populate('reportedMessage', 'content');
};

/**
 * Get reports by user (for profile/history)
 */
abuseReportSchema.statics.getReportsByUser = async function(userId) {
  return this.find({ reportedUser: userId })
    .sort({ createdAt: -1 })
    .select('reason status resolution createdAt resolvedAt');
};

/**
 * Update report status
 */
abuseReportSchema.statics.updateStatus = async function(reportId, status, moderatorId, notes) {
  return this.findByIdAndUpdate(
    reportId,
    {
      status,
      moderator: moderatorId,
      moderationNotes: notes,
      investigatedAt: new Date()
    },
    { new: true }
  );
};

/**
 * Resolve report
 */
abuseReportSchema.statics.resolveReport = async function(reportId, resolution, resolutionDetails, moderatorId) {
  return this.findByIdAndUpdate(
    reportId,
    {
      status: 'resolved',
      resolution,
      resolutionDetails,
      moderator: moderatorId,
      resolvedAt: new Date()
    },
    { new: true }
  );
};

/**
 * Get abuse statistics
 */
abuseReportSchema.statics.getAbuseStats = async function(days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$reason',
        count: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        resolved: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Instance Methods

/**
 * Check if report can be appealed
 */
abuseReportSchema.methods.canAppeal = function() {
  return this.status === 'resolved' && !this.resolutionDetails?.appealable === false;
};

/**
 * Submit appeal
 */
abuseReportSchema.methods.submitAppeal = function(appealReason) {
  if (!this.canAppeal()) {
    throw new Error('This report cannot be appealed');
  }

  this.appealStatus = 'pending';
  this.appeal = {
    appealedBy: this.reportedUser,
    appealedAt: new Date(),
    appealReason
  };

  return this.save();
};

/**
 * Respond to appeal
 */
abuseReportSchema.methods.respondToAppeal = function(approved, response) {
  if (this.appealStatus !== 'pending') {
    throw new Error('Appeal is not pending');
  }

  this.appealStatus = approved ? 'approved' : 'rejected';
  this.appeal.appealResponse = response;
  this.appeal.respondedAt = new Date();

  return this.save();
};

/**
 * Helper: Calculate priority based on reason
 */
abuseReportSchema.statics._calculatePriority = function(reason) {
  const priorityMap = {
    'violence': 'critical',
    'hate_speech': 'critical',
    'fraud': 'high',
    'harassment': 'high',
    'nsfw': 'medium',
    'spam': 'low',
    'other': 'low'
  };
  return priorityMap[reason] || 'medium';
};

module.exports = mongoose.model('AbuseReport', abuseReportSchema);
