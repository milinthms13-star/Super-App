const mongoose = require('mongoose');

const beautyPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    gender: {
      type: String,
      trim: true,
      default: '',
    },
    age: {
      type: Number,
      min: 0,
      max: 120,
    },
    skinType: {
      type: String,
      trim: true,
      default: '',
    },
    hairType: {
      type: String,
      trim: true,
      default: '',
    },
    budget: {
      type: String,
      trim: true,
      default: '',
    },
    language: {
      type: String,
      trim: true,
      default: 'en',
    },
    selectedConcerns: [
      {
        type: String,
        trim: true,
      },
    ],
    photoUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2000,
    },
    photoStorageKey: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    photoStorageProvider: {
      type: String,
      trim: true,
      default: '',
      maxlength: 32,
    },
    photoName: {
      type: String,
      trim: true,
      default: '',
    },
    plan: {
      title: String,
      score: Number,
      morning: [String],
      night: [String],
      hair: [String],
      products: [String],
      avoid: [String],
      eventPlan: [String],

      // Safety escalation fields
      concernSeverity: {
        type: String,
        trim: true,
        default: 'mild',
        enum: ['mild', 'moderate', 'severe'],
      },
      disclaimer: {
        type: [String],
        default: [],
      },

      // Client/versioning
      apiVersion: {
        type: String,
        trim: true,
        default: 'beauty-ai-v1',
      },
      modelVersion: {
        type: String,
        trim: true,
        default: 'heuristic-v1',
      },
    },
    status: {
      type: String,
      enum: ['Active', 'Archived'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

beautyPlanSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('BeautyPlan', beautyPlanSchema);
