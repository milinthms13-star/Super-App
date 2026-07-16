const mongoose = require('mongoose');

const interviewPracticeSchema = new mongoose.Schema({
  practiceId: {
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
  role: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  response: {
    type: String,
    required: true,
  },
  evaluation: {
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    strengths: [String],
    improvements: [String],
    sampleAnswer: String,
  },
  timeSpent: {
    type: Number,
    default: 0,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

interviewPracticeSchema.index({ userEmail: 1, completedAt: -1 });
interviewPracticeSchema.index({ role: 1 });

module.exports = mongoose.model('InterviewPractice', interviewPracticeSchema);
