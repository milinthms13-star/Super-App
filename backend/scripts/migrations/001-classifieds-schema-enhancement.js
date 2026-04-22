/**
 * Migration: ClassifiedAds Schema Enhancement
 * Adds geolocation, ratings, media management, and advanced features
 * Date: 2026-04-22
 */

const mongoose = require('mongoose');

const upMigration = async () => {
  const db = mongoose.connection.db;

  console.log('🔄 Running: ClassifiedAds Schema Enhancement Migration');

  try {
    // Check if collection exists
    const collections = await db.listCollections().toArray();
    const classifiedAdsExists = collections.some((c) => c.name === 'classifieds');

    if (!classifiedAdsExists) {
      console.log('⚠️  ClassifiedAds collection does not exist yet. Skipping migration.');
      return;
    }

    // Add new indexes for performance
    const collection = db.collection('classifieds');

    const indexesToCreate = [
      { key: { slug: 1 }, options: { unique: true, sparse: true } },
      { key: { coordinates: '2dsphere' } },
      { key: { category: 1, location: 1, moderationStatus: 1 } },
      { key: { sellerEmail: 1, createdAt: -1 } },
      { key: { featured: 1, urgent: 1, createdAt: -1 } },
      { key: { spamScore: 1 } },
      { key: { tags: 1 } },
      { key: { subscriptionTier: 1 } },
      { key: { sellerVerificationLevel: 1 } },
    ];

    for (const indexSpec of indexesToCreate) {
      try {
        await collection.createIndex(indexSpec.key, indexSpec.options);
        console.log(`✓ Created index on fields: ${Object.keys(indexSpec.key).join(', ')}`);
      } catch (error) {
        if (error.codeName !== 'IndexOptionsConflict') {
          console.error(`✗ Failed to create index: ${error.message}`);
        }
      }
    }

    // Add default values to existing documents
    const updateResult = await collection.updateMany(
      {},
      {
        $setOnInsert: {
          slug: '',
          priceHistory: [],
          subcategory: '',
          coordinates: { type: 'Point', coordinates: [0, 0] },
          sellerRating: 5,
          sellerReviewCount: 0,
          sellerVerificationLevel: 'unverified',
          moderationNotes: '',
          monetizationPlan: 'Free',
          promotionPlanExpiry: null,
          subscriptionTier: 'none',
          subscriptionExpiryDate: null,
          expiryDate: null,
          autoRenew: false,
          scheduledPublishDate: null,
          isDraft: false,
          reviews: [],
          averageRating: 5,
          totalReviews: 0,
          blockedUsers: [],
          analytics: {},
          spamScore: 0,
          flags: [],
        },
      },
      { upsert: false }
    );

    console.log(`✓ Updated ${updateResult.modifiedCount} existing documents with new fields`);

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

const downMigration = async () => {
  const db = mongoose.connection.db;

  console.log('🔄 Rolling back: ClassifiedAds Schema Enhancement Migration');

  try {
    const collection = db.collection('classifieds');

    // List indexes to remove
    const indexesToRemove = [
      'slug_1',
      'coordinates_2dsphere',
      'category_1_location_1_moderationStatus_1',
      'sellerEmail_1_createdAt_-1',
      'featured_1_urgent_1_createdAt_-1',
      'spamScore_1',
      'tags_1',
      'subscriptionTier_1',
      'sellerVerificationLevel_1',
    ];

    for (const indexName of indexesToRemove) {
      try {
        await collection.dropIndex(indexName);
        console.log(`✓ Dropped index: ${indexName}`);
      } catch (error) {
        if (error.codeName !== 'IndexNotFound') {
          console.error(`✗ Failed to drop index ${indexName}: ${error.message}`);
        }
      }
    }

    // Remove new fields from documents
    const fieldToRemove = {
      slug: '',
      priceHistory: '',
      subcategory: '',
      coordinates: '',
      sellerRating: '',
      sellerReviewCount: '',
      sellerVerificationLevel: '',
      moderationNotes: '',
      promotionPlanExpiry: '',
      subscriptionTier: '',
      subscriptionExpiryDate: '',
      expiryDate: '',
      autoRenew: '',
      scheduledPublishDate: '',
      isDraft: '',
      reviews: '',
      averageRating: '',
      totalReviews: '',
      blockedUsers: '',
      analytics: '',
      spamScore: '',
      flags: '',
    };

    const updateResult = await collection.updateMany({}, { $unset: fieldToRemove });
    console.log(`✓ Removed new fields from ${updateResult.modifiedCount} documents`);

    console.log('✅ Rollback completed successfully!');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
};

module.exports = {
  name: 'classifieds-schema-enhancement',
  description: 'Add geolocation, ratings, media management, and advanced features to classified ads',
  version: 1,
  upMigration,
  downMigration,
};
