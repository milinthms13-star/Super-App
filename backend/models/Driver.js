const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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

  // Vehicle Information
  vehicleType: {
    type: String,
    enum: ['bike', 'auto', 'mini_car', 'sedan', 'suv', 'outstation_taxi', 'rental_car'],
    required: true,
  },
  vehicleNumber: {
    type: String,
    required: true,
    unique: true,
  },
  vehicleModel: {
    type: String,
    required: true,
  },
  vehicleColor: {
    type: String,
    required: true,
  },
  vehicleYear: Number,
  vehicleCapacity: {
    type: Number,
    default: 1,
  },

  // Documents
  licenseNumber: {
    type: String,
    required: true,
  },
  licenseExpiry: {
    type: Date,
    required: true,
  },
  licensePhoto: String,
  vehicleRC: String,
  vehicleInsurance: String,
  vehiclePermit: String,
  profilePhoto: String,

  // KYC Status
  kycStatus: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'rejected'],
    default: 'pending',
  },
  kycSubmittedAt: Date,
  kycApprovedAt: Date,
  kycRejectedReason: String,

  // Driver Status
  isOnline: {
    type: Boolean,
    default: false,
  },
  availabilityStatus: {
    type: String,
    enum: ['offline', 'available', 'busy', 'suspended', 'blocked'],
    default: 'offline',
    index: true,
  },

  // Location
  currentLat: Number,
  currentLng: Number,
  lastLocationUpdate: Date,
  homeLocation: {
    address: String,
    lat: Number,
    lng: Number,
  },

  // Performance Metrics
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 5,
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

  // Subscription & Plans
  subscriptionPlan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'vip'],
    default: 'free',
  },
  subscriptionExpiry: Date,

  // Preferences
  serviceTypes: {
    type: [String],
    default: ['ridesharing'],
    enum: ['ridesharing', 'fooddelivery', 'grocery', 'medicine'],
  },
  preferredAreas: [String],
  languages: {
    type: [String],
    default: ['English'],
  },
  acceptsCash: {
    type: Boolean,
    default: true,
  },
  acceptsCard: {
    type: Boolean,
    default: true,
  },
  acceptsUPI: {
    type: Boolean,
    default: true,
  },

  // Safety & Verification
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationBadge: {
    type: String,
    enum: ['none', 'basic', 'premium', 'vip'],
    default: 'none',
  },
  backgroundCheckStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },

  // Emergency Contacts
  emergencyContacts: [{
    name: String,
    phone: String,
    relation: String,
  }],

  // Bank Details
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    upiId: String,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  lastActiveAt: Date,
});

// Indexes
driverSchema.index({ currentLat: 1, currentLng: 1 });
driverSchema.index({ availabilityStatus: 1, vehicleType: 1 });
driverSchema.index({ kycStatus: 1 });
driverSchema.index({ rating: -1 });
driverSchema.index({ totalEarnings: -1 });

// Pre-save middleware
driverSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for driver's age
driverSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  return Math.floor((Date.now() - this.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
});

// Method to calculate driver's completion rate
driverSchema.methods.getCompletionRate = function() {
  if (this.totalRides === 0) return 0;
  return (this.completedRides / this.totalRides) * 100;
};

// Method to check if driver is eligible for premium features
driverSchema.methods.isPremiumEligible = function() {
  return this.rating >= 4.5 && this.completedRides >= 100 && this.kycStatus === 'approved';
};

module.exports = mongoose.model('Driver', driverSchema);

