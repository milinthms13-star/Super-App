/**
 * Delivery Partner Location Model - Phase 9 Feature A
 * Real-time GPS tracking of delivery partners
 */

const mongoose = require('mongoose');

const DeliveryPartnerLocationSchema = new mongoose.Schema(
  {
    locationId: { type: String, unique: true, required: true },
    deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner', required: true },
    currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodOrder' },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },

    // Current Location (Geospatial)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: String,
    zone: String,
    updatedAt: { type: Date, default: Date.now },
    accuracy: Number, // meters
    altitude: Number,
    speed: Number, // km/h
    heading: Number, // degrees (0-360)

    // Movement Tracking
    movementHistory: [
      {
        latitude: Number,
        longitude: Number,
        timestamp: Date,
        speed: Number,
        heading: Number,
      },
    ],
    lastStopsHistory: [
      {
        latitude: Number,
        longitude: Number,
        arrivedAt: Date,
        leftAt: Date,
        duration: Number, // minutes
        type: { type: String, enum: ['restaurant', 'delivery', 'break', 'other'] },
      },
    ],

    // Availability & Status
    onlineStatus: { type: String, enum: ['online', 'offline', 'on_delivery', 'break'], default: 'online' },
    activeOrder: {
      orderId: mongoose.Schema.Types.ObjectId,
      status: String,
      startedAt: Date,
      estimatedEndTime: Date,
    },

    // Performance Metrics
    todayMetrics: {
      totalDistance: { type: Number, default: 0 }, // km
      totalTime: { type: Number, default: 0 }, // minutes
      ordersCompleted: { type: Number, default: 0 },
      averageSpeed: { type: Number, default: 0 }, // km/h
      peakHour: String,
    },

    // Geofencing
    geofences: [
      {
        geofenceId: String,
        type: { type: String, enum: ['restaurant', 'delivery_zone', 'hotspot', 'restricted'] },
        name: String,
        enteredAt: Date,
        leftAt: Date,
        duration: Number,
      },
    ],

    // Service Area Coverage
    serviceAreas: [
      {
        areaId: String,
        areaName: String,
        polygon: [{ latitude: Number, longitude: Number }],
        coverage: Boolean,
      },
    ],

    // Real-time Analytics
    analytics: {
      efficiencyScore: { type: Number, min: 0, max: 100 }, // % of time actively delivering
      averageDeliveryDistance: Number,
      completedOrdersToday: { type: Number, default: 0 },
      cancelledOrders: { type: Number, default: 0 },
      averageDeliveryTime: Number,
      onTimeDeliveryPercentage: { type: Number, min: 0, max: 100 },
    },

    // Network & Connectivity
    connectivity: {
      lastSyncTime: Date,
      signalStrength: { type: Number, min: 0, max: 100 }, // signal percentage
      isConnected: { type: Boolean, default: true },
      connectionType: { type: String, enum: ['wifi', '4g', '5g', 'unknown'] },
      offlineDuration: Number, // seconds
    },

    // Safety & Security
    safetyMetrics: {
      accidentsReported: { type: Number, default: 0 },
      complaintCount: { type: Number, default: 0 },
      lastIncidentDate: Date,
      verificationStatus: { type: String, enum: ['verified', 'pending', 'failed'], default: 'pending' },
    },

    status: { type: String, enum: ['active', 'inactive', 'paused', 'archived'], default: 'active' },
  },
  { timestamps: true, collection: 'deliverypartnerlocations' }
);

// Geospatial index for location queries
DeliveryPartnerLocationSchema.index({ location: '2dsphere' });
DeliveryPartnerLocationSchema.index({ deliveryPartnerId: 1, onlineStatus: 1 });
DeliveryPartnerLocationSchema.index({ updatedAt: -1 });
DeliveryPartnerLocationSchema.index({ 'activeOrder.orderId': 1 });
DeliveryPartnerLocationSchema.index({ zone: 1, onlineStatus: 1 });

// Instance Methods
DeliveryPartnerLocationSchema.methods.updateLocation = function (latitude, longitude, accuracy, speed, heading) {
  // Add to movement history
  this.movementHistory.push({
    latitude,
    longitude,
    timestamp: new Date(),
    speed,
    heading,
  });

  // Keep only last 100 movements
  if (this.movementHistory.length > 100) {
    this.movementHistory = this.movementHistory.slice(-100);
  }

  // Update current location
  this.location = {
    type: 'Point',
    coordinates: [longitude, latitude],
  };
  this.accuracy = accuracy;
  this.speed = speed;
  this.heading = heading;
  this.updatedAt = new Date();

  return this.save();
};

DeliveryPartnerLocationSchema.methods.recordStop = function (latitude, longitude, type, duration) {
  this.lastStopsHistory.push({
    latitude,
    longitude,
    arrivedAt: new Date(),
    duration,
    type,
  });

  // Keep last 50 stops
  if (this.lastStopsHistory.length > 50) {
    this.lastStopsHistory = this.lastStopsHistory.slice(-50);
  }

  return this.save();
};

DeliveryPartnerLocationSchema.methods.calculateEfficiencyScore = function () {
  if (this.todayMetrics.totalTime === 0) return 0;
  const activeTime = this.todayMetrics.totalTime - 30; // Assume 30 min for breaks
  return Math.min(100, (activeTime / this.todayMetrics.totalTime) * 100);
};

module.exports = mongoose.model('DeliveryPartnerLocation', DeliveryPartnerLocationSchema);
