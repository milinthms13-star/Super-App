const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      description: 'Unique identifier for the device (UUID v4)',
    },
    deviceName: {
      type: String,
      required: true,
      example: 'iPhone 14 Pro',
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'web'],
      required: true,
    },
    osType: {
      type: String,
      enum: ['iOS', 'Android', 'Windows', 'macOS', 'Linux', 'Other'],
      required: true,
    },
    osVersion: {
      type: String,
      required: true,
      example: '17.0.1',
    },
    browserType: {
      type: String,
      description: 'For web devices',
      example: 'Chrome',
    },
    browserVersion: {
      type: String,
      description: 'For web devices',
      example: '120.0.1',
    },
    appVersion: {
      type: String,
      required: true,
      example: '1.2.3',
    },
    deviceFingerprint: {
      type: String,
      description: 'Hash of device characteristics for fraud detection',
    },
    ipAddress: {
      type: String,
      required: true,
      index: true,
    },
    location: {
      country: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number,
      lastUpdatedAt: Date,
    },
    pushToken: {
      type: String,
      description: 'FCM/APNs token for push notifications',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      description: 'Verified via OTP or other means',
    },
    verificationToken: {
      type: String,
      description: 'Token for device verification',
    },
    verificationTokenExpiresAt: {
      type: Date,
      description: 'Expiration time for verification token',
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastSyncAt: {
      type: Date,
      description: 'Last message sync timestamp',
    },
    isTrusted: {
      type: Boolean,
      default: false,
      description: 'User marked as trusted after verification',
      index: true,
    },
    trustedUntil: {
      type: Date,
      description: 'When device trust expires (OTP valid for 30 days)',
      index: true,
    },
    trustTokenSentAt: {
      type: Date,
      description: 'When trust code was sent to this device',
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'verified', 'locked'],
      default: 'unverified',
      description: 'OTP verification status',
      index: true,
    },
    verifiedAt: {
      type: Date,
      description: 'When device was verified via OTP',
    },
    lockedUntil: {
      type: Date,
      description: 'When device lock expires after failed OTP attempts',
      index: true,
    },
    maxMessageSyncId: {
      type: mongoose.Schema.Types.ObjectId,
      description: 'Latest message synced to this device',
    },
    syncState: {
      type: String,
      enum: ['synced', 'pending', 'failed'],
      default: 'pending',
      description: 'Current sync status with message queue',
    },
    unacknowledgedMessages: {
      type: Number,
      default: 0,
      description: 'Count of messages not yet acknowledged by device',
    },
    lastUnacknowledgedMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      description: 'Last message ID not acknowledged',
    },
    connectionStatus: {
      type: String,
      enum: ['online', 'offline', 'idle'],
      default: 'offline',
      index: true,
    },
    socketId: {
      type: String,
      description: 'Current Socket.IO connection ID',
    },
    notificationSettings: {
      soundEnabled: { type: Boolean, default: true },
      vibrationEnabled: { type: Boolean, default: true },
      notificationsEnabled: { type: Boolean, default: true },
      doNotDisturbStart: String, // HH:mm format
      doNotDisturbEnd: String, // HH:mm format
    },
    metadata: {
      manufacturer: String,
      model: String,
      screenDensity: String,
      screenResolution: String,
      totalMemory: Number,
      availableMemory: Number,
    },
    logoutAt: {
      type: Date,
      description: 'When device was logged out',
    },
    loginHistory: [
      {
        loginAt: Date,
        ipAddress: String,
        location: {
          country: String,
          city: String,
        },
        status: {
          type: String,
          enum: ['success', 'failed', 'suspicious'],
          default: 'success',
        },
      },
    ],
  },
  {
    timestamps: true,
    collection: 'devices',
  }
);

// Indexes for efficient queries
DeviceSchema.index({ userId: 1, isActive: 1 });
DeviceSchema.index({ userId: 1, lastActivityAt: -1 });
DeviceSchema.index({ userId: 1, connectionStatus: 1 });
DeviceSchema.index({ userId: 1, verificationStatus: 1 }); // For OTP queries
DeviceSchema.index({ deviceFingerprint: 1 });
DeviceSchema.index({ createdAt: -1 });
DeviceSchema.index({ isTrusted: 1, trustedUntil: 1 }); // For trust expiration queries
DeviceSchema.index({ verificationStatus: 1, lockedUntil: 1 }); // For lock queries

// Virtual for days since last activity
DeviceSchema.virtual('daysSinceLastActivity').get(function () {
  if (!this.lastActivityAt) return null;
  const days = Math.floor(
    (Date.now() - this.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  return days;
});

// Virtual for is recently active (within last hour)
DeviceSchema.virtual('isRecentlyActive').get(function () {
  if (!this.lastActivityAt) return false;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return this.lastActivityAt > oneHourAgo;
});

module.exports = mongoose.model('Device', DeviceSchema);
