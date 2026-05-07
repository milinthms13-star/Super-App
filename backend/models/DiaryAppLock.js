const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DiaryAppLockSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  lockType: {
    type: String,
    enum: ['none', 'pin', 'biometric', 'both'],
    default: 'none'
  },
  pinHash: {
    type: String,
    // Only set if lockType includes 'pin'
  },
  biometricEnabled: {
    type: Boolean,
    default: false
  },
  // Biometric credential (fingerprint ID, face ID, etc.) - encrypted
  biometricCredential: String,
  autoLockTimeoutMinutes: {
    type: Number,
    default: 5,
    min: 1,
    max: 120
  },
  lastLockedAt: Date,
  lastUnlockedAt: Date,
  isCurrentlyLocked: {
    type: Boolean,
    default: false
  },
  failedAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  maxFailedAttempts: {
    type: Number,
    default: 5
  },
  lockedUntil: {
    // After max failed attempts, lock the app until this time
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash PIN before saving
DiaryAppLockSchema.pre('save', async function(next) {
  try {
    if (this.isModified('pinHash') && this.pinHash) {
      this.pinHash = await bcrypt.hash(this.pinHash, 10);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Method to verify PIN
DiaryAppLockSchema.methods.verifyPin = async function(providedPin) {
  if (!this.pinHash) {
    throw new Error('PIN not set');
  }
  return bcrypt.compare(providedPin, this.pinHash);
};

// Method to set PIN
DiaryAppLockSchema.methods.setPin = async function(newPin) {
  this.pinHash = newPin; // Will be hashed in pre-save hook
  this.lockType = this.biometricEnabled ? 'both' : 'pin';
  await this.save();
};

// Method to check if locked due to failed attempts
DiaryAppLockSchema.methods.isLockedOutTemporarily = function() {
  if (this.lockedUntil && new Date() < this.lockedUntil) {
    return true;
  }
  return false;
};

// Method to increment failed attempts
DiaryAppLockSchema.methods.incrementFailedAttempts = async function() {
  this.failedAttempts += 1;
  
  if (this.failedAttempts >= this.maxFailedAttempts) {
    // Lock for 15 minutes after max attempts
    this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  
  await this.save();
};

// Method to reset failed attempts
DiaryAppLockSchema.methods.resetFailedAttempts = async function() {
  this.failedAttempts = 0;
  this.lockedUntil = null;
  this.lastUnlockedAt = new Date();
  await this.save();
};

module.exports = mongoose.model('DiaryAppLock', DiaryAppLockSchema);
