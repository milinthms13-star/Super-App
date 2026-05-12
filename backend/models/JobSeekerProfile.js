const mongoose = require('mongoose');

const jobSeekerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  resume: {
    url: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  skills: [{
    type: String,
    trim: true
  }],
  experience: {
    type: String,
    enum: ['fresher', '0-1', '1-3', '3-5', '5-10', '10+']
  },
  currentJobTitle: {
    type: String,
    trim: true
  },
  currentCompany: {
    type: String,
    trim: true
  },
  expectedSalary: {
    type: String
  },
  preferredLocations: [{
    type: String
  }],
  languages: [{
    type: String
  }],
  portfolio: {
    type: String,
    trim: true
  },
  linkedin: {
    type: String,
    trim: true
  },
  github: {
    type: String,
    trim: true
  },
  videoIntro: {
    url: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  voiceResume: {
    url: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  availability: {
    type: String,
    enum: ['immediate', 'part-time', 'remote-only', 'gulf-ready', 'notice-period'],
    default: 'immediate'
  },
  gulfReady: {
    type: Boolean,
    default: false
  },
  preferredJobTypes: [{
    type: String,
    enum: ['local', 'gulf', 'it', 'gig']
  }],
  jobAlerts: {
    enabled: {
      type: Boolean,
      default: true
    },
    preferences: {
      locations: [{
        type: String
      }],
      salaryRange: {
        min: Number,
        max: Number
      },
      skills: [{
        type: String
      }],
      jobTypes: [{
        type: String
      }]
    }
  },
  profileCompleteness: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isProfilePublic: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for search
jobSeekerProfileSchema.index({ skills: 1 });
jobSeekerProfileSchema.index({ preferredLocations: 1 });
jobSeekerProfileSchema.index({ experience: 1 });

module.exports = mongoose.model('JobSeekerProfile', jobSeekerProfileSchema);