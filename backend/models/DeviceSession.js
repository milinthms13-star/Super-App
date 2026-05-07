const mongoose = require('mongoose');
const crypto = require('crypto');

const DeviceSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
      index: true,
    },
    sessionToken: {
      type: String,
      required: true,
      unique: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
    },
    accessTokenExpiresAt: {
      type: Date,
      required: true,
    },
    refreshTokenExpiresAt: {
      type: Date,
      required: true,
    },
    ipAddress: String,
    userAgent: String,
    socketId: {
      type: String,
      description: 'Current Socket.IO connection for this session',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'revoked', 'expired'],
      default: 'active',
      index: true,
    },
    loginMethod: {
      type: String,
      enum: ['password', 'otp', 'oauth', 'biometric'],
      default: 'password',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationMethod: {
      type: String,
      enum: ['otp', 'link', 'none'],
      default: 'none',
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    suspiciousActivityCount: {
      type: Number,
      default: 0,
    },
    failedAttempts: {
      type: Number,
      default: 0,
    },
    lastFailedAttempt: Date,
    blockedUntil: {
      type: Date,
      description: 'Account locked until this time (after failed attempts)',
    },
    revokedAt: {
      type: Date,
      description: 'When session was revoked',
    },
    revokedReason: {
      type: String,
      enum: [
        'user_logout',
        'admin_revoke',
        'suspicious_activity',
        'password_change',
        'device_deregistered',
        'security_alert',
      ],
    },
    geoLocation: {
      country: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      fetchedAt: Date,
    },
    notificationSettings: {
      soundEnabled: Boolean,
      vibrationEnabled: Boolean,
      doNotDisturbActive: Boolean,
    },
    metadata: {
      browserName: String,
      browserVersion: String,
      osName: String,
      osVersion: String,
      deviceBrand: String,
      deviceModel: String,
    },
    // Token blacklist for logout
    isBlacklisted: {
      type: Boolean,
      default: false,
      index: true,
    },
    messageSync: {
      lastSyncAt: Date,
      lastSyncedMessageId: mongoose.Schema.Types.ObjectId,
      pendingMessageCount: { type: Number, default: 0 },
      lastSyncStatus: {
        type: String,
        enum: ['success', 'partial', 'failed'],
        default: 'pending',
      },
    },
  },
  {
    timestamps: true,
    collection: 'device_sessions',
  }
);

// Indexes
DeviceSessionSchema.index({ userId: 1, status: 1 });
DeviceSessionSchema.index({ userId: 1, lastActivityAt: -1 });
DeviceSessionSchema.index({ deviceId: 1, status: 1 });
// sessionToken and refreshToken use unique constraint, no need for separate index
DeviceSessionSchema.index({ createdAt: -1 });
DeviceSessionSchema.index({
  refreshTokenExpiresAt: 1,
}, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

// Static methods for session management
DeviceSessionSchema.statics.createSession = async function (
  userId,
  deviceId,
  options = {}
) {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const refreshToken = crypto.randomBytes(64).toString('hex');

  const now = new Date();
  const accessTokenExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  const refreshTokenExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const session = await this.create({
    userId,
    deviceId,
    sessionToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    loginMethod: options.loginMethod || 'password',
    geoLocation: options.geoLocation,
    metadata: options.metadata,
  });

  return {
    session,
    sessionToken,
    refreshToken,
    accessTokenExpiresIn: accessTokenExpiresAt,
  };
};

DeviceSessionSchema.statics.validateSession = async function (
  userId,
  sessionToken
) {
  const session = await this.findOne({
    userId,
    sessionToken,
    status: 'active',
    isBlacklisted: false,
  });

  if (!session) return null;

  if (new Date() > session.accessTokenExpiresAt) {
    session.status = 'expired';
    await session.save();
    return null;
  }

  return session;
};

DeviceSessionSchema.statics.revokeSession = async function (
  sessionToken,
  reason = 'user_logout'
) {
  return await this.updateOne(
    { sessionToken },
    {
      status: 'revoked',
      revokedAt: new Date(),
      revokedReason: reason,
      isBlacklisted: true,
    }
  );
};

DeviceSessionSchema.statics.revokeAllUserSessions = async function (
  userId,
  excludeDeviceId = null
) {
  const query = { userId, status: 'active' };
  if (excludeDeviceId) {
    query.deviceId = { $ne: excludeDeviceId };
  }

  return await this.updateMany(query, {
    status: 'revoked',
    revokedAt: new Date(),
    revokedReason: 'user_logout',
    isBlacklisted: true,
  });
};

DeviceSessionSchema.statics.refreshAccessToken = async function (
  refreshToken
) {
  const session = await this.findOne({
    refreshToken,
    status: 'active',
    isBlacklisted: false,
  });

  if (!session) return null;

  if (new Date() > session.refreshTokenExpiresAt) {
    session.status = 'expired';
    await session.save();
    return null;
  }

  const newSessionToken = crypto.randomBytes(32).toString('hex');
  const newAccessTokenExpiresAt = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  );

  session.sessionToken = newSessionToken;
  session.accessTokenExpiresAt = newAccessTokenExpiresAt;
  session.lastActivityAt = new Date();
  await session.save();

  return {
    sessionToken: newSessionToken,
    accessTokenExpiresIn: newAccessTokenExpiresAt,
  };
};

// Instance methods
DeviceSessionSchema.methods.updateActivity = function () {
  this.lastActivityAt = new Date();
  return this.save();
};

DeviceSessionSchema.methods.recordFailedAttempt = async function () {
  this.failedAttempts += 1;
  this.lastFailedAttempt = new Date();

  // Block account after 5 failed attempts for 30 minutes
  if (this.failedAttempts >= 5) {
    this.blockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    this.status = 'suspended';
  }

  return this.save();
};

DeviceSessionSchema.methods.clearFailedAttempts = function () {
  this.failedAttempts = 0;
  this.lastFailedAttempt = null;
  this.blockedUntil = null;
  return this.save();
};

module.exports = mongoose.model('DeviceSession', DeviceSessionSchema);
