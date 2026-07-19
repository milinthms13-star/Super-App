const mongoose = require('mongoose');

const tutorQuizSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
    unique: true,
    index: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  topic: {
    type: String,
    required: true,
    trim: true,
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'mixed'],
    default: 'beginner',
  },
  questions: [{
    id: { type: String, required: true },
    type: { type: String, enum: ['multiple-choice', 'true-false', 'short-answer'], default: 'multiple-choice' },
    question: { type: String, required: true },
    options: [String],
    correctAnswer: mongoose.Schema.Types.Mixed,
    explanation: String,
    difficulty: String,
    topic: String,
    concept: String,
    points: { type: Number, default: 5 },
  }],
  questionCount: {
    type: Number,
    required: true,
  },
  timeLimit: {
    type: Number, // in seconds
    default: 600,
  },
  passingScore: {
    type: Number,
    default: 70,
  },
  answers: [{
    questionId: String,
    selectedAnswer: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean,
    timeSpent: Number,
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
  pointsEarned: {
    type: Number,
    default: 0,
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'abandoned'],
    default: 'pending',
    index: true,
  },
  startedAt: {
    type: Date,
    index: true,
  },
  completedAt: {
    type: Date,
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0,
  },
  weakTopics: [String],
  topicPerformance: mongoose.Schema.Types.Mixed,
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
  },
}, {
  timestamps: true,
});

// Indexes
tutorQuizSchema.index({ userId: 1, subject: 1 });
tutorQuizSchema.index({ userId: 1, completedAt: -1 });
tutorQuizSchema.index({ userId: 1, status: 1 });

// Virtual for pass/fail
tutorQuizSchema.virtual('passed').get(function() {
  return this.score >= this.passingScore;
});

// Method to calculate score
tutorQuizSchema.methods.calculateScore = function() {
  if (!this.answers || this.answers.length === 0) {
    return 0;
  }
  
  const correct = this.answers.filter(a => a.isCorrect).length;
  this.correct = correct;
  this.wrong = this.answers.length - correct;
  this.score = Math.round((correct / this.answers.length) * 100);
  
  return this.score;
};

// Method to submit quiz
tutorQuizSchema.methods.submit = function(answers, feedback) {
  this.answers = answers;
  this.status = 'completed';
  this.completedAt = new Date();
  this.calculateScore();
  
  if (feedback) {
    this.feedback = feedback;
  }
  
  return this.save();
};

// Static method to get quiz history
tutorQuizSchema.statics.getHistory = async function(userId, filters = {}) {
  const query = { userId };
  
  if (filters.subject) query.subject = filters.subject;
  if (filters.status) query.status = filters.status;
  if (filters.fromDate) query.completedAt = { $gte: new Date(filters.fromDate) };
  
  return this.find(query)
    .sort({ completedAt: -1 })
    .limit(filters.limit || 20);
};

// Static method to get average score
tutorQuizSchema.statics.getAverageScore = async function(userId, subject = null) {
  const query = { userId, status: 'completed' };
  if (subject) query.subject = subject;
  
  const quizzes = await this.find(query);
  
  if (quizzes.length === 0) return 0;
  
  const totalScore = quizzes.reduce((sum, quiz) => sum + (quiz.score || 0), 0);
  return Math.round(totalScore / quizzes.length);
};

module.exports = mongoose.model('TutorQuiz', tutorQuizSchema);
