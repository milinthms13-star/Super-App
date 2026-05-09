const UserOTP = require('../models/UserOTP');
const RecommendationEngine = require('../services/RecommendationEngine');
const UserBehavior = require('../models/UserBehavior');
const ProductSimilarity = require('../models/ProductSimilarity');
const UserAddress = require('../models/UserAddress');
const ChatMessage = require('../models/ChatMessage');

/**
 * Phase 5 Database Indexes
 * Optimization indexes for OTP, recommendations, filters, chat, and addresses
 * Run once during deployment
 */
class Phase5DatabaseIndexes {
  static async createAllIndexes() {
    try {
      console.log('Creating Phase 5 database indexes...');

      await Promise.all([
        this.createOTPIndexes(),
        this.createRecommendationIndexes(),
        this.createAddressIndexes(),
        this.createChatIndexes()
      ]);

      console.log('✅ All Phase 5 indexes created successfully');
      return { success: true, message: 'All indexes created' };
    } catch (error) {
      console.error('Create Indexes Error:', error);
      return { success: false, message: 'Failed to create indexes', error };
    }
  }

  /**
   * OTP-related indexes
   */
  static async createOTPIndexes() {
    try {
      // Index for finding OTP by phone number and usage status
      await UserOTP.collection.createIndex(
        { phoneNumber: 1, isUsed: 1, createdAt: -1 },
        { name: 'idx_phone_used_created' }
      );

      // TTL index - auto-delete expired OTPs after 6 hours
      await UserOTP.collection.createIndex(
        { createdAt: 1 },
        { 
          name: 'idx_otp_ttl',
          expireAfterSeconds: 21600 // 6 hours
        }
      );

      // Index for finding by Twilio SID
      await UserOTP.collection.createIndex(
        { twilioSid: 1 },
        { name: 'idx_twilio_sid', sparse: true }
      );

      // Compound index for rate limiting check
      await UserOTP.collection.createIndex(
        { phoneNumber: 1, createdAt: -1 },
        { name: 'idx_phone_ratelimit' }
      );

      console.log('✅ OTP indexes created');
    } catch (error) {
      console.error('OTP Indexes Error:', error);
      throw error;
    }
  }

  /**
   * Recommendation engine indexes
   */
  static async createRecommendationIndexes() {
    try {
      // UserBehavior indexes
      await UserBehavior.collection.createIndex(
        { userId: 1, updatedAt: -1 },
        { name: 'idx_user_behavior' }
      );

      // Index for viewed products within time range
      await UserBehavior.collection.createIndex(
        { userId: 1, 'viewedProducts.viewedAt': -1 },
        { name: 'idx_user_views' }
      );

      // Index for user purchases
      await UserBehavior.collection.createIndex(
        { userId: 1, 'purchases.purchasedAt': -1 },
        { name: 'idx_user_purchases' }
      );

      // Index for user ratings
      await UserBehavior.collection.createIndex(
        { userId: 1, 'ratings.productId': 1 },
        { name: 'idx_user_ratings' }
      );

      // ProductSimilarity indexes
      await ProductSimilarity.collection.createIndex(
        { productId: 1, updatedAt: -1 },
        { name: 'idx_product_similarity' }
      );

      // Index for finding similar products sorted by score
      await ProductSimilarity.collection.createIndex(
        { productId: 1, 'similarProducts.similarityScore': -1 },
        { name: 'idx_similarity_score' }
      );

      // Index for batch lookups
      await ProductSimilarity.collection.createIndex(
        { 'similarProducts.similarProductId': 1 },
        { name: 'idx_similar_product_lookup' }
      );

      console.log('✅ Recommendation indexes created');
    } catch (error) {
      console.error('Recommendation Indexes Error:', error);
      throw error;
    }
  }

  /**
   * Address management indexes
   */
  static async createAddressIndexes() {
    try {
      // Primary index for user's addresses
      await UserAddress.collection.createIndex(
        { userId: 1, isDefault: -1, createdAt: -1 },
        { name: 'idx_user_addresses' }
      );

      // Index for finding default address quickly
      await UserAddress.collection.createIndex(
        { userId: 1, isDefault: 1 },
        { name: 'idx_default_address' }
      );

      // Index for searching by city
      await UserAddress.collection.createIndex(
        { userId: 1, city: 1 },
        { name: 'idx_address_city' }
      );

      // Index for searching by pincode (delivery zones)
      await UserAddress.collection.createIndex(
        { userId: 1, pincode: 1 },
        { name: 'idx_address_pincode' }
      );

      // Index for address type (home, work, etc.)
      await UserAddress.collection.createIndex(
        { userId: 1, type: 1 },
        { name: 'idx_address_type' }
      );

      // Geospatial index for location-based queries
      await UserAddress.collection.createIndex(
        { 'coordinates': '2dsphere' },
        { name: 'idx_address_location', sparse: true }
      );

      // Compound index for quick lookups
      await UserAddress.collection.createIndex(
        { userId: 1, createdAt: -1 },
        { name: 'idx_user_address_time' }
      );

      console.log('✅ Address indexes created');
    } catch (error) {
      console.error('Address Indexes Error:', error);
      throw error;
    }
  }

  /**
   * Chat message indexes
   */
  static async createChatIndexes() {
    try {
      // Index for retrieving user's chat history
      await ChatMessage.collection.createIndex(
        { userId: 1, createdAt: -1 },
        { name: 'idx_chat_history' }
      );

      // Index for finding chats by context
      await ChatMessage.collection.createIndex(
        { userId: 1, context: 1, createdAt: -1 },
        { name: 'idx_chat_context' }
      );

      // TTL index - auto-delete old messages after 90 days
      await ChatMessage.collection.createIndex(
        { createdAt: 1 },
        { 
          name: 'idx_chat_ttl',
          expireAfterSeconds: 7776000 // 90 days
        }
      );

      console.log('✅ Chat indexes created');
    } catch (error) {
      console.error('Chat Indexes Error:', error);
      throw error;
    }
  }

  /**
   * Index statistics
   * Run to see index usage
   */
  static async getIndexStats() {
    try {
      const stats = {
        userOTP: await UserOTP.collection.getIndexes(),
        userBehavior: await UserBehavior.collection.getIndexes(),
        productSimilarity: await ProductSimilarity.collection.getIndexes(),
        userAddress: await UserAddress.collection.getIndexes(),
        chatMessage: await ChatMessage.collection.getIndexes()
      };

      return {
        success: true,
        message: 'Index stats retrieved',
        data: stats
      };
    } catch (error) {
      console.error('Get Index Stats Error:', error);
      return { success: false, message: 'Failed to get stats', error };
    }
  }

  /**
   * Drop all Phase 5 indexes (for reset/cleanup)
   */
  static async dropAllIndexes() {
    try {
      console.log('Dropping Phase 5 indexes...');

      // Drop all except _id index
      await Promise.all([
        UserOTP.collection.dropIndexes(),
        UserBehavior.collection.dropIndexes(),
        ProductSimilarity.collection.dropIndexes(),
        UserAddress.collection.dropIndexes(),
        ChatMessage.collection.dropIndexes()
      ]);

      console.log('✅ All Phase 5 indexes dropped');
      return { success: true, message: 'All indexes dropped' };
    } catch (error) {
      console.error('Drop Indexes Error:', error);
      return { success: false, message: 'Failed to drop indexes', error };
    }
  }

  /**
   * Rebuild all indexes
   */
  static async rebuildAllIndexes() {
    try {
      console.log('Rebuilding Phase 5 indexes...');

      await this.dropAllIndexes();
      await this.createAllIndexes();

      console.log('✅ All Phase 5 indexes rebuilt');
      return { success: true, message: 'Indexes rebuilt' };
    } catch (error) {
      console.error('Rebuild Indexes Error:', error);
      return { success: false, message: 'Failed to rebuild indexes', error };
    }
  }

  /**
   * Analyze index usage
   * Find slow queries and missing indexes
   */
  static async analyzeIndexUsage() {
    try {
      const analysis = {};

      // Get slow query stats
      const db = UserOTP.collection.db;
      const profileData = await db.command({ profile: -1 });

      return {
        success: true,
        message: 'Index usage analysis',
        data: {
          profiling: profileData,
          recommendation: 'Review slow query logs for missing indexes'
        }
      };
    } catch (error) {
      console.error('Index Analysis Error:', error);
      return { success: false, message: 'Failed to analyze indexes', error };
    }
  }
}

module.exports = Phase5DatabaseIndexes;
