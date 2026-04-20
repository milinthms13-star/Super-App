const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    // User who has the contact
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // The contact user
    contactUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Custom display name for contact
    displayName: {
      type: String,
      sparse: true,
    },

    // Contact category/group
    category: {
      type: String,
      enum: ['personal', 'business', 'family', 'friends', 'work', 'other'],
      default: 'personal',
    },

    // Is favorite
    isFavorite: {
      type: Boolean,
      default: false,
    },

    // Contact blocked
    isBlocked: {
      type: Boolean,
      default: false,
    },

    blockedAt: {
      type: Date,
      sparse: true,
    },

    // Last interaction
    lastInteractionAt: {
      type: Date,
      default: Date.now,
    },

    // Contact notes
    notes: {
      type: String,
      sparse: true,
    },

    // Phone number (if saved)
    phoneNumber: {
      type: String,
      sparse: true,
    },

    // Email (if saved)
    email: {
      type: String,
      sparse: true,
    },

    // Contact shared by user
    isSharedContact: {
      type: Boolean,
      default: false,
    },

    // Custom avatar/color for contact
    customColor: {
      type: String,
      sparse: true,
    },

    customAvatar: {
      type: String,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: a user can have each contact only once
contactSchema.index({ userId: 1, contactUserId: 1 }, { unique: true });

// Indexes for performance
contactSchema.index({ userId: 1, isFavorite: -1 });
contactSchema.index({ userId: 1, category: 1 });
contactSchema.index({ userId: 1, isBlocked: 1 });
contactSchema.index({ lastInteractionAt: -1 });

module.exports = mongoose.model('Contact', contactSchema);
