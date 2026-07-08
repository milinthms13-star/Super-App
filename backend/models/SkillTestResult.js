const mongoose = require('mongoose');

const skillTestResultSchema = new mongoose.Schema(
  {
    testId: {
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
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    answers: {
      type: [
        {
          questionId: { type: String, required: true, trim: true },
          selectedIndex: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    correct: {
      type: Number,
      default: 0,
      min: 0,
    },
    wrong: {
      type: Number,
      default: 0,
      min: 0,
    },
    weakAreas: {
      type: [String],
      default: [],
    },
    timeTakenMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { timestamps: true }
);

skillTestResultSchema.index({ userEmail: 1, category: 1, createdAt: -1 });
skillTestResultSchema.index({ score: 1, category: 1 });

module.exports = mongoose.model('SkillTestResult', skillTestResultSchema);
