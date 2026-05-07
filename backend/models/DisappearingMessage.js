const mongoose = require('mongoose');

const disappearingMessageSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    chatId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    disappearType: {
      type: String,
      enum: ['timer', 'view'],
      required: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
    disappearsAt: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'disappeared', 'expired'],
      default: 'active',
      index: true,
    },
    disappearedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

disappearingMessageSchema.index({ chatId: 1, status: 1, createdAt: -1 });

module.exports =
  mongoose.models.DisappearingMessage ||
  mongoose.model('DisappearingMessage', disappearingMessageSchema);
