/**
 * OtpAuthSession Model
 * Manages OTP-based authentication for phone number login
 * Supports SMS/WhatsApp delivery with rate limiting and brute-force protection
 */

const mongoose = require('mongoose');

const OtpAuthSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: (v) => /^[6-9]\d{9}$/.test(v),
      message: 'Invalid Indian phone number'
    }
  },
  otpCode: {
    type: String,
    required: true,
    length: 6,
    select: false // Don't return by default
  },
  otpType: {
    type: String,
    enum: ['device_verification', 'login', 'security_check', 'password_reset'],
    default: 'login'
  },
  medium: {
    type: String,
    enum: ['sms', 'whatsapp', 'email', 'in-app'],
    default: 'sms'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index for auto-cleanup
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  lastAttemptAt: Date,
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  deviceInfo: {
    deviceId: String,
    deviceName: String,
    deviceType: String, // ios, android, web
    osVersion: String,
    appVersion: String,
    userAgent: String
  },
  ipAddress: String,
  location: {
    city: String,
    country: String,
    coordinates: [Number] // [lat, lng]
  },
  metadata: {
    source: String, // app, web, mobile
    campaignId: String,
    referrerId: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for cleanup
OtpAuthSessionSchema.index({ phoneNumber: 1, createdAt: -1 });
OtpAuthSessionSchema.index({ sessionId: 1, expiresAt: 1 });

// Static methods
OtpAuthSessionSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

OtpAuthSessionSchema.statics.createSession = async function(phoneNumber, medium = 'sms', deviceInfo = {}) {
  const sessionId = `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const otpCode = this.generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const session = new this({
    sessionId,
    phoneNumber,
    otpCode,
    medium,
    expiresAt,
    deviceInfo
  });

  await session.save();
  return { sessionId, expiresAt, medium };
};

// Instance methods
OtpAuthSessionSchema.methods.verifyOTP = async function(providedOtp) {
  // Check if expired
  if (new Date() > this.expiresAt) {
    throw new Error('OTP expired');
  }

  // Check attempts
  if (this.attempts >= 5) {
    throw new Error('Too many attempts. Please request a new OTP.');
  }

  // Increment attempt
  this.lastAttemptAt = new Date();
  this.attempts += 1;

  // Verify OTP
  if (this.otpCode !== providedOtp) {
    await this.save();
    throw new Error('Invalid OTP');
  }

  // Mark as verified
  this.isVerified = true;
  this.verifiedAt = new Date();
  await this.save();

  return true;
};

OtpAuthSessionSchema.methods.markVerified = async function(userId) {
  this.userId = userId;
  this.isVerified = true;
  this.verifiedAt = new Date();
  await this.save();
};

OtpAuthSessionSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

OtpAuthSessionSchema.methods.canResend = function() {
  const timeSinceCreation = Date.now() - this.createdAt.getTime();
  return timeSinceCreation > 30 * 1000; // Allow resend after 30 seconds
};

module.exports = mongoose.model('OtpAuthSession', OtpAuthSessionSchema);
