/**
 * Tourism Data Migration Script
 * Migrates data from JSON file storage to MongoDB
 * 
 * Usage: node backend/scripts/migrateTourismData.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

const TourismPackage = require('../models/TourismPackage');
const TourismVendor = require('../models/TourismVendor');
const TourismBooking = require('../models/TourismBooking');
const TourismReview = require('../models/TourismReview');
const TourismLead = require('../models/TourismLead');
const TourismCoupon = require('../models/TourismCoupon');
const TourismComplaint = require('../models/TourismComplaint');

const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${msg}`),
};

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/nilahub';
  await mongoose.connect(uri);
  logger.success('Connected to MongoDB');
}

async function readOldData() {
  const dataFilePath = path.join(__dirname, '../data/tourism-marketplace.json');
  
  try {
    const rawData = await fs.readFile(dataFilePath, 'utf8');
    const data = JSON.parse(rawData);
    logger.success('Read old tourism data from JSON file');
    return data;
  } catch (error) {
    logger.error(`Failed to read old data: ${error.message}`);
    return null;
  }
}

async function migrateVendors(vendors) {
  if (!Array.isArray(vendors) || vendors.length === 0) {
    logger.info('No vendors to migrate');
    return {};
  }

  const vendorMap = {};
  let migrated = 0;

  for (const oldVendor of vendors) {
    try {
      const newVendor = new TourismVendor({
        name: oldVendor.name,
        email: oldVendor.email,
        phone: oldVendor.phone,
        kycStatus: oldVendor.kycStatus || 'pending',
        verificationBadge: oldVendor.verificationBadge || false,
        approvalStatus: oldVendor.approvalStatus || 'pending',
        riskFlag: oldVendor.riskFlag || 'low',
        emergencyContact: oldVendor.emergencyContact,
        insuranceSupport: oldVendor.insuranceSupport || false,
      });

      await newVendor.save();
      vendorMap[oldVendor.id] = newVendor._id;
      migrated++;
    } catch (error) {
      logger.error(`Failed to migrate vendor ${oldVendor.id}: ${error.message}`);
    }
  }

  logger.success(`Migrated ${migrated} vendors`);
  return vendorMap;
}

async function migratePackages(packages, vendorMap) {
  if (!Array.isArray(packages) || packages.length === 0) {
    logger.info('No packages to migrate');
    return {};
  }

  const packageMap = {};
  let migrated = 0;

  for (const oldPackage of packages) {
    try {
      const vendorId = vendorMap[oldPackage.vendorId];
      if (!vendorId) {
        logger.error(`Vendor not found for package ${oldPackage.id}`);
        continue;
      }

      const newPackage = new TourismPackage({
        title: oldPackage.title,
        destination: oldPackage.destination,
        category: oldPackage.category,
        travelerType: oldPackage.travelerType,
        durationDays: oldPackage.durationDays,
        startPrice: oldPackage.startPrice,
        rating: oldPackage.rating || 0,
        reviewsCount: oldPackage.reviewsCount || 0,
        pickupCities: oldPackage.pickupCities || [],
        hotelCategory: oldPackage.hotelCategory,
        vendorId: vendorId,
        vendor: oldPackage.vendor,
        vendorVerified: oldPackage.vendorVerified,
        tags: oldPackage.tags || [],
        inclusions: oldPackage.inclusions || [],
        exclusions: oldPackage.exclusions || [],
        cancellationPolicy: oldPackage.cancellationPolicy,
        childPricing: oldPackage.childPricing,
        gstAndServiceCharge: oldPackage.gstAndServiceCharge,
        availableDates: oldPackage.availableDates || [],
        mapHighlights: oldPackage.mapHighlights,
        itinerary: oldPackage.itinerary || [],
        imageGallery: oldPackage.imageGallery || [],
        seasonalPricing: oldPackage.seasonalPricing || [],
        approvalStatus: oldPackage.approvalStatus || 'pending',
        commissionPercent: oldPackage.commissionPercent || 8,
        fraudRisk: oldPackage.fraudRisk || 'low',
        kycStatus: oldPackage.kycStatus || 'pending',
        emergencyContact: oldPackage.emergencyContact,
        insuranceSupport: oldPackage.insuranceSupport || false,
      });

      await newPackage.save();
      packageMap[oldPackage.id] = newPackage._id;
      migrated++;
    } catch (error) {
      logger.error(`Failed to migrate package ${oldPackage.id}: ${error.message}`);
    }
  }

  logger.success(`Migrated ${migrated} packages`);
  return packageMap;
}

async function migrateReviews(reviews, packageMap) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    logger.info('No reviews to migrate');
    return;
  }

  let migrated = 0;

  for (const oldReview of reviews) {
    try {
      const packageId = packageMap[oldReview.packageId];
      if (!packageId) {
        logger.error(`Package not found for review ${oldReview.id}`);
        continue;
      }

      const newReview = new TourismReview({
        packageId: packageId,
        reviewerName: oldReview.reviewerName,
        rating: oldReview.rating,
        comment: oldReview.comment,
        isVisible: true,
        createdAt: oldReview.createdAt,
      });

      await newReview.save();
      migrated++;
    } catch (error) {
      logger.error(`Failed to migrate review ${oldReview.id}: ${error.message}`);
    }
  }

  logger.success(`Migrated ${migrated} reviews`);
}

async function migrateBookings(bookings, packageMap, vendorMap) {
  if (!Array.isArray(bookings) || bookings.length === 0) {
    logger.info('No bookings to migrate');
    return;
  }

  let migrated = 0;

  for (const oldBooking of bookings) {
    try {
      const packageId = packageMap[oldBooking.packageId];
      const vendorId = vendorMap[oldBooking.vendorId];

      if (!packageId || !vendorId) {
        logger.error(`Package or vendor not found for booking ${oldBooking.id}`);
        continue;
      }

      const newBooking = new TourismBooking({
        packageId: packageId,
        packageTitle: oldBooking.packageTitle,
        vendorId: vendorId,
        vendorName: oldBooking.vendorName,
        customerName: oldBooking.customerName,
        customerEmail: oldBooking.customerEmail,
        customerPhone: oldBooking.customerPhone,
        travelerCount: oldBooking.travelerCount,
        pickupCity: oldBooking.pickupCity,
        hotelCategory: oldBooking.hotelCategory,
        travelDate: oldBooking.travelDate,
        bookingNote: oldBooking.bookingNote,
        bookingStatus: oldBooking.bookingStatus,
        amountSummary: oldBooking.amountSummary,
        paymentDetails: oldBooking.paymentDetails,
        refundRules: oldBooking.refundRules,
        createdAt: oldBooking.createdAt,
        updatedAt: oldBooking.updatedAt,
      });

      await newBooking.save();
      migrated++;
    } catch (error) {
      logger.error(`Failed to migrate booking ${oldBooking.id}: ${error.message}`);
    }
  }

  logger.success(`Migrated ${migrated} bookings`);
}

async function migrateLeads(leads, packageMap, vendorMap) {
  if (!Array.isArray(leads) || leads.length === 0) {
    logger.info('No leads to migrate');
    return;
  }

  let migrated = 0;

  for (const oldLead of leads) {
    try {
      const packageId = oldLead.packageId ? packageMap[oldLead.packageId] : null;
      const vendorId = oldLead.vendorId ? vendorMap[oldLead.vendorId] : null;

      const newLead = new TourismLead({
        packageId: packageId,
        packageTitle: oldLead.packageTitle,
        vendorId: vendorId,
        travelerName: oldLead.travelerName,
        travelerPhone: oldLead.travelerPhone,
        travelerType: oldLead.travelerType,
        destination: oldLead.destination,
        pickupCity: oldLead.pickupCity,
        hotelCategory: oldLead.hotelCategory,
        startDate: oldLead.startDate,
        days: oldLead.days,
        budget: oldLead.budget,
        estimatedBudget: oldLead.estimatedBudget,
        status: oldLead.status,
        source: oldLead.source,
        note: oldLead.note,
        priority: oldLead.priority,
        createdAt: oldLead.createdAt,
        updatedAt: oldLead.updatedAt,
      });

      await newLead.save();
      migrated++;
    } catch (error) {
      logger.error(`Failed to migrate lead ${oldLead.id}: ${error.message}`);
    }
  }

  logger.success(`Migrated ${migrated} leads`);
}

async function migrateCoupons(coupons) {
  if (!Array.isArray(coupons) || coupons.length === 0) {
    logger.info('No coupons to migrate');
    return;
  }

  let migrated = 0;

  for (const oldCoupon of coupons) {
    try {
      const newCoupon = new TourismCoupon({
        code: oldCoupon.code,
        description: oldCoupon.description,
        discountType: 'percentage',
        discountPercent: oldCoupon.discountPercent,
        minAmount: oldCoupon.minAmount,
        isActive: true,
        isPublic: true,
      });

      await newCoupon.save();
      migrated++;
    } catch (error) {
      logger.error(`Failed to migrate coupon ${oldCoupon.code}: ${error.message}`);
    }
  }

  logger.success(`Migrated ${migrated} coupons`);
}

async function migrateComplaints(complaints, packageMap, vendorMap) {
  if (!Array.isArray(complaints) || complaints.length === 0) {
    logger.info('No complaints to migrate');
    return;
  }

  let migrated = 0;

  for (const oldComplaint of complaints) {
    try {
      const packageId = oldComplaint.packageId ? packageMap[oldComplaint.packageId] : null;
      const vendorId = oldComplaint.vendorId ? vendorMap[oldComplaint.vendorId] : null;

      const newComplaint = new TourismComplaint({
        packageId: packageId,
        vendorId: vendorId,
        issue: oldComplaint.issue,
        status: oldComplaint.status,
        escalationTimeline: oldComplaint.escalationTimeline || [],
      });

      await newComplaint.save();
      migrated++;
    } catch (error) {
      logger.error(`Failed to migrate complaint ${oldComplaint.id}: ${error.message}`);
    }
  }

  logger.success(`Migrated ${migrated} complaints`);
}

async function main() {
  try {
    logger.info('Starting tourism data migration...');

    // Connect to database
    await connectDB();

    // Read old data
    const oldData = await readOldData();
    if (!oldData) {
      logger.error('No data to migrate. Exiting.');
      process.exit(1);
    }

    // Check if already migrated
    const existingCount = await TourismVendor.countDocuments();
    if (existingCount > 0) {
      logger.error(`Database already has ${existingCount} vendors. Clear database first or skip migration.`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      const answer = await new Promise((resolve) => {
        readline.question('Continue anyway? (yes/no): ', resolve);
      });
      
      readline.close();
      
      if (answer.toLowerCase() !== 'yes') {
        logger.info('Migration cancelled');
        process.exit(0);
      }
    }

    // Migrate in order (due to dependencies)
    logger.info('Step 1: Migrating vendors...');
    const vendorMap = await migrateVendors(oldData.vendors);

    logger.info('Step 2: Migrating packages...');
    const packageMap = await migratePackages(oldData.packages, vendorMap);

    logger.info('Step 3: Migrating reviews...');
    await migrateReviews(oldData.reviews, packageMap);

    logger.info('Step 4: Migrating bookings...');
    await migrateBookings(oldData.bookings, packageMap, vendorMap);

    logger.info('Step 5: Migrating leads...');
    await migrateLeads(oldData.leads, packageMap, vendorMap);

    logger.info('Step 6: Migrating coupons...');
    await migrateCoupons(oldData.coupons);

    logger.info('Step 7: Migrating complaints...');
    await migrateComplaints(oldData.complaints, packageMap, vendorMap);

    logger.success('Migration completed successfully!');
    
    // Print summary
    console.log('\n=== Migration Summary ===');
    console.log(`Vendors: ${await TourismVendor.countDocuments()}`);
    console.log(`Packages: ${await TourismPackage.countDocuments()}`);
    console.log(`Reviews: ${await TourismReview.countDocuments()}`);
    console.log(`Bookings: ${await TourismBooking.countDocuments()}`);
    console.log(`Leads: ${await TourismLead.countDocuments()}`);
    console.log(`Coupons: ${await TourismCoupon.countDocuments()}`);
    console.log(`Complaints: ${await TourismComplaint.countDocuments()}`);
    console.log('========================\n');

  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

// Run migration
main();
