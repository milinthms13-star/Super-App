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
    default: 'active',
    set: (value) => (value === 'ongoing' ? 'active' : value)
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
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
  // Priority 3: Status History & Real-Time Updates
  statusHistory: [{
    status: {
      type: String,
      enum: ['initial', 'acknowledged', 'en-route', 'arrived', 'resolved', 'escalated'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: String,  // responder email
      required: true
    },
    responderName: String,
    responderLocation: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      mapsUrl: String
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  currentStatus: {
    type: String,
    enum: ['initial', 'acknowledged', 'en-route', 'arrived', 'resolved', 'escalated'],
    default: 'initial'
  },
  lastStatusUpdate: Date,
  lastUpdatedBy: String,
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
// Priority 3: Status history indexes
sosIncidentSchema.index({ currentStatus: 1 });
sosIncidentSchema.index({ lastStatusUpdate: -1 });
sosIncidentSchema.index({ userId: 1, currentStatus: 1 });
sosIncidentSchema.index({ userId: 1, lastStatusUpdate: -1 });
// TTL index for old status history (optional cleanup)
sosIncidentSchema.index({ 'statusHistory.timestamp': 1 }, { expireAfterSeconds: 7776000 }); // 90 days

sosIncidentSchema.pre('validate', function normalizeLocationAndStatus(next) {
  if (this.status === 'ongoing') {
    this.status = 'active';
  }

  const hasLatLng = Number.isFinite(this.latitude) && Number.isFinite(this.longitude);
  const hasCoordinates =
    this.location &&
    Array.isArray(this.location.coordinates) &&
    this.location.coordinates.length === 2 &&
    Number.isFinite(this.location.coordinates[0]) &&
    Number.isFinite(this.location.coordinates[1]);

  if (hasLatLng && !hasCoordinates) {
    this.location = this.location || {};
    this.location.type = 'Point';
    this.location.coordinates = [this.longitude, this.latitude];
  }

  if (!hasLatLng && hasCoordinates) {
    this.longitude = this.location.coordinates[0];
    this.latitude = this.location.coordinates[1];
  }

  next();
});

module.exports = mongoose.models.SosIncident || mongoose.model('SosIncident', sosIncidentSchema);
