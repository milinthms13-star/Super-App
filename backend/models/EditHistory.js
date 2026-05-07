const mongoose = require('mongoose');

/**
 * EditHistory Schema
 * Tracks all edits to messages for transparency and audit trails
 */
const editHistorySchema = new mongoose.Schema(
  {
    // Message reference
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
    },

    // Edit details
    originalContent: {
      type: String,
      required: true,
    },
    newContent: {
      type: String,
      required: true,
    },
    editedAt: {
      type: Date,
      default: Date.now,
    },
    editReason: {
      type: String,
      maxlength: 200,
    },

    // Encryption support
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    originalContentEncrypted: String,
    newContentEncrypted: String,

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'edit_history',
  }
);

// Indexes
editHistorySchema.index({ messageId: 1, editedAt: -1 });
editHistorySchema.index({ editedAt: -1 });

// Methods
editHistorySchema.statics.getMessageEditHistory = async function (messageId) {
  const history = await this.find({ messageId }).sort({ editedAt: -1 });
  return history;
};

editHistorySchema.statics.getEditCount = async function (messageId) {
  const count = await this.countDocuments({ messageId });
  return count;
};

module.exports = mongoose.model('EditHistory', editHistorySchema);
