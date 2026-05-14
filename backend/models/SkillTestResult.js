const mongoose = require('mongoose');

const SkillTestResultSchema = new mongoose.Schema(
  {
    resultId: { type: String, required: true, unique: true },
    userEmail: { type: String, required: true, index: true },
    category: { type: String, trim: true, default: '' },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    correct: { type: Number, required: true },
    wrong: { type: Number, required: true },
    attempted: { type: Number, required: true },
    negativeMarks: { type: Number, required: true },
    weakAreas: { type: [String], default: [] },
    submittedAt: { type: Date, default: () => new Date() },
    questions: { type: Array, default: [] },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SkillTestResult', SkillTestResultSchema);
