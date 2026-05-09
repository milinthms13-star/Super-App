/**
 * UserSession Model
 * Tracks active user sessions across devices
 * Enables device management and "sign out from all devices" functionality
 */

const mongoose = require('mongoose');

const UserSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceInfo: {
    deviceId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    deviceName: String, // "iPhone 14 Pro"
    deviceType: {
      type: String,
      enum: ['ios', 'android', 'web', 'desktop'],
      required: true
    },
    osVersion: String,
    appVersion: String,
    browserName: String,
    browserVersion: String,
    userAgent: String
  },
  ipAddress: String,
  location: {
    city: String,
    state: String,
    country: String,
    coordinates: [Number], // [lat, lng]
    ipGeolocation: String
  },
  authMethod: {
    type: String,
    enum: ['email_password', 'otp', 'social', 'biometric'],
    required: true
  },
  refreshToken: {
    type: String,
    select: false // Don't return by default
  },
  accessTokenExpiry: Date,
  refreshTokenExpiry: Date,
  loginTime: {
    type: Date,
    default: Date.now
  },
  lastActivityTime: {
    type: Date,
    default: Date.now
  },
  logoutTime: Date,
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isTrustedDevice: {
    type: Boolean,
    default: false
  },
  trustToken: String, // For "Remember this device" feature
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  suspiciousActivity: {
    type: Boolean,
    default: false
  },
  suspiciousReason: String, // "Login from new country", "Unusual time of day"
  requiresMFA: {
    type: Boolean,
    default: false
  },
  mfaVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // Auto-delete after session expiry
  }
}, { timestamps: true });

// Indexes for performance
UserSessionSchema.index({ userId: 1, isActive: 1, loginTime: -1 });
UserSessionSchema.index({ userId: 1, lastActivityTime: -1 });
UserSessionSchema.index({ 'deviceInfo.deviceId': 1 });
UserSessionSchema.index({ userId: 1, 'deviceInfo.deviceType': 1 });
UserSessionSchema.index({ userId: 1, isTrustedDevice: 1 });

// Static methods
UserSessionSchema.statics.createSession = async function(userId, deviceInfo, authMethod, ipAddress = null, location = {}) {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const accessTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const session = new this({
    sessionId,
    userId,
    deviceInfo,
    authMethod,
    ipAddress,
    location,
    accessTokenExpiry,
    refreshTokenExpiry,
    expiresAt: refreshTokenExpiry
  });

  await session.save();
  return session;
};

UserSessionSchema.statics.getActiveSessions = async function(userId) {
  return this.find({
    userId,
    isActive: true,
    lastActivityTime: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
  }).select('-refreshToken');
};

// Instance methods
UserSessionSchema.methods.updateActivity = async function() {
  this.lastActivityTime = new Date();
  if (!this.isActive) {
    this.isActive = true;
  }
  await this.save();
};

UserSessionSchema.methods.logout = async function() {
  this.isActive = false;
  this.logoutTime = new Date();
  await this.save();
};

UserSessionSchema.methods.markAsTrusted = async function() {
  this.isTrustedDevice = true;
  this.trustToken = require('crypto').randomBytes(32).toString('hex');
  await this.save();
  return this.trustToken;
};

UserSessionSchema.methods.markSuspicious = async function(reason) {
  this.suspiciousActivity = true;
  this.suspiciousReason = reason;
  this.riskScore = Math.min(100, this.riskScore + 25);
  await this.save();
};

UserSessionSchema.methods.requireMFA = async function() {
  this.requiresMFA = true;
  await this.save();
};

UserSessionSchema.methods.verifyMFA = async function() {
  this.mfaVerified = true;
  this.suspiciousActivity = false;
  this.riskScore = Math.max(0, this.riskScore - 50);
  await this.save();
};

UserSessionSchema.methods.refreshAccessToken = async function() {
  this.accessTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  this.lastActivityTime = new Date();
  await this.save();
  return this.accessTokenExpiry;
};

module.exports = mongoose.model('UserSession', UserSessionSchema);
