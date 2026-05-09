/**
 * UserProfile.js
 * Extended user profile with personal information, preferences, avatar
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    phoneNumber: {
      type: String,
      trim: true,
      match: /^[6-9]\d{9}$/
    },
    phoneVerified: {
      type: Boolean,
      default: false
    },
    phoneVerificationCode: String,
    phoneVerificationExpires: Date,
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say'
    },
    avatar: {
      type: String, // URL to avatar image
      default: null
    },
    avatarPublicId: String, // For Cloudinary or similar
    bio: {
      type: String,
      maxlength: 500,
      default: ''
    },
    profession: {
      type: String,
      maxlength: 100,
      default: ''
    },
    company: {
      type: String,
      maxlength: 100,
      default: ''
    },
    location: {
      type: String,
      maxlength: 200,
      default: ''
    },
    website: {
      type: String,
      match: /^https?:\/\/.+/,
      default: ''
    },
    socialLinks: {
      twitter: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' }
    },
    preferences: {
      newsletter: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'es', 'fr', 'de', 'zh'],
      default: 'en'
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP'],
      default: 'INR'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    badges: [
      {
        name: { type: String }, // 'verified', 'premium_member', 'top_seller', 'trusted_buyer'
        earnedAt: { type: Date, default: Date.now }
      }
    ],
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'UserProfile',
      default: null
    },
    referrals: [
      {
        referredUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        referredAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true }
      }
    ],
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
      index: true
    },
    profileCompleteness: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Indexes
UserProfileSchema.index({ userId: 1, accountStatus: 1 });
UserProfileSchema.index({ phoneNumber: 1, phoneVerified: 1 });
UserProfileSchema.index({ referralCode: 1 });
UserProfileSchema.index({ createdAt: -1 });

// Methods
UserProfileSchema.methods.verifyPhone = function (code) {
  if (
    !this.phoneVerificationCode ||
    this.phoneVerificationCode !== code ||
    new Date() > this.phoneVerificationExpires
  ) {
    throw new Error('Invalid or expired verification code');
  }

  this.phoneVerified = true;
  this.phoneVerificationCode = undefined;
  this.phoneVerificationExpires = undefined;
  return this.save();
};

UserProfileSchema.methods.generatePhoneVerificationCode = function () {
  this.phoneVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  this.phoneVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min TTL
  return this.phoneVerificationCode;
};

UserProfileSchema.methods.calculateCompleteness = function () {
  let completeness = 0;
  const fields = [
    'firstName',
    'lastName',
    'phoneNumber',
    'dateOfBirth',
    'avatar',
    'bio',
    'profession'
  ];

  fields.forEach((field) => {
    if (this[field] && this[field].toString().trim().length > 0) {
      completeness += 15;
    }
  });

  if (this.phoneVerified) completeness += 5;

  this.profileCompleteness = Math.min(completeness, 100);
  return this;
};

UserProfileSchema.methods.generateReferralCode = function () {
  // Referral code format: first 3 letters + last 3 letters + 6 random chars
  const firstName = this.firstName.substring(0, 3).toUpperCase();
  const lastName = this.lastName.substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  this.referralCode = `${firstName}${lastName}${random}`;
  return this.referralCode;
};

UserProfileSchema.methods.getDisplayName = function () {
  return `${this.firstName} ${this.lastName}`.trim();
};

UserProfileSchema.methods.getPublicProfile = function () {
  return {
    _id: this._id,
    userId: this.userId,
    firstName: this.firstName,
    lastName: this.lastName,
    avatar: this.avatar,
    bio: this.bio,
    profession: this.profession,
    company: this.company,
    location: this.location,
    badges: this.badges,
    profileCompleteness: this.profileCompleteness
  };
};

// Statics
UserProfileSchema.statics.findOrCreate = function (userId, userData) {
  return this.findOneAndUpdate(
    { userId },
    { $set: userData },
    { upsert: true, new: true, runValidators: true }
  );
};

UserProfileSchema.statics.findByReferralCode = function (referralCode) {
  return this.findOne({ referralCode });
};

UserProfileSchema.statics.findActiveProfiles = function (page = 1, limit = 20) {
  return this.find({ accountStatus: 'active' })
    .limit(limit)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('UserProfile', UserProfileSchema);
