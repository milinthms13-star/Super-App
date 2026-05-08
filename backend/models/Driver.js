const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  vehicleNumber: {
    type: String,
    required: true,
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'auto', 'car', 'hatchback', 'sedan'],
    required: true,
  },
  vehicleColor: String,
  licenseNumber: String,
  isOnline: {
    type: Boolean,
    default: false,
  },
  availabilityStatus: {
    type: String,
    enum: ['offline', 'available', 'busy', 'suspended'],
    default: 'offline',
    index: true,
  },
  serviceTypes: {
    type: [String],
    default: ['ridesharing', 'fooddelivery'],
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'rejected'],
    default: 'pending',
  },
  currentLat: Number,
  currentLng: Number,
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
  availableSeats: {
    type: Number,
    min: 1,
    default: 4,
  },
  currentOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodOrder',
    default: null,
    index: true,
  },
  serviceArea: [String],
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String,
  },
  foodDeliveryStats: {
    assignedOrders: {
      type: Number,
      default: 0,
    },
    completedOrders: {
      type: Number,
      default: 0,
    },
    cancelledOrders: {
      type: Number,
      default: 0,
    },
  },
  documents: {
    license: String,
    insurance: String,
    pollution: String,
    verified: {
      type: Boolean,
      default: false,
    },
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
});

driverSchema.pre('save', function(next) {
  if (this.isOnline && this.availabilityStatus === 'offline') {
    this.availabilityStatus = this.currentOrderId ? 'busy' : 'available';
  }

  if (!this.isOnline && this.availabilityStatus !== 'suspended') {
    this.availabilityStatus = 'offline';
  }

  this.updatedAt = new Date();
  this.lastActiveAt = new Date();
  next();
});

module.exports = mongoose.model('Driver', driverSchema);

