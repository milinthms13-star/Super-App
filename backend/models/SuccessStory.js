/**
 * Success Story Model
 * Couples share their marriage success stories
 */

const mongoose = require('mongoose');

const SuccessStorySchema = new mongoose.Schema(
  {
    groomProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true,
    },
    brideProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true,
    },
    groomName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    brideName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    story: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    marriageDate: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    photos: [
      {
        url: String,
        caption: String,
        order: Number,
      },
    ],
    videoUrl: String,
    videoThumbnail: String,
    testimonial: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    matchedOn: Date, // When they matched on the platform
    engagementDate: Date,
    howWeMet: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'featured'],
      default: 'pending',
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    featuredUntil: Date,
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectionReason: String,
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    consentGiven: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'matrimonial_success_stories',
  }
);

// Indexes
SuccessStorySchema.index({ status: 1, createdAt: -1 });
SuccessStorySchema.index({ isPublished: 1, isFeatured: -1, views: -1 });
SuccessStorySchema.index({ marriageDate: -1 });

module.exports = mongoose.model('SuccessStory', SuccessStorySchema);
