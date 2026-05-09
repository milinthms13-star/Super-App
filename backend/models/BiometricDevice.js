/**
 * BiometricDevice Model
 * Registers devices with biometric authentication capability
 * Supports fingerprint, face recognition, iris scanning
 */

const mongoose = require('mongoose');

const BiometricDeviceSchema = new mongoose.Schema({
  deviceId: {
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
  deviceName: String, // "iPhone 14 Pro"
  deviceType: {
    type: String,
    enum: ['ios', 'android', 'web', 'desktop'],
    required: true
  },
  osVersion: String,
  appVersion: String,
  biometricMethods: [{
    type: {
      type: String,
      enum: ['fingerprint', 'face', 'iris', 'voice'],
      required: true
    },
    isEnabled: {
      type: Boolean,
      default: true
    },
    biometricTemplateHash: {
      type: String,
      select: false // Never return biometric data
    },
    enrolledAt: Date,
    enrolledBy: String, // Which app/method enrolled it
    lastVerifiedAt: Date,
    failedAttempts: {
      type: Number,
      default: 0
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    lockedUntil: Date
  }],
  fallbackMethod: {
    type: String,
    enum: ['otp', 'password', 'none'],
    default: 'otp'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isTrustedDevice: {
    type: Boolean,
    default: false
  },
  trustLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  deviceLocation: {
    city: String,
    country: String,
    coordinates: [Number]
  },
  lastUsedAt: Date,
  registeredAt: {
    type: Date,
    default: Date.now
  },
  security: {
    isRooted: {
      type: Boolean,
      default: false
    },
    securityPatchLevel: String,
    malwareDetected: {
      type: Boolean,
      default: false
    },
    bootLoaderUnlocked: {
      type: Boolean,
      default: false
    }
  },
  loginAttempts: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    successfulAttempts: {
      type: Number,
      default: 0
    },
    failedAttempts: {
      type: Number,
      default: 0
    },
    blockedUntil: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes
BiometricDeviceSchema.index({ userId: 1, isActive: 1 });
BiometricDeviceSchema.index({ userId: 1, 'biometricMethods.type': 1 });
BiometricDeviceSchema.index({ deviceId: 1, userId: 1 });

// Static methods
BiometricDeviceSchema.statics.registerDevice = async function(userId, deviceId, deviceInfo) {
  const device = new this({
    deviceId,
    userId,
    deviceName: deviceInfo.deviceName,
    deviceType: deviceInfo.deviceType,
    osVersion: deviceInfo.osVersion,
    appVersion: deviceInfo.appVersion,
    deviceLocation: deviceInfo.deviceLocation,
    security: deviceInfo.security
  });

  await device.save();
  return device;
};

BiometricDeviceSchema.statics.getUserDevices = async function(userId) {
  return this.find({ userId, isActive: true })
    .select('-biometricMethods.biometricTemplateHash');
};

// Instance methods
BiometricDeviceSchema.methods.enrollBiometric = async function(biometricType, templateHash) {
  const existingMethod = this.biometricMethods.find(m => m.type === biometricType);

  if (existingMethod) {
    existingMethod.isEnabled = true;
    existingMethod.enrolledAt = new Date();
    existingMethod.biometricTemplateHash = templateHash;
  } else {
    this.biometricMethods.push({
      type: biometricType,
      isEnabled: true,
      biometricTemplateHash: templateHash,
      enrolledAt: new Date()
    });
  }

  await this.save();
};

BiometricDeviceSchema.methods.verifyBiometric = async function(biometricType) {
  const method = this.biometricMethods.find(m => m.type === biometricType);

  if (!method || !method.isEnabled) {
    throw new Error(`${biometricType} not enrolled`);
  }

  if (method.isLocked && method.lockedUntil > new Date()) {
    throw new Error(`Biometric locked until ${method.lockedUntil}`);
  }

  method.lastVerifiedAt = new Date();
  method.failedAttempts = 0;

  this.loginAttempts.successfulAttempts += 1;
  this.loginAttempts.totalAttempts += 1;
  this.lastUsedAt = new Date();

  await this.save();
  return true;
};

BiometricDeviceSchema.methods.recordFailedBiometric = async function(biometricType) {
  const method = this.biometricMethods.find(m => m.type === biometricType);

  if (method) {
    method.failedAttempts += 1;

    // Lock after 5 failed attempts for 15 minutes
    if (method.failedAttempts >= 5) {
      method.isLocked = true;
      method.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
  }

  this.loginAttempts.failedAttempts += 1;
  this.loginAttempts.totalAttempts += 1;

  // Block device after 10 total failed attempts
  if (this.loginAttempts.failedAttempts >= 10) {
    this.loginAttempts.blockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  }

  await this.save();
};

BiometricDeviceSchema.methods.removeBiometric = async function(biometricType) {
  this.biometricMethods = this.biometricMethods.filter(m => m.type !== biometricType);
  await this.save();
};

BiometricDeviceSchema.methods.deactivate = async function() {
  this.isActive = false;
  await this.save();
};

BiometricDeviceSchema.methods.markAsTrusted = async function() {
  this.isTrustedDevice = true;
  this.trustLevel = 'high';
  await this.save();
};

module.exports = mongoose.model('BiometricDevice', BiometricDeviceSchema);
