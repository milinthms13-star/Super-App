const mongoose = require('mongoose');

const locationUpdateSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LocationSession',
    required: true
  },
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  accuracy: {
    type: Number,
    min: 0,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
locationUpdateSchema.index({ sessionId: 1, timestamp: -1 });

module.exports = mongoose.model('LocationUpdate', locationUpdateSchema);