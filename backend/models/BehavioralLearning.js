const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  targetProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatrimonialProfile',
    required: true
  },
  interactionType: {
    type: String,
    enum: ['view', 'like', 'skip', 'interest_sent', 'interest_accepted', 'interest_rejected', 
           'chat_initiated', 'profile_saved', 'profile_blocked', 'meeting_scheduled'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  duration: Number, // seconds spent viewing profile
  metadata: {
    searchContext: String, // how they found this profile
    deviceType: String,
    source: String // 'search', 'recommendation', 'saved'
  }
});

const preferencePatternSchema = new mongoose.Schema({
  attribute: {
    type: String,
    required: true // e.g., 'height', 'education', 'profession', 'location'
  },
  values: [{
    value: mongoose.Schema.Types.Mixed,
    frequency: {
      type: Number,
      default: 1
    },
    lastSeen: Date
  }],
  weightage: {
    type: Number,
    default: 1,
    min: 0,
    max: 10
  }
});

const behavioralLearningSchema = new mongoose.Schema({
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
  
  // Interaction history (last 500 interactions)
  interactions: [interactionSchema],
  
  // Learned preference patterns
  preferencePatterns: [preferencePatternSchema],
  
  // Statistical analysis
  statistics: {
    totalViews: {
      type: Number,
      default: 0
    },
    totalLikes: {
      type: Number,
      default: 0
    },
    totalSkips: {
      type: Number,
      default: 0
    },
    interestsSent: {
      type: Number,
      default: 0
    },
    interestsAccepted: {
      type: Number,
      default: 0
    },
    interestsRejected: {
      type: Number,
      default: 0
    },
    averageViewDuration: {
      type: Number,
      default: 0
    },
    likeToViewRatio: {
      type: Number,
      default: 0
    },
    acceptanceRate: {
      type: Number,
      default: 0
    }
  },
  
  // Deal breakers (patterns from rejections)
  dealBreakers: [{
    attribute: String,
    value: mongoose.Schema.Types.Mixed,
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    detectedAt: Date
  }],
  
  // Ideal match profile (ML-derived)
  idealProfile: {
    ageRange: {
      min: Number,
      max: Number
    },
    heightRange: {
      min: Number,
      max: Number
    },
    educationLevels: [String],
    professions: [String],
    locations: [String],
    religions: [String],
    castes: [String],
    maritalStatuses: [String],
    updatedAt: Date
  },
  
  // Engagement metrics
  engagementScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  lastAnalyzedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
behavioralLearningSchema.index({ profileId: 1 });
behavioralLearningSchema.index({ 'interactions.timestamp': -1 });

// Log interaction
behavioralLearningSchema.methods.logInteraction = function(targetProfileId, interactionType, duration = 0, metadata = {}) {
  this.interactions.push({
    targetProfileId,
    interactionType,
    timestamp: new Date(),
    duration,
    metadata
  });

  // Keep only last 500 interactions
  if (this.interactions.length > 500) {
    this.interactions = this.interactions.slice(-500);
  }

  // Update statistics
  this.updateStatistics(interactionType, duration);
};

// Update statistics
behavioralLearningSchema.methods.updateStatistics = function(interactionType, duration) {
  const stats = this.statistics;
  
  switch (interactionType) {
    case 'view':
      stats.totalViews++;
      if (duration > 0) {
        stats.averageViewDuration = 
          ((stats.averageViewDuration * (stats.totalViews - 1)) + duration) / stats.totalViews;
      }
      break;
    case 'like':
      stats.totalLikes++;
      break;
    case 'skip':
      stats.totalSkips++;
      break;
    case 'interest_sent':
      stats.interestsSent++;
      break;
    case 'interest_accepted':
      stats.interestsAccepted++;
      break;
    case 'interest_rejected':
      stats.interestsRejected++;
      break;
  }
  
  // Calculate ratios
  if (stats.totalViews > 0) {
    stats.likeToViewRatio = (stats.totalLikes / stats.totalViews) * 100;
  }
  if (stats.interestsSent > 0) {
    stats.acceptanceRate = (stats.interestsAccepted / stats.interestsSent) * 100;
  }
};

// Learn from profile interaction
behavioralLearningSchema.methods.learnFromProfile = async function(targetProfile, interactionType) {
  if (!targetProfile) return;

  const weight = this.getInteractionWeight(interactionType);
  
  // Extract attributes from target profile
  const attributes = {
    age: targetProfile.age,
    height: targetProfile.height,
    education: targetProfile.education,
    profession: targetProfile.profession,
    location: targetProfile.city,
    religion: targetProfile.religion,
    caste: targetProfile.caste,
    maritalStatus: targetProfile.maritalStatus
  };

  // Update preference patterns
  Object.entries(attributes).forEach(([attribute, value]) => {
    if (!value) return;
    
    let pattern = this.preferencePatterns.find(p => p.attribute === attribute);
    if (!pattern) {
      pattern = {
        attribute,
        values: [],
        weightage: 1
      };
      this.preferencePatterns.push(pattern);
    }
    
    let valueEntry = pattern.values.find(v => v.value === value);
    if (!valueEntry) {
      valueEntry = { value, frequency: 0, lastSeen: new Date() };
      pattern.values.push(valueEntry);
    }
    
    valueEntry.frequency += weight;
    valueEntry.lastSeen = new Date();
    
    // Increase weightage if consistent preference
    if (interactionType === 'like' || interactionType === 'interest_sent') {
      pattern.weightage = Math.min(10, pattern.weightage + 0.1);
    }
  });

  // Detect deal breakers from rejections
  if (interactionType === 'interest_rejected' || interactionType === 'skip') {
    this.detectDealBreakers(attributes);
  }

  this.lastAnalyzedAt = new Date();
};

// Get interaction weight for learning
behavioralLearningSchema.methods.getInteractionWeight = function(interactionType) {
  const weights = {
    'view': 1,
    'like': 3,
    'skip': -1,
    'interest_sent': 5,
    'interest_accepted': 10,
    'interest_rejected': -5,
    'profile_saved': 4,
    'profile_blocked': -10
  };
  return weights[interactionType] || 0;
};

// Detect deal breakers
behavioralLearningSchema.methods.detectDealBreakers = function(attributes) {
  Object.entries(attributes).forEach(([attribute, value]) => {
    if (!value) return;
    
    // Count rejections for this value
    const rejections = this.interactions.filter(i => 
      (i.interactionType === 'interest_rejected' || i.interactionType === 'skip') &&
      i.targetProfile?.[attribute] === value
    ).length;
    
    const totalInteractions = this.interactions.filter(i => 
      i.targetProfile?.[attribute] === value
    ).length;
    
    if (totalInteractions >= 5 && (rejections / totalInteractions) > 0.8) {
      // High rejection rate - likely a deal breaker
      let dealBreaker = this.dealBreakers.find(d => d.attribute === attribute && d.value === value);
      if (!dealBreaker) {
        this.dealBreakers.push({
          attribute,
          value,
          confidence: Math.round((rejections / totalInteractions) * 100),
          detectedAt: new Date()
        });
      } else {
        dealBreaker.confidence = Math.round((rejections / totalInteractions) * 100);
      }
    }
  });
};

// Generate ideal profile from patterns
behavioralLearningSchema.methods.generateIdealProfile = function() {
  const getMostFrequent = (pattern, limit = 5) => {
    return pattern.values
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit)
      .map(v => v.value);
  };

  const agePattern = this.preferencePatterns.find(p => p.attribute === 'age');
  const heightPattern = this.preferencePatterns.find(p => p.attribute === 'height');

  if (agePattern && agePattern.values.length > 0) {
    const ages = agePattern.values.map(v => v.value);
    this.idealProfile.ageRange = {
      min: Math.min(...ages),
      max: Math.max(...ages)
    };
  }

  if (heightPattern && heightPattern.values.length > 0) {
    const heights = heightPattern.values.map(v => v.value);
    this.idealProfile.heightRange = {
      min: Math.min(...heights),
      max: Math.max(...heights)
    };
  }

  ['education', 'profession', 'location', 'religion', 'caste', 'maritalStatus'].forEach(attr => {
    const pattern = this.preferencePatterns.find(p => p.attribute === attr);
    if (pattern) {
      this.idealProfile[`${attr}${attr === 'location' ? 's' : 'Levels'}`] = getMostFrequent(pattern);
    }
  });

  this.idealProfile.updatedAt = new Date();
};

// Calculate engagement score
behavioralLearningSchema.methods.calculateEngagementScore = function() {
  const stats = this.statistics;
  let score = 0;
  
  // Activity level (40 points)
  score += Math.min(40, (stats.totalViews / 100) * 40);
  
  // Quality of engagement (30 points)
  score += Math.min(30, stats.likeToViewRatio * 0.3);
  
  // Success rate (30 points)
  score += Math.min(30, stats.acceptanceRate * 0.3);
  
  this.engagementScore = Math.round(score);
};

// Pre-save hook
behavioralLearningSchema.pre('save', function(next) {
  this.calculateEngagementScore();
  next();
});

module.exports = mongoose.model('BehavioralLearning', behavioralLearningSchema);
