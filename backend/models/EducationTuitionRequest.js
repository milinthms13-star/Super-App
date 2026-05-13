const mongoose = require('mongoose');

const educationTuitionRequestSchema = new mongoose.Schema(
  {
    requestId: {
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
    subject: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    details: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      default: 'submitted',
      trim: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EducationTuitionRequest', educationTuitionRequestSchema);

