const crypto = require('crypto');
const mongoose = require('mongoose');

const InterestSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => crypto.randomUUID() },
    fromProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true,
    },
    toProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true,
    },
    status: {
      type: String,
      enum: ['sent', 'accepted', 'declined', 'expired'],
      default: 'sent',
    },
    message: { type: String, trim: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
    respondedAt: Date,
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => crypto.randomUUID() },
    fromProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true,
    },
    toProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true,
    },
    content: { type: String, trim: true, maxlength: 1000, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ReportSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => crypto.randomUUID() },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true,
    },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['open', 'reviewed', 'dismissed'],
      default: 'open',
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MatrimonialProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 100,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    photoUrl: { type: String, sparse: true },
    photoVerified: { type: Boolean, default: false },
    age: { type: Number, min: 18, max: 100, required: true },
    gender: {
      type: String,
      enum: ['Man', 'Woman', 'Other'],
      required: true,
    },
    religion: { type: String, trim: true, maxlength: 50, index: true },
    caste: { type: String, trim: true, maxlength: 50 },
    community: { type: String, trim: true, maxlength: 50 },
    education: { type: String, trim: true, maxlength: 100, index: true },
    profession: { type: String, trim: true, maxlength: 100, index: true },
    location: { type: String, trim: true, maxlength: 100, index: true },
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    maritalStatus: {
      type: String,
      enum: ['Never Married', 'Divorced', 'Widowed'],
      required: true,
    },
    familyDetails: { type: String, trim: true, maxlength: 1000 },
    bio: { type: String, trim: true, maxlength: 500, required: true },
    languages: [{ type: String, trim: true }],
    hobbies: [{ type: String, trim: true }],
    preferences: {
      ageMin: { type: Number, min: 18, max: 100 },
      ageMax: { type: Number, min: 18, max: 100 },
      religion: String,
      caste: String,
      location: String,
      education: String,
      profession: String,
    },
    privacy: {
      hidePhone: { type: Boolean, default: false },
      hidePhotos: { type: Boolean, default: false },
      premiumOnlyContact: { type: Boolean, default: false },
    },
    premiumUntil: Date,
    profileViews: { type: Number, default: 0 },
    interestsSent: { type: Number, default: 0 },
    interestsReceived: { type: Number, default: 0 },
    matchScoreCache: { type: Map, of: Number },
    lastActive: { type: Date, default: Date.now },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    profileStatus: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'changes_requested', 'rejected'],
      default: 'pending_review',
    },
    messages: [MessageSchema],
    interests: [InterestSchema],
    reports: [ReportSchema],
    blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MatrimonialProfile' }],
  },
  {
    timestamps: true,
  }
);

MatrimonialProfileSchema.index({ coordinates: '2dsphere' });
MatrimonialProfileSchema.index({ religion: 1, location: 1, age: 1 });
MatrimonialProfileSchema.index({ 'preferences.religion': 1 });
MatrimonialProfileSchema.index({ userId: 1 }, { unique: true });
MatrimonialProfileSchema.index({ verificationStatus: 1, profileViews: -1 });

module.exports = mongoose.model('MatrimonialProfile', MatrimonialProfileSchema);
