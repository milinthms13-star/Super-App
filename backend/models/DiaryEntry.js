const mongoose = require('mongoose');

const diaryEntrySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 50000
  },
  mood: {
    type: String,
    enum: ['very_sad', 'sad', 'neutral', 'happy', 'very_happy'],
    default: 'neutral'
  },
  category: {
    type: String,
    enum: ['Personal', 'Work', 'Travel', 'Health', 'Relationships', 'Other'],
    default: 'Personal'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isDraft: {
    type: Boolean,
    default: false
  },
  isPrivate: {
    type: Boolean,
    default: true
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'audio', 'video']
    },
    url: String,
    fileName: String,
    fileSize: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  entryDate: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
diaryEntrySchema.index({ userId: 1, createdAt: -1 });
diaryEntrySchema.index({ userId: 1, entryDate: -1 });
diaryEntrySchema.index({ userId: 1, category: 1 });
diaryEntrySchema.index({ userId: 1, tags: 1 });
diaryEntrySchema.index({ userId: 1, mood: 1 });

// Virtual for formatted date
diaryEntrySchema.virtual('formattedDate').get(function() {
  if (!this.createdAt) return '';
  return this.createdAt.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

module.exports = mongoose.model('DiaryEntry', diaryEntrySchema);
