const mongoose = require('mongoose');

const SocialConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    conversationType: {
      type: String,
      enum: ['direct', 'group'],
      default: 'direct',
    },
    groupName: {
      type: String,
      trim: true,
      default: null,
    },
    groupIcon: {
      type: String,
      default: null,
    },
    groupDescription: {
      type: String,
      trim: true,
      default: null,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialMessage',
      default: null,
    },
    lastMessageTime: Date,
    messageCount: {
      type: Number,
      default: 0,
    },
    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    index: [
      { participants: 1, lastMessageTime: -1 },
      { participants: 1 },
    ],
  }
);

module.exports = mongoose.model('SocialConversation', SocialConversationSchema);
