const mongoose = require('mongoose');

const beautyProgressLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      maxlength: 120,
    },
    planId: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
      index: true,
    },
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 30,
    },
    done: {
      type: Boolean,
      default: false,
    },
    note: {
      type: String,
      trim: true,
      default: '',
      maxlength: 600,
    },
    skinScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    selfieSnapshotLabel: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
    },
  },
  { timestamps: true }
);

beautyProgressLogSchema.index({ userId: 1, planId: 1, day: 1 }, { unique: true });
beautyProgressLogSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('BeautyProgressLog', beautyProgressLogSchema);
