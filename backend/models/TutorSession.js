const mongoose = require('mongoose');

const tutorSessionSchema = new mongoose.Schema({
  sessionId: {
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
  subject: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  },
  learningGoal: {
    type: String,
  },
  lessonContent: {
    type: mongoose.Schema.Types.Mixed,
  },
  weakAreas: [String],
  progressRecords: [String],
  totalTimeSpent: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'paused'],
    default: 'in_progress',
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

tutorSessionSchema.index({ userEmail: 1, createdAt: -1 });
tutorSessionSchema.index({ subject: 1, topic: 1 });

module.exports = mongoose.model('TutorSession', tutorSessionSchema);
