const mongoose = require('mongoose');

const beautyOpsEventSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
      index: true,
    },
    requestId: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
      index: true,
    },
    endpoint: {
      type: String,
      trim: true,
      default: '',
      maxlength: 180,
    },
    message: {
      type: String,
      trim: true,
      default: '',
      maxlength: 320,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

beautyOpsEventSchema.index({ createdAt: -1, eventType: 1 });
beautyOpsEventSchema.index({ severity: 1, createdAt: -1 });
beautyOpsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports =
  mongoose.models.BeautyOpsEvent ||
  mongoose.model('BeautyOpsEvent', beautyOpsEventSchema);
