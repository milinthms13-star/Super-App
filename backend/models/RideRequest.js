const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  // Ride Identification
  rideId: {
    type: String,
    unique: true,
    required: true,
  },
  bookingType: {
    type: String,
    enum: ['instant', 'scheduled', 'outstation', 'rental', 'airport', 'hospital', 'school', 'corporate'],
    default: 'instant',
  },

  // Customer Information
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  customerDetails: {
    name: String,
    phone: String,
    email: String,
  },

  // Driver Information
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  driverDetails: {
    name: String,
    phone: String,
    vehicleNumber: String,
    vehicleType: String,
    vehicleColor: String,
    rating: Number,
    profilePhoto: String,
  },

  // Location Information
  pickup: {
    address: {
      type: String,
      required: true,
    },
    landmark: String,
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    placeId: String,
  },
  destination: {
    address: {
      type: String,
      required: true,
    },
    landmark: String,
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    placeId: String,
  },

  // Ride Details
  vehicleType: {
    type: String,
    enum: ['bike', 'auto', 'mini_car', 'sedan', 'suv', 'outstation_taxi', 'rental_car'],
    required: true,
  },
  serviceType: {
    type: String,
    enum: ['regular', 'premium', 'women_only', 'senior_citizen', 'emergency', 'tourist'],
    default: 'regular',
  },
  seats: {
    type: Number,
    min: 1,
    max: 6,
    default: 1,
  },

  // Pricing Information
  pricing: {
    baseFare: {
      type: Number,
      required: true,
    },
    distanceFare: {
      type: Number,
      required: true,
    },
    timeFare: {
      type: Number,
      required: true,
    },
    surgeMultiplier: {
      type: Number,
      default: 1,
    },
    tollCharges: {
      type: Number,
      default: 0,
    },
    parkingCharges: {
      type: Number,
      default: 0,
    },
    nightCharges: {
      type: Number,
      default: 0,
    },
    waitingCharges: {
      type: Number,
      default: 0,
    },
    cancellationCharges: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    totalFare: {
      type: Number,
      required: true,
    },
    estimatedFare: {
      type: Number,
      required: true,
    },
  },

  // Distance & Time
  distance: {
    value: Number, // in meters
    text: String, // human readable
  },
  duration: {
    value: Number, // in seconds
    text: String, // human readable
  },
  actualDistance: Number, // actual distance traveled
  actualDuration: Number, // actual time taken

  // Status & Timeline
  status: {
    type: String,
    enum: [
      'requested',
      'searching_driver',
      'driver_assigned',
      'driver_arriving',
      'driver_arrived',
      'ride_started',
      'ride_completed',
      'cancelled',
      'no_driver_found',
      'payment_pending',
      'payment_completed'
    ],
    default: 'requested',
    index: true,
  },
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    notes: String,
  }],

  // OTP & Verification
  otp: {
    rideStart: String,
    payment: String,
  },
  otpVerified: {
    rideStart: {
      type: Boolean,
      default: false,
    },
    payment: {
      type: Boolean,
      default: false,
    },
  },

  // Payment Information
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'card', 'wallet'],
    default: 'cash',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentDetails: {
    transactionId: String,
    paymentGateway: String,
    amountPaid: Number,
    paymentTime: Date,
  },

  // Scheduled Ride
  scheduledTime: Date,
  isScheduled: {
    type: Boolean,
    default: false,
  },

  // Cancellation
  cancelledBy: {
    type: String,
    enum: ['customer', 'driver', 'system', 'admin'],
  },
  cancellationReason: {
    type: String,
    enum: [
      'customer_request',
      'driver_not_found',
      'driver_cancelled',
      'wrong_pickup',
      'wrong_destination',
      'emergency',
      'technical_issue',
      'payment_failed',
      'other'
    ],
  },
  cancellationNotes: String,
  cancellationCharges: Number,

  // Safety & Emergency
  sosActivated: {
    type: Boolean,
    default: false,
  },
  sosTimestamp: Date,
  emergencyContacts: [{
    name: String,
    phone: String,
    notified: {
      type: Boolean,
      default: false,
    },
    notifiedAt: Date,
  }],
  liveRideLink: String,
  shareRideEnabled: {
    type: Boolean,
    default: true,
  },

  // Route & Tracking
  route: {
    polyline: String,
    waypoints: [{
      lat: Number,
      lng: Number,
    }],
  },
  trackingData: [{
    lat: Number,
    lng: Number,
    timestamp: Date,
    speed: Number,
  }],

  // Ratings & Feedback
  customerRating: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: String,
    ratedAt: Date,
  },
  driverRating: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: String,
    ratedAt: Date,
  },

  // Commission & Earnings
  commission: {
    platformFee: Number,
    driverEarnings: Number,
    taxDeducted: Number,
  },

  // Additional Services
  specialRequests: [String],
  luggage: {
    type: Boolean,
    default: false,
  },
  petFriendly: {
    type: Boolean,
    default: false,
  },

  // Admin Notes
  adminNotes: String,
  priority: {
    type: String,
    enum: ['normal', 'high', 'urgent'],
    default: 'normal',
  },

  // Timestamps
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  assignedAt: Date,
  arrivedAt: Date,
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
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
rideSchema.index({ customerId: 1, status: 1 });
rideSchema.index({ driverId: 1, status: 1 });
rideSchema.index({ status: 1, createdAt: -1 });
rideSchema.index({ 'pickup.lat': 1, 'pickup.lng': 1 });
rideSchema.index({ 'destination.lat': 1, 'destination.lng': 1 });
rideSchema.index({ rideId: 1 });
rideSchema.index({ scheduledTime: 1 });

// Pre-save middleware
rideSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Generate rideId if not present
  if (!this.rideId) {
    this.rideId = 'RIDE' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }

  // Generate OTPs if not present
  if (!this.otp.rideStart) {
    this.otp.rideStart = Math.floor(1000 + Math.random() * 9000).toString();
  }
  if (!this.otp.payment) {
    this.otp.payment = Math.floor(1000 + Math.random() * 9000).toString();
  }

  next();
});

// Virtual for ride duration in minutes
rideSchema.virtual('durationMinutes').get(function() {
  if (!this.actualDuration) return null;
  return Math.round(this.actualDuration / 60);
});

// Virtual for ride distance in km
rideSchema.virtual('distanceKm').get(function() {
  if (!this.actualDistance) return null;
  return (this.actualDistance / 1000).toFixed(2);
});

// Method to calculate total earnings for driver
rideSchema.methods.calculateDriverEarnings = function() {
  if (!this.pricing.totalFare || !this.commission) return 0;
  return this.pricing.totalFare - this.commission.platformFee - this.commission.taxDeducted;
};

// Method to check if ride can be cancelled
rideSchema.methods.canCancel = function() {
  const cancellableStatuses = ['requested', 'searching_driver', 'driver_assigned', 'driver_arriving'];
  return cancellableStatuses.includes(this.status);
};

// Method to get cancellation charges
rideSchema.methods.getCancellationCharges = function() {
  if (this.status === 'driver_arriving' || this.status === 'driver_arrived') {
    return 50; // ₹50 cancellation charge
  }
  return 0;
};

module.exports = mongoose.model('Ride', rideSchema);
    default: 1,
  },
  estimatedFare: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['requested', 'driver_assigned', 'accepted', 'started', 'arrived_pickup', 'in_transit', 'arrived', 'cancelled', 'completed'],
    default: 'requested',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending',
  },
  notes: String,
  otp: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  cancelledBy: String,
  cancelReason: String,
});

rideRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('RideRequest', rideRequestSchema);

