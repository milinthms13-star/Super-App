const mongoose = require('mongoose');
const ClassifiedAd = require('../models/ClassifiedAd');
const User = require('../models/User');
const connectDB = require('../config/db');

async function seedClassifiedsRatings() {
  await connectDB();
  console.log('Connected to DB. Seeding classifieds ratings...');

  // Update all users based on their classified ads
  const sellers = await ClassifiedAd.distinct('sellerEmail');
  
  for (const sellerEmail of sellers) {
    let totalRatingSum = 0;
    let totalCount = 0;
    
    const sellerAds = await ClassifiedAd.find({ sellerEmail });
    sellerAds.forEach(ad => {
      if (ad.averageRating && ad.totalReviews > 0) {
        totalRatingSum += ad.averageRating * ad.totalReviews;
        totalCount += ad.totalReviews;
      }
    });

    const newTotalRating = totalCount > 0 ? Math.round((totalRatingSum / totalCount) * 10) / 10 : 5.0;

    await User.findOneAndUpdate(
      { email: sellerEmail },
      { 
        classifiedsTotalRating: newTotalRating,
        classifiedsReviewCount: totalCount 
      },
      { upsert: true, new: true }
    );
    
    console.log(`Updated ${sellerEmail}: ${newTotalRating} (${totalCount} reviews)`);
  }

  console.log('✅ Classifieds ratings seeding complete!');
  process.exit(0);
}

seedClassifiedsRatings().catch(console.error);

