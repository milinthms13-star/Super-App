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
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EducationScholarshipApplication', educationScholarshipApplicationSchema);

