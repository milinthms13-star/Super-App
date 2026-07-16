/**
 * Saved Search Model
 * Users can save their search filters for quick access
 */

const mongoose = require('mongoose');

const SavedSearchSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    filters: {
      ageMin: Number,
      ageMax: Number,
      gender: String,
      religion: String,
      caste: String,
      community: String,
      education: String,
      profession: String,
      location: String,
      maritalStatus: String,
      minHeight: Number,
      maxHeight: Number,
      motherTongue: String,
      diet: String,
      smoking: String,
      drinking: String,
      verifiedOnly: Boolean,
      withPhoto: Boolean,
      premiumOnly: Boolean,
    },
    sortBy: {
      type: String,
      enum: ['recent', 'best-match', 'most-viewed', 'active'],
      default: 'best-match',
    },
    notifyOnNewMatches: {
      type: Boolean,
      default: true,
    },
    notificationFrequency: {
      type: String,
      enum: ['instant', 'daily', 'weekly', 'never'],
      default: 'daily',
    },
    lastNotificationSent: Date,
    matchCount: {
      type: Number,
      default: 0,
    },
    lastChecked: Date,
    newMatchesSinceLastCheck: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    useCount: {
      type: Number,
      default: 0,
    },
    lastUsed: Date,
  },
  {
    timestamps: true,
    collection: 'matrimonial_saved_searches',
  }
);

// Indexes
SavedSearchSchema.index({ userId: 1, isActive: 1, createdAt: -1 });
SavedSearchSchema.index({ notifyOnNewMatches: 1, lastNotificationSent: 1 });

module.exports = mongoose.model('SavedSearch', SavedSearchSchema);
