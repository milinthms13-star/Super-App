const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const devAppDataStore = require('./devAppDataStore');

const useMongoRestaurants = () => mongoose.connection.readyState === 1;

const serializeRestaurant = (record, index = 0) => {
  const plainRecord =
    typeof record?.toObject === 'function' ? record.toObject() : { ...(record || {}) };
  const id = String(plainRecord._id || plainRecord.id || `restaurant-${index + 1}`);

  return {
    id,
    name: plainRecord.name || 'Restaurant',
    cuisine: plainRecord.cuisine || 'Food',
    rating: Number(plainRecord.rating || 0),
    deliveryTime: plainRecord.deliveryTime || '30 mins',
    image: plainRecord.image || '',
    imageLabel: plainRecord.imageLabel || plainRecord.image || 'FD',
    discount: plainRecord.discount || '',
    distanceKm: Number(plainRecord.distanceKm || 0),
    priceForTwo: Number(plainRecord.priceForTwo || 0),
    promoted: Boolean(plainRecord.promoted),
    open: plainRecord.open !== false,
    licenseStatus: plainRecord.licenseStatus || '',
    avgPreparationTime: plainRecord.avgPreparationTime || '',
    walletOffers: plainRecord.walletOffers || '',
    cuisineTags: Array.isArray(plainRecord.cuisineTags) ? plainRecord.cuisineTags : [],
    menu: Array.isArray(plainRecord.menu) ? plainRecord.menu : [],
    reviews: Array.isArray(plainRecord.reviews) ? plainRecord.reviews : [],
    createdAt: plainRecord.createdAt ? new Date(plainRecord.createdAt).toISOString() : null,
    updatedAt: plainRecord.updatedAt ? new Date(plainRecord.updatedAt).toISOString() : null,
  };
};

const listRestaurants = async () => {
  if (useMongoRestaurants()) {
    const records = await Restaurant.find().sort({ createdAt: -1 });
    return records.map(serializeRestaurant);
  }

  const currentData = await devAppDataStore.readAppData();
  return Array.isArray(currentData.moduleData?.restaurants)
    ? currentData.moduleData.restaurants
    : [];
};

module.exports = {
  useMongoRestaurants,
  serializeRestaurant,
  listRestaurants,
};
