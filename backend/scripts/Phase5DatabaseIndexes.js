/**
 * Phase5DatabaseIndexes.js
 * Setup MongoDB indexes required for Phase 5: AI & Smart Features
 * Execute this once during deployment or when setting up new environment
 * 
 * Command: node backend/scripts/Phase5DatabaseIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const DriverProfile = require('../models/DriverProfile');
const RiderProfile = require('../models/RiderProfile');
const RideRequest = require('../models/RideRequest');

async function createIndexes() {
  try {
    console.log('🔧 Setting up Phase 5 Database Indexes...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ===== DRIVER PROFILE INDEXES (Geospatial) =====
    console.log('📍 Creating DriverProfile indexes...');

    // 2dsphere index for geospatial queries (nearest drivers)
    await DriverProfile.collection.createIndex({
      'currentLocation.coordinates': '2dsphere',
    });
    console.log('  ✅ Geospatial index on currentLocation.coordinates');

    // Compound index: availability + vehicle type + verification (fast filtering)
    await DriverProfile.collection.createIndex({
      availabilityStatus: 1,
      vehicleType: 1,
      isVerified: 1,
      isOnline: 1,
    });
    console.log('  ✅ Compound index on availability, vehicle type, verification');

    // Index for performance scoring
    await DriverProfile.collection.createIndex({
      rating: -1,
      performanceScore: -1,
      acceptanceRate: -1,
    });
    console.log('  ✅ Index on rating, performance score, acceptance rate');

    // Index for cancellation tracking
    await DriverProfile.collection.createIndex({
      cancelledRides: 1,
      totalRides: 1,
      cancellationRate: 1,
    });
    console.log('  ✅ Index on cancellation tracking');

    // TTL index for pending requests (auto-delete after 30 seconds)
    await DriverProfile.collection.createIndex(
      { 'pendingRequests.expiresAt': 1 },
      { expireAfterSeconds: 0 }
    );
    console.log('  ✅ TTL index on pending requests\n');

    // ===== RIDE REQUEST INDEXES =====
    console.log('📍 Creating RideRequest indexes...');

    // 2dsphere index for pickup location (area-based queries)
    await RideRequest.collection.createIndex({
      'pickup.coordinates': '2dsphere',
    });
    console.log('  ✅ Geospatial index on pickup.coordinates');

    // Index for active ride requests
    await RideRequest.collection.createIndex({
      status: 1,
      createdAt: -1,
      rideType: 1,
    });
    console.log('  ✅ Index on status, createdAt, rideType');

    // Index for demand index calculation (recent rides)
    await RideRequest.collection.createIndex({
      'pickup.lat': 1,
      'pickup.lng': 1,
      createdAt: -1,
    });
    console.log('  ✅ Index on pickup coordinates and createdAt');

    // Index for fraud detection (rider history)
    await RideRequest.collection.createIndex({
      riderId: 1,
      createdAt: -1,
    });
    console.log('  ✅ Index on riderId and createdAt\n');

    // ===== RIDER PROFILE INDEXES =====
    console.log('📍 Creating RiderProfile indexes...');

    // Index for fraud detection queries
    await RiderProfile.collection.createIndex({
      failedPaymentAttempts: 1,
      cancelledRides: 1,
      refundRequests: 1,
    });
    console.log('  ✅ Index on fraud detection fields');

    // Index for suspicious behavior
    await RiderProfile.collection.createIndex({
      totalRides: 1,
      rating: 1,
      lastLoginTime: -1,
    });
    console.log('  ✅ Index on user activity fields\n');

    console.log('✅ All Phase 5 indexes created successfully!\n');
    console.log('📊 Index Summary:');
    console.log('  • Geospatial (2dsphere): 2 indexes');
    console.log('  • Compound: 4 indexes');
    console.log('  • TTL: 1 index');
    console.log('  • Total: 7 MongoDB indexes\n');

    console.log('⚠️  Important Notes:');
    console.log('  1. Run this script once after initial setup');
    console.log('  2. Indexes are required for Phase 5 performance');
    console.log('  3. Geospatial queries require 2dsphere indexes');
    console.log('  4. TTL indexes auto-remove expired pending requests\n');

    console.log('🎉 Database setup complete!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  createIndexes();
}

module.exports = { createIndexes };
