const mongoose = require('mongoose');

const riderProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  // Basic Information
  fullName: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
  },
  profilePhoto: String,

  // Preferences
  preferredLanguage: {
    type: String,
    default: 'English',
    enum: ['English', 'Malayalam', 'Tamil', 'Hindi'],
  },
  preferredPaymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'card', 'wallet'],
    default: 'cash',
  },
  preferredVehicleTypes: {
    type: [String],
    enum: ['bike', 'auto', 'mini_car', 'sedan', 'suv'],
    default: ['auto', 'mini_car'],
  },

  // Home & Work Locations
  homeLocation: {
    address: String,
    lat: Number,
    lng: Number,
    placeId: String,
  },
  workLocation: {
    address: String,
    lat: Number,
    lng: Number,
    placeId: String,
  },
  favoriteLocations: [{
    name: String,
    address: String,
    lat: Number,
    lng: Number,
    placeId: String,
    type: {
      type: String,
      enum: ['home', 'work', 'favorite', 'recent'],
      default: 'favorite',
    },
  }],

  // Ride History & Stats
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
  totalSpent: {
    type: Number,
    default: 0,
  },
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 5,
  },

  // Safety Settings
  emergencyContacts: [{
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    relation: {
      type: String,
      enum: ['family', 'friend', 'colleague', 'other'],
      default: 'family',
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  }],
  shareRideWithContacts: {
    type: Boolean,
    default: true,
  },
  womenOnlyRides: {
    type: Boolean,
    default: false,
  },
  seniorCitizenMode: {
    type: Boolean,
    default: false,
  },

  // Special Requirements
  accessibilityNeeds: {
    wheelchair: {
      type: Boolean,
      default: false,
    },
    visualImpairment: {
      type: Boolean,
      default: false,
    },
    hearingImpairment: {
      type: Boolean,
      default: false,
    },
  },
  petFriendly: {
    type: Boolean,
    default: false,
  },
  luggageSpace: {
    type: Boolean,
    default: false,
  },

  // Corporate & Business
  corporateId: String,
  corporateEmail: String,
  isCorporateUser: {
    type: Boolean,
    default: false,
  },
  corporateDiscount: {
    type: Number,
    default: 0, // percentage
  },

  // Subscription & Membership
  membershipType: {
    type: String,
    enum: ['free', 'basic', 'premium', 'vip'],
    default: 'free',
  },
  membershipExpiry: Date,
  loyaltyPoints: {
    type: Number,
    default: 0,
  },

  // Communication Preferences
  smsNotifications: {
    type: Boolean,
    default: true,
  },
  emailNotifications: {
    type: Boolean,
    default: true,
  },
  pushNotifications: {
    type: Boolean,
    default: true,
  },
  promotionalOffers: {
    type: Boolean,
    default: true,
  },

  // App Settings
  voiceBooking: {
    type: Boolean,
    default: false,
  },
  malayalamVoice: {
    type: Boolean,
    default: false,
  },
  autoDetectLocation: {
    type: Boolean,
    default: true,
  },

  // Verification & Trust
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationBadge: {
    type: String,
    enum: ['none', 'basic', 'premium'],
    default: 'none',
  },
  trustScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 100,
  },

  // Recent Activity
  lastRideAt: Date,
  lastLoginAt: Date,
  deviceInfo: {
    platform: String,
    version: String,
    model: String,
  },

  // Admin Notes
  adminNotes: String,
  isBlocked: {
    type: Boolean,
    default: false,
  },
  blockReason: String,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
riderProfileSchema.index({ phone: 1 });
riderProfileSchema.index({ email: 1 });
riderProfileSchema.index({ membershipType: 1 });
riderProfileSchema.index({ isCorporateUser: 1 });

// Pre-save middleware
riderProfileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for rider's age
riderProfileSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  return Math.floor((Date.now() - this.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
});

// Method to calculate completion rate
riderProfileSchema.methods.getCompletionRate = function() {
  if (this.totalRides === 0) return 0;
  return (this.completedRides / this.totalRides) * 100;
};

// Method to check if rider is eligible for premium features
riderProfileSchema.methods.isPremiumEligible = function() {
  return this.membershipType !== 'free' && this.averageRating >= 4.0 && this.completedRides >= 10;
};

// Method to get primary emergency contact
riderProfileSchema.methods.getPrimaryEmergencyContact = function() {
  return this.emergencyContacts.find(contact => contact.isPrimary);
};

module.exports = mongoose.model('RiderProfile', riderProfileSchema);
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
