const mongoose = require('mongoose');

const educationScholarshipApplicationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    scholarshipName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      default: 'submitted',
      trim: true,
      enum: ['submitted', 'under_review', 'approved', 'rejected', 'withdrawn'],
      index: true,
    },
  },
  { timestamps: true }
);

educationScholarshipApplicationSchema.index(
  { userEmail: 1, scholarshipName: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $ne: 'withdrawn' } },
  }
);

module.exports = mongoose.model('EducationScholarshipApplication', educationScholarshipApplicationSchema);
