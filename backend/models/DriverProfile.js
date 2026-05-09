const mongoose = require('mongoose');

const driverProfileSchema = new mongoose.Schema({
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
  dateOfBirth: Date,

  // Vehicle Information
  vehicle: {
    number: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['bike', 'auto', 'mini_cab', 'sedan', 'suv', 'premium', 'ev'],
      required: true,
      index: true,
    },
    color: String,
    model: String,
    brand: String,
    yearOfManufacture: Number,
    registrationNumber: String,
  },

  // License Information
  license: {
    number: {
      type: String,
      required: true,
      unique: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    issuingState: String,
    dlCategory: {
      type: [String],
      default: ['LMV'], // Light Motor Vehicle
    },
  },

  // KYC Status & Documents
  kyc: {
    status: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected', 'expired'],
      default: 'pending',
      index: true,
    },
    submittedAt: Date,
    approvedAt: Date,
    rejectionReason: String,
    nextReviewAt: Date,
    documents: {
      license: {
        url: String,
        uploadedAt: Date,
        expiresAt: Date,
        isVerified: {
          type: Boolean,
          default: false,
        },
      },
      vehicleRC: {
        url: String,
        uploadedAt: Date,
        expiresAt: Date,
        isVerified: {
          type: Boolean,
          default: false,
        },
      },
      insurance: {
        url: String,
        uploadedAt: Date,
        expiresAt: Date,
        isVerified: {
          type: Boolean,
          default: false,
        },
      },
      pollutionCertificate: {
        url: String,
        uploadedAt: Date,
        expiresAt: Date,
        isVerified: {
          type: Boolean,
          default: false,
        },
      },
      selfie: {
        url: String,
        uploadedAt: Date,
        isVerified: {
          type: Boolean,
          default: false,
        },
      },
      aadhar: {
        url: String,
        uploadedAt: Date,
        isVerified: {
          type: Boolean,
          default: false,
        },
        number: String,
      },
    },
  },

  // Verification Status
  verification: {
    backgroundCheckStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'passed', 'failed'],
      default: 'pending',
    },
    backgroundCheckCompletedAt: Date,
    faceVerificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending',
    },
    faceVerificationCompletedAt: Date,
    bankVerificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending',
    },
    bankVerificationCompletedAt: Date,
  },

  // Bank Details
  bankAccount: {
    accountHolder: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    accountType: {
      type: String,
      enum: ['savings', 'current'],
    },
  },

  // Service Information
  serviceArea: {
    type: [String],
    default: [],
  },
  serviceTypes: {
    type: [String],
    enum: ['ridesharing', 'delivery', 'rental', 'intercity'],
    default: ['ridesharing'],
  },

  // Location & Availability
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false,
    },
  },
  lastLocationUpdate: Date,

  availability: {
    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['offline', 'online', 'busy', 'on_ride', 'break'],
      default: 'offline',
      index: true,
    },
    lastStatusChangeAt: Date,
    totalOnlineHours: {
      type: Number,
      default: 0,
    },
    todayOnlineHours: {
      type: Number,
      default: 0,
    },
  },

  // Performance Metrics
  statistics: {
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
    acceptanceRate: {
      type: Number,
      default: 100,
    },
    cancelRate: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 5,
      min: 0,
      max: 5,
      index: true,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    todayEarnings: {
      type: Number,
      default: 0,
    },
    weeklyEarnings: {
      type: Number,
      default: 0,
    },
    monthlyEarnings: {
      type: Number,
      default: 0,
    },
  },

  // Rating & Reviews
  ratings: [
    {
      rideId: mongoose.Schema.Types.ObjectId,
      rating: Number,
      feedback: String,
      ratedBy: mongoose.Schema.Types.ObjectId,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  // Emergency Contact
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String,
  },

  // Account Status
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'banned', 'deactivated'],
    default: 'active',
    index: true,
  },
  suspensionReason: String,
  suspendedAt: Date,
  suspendedUntil: Date,

  // Referral
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Device Management
  deviceTokens: [String],
  registeredDevices: [
    {
      deviceId: String,
      deviceName: String,
      osType: {
        type: String,
        enum: ['ios', 'android', 'web'],
      },
      registeredAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  // Preferences
  preferences: {
    preferredLanguage: {
      type: String,
      default: 'english',
      enum: ['english', 'malayalam', 'tamil', 'hindi'],
    },
    shareMetrics: {
      type: Boolean,
      default: true,
    },
    allowDataAnalytics: {
      type: Boolean,
      default: true,
    },
  },

  // Flags
  flags: {
    isNewDriver: {
      type: Boolean,
      default: true,
    },
    hasCompletedFirstRide: {
      type: Boolean,
      default: false,
    },
    isTopRated: {
      type: Boolean,
      default: false,
    },
  },

  // Timestamps
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

// Geospatial index for driver location searches
driverProfileSchema.index({
  'currentLocation': '2dsphere',
});

// Compound indexes for common queries
driverProfileSchema.index({
  'availability.status': 1,
  'statistics.averageRating': -1,
});

driverProfileSchema.index({
  'accountStatus': 1,
  'availability.isOnline': 1,
});

driverProfileSchema.index({
  'kyc.status': 1,
  'verification.backgroundCheckStatus': 1,
});

// Virtual for driver name
driverProfileSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName || ''}`.trim();
});

// Ensure virtuals are included in JSON
driverProfileSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('DriverProfile', driverProfileSchema);
