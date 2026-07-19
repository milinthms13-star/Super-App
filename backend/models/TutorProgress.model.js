const mongoose = require('mongoose');

const tutorProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  lessonSection: {
    type: String,
    required: true,
    trim: true,
  },
  timeSpent: {
    type: Number,
    required: true,
    min: 0, // in seconds
  },
  comprehensionScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
  },
  completed: {
    type: Boolean,
    default: false,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  lastReviewed: {
    type: Date,
  },
  recordedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound indexes
tutorProgressSchema.index({ userId: 1, sessionId: 1 });
tutorProgressSchema.index({ userId: 1, recordedAt: -1 });

// Method to mark as reviewed
tutorProgressSchema.methods.markAsReviewed = function() {
  this.reviewCount += 1;
  this.lastReviewed = new Date();
  return this.save();
};

// Static method to get weak areas
tutorProgressSchema.statics.getWeakAreas = async function(userId, limit = 5) {
  const weakAreas = await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        comprehensionScore: { $lt: 70 },
      },
    },
    {
      $group: {
        _id: '$lessonSection',
        avgScore: { $avg: '$comprehensionScore' },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { avgScore: 1, count: -1 },
    },
    {
      $limit: limit,
    },
  ]);
  
  return weakAreas.map(area => ({
    topic: area._id,
    averageScore: Math.round(area.avgScore),
    attempts: area.count,
  }));
};

// Static method to get mastery levels
tutorProgressSchema.statics.getMasteryLevels = async function(userId) {
  const masteryData = await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: '$lessonSection',
        avgScore: { $avg: '$comprehensionScore' },
        totalTime: { $sum: '$timeSpent' },
        attempts: { $sum: 1 },
      },
    },
    {
      $project: {
        topic: '$_id',
        avgScore: 1,
        totalTime: 1,
        attempts: 1,
        masteryLevel: {
          $switch: {
            branches: [
              { case: { $gte: ['$avgScore', 90] }, then: 'expert' },
              { case: { $gte: ['$avgScore', 75] }, then: 'proficient' },
              { case: { $gte: ['$avgScore', 60] }, then: 'intermediate' },
              { case: { $gte: ['$avgScore', 40] }, then: 'beginner' },
            ],
            default: 'novice',
          },
        },
      },
    },
    {
      $sort: { avgScore: -1 },
    },
  ]);
  
  return masteryData;
};

module.exports = mongoose.model('TutorProgress', tutorProgressSchema);
