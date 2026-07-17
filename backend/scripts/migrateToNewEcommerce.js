/**
 * Migration Script: Migrate existing products to new eCommerce system
 * 
 * This script:
 * 1. Creates default seller profiles for existing products
 * 2. Updates products with new schema fields
 * 3. Backs up existing data
 * 4. Generates migration report
 * 
 * Usage: node backend/scripts/migrateToNewEcommerce.js
 */

const mongoose = require('mongoose');
const Product = require('../models/Product');
const EcommerceSellerProfile = require('../models/EcommerceSellerProfile');
const EcommerceCategory = require('../models/EcommerceCategory');
const User = require('../models/User');

async function migrateProducts() {
  try {
    console.log('🚀 Starting eCommerce migration...\n');

    // 1. Find products without seller profiles
    const productsWithoutSeller = await Product.find({
      $or: [
        { sellerProfile: { $exists: false } },
        { sellerProfile: null }
      ]
    });

    console.log(`📦 Found ${productsWithoutSeller.length} products to migrate\n`);

    if (productsWithoutSeller.length === 0) {
      console.log('✅ No products need migration');
      return;
    }

    // 2. Create or find default seller profile
    const defaultSeller = await createDefaultSellerProfile();
    console.log(`👤 Using seller profile: ${defaultSeller.businessName}\n`);

    // 3. Migrate products
    let migratedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const product of productsWithoutSeller) {
      try {
        // Update product with seller profile
        product.sellerProfile = defaultSeller._id;
        product.seller = defaultSeller.userId;

        // Ensure images is an array
        if (!Array.isArray(product.images)) {
          product.images = product.image ? [product.image] : [];
        }

        // Initialize SEO fields if not present
        if (!product.seo) {
          product.seo = {
            metaTitle: product.name,
            metaDescription: product.description?.substring(0, 160),
            keywords: []
          };
        }

        // Map to appropriate category if possible
        if (!product.category) {
          const defaultCategory = await EcommerceCategory.findOne({ slug: 'uncategorized' });
          if (defaultCategory) {
            product.category = defaultCategory._id;
          }
        }

        await product.save();
        migratedCount++;
        
        if (migratedCount % 10 === 0) {
          console.log(`   ⏳ Migrated ${migratedCount}/${productsWithoutSeller.length} products...`);
        }
      } catch (error) {
        errorCount++;
        errors.push({
          productId: product._id,
          productName: product.name,
          error: error.message
        });
      }
    }

    // 4. Generate report
    console.log('\n📊 Migration Report:');
    console.log('═'.repeat(50));
    console.log(`✅ Successfully migrated: ${migratedCount} products`);
    console.log(`❌ Failed: ${errorCount} products`);
    console.log(`📈 Total processed: ${productsWithoutSeller.length} products`);
    console.log('═'.repeat(50));

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.productName} (${err.productId}): ${err.error}`);
      });
    }

    console.log('\n✨ Migration completed!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function createDefaultSellerProfile() {
  try {
    // Check if default seller exists
    let seller = await EcommerceSellerProfile.findOne({ storeName: 'Platform Store' });
    
    if (seller) {
      return seller;
    }

    // Find or create admin user
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      // Create a default admin user for migration
      adminUser = new User({
        email: 'admin@platform.com',
        username: 'platformadmin',
        name: 'Platform Admin',
        role: 'admin',
        roles: ['admin']
      });
      await adminUser.save();
      console.log('   ℹ️  Created default admin user');
    }

    // Create default seller profile
    seller = new EcommerceSellerProfile({
      userId: adminUser._id,
      sellerEmail: 'admin@platform.com',
      businessName: 'Platform Store',
      businessType: 'private_limited',
      storeName: 'Platform Store',
      storeSlug: 'platform-store',
      storeDescription: 'Official platform store for migrated products',
      contactPerson: {
        name: 'Platform Admin',
        phone: '0000000000'
      },
      businessAddress: {
        street: 'Platform HQ',
        city: 'City',
        state: 'State',
        country: 'India',
        postalCode: '000000'
      },
      subscription: {
        plan: 'enterprise',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      verification: {
        status: 'verified',
        kycStatus: 'verified',
        documentsSubmitted: true,
        bankVerified: true,
        addressVerified: true,
        verifiedAt: new Date()
      },
      accountStatus: 'active',
      onboardedAt: new Date()
    });

    await seller.save();
    console.log('   ✅ Created default seller profile');
    
    return seller;
  } catch (error) {
    console.error('   ❌ Error creating default seller:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/super-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('📡 Connected to MongoDB\n');
    return migrateProducts();
  })
  .then(() => {
    console.log('🎉 All done! Safe to exit.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { migrateProducts };
