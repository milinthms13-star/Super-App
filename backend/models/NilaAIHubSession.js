const mongoose = require('mongoose');

const nilaAIHubSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'escalated'],
      default: 'active',
    },
    topic: {
      type: String,
      default: 'general',
      trim: true,
    },
    messages: [
      {
        role: {
          type: String,
          enum: ['user', 'assistant'],
          required: true,
        },
        content: {
          type: String,
          required: true,
          trim: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        intent: {
          type: String,
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

nilaAIHubSessionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('NilaAIHubSession', nilaAIHubSessionSchema);
