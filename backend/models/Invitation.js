const mongoose = require('mongoose');

const InvitationSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderUsername: {
      type: String,
      required: true,
      lowercase: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    recipientIdentifier: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    recipientIdentifierType: {
      type: String,
      enum: ['email', 'phone', 'username'],
      required: true,
    },
    message: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending',
      index: true,
    },
    module: {
      type: String,
      enum: ['messaging', 'social', 'general'],
      default: 'messaging',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
    notificationSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
InvitationSchema.index({ senderId: 1, status: 1 });
InvitationSchema.index({ recipientUserId: 1, status: 1 });
InvitationSchema.index({ recipientIdentifier: 1, status: 1 });
InvitationSchema.index({ expiresAt: 1 });

// Auto-expire invitations
InvitationSchema.pre('find', function () {
  this.where({ expiresAt: { $gte: new Date() } });
});

module.exports = mongoose.model('Invitation', InvitationSchema);
