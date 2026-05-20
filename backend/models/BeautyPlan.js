const mongoose = require('mongoose');

const beautyPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
