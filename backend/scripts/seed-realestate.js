const mongoose = require('mongoose');
const RealEstateProperty = require('../models/RealEstateProperty');
const { REAL_ESTATE_SEED_PROPERTIES } = require('../../src/modules/realestate/RealEstate'); // Import seed data

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/malabarbazaar')
  .then(async () => {
    console.log('Seeding RealEstate data...');

    // Clear existing
    await RealEstateProperty.deleteMany({});
    console.log('Cleared existing properties');

    // Seed with normalized data
    const seedPromises = REAL_ESTATE_SEED_PROPERTIES.map(async (property, index) => {
      const normalized = {
        title: property.title,
        priceLabel: property.priceLabel,
        priceValue: property.priceValue,
        location: property.location,
        locality: property.locality,
        type: property.type,
        intent: property.intent,
        areaSqft: property.areaSqft,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        furnishing: property.furnishing,
        description: property.description,
        amenities: property.amenities,
        sellerName: property.sellerName,
        sellerRole: property.sellerRole,
        sellerEmail: `seller${index + 1}@example.com`,
        ownerId: `owner${index + 1}`,
        listedBy: property.listedBy,
        verified: property.verified,
        verificationStatus: property.verificationStatus,
        featured: property.featured,
        postedOn: property.postedOn,
        possession: property.possession,
        mapLabel: property.mapLabel,
        rating: property.rating,
        reviewCount: property.reviewCount,
        premiumPlan: property.premiumPlan,
        mediaCount: property.mediaCount,
        hasVideoTour: property.hasVideoTour,
        leads: property.leads || [],
        reviews: property.reviews || [],
        languageSupport: property.languageSupport || ['English', 'Malayalam'],
        status: property.status
      };

      const created = await RealEstateProperty.create(normalized);
      console.log(`Seeded: ${property.title}`);
      return created;
    });

    await Promise.all(seedPromises);
    console.log('✅ RealEstate seeding complete!');
    process.exit(0);
  })
  .catch(console.error);

