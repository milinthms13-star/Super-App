const mongoose = require('mongoose');
const ClassifiedAd = require('../models/ClassifiedAd');
const ClassifiedSubscription = require('../models/ClassifiedSubscription');
const devAppDataStore = require('./devAppDataStore');
const { generateSlug } = require('./slugGenerator');
const { calculateSpamScore, detectSuspiciousFlags } = require('./spamDetector');
const { calculatePopularityScore, calculateSellerScore } = require('./analyticsHelper');
const User = require('../models/User');
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

const parseOptionalDate = (value) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const normalizeClassifiedModerationStatus = (value, verified = true) =>
  String(value || (verified === false ? 'pending' : 'approved'))
    .trim()
    .toLowerCase();

const isClassifiedModerationPubliclyVisible = (record = {}) =>
  normalizeClassifiedModerationStatus(record?.moderationStatus, record?.verified) === 'approved';

const escapeRegexText = (value = '') => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isMissingTextIndexError = (error) =>
  /text query requires text index/i.test(String(error?.message || ''));

// Normalize condition to canonical set to avoid casing/variant mismatch
const normalizeCondition = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return 'Used';
  const lower = raw.toLowerCase();
  if (['new', 'brand new', 'brand-new', 'n'].includes(lower)) return 'New';
  if (['refurbished', 'refurb', 'refurbish'].includes(lower)) return 'Refurbished';
  if (['used', 'second hand', 'second-hand', 'preowned', 'pre-owned'].includes(lower)) return 'Used';
  // default fallback: capitalize first letter
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

// Build a simple searchable text used in serialization; this can be indexed in MongoDB
const buildSearchableText = (plainRecord = {}) => {
  const parts = [
    plainRecord.title,
    plainRecord.description,
    plainRecord.category,
    plainRecord.subcategory,
    plainRecord.location,
    plainRecord.locality,
    plainRecord.seller,
    ...(Array.isArray(plainRecord.tags) ? plainRecord.tags : []),
  ].filter(Boolean);
  return parts.join(' ').toLowerCase();
};

const isPromotionActive = (record = {}, now = new Date()) => {
  const promotionExpiry = parseOptionalDate(record?.promotionPlanExpiry || record?.expiryDate);
  return !promotionExpiry || promotionExpiry >= now;
};

const isClassifiedRecordVisible = (record = {}, now = new Date()) => {
  if (Boolean(record?.autoRenew)) {
    return true;
  }

  const expiryDate = parseOptionalDate(record?.expiryDate);
  return !expiryDate || expiryDate >= now;
};

const shouldIncludeClassifiedRecord = (record = {}, options = {}) => {
  const {
    includeExpired = false,
    includeRejected = false,
    now = new Date(),
  } = options;

  if (Boolean(record?.isDraft)) {
    return false;
  }

  if (!includeRejected && !isClassifiedModerationPubliclyVisible(record)) {
    return false;
  }

  if (!includeExpired && !isClassifiedRecordVisible(record, now)) {
    return false;
  }

  return true;
};

const buildClassifiedSearchTextMatch = (record = {}, searchText = '') => {
  if (!searchText || !searchText.trim()) {
    return true;
  }

  const normalizedText = searchText.trim().toLowerCase();
  const searchableText = [
    record?.title,
    record?.description,
    record?.category,
    record?.location,
    record?.seller,
    ...(Array.isArray(record?.tags) ? record.tags : []),
  ]
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedText);
};

const sortClassifiedRecords = (records = [], sortBy = 'featured') => {
  const sortedRecords = [...records];

  sortedRecords.sort((first, second) => {
    if (sortBy === 'latest') {
      return new Date(second.createdAt || second.listedDate || 0) - new Date(first.createdAt || first.listedDate || 0);
    }

    if (sortBy === 'price-low') {
      return Number(first.price || 0) - Number(second.price || 0);
    }

    if (sortBy === 'price-high') {
      return Number(second.price || 0) - Number(first.price || 0);
    }

    if (sortBy === 'popular') {
      return Number(second.chats || 0) + Number(second.favorites || 0) - Number(first.chats || 0) - Number(first.favorites || 0);
    }

    return (
      Number(Boolean(second.featured)) - Number(Boolean(first.featured)) ||
      Number(Boolean(second.urgent)) - Number(Boolean(first.urgent)) ||
      new Date(second.createdAt || second.listedDate || 0) - new Date(first.createdAt || first.listedDate || 0)
    );
  });

  return sortedRecords;
};

const serializeClassifiedAd = (record, index = 0) => {
  const plainRecord =
    typeof record?.toObject === 'function' ? record.toObject() : { ...(record || {}) };
  const id = String(plainRecord._id || plainRecord.id || `classified-${index + 1}`);
  const now = new Date();

  return {
    id,
    listingType:
      String(plainRecord.listingType || plainRecord.intent || '')
        .trim()
        .toLowerCase() === 'buy'
        ? 'buy'
        : 'sell',
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
    sellerRole: String(
      plainRecord.sellerRole ||
        (String(plainRecord.listingType || plainRecord.intent || '').trim().toLowerCase() === 'buy'
          ? 'Buyer'
          : 'Seller')
    ).trim(),
    sellerEmail: String(plainRecord.sellerEmail || '').trim().toLowerCase(),
    sellerTotalRating: Number(plainRecord.classifiedsTotalRating || plainRecord.sellerTotalRating || 5),
    sellerReviewCount: Number(plainRecord.classifiedsReviewCount || plainRecord.sellerReviewCount || 0),
    sellerVerificationLevel: String(plainRecord.sellerVerificationLevel || 'unverified').trim(),
    location: String(plainRecord.location || 'Kerala').trim(),
    locality: String(plainRecord.locality || plainRecord.location || 'Prime area').trim(),
    coordinates: plainRecord.coordinates || { type: 'Point', coordinates: [0, 0] },
    condition: normalizeCondition(plainRecord.condition || 'Used'),
    featured: Boolean(plainRecord.featured) && isPromotionActive(plainRecord, now),
    urgent: Boolean(plainRecord.urgent) && isPromotionActive(plainRecord, now),
    verified: plainRecord.verified !== false,
    views: Number(plainRecord.views || 0),
    favorites: Number(plainRecord.favorites || 0),
    chats: Number(plainRecord.chats || 0),
    moderationStatus: normalizeClassifiedModerationStatus(
      plainRecord.moderationStatus,
      plainRecord.verified
    ),
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
    blockedUsers: Array.isArray(plainRecord.blockedUsers)
      ? [...new Set(plainRecord.blockedUsers.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean))]
      : [],
    popularityScore: calculatePopularityScore(plainRecord),
    createdAt: plainRecord.createdAt ? new Date(plainRecord.createdAt).toISOString() : null,
    updatedAt: plainRecord.updatedAt ? new Date(plainRecord.updatedAt).toISOString() : null,
  };
};

const normalizeClassifiedMessageRecord = (message = {}, index = 0) => ({
  id: String(message.id || `classified-message-${index + 1}`),
  listingId: String(message.listingId || ''),
  from: String(message.from || 'User').trim(),
  senderEmail: String(message.senderEmail || '').trim().toLowerCase(),
  text: String(message.text || '').trim(),
  isRead: Boolean(message.isRead),
  attachments: Array.isArray(message.attachments) ? message.attachments : [],
  createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
});

const normalizeClassifiedReportRecord = (report = {}, index = 0) => ({
  id: String(report.id || `classified-report-${index + 1}`),
  listingId: String(report.listingId || ''),
  reporterEmail: String(report.reporterEmail || '').trim().toLowerCase(),
  reporterName: String(report.reporterName || 'User').trim(),
  reason: String(report.reason || '').trim(),
  status: String(report.status || 'open').trim(),
  createdAt: report.createdAt ? new Date(report.createdAt).toISOString() : new Date().toISOString(),
});

const flattenClassifiedMessages = (ads = []) =>
  ads.flatMap((ad) =>
    (Array.isArray(ad.messages) ? ad.messages : []).map((message, index) =>
      normalizeClassifiedMessageRecord(
        {
          ...message,
          id: String(message.id || `${ad.id}-message-${index + 1}`),
          listingId: String(ad.id),
        },
        index
      )
    )
  );

const flattenClassifiedReports = (ads = []) =>
  ads.flatMap((ad) =>
    (Array.isArray(ad.reports) ? ad.reports : []).map((report, index) =>
      normalizeClassifiedReportRecord(
        {
          ...report,
          id: String(report.id || `${ad.id}-report-${index + 1}`),
          listingId: String(ad.id),
        },
        index
      )
    )
  );

const listClassifiedModuleDataFromMongo = async (filters = {}, options = {}) => {
  const { category, location, searchText, page = 1, limit = 20 } = { ...filters };
  const {
    skip = (page - 1) * limit,
    includeExpired = false,
    includeRejected = false,
  } = options;

  let query = { isDraft: false };
  const andConditions = [];

  if (!includeRejected) {
    // Only approved listings should be publicly visible
    query.moderationStatus = 'approved';
  }

  if (!includeExpired) {
    andConditions.push(buildNonExpiredQuery(new Date()));
  }

  if (category && category !== 'All') {
    query.category = category;
  }

  if (location && location !== 'All') {
    query.location = location;
  }

  if (searchText && searchText.trim()) {
    const term = searchText.trim();
    // Prefer text index search if configured; fall back to regex across precomputed searchableText
    andConditions.push({
      $or: [
        { $text: { $search: term } },
        { searchableText: new RegExp(escapeRegexText(term), 'i') },
      ],
    });
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  let records;
  let effectiveQuery = query;
  try {
    records = await ClassifiedAd.find(query)
      .sort({ featured: -1, urgent: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
  } catch (error) {
    if (isMissingTextIndexError(error) && query.$and) {
      effectiveQuery = {
        ...query,
        $and: query.$and
          .map((condition) => {
            if (condition.$or) {
              return {
                $or: condition.$or.filter((clause) => !clause.$text),
              };
            }
            return condition;
          })
          .filter((condition) => !(condition.$or && condition.$or.length === 0)),
      };
      records = await ClassifiedAd.find(effectiveQuery)
        .sort({ featured: -1, urgent: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);
    } else {
      throw error;
    }
  }

  const total = await ClassifiedAd.countDocuments(effectiveQuery);

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

  const {
    category,
    location,
    searchText,
    page = 1,
    limit = 20,
  } = { ...filters };
  const {
    skip = (page - 1) * limit,
    includeExpired = false,
    includeRejected = false,
  } = options;
  const currentData = await devAppDataStore.readAppData();
  const sourceListings = Array.isArray(currentData.moduleData?.classifiedsListings)
    ? currentData.moduleData.classifiedsListings
    : [];
  const sourceMessages = Array.isArray(currentData.moduleData?.classifiedsMessages)
    ? currentData.moduleData.classifiedsMessages
    : [];
  const sourceReports = Array.isArray(currentData.moduleData?.classifiedsReports)
    ? currentData.moduleData.classifiedsReports
    : [];
  const allSerializedListings = sourceListings.map((record, index) => serializeClassifiedAd(record, index));
  const now = new Date();
  const filteredRecords = sortClassifiedRecords(
    allSerializedListings.filter((listing) => {
      if (!shouldIncludeClassifiedRecord(listing, { includeExpired, includeRejected, now })) {
        return false;
      }

      if (category && category !== 'All' && listing.category !== category) {
        return false;
      }

      if (location && location !== 'All' && listing.location !== location) {
        return false;
      }

      return buildClassifiedSearchTextMatch(listing, searchText);
    }),
    'featured'
  );
  const listings = filteredRecords.slice(skip, skip + limit);
  const visibleListingIds = new Set(listings.map((listing) => String(listing.id)));
  const sourceListingsById = new Map(
    sourceListings.map((record, index) => [String(record?.id || record?._id || `classified-${index + 1}`), record])
  );

  return {
    classifiedsListings: listings,
    classifiedsMessages:
      sourceMessages.length > 0
        ? sourceMessages
            .filter((message) => visibleListingIds.has(String(message?.listingId || '')))
            .map((message, index) => normalizeClassifiedMessageRecord(message, index))
        : flattenClassifiedMessages(
            listings.map((listing) => ({
              ...listing,
              messages: sourceListingsById.get(String(listing.id))?.messages || [],
            }))
          ),
    classifiedsReports:
      sourceReports.length > 0
        ? sourceReports
            .filter((report) => visibleListingIds.has(String(report?.listingId || '')))
            .map((report, index) => normalizeClassifiedReportRecord(report, index))
        : flattenClassifiedReports(
            listings.map((listing) => ({
              ...listing,
              reports: sourceListingsById.get(String(listing.id))?.reports || [],
            }))
          ),
    pagination: {
      total: filteredRecords.length,
      page,
      limit,
      pages: Math.ceil(filteredRecords.length / limit),
    },
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
    condition: normalizeCondition(payload.condition || 'Used'),
    searchableText: buildSearchableText(payload),
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

  // Recalculate spam score and searchable text when relevant fields change
  if (
    payload.title ||
    payload.description ||
    payload.category ||
    payload.subcategory ||
    payload.location ||
    payload.locality ||
    payload.seller ||
    payload.tags ||
    payload.condition
  ) {
    const ad = await ClassifiedAd.findById(listingId);
    const fullListing = { ...ad.toObject(), ...updateData };
    updateData.spamScore = calculateSpamScore(fullListing);
    updateData.flags = detectSuspiciousFlags(fullListing);
    updateData.condition = normalizeCondition(fullListing.condition || 'Used');
    updateData.searchableText = buildSearchableText(fullListing);
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

const updateUserTotalRating = async (sellerEmail) => {
  if (!useMongoClassifieds() || !sellerEmail) return;

  const sellerAds = await ClassifiedAd.find({ sellerEmail }).lean();
  if (sellerAds.length === 0) return;

  let totalRatingSum = 0;
  let totalCount = 0;
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
    }
  );
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

  // Update seller's total rating
  await updateUserTotalRating(ad.sellerEmail);

  return serializeClassifiedAd(ad);
};

const updateClassifiedFavoriteCount = async (listingId, delta = 0) => {
  if (!useMongoClassifieds()) {
    return null;
  }

  const ad = await ClassifiedAd.findById(listingId);
  if (!ad) {
    return null;
  }

  const safeDelta = Number.isFinite(Number(delta)) ? Number(delta) : 0;
  ad.favorites = Math.max(0, Number(ad.favorites || 0) + safeDelta);
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
    isDraft: false,
    moderationStatus: 'approved',
    $and: [buildNonExpiredQuery(new Date())],
    coordinates: {
      $near: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: radiusKm * 1000,
      },
    },
  }).limit(20);

  return listings.map(serializeClassifiedAd);
};

const incrementClassifiedView = async (listingId) => {
  if (!useMongoClassifieds()) {
    return null;
  }

  const updated = await ClassifiedAd.findByIdAndUpdate(
    listingId,
    {
      $inc: {
        views: 1,
        'analytics.uniqueVisitors': 1,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return updated ? serializeClassifiedAd(updated) : null;
};

const buildNonExpiredQuery = (now = new Date()) => {
  // Non-expired logic:
  // - expiryDate is missing => treat as non-expiring => show
  // - expiryDate >= now => show
  // - autoRenew === true => treat as renewed/kept => show
  return {
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gte: now } },
      { autoRenew: true },
    ],
  };
};

const searchClassifieds = async (query = {}, options = {}) => {
  if (!useMongoClassifieds()) {
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
    const moduleData = await listClassifiedModuleData(
      {
        category,
        location,
        searchText: text,
        page,
        limit: Number.MAX_SAFE_INTEGER,
      },
      {
        includeExpired: false,
        includeRejected: false,
        skip: 0,
      }
    );
    const normalizedCondition = condition ? normalizeCondition(condition) : null;
    const filteredListings = sortClassifiedRecords(
      (Array.isArray(moduleData.classifiedsListings) ? moduleData.classifiedsListings : []).filter((listing) => {
        const price = Number(listing?.price || 0);

        if (minPrice > 0 && price < minPrice) {
          return false;
        }

        if (maxPrice < Infinity && price > maxPrice) {
          return false;
        }

        if (normalizedCondition && listing.condition !== normalizedCondition) {
          return false;
        }

        return true;
      }),
      sortBy
    );

    return {
      listings: filteredListings.slice(skip, skip + limit),
      pagination: {
        total: filteredListings.length,
        page,
        limit,
        pages: Math.ceil(filteredListings.length / limit),
      },
    };
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
  const normalizedCondition = condition ? normalizeCondition(condition) : null;

  const expiryFilter = buildNonExpiredQuery(new Date());

  const dbQuery = {
    isDraft: false,
    // Only approved listings should be publicly discoverable
    moderationStatus: 'approved',
    ...(expiryFilter ? { $and: [expiryFilter] } : {}),
  };

  if (text && text.trim()) {
    const searchRegex = new RegExp(escapeRegexText(text.trim()), 'i');
    dbQuery.$and = dbQuery.$and || [];
    dbQuery.$and.push({
      $or: [
        { $text: { $search: text.trim() } },
        { searchableText: searchRegex },
      ],
    });
  }

  if (category && category !== 'All') {
    dbQuery.category = category;
  }

  if (location && location !== 'All') {
    dbQuery.location = location;
  }

  if ((minPrice > 0 && minPrice !== Infinity) || maxPrice < Infinity) {
    dbQuery.price = {};
    if (minPrice > 0 && minPrice !== Infinity) {
      dbQuery.price.$gte = minPrice;
    }
    if (maxPrice < Infinity) {
      dbQuery.price.$lte = maxPrice;
    }
  }

  if (normalizedCondition) {
    dbQuery.condition = normalizedCondition;
  }

  let effectiveQuery = dbQuery;
  let records;
  try {
    records = await ClassifiedAd.find(dbQuery)
      .sort({ featured: -1, urgent: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
  } catch (error) {
    if (isMissingTextIndexError(error) && dbQuery.$and) {
      effectiveQuery = {
        ...dbQuery,
        $and: dbQuery.$and
          .map((condition) => {
            if (condition.$or) {
              return {
                $or: condition.$or.filter((clause) => !clause.$text),
              };
            }
            return condition;
          })
          .filter((condition) => !(condition.$or && condition.$or.length === 0)),
      };
      records = await ClassifiedAd.find(effectiveQuery)
        .sort({ featured: -1, urgent: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);
    } else {
      throw error;
    }
  }

  const total = await ClassifiedAd.countDocuments(effectiveQuery);

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

/**
 * Subscription validation functions
 */

/**
 * Check if user can access contact information for an ad
 * @param {string} userId - User ID
 * @param {string} userEmail - User email
 * @param {string} adId - Ad ID
 * @returns {Promise<{hasAccess: boolean, reason: string, subscription?: object}>}
 */
const canAccessContact = async (userId, userEmail, adId) => {
  try {
    if (!useMongoClassifieds()) {
      return { hasAccess: true, reason: 'dev_mode' };
    }

    const normalizedEmail = String(userEmail || '').trim().toLowerCase();

    // Fetch ad
    const ad = await ClassifiedAd.findById(adId);
    if (!ad) {
      return { hasAccess: false, reason: 'ad_not_found' };
    }

    // Check if user is ad owner
    if (String(ad.sellerEmail || '').trim().toLowerCase() === normalizedEmail) {
      return { hasAccess: true, reason: 'owner' };
    }

    // Check contact visibility setting
    if (ad.contactVisibility === 'public') {
      return { hasAccess: true, reason: 'public' };
    }

    if (ad.contactVisibility === 'hidden') {
      return { hasAccess: false, reason: 'hidden' };
    }

    // Get user's subscription
    const subscription = await ClassifiedSubscription.findOne({
      $or: [{ userId }, { userEmail: normalizedEmail }],
      isActive: true,
    }).sort('-createdAt');

    if (!subscription || subscription.tier === 'free') {
      return {
        hasAccess: false,
        reason: 'subscription_required',
        subscription: subscription || null,
      };
    }

    // Check if already unlocked
    if (subscription.isAdUnlocked(adId)) {
      return {
        hasAccess: true,
        reason: 'already_unlocked',
        subscription,
      };
    }

    // Check if can unlock
    if (subscription.canUnlockContact()) {
      return {
        hasAccess: true,
        reason: 'can_unlock',
        subscription,
      };
    }

    // Limit reached
    return {
      hasAccess: false,
      reason: 'limit_reached',
      subscription,
    };
  } catch (error) {
    console.error('Error checking contact access:', error);
    return { hasAccess: false, reason: 'error', error: error.message };
  }
};

/**
 * Get user's active subscription
 * @param {string} userId - User ID
 * @param {string} userEmail - User email
 * @returns {Promise<object|null>}
 */
const getUserSubscription = async (userId, userEmail) => {
  try {
    if (!useMongoClassifieds()) {
      return null;
    }

    const normalizedEmail = String(userEmail || '').trim().toLowerCase();

    const subscription = await ClassifiedSubscription.findOne({
      $or: [{ userId }, { userEmail: normalizedEmail }],
      isActive: true,
    }).sort('-createdAt');

    return subscription;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }
};

/**
 * Check if user's subscription has a specific entitlement
 * @param {string} userId - User ID
 * @param {string} userEmail - User email
 * @param {string} entitlement - Entitlement key
 * @returns {Promise<boolean>}
 */
const hasEntitlement = async (userId, userEmail, entitlement) => {
  try {
    const subscription = await getUserSubscription(userId, userEmail);

    if (!subscription) {
      return false;
    }

    if (!subscription.isActive || subscription.isExpired) {
      return false;
    }

    return Boolean(subscription.entitlements?.[entitlement]);
  } catch (error) {
    console.error('Error checking entitlement:', error);
    return false;
  }
};

/**
 * Check if user can post a featured ad
 * @param {string} userId - User ID
 * @param {string} userEmail - User email
 * @returns {Promise<{canPost: boolean, remaining: number, reason: string}>}
 */
const canPostFeaturedAd = async (userId, userEmail) => {
  try {
    const subscription = await getUserSubscription(userId, userEmail);

    if (!subscription || subscription.tier === 'free') {
      return { canPost: false, remaining: 0, reason: 'subscription_required' };
    }

    if (!subscription.isActive || subscription.isExpired) {
      return { canPost: false, remaining: 0, reason: 'subscription_expired' };
    }

    const featuredSlots = subscription.entitlements?.featuredAdSlots || 0;

    if (featuredSlots === 0) {
      return { canPost: false, remaining: 0, reason: 'no_featured_slots' };
    }

    // Count current active featured ads by this user
    const activeFeaturedCount = await ClassifiedAd.countDocuments({
      sellerEmail: String(userEmail || '').trim().toLowerCase(),
      featured: true,
      moderationStatus: 'approved',
      isDraft: false,
    });

    const remaining = Math.max(0, featuredSlots - activeFeaturedCount);

    return {
      canPost: remaining > 0,
      remaining,
      reason: remaining > 0 ? 'available' : 'limit_reached',
    };
  } catch (error) {
    console.error('Error checking featured ad permission:', error);
    return { canPost: false, remaining: 0, reason: 'error' };
  }
};

/**
 * Serialize ad with subscription-aware contact info filtering
 * @param {object} record - Ad record
 * @param {number} index - Index
 * @param {string} viewerEmail - Viewer's email (optional)
 * @returns {object}
 */
const serializeClassifiedAdWithContactFilter = async (record, index = 0, viewerEmail = null) => {
  const serialized = serializeClassifiedAd(record, index);

  // If no viewer email, remove contact details
  if (!viewerEmail) {
    return {
      ...serialized,
      contactPhone: undefined,
      contactEmail: undefined,
      contactWhatsApp: undefined,
      contactVisibility: serialized.contactVisibility || 'subscribers-only',
    };
  }

  const normalizedViewerEmail = String(viewerEmail || '').trim().toLowerCase();
  const plainRecord = typeof record?.toObject === 'function' ? record.toObject() : { ...(record || {}) };

  // Add contact fields to serialization
  serialized.contactVisibility = plainRecord.contactVisibility || 'subscribers-only';
  serialized.contactPhone = plainRecord.contactPhone || '';
  serialized.contactEmail = plainRecord.contactEmail || plainRecord.sellerEmail || '';
  serialized.contactWhatsApp = plainRecord.contactWhatsApp || plainRecord.contactPhone || '';
  serialized.linkedChatIds = Array.isArray(plainRecord.linkedChatIds) ? plainRecord.linkedChatIds : [];
  serialized.contactUnlocks = Number(plainRecord.contactUnlocks || 0);

  // Check if viewer is owner
  if (normalizedViewerEmail === String(plainRecord.sellerEmail || '').trim().toLowerCase()) {
    return serialized;
  }

  // Check contact visibility setting
  if (plainRecord.contactVisibility === 'public') {
    return serialized;
  }

  if (plainRecord.contactVisibility === 'hidden') {
    return {
      ...serialized,
      contactPhone: undefined,
      contactEmail: undefined,
      contactWhatsApp: undefined,
    };
  }

  // Check if viewer has unlocked this ad
  if (Array.isArray(plainRecord.unlockedByUsers)) {
    const hasUnlocked = plainRecord.unlockedByUsers.some(
      (unlock) => String(unlock.userEmail || '').trim().toLowerCase() === normalizedViewerEmail
    );

    if (hasUnlocked) {
      return serialized;
    }
  }

  // Default: hide contact details (requires subscription)
  return {
    ...serialized,
    contactPhone: undefined,
    contactEmail: undefined,
    contactWhatsApp: undefined,
  };
};

/**
 * Update ad's seller subscription tier when user subscription changes
 * @param {string} userEmail - User email
 * @param {string} newTier - New subscription tier
 * @returns {Promise<number>} - Number of ads updated
 */
const updateSellerSubscriptionTier = async (userEmail, newTier) => {
  try {
    if (!useMongoClassifieds()) {
      return 0;
    }

    const normalizedEmail = String(userEmail || '').trim().toLowerCase();

    const result = await ClassifiedAd.updateMany(
      { sellerEmail: normalizedEmail },
      {
        sellerSubscriptionTier: newTier,
        sellerSubscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      }
    );

    return result.modifiedCount || 0;
  } catch (error) {
    console.error('Error updating seller subscription tier:', error);
    return 0;
  }
};

module.exports = {
  useMongoClassifieds,
  buildClassifiedPlanLabel,
  serializeClassifiedAd,
  serializeClassifiedAdWithContactFilter,
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
  incrementClassifiedView,
  buildNonExpiredQuery,
  searchClassifieds,
  blockUser,
  unblockUser,
  updateClassifiedFavoriteCount,
  // Subscription functions
  canAccessContact,
  getUserSubscription,
  hasEntitlement,
  canPostFeaturedAd,
  updateSellerSubscriptionTier,
};
