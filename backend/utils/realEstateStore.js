const mongoose = require('mongoose');
const RealEstateProperty = require('../models/RealEstateProperty');
const devAppDataStore = require('./devAppDataStore');

const useMongoRealEstate = () => mongoose.connection.readyState === 1;

const serializeRealEstateProperty = (record, index = 0) => {
  const plainRecord =
    typeof record?.toObject === 'function' ? record.toObject() : { ...(record || {}) };
  const id = String(plainRecord._id || plainRecord.id || `property-${index + 1}`);
  const priceValue =
    typeof plainRecord.priceValue === 'number'
      ? plainRecord.priceValue
      : Number(String(plainRecord.price || '').replace(/[^0-9.]/g, '')) || 0;
  const areaSqft =
    typeof plainRecord.areaSqft === 'number'
      ? plainRecord.areaSqft
      : Number(String(plainRecord.area || '').replace(/[^0-9.]/g, '')) || 0;

  return {
    id,
    title: plainRecord.title || 'Verified Property',
    price: plainRecord.price || plainRecord.priceLabel || 'Price on request',
    priceLabel: plainRecord.priceLabel || plainRecord.price || 'Price on request',
    priceValue,
    area: plainRecord.area || `${areaSqft || 1200} sq ft`,
    areaSqft: areaSqft || 1200,
    location: plainRecord.location || 'Kerala',
    locality: plainRecord.locality || plainRecord.location || 'Prime neighborhood',
    type: plainRecord.type || 'Flat',
    intent: plainRecord.intent || 'sale',
    image: plainRecord.image || 'Property',
    bedrooms: Number(plainRecord.bedrooms || 0),
    bathrooms: Number(plainRecord.bathrooms || 0),
    furnishing: plainRecord.furnishing || 'Semi Furnished',
    amenities: Array.isArray(plainRecord.amenities) ? plainRecord.amenities : [],
    sellerName: plainRecord.sellerName || 'Trusted Seller',
    sellerRole: plainRecord.sellerRole || 'Owner',
    sellerEmail: plainRecord.sellerEmail || '',
    developer: plainRecord.developer || plainRecord.sellerName || 'Malabar Estates',
    listedBy: plainRecord.listedBy || plainRecord.sellerRole || 'Owner',
    verified: plainRecord.verified !== false,
    verificationStatus: plainRecord.verificationStatus || (plainRecord.verified === false ? 'Pending' : 'Verified'),
    featured: Boolean(plainRecord.featured),
    postedOn:
      plainRecord.postedOn ||
      (plainRecord.createdAt ? new Date(plainRecord.createdAt).toISOString().slice(0, 10) : '2026-04-18'),
    possession: plainRecord.possession || 'Ready to move',
    description:
      plainRecord.description ||
      'Verified listing with strong local demand, transparent pricing, and responsive seller communication.',
    mapLabel: plainRecord.mapLabel || `${plainRecord.location || 'Kerala'} growth corridor`,
    rating: typeof plainRecord.rating === 'number' ? plainRecord.rating : 4.5,
    reviewCount: typeof plainRecord.reviewCount === 'number' ? plainRecord.reviewCount : 0,
    premiumPlan: plainRecord.premiumPlan || 'Featured Listing',
    mediaCount: typeof plainRecord.mediaCount === 'number' ? plainRecord.mediaCount : 0,
    hasVideoTour: Boolean(plainRecord.hasVideoTour),
    projectUnits: typeof plainRecord.projectUnits === 'number' ? plainRecord.projectUnits : 1,
    leads: Array.isArray(plainRecord.leads) ? plainRecord.leads : [],
    chatPreview: Array.isArray(plainRecord.chatPreview) ? plainRecord.chatPreview : [],
    similarTags: Array.isArray(plainRecord.similarTags) ? plainRecord.similarTags : [],
    reviews: Array.isArray(plainRecord.reviews) ? plainRecord.reviews : [],
    disputeCount: typeof plainRecord.disputeCount === 'number' ? plainRecord.disputeCount : 0,
    languageSupport:
      Array.isArray(plainRecord.languageSupport) && plainRecord.languageSupport.length > 0
        ? plainRecord.languageSupport
        : ['English', 'Malayalam'],
    status: plainRecord.status || 'available',
    createdAt: plainRecord.createdAt ? new Date(plainRecord.createdAt).toISOString() : null,
    updatedAt: plainRecord.updatedAt ? new Date(plainRecord.updatedAt).toISOString() : null,
  };
};

const listRealEstateProperties = async () => {
  if (useMongoRealEstate()) {
    const records = await RealEstateProperty.find().sort({ createdAt: -1 });
    return records.map(serializeRealEstateProperty);
  }

  const currentData = await devAppDataStore.readAppData();
  return Array.isArray(currentData.moduleData?.realestateProperties)
    ? currentData.moduleData.realestateProperties
    : [];
};

module.exports = {
  useMongoRealEstate,
  serializeRealEstateProperty,
  listRealEstateProperties,
};
