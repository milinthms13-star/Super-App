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
  serviceArea: [String],
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
});

driverSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Driver', driverSchema);

