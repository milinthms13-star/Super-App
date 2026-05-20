const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: [
      'Applied',
      'Viewed',
      'Shortlisted',
      'Interview',
      'Selected',
      'Rejected',
      // Backward compatibility for older records.
      'applied',
      'shortlisted',
      'interviewed',
      'rejected',
      'hired'
    ],
    default: 'Applied'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  resumeUrl: {
    type: String
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  matchScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  coverLetter: {
    type: String
  },
  expectedSalary: {
    type: String
  },
  availability: {
    type: String
  },
  notes: {
    type: String
  },
  interviewScheduled: {
    type: Date
  },
  interviewNotes: {
    type: String
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate applications
jobApplicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
