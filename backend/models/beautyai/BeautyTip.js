const mongoose = require('mongoose');

const beautyTipSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    category: {
      type: String,
      trim: true,
      default: 'general',
      maxlength: 64,
    },
    language: {
      type: String,
      trim: true,
      default: 'en',
      maxlength: 8,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
      index: true,
    },
    createdBy: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
    },
  },
  { timestamps: true }
);

beautyTipSchema.index({ language: 1, category: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('BeautyTip', beautyTipSchema);
