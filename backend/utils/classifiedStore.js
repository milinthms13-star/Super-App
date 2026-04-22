const mongoose = require('mongoose');
const ClassifiedAd = require('../models/ClassifiedAd');
const devAppDataStore = require('./devAppDataStore');
const { generateSlug } = require('./slugGenerator');
const { calculateSpamScore, detectSuspiciousFlags } = require('./spamDetector');
const { calculatePopularityScore, calculateSellerScore } = require('./analyticsHelper');
const { getCoordinatesForCity } = require('./geolocationHelper');

const useMongoClassifieds = () => mongoose.connection.readyState === 1;

const buildClassifiedPlanLabel = (plan = 'free') => {
  if (plan === 'featured') {
    return 'Featured';
  }

  if (plan === 'urgent') {
    return 'Urgent';
  }

  if (plan === 'subscription') {
    return 'Seller Pro';
  }

  return 'Free';
};

const serializeClassifiedAd = (record, index = 0) => {
  const plainRecord =
    typeof record?.toObject === 'function' ? record.toObject() : { ...(record || {}) };
  const id = String(plainRecord._id || plainRecord.id || `classified-${index + 1}`);

  return {
    id,
    title: String(plainRecord.title || 'Marketplace Listing').trim(),
    description: String(
      plainRecord.description ||
        'Trusted local listing with seller details, direct chat, and location-first discovery.'
    ).trim(),
    slug: String(plainRecord.slug || '').trim(),
    price: Number(plainRecord.price || 0),
    priceHistory: Array.isArray(plainRecord.priceHistory) ? plainRecord.priceHistory : [],
    category: String(plainRecord.category || 'General').trim(),
    subcategory: String(plainRecord.subcategory || '').trim(),
    seller: String(plainRecord.seller || 'Trusted Seller').trim(),
    sellerRole: String(plainRecord.sellerRole || 'Seller').trim(),
    sellerEmail: String(plainRecord.sellerEmail || '').trim().toLowerCase(),
    sellerRating: Number(plainRecord.sellerRating || 5),
    sellerReviewCount: Number(plainRecord.sellerReviewCount || 0),
    sellerVerificationLevel: String(plainRecord.sellerVerificationLevel || 'unverified').trim(),
    location: String(plainRecord.location || 'Kerala').trim(),
    locality: String(plainRecord.locality || plainRecord.location || 'Prime area').trim(),
    coordinates: plainRecord.coordinates || { type: 'Point', coordinates: [0, 0] },
    condition: String(plainRecord.condition || 'Used').trim(),
    featured: Boolean(plainRecord.featured),
    urgent: Boolean(plainRecord.urgent),
    verified: plainRecord.verified !== false,
    views: Number(plainRecord.views || 0),
    favorites: Number(plainRecord.favorites || 0),
    chats: Number(plainRecord.chats || 0),
    moderationStatus: String(
      plainRecord.moderationStatus || (plainRecord.verified === false ? 'pending' : 'approved')
    ).trim(),
    moderationNotes: String(plainRecord.moderationNotes || '').trim(),
    languageSupport:
      Array.isArray(plainRecord.languageSupport) && plainRecord.languageSupport.length > 0
        ? plainRecord.languageSupport
        : ['English', 'Malayalam'],
    tags:
      Array.isArray(plainRecord.tags) && plainRecord.tags.length > 0
        ? plainRecord.tags
        : [String(plainRecord.category || 'General').trim(), String(plainRecord.condition || 'Used').trim()],
    mapLabel: String(
      plainRecord.mapLabel || `${plainRecord.location || 'Kerala'} local discovery zone`
    ).trim(),
    contactOptions:
      Array.isArray(plainRecord.contactOptions) && plainRecord.contactOptions.length > 0
        ? plainRecord.contactOptions
        : ['Chat'],
    mediaGallery: Array.isArray(plainRecord.mediaGallery) ? plainRecord.mediaGallery : [],
    monetizationPlan: String(
      plainRecord.monetizationPlan || buildClassifiedPlanLabel(plainRecord.plan || 'free')
    ).trim(),
    promotionPlanExpiry: plainRecord.promotionPlanExpiry || null,
    subscriptionTier: String(plainRecord.subscriptionTier || 'none').trim(),
    subscriptionExpiryDate: plainRecord.subscriptionExpiryDate || null,
    listedDate: plainRecord.listedDate || plainRecord.createdAt || new Date(),
    expiryDate: plainRecord.expiryDate || null,
    autoRenew: Boolean(plainRecord.autoRenew),
    isDraft: Boolean(plainRecord.isDraft),
    reviews: Array.isArray(plainRecord.reviews) ? plainRecord.reviews : [],
    averageRating: Number(plainRecord.averageRating || 5),
    totalReviews: Number(plainRecord.totalReviews || 0),
    spamScore: Number(plainRecord.spamScore || 0),
    flags: Array.isArray(plainRecord.flags) ? plainRecord.flags : [],
    analytics: plainRecord.analytics || {},
    popularityScore: calculatePopularityScore(plainRecord),
    createdAt: plainRecord.createdAt ? new Date(plainRecord.createdAt).toISOString() : null,
    updatedAt: plainRecord.updatedAt ? new Date(plainRecord.updatedAt).toISOString() : null,
  };
};

const flattenClassifiedMessages = (ads = []) =>
  ads.flatMap((ad) =>
    (Array.isArray(ad.messages) ? ad.messages : []).map((message, index) => ({
      id: String(message.id || `${ad.id}-message-${index + 1}`),
      listingId: String(ad.id),
      from: String(message.from || 'User').trim(),
      senderEmail: String(message.senderEmail || '').trim().toLowerCase(),
      text: String(message.text || '').trim(),
      isRead: Boolean(message.isRead),
      attachments: Array.isArray(message.attachments) ? message.attachments : [],
      createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
    }))
  );

const flattenClassifiedReports = (ads = []) =>
  ads.flatMap((ad) =>
    (Array.isArray(ad.reports) ? ad.reports : []).map((report, index) => ({
      id: String(report.id || `${ad.id}-report-${index + 1}`),
      listingId: String(ad.id),
      reporterEmail: String(report.reporterEmail || '').trim().toLowerCase(),
      reporterName: String(report.reporterName || 'User').trim(),
      reason: String(report.reason || '').trim(),
      status: String(report.status || 'open').trim(),
      createdAt: report.createdAt ? new Date(report.createdAt).toISOString() : new Date().toISOString(),
    }))
  );

const listClassifiedModuleDataFromMongo = async (filters = {}, options = {}) => {
  const { category, location, searchText, page = 1, limit = 20 } = { ...filters };
  const { skip = (page - 1) * limit } = options;

  let query = { isDraft: false };

  if (category && category !== 'All') {
    query.category = category;
  }

  if (location && location !== 'All') {
    query.location = location;
  }

  if (searchText && searchText.trim()) {
    const searchRegex = new RegExp(searchText.trim(), 'i');
    query.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { tags: searchRegex },
      { seller: searchRegex },
    ];
  }

  const records = await ClassifiedAd.find(query)
    .sort({ featured: -1, urgent: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await ClassifiedAd.countDocuments(query);

  const listings = records.map((r, i) => serializeClassifiedAd(r, skip + i));

  return {
    classifiedsListings: listings,
    classifiedsMessages: flattenClassifiedMessages(
      records.map((record, index) => ({
        ...serializeClassifiedAd(record, skip + index),
        messages: record.messages || [],
      }))
    ),
    classifiedsReports: flattenClassifiedReports(
      records.map((record, index) => ({
        ...serializeClassifiedAd(record, skip + index),
        reports: record.reports || [],
      }))
    ),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

const listClassifiedModuleData = async (filters = {}, options = {}) => {
  if (useMongoClassifieds()) {
    return listClassifiedModuleDataFromMongo(filters, options);
  }

  const currentData = await devAppDataStore.readAppData();
  return {
    classifiedsListings: Array.isArray(currentData.moduleData?.classifiedsListings)
      ? currentData.moduleData.classifiedsListings
      : [],
    classifiedsMessages: Array.isArray(currentData.moduleData?.classifiedsMessages)
      ? currentData.moduleData.classifiedsMessages
      : [],
    classifiedsReports: Array.isArray(currentData.moduleData?.classifiedsReports)
      ? currentData.moduleData.classifiedsReports
      : [],
  };
};

const createClassifiedAd = async (payload) => {
  if (!useMongoClassifieds()) {
    return null;
  }

  // Generate slug
  const slug = generateSlug(payload.title);

  // Set geolocation from city
  const coordinates = getCoordinatesForCity(payload.location);

  // Calculate spam score
  const spamScore = calculateSpamScore(payload);
  const flags = detectSuspiciousFlags(payload);

  const adData = {
    ...payload,
    slug,
    coordinates: { type: 'Point', coordinates },
    spamScore,
    flags,
    moderationStatus: spamScore > 50 ? 'flagged' : 'pending',
  };

  const created = await ClassifiedAd.create(adData);
  return serializeClassifiedAd(created);
};

const updateClassifiedAd = async (listingId, payload) => {
  if (!useMongoClassifieds()) {
    return null;
  }

  const updateData = { ...payload };

  // Regenerate slug if title changed
  if (payload.title) {
    updateData.slug = generateSlug(payload.title, listingId);
  }

  // Recalculate spam score if content changed
  if (payload.title || payload.description) {
    const ad = await ClassifiedAd.findById(listingId);
    const fullListing = { ...ad.toObject(), ...updateData };
    updateData.spamScore = calculateSpamScore(fullListing);
    updateData.flags = detectSuspiciousFlags(fullListing);
  }

  // Update coordinates if location changed
  if (payload.location) {
    const coordinates = getCoordinatesForCity(payload.location);
    updateData.coordinates = { type: 'Point', coordinates };
  }

  const updated = await ClassifiedAd.findByIdAndUpdate(listingId, updateData, {
    new: true,
    runValidators: true,
  });

  return updated ? serializeClassifiedAd(updated) : null;
};

const addClassifiedMessage = async (listingId, payload) => {
  if (!useMongoClassifieds()) {
    return null;
  }

  const ad = await ClassifiedAd.findById(listingId);
  if (!ad) {
    return null;
  }

  ad.messages.push(payload);
  ad.chats = Number(ad.chats || 0) + 1;
  await ad.save();
  return serializeClassifiedAd(ad);
};

const addClassifiedReport = async (listingId, payload) => {
  if (!useMongoClassifieds()) {
    return null;
  }

  const ad = await ClassifiedAd.findById(listingId);
  if (!ad) {
    return null;
  }

  ad.reports.push(payload);
  await ad.save();
  return serializeClassifiedAd(ad);
};

const addClassifiedReview = async (listingId, payload) => {
  if (!useMongoClassifieds()) {
    return null;
  }

  const ad = await ClassifiedAd.findById(listingId);
  if (!ad) {
    return null;
  }

  ad.reviews.push(payload);
  ad.totalReviews = ad.reviews.length;
  ad.averageRating = ad.reviews.reduce((sum, r) => sum + r.rating, 0) / ad.reviews.length;
  await ad.save();
  return serializeClassifiedAd(ad);
};

const moderateClassifiedAd = async (listingId, updates) => {
  if (!useMongoClassifieds()) {
    return null;
  }

  const updated = await ClassifiedAd.findByIdAndUpdate(listingId, updates, {
    new: true,
    runValidators: true,
  });

  return updated ? serializeClassifiedAd(updated) : null;
};

const deleteClassifiedAd = async (listingId) => {
  if (!useMongoClassifieds()) {
    return null;
  }

  return ClassifiedAd.findByIdAndDelete(listingId);
};

const findClassifiedAdById = async (listingId) => {
  if (!useMongoClassifieds()) {
    return null;
  }

  const ad = await ClassifiedAd.findById(listingId);
  return ad ? serializeClassifiedAd(ad) : null;
};

const findClassifiedAdBySlug = async (slug) => {
  if (!useMongoClassifieds()) {
    return null;
  }

  const ad = await ClassifiedAd.findOne({ slug });
  return ad ? serializeClassifiedAd(ad) : null;
};

const findNearbyListings = async (coordinates = [0, 0], radiusKm = 50) => {
  if (!useMongoClassifieds()) {
    return [];
  }

  const listings = await ClassifiedAd.find({
    coordinates: {
      $near: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: radiusKm * 1000,
      },
    },
  }).limit(20);

  return listings.map(serializeClassifiedAd);
};

const searchClassifieds = async (query = {}, options = {}) => {
  if (!useMongoClassifieds()) {
    return [];
  }

  const {
    text = '',
    category = null,
    location = null,
    minPrice = 0,
    maxPrice = Infinity,
    condition = null,
    sortBy = 'featured',
    page = 1,
    limit = 20,
  } = query;

  const { skip = (page - 1) * limit } = options;

  let dbQuery = { isDraft: false, moderationStatus: { $ne: 'rejected' } };

  if (text && text.trim()) {
    const searchRegex = new RegExp(text.trim(), 'i');
    dbQuery.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { tags: searchRegex },
      { seller: searchRegex },
    ];
  }

  if (category) {
    dbQuery.category = category;
  }

  if (location) {
    dbQuery.location = location;
  }

  if (minPrice > 0 || maxPrice < Infinity) {
    dbQuery.price = { $gte: minPrice, $lte: maxPrice };
  }

  if (condition) {
    dbQuery.condition = condition;
  }

  // Apply sorting
  let sortOptions = {};
  switch (sortBy) {
    case 'latest':
      sortOptions = { createdAt: -1 };
      break;
    case 'price-low':
      sortOptions = { price: 1 };
      break;
    case 'price-high':
      sortOptions = { price: -1 };
      break;
    case 'popular':
      sortOptions = { chats: -1, favorites: -1 };
      break;
    case 'featured':
    default:
      sortOptions = { featured: -1, urgent: -1, createdAt: -1 };
  }

  const records = await ClassifiedAd.find(dbQuery)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);

  const total = await ClassifiedAd.countDocuments(dbQuery);

  return {
    listings: records.map((r, i) => serializeClassifiedAd(r, skip + i)),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

const blockUser = async (listingId, userEmail) => {
  if (!useMongoClassifieds()) {
    return null;
  }

  const normalizedEmail = String(userEmail || '').trim().toLowerCase();
  const updated = await ClassifiedAd.findByIdAndUpdate(
    listingId,
    { $addToSet: { blockedUsers: normalizedEmail } },
    { new: true }
  );

  return updated ? serializeClassifiedAd(updated) : null;
};

const unblockUser = async (listingId, userEmail) => {
  if (!useMongoClassifieds()) {
    return null;
  }

  const normalizedEmail = String(userEmail || '').trim().toLowerCase();
  const updated = await ClassifiedAd.findByIdAndUpdate(
    listingId,
    { $pull: { blockedUsers: normalizedEmail } },
    { new: true }
  );

  return updated ? serializeClassifiedAd(updated) : null;
};

module.exports = {
  useMongoClassifieds,
  buildClassifiedPlanLabel,
  serializeClassifiedAd,
  listClassifiedModuleData,
  createClassifiedAd,
  updateClassifiedAd,
  addClassifiedMessage,
  addClassifiedReport,
  addClassifiedReview,
  moderateClassifiedAd,
  deleteClassifiedAd,
  findClassifiedAdById,
  findClassifiedAdBySlug,
  findNearbyListings,
  searchClassifieds,
  blockUser,
  unblockUser,
};
