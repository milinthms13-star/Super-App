const mongoose = require('mongoose');

const SocialReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportedObject: {
      type: {
        type: String,
        enum: ['post', 'comment', 'user', 'message'],
        required: true,
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
    },
    reportReason: {
      type: String,
      enum: [
        'spam',
        'harassment',
        'hate_speech',
        'violence',
        'sexual_content',
        'misinformation',
        'copyright',
        'impersonation',
        'scam',
        'other',
      ],
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    evidenceUrls: [String],
    status: {
      type: String,
      enum: ['pending', 'under_review', 'resolved', 'dismissed', 'action_taken'],
      default: 'pending',
      index: true,
    },
    moderationNotes: String,
    actionTaken: {
      type: String,
      enum: [
        'none',
        'warning',
        'content_removed',
        'account_suspended',
        'account_banned',
      ],
      default: 'none',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialReport',
    },
  },
  {
    timestamps: true,
    index: [
      { status: 1, createdAt: -1 },
      { 'reportedObject.type': 1, 'reportedObject.id': 1 },
      { reporter: 1 },
    ],
  }
);

module.exports = mongoose.model('SocialReport', SocialReportSchema);
