const mongoose = require('mongoose');

const messageFilterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    conditions: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    actions: {
      type: [mongoose.Schema.Types.Mixed],
      required: true,
      default: [],
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 1,
    },
    statistics: {
      messagesMatched: {
        type: Number,
        default: 0,
      },
      actionsApplied: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

messageFilterSchema.index({ userId: 1, priority: 1 });

module.exports = mongoose.models.MessageFilter || mongoose.model('MessageFilter', messageFilterSchema);
