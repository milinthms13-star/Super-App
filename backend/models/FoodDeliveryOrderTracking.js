const mongoose = require('mongoose');

// Real-time tracking for deliveries in progress
const OrderTrackingSchema = new mongoose.Schema({
  // References
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodDeliveryOrder',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodDeliveryRestaurant',
    required: true,
  },
  deliveryPersonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider', // or DeliveryPerson
    required: true,
  },

  // Current location (rider's real-time location)
  currentLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number, // GPS accuracy in meters
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },

  // Restaurant and delivery locations
  restaurantLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
  },
  deliveryLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
  },

  // Distance tracking
  distanceFromRestaurant: Number, // kilometers
  distanceToDelivery: Number, // kilometers
  totalDistance: Number, // kilometers
  distanceCovered: Number, // kilometers

  // ETA and time tracking
  estimatedDeliveryTime: Date,
  estimatedTimeRemaining: Number, // seconds
  lastETAUpdate: Date,
  
  // Actual times
  pickedUpAt: Date,
  estimatedPickupTime: Date,
  
  // Waypoints (if using route optimization)
  route: [
    {
      latitude: Number,
      longitude: Number,
      timestamp: Date,
      speed: Number, // km/h
    },
  ],

  // Delivery person details
  deliveryPersonName: String,
  deliveryPersonPhone: String,
  deliveryPersonImage: String,
  vehicleType: String, // bike, cycle, scooter
  vehicleNumber: String,
  riderRating: Number,

  // Tracking status
  status: {
    type: String,
    enum: ['picked_up', 'on_way', 'nearby', 'arrived', 'completed', 'failed'],
    default: 'on_way',
    index: true,
  },

  // Proximity alerts
  notifications: [
    {
      type: {
        type: String,
        enum: ['location_update', 'arrival_soon', 'nearby', 'arrived', 'eta_changed'],
      },
      message: String,
      timestamp: Date,
      sentToCustomer: Boolean,
      sentToRestaurant: Boolean,
    },
  ],

  // Issues during delivery
  issues: [
    {
      type: {
        type: String,
        enum: ['delivery_delay', 'navigation_error', 'traffic_heavy', 'rider_issue'],
      },
      description: String,
      severity: { type: String, enum: ['low', 'medium', 'high'] },
      reportedAt: Date,
      resolvedAt: Date,
      resolution: String,
    },
  ],

  // Performance metrics
  actualDeliveryTime: Date,
  delayReason: String,
  deliveryNotes: String,

  // Location history (last 100 updates)
  locationHistory: [
    {
      latitude: Number,
      longitude: Number,
      timestamp: {
        type: Date,
        index: true,
      },
      speed: Number,
    },
  ],

  // Active tracking flag
  isTracking: {
    type: Boolean,
    default: true,
    index: true,
  },

  // Last connection details
  lastLocationUpdate: Date,
  connectionStatus: {
    type: String,
    enum: ['connected', 'disconnected', 'offline'],
    default: 'connected',
  },

  // Emergency contact
  emergencyContact: {
    enabled: Boolean,
    callStarted: Date,
    callDuration: Number, // seconds
    notes: String,
  },

}, {
  collection: 'fooddeliveryordertracking',
  timestamps: true,
});

// Index for real-time queries
OrderTrackingSchema.index({ orderId: 1, 'currentLocation.timestamp': -1 });
OrderTrackingSchema.index({ deliveryPersonId: 1, isTracking: 1 });
OrderTrackingSchema.index({ userId: 1, isTracking: 1 });
OrderTrackingSchema.index({ restaurantId: 1, 'currentLocation.timestamp': -1 });

// Index for location-based queries (geospatial)
OrderTrackingSchema.index({ 'currentLocation.latitude': 1, 'currentLocation.longitude': 1 });
OrderTrackingSchema.index({ 'restaurantLocation.latitude': 1, 'restaurantLocation.longitude': 1 });
OrderTrackingSchema.index({ 'deliveryLocation.latitude': 1, 'deliveryLocation.longitude': 1 });

// TTL Index: Auto-delete 7 days after completion
OrderTrackingSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 604800, // 7 days
    partialFilterExpression: { status: 'completed' },
  }
);

// Methods
OrderTrackingSchema.methods.updateCurrentLocation = function(latitude, longitude, accuracy) {
  this.currentLocation = {
    latitude,
    longitude,
    accuracy,
    timestamp: new Date(),
  };
  
  // Add to location history (keep last 100)
  if (!this.locationHistory) this.locationHistory = [];
  this.locationHistory.push({
    latitude,
    longitude,
    timestamp: new Date(),
  });
  
  if (this.locationHistory.length > 100) {
    this.locationHistory = this.locationHistory.slice(-100);
  }
  
  this.lastLocationUpdate = new Date();
  return this;
};

OrderTrackingSchema.methods.calculateDistance = function() {
  // Haversine formula for distance
  const toRad = (deg) => (deg * Math.PI) / 180;
  
  if (!this.currentLocation || !this.deliveryLocation) return null;
  
  const lat1 = this.currentLocation.latitude;
  const lon1 = this.currentLocation.longitude;
  const lat2 = this.deliveryLocation.latitude;
  const lon2 = this.deliveryLocation.longitude;
  
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

OrderTrackingSchema.methods.isNearby = function(radiusKm = 1) {
  const distance = this.calculateDistance();
  return distance !== null && distance <= radiusKm;
};

OrderTrackingSchema.methods.calculateETAtoDelivery = function(averageSpeedKmh = 25) {
  const distance = this.calculateDistance();
  if (!distance || distance === 0) return null;
  
  // Calculate ETA: (distance / speed) * 60 minutes
  const etaMinutes = (distance / averageSpeedKmh) * 60;
  const etaMs = etaMinutes * 60 * 1000;
  
  this.estimatedDeliveryTime = new Date(Date.now() + etaMs);
  this.estimatedTimeRemaining = etaMinutes * 60; // in seconds
  this.lastETAUpdate = new Date();
  
  return {
    etaMinutes: Math.round(etaMinutes),
    etaTime: this.estimatedDeliveryTime,
    distanceKm: Math.round(distance * 100) / 100,
  };
};

OrderTrackingSchema.methods.addNotification = function(type, message) {
  if (!this.notifications) this.notifications = [];
  
  this.notifications.push({
    type,
    message,
    timestamp: new Date(),
    sentToCustomer: false,
    sentToRestaurant: false,
  });
};

OrderTrackingSchema.methods.reportIssue = function(issueType, description, severity = 'medium') {
  if (!this.issues) this.issues = [];
  
  this.issues.push({
    type: issueType,
    description,
    severity,
    reportedAt: new Date(),
  });
  
  this.addNotification('issue', `Delivery issue: ${description}`);
};

OrderTrackingSchema.methods.startEmergencyCall = function() {
  this.emergencyContact = {
    enabled: true,
    callStarted: new Date(),
    callDuration: 0,
  };
};

OrderTrackingSchema.methods.endEmergencyCall = function() {
  if (this.emergencyContact && this.emergencyContact.callStarted) {
    const callDuration = new Date() - this.emergencyContact.callStarted;
    this.emergencyContact.callDuration = Math.round(callDuration / 1000); // seconds
  }
};

OrderTrackingSchema.methods.toSummary = function() {
  return {
    trackingId: this._id,
    orderId: this.orderId,
    status: this.status,
    deliveryPerson: {
      name: this.deliveryPersonName,
      phone: this.deliveryPersonPhone,
      image: this.deliveryPersonImage,
      rating: this.riderRating,
      vehicle: {
        type: this.vehicleType,
        number: this.vehicleNumber,
      },
    },
    currentLocation: this.currentLocation,
    deliveryLocation: this.deliveryLocation,
    distanceToDelivery: this.distanceToDelivery,
    eta: {
      estimatedTime: this.estimatedDeliveryTime,
      estimatedMinutes: this.estimatedTimeRemaining
        ? Math.round(this.estimatedTimeRemaining / 60)
        : null,
    },
    isNearby: this.isNearby(),
    lastUpdate: this.lastLocationUpdate,
  };
};

OrderTrackingSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('FoodDeliveryOrderTracking', OrderTrackingSchema);
