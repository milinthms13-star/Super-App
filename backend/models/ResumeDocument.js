const mongoose = require('mongoose');

const resumeDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      required: true,
      maxlength: 140,
    },
    resumeType: {
      type: String,
      trim: true,
      default: 'professional',
      maxlength: 80,
    },
    template: {
      type: String,
      trim: true,
      default: 'simple-ats',
      maxlength: 80,
    },
    language: {
      type: String,
      trim: true,
      default: 'en',
      maxlength: 20,
    },
    formData: {
      type: Object,
      default: {},
    },
    resumeData: {
      type: Object,
      default: {},
    },
    atsHistory: {
      type: [
        {
          score: { type: Number, default: 0 },
          keywordMatchPercent: { type: Number, default: 0 },
          checkedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    lastOpenedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

resumeDocumentSchema.index({ userId: 1, updatedAt: -1 });
resumeDocumentSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('ResumeDocument', resumeDocumentSchema);

