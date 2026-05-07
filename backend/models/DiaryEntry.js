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
  shareToken: {
    type: String,
    sparse: true
  },
  passwordHash: {
    type: String
  },
  shareExpiresAt: {
    type: Date
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
  },
  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Auto-permanently delete after 30 days
  permanentlyDeleteAt: Date,
  // For recovery: store the last known version
  lastVersionBeforeDeletion: mongoose.Schema.Types.ObjectId,
  // End-to-end encryption fields
  isEncrypted: {
    type: Boolean,
    default: false,
    index: true
  },
  encryptionKeyId: {
    type: String,
    sparse: true
  },
  // Encrypted content (only populated if isEncrypted = true)
  encryptedData: {
    iv: String, // Initialization vector (hex)
    authTag: String, // Authentication tag for GCM (hex)
    encryptedContent: String, // Encrypted entry data (hex)
    algorithm: {
      type: String,
      default: 'aes-256-gcm'
    }
  },
  // Content hash for integrity verification
  contentHash: String,
  // AI Summary cache (refreshed periodically)
  aiSummary: {
    summary: String,
    generatedAt: Date,
    expiresAt: Date
  },
  // Mood analysis cache
  emotionalAnalysis: {
    dominantEmotion: String,
    sentimentScore: Number,
    themes: [String],
    analyzedAt: Date
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

// Text index for full-text search on title and content
diaryEntrySchema.index(
  { title: 'text', content: 'text' },
  {
    weights: { title: 10, content: 5 },
    name: 'diary_text_search',
    background: true
  }
);

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

// Post-save hook to update streaks
diaryEntrySchema.post('save', async function() {
  if (this.isDraft || this.isDeleted) return; // Only update for published entries

  try {
    const DiaryStreak = require('./DiaryStreak');
    await DiaryStreak.updateStreak(this.userId, this.entryDate || this.createdAt);
  } catch (error) {
    // Log but don't throw - streak updates shouldn't block entry saves
    console.error('Failed to update streak:', error.message);
  }
});

module.exports = mongoose.model('DiaryEntry', diaryEntrySchema);
