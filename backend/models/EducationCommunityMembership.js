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
      enum: ['joined', 'left', 'blocked'],
      index: true,
    },
  },
  { timestamps: true }
);

educationCommunityMembershipSchema.index(
  { userEmail: 1, groupTitle: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['joined', 'blocked'] } },
  }
);

module.exports = mongoose.model('EducationCommunityMembership', educationCommunityMembershipSchema);
