const mongoose = require('mongoose');

const TrustedReminderContactSchema = new mongoose.Schema(
  {
    // User who sent the invite (wants to make someone a trusted contact)
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // User who received the invite
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Status of the trusted contact relationship
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'blocked'],
      default: 'pending',
      index: true,
    },

    // Invitation message
    message: {
      type: String,
      default: 'I would like to add you as a trusted contact for my reminders',
      trim: true,
      maxlength: 500,
    },

    // When the invite was accepted
    acceptedAt: {
      type: Date,
      sparse: true,
    },

    // When the invite was rejected
    rejectedAt: {
      type: Date,
      sparse: true,
    },

    // When the contact was blocked
    blockedAt: {
      type: Date,
      sparse: true,
    },

    // Relationship label/category (e.g., "family", "caregiver", "friend")
    relationship: {
      type: String,
      enum: ['family', 'friend', 'caregiver', 'colleague', 'other'],
      default: 'other',
    },

    // Permissions for this trusted contact
    permissions: {
      canViewReminders: {
        type: Boolean,
        default: true,
      },
      canReceiveReminders: {
        type: Boolean,
        default: true,
      },
      canEditReminders: {
        type: Boolean,
        default: false,
      },
    },

    // Last interaction date
    lastInteractionAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
TrustedReminderContactSchema.index({ senderId: 1, status: 1 });
TrustedReminderContactSchema.index({ recipientId: 1, status: 1 });
TrustedReminderContactSchema.index({ senderId: 1, recipientId: 1 }, { unique: true });

// Virtual for relationship display
TrustedReminderContactSchema.virtual('statusDisplay').get(function () {
  const statusMap = {
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
    blocked: 'Blocked',
  };
  return statusMap[this.status] || this.status;
});

module.exports = mongoose.model('TrustedReminderContact', TrustedReminderContactSchema);
