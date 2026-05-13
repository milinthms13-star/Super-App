const mongoose = require('mongoose');

const educationCommunityMembershipSchema = new mongoose.Schema(
  {
    membershipId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    groupTitle: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      default: 'joined',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EducationCommunityMembership', educationCommunityMembershipSchema);

