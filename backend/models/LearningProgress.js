const mongoose = require('mongoose');

const learningProgressSchema = new mongoose.Schema({
  progressId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userEmail: {
    type: String,
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  subject: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  lessonSection: {
    type: String,
  },
  timeSpent: {
    type: Number,
    default: 0,
  },
  comprehensionScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  notes: {
    type: String,
  },
  recordedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

learningProgressSchema.index({ userEmail: 1, recordedAt: -1 });
learningProgressSchema.index({ subject: 1, topic: 1 });
learningProgressSchema.index({ sessionId: 1 });

module.exports = mongoose.model('LearningProgress', learningProgressSchema);
