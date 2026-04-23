const mongoose = require('mongoose');

const sosIncidentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['standby', 'active', 'escalated', 'acknowledged', 'resolved'],
    default: 'active'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  acknowledgedBy: [{
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SosContact'
    },
    timestamp: { 
      type: Date, 
      default: Date.now 
    }
  }],
  notificationsSent: [{
    type: {
      type: String,
enum: ['push', 'sms', 'call', 'whatsapp']
    },
    to: String, // phone or userId.toString()
    status: String, // sent, delivered, failed
    timestamp: { 
      type: Date, 
      default: Date.now 
    }
  }],
  history: [{
    event: String,
    timestamp: { 
      type: Date, 
      default: Date.now 
    },
    data: mongoose.Schema.Types.Mixed
  }],
  resolvedAt: Date
}, {
  timestamps: true
});

sosIncidentSchema.index({ userId: 1, createdAt: -1 });
sosIncidentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SosIncident', sosIncidentSchema);

