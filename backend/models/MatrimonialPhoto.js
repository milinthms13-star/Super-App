/**
 * Matrimonial Photo Gallery Model
 * Supports multiple photos per profile with ordering and verification
 */

const mongoose = require('mongoose');

const MatrimonialPhotoSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    photoUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    photoType: {
      type: String,
      enum: ['profile', 'lifestyle', 'family', 'hobby', 'work', 'other'],
      default: 'profile',
    },
    order: {
      type: Number,
      default: 0,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: Date,
    rejectionReason: String,
    metadata: {
      fileSize: Number,
      mimeType: String,
      width: Number,
      height: Number,
      uploadedFrom: String, // 'web', 'mobile'
    },
    views: {
      type: Number,
      default: 0,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    visibleTo: {
      type: String,
      enum: ['everyone', 'premium', 'connected', 'none'],
      default: 'everyone',
    },
  },
  {
    timestamps: true,
    collection: 'matrimonial_photos',
  }
);

// Indexes
MatrimonialPhotoSchema.index({ profileId: 1, order: 1 });
MatrimonialPhotoSchema.index({ profileId: 1, isPrimary: 1 });
MatrimonialPhotoSchema.index({ verificationStatus: 1, createdAt: -1 });

// Ensure only one primary photo per profile
MatrimonialPhotoSchema.pre('save', async function (next) {
  if (this.isPrimary && this.isModified('isPrimary')) {
    await this.constructor.updateMany(
      { profileId: this.profileId, _id: { $ne: this._id } },
      { isPrimary: false }
    );
  }
  next();
});

module.exports = mongoose.model('MatrimonialPhoto', MatrimonialPhotoSchema);
