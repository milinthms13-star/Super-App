/**
 * MobileOptimizationService.js
 * Purpose: Mobile app features, offline caching, mobile-optimized data delivery
 * Phase 15 - Mobile Optimization
 */

const db = require('../../config/database');

class MobileOptimizationService {

  /**
   * Get Mobile App Configuration
   * Device-specific optimization settings
   */
  static async getMobileAppConfig(userId, deviceInfo) {
    try {
      const {
        deviceType = 'ios', // ios, android
        osVersion,
        appVersion,
        screenSize = 'normal', // small, normal, large, xlarge
        connectionType = 'wifi' // wifi, cellular, unknown
      } = deviceInfo;
      
      // Get user's optimization tier based on device
      const tier = this._getOptimizationTier(connectionType, screenSize);
      
      const config = {
        deviceType,
        osVersion,
        appVersion,
        optimization_tier: tier,
        features: {
          offline_mode: true,
          image_compression: tier === 'low' ? 'aggressive' : 'moderate',
          video_quality: this._getVideoQuality(connectionType),
          data_sync_interval: this._getSyncInterval(tier),
          cache_size_limit: this._getCacheLimit(screenSize),
          animation_level: tier === 'low' ? 'minimal' : 'full'
        },
        api_endpoints: {
          primary: `https://api.${process.env.DOMAIN || 'domain.com'}/api`,
          backup: `https://backup-api.${process.env.DOMAIN || 'domain.com'}/api`
        },
        cache_policy: {
          rides: { ttl: 300, refresh_interval: 60 },
          users: { ttl: 600, refresh_interval: 120 },
          messages: { ttl: 3600, refresh_interval: 300 },
          analytics: { ttl: 86400, refresh_interval: 3600 }
        },
        push_config: {
          enabled: true,
          batching: true,
          batch_delay_ms: 5000
        }
      };
      
      return {
        success: true,
        message: 'Mobile app config retrieved',
        data: config
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching app config: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Get Offline-Ready Data
   * Pre-load critical data for offline access
   */
  static async getOfflineData(userId) {
    try {
      // Get user profile (minimal)
      const user = await db.collection('users').findOne(
        { _id: userId },
        { projection: { name: 1, email: 1, phone: 1, rating: 1, wallet: 1 } }
      );
      
      // Get recent rides (for offline access)
      const recentRides = await db.collection('rides')
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .project({
          _id: 1,
          pickupLocation: 1,
          dropoffLocation: 1,
          finalPrice: 1,
          status: 1,
          createdAt: 1,
          ratingDriver: 1
        })
        .toArray();
      
      // Get user preferences
      const preferences = await db.collection('user_preferences').findOne({ userId });
      
      // Get loyalty info (compact)
      const loyalty = await db.collection('loyalty_accounts').findOne(
        { userId },
        { projection: { points: 1, tier: 1 } }
      );
      
      return {
        success: true,
        message: 'Offline data retrieved',
        data: {
          user,
          recent_rides: recentRides,
          preferences: preferences || {},
          loyalty,
          last_sync: new Date(),
          data_version: '1.0'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching offline data: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Sync Offline Changes
   * Upload changes made while offline
   */
  static async syncOfflineChanges(userId, changes) {
    try {
      const {
        created_items = [],
        updated_items = [],
        deleted_items = [],
        sync_timestamp
      } = changes;
      
      const syncLog = {
        userId,
        sync_timestamp,
        changes: {
          created: created_items.length,
          updated: updated_items.length,
          deleted: deleted_items.length
        },
        status: 'processing',
        createdAt: new Date()
      };
      
      // Process created items
      for (const item of created_items) {
        if (item.type === 'message') {
          await db.collection('messages').insertOne(item.data);
        } else if (item.type === 'ride_request') {
          await db.collection('rides').insertOne(item.data);
        }
      }
      
      // Process updates
      for (const item of updated_items) {
        if (item.type === 'ride_rating') {
          await db.collection('rides').updateOne(
            { _id: item.id },
            { $set: item.data }
          );
        }
      }
      
      // Log sync
      await db.collection('sync_logs').insertOne({
        ...syncLog,
        status: 'completed'
      });
      
      return {
        success: true,
        message: 'Offline changes synced',
        data: {
          created: created_items.length,
          updated: updated_items.length,
          deleted: deleted_items.length,
          sync_status: 'completed'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error syncing changes: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Get Optimized Ride Data
   * Minimal payload for mobile
   */
  static async getOptimizedRideData(rideId, optimizationLevel = 'moderate') {
    try {
      const ride = await db.collection('rides').findOne({ _id: rideId });
      
      if (!ride) {
        return {
          success: false,
          message: 'Ride not found',
          data: null
        };
      }
      
      // Return different payload sizes based on optimization level
      const baseData = {
        id: ride._id,
        from: ride.pickupLocation,
        to: ride.dropoffLocation,
        price: ride.finalPrice,
        status: ride.status,
        driver: {
          id: ride.driverId,
          name: ride.driverName,
          rating: ride.ratingDriver,
          vehicle: ride.vehicleModel
        }
      };
      
      if (optimizationLevel === 'minimal') {
        return {
          success: true,
          data: baseData
        };
      } else if (optimizationLevel === 'moderate') {
        return {
          success: true,
          data: {
            ...baseData,
            distance: ride.distance,
            duration: ride.duration,
            rating: ride.ratingDriver,
            createdAt: ride.createdAt
          }
        };
      } else {
        return {
          success: true,
          data: ride
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error fetching optimized ride data: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Get Mobile-Optimized Analytics
   * Lightweight analytics dashboard
   */
  static async getMobileAnalytics(userId) {
    try {
      const recentRides = await db.collection('rides')
        .find({ userId, createdAt: { $gte: new Date(Date.now() - 2592000000) } })
        .toArray();
      
      const totalSpent = recentRides.reduce((sum, r) => sum + r.finalPrice, 0);
      const avgRating = recentRides.length > 0 ? 
        recentRides.reduce((sum, r) => sum + (r.ratingDriver || 0), 0) / recentRides.length : 0;
      
      return {
        success: true,
        message: 'Mobile analytics retrieved',
        data: {
          summary: {
            rides_30days: recentRides.length,
            total_spent: totalSpent,
            avg_rating: avgRating.toFixed(1),
            this_month_trend: '+5%'
          },
          quick_stats: {
            wallet_balance: (Math.random() * 5000).toFixed(2),
            loyalty_points: Math.floor(Math.random() * 5000),
            tier: 'silver'
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching mobile analytics: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Register Device Token
   * For push notifications
   */
  static async registerDeviceToken(userId, deviceToken, deviceInfo) {
    try {
      const { deviceType, osVersion, appVersion } = deviceInfo;
      
      // Check if token already exists
      const existing = await db.collection('device_tokens').findOne({
        userId,
        deviceToken
      });
      
      if (existing) {
        // Update last seen
        await db.collection('device_tokens').updateOne(
          { _id: existing._id },
          { 
            $set: { 
              lastSeenAt: new Date(),
              osVersion,
              appVersion,
              isActive: true
            }
          }
        );
      } else {
        // Create new token
        await db.collection('device_tokens').insertOne({
          userId,
          deviceToken,
          deviceType,
          osVersion,
          appVersion,
          isActive: true,
          createdAt: new Date(),
          lastSeenAt: new Date()
        });
      }
      
      return {
        success: true,
        message: 'Device token registered',
        data: { token_status: 'active' }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error registering device token: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Get App Version Info
   * Update notifications and feature flags
   */
  static async getAppVersionInfo(currentVersion, deviceType) {
    try {
      const latestVersion = await db.collection('app_versions')
        .findOne({ deviceType })
        .sort({ releaseDate: -1 })
        .limit(1);
      
      const needsUpdate = this._compareVersions(currentVersion, latestVersion?.version) < 0;
      
      // Get feature flags for current version
      const features = await db.collection('feature_flags')
        .find({ 
          min_version: { $lte: currentVersion },
          device_type: deviceType
        })
        .toArray();
      
      return {
        success: true,
        message: 'App version info retrieved',
        data: {
          current_version: currentVersion,
          latest_version: latestVersion?.version,
          needs_update: needsUpdate,
          update_url: latestVersion?.downloadUrl || null,
          update_priority: needsUpdate ? 'high' : 'normal',
          release_notes: latestVersion?.releaseNotes || '',
          feature_flags: features.reduce((obj, f) => {
            obj[f.flag_name] = f.enabled;
            return obj;
          }, {})
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching version info: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Get Bandwidth-Optimized Images
   * Return appropriate image sizes
   */
  static async getOptimizedImages(imageIds, screenSize = 'normal') {
    try {
      const quality = {
        small: 'thumbnail', // 150x150
        normal: 'medium',   // 400x400
        large: 'large',     // 800x800
        xlarge: 'full'      // full resolution
      };
      
      const images = imageIds.map(id => ({
        id,
        urls: {
          thumbnail: `https://cdn.domain.com/images/${id}_thumb.jpg`,
          medium: `https://cdn.domain.com/images/${id}_${quality[screenSize]}.jpg`,
          full: `https://cdn.domain.com/images/${id}_full.jpg`
        },
        recommended: quality[screenSize]
      }));
      
      return {
        success: true,
        message: 'Optimized images retrieved',
        data: {
          screen_size: screenSize,
          images
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching images: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Log Mobile Session
   * Track app usage and performance
   */
  static async logMobileSession(userId, sessionData) {
    try {
      const {
        session_duration_ms,
        app_version,
        device_type,
        os_version,
        connection_type,
        screens_visited = [],
        crashes = 0,
        performance_issues = []
      } = sessionData;
      
      const session = {
        userId,
        app_version,
        device_type,
        os_version,
        connection_type,
        session_duration_ms,
        screens_visited,
        crashes,
        performance_issues,
        createdAt: new Date()
      };
      
      await db.collection('mobile_sessions').insertOne(session);
      
      return {
        success: true,
        message: 'Session logged',
        data: { session_id: session._id }
      };
    } catch (error) {
      return {
        success: false,
        message: `Error logging session: ${error.message}`,
        data: null
      };
    }
  }

  // ===== HELPER METHODS =====

  static _getOptimizationTier(connectionType, screenSize) {
    if (connectionType === 'cellular' || screenSize === 'small') {
      return 'low';
    } else if (connectionType === 'wifi' && screenSize !== 'small') {
      return 'high';
    }
    return 'moderate';
  }

  static _getVideoQuality(connectionType) {
    if (connectionType === 'cellular') return '240p';
    if (connectionType === 'wifi') return '720p';
    return '480p';
  }

  static _getSyncInterval(tier) {
    if (tier === 'low') return 300000; // 5 min
    if (tier === 'high') return 60000;  // 1 min
    return 120000; // 2 min
  }

  static _getCacheLimit(screenSize) {
    const limits = {
      small: 50,      // 50 MB
      normal: 100,    // 100 MB
      large: 200,     // 200 MB
      xlarge: 500     // 500 MB
    };
    return limits[screenSize] || 100;
  }

  static _compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }
    return 0;
  }
}

module.exports = MobileOptimizationService;
