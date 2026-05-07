const mongoose = require('mongoose');

const pollVoteSchema = new mongoose.Schema(
  {
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poll',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    selectedOptions: [
      {
        type: Number,
        required: true,
      },
    ],
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    ranking: [
      {
        position: Number,
        optionIndex: Number,
      },
    ],
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Unique constraint on pollId + userId to prevent duplicate votes
pollVoteSchema.index({ pollId: 1, userId: 1 }, { unique: true });

// Additional indexes
pollVoteSchema.index({ pollId: 1, createdAt: -1 });
pollVoteSchema.index({ userId: 1, createdAt: -1 });
pollVoteSchema.index({ chatId: 1, createdAt: -1 });

module.exports = mongoose.model('PollVote', pollVoteSchema);
