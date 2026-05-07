const mongoose = require('mongoose');

/**
 * DiaryVersionComment - Comments on specific diary entry versions
 * Allows users to annotate, discuss, and document version changes
 */
const DiaryVersionCommentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  entryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DiaryEntry',
    required: true,
    index: true
  },
  versionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DiaryEntryVersion',
    required: true,
    index: true
  },
  versionNumber: {
    type: Number,
    required: true
  },
  // Comment content
  text: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true
  },
  // Optional: reference to specific line/content section
  lineReference: {
    type: String,
    maxlength: 500
  },
  // Comment visibility
  isPrivate: {
    type: Boolean,
    default: false
  },
  // Threading support: parent comment for replies
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DiaryVersionComment',
    sparse: true
  },
  // Comment metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  // Sentiment/tone tracking (for future AI analysis)
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },
  // Like/reaction count
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
DiaryVersionCommentSchema.index({ entryId: 1, versionId: 1, createdAt: -1 });
DiaryVersionCommentSchema.index({ userId: 1, createdAt: -1 });
DiaryVersionCommentSchema.index({ versionId: 1, isDeleted: 1 });

// Virtual for reply count
DiaryVersionCommentSchema.virtual('replyCount').get(function() {
  // Will be populated by aggregation queries
  return this._replyCount || 0;
});

module.exports = mongoose.model('DiaryVersionComment', DiaryVersionCommentSchema);
