const mongoose = require('mongoose');

/**
 * DiaryVersionTag - Tags for categorizing and marking important versions
 * Enables quick filtering and organization of version history
 */
const DiaryVersionTagSchema = new mongoose.Schema({
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
    required: true
  },
  versionNumber: {
    type: Number,
    required: true
  },
  // Tag name (predefined or custom)
  name: {
    type: String,
    required: true,
    maxlength: 50,
    trim: true,
    lowercase: true,
    enum: [
      'final',
      'review-ready',
      'archive',
      'important',
      'draft',
      'shared',
      'bookmarked',
      'custom'
    ]
  },
  // Display color for UI
  color: {
    type: String,
    default: '#667eea',
    match: /^#[0-9A-Fa-f]{6}$/
  },
  // Custom tag description
  description: {
    type: String,
    maxlength: 200,
    trim: true
  },
  // Tag priority (for sorting)
  priority: {
    type: Number,
    default: 0
  },
  // When tag was applied
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Optional: reason for tagging
  reason: {
    type: String,
    maxlength: 500,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
DiaryVersionTagSchema.index({ entryId: 1, versionId: 1 });
DiaryVersionTagSchema.index({ userId: 1, name: 1, createdAt: -1 });
DiaryVersionTagSchema.index({ entryId: 1, name: 1 });

// Unique constraint: one tag per version
DiaryVersionTagSchema.index(
  { entryId: 1, versionId: 1, name: 1 },
  { unique: true }
);

module.exports = mongoose.model('DiaryVersionTag', DiaryVersionTagSchema);
