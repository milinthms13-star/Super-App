/**
 * Phase7DatabaseIndexes.js
 * MongoDB Indexes for Phase 7: Corporate & Rental Features
 * Run: node backend/scripts/Phase7DatabaseIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const createIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/malabarbazaar');
    console.log('Connected to MongoDB');

    // Corporate Account Indexes
    const CorporateAccountCollection = mongoose.connection.collection('corporateaccounts');

    await CorporateAccountCollection.createIndex({ adminId: 1 });
    console.log('✓ Corporate Account - adminId index');

    await CorporateAccountCollection.createIndex({ companyName: 1 });
    console.log('✓ Corporate Account - companyName index');

    await CorporateAccountCollection.createIndex({ status: 1, createdAt: -1 });
    console.log('✓ Corporate Account - status & date index');

    await CorporateAccountCollection.createIndex({ industry: 1, city: 1 });
    console.log('✓ Corporate Account - industry & city index');

    // Bulk Booking Indexes
    const BulkBookingCollection = mongoose.connection.collection('bulkbookings');

    await BulkBookingCollection.createIndex({ createdBy: 1, createdAt: -1 });
    console.log('✓ Bulk Booking - createdBy & date index');

    await BulkBookingCollection.createIndex({ corporateAccountId: 1, status: 1 });
    console.log('✓ Bulk Booking - corporateId & status index');

    await BulkBookingCollection.createIndex({ eventType: 1, eventDate: 1 });
    console.log('✓ Bulk Booking - event type & date index');

    await BulkBookingCollection.createIndex({ status: 1, createdAt: -1 });
    console.log('✓ Bulk Booking - status & date index');

    // Expense Tracking Indexes
    const ExpenseCollection = mongoose.connection.collection('expenses');

    await ExpenseCollection.createIndex({ userId: 1, expenseDate: -1 });
    console.log('✓ Expense - userId & date index');

    await ExpenseCollection.createIndex({ corporateAccountId: 1, expenseDate: -1 });
    console.log('✓ Expense - corporateId & date index');

    await ExpenseCollection.createIndex({ costCenter: 1, expenseDate: -1 });
    console.log('✓ Expense - costCenter & date index');

    await ExpenseCollection.createIndex({ rideId: 1 });
    console.log('✓ Expense - rideId index');

    await ExpenseCollection.createIndex({ category: 1, expenseDate: -1 });
    console.log('✓ Expense - category & date index');

    await ExpenseCollection.createIndex({ expenseDate: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL for archived
    console.log('✓ Expense - date TTL index');

    // Rental Package Indexes
    const RentalPackageCollection = mongoose.connection.collection('rentalpackages');

    await RentalPackageCollection.createIndex({ duration: 1, vehicleType: 1 });
    console.log('✓ Rental Package - duration & vehicle type index');

    await RentalPackageCollection.createIndex({ status: 1 });
    console.log('✓ Rental Package - status index');

    await RentalPackageCollection.createIndex({ baseCost: 1 });
    console.log('✓ Rental Package - baseCost index');

    // Rental Booking Indexes
    const RentalBookingCollection = mongoose.connection.collection('rentalbookings');

    await RentalBookingCollection.createIndex({ riderId: 1, createdAt: -1 });
    console.log('✓ Rental Booking - riderId & date index');

    await RentalBookingCollection.createIndex({ corporateAccountId: 1, status: 1 });
    console.log('✓ Rental Booking - corporateId & status index');

    await RentalBookingCollection.createIndex({ assignedDriver: 1, status: 1 });
    console.log('✓ Rental Booking - driver & status index');

    await RentalBookingCollection.createIndex({
      startDateTime: 1,
      returnDateTime: 1,
      assignedDriver: 1,
    });
    console.log('✓ Rental Booking - date range & driver index');

    await RentalBookingCollection.createIndex({ status: 1, createdAt: -1 });
    console.log('✓ Rental Booking - status & date index');

    await RentalBookingCollection.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 15552000 } // 180 days TTL
    );
    console.log('✓ Rental Booking - creation date TTL index');

    // Budget Tracking Indexes
    const BudgetCollection = mongoose.connection.collection('budgets');

    await BudgetCollection.createIndex({ corporateAccountId: 1, departmentName: 1 });
    console.log('✓ Budget - corporateId & department index');

    await BudgetCollection.createIndex({ month: 1, year: 1 });
    console.log('✓ Budget - month & year index');

    // Summary
    console.log('\n========== Phase 7 Database Indexes Created Successfully ==========');
    console.log('✓ 4 Corporate Account indexes');
    console.log('✓ 4 Bulk Booking indexes');
    console.log('✓ 6 Expense Tracking indexes');
    console.log('✓ 3 Rental Package indexes');
    console.log('✓ 6 Rental Booking indexes');
    console.log('✓ 2 Budget indexes');
    console.log('Total: 25 indexes created');
    console.log('==================================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
};

// Run index creation
createIndexes();
