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
    courseProgress: {
      type: Map,
      of: {
        type: Number,
        min: 0,
        max: 100,
      },
      default: {},
    },
    roleProfile: {
      primaryRole: {
        type: String,
        trim: true,
        default: "student",
        enum: ["student", "parent", "tutor", "institute_admin"],
      },
      studentName: {
        type: String,
        trim: true,
        default: "",
      },
      classLevel: {
        type: String,
        trim: true,
        default: "",
      },
      targetExam: {
        type: String,
        trim: true,
        default: "",
      },
      preferredLanguage: {
        type: String,
        trim: true,
        default: "English",
      },
      careerGoal: {
        type: String,
        trim: true,
        default: "",
      },
    },
    interventionsDismissed: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EducationState', educationStateSchema);
