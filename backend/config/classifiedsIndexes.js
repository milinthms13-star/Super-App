/**
 * Database Index Initialization for Classifieds
 * Ensures all necessary indexes are created for optimal performance
 */

const ClassifiedAd = require('../models/ClassifiedAd');

/**
 * Initialize all geospatial and functional indexes for Classifieds
 */
async function initializeClassifiedsIndexes() {
  try {
    // Geospatial index for location-based queries
    await ClassifiedAd.collection.createIndex({ location: '2dsphere' });
    console.log('✓ Geospatial index created for classifieds location');

    // Text indexes for full-text search
    await ClassifiedAd.collection.createIndex({
      title: 'text',
      description: 'text',
      tags: 'text',
      category: 'text',
    });
    console.log('✓ Text search index created for classifieds');

    // Index for filtering by status and expiry
    await ClassifiedAd.collection.createIndex({
      status: 1,
      expiryDate: 1,
    });
    console.log('✓ Status and expiry index created');

    // Index for seller queries
    await ClassifiedAd.collection.createIndex({
      seller: 1,
      createdAt: -1,
    });
    console.log('✓ Seller index created');

    // Index for price range queries
    await ClassifiedAd.collection.createIndex({
      price: 1,
      category: 1,
    });
    console.log('✓ Price and category index created');

    // Index for spam detection queries
    await ClassifiedAd.collection.createIndex({
      spamScore: 1,
      status: 1,
    });
    console.log('✓ Spam detection index created');

    // TTL index for auto-expiring listings (30 days)
    await ClassifiedAd.collection.createIndex(
      { expiryDate: 1 },
      { expireAfterSeconds: 0 }
    );
    console.log('✓ TTL index created for automatic listing expiry');

    return true;
  } catch (error) {
    console.error('Error initializing classifieds indexes:', error.message);
    // Don't fail the app if indexes exist already
    return true;
  }
}

module.exports = { initializeClassifiedsIndexes };
