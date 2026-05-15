const mongoose = require('mongoose');
const RealEstateProperty = require('../models/RealEstateProperty');
const devAppDataStore = require('./devAppDataStore');

// Always use Mongo now that model/routes exist
const useMongoRealEstate = () => true;

const normalizeLeadStatus = (status = '') => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'site_visit_scheduled') return 'site_visit';
  if (normalized === 'negotiating') return 'negotiation';
  return normalized || 'new';
};

const normalizeRealEstateLead = (lead = {}, index = 0) => ({
  id: String(lead.id || `lead-${index + 1}`),
  name: String(lead.name || 'Buyer').trim(),
  email: String(lead.email || '').trim().toLowerCase(),
  channel: String(lead.channel || 'Enquiry').trim(),
  priority: String(lead.priority || 'Warm').trim(),
  status: normalizeLeadStatus(lead.status),
  message: String(lead.message || '').trim(),
  followUpAt: lead.followUpAt ? new Date(lead.followUpAt).toISOString() : null,
  followUpNote: String(lead.followUpNote || '').trim(),
  assignedTo: String(lead.assignedTo || '').trim(),
  lastContactedAt: lead.lastContactedAt ? new Date(lead.lastContactedAt).toISOString() : null,
  updatedAt: lead.updatedAt ? new Date(lead.updatedAt).toISOString() : new Date().toISOString(),
  createdAt: lead.createdAt ? new Date(lead.createdAt).toISOString() : new Date().toISOString(),
});

const normalizeRealEstateVisit = (visit = {}, index = 0) => ({
  id: String(visit.id || `visit-${index + 1}`),
  leadId: String(visit.leadId || '').trim(),
  buyerName: String(visit.buyerName || 'Buyer').trim(),
  buyerEmail: String(visit.buyerEmail || '').trim().toLowerCase(),
  buyerPhone: String(visit.buyerPhone || '').trim(),
  scheduledAt: visit.scheduledAt ? new Date(visit.scheduledAt).toISOString() : new Date().toISOString(),
  durationMinutes: Number(visit.durationMinutes || 45),
  mode: String(visit.mode || 'onsite').trim(),
  note: String(visit.note || '').trim(),
  status: String(visit.status || 'scheduled').trim(),
  reminderAt: visit.reminderAt ? new Date(visit.reminderAt).toISOString() : null,
  createdAt: visit.createdAt ? new Date(visit.createdAt).toISOString() : new Date().toISOString(),
  updatedAt: visit.updatedAt ? new Date(visit.updatedAt).toISOString() : new Date().toISOString(),
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
  const postingType =
    String(plainRecord.postingType || '').trim().toLowerCase() === 'requirement'
      ? 'requirement'
      : 'property';
  const minBudget = String(plainRecord.minBudget || '').trim();
  const maxBudget = String(plainRecord.maxBudget || '').trim();
  const preferredLocations = String(plainRecord.preferredLocations || '').trim();
  const mustHaveAmenities = String(plainRecord.mustHaveAmenities || '').trim();
  const moveInDate = String(plainRecord.moveInDate || '').trim();

  return {
    id,
    postingType,
    title: plainRecord.title || 'Verified Property',
    price: plainRecord.price || plainRecord.priceLabel || 'Price on request',
    priceLabel: plainRecord.priceLabel || plainRecord.price || 'Price on request',
    priceValue,
    minBudget,
    maxBudget,
    preferredLocations,
    mustHaveAmenities,
    moveInDate,
    area: plainRecord.area || `${areaSqft || 1200} sq ft`,
    areaSqft: areaSqft || 1200,
    location: plainRecord.location || 'Kerala',
    locality: plainRecord.locality || plainRecord.location || 'Prime neighborhood',
    type: plainRecord.type || 'Flat',
    intent: plainRecord.intent || 'sale',
    image: plainRecord.image || 'Property',
    mediaGallery: Array.isArray(plainRecord.mediaGallery) ? plainRecord.mediaGallery : [],
    videoTourUrl: plainRecord.videoTourUrl || '',
    floorPlanUrl: plainRecord.floorPlanUrl || '',
    brochureUrl: plainRecord.brochureUrl || '',
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
      (postingType === 'requirement'
        ? 'Buyer requirement posted for matching properties.'
        : 'Verified listing with strong local demand, transparent pricing, and responsive seller communication.'),
    mapLabel: plainRecord.mapLabel || `${plainRecord.location || 'Kerala'} growth corridor`,
    mapPreviewUrl: plainRecord.mapPreviewUrl || '',
    mapLocationLat: typeof plainRecord.mapLocationLat === 'number' ? plainRecord.mapLocationLat : null,
    mapLocationLng: typeof plainRecord.mapLocationLng === 'number' ? plainRecord.mapLocationLng : null,
    readyToMove: Boolean(plainRecord.readyToMove),
    underConstruction: Boolean(plainRecord.underConstruction),
    carpetAreaSqft: typeof plainRecord.carpetAreaSqft === 'number' ? plainRecord.carpetAreaSqft : null,
    builtUpAreaSqft:
      typeof plainRecord.builtUpAreaSqft === 'number' ? plainRecord.builtUpAreaSqft : null,
    landSizeSqft: typeof plainRecord.landSizeSqft === 'number' ? plainRecord.landSizeSqft : null,
    floorNumber: typeof plainRecord.floorNumber === 'number' ? plainRecord.floorNumber : null,
    totalFloors: typeof plainRecord.totalFloors === 'number' ? plainRecord.totalFloors : null,
    parkingSpots: typeof plainRecord.parkingSpots === 'number' ? plainRecord.parkingSpots : null,
    propertyAgeYears:
      typeof plainRecord.propertyAgeYears === 'number' ? plainRecord.propertyAgeYears : null,
    address: plainRecord.address || '',
    landmark: plainRecord.landmark || '',
    contactPhone: plainRecord.contactPhone || '',
    whatsappNumber: plainRecord.whatsappNumber || '',
    nearbySchoolKm: typeof plainRecord.nearbySchoolKm === 'number' ? plainRecord.nearbySchoolKm : null,
    nearbyHospitalKm:
      typeof plainRecord.nearbyHospitalKm === 'number' ? plainRecord.nearbyHospitalKm : null,
    nearbyMetroKm: typeof plainRecord.nearbyMetroKm === 'number' ? plainRecord.nearbyMetroKm : null,
    reraNumber: plainRecord.reraNumber || '',
    titleDeedStatus: plainRecord.titleDeedStatus || 'pending',
    taxReceipt: Boolean(plainRecord.taxReceipt),
    buildingPermit: Boolean(plainRecord.buildingPermit),
    encumbranceCertificate: Boolean(plainRecord.encumbranceCertificate),
    rating: averageRating,
    reviewCount:
      typeof plainRecord.reviewCount === 'number' ? plainRecord.reviewCount : reviews.length,
    premiumPlan: plainRecord.premiumPlan || 'Featured Listing',
    mediaCount: typeof plainRecord.mediaCount === 'number' ? plainRecord.mediaCount : 0,
    hasVideoTour: Boolean(plainRecord.hasVideoTour),
    projectUnits: typeof plainRecord.projectUnits === 'number' ? plainRecord.projectUnits : 1,
    leads: Array.isArray(plainRecord.leads) ? plainRecord.leads.map(normalizeRealEstateLead) : [],
    visits: Array.isArray(plainRecord.visits) ? plainRecord.visits.map(normalizeRealEstateVisit) : [],
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
  normalizeRealEstateVisit,
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
