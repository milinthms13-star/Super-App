/**
 * Delivery OTP Verification Model - Phase 10 Feature 1
 * OTP verification at delivery confirmation
 */

const { Schema, model } = require('mongoose');

const DeliveryOTPVerificationSchema = new Schema(
  {
    verificationId: {
      type: String,
      unique: true,
      index: true,
      description: 'Unique identifier for verification record',
    },
    orderId: {
      type: String,
      required: true,
      index: true,
      description: 'Associated order ID',
    },
    userId: {
      type: String,
      required: true,
      index: true,
      description: 'Customer user ID',
    },
    deliveryPartnerId: {
      type: String,
      required: true,
      index: true,
      description: 'Delivery partner ID',
    },
    phoneNumber: {
      type: String,
      required: true,
      description: 'Customer phone number for OTP',
    },
    otpCode: {
      type: String,
      required: true,
      description: '6-digit OTP code',
    },
    otpExpiryTime: {
      type: Date,
      required: true,
      description: 'OTP expiry timestamp (5 minutes from generation)',
      index: true,
    },
    otpAttempts: {
      type: Number,
      default: 0,
      max: 3,
      description: 'Number of failed OTP verification attempts',
    },
    maxAttempts: {
      type: Number,
      default: 3,
      description: 'Maximum OTP verification attempts allowed',
    },
    isVerified: {
      type: Boolean,
      default: false,
      description: 'Whether OTP has been verified',
    },
    verificationTime: {
      type: Date,
      description: 'Timestamp when OTP was verified',
    },
    verificationMethod: {
      type: String,
      enum: ['sms', 'voice_call', 'email', 'app_push'],
      default: 'sms',
      description: 'Method used to send OTP',
    },
    resendCount: {
      type: Number,
      default: 0,
      max: 3,
      description: 'Number of times OTP was resent',
    },
    lastResendTime: {
      type: Date,
      description: 'Timestamp of last OTP resend',
    },
    ipAddress: {
      type: String,
      description: 'IP address from which verification was attempted',
    },
    deviceId: {
      type: String,
      description: 'Device identifier for verification',
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'expired', 'blocked'],
      default: 'pending',
      description: 'Current verification status',
    },
    blockedReason: {
      type: String,
      description: 'Reason for blocking (if status is blocked)',
    },
    blockedUntil: {
      type: Date,
      description: 'Timestamp until which verification is blocked',
    },
    notes: {
      type: String,
      description: 'Additional notes or flags',
    },
  },
  { timestamps: true, collection: 'delivery_otp_verifications' }
);

// TTL index - auto-delete 24 hours after creation
DeliveryOTPVerificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 86400 }
);

// Compound indexes
DeliveryOTPVerificationSchema.index({ orderId: 1, status: 1 });
DeliveryOTPVerificationSchema.index({ userId: 1, createdAt: -1 });
DeliveryOTPVerificationSchema.index({ deliveryPartnerId: 1, isVerified: 1 });

// Instance methods
DeliveryOTPVerificationSchema.methods.isOtpExpired = function () {
  return new Date() > this.otpExpiryTime;
};

DeliveryOTPVerificationSchema.methods.isBlocked = function () {
  if (this.status === 'blocked' && this.blockedUntil) {
    return new Date() < this.blockedUntil;
  }
  return false;
};

DeliveryOTPVerificationSchema.methods.canResendOtp = function () {
  return this.resendCount < 3 && !this.isBlocked();
};

DeliveryOTPVerificationSchema.methods.incrementAttempts = function () {
  this.otpAttempts += 1;
  if (this.otpAttempts >= this.maxAttempts) {
    this.status = 'blocked';
    this.blockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min block
  }
  return this.save();
};

module.exports = model('DeliveryOTPVerification', DeliveryOTPVerificationSchema);
