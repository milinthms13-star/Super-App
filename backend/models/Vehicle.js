const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
  },

  // Vehicle Identification
  vehicleNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
  },

  // Vehicle Details
  type: {
    type: String,
    enum: ['bike', 'auto', 'mini_car', 'sedan', 'suv', 'outstation_taxi', 'rental_car'],
    required: true,
  },
  category: {
    type: String,
    enum: ['bike_taxi', 'auto_rickshaw', 'mini_car', 'sedan', 'suv', 'premium_sedan', 'luxury_suv'],
    required: true,
  },
  make: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
    min: 2000,
    max: new Date().getFullYear() + 1,
  },
  color: {
    type: String,
    required: true,
  },

  // Capacity & Features
  seatingCapacity: {
    type: Number,
    required: true,
    min: 1,
    max: 7,
  },
  luggageCapacity: {
    type: Number, // in liters
    default: 0,
  },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'cng', 'electric', 'hybrid'],
    required: true,
  },
  transmission: {
    type: String,
    enum: ['manual', 'automatic'],
    default: 'manual',
  },

  // Documents
  rcBookNumber: String,
  rcBookExpiry: Date,
  rcBookPhoto: String,
  insuranceNumber: String,
  insuranceExpiry: {
    type: Date,
    required: true,
  },
  insurancePhoto: String,
  permitNumber: String,
  permitExpiry: Date,
  permitPhoto: String,
  pollutionCertificate: String,
  pollutionExpiry: Date,
  pollutionPhoto: String,

  // Vehicle Photos
  photos: {
    front: String,
    back: String,
    left: String,
    right: String,
    interior: String,
  },

  // Vehicle Condition
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good',
  },
  mileage: Number, // km/l
  lastServiceDate: Date,
  nextServiceDue: Date,

  // Features & Amenities
  features: {
    ac: {
      type: Boolean,
      default: false,
    },
    musicSystem: {
      type: Boolean,
      default: false,
    },
    bluetooth: {
      type: Boolean,
      default: false,
    },
    usbCharging: {
      type: Boolean,
      default: false,
    },
    childSeat: {
      type: Boolean,
      default: false,
    },
    petFriendly: {
      type: Boolean,
      default: false,
    },
    wheelchairAccessible: {
      type: Boolean,
      default: false,
    },
  },

  // Verification Status
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'suspended'],
    default: 'pending',
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectionReason: String,

  // Operational Status
  isActive: {
    type: Boolean,
    default: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
  },

  // Performance Metrics
  totalRides: {
    type: Number,
    default: 0,
  },
  totalDistance: {
    type: Number,
    default: 0, // in km
  },
  totalEarnings: {
    type: Number,
    default: 0,
  },
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 5,
  },

  // Pricing Configuration
  baseFare: {
    type: Number,
    required: true,
  },
  perKmRate: {
    type: Number,
    required: true,
  },
  perMinuteRate: {
    type: Number,
    required: true,
  },
  minimumFare: {
    type: Number,
    required: true,
  },
  cancellationFee: {
    type: Number,
    default: 0,
  },

  // Location & Service Area
  serviceCity: {
    type: String,
    required: true,
  },
  serviceAreas: [String], // areas where this vehicle can operate
  homeLocation: {
    lat: Number,
    lng: Number,
    address: String,
  },

  // Admin Notes
  adminNotes: String,
  priority: {
    type: String,
    enum: ['normal', 'high', 'vip'],
    default: 'normal',
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
});

// Indexes
vehicleSchema.index({ driverId: 1 });
vehicleSchema.index({ vehicleNumber: 1 });
vehicleSchema.index({ type: 1, verificationStatus: 1 });
vehicleSchema.index({ serviceCity: 1 });
vehicleSchema.index({ isActive: 1, isAvailable: 1 });

// Pre-save middleware
vehicleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Set category based on type
  if (!this.category) {
    const typeToCategory = {
      'bike': 'bike_taxi',
      'auto': 'auto_rickshaw',
      'mini_car': 'mini_car',
      'sedan': 'sedan',
      'suv': 'luxury_suv',
      'outstation_taxi': 'premium_sedan',
      'rental_car': 'sedan',
    };
    this.category = typeToCategory[this.type] || this.type;
  }

  next();
});

// Virtual for vehicle age
vehicleSchema.virtual('age').get(function() {
  return new Date().getFullYear() - this.year;
});

// Method to check if vehicle documents are valid
vehicleSchema.methods.areDocumentsValid = function() {
  const now = new Date();
  return (
    (!this.insuranceExpiry || this.insuranceExpiry > now) &&
    (!this.permitExpiry || this.permitExpiry > now) &&
    (!this.pollutionExpiry || this.pollutionExpiry > now) &&
    (!this.rcBookExpiry || this.rcBookExpiry > now)
  );
};

// Method to check if vehicle is eligible for rides
vehicleSchema.methods.isEligibleForRides = function() {
  return (
    this.isActive &&
    !this.maintenanceMode &&
    this.verificationStatus === 'verified' &&
    this.areDocumentsValid()
  );
};

// Method to calculate estimated fare
vehicleSchema.methods.calculateFare = function(distanceKm, durationMinutes) {
  const distanceFare = distanceKm * this.perKmRate;
  const timeFare = durationMinutes * this.perMinuteRate;
  const totalFare = Math.max(this.minimumFare, this.baseFare + distanceFare + timeFare);
  return Math.round(totalFare);
};

module.exports = mongoose.model('Vehicle', vehicleSchema);