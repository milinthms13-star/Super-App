const mongoose = require('mongoose');

const educationStateSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    enrolledCourseIds: {
      type: [String],
      default: [],
    },
    appliedScholarships: {
      type: [String],
      default: [],
    },
    joinedGroups: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EducationState', educationStateSchema);

