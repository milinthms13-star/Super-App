const mongoose = require('mongoose');

const locationSessionSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  periodic: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  },
  lastUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
locationSessionSchema.index({ senderId: 1, active: 1 });
locationSessionSchema.index({ recipientId: 1, active: 1 });
locationSessionSchema.index({ endTime: 1 });

module.exports = mongoose.model('LocationSession', locationSessionSchema);