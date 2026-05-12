const mongoose = require('mongoose');

const employerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  companyType: {
    type: String,
    enum: ['startup', 'sme', 'corporate', 'agency', 'individual', 'government'],
    required: true
  },
  industry: {
    type: String,
    trim: true
  },
  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-1000', '1000+']
  },
  location: {
    type: String,
    required: true
  },
  website: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  logo: {
    url: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    type: {
      type: String,
      enum: ['license', 'certificate', 'id', 'other']
    },
    url: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  subscriptionPlan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free'
  },
  subscriptionExpiresAt: {
    type: Date
  },
  jobPostingLimit: {
    type: Number,
    default: 5 // Free plan limit
  },
  jobsPosted: {
    type: Number,
    default: 0
  },
  activeJobs: {
    type: Number,
    default: 0
  },
  totalApplications: {
    type: Number,
    default: 0
  },
  hiredCount: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: [{
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  socialLinks: {
    linkedin: String,
    facebook: String,
    twitter: String
  },
  preferredSkills: [{
    type: String
  }],
  hiringFor: [{
    type: String,
    enum: ['local', 'gulf', 'it', 'gig']
  }],
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
employerProfileSchema.index({ companyName: 1 });
employerProfileSchema.index({ industry: 1 });
employerProfileSchema.index({ isVerified: 1 });

module.exports = mongoose.model('EmployerProfile', employerProfileSchema);