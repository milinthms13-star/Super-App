const mongoose = require('mongoose');

const DiaryEntryVersionSchema = new mongoose.Schema({
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
  versionNumber: {
    type: Number,
    required: true,
    // Compound index: entryId + versionNumber for quick retrieval
  },
  title: {
    type: String,
    maxlength: 200
  },
  content: {
    type: String
  },
  mood: {
    type: String,
    enum: ['happy', 'sad', 'angry', 'neutral', 'excited', 'anxious', 'grateful', 'inspired', 'stressed', 'calm']
  },
  category: {
    type: String,
    enum: ['personal', 'work', 'health', 'relationships', 'goals', 'learning']
  },
  tags: [
    {
      type: String,
      maxlength: 50
    }
  ],
  isDraft: {
    type: Boolean,
    default: false
  },
  attachments: [
    {
      fileName: String,
      fileUrl: String,
      fileType: String,
      fileSize: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  savedAt: {
    type: Date,
    default: Date.now
  },
  changeType: {
    type: String,
    enum: ['auto_save', 'manual_save', 'content_change', 'metadata_change'],
    default: 'manual_save'
  },
  changeDescription: String,
  // For tracking who initiated the save (in case of shared editing in future)
  savedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: function() { return this.userId; }
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
DiaryEntryVersionSchema.index({ entryId: 1, versionNumber: 1 });
DiaryEntryVersionSchema.index({ userId: 1, savedAt: -1 });

// TTL index: keep versions for 1 year (31536000 seconds), then auto-delete
DiaryEntryVersionSchema.index({ savedAt: 1 }, { expireAfterSeconds: 31536000 });

module.exports = mongoose.model('DiaryEntryVersion', DiaryEntryVersionSchema);
