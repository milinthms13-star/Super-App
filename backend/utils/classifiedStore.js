const mongoose = require('mongoose');
const ClassifiedAd = require('../models/ClassifiedAd');
const devAppDataStore = require('./devAppDataStore');

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
    price: Number(plainRecord.price || 0),
    category: String(plainRecord.category || 'General').trim(),
    seller: String(plainRecord.seller || 'Trusted Seller').trim(),
    sellerRole: String(plainRecord.sellerRole || 'Seller').trim(),
    sellerEmail: String(plainRecord.sellerEmail || '').trim().toLowerCase(),
    location: String(plainRecord.location || 'Kerala').trim(),
    locality: String(plainRecord.locality || plainRecord.location || 'Prime area').trim(),
    image: String(plainRecord.image || 'Listing').trim(),
    posted: String(
      plainRecord.posted ||
        (plainRecord.createdAt ? new Date(plainRecord.createdAt).toISOString().slice(0, 10) : '')
    ).trim(),
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
    mediaGallery:
      Array.isArray(plainRecord.mediaGallery) && plainRecord.mediaGallery.length > 0
        ? plainRecord.mediaGallery
        : ['Primary image'],
    monetizationPlan: String(
      plainRecord.monetizationPlan || buildClassifiedPlanLabel(plainRecord.plan || 'free')
    ).trim(),
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

const listClassifiedModuleDataFromMongo = async () => {
  const records = await ClassifiedAd.find().sort({ createdAt: -1 });
  const listings = records.map(serializeClassifiedAd);
  return {
    classifiedsListings: listings,
    classifiedsMessages: flattenClassifiedMessages(records.map((record, index) => ({
      ...serializeClassifiedAd(record, index),
      messages: record.messages || [],
    }))),
    classifiedsReports: flattenClassifiedReports(records.map((record, index) => ({
      ...serializeClassifiedAd(record, index),
      reports: record.reports || [],
    }))),
  };
};

const listClassifiedModuleData = async () => {
  if (useMongoClassifieds()) {
    return listClassifiedModuleDataFromMongo();
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

  const created = await ClassifiedAd.create(payload);
  return serializeClassifiedAd(created);
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

module.exports = {
  useMongoClassifieds,
  buildClassifiedPlanLabel,
  serializeClassifiedAd,
  listClassifiedModuleData,
  createClassifiedAd,
  addClassifiedMessage,
  addClassifiedReport,
  moderateClassifiedAd,
  deleteClassifiedAd,
  findClassifiedAdById,
};
