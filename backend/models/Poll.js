const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    options: [
      {
        optionIndex: {
          type: Number,
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        icon: String,
        emoji: String,
      },
    ],
    allowMultipleVotes: {
      type: Boolean,
      default: false,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    isClosed: {
      type: Boolean,
      default: false,
      index: true,
    },
    closedAt: Date,
    expiresAt: {
      type: Date,
      index: true,
    },
    pollType: {
      type: String,
      enum: ['single-choice', 'multiple-choice', 'rating', 'ranking'],
      default: 'single-choice',
    },
    totalVotes: {
      type: Number,
      default: 0,
    },
    metadata: {
      description: String,
      tags: [String],
    },
  },
  {
    timestamps: true,
  }
);

// TTL index - delete expired polls after 1 year
pollSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { isClosed: true },
  }
);

// Additional indexes
pollSchema.index({ chatId: 1, createdAt: -1 });
pollSchema.index({ chatId: 1, isClosed: 1 });

module.exports = mongoose.model('Poll', pollSchema);
