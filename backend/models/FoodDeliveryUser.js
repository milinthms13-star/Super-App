/**
 * FoodDeliveryUser Model
 * Customer user model for food delivery module
 * Extends base user with food delivery specific fields
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const foodDeliveryUserSchema = new mongoose.Schema(
  {
    // Basic Authentication
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // Phone & OTP
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      match: /^[0-9]{10}$/,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      code: String,
      expiresAt: Date,
      attempts: {
        type: Number,
        default: 0,
      },
      lastSentAt: Date,
    },

    // Email
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },

    // Password
    password: {
      type: String,
      minlength: 8,
      select: false, // Don't return password by default
    },

    // Social Login
    socialProfiles: {
      google: {
        id: String,
        email: String,
        name: String,
        picture: String,
      },
      apple: {
        id: String,
        email: String,
        name: String,
      },
      facebook: {
        id: String,
        email: String,
        name: String,
        picture: String,
      },
    },

    // Profile Information
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    profilePicture: {
      type: String, // URL to profile image
      default: null,
    },
    profilePictureUrl: {
      type: String, // S3 or CDN URL
      default: null,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },

    // Default Address
    defaultAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryAddress',
      default: null,
    },

    // Addresses (embedded for quick access)
    addresses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoodDeliveryAddress',
      },
    ],

    // User Preferences
    preferences: {
      language: {
        type: String,
        default: 'en',
        enum: ['en', 'hi', 'ta', 'te', 'kn', 'ml'],
      },
      cuisine: [String], // Favorite cuisines
      dietaryRestrictions: [
        {
          type: String,
          enum: ['vegetarian', 'vegan', 'halal', 'jain', 'gluten-free', 'dairy-free'],
        },
      ],
      spiceLevel: {
        type: String,
        enum: ['mild', 'medium', 'hot', 'extra_hot'],
        default: 'medium',
      },
      notificationPreferences: {
        email: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
        promotions: {
          type: Boolean,
          default: true,
        },
      },
      darkMode: {
        type: Boolean,
        default: false,
      },
    },

    // Account Security
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date, // Lock account after failed attempts
    passwordChangeHistory: [
      {
        changedAt: {
          type: Date,
          default: Date.now,
        },
        hashedPassword: String,
      },
    ],
    lastPasswordChangeAt: Date,

    // Session & Login
    lastLoginAt: Date,
    lastLoginIP: String,
    sessionTokens: [
      {
        token: String,
        deviceInfo: {
          deviceId: String,
          deviceType: String,
          osVersion: String,
          appVersion: String,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: Date,
      },
    ],

    // Account Status
    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'deleted'],
      default: 'active',
    },
    suspensionReason: String,
    suspendedAt: Date,
    deletedAt: Date,

    // Referral
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryUser',
      default: null,
    },

    // Device Management
    devices: [
      {
        deviceId: String,
        deviceName: String,
        deviceType: String, // mobile, tablet, web
        osType: String, // android, ios, web
        osVersion: String,
        appVersion: String,
        fcmToken: String,
        lastActive: Date,
        isActive: Boolean,
      },
    ],

    // Metadata
    tags: [String],
    notes: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    indexes: [
      { phoneNumber: 1 },
      { email: 1 },
      { referralCode: 1 },
      { accountStatus: 1 },
    ],
  }
);

// Virtual: Full Name
foodDeliveryUserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName || ''}`.trim();
});

// Hash password before saving
foodDeliveryUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    if (this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);

      // Update password change history
      this.passwordChangeHistory.push({
        changedAt: new Date(),
        hashedPassword: this.password,
      });
      this.lastPasswordChangeAt = new Date();

      // Keep only last 5 password changes
      if (this.passwordChangeHistory.length > 5) {
        this.passwordChangeHistory.shift();
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Method: Compare passwords
foodDeliveryUserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method: Reset failed login attempts
foodDeliveryUserSchema.methods.resetFailedLoginAttempts = function () {
  this.failedLoginAttempts = 0;
  this.lockUntil = undefined;
};

// Method: Increment failed login attempts
foodDeliveryUserSchema.methods.incrementFailedLoginAttempts = function () {
  this.failedLoginAttempts += 1;

  // Lock account after 5 failed attempts for 30 minutes
  if (this.failedLoginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
};

// Method: Check if account is locked
foodDeliveryUserSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > new Date();
};

// Method: Generate OTP
foodDeliveryUserSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes validity
    attempts: 0,
    lastSentAt: new Date(),
  };
  return otp;
};

// Method: Verify OTP
foodDeliveryUserSchema.methods.verifyOTP = function (enteredOtp) {
  if (!this.otp) {
    return {
      success: false,
      message: 'No OTP sent',
    };
  }

  if (new Date() > this.otp.expiresAt) {
    return {
      success: false,
      message: 'OTP expired',
    };
  }

  if (this.otp.attempts >= 3) {
    return {
      success: false,
      message: 'Maximum OTP attempts exceeded',
    };
  }

  if (this.otp.code !== enteredOtp) {
    this.otp.attempts += 1;
    return {
      success: false,
      message: 'Invalid OTP',
    };
  }

  this.otp = null;
  return {
    success: true,
    message: 'OTP verified',
  };
};

// Method: Add session token
foodDeliveryUserSchema.methods.addSessionToken = function (token, deviceInfo) {
  this.sessionTokens.push({
    token,
    deviceInfo,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  // Keep only last 5 sessions
  if (this.sessionTokens.length > 5) {
    this.sessionTokens.shift();
  }
};

// Method: Remove session token
foodDeliveryUserSchema.methods.removeSessionToken = function (token) {
  this.sessionTokens = this.sessionTokens.filter((session) => session.token !== token);
};

// Method: Validate session token
foodDeliveryUserSchema.methods.validateSessionToken = function (token) {
  const session = this.sessionTokens.find((s) => s.token === token);

  if (!session) {
    return false;
  }

  if (new Date() > session.expiresAt) {
    this.removeSessionToken(token);
    return false;
  }

  return true;
};

// JSON representation (hide sensitive data)
foodDeliveryUserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.otp;
  delete user.sessionTokens;
  delete user.passwordChangeHistory;
  return user;
};

module.exports = mongoose.model('FoodDeliveryUser', foodDeliveryUserSchema);
