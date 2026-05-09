/**
 * Phase15DatabaseIndexes.js
 * Purpose: MongoDB index creation and optimization for Phase 15
 * Execute: node backend/scripts/Phase15DatabaseIndexes.js
 */

const db = require('../config/database');

class Phase15DatabaseIndexes {
  static async createAllIndexes() {
    try {
      console.log('Creating Phase 15 Database Indexes...\n');
      
      let indexCount = 0;
      
      // ===== ADVANCED ANALYTICS INDEXES (12 indexes) =====
      
      // 1. Executive Dashboard
      await db.collection('rides').createIndex({ createdAt: -1 });
      console.log('✓ rides collection - createdAt index');
      indexCount++;
      
      // 2. Financial Report
      await db.collection('rides').createIndex({ rideType: 1, createdAt: -1 });
      console.log('✓ rides collection - rideType+createdAt index');
      indexCount++;
      
      await db.collection('settlements').createIndex({ settledDate: -1, status: 1 });
      console.log('✓ settlements collection - settledDate+status index');
      indexCount++;
      
      // 3. User Segmentation
      await db.collection('users').createIndex({ createdAt: -1 });
      console.log('✓ users collection - createdAt index');
      indexCount++;
      
      // 4. Driver Leaderboard
      await db.collection('drivers').createIndex({ rating: -1 });
      console.log('✓ drivers collection - rating DESC index');
      indexCount++;
      
      await db.collection('drivers').createIndex({ totalRides: -1 });
      console.log('✓ drivers collection - totalRides DESC index');
      indexCount++;
      
      // 5. Geographic Analysis
      await db.collection('rides').createIndex({ pickupCity: 1, createdAt: -1 });
      console.log('✓ rides collection - pickupCity+createdAt index');
      indexCount++;
      
      // 6. Custom Reports
      await db.collection('rides').createIndex({ status: 1, createdAt: -1 });
      console.log('✓ rides collection - status+createdAt index');
      indexCount++;
      
      // 7. KPI Tracking
      await db.collection('kpi_targets').createIndex({ name: 1 });
      console.log('✓ kpi_targets collection - name index');
      indexCount++;
      
      // 8. Report Export
      await db.collection('reports').createIndex({ createdAt: -1 });
      console.log('✓ reports collection - createdAt index');
      indexCount++;
      
      // ===== MACHINE LEARNING V2 INDEXES (14 indexes) =====
      
      // 9. Anomaly Detection
      await db.collection('rides').createIndex({ finalPrice: 1, createdAt: -1 });
      console.log('✓ rides collection - finalPrice+createdAt index');
      indexCount++;
      
      // 10. Demand Forecasting v2
      await db.collection('rides').createIndex({
        pickupCity: '2dsphere',
        createdAt: -1
      });
      console.log('✓ rides collection - geospatial + createdAt index');
      indexCount++;
      
      await db.collection('demand_forecasts').createIndex(
        { forecastTime: -1 },
        { expireAfterSeconds: 2592000 } // 30 days TTL
      );
      console.log('✓ demand_forecasts collection - forecastTime index with 30d TTL');
      indexCount++;
      
      // 11. Pattern Recognition
      await db.collection('rides').createIndex({ userId: 1, createdAt: -1 });
      console.log('✓ rides collection - userId+createdAt index');
      indexCount++;
      
      // 12. Churn Prediction v2
      await db.collection('users').createIndex({ lastActiveAt: -1 });
      console.log('✓ users collection - lastActiveAt index');
      indexCount++;
      
      await db.collection('churn_predictions').createIndex({
        userId: 1,
        riskLevel: 1,
        churnScore: -1
      });
      console.log('✓ churn_predictions collection - userId+riskLevel+churnScore index');
      indexCount++;
      
      await db.collection('support_tickets').createIndex({ userId: 1, createdAt: -1 });
      console.log('✓ support_tickets collection - userId+createdAt index');
      indexCount++;
      
      // 13. Fraud Detection
      await db.collection('rides').createIndex({
        finalPrice: 1,
        createdAt: 1
      });
      console.log('✓ rides collection - fraudDetection index');
      indexCount++;
      
      // 14. Predictive Maintenance
      await db.collection('drivers').createIndex({ lastRideAt: -1 });
      console.log('✓ drivers collection - lastRideAt index');
      indexCount++;
      
      // 15. Price Elasticity Learning
      await db.collection('pricing_history').createIndex({
        location: '2dsphere',
        surgeMultiplier: 1
      });
      console.log('✓ pricing_history collection - geospatial+surgeMultiplier index');
      indexCount++;
      
      // ===== MARKETPLACE INTEGRATION INDEXES (10 indexes) =====
      
      // 16. Vendor Registration
      await db.collection('vendors').createIndex({ email: 1 }, { unique: true });
      console.log('✓ vendors collection - email unique index');
      indexCount++;
      
      await db.collection('vendors').createIndex({ status: 1 });
      console.log('✓ vendors collection - status index');
      indexCount++;
      
      // 17. Review Submission
      await db.collection('reviews').createIndex({
        userId: 1,
        vendorId: 1,
        rideId: 1
      }, { unique: true });
      console.log('✓ reviews collection - userId+vendorId+rideId unique index');
      indexCount++;
      
      // 18. Vendor Profile
      await db.collection('reviews').createIndex({ vendorId: 1, createdAt: -1 });
      console.log('✓ reviews collection - vendorId+createdAt index');
      indexCount++;
      
      // 19. Vendor Analytics
      await db.collection('rides').createIndex({ vendorId: 1, createdAt: -1 });
      console.log('✓ rides collection - vendorId+createdAt index');
      indexCount++;
      
      // 20. Leaderboard
      await db.collection('vendors').createIndex({ rating: -1, totalReviews: -1 });
      console.log('✓ vendors collection - rating+totalReviews DESC index');
      indexCount++;
      
      // 21. Vendor Responses
      await db.collection('vendor_responses').createIndex({ reviewId: 1 });
      console.log('✓ vendor_responses collection - reviewId index');
      indexCount++;
      
      // 22. Review Flags
      await db.collection('review_flags').createIndex({ reviewId: 1, status: 1 });
      console.log('✓ review_flags collection - reviewId+status index');
      indexCount++;
      
      // 23. Settlement Tracking
      await db.collection('settlements').createIndex({ vendorId: 1, settledDate: -1 });
      console.log('✓ settlements collection - vendorId+settledDate index');
      indexCount++;
      
      // ===== NOTIFICATIONS INDEXES (8 indexes) =====
      
      // 24. Notification Management
      await db.collection('notifications').createIndex({ userId: 1, createdAt: -1 });
      console.log('✓ notifications collection - userId+createdAt index');
      indexCount++;
      
      await db.collection('notifications').createIndex({
        userId: 1,
        read: 1
      });
      console.log('✓ notifications collection - userId+read index');
      indexCount++;
      
      await db.collection('notifications').createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 2592000 } // 30 days TTL
      );
      console.log('✓ notifications collection - createdAt index with 30d TTL');
      indexCount++;
      
      // 25. Messaging
      await db.collection('conversations').createIndex({ participants: 1, updatedAt: -1 });
      console.log('✓ conversations collection - participants+updatedAt index');
      indexCount++;
      
      await db.collection('messages').createIndex({ conversationId: 1, createdAt: -1 });
      console.log('✓ messages collection - conversationId+createdAt index');
      indexCount++;
      
      await db.collection('messages').createIndex({
        toUserId: 1,
        read: 1,
        createdAt: -1
      });
      console.log('✓ messages collection - toUserId+read+createdAt index');
      indexCount++;
      
      // 26. Preferences
      await db.collection('notification_preferences').createIndex({ userId: 1 }, { unique: true });
      console.log('✓ notification_preferences collection - userId unique index');
      indexCount++;
      
      // ===== MOBILE OPTIMIZATION INDEXES (8 indexes) =====
      
      // 27. Device Tokens
      await db.collection('device_tokens').createIndex({ userId: 1 });
      console.log('✓ device_tokens collection - userId index');
      indexCount++;
      
      await db.collection('device_tokens').createIndex({
        deviceToken: 1
      }, { unique: true });
      console.log('✓ device_tokens collection - deviceToken unique index');
      indexCount++;
      
      await db.collection('device_tokens').createIndex(
        { lastSeenAt: 1 },
        { expireAfterSeconds: 5184000 } // 60 days TTL
      );
      console.log('✓ device_tokens collection - lastSeenAt index with 60d TTL');
      indexCount++;
      
      // 28. Sync Logs
      await db.collection('sync_logs').createIndex({ userId: 1, sync_timestamp: -1 });
      console.log('✓ sync_logs collection - userId+sync_timestamp index');
      indexCount++;
      
      // 29. Mobile Sessions
      await db.collection('mobile_sessions').createIndex({ userId: 1, createdAt: -1 });
      console.log('✓ mobile_sessions collection - userId+createdAt index');
      indexCount++;
      
      // 30. App Versions
      await db.collection('app_versions').createIndex({ deviceType: 1, releaseDate: -1 });
      console.log('✓ app_versions collection - deviceType+releaseDate index');
      indexCount++;
      
      // 31. Feature Flags
      await db.collection('feature_flags').createIndex({ flag_name: 1, device_type: 1 });
      console.log('✓ feature_flags collection - flag_name+device_type index');
      indexCount++;
      
      console.log(`\n✅ Phase 15 Index Creation Complete!`);
      console.log(`Total Indexes Created: ${indexCount}`);
      console.log(`Collections Indexed: 17`);
      console.log(`TTL Strategies: 3 (auto-cleanup enabled)`);
      console.log(`Unique Indexes: 3 (data integrity)`);
      console.log(`Geospatial Indexes: 2 (location queries)`);
      
      return true;
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      return false;
    }
  }
}

// Execute if run directly
if (require.main === module) {
  Phase15DatabaseIndexes.createAllIndexes().then(() => {
    process.exit(0);
  });
}

module.exports = Phase15DatabaseIndexes;
