const mongoose = require('mongoose');

const studyPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  planId: {
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
  goal: {
    type: String,
    required: true,
    trim: true,
  },
  targetDate: {
    type: Date,
    required: true,
    index: true,
  },
  totalHours: {
    type: Number,
    required: true,
  },
  hoursPerWeek: {
    type: Number,
    required: true,
  },
  skillLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  },
  topics: [{
    name: { type: String, required: true },
    duration: Number,
    priority: Number,
    allocatedHours: Number,
    startWeek: Number,
    endWeek: Number,
    order: Number,
    completed: { type: Boolean, default: false },
    completedAt: Date,
    comprehensionScore: Number,
    keywords: [String],
    relatedTo: [String],
  }],
  milestones: [{
    week: Number,
    topics: [String],
    description: String,
    completed: { type: Boolean, default: false },
    completedAt: Date,
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'abandoned'],
    default: 'active',
    index: true,
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  hoursCompleted: {
    type: Number,
    default: 0,
  },
  topicsCompleted: {
    type: Number,
    default: 0,
  },
  currentWeek: {
    type: Number,
    default: 1,
  },
  adaptiveAdjustments: {
    type: Boolean,
    default: true,
  },
  adjustmentHistory: [{
    date: Date,
    type: String,
    description: String,
    impact: String,
  }],
  performance: {
    averageComprehension: { type: Number, default: 0 },
    topicsStruggling: [String],
    topicsExcelling: [String],
    recommendedPaceChange: String,
    recommendedDifficultyChange: String,
  },
  reminder: {
    enabled: { type: Boolean, default: true },
    frequency: { type: String, enum: ['daily', 'weekly', 'custom'], default: 'daily' },
    preferredTime: String,
    lastReminder: Date,
  },
}, {
  timestamps: true,
});

// Indexes
studyPlanSchema.index({ userId: 1, status: 1 });
studyPlanSchema.index({ userId: 1, targetDate: 1 });

// Virtual for days remaining
studyPlanSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const target = new Date(this.targetDate);
  const diffTime = target - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for is overdue
studyPlanSchema.virtual('isOverdue').get(function() {
  return new Date() > new Date(this.targetDate) && this.status !== 'completed';
});

// Method to update progress
studyPlanSchema.methods.updateProgress = function() {
  const totalTopics = this.topics.length;
  const completedTopics = this.topics.filter(t => t.completed).length;
  
  this.topicsCompleted = completedTopics;
  this.progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  
  // Check if plan is completed
  if (this.progress === 100) {
    this.status = 'completed';
  }
  
  return this.save();
};

// Method to complete topic
studyPlanSchema.methods.completeTopic = function(topicName, comprehensionScore) {
  const topic = this.topics.find(t => t.name === topicName);
  
  if (topic) {
    topic.completed = true;
    topic.completedAt = new Date();
    topic.comprehensionScore = comprehensionScore;
    
    // Update hours completed
    this.hoursCompleted += topic.allocatedHours || 0;
    
    // Check milestones
    this.milestones.forEach(milestone => {
      if (milestone.topics.includes(topicName)) {
        const allTopicsCompleted = milestone.topics.every(t => 
          this.topics.find(topic => topic.name === t && topic.completed)
        );
        if (allTopicsCompleted) {
          milestone.completed = true;
          milestone.completedAt = new Date();
        }
      }
    });
  }
  
  return this.updateProgress();
};

// Method to add adjustment
studyPlanSchema.methods.addAdjustment = function(type, description, impact) {
  this.adjustmentHistory.push({
    date: new Date(),
    type,
    description,
    impact,
  });
  
  return this.save();
};

// Method to analyze performance
studyPlanSchema.methods.analyzePerformance = function() {
  const completedTopics = this.topics.filter(t => t.completed && t.comprehensionScore !== undefined);
  
  if (completedTopics.length === 0) {
    return this;
  }
  
  const avgComprehension = completedTopics.reduce((sum, t) => sum + t.comprehensionScore, 0) / completedTopics.length;
  this.performance.averageComprehension = Math.round(avgComprehension);
  
  // Identify struggling topics (< 60% comprehension)
  this.performance.topicsStruggling = completedTopics
    .filter(t => t.comprehensionScore < 60)
    .map(t => t.name);
  
  // Identify excelling topics (> 85% comprehension)
  this.performance.topicsExcelling = completedTopics
    .filter(t => t.comprehensionScore > 85)
    .map(t => t.name);
  
  // Recommend pace adjustment
  if (avgComprehension > 85 && this.progress > 50) {
    this.performance.recommendedPaceChange = 'increase';
  } else if (avgComprehension < 60) {
    this.performance.recommendedPaceChange = 'decrease';
  } else {
    this.performance.recommendedPaceChange = 'maintain';
  }
  
  return this.save();
};

// Static method to get active plans
studyPlanSchema.statics.getActivePlans = async function(userId) {
  return this.find({
    userId,
    status: 'active',
    targetDate: { $gte: new Date() },
  }).sort({ targetDate: 1 });
};

// Static method to get overdue plans
studyPlanSchema.statics.getOverduePlans = async function(userId) {
  return this.find({
    userId,
    status: 'active',
    targetDate: { $lt: new Date() },
  }).sort({ targetDate: 1 });
};

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
