const mongoose = require('mongoose');
const RealEstateProperty = require('../models/RealEstateProperty');
const devAppDataStore = require('./devAppDataStore');

// Always use Mongo now that model/routes exist
const useMongoRealEstate = () => true;

const normalizeRealEstateLead = (lead = {}, index = 0) => ({
  id: String(lead.id || `lead-${index + 1}`),
  name: String(lead.name || 'Buyer').trim(),
  email: String(lead.email || '').trim().toLowerCase(),
  channel: String(lead.channel || 'Enquiry').trim(),
  priority: String(lead.priority || 'Warm').trim(),
  message: String(lead.message || '').trim(),
  createdAt: lead.createdAt ? new Date(lead.createdAt).toISOString() : new Date().toISOString(),
});

const normalizeRealEstateMessage = (message = {}, index = 0) => ({
  id: String(message.id || `message-${index + 1}`),
  from: String(message.from || 'User').trim(),
  senderEmail: String(message.senderEmail || '').trim().toLowerCase(),
  text: String(message.text || '').trim(),
  createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
});

const normalizeRealEstateReview = (review = {}, index = 0) => ({
  id: String(review.id || `review-${index + 1}`),
  author: String(review.author || 'Buyer').trim(),
  buyerEmail: String(review.buyerEmail || '').trim().toLowerCase(),
  score: Math.min(5, Math.max(1, Number(review.score || 5))),
  comment: String(review.comment || '').trim(),
  createdAt: review.createdAt ? new Date(review.createdAt).toISOString() : new Date().toISOString(),
});

const normalizeRealEstateReport = (report = {}, index = 0) => ({
  id: String(report.id || `report-${index + 1}`),
  reporterEmail: String(report.reporterEmail || '').trim().toLowerCase(),
  reporterName: String(report.reporterName || 'User').trim(),
  reason: String(report.reason || '').trim(),
  status: String(report.status || 'open').trim(),
  createdAt: report.createdAt ? new Date(report.createdAt).toISOString() : new Date().toISOString(),
});

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
  const reviews = Array.isArray(plainRecord.reviews)
    ? plainRecord.reviews.map(normalizeRealEstateReview)
    : [];
  const reports = Array.isArray(plainRecord.reports)
    ? plainRecord.reports.map(normalizeRealEstateReport)
    : [];
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + Number(review.score || 0), 0) / reviews.length
      : typeof plainRecord.rating === 'number'
        ? plainRecord.rating
        : 0;

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
    sellerEmail: String(plainRecord.sellerEmail || '').trim().toLowerCase(),
    ownerId: plainRecord.ownerId || plainRecord.sellerEmail || plainRecord.sellerName || '',
    developer: plainRecord.developer || plainRecord.sellerName || 'Malabar Estates',
    listedBy: plainRecord.listedBy || plainRecord.sellerRole || 'Owner',
    verified: plainRecord.verified !== false,
    verificationStatus:
      plainRecord.verificationStatus || (plainRecord.verified === false ? 'Pending' : 'Verified'),
    featured: Boolean(plainRecord.featured),
    postedOn:
      plainRecord.postedOn ||
      (plainRecord.createdAt ? new Date(plainRecord.createdAt).toISOString().slice(0, 10) : '2026-04-18'),
    possession: plainRecord.possession || 'Ready to move',
    description:
      plainRecord.description ||
      'Verified listing with strong local demand, transparent pricing, and responsive seller communication.',
    mapLabel: plainRecord.mapLabel || `${plainRecord.location || 'Kerala'} growth corridor`,
    rating: averageRating,
    reviewCount:
      typeof plainRecord.reviewCount === 'number' ? plainRecord.reviewCount : reviews.length,
    premiumPlan: plainRecord.premiumPlan || 'Featured Listing',
    mediaCount: typeof plainRecord.mediaCount === 'number' ? plainRecord.mediaCount : 0,
    hasVideoTour: Boolean(plainRecord.hasVideoTour),
    projectUnits: typeof plainRecord.projectUnits === 'number' ? plainRecord.projectUnits : 1,
    leads: Array.isArray(plainRecord.leads) ? plainRecord.leads.map(normalizeRealEstateLead) : [],
    chatPreview:
      Array.isArray(plainRecord.chatPreview)
        ? plainRecord.chatPreview.map(normalizeRealEstateMessage)
        : [],
    similarTags: Array.isArray(plainRecord.similarTags) ? plainRecord.similarTags : [],
    reviews,
    reports,
    disputeCount:
      typeof plainRecord.disputeCount === 'number' ? plainRecord.disputeCount : reports.length,
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
    ? currentData.moduleData.realestateProperties.map(serializeRealEstateProperty)
    : [];
};

const createRealEstateProperty = async (payload) => {
  if (!useMongoRealEstate()) {
    return null;
  }

  const created = await RealEstateProperty.create(payload);
  return serializeRealEstateProperty(created);
};

const updateRealEstateProperty = async (listingId, payload) => {
  if (!useMongoRealEstate()) {
    return null;
  }

  const updated = await RealEstateProperty.findByIdAndUpdate(listingId, payload, {
    new: true,
    runValidators: true,
  });

  return updated ? serializeRealEstateProperty(updated) : null;
};

const addRealEstateLead = async (listingId, payload) => {
  if (!useMongoRealEstate()) {
    return null;
  }

  const listing = await RealEstateProperty.findById(listingId);
  if (!listing) {
    return null;
  }

  listing.leads.push(payload);
  await listing.save();
  return serializeRealEstateProperty(listing);
};

const addRealEstateMessage = async (listingId, payload) => {
  if (!useMongoRealEstate()) {
    return null;
  }

  const listing = await RealEstateProperty.findById(listingId);
  if (!listing) {
    return null;
  }

  listing.chatPreview.push(payload);
  await listing.save();
  return serializeRealEstateProperty(listing);
};

const addRealEstateReview = async (listingId, payload) => {
  if (!useMongoRealEstate()) {
    return null;
  }

  const listing = await RealEstateProperty.findById(listingId);
  if (!listing) {
    return null;
  }

  listing.reviews.push(payload);
  listing.reviewCount = listing.reviews.length;
  listing.rating =
    listing.reviews.reduce((sum, review) => sum + Number(review.score || 0), 0) /
    listing.reviews.length;
  await listing.save();
  return serializeRealEstateProperty(listing);
};

const addRealEstateReport = async (listingId, payload) => {
  if (!useMongoRealEstate()) {
    return null;
  }

  const listing = await RealEstateProperty.findById(listingId);
  if (!listing) {
    return null;
  }

  listing.reports.push(payload);
  listing.disputeCount = listing.reports.length;
  await listing.save();
  return serializeRealEstateProperty(listing);
};

const moderateRealEstateProperty = async (listingId, updates) => {
  if (!useMongoRealEstate()) {
    return null;
  }

  const updated = await RealEstateProperty.findByIdAndUpdate(listingId, updates, {
    new: true,
    runValidators: true,
  });

  return updated ? serializeRealEstateProperty(updated) : null;
};

const deleteRealEstateProperty = async (listingId) => {
  if (!useMongoRealEstate()) {
    return null;
  }

  return RealEstateProperty.findByIdAndDelete(listingId);
};

const findRealEstatePropertyById = async (listingId) => {
  if (!useMongoRealEstate()) {
    return null;
  }

  const listing = await RealEstateProperty.findById(listingId);
  return listing ? serializeRealEstateProperty(listing) : null;
};

module.exports = {
  useMongoRealEstate,
  serializeRealEstateProperty,
  normalizeRealEstateLead,
  normalizeRealEstateMessage,
  normalizeRealEstateReview,
  normalizeRealEstateReport,
  listRealEstateProperties,
  createRealEstateProperty,
  updateRealEstateProperty,
  addRealEstateLead,
  addRealEstateMessage,
  addRealEstateReview,
  addRealEstateReport,
  moderateRealEstateProperty,
  deleteRealEstateProperty,
  findRealEstatePropertyById,
};
