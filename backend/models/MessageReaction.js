const mongoose = require('mongoose');

/**
 * MessageReaction Schema
 * Stores emoji and custom reactions on messages
 * Supports reaction counts and who reacted
 */
const messageReactionSchema = new mongoose.Schema(
  {
    // Message reference
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
    },

    // Reactor
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Reaction data
    emoji: {
      type: String,
      required: true,
      maxlength: 10,
    },
    type: {
      type: String,
      enum: ['emoji', 'custom'],
      default: 'emoji',
    },
    customReactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomReaction',
      default: null,
    },

    // Metadata
    isAnimated: {
      type: Boolean,
      default: false,
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'message_reactions',
  }
);

// Unique index: one reaction per user per message per emoji
messageReactionSchema.index(
  { messageId: 1, userId: 1, emoji: 1 },
  { unique: true }
);
messageReactionSchema.index({ messageId: 1, createdAt: -1 });
messageReactionSchema.index({ userId: 1, createdAt: -1 });
messageReactionSchema.index({ emoji: 1 });

// Methods
messageReactionSchema.statics.getReactionCounts = async function (messageId) {
  const counts = await this.aggregate([
    { $match: { messageId: mongoose.Types.ObjectId(messageId) } },
    { $group: { _id: '$emoji', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return counts;
};

messageReactionSchema.statics.getWhoReacted = async function (
  messageId,
  emoji
) {
  const reactions = await this.find(
    { messageId, emoji },
    { userId: 1, createdAt: 1 }
  ).populate('userId', 'username avatar');
  return reactions;
};

messageReactionSchema.statics.getReactionsSummary = async function (
  messageId
) {
  const reactions = await this.find({ messageId });
  const summary = {};

  reactions.forEach((reaction) => {
    if (!summary[reaction.emoji]) {
      summary[reaction.emoji] = {
        count: 0,
        type: reaction.type,
        reactors: [],
      };
    }
    summary[reaction.emoji].count += 1;
    summary[reaction.emoji].reactors.push(reaction.userId);
  });

  return summary;
};

module.exports = mongoose.model('MessageReaction', messageReactionSchema);
