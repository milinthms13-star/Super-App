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
    enum: ['standby', 'active', 'escalated', 'acknowledged', 'resolved', 'cancelled'],
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
  locationText: {
    type: String,
    default: ''
  },
  mapsUrl: {
    type: String,
    default: ''
  },
  accuracy: {
    type: Number,
    default: null
  },
  channels: [{
    type: String,
    enum: ['SMS', 'WhatsApp', 'Call', 'Push']
  }],
  batteryStatus: {
    supported: {
      type: Boolean,
      default: false
    },
    level: {
      type: Number,
      default: null
    },
    charging: {
      type: Boolean,
      default: false
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
    responderName: String,
    responderEmail: String,
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
  responseNotes: [{
    text: {
      type: String,
      trim: true
    },
    responderName: String,
    responderEmail: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  responderLocations: [{
    responderName: String,
    responderEmail: String,
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    mapsUrl: String,
    createdAt: {
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

module.exports = mongoose.models.SosIncident || mongoose.model('SosIncident', sosIncidentSchema);

