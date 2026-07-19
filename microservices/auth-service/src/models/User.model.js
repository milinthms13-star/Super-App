const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    authMethod: {
      type: String,
      default: 'email_otp',
    },
    mpinHash: {
      type: String,
      default: '',
      select: false,
    },
    mpinEnabled: {
      type: Boolean,
      default: false,
    },
    mpinFailedAttempts: {
      type: Number,
      default: 0,
    },
    mpinBlockedUntil: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      default: 'user',
    },
    roles: {
      type: [String],
      default: ['user'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', UserSchema);
