const mongoose = require('mongoose');

const tutorSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sessionId: {
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
    index: true,
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
    index: true,
  },
  learningGoal: {
    type: String,
    trim: true,
  },
  lessonContent: {
    title: String,
    introduction: String,
    sections: [{
      type: { type: String },
      title: String,
      content: mongoose.Schema.Types.Mixed,
      duration: Number,
      examples: [mongoose.Schema.Types.Mixed],
    }],
    keyTakeaways: [String],
    practiceQuestions: [String],
    realWorldApplication: String,
    nextTopic: String,
    estimatedTime: Number,
    prerequisites: [String],
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active',
    index: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  completedAt: {
    type: Date,
    index: true,
  },
  totalTimeSpent: {
    type: Number,
    default: 0, // in seconds
  },
  comprehensionScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  weakAreas: [String],
  studyPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyPlan',
  },
  metadata: {
    deviceType: String,
    browserInfo: String,
    location: String,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
tutorSessionSchema.index({ userId: 1, subject: 1 });
tutorSessionSchema.index({ userId: 1, status: 1 });
tutorSessionSchema.index({ userId: 1, startedAt: -1 });

// Virtual for duration
tutorSessionSchema.virtual('duration').get(function() {
  if (this.completedAt && this.startedAt) {
    return Math.floor((this.completedAt - this.startedAt) / 1000);
  }
  return 0;
});

// Method to mark session as completed
tutorSessionSchema.methods.markAsCompleted = function(comprehensionScore) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (comprehensionScore !== undefined) {
    this.comprehensionScore = comprehensionScore;
  }
  return this.save();
};

// Static method to get user statistics
tutorSessionSchema.statics.getUserStats = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const sessions = await this.find({
    userId,
    startedAt: { $gte: startDate },
  });
  
  const stats = {
    totalSessions: sessions.length,
    completedSessions: sessions.filter(s => s.status === 'completed').length,
    totalTimeSpent: sessions.reduce((sum, s) => sum + (s.totalTimeSpent || 0), 0),
    avgComprehensionScore: 0,
    subjectsStudied: [...new Set(sessions.map(s => s.subject))],
    topicsCompleted: sessions.filter(s => s.status === 'completed').length,
  };
  
  const completedSessions = sessions.filter(s => s.comprehensionScore !== undefined);
  if (completedSessions.length > 0) {
    stats.avgComprehensionScore = Math.round(
      completedSessions.reduce((sum, s) => sum + s.comprehensionScore, 0) / completedSessions.length
    );
  }
  
  return stats;
};

module.exports = mongoose.model('TutorSession', tutorSessionSchema);
