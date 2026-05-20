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
    // Geospatial index for distance queries
    await ClassifiedAd.collection.createIndex({ coordinates: '2dsphere' });
    console.log('✓ Geospatial index created for classifieds coordinates');

    // Text indexes for full-text search and searchable text fields
    await ClassifiedAd.collection.createIndex({
      title: 'text',
      description: 'text',
      tags: 'text',
      category: 'text',
      searchableText: 'text',
      location: 'text',
    });
    console.log('✓ Text search index created for classifieds');

    // Index for filtering by moderation status and expiry
    await ClassifiedAd.collection.createIndex({
      moderationStatus: 1,
      expiryDate: 1,
    });
    console.log('✓ Moderation status and expiry index created');

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
      moderationStatus: 1,
    });
    console.log('✓ Spam detection index created');

    // TTL index for auto-expiring listings when autoRenew is disabled
    await ClassifiedAd.collection.createIndex(
      { expiryDate: 1 },
      {
        expireAfterSeconds: 0,
        partialFilterExpression: { autoRenew: false },
      }
    );
    console.log('✓ TTL index created for non-auto-renew classifieds expiry');

    return true;
  } catch (error) {
    console.error('Error initializing classifieds indexes:', error.message);
    // Don't fail the app if indexes exist already
    return true;
  }
}

module.exports = { initializeClassifiedsIndexes };
