const mongoose = require('mongoose');

const rideRequestSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  pickup: {
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
  },
  destination: {
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
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'auto', 'car', 'hatchback', 'sedan'],
    required: true,
  },
  seats: {
    type: Number,
    min: 1,
    max: 6,
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

