const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * OtpSession Model
 * Manages OTP verification for device security and login
 * 
 * Fields:
 * - userId: The user requesting OTP verification
 * - deviceId: The device requiring verification
 * - otpCode: 6-digit OTP code (stored encrypted in production)
 * - otpType: Type of OTP (device_verification, login, security_check)
 * - medium: How OTP is delivered (sms, email, in-app)
 * - expiresAt: When OTP expires (15 minutes default)
 * - attempts: Failed verification attempts (max 5)
 * - verified: Whether OTP has been verified
 * - verifiedAt: Timestamp when verified
 * - metadata: Additional context (phone, email, IP, user agent)
 */

const otpSessionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },
  otpCode: {
    type: String,
    required: true,
    // In production: encrypt this field
    select: false // Don't return by default (security)
  },
  otpType: {
    type: String,
    enum: ['device_verification', 'login', 'security_check'],
    default: 'device_verification',
    required: true
  },
  medium: {
    type: String,
    enum: ['sms', 'email', 'in-app'],
    default: 'sms',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    // TTL Index: auto-delete expired OTPs
    index: { expireAfterSeconds: 0 }
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  verified: {
    type: Boolean,
    default: false,
    index: true
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  metadata: {
    phoneNumber: String,
    email: String,
    ip: String,
    userAgent: String,
    deviceFingerprint: String,
    country: String,
    timezone: String
  },
  
  // Tracking
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'otp_sessions'
});

// Indexes
otpSessionSchema.index({ userId: 1, verified: 1 }); // User's verified OTPs
otpSessionSchema.index({ deviceId: 1, verified: 1 }); // Device's verified OTPs
otpSessionSchema.index({ userId: 1, otpType: 1 }); // OTP type per user
otpSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 }); // Auto-delete after 15 min

// Static Methods

/**
 * Generate new OTP session
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} deviceId - Device ID
 * @param {Object} options - { otpType, medium, metadata }
 * @returns {Promise<OtpSession>}
 */
otpSessionSchema.statics.generateOtp = async function(userId, deviceId, options = {}) {
  const {
    otpType = 'device_verification',
    medium = 'sms',
    metadata = {}
  } = options;

  // Generate 6-digit code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Create OTP session (expires in 15 minutes)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const session = new this({
    userId,
    deviceId,
    otpCode,
    otpType,
    medium,
    expiresAt,
    metadata
  });

  await session.save();
  return session;
};

/**
 * Verify OTP code
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} deviceId - Device ID
 * @param {String} code - OTP code to verify
 * @returns {Promise<{success: boolean, session: OtpSession, error: string}>}
 */
otpSessionSchema.statics.verifyOtp = async function(userId, deviceId, code) {
  try {
    // Find unverified OTP session
    const session = await this.findOne({
      userId,
      deviceId,
      verified: false,
      otpType: 'device_verification'
    }).select('+otpCode');

    if (!session) {
      return {
        success: false,
        error: 'OTP_NOT_FOUND'
      };
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      return {
        success: false,
        error: 'OTP_EXPIRED'
      };
    }

    // Check attempts
    if (session.attempts >= 5) {
      // Lock this OTP session
      session.attempts = 5;
      await session.save();
      return {
        success: false,
        error: 'OTP_ATTEMPTS_EXCEEDED',
        session
      };
    }

    // Verify code
    if (session.otpCode !== code) {
      session.attempts += 1;
      await session.save();
      return {
        success: false,
        error: 'OTP_INVALID',
        session,
        attemptsRemaining: 5 - session.attempts
      };
    }

    // Code matches - mark as verified
    session.verified = true;
    session.verifiedAt = new Date();
    await session.save();

    return {
      success: true,
      session
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get active OTP for user/device
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} deviceId - Device ID
 * @returns {Promise<OtpSession>}
 */
otpSessionSchema.statics.getActiveOtp = async function(userId, deviceId) {
  return this.findOne({
    userId,
    deviceId,
    verified: false,
    expiresAt: { $gt: new Date() }
  });
};

/**
 * Check if device is OTP verified
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} deviceId - Device ID
 * @returns {Promise<boolean>}
 */
otpSessionSchema.statics.isDeviceVerified = async function(userId, deviceId) {
  const verified = await this.findOne({
    userId,
    deviceId,
    verified: true
  });
  return !!verified;
};

/**
 * Resend OTP (create new OTP, invalidate old)
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} deviceId - Device ID
 * @returns {Promise<OtpSession>}
 */
otpSessionSchema.statics.resendOtp = async function(userId, deviceId) {
  // Delete old unverified OTPs
  await this.deleteMany({
    userId,
    deviceId,
    verified: false
  });

  // Create new OTP
  return this.generateOtp(userId, deviceId, {
    otpType: 'device_verification',
    medium: 'sms'
  });
};

/**
 * Mark OTP as used/verified
 * @param {ObjectId} sessionId - OTP Session ID
 * @returns {Promise<OtpSession>}
 */
otpSessionSchema.statics.markVerified = async function(sessionId) {
  return this.findByIdAndUpdate(
    sessionId,
    {
      verified: true,
      verifiedAt: new Date()
    },
    { new: true }
  );
};

// Instance Methods

/**
 * Check if OTP is expired
 * @returns {boolean}
 */
otpSessionSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

/**
 * Get remaining attempts
 * @returns {number}
 */
otpSessionSchema.methods.getRemainingAttempts = function() {
  return Math.max(0, 5 - this.attempts);
};

/**
 * Get time until expiration (in seconds)
 * @returns {number}
 */
otpSessionSchema.methods.getTimeUntilExpiration = function() {
  const timeLeft = this.expiresAt - new Date();
  return Math.max(0, Math.floor(timeLeft / 1000));
};

/**
 * Record failed attempt
 * @returns {Promise<OtpSession>}
 */
otpSessionSchema.methods.recordFailedAttempt = async function() {
  this.attempts += 1;
  await this.save();
  return this;
};

// Middleware

// Update updatedAt on save
otpSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const OtpSession = mongoose.model('OtpSession', otpSessionSchema);

module.exports = OtpSession;
