const mongoose = require('mongoose');

const aiReplySchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
    },
    suggestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    suggestions: [
      {
        id: String,
        text: String,
        confidence: Number, // 0-1
        tone: {
          type: String,
          enum: ['professional', 'casual', 'friendly', 'formal', 'humorous'],
        },
        length: {
          type: String,
          enum: ['short', 'medium', 'long'],
        },
        usedAt: Date,
        userRating: Number, // 1-5
      },
    ],
    context: {
      conversationLength: Number,
      previousMessages: Number,
      topicKeywords: [String],
      sentiment: String,
    },
    model: {
      type: String,
      enum: ['gpt-3.5-turbo', 'gpt-4', 'claude', 'custom'],
      default: 'gpt-3.5-turbo',
    },
    generationTime: Number, // in ms
    tokensUsed: Number,
    cost: Number, // in cents
    status: {
      type: String,
      enum: ['generated', 'rejected', 'used', 'expired'],
      default: 'generated',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 3600000), // 1 hour
    },
  },
  {
    timestamps: true,
  }
);

// TTL index - auto delete after expiration
aiReplySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

// Create indexes
aiReplySchema.index({ chatId: 1, createdAt: -1 });
aiReplySchema.index({ messageId: 1 });

module.exports = mongoose.model('AIReply', aiReplySchema);
