const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['local', 'gulf', 'it', 'gig'],
    required: true
  },
  subtype: {
    type: String,
    required: true
  },
  salary: {
    type: String,
    required: true
  },
  salaryMin: {
    type: Number,
    default: 0
  },
  salaryMax: {
    type: Number,
    default: 0
  },
  experience: {
    type: String,
    required: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    required: true
  },
  benefits: [{
    type: String
  }],
  requirements: {
    type: String
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    enum: ['shops', 'hospitals', 'hotels', 'supermarkets', 'delivery', 'office', 'driver', 'sales', 'helper',
           'uae', 'qatar', 'saudi', 'kuwait', 'oman', 'bahrain',
           'remote', 'startup', 'developer', 'uiux', 'qa', 'devops', 'aiml', 'angular', 'dotnet', 'react', 'nodejs',
           'freelancer', 'dailywage', 'eventworker', 'homeservice', 'parttime', 'student', 'tempstaff']
  },
  country: {
    type: String,
    enum: ['india', 'uae', 'qatar', 'saudi', 'kuwait', 'oman', 'bahrain']
  },
  jobType: {
    type: String,
    enum: ['fulltime', 'parttime', 'contract', 'freelance', 'temporary']
  },
  workMode: {
    type: String,
    enum: ['onsite', 'remote', 'hybrid']
  },
  district: {
    type: String
  },
  visaType: {
    type: String
  },
  accommodationProvided: {
    type: Boolean,
    default: false
  },
  contractTerms: {
    type: String
  },
  gulfSafetyChecklist: {
    agencyLicenseNumber: {
      type: String,
      trim: true
    },
    medicalInsuranceProvided: {
      type: Boolean,
      default: false
    },
    returnTicketProvided: {
      type: Boolean,
      default: false
    },
    overtimePolicy: {
      type: String,
      trim: true
    },
    warningNotes: {
      type: String,
      trim: true
    }
  },
  postedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  },
  contactEmail: {
    type: String
  },
  contactPhone: {
    type: String
  },
  companyWebsite: {
    type: String
  },
  tags: [{
    type: String
  }],
  reports: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      trim: true
    },
    details: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
jobSchema.index({ type: 1, subtype: 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ postedAt: -1 });
jobSchema.index({ isActive: 1, isFeatured: 1 });

module.exports = mongoose.model('Job', jobSchema);
