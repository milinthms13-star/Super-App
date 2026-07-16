const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
  resultId: {
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
    index: true,
  },
  quizId: {
    type: String,
    required: true,
  },
  answers: [{
    questionId: String,
    selectedAnswer: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean,
  }],
  score: {
    type: Number,
    min: 0,
    max: 100,
  },
  correct: {
    type: Number,
    default: 0,
  },
  wrong: {
    type: Number,
    default: 0,
  },
  weakTopics: [String],
  detailedFeedback: [{
    questionId: String,
    question: String,
    yourAnswer: mongoose.Schema.Types.Mixed,
    correctAnswer: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean,
    explanation: String,
    topic: String,
  }],
  completedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

quizResultSchema.index({ userEmail: 1, completedAt: -1 });
quizResultSchema.index({ sessionId: 1 });

module.exports = mongoose.model('QuizResult', quizResultSchema);
