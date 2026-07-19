const mongoose = require('mongoose');

const tutorUserStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  // Learning Statistics
  totalSessions: {
    type: Number,
    default: 0,
  },
  completedSessions: {
    type: Number,
    default: 0,
  },
  totalTimeSpent: {
    type: Number,
    default: 0, // in seconds
  },
  avgSessionTime: {
    type: Number,
    default: 0, // in seconds
  },
  // Quiz Statistics
  totalQuizzes: {
    type: Number,
    default: 0,
  },
  perfectQuizzes: {
    type: Number,
    default: 0,
  },
  avgQuizScore: {
    type: Number,
    default: 0,
  },
  totalQuizPoints: {
    type: Number,
    default: 0,
  },
  // Interview Statistics
  totalInterviews: {
    type: Number,
    default: 0,
  },
  avgInterviewScore: {
    type: Number,
    default: 0,
  },
  excellentInterviews: {
    type: Number,
    default: 0, // score > 90
  },
  // Flashcard Statistics
  flashcardsCreated: {
    type: Number,
    default: 0,
  },
  flashcardsReviewed: {
    type: Number,
    default: 0,
  },
  flashcardsMastered: {
    type: Number,
    default: 0,
  },
  // Streak Information
  currentStreak: {
    type: Number,
    default: 0,
  },
  longestStreak: {
    type: Number,
    default: 0,
  },
  lastActivityDate: {
    type: Date,
  },
  streakHistory: [{
    date: { type: Date, default: Date.now },
    streak: Number,
  }],
  // Time-based Statistics
  earlyMorningSessions: {
    type: Number,
    default: 0, // before 8 AM
  },
  lateNightSessions: {
    type: Number,
    default: 0, // after 10 PM
  },
  weekendSessions: {
    type: Number,
    default: 0,
  },
  // Gamification
  totalPoints: {
    type: Number,
    default: 0,
  },
  level: {
    type: Number,
    default: 1,
  },
  nextLevelPoints: {
    type: Number,
    default: 100,
  },
  unlockedAchievements: [String],
  // Social Statistics
  studyGroupsJoined: {
    type: Number,
    default: 0,
  },
  studyGroupsCreated: {
    type: Number,
    default: 0,
  },
  groupMessagesPosted: {
    type: Number,
    default: 0,
  },
  // Subject Performance
  subjectStats: [{
    subject: String,
    totalSessions: Number,
    avgScore: Number,
    timeSpent: Number,
    lastStudied: Date,
    masteryLevel: {
      type: String,
      enum: ['novice', 'beginner', 'intermediate', 'proficient', 'expert'],
    },
  }],
  // Weekly/Monthly Summaries
  weeklyGoal: {
    hoursPerWeek: { type: Number, default: 5 },
    currentWeekHours: { type: Number, default: 0 },
    weekStartDate: Date,
  },
  monthlyStats: [{
    month: String, // YYYY-MM
    sessions: Number,
    timeSpent: Number,
    avgScore: Number,
    achievements: Number,
  }],
  // Preferences and Insights
  preferredStudyTime: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night'],
  },
  avgComprehensionScore: {
    type: Number,
    default: 0,
  },
  performanceTrend: {
    type: String,
    enum: ['improving', 'stable', 'declining', 'new'],
    default: 'new',
  },
}, {
  timestamps: true,
});

// Method to update streak
tutorUserStatsSchema.methods.updateStreak = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (!this.lastActivityDate) {
    this.currentStreak = 1;
    this.lastActivityDate = new Date();
  } else {
    const lastActivity = new Date(this.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Same day, no change
    } else if (diffDays === 1) {
      // Consecutive day
      this.currentStreak += 1;
      this.lastActivityDate = new Date();
    } else {
      // Streak broken
      this.currentStreak = 1;
      this.lastActivityDate = new Date();
    }
  }
  
  if (this.currentStreak > this.longestStreak) {
    this.longestStreak = this.currentStreak;
  }
  
  // Record in history
  this.streakHistory.push({
    date: new Date(),
    streak: this.currentStreak,
  });
  
  // Keep only last 365 days
  if (this.streakHistory.length > 365) {
    this.streakHistory = this.streakHistory.slice(-365);
  }
  
  return this.save();
};

// Method to add points
tutorUserStatsSchema.methods.addPoints = function(points) {
  this.totalPoints += points;
  
  // Calculate level
  const newLevel = Math.floor(Math.sqrt(this.totalPoints / 100)) + 1;
  if (newLevel > this.level) {
    this.level = newLevel;
  }
  
  this.nextLevelPoints = Math.pow(this.level, 2) * 100;
  
  return this.save();
};

// Method to update session stats
tutorUserStatsSchema.methods.recordSession = function(sessionData) {
  this.totalSessions += 1;
  
  if (sessionData.status === 'completed') {
    this.completedSessions += 1;
  }
  
  this.totalTimeSpent += sessionData.timeSpent || 0;
  this.avgSessionTime = Math.round(this.totalTimeSpent / this.totalSessions);
  
  // Update subject stats
  let subjectStat = this.subjectStats.find(s => s.subject === sessionData.subject);
  if (!subjectStat) {
    subjectStat = {
      subject: sessionData.subject,
      totalSessions: 0,
      avgScore: 0,
      timeSpent: 0,
      lastStudied: new Date(),
    };
    this.subjectStats.push(subjectStat);
  }
  
  subjectStat.totalSessions += 1;
  subjectStat.timeSpent += sessionData.timeSpent || 0;
  subjectStat.lastStudied = new Date();
  
  if (sessionData.comprehensionScore !== undefined) {
    const totalScore = subjectStat.avgScore * (subjectStat.totalSessions - 1) + sessionData.comprehensionScore;
    subjectStat.avgScore = Math.round(totalScore / subjectStat.totalSessions);
  }
  
  // Update time-based stats
  const hour = new Date().getHours();
  if (hour < 8) {
    this.earlyMorningSessions += 1;
  } else if (hour >= 22) {
    this.lateNightSessions += 1;
  }
  
  const day = new Date().getDay();
  if (day === 0 || day === 6) {
    this.weekendSessions += 1;
  }
  
  // Update weekly goal
  const now = new Date();
  if (!this.weeklyGoal.weekStartDate || 
      (now - new Date(this.weeklyGoal.weekStartDate)) > 7 * 24 * 60 * 60 * 1000) {
    this.weeklyGoal.weekStartDate = now;
    this.weeklyGoal.currentWeekHours = 0;
  }
  this.weeklyGoal.currentWeekHours += (sessionData.timeSpent || 0) / 3600;
  
  return this.save();
};

// Method to record quiz
tutorUserStatsSchema.methods.recordQuiz = function(quizData) {
  this.totalQuizzes += 1;
  
  if (quizData.score === 100) {
    this.perfectQuizzes += 1;
  }
  
  const totalScore = this.avgQuizScore * (this.totalQuizzes - 1) + quizData.score;
  this.avgQuizScore = Math.round(totalScore / this.totalQuizzes);
  
  this.totalQuizPoints += quizData.pointsEarned || 0;
  
  return this.save();
};

// Method to record interview
tutorUserStatsSchema.methods.recordInterview = function(interviewData) {
  this.totalInterviews += 1;
  
  if (interviewData.score > 90) {
    this.excellentInterviews += 1;
  }
  
  const totalScore = this.avgInterviewScore * (this.totalInterviews - 1) + interviewData.score;
  this.avgInterviewScore = Math.round(totalScore / this.totalInterviews);
  
  return this.save();
};

// Method to update monthly stats
tutorUserStatsSchema.methods.updateMonthlyStats = function(sessionData) {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  let monthlyStat = this.monthlyStats.find(m => m.month === currentMonth);
  if (!monthlyStat) {
    monthlyStat = {
      month: currentMonth,
      sessions: 0,
      timeSpent: 0,
      avgScore: 0,
      achievements: 0,
    };
    this.monthlyStats.push(monthlyStat);
  }
  
  monthlyStat.sessions += 1;
  monthlyStat.timeSpent += sessionData.timeSpent || 0;
  
  // Keep only last 12 months
  if (this.monthlyStats.length > 12) {
    this.monthlyStats = this.monthlyStats.slice(-12);
  }
  
  return this.save();
};

// Static method to get leaderboard
tutorUserStatsSchema.statics.getLeaderboard = async function(limit = 10, category = 'totalPoints') {
  const sortBy = {};
  sortBy[category] = -1;
  
  return this.find()
    .sort(sortBy)
    .limit(limit)
    .populate('userId', 'username email avatar');
};

module.exports = mongoose.model('TutorUserStats', tutorUserStatsSchema);
