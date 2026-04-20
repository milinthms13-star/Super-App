const mongoose = require('mongoose');
const ClassifiedAd = require('../models/ClassifiedAd');
const RealEstateProperty = require('../models/RealEstateProperty');
const Restaurant = require('../models/Restaurant');
const devAppDataStore = require('./devAppDataStore');
const logger = require('./logger');

const canRunMongoMigration = () => mongoose.connection.readyState === 1;

const migrateCollectionIfEmpty = async ({ model, records = [], label }) => {
  const existingCount = await model.countDocuments();
  if (existingCount > 0 || !Array.isArray(records) || records.length === 0) {
    return { migrated: 0, skipped: true };
  }

  await model.insertMany(records, { ordered: false });
  logger.info(`${label} migration inserted ${records.length} documents into MongoDB.`);
  return { migrated: records.length, skipped: false };
};

const migrateModuleDataToMongo = async () => {
  if (!canRunMongoMigration()) {
    return { migrated: false, reason: 'mongo_not_connected' };
  }

  const appData = await devAppDataStore.readAppData();
  const moduleData = appData.moduleData || {};

  const classifiedsResult = await migrateCollectionIfEmpty({
    model: ClassifiedAd,
    records: Array.isArray(moduleData.classifiedsListings) ? moduleData.classifiedsListings : [],
    label: 'Classified ads',
  });

  const realEstateResult = await migrateCollectionIfEmpty({
    model: RealEstateProperty,
    records: Array.isArray(moduleData.realestateProperties) ? moduleData.realestateProperties : [],
    label: 'Real estate properties',
  });

  const restaurantResult = await migrateCollectionIfEmpty({
    model: Restaurant,
    records: Array.isArray(moduleData.restaurants) ? moduleData.restaurants : [],
    label: 'Restaurants',
  });

  return {
    migrated: true,
    classifieds: classifiedsResult,
    realestate: realEstateResult,
    restaurants: restaurantResult,
  };
};

module.exports = {
  migrateModuleDataToMongo,
};
