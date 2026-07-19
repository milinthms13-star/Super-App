const mongoose = require('mongoose');

const tutorFlashcardSchema = new mongoose.Schema({
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
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
  hint: {
    type: String,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  tags: [String],
  // Spaced Repetition System (SRS) fields
  interval: {
    type: Number,
    default: 0, // days until next review
  },
  repetition: {
    type: Number,
    default: 0, // number of consecutive correct responses
  },
  easeFactor: {
    type: Number,
    default: 2.5, // ease factor for SM-2 algorithm
  },
  nextReview: {
    type: Date,
    default: Date.now,
    index: true,
  },
  lastReviewed: {
    type: Date,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  correctCount: {
    type: Number,
    default: 0,
  },
  incorrectCount: {
    type: Number,
    default: 0,
  },
  averageConfidence: {
    type: Number,
    min: 1,
    max: 5,
  },
  status: {
    type: String,
    enum: ['new', 'learning', 'reviewing', 'mastered'],
    default: 'new',
    index: true,
  },
  archived: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes
tutorFlashcardSchema.index({ userId: 1, subject: 1 });
tutorFlashcardSchema.index({ userId: 1, status: 1 });
tutorFlashcardSchema.index({ userId: 1, nextReview: 1 });

// Virtual for mastery level
tutorFlashcardSchema.virtual('masteryLevel').get(function() {
  if (this.reviewCount === 0) return 0;
  const correctRate = this.correctCount / this.reviewCount;
  return Math.round(correctRate * 100);
});

// Method to record review
tutorFlashcardSchema.methods.recordReview = function(confidence) {
  // confidence: 1-5 (1: again, 2: hard, 3: good, 4: easy, 5: very easy)
  const quality = confidence;
  
  this.reviewCount += 1;
  this.lastReviewed = new Date();
  
  // Update SRS values using SM-2 algorithm
  let newInterval;
  let newRepetition = this.repetition;
  let newEaseFactor = this.easeFactor;
  
  if (quality >= 3) {
    // Correct response
    this.correctCount += 1;
    
    if (newRepetition === 0) {
      newInterval = 1;
    } else if (newRepetition === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(this.interval * newEaseFactor);
    }
    newRepetition = newRepetition + 1;
    
    // Update status
    if (newRepetition >= 5) {
      this.status = 'mastered';
    } else if (newRepetition >= 2) {
      this.status = 'reviewing';
    } else {
      this.status = 'learning';
    }
  } else {
    // Incorrect response
    this.incorrectCount += 1;
    newInterval = 1;
    newRepetition = 0;
    this.status = 'learning';
  }
  
  // Adjust ease factor
  newEaseFactor = newEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEaseFactor = Math.max(1.3, newEaseFactor);
  
  // Update fields
  this.interval = newInterval;
  this.repetition = newRepetition;
  this.easeFactor = newEaseFactor;
  this.nextReview = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000);
  
  // Update average confidence
  const confidenceSum = (this.averageConfidence || confidence) * (this.reviewCount - 1) + confidence;
  this.averageConfidence = confidenceSum / this.reviewCount;
  
  return this.save();
};

// Static method to get due flashcards
tutorFlashcardSchema.statics.getDue = async function(userId, limit = 20) {
  return this.find({
    userId,
    nextReview: { $lte: new Date() },
    archived: false,
  })
    .sort({ nextReview: 1 })
    .limit(limit);
};

// Static method to get statistics
tutorFlashcardSchema.statics.getStats = async function(userId) {
  const flashcards = await this.find({ userId, archived: false });
  
  return {
    total: flashcards.length,
    new: flashcards.filter(f => f.status === 'new').length,
    learning: flashcards.filter(f => f.status === 'learning').length,
    reviewing: flashcards.filter(f => f.status === 'reviewing').length,
    mastered: flashcards.filter(f => f.status === 'mastered').length,
    dueToday: flashcards.filter(f => f.nextReview <= new Date()).length,
    totalReviews: flashcards.reduce((sum, f) => sum + f.reviewCount, 0),
  };
};

module.exports = mongoose.model('TutorFlashcard', tutorFlashcardSchema);
