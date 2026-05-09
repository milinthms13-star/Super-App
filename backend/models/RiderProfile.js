const mongoose = require('mongoose');

const riderProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: String,
  profilePhoto: String,
  verificationStatus: {
    type: String,
    enum: ['unverified', 'email_verified', 'phone_verified', 'fully_verified'],
    default: 'unverified',
    index: true,
  },
  emergencyContacts: [
    {
      name: String,
      phone: {
        type: String,
        required: true,
      },
      relationship: String,
      isVerified: {
        type: Boolean,
        default: false,
      },
    },
  ],
  savedAddresses: [
    {
      label: {
        type: String,
        enum: ['home', 'work', 'other'],
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
      isPrimary: Boolean,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  preferences: {
    preferredLanguage: {
      type: String,
      default: 'english',
      enum: ['english', 'malayalam', 'tamil', 'hindi'],
    },
    shareRidePreference: {
      type: Boolean,
      default: true,
    },
    enableNotifications: {
      type: Boolean,
      default: true,
    },
    smsNotifications: {
      type: Boolean,
      default: true,
    },
    pushNotifications: {
      type: Boolean,
      default: true,
    },
    emailNotifications: {
      type: Boolean,
      default: false,
    },
  },
  walletBalance: {
    type: Number,
    default: 0,
  },
  totalRides: {
    type: Number,
    default: 0,
  },
  completedRides: {
    type: Number,
    default: 0,
  },
  cancelledRides: {
    type: Number,
    default: 0,
  },
  averageRating: {
    type: Number,
    default: 5,
    min: 0,
    max: 5,
  },
  trustScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  },
  riderStatus: {
    type: String,
    enum: ['active', 'suspended', 'banned', 'deactivated'],
    default: 'active',
    index: true,
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  rideHistory: {
    type: Number,
    default: 0,
  },
  lastRideAt: Date,
  paymentMethods: [
    {
      type: {
        type: String,
        enum: ['upi', 'card', 'wallet', 'bank_transfer', 'cash'],
      },
      isPrimary: Boolean,
      details: mongoose.Schema.Types.Mixed,
      isVerified: {
        type: Boolean,
        default: false,
      },
    },
  ],
  documents: {
    aadharVerified: {
      type: Boolean,
      default: false,
    },
    panVerified: {
      type: Boolean,
      default: false,
    },
  },
  deviceTokens: [String],
  locations: [
    {
      lat: Number,
      lng: Number,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  flags: {
    isNewUser: {
      type: Boolean,
      default: true,
    },
    hasCompletedFirstRide: {
      type: Boolean,
      default: false,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for geospatial queries on rider locations
riderProfileSchema.index({ 'locations.lat': 1, 'locations.lng': 1 });

// Index for common queries
riderProfileSchema.index({ riderStatus: 1, createdAt: -1 });
riderProfileSchema.index({ trustScore: 1 });
riderProfileSchema.index({ averageRating: 1 });

module.exports = mongoose.model('RiderProfile', riderProfileSchema);
