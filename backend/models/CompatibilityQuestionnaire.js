const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  answer: {
    type: mongoose.Schema.Types.Mixed, // String, Number, Array for multi-select
    required: true
  },
  answeredAt: {
    type: Date,
    default: Date.now
  }
});

const compatibilityQuestionnaireSchema = new mongoose.Schema({
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatrimonialProfile',
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Personality & Values (10 questions)
  personalityAnswers: [answerSchema],
  
  // Lifestyle & Habits (10 questions)
  lifestyleAnswers: [answerSchema],
  
  // Family & Relationships (10 questions)
  familyAnswers: [answerSchema],
  
  // Career & Ambitions (8 questions)
  careerAnswers: [answerSchema],
  
  // Finance & Living (7 questions)
  financeAnswers: [answerSchema],
  
  // Future Plans (5 questions)
  futureAnswers: [answerSchema],
  
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  completedAt: {
    type: Date
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate compatibility score with another profile
compatibilityQuestionnaireSchema.methods.calculateCompatibility = function(otherQuestionnaire) {
  if (!otherQuestionnaire) {
    return { score: 0, breakdown: {} };
  }

  const categories = [
    { name: 'personality', answers: 'personalityAnswers', weight: 25 },
    { name: 'lifestyle', answers: 'lifestyleAnswers', weight: 20 },
    { name: 'family', answers: 'familyAnswers', weight: 20 },
    { name: 'career', answers: 'careerAnswers', weight: 15 },
    { name: 'finance', answers: 'financeAnswers', weight: 10 },
    { name: 'future', answers: 'futureAnswers', weight: 10 }
  ];

  let totalScore = 0;
  const breakdown = {};

  categories.forEach(category => {
    const myAnswers = this[category.answers] || [];
    const theirAnswers = otherQuestionnaire[category.answers] || [];
    
    let matchingAnswers = 0;
    let totalQuestions = Math.max(myAnswers.length, theirAnswers.length);
    
    if (totalQuestions === 0) {
      breakdown[category.name] = { score: 0, weight: category.weight };
      return;
    }

    myAnswers.forEach(myAnswer => {
      const theirAnswer = theirAnswers.find(a => a.questionId === myAnswer.questionId);
      if (theirAnswer) {
        // Compare answers
        if (Array.isArray(myAnswer.answer) && Array.isArray(theirAnswer.answer)) {
          // Multi-select comparison - check overlap
          const overlap = myAnswer.answer.filter(a => theirAnswer.answer.includes(a)).length;
          const maxLength = Math.max(myAnswer.answer.length, theirAnswer.answer.length);
          matchingAnswers += overlap / maxLength;
        } else if (myAnswer.answer === theirAnswer.answer) {
          matchingAnswers += 1;
        } else if (typeof myAnswer.answer === 'number' && typeof theirAnswer.answer === 'number') {
          // Numeric comparison - score based on proximity
          const diff = Math.abs(myAnswer.answer - theirAnswer.answer);
          const maxDiff = 10; // Assuming scale of 1-10
          matchingAnswers += Math.max(0, (maxDiff - diff) / maxDiff);
        }
      }
    });

    const categoryScore = (matchingAnswers / totalQuestions) * 100;
    breakdown[category.name] = {
      score: Math.round(categoryScore),
      weight: category.weight,
      weightedScore: Math.round((categoryScore * category.weight) / 100)
    };
    
    totalScore += breakdown[category.name].weightedScore;
  });

  return {
    score: Math.round(totalScore),
    breakdown,
    analysis: this.generateAnalysis(breakdown)
  };
};

// Generate compatibility analysis
compatibilityQuestionnaireSchema.methods.generateAnalysis = function(breakdown) {
  const analysis = {
    strengths: [],
    concerns: [],
    recommendations: []
  };

  Object.entries(breakdown).forEach(([category, data]) => {
    if (data.score >= 75) {
      analysis.strengths.push(`Strong compatibility in ${category}`);
    } else if (data.score < 50) {
      analysis.concerns.push(`Consider discussing ${category} expectations`);
    }
  });

  if (analysis.strengths.length === 0) {
    analysis.recommendations.push('Consider having detailed conversations about your goals and values');
  }
  if (analysis.concerns.length > 3) {
    analysis.recommendations.push('Multiple areas need alignment - take time to understand each other');
  }

  return analysis;
};

// Update completion percentage
compatibilityQuestionnaireSchema.methods.updateCompletion = function() {
  const totalQuestions = 50;
  const allAnswers = [
    ...this.personalityAnswers,
    ...this.lifestyleAnswers,
    ...this.familyAnswers,
    ...this.careerAnswers,
    ...this.financeAnswers,
    ...this.futureAnswers
  ];
  
  this.completionPercentage = Math.round((allAnswers.length / totalQuestions) * 100);
  this.lastUpdated = new Date();
  
  if (this.completionPercentage === 100 && !this.completedAt) {
    this.completedAt = new Date();
  }
};

// Pre-save hook
compatibilityQuestionnaireSchema.pre('save', function(next) {
  this.updateCompletion();
  next();
});

module.exports = mongoose.model('CompatibilityQuestionnaire', compatibilityQuestionnaireSchema);
