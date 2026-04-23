const mongoose = require('mongoose');
const { INVITATION_CONFIG } = require('../config/constants');

// Helper function to check if user is visible via a specific channel
const isUserVisibleVia = (user, identifierType) => {
  if (!user) return false;
  
  switch (identifierType) {
    case 'phone':
      return user.visibility?.visibleViaPhone !== false;
    case 'email':
      return user.visibility?.visibleViaEmail !== false;
    case 'username':
      return user.visibility?.visibleViaUsername !== false;
    default:
      return false;
  }
};

// Helper function to check if user accepts a specific means of contact
const isUserAvailableFor = (user, contactMeans) => {
  if (!user) return false;
  
  switch (contactMeans) {
    case 'chat':
      return user.contactMeans?.availableForChat !== false;
    case 'voiceCall':
      return user.contactMeans?.availableForVoiceCall !== false;
    case 'videoCall':
      return user.contactMeans?.availableForVideoCall !== false;
    default:
      return false;
  }
};

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
    contactMeans: {
      type: String,
      enum: ['chat', 'voiceCall', 'videoCall'],
      default: 'chat',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + INVITATION_CONFIG.EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      index: true,
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

const InvitationModel = mongoose.model('Invitation', InvitationSchema);

module.exports = InvitationModel;
module.exports.isUserVisibleVia = isUserVisibleVia;
module.exports.isUserAvailableFor = isUserAvailableFor;
