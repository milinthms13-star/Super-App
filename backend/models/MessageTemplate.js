const mongoose = require('mongoose');

const messageTemplateSchema = new mongoose.Schema(
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
    content: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: 'general',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    variables: {
      type: [String],
      default: [],
    },
    attachmentTemplate: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsed: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

messageTemplateSchema.index({ userId: 1, category: 1, createdAt: -1 });
messageTemplateSchema.index({ name: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.models.MessageTemplate || mongoose.model('MessageTemplate', messageTemplateSchema);
