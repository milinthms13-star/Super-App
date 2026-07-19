const mongoose = require('mongoose');

const tutorAchievementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  achievementId: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: '🏆',
  },
  category: {
    type: String,
    enum: ['learning', 'quiz', 'streak', 'social', 'interview', 'milestone', 'special'],
    default: 'learning',
    index: true,
  },
  points: {
    type: Number,
    required: true,
    default: 0,
  },
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common',
  },
  unlocked: {
    type: Boolean,
    default: false,
    index: true,
  },
  unlockedAt: {
    type: Date,
    index: true,
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  requirement: {
    type: String,
  },
  shared: {
    type: Boolean,
    default: false,
  },
  sharedAt: {
    type: Date,
  },
  metadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
});

// Compound index
tutorAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
tutorAchievementSchema.index({ userId: 1, unlocked: 1 });
tutorAchievementSchema.index({ userId: 1, category: 1 });

// Method to unlock achievement
tutorAchievementSchema.methods.unlock = function() {
  if (!this.unlocked) {
    this.unlocked = true;
    this.unlockedAt = new Date();
    this.progress = 100;
  }
  return this.save();
};

// Method to update progress
tutorAchievementSchema.methods.updateProgress = function(newProgress) {
  this.progress = Math.min(100, Math.max(0, newProgress));
  
  if (this.progress >= 100 && !this.unlocked) {
    return this.unlock();
  }
  
  return this.save();
};

// Static method to get unlocked achievements
tutorAchievementSchema.statics.getUnlocked = async function(userId) {
  return this.find({ userId, unlocked: true }).sort({ unlockedAt: -1 });
};

// Static method to get achievements in progress
tutorAchievementSchema.statics.getInProgress = async function(userId) {
  return this.find({
    userId,
    unlocked: false,
    progress: { $gt: 0 },
  }).sort({ progress: -1 });
};

// Static method to get achievements by category
tutorAchievementSchema.statics.getByCategory = async function(userId, category) {
  return this.find({ userId, category }).sort({ unlockedAt: -1, progress: -1 });
};

// Static method to get total points earned
tutorAchievementSchema.statics.getTotalPoints = async function(userId) {
  const achievements = await this.find({ userId, unlocked: true });
  return achievements.reduce((sum, ach) => sum + ach.points, 0);
};

module.exports = mongoose.model('TutorAchievement', tutorAchievementSchema);
