const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: false });

const connectDB = require('../config/db');
const ClassifiedAd = require('../models/ClassifiedAd');

const normalizeCondition = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return 'Used';
  const lower = raw.toLowerCase();
  if (['new', 'brand new', 'brand-new', 'n'].includes(lower)) return 'New';
  if (['refurbished', 'refurb', 'refurbish'].includes(lower)) return 'Refurbished';
  if (['used', 'second hand', 'second-hand', 'preowned', 'pre-owned'].includes(lower)) return 'Used';
  if (['like new', 'likenew'].includes(lower)) return 'Like New';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const buildSearchableText = (record = {}) => {
  const parts = [
    record.title,
    record.description,
    record.category,
    record.subcategory,
    record.location,
    record.locality,
    record.seller,
    ...(Array.isArray(record.tags) ? record.tags : []),
  ].filter(Boolean);
  return parts.join(' ').toLowerCase();
};

const run = async () => {
  const connected = await connectDB();
  if (!connected) {
    console.warn('MongoDB was not connected. Exiting.');
    process.exit(1);
  }

  const cursor = ClassifiedAd.find().cursor();
  let updatedCount = 0;

  for await (const ad of cursor) {
    const normalizedCondition = normalizeCondition(ad.condition);
    const searchableText = buildSearchableText(ad);
    if (ad.searchableText !== searchableText || ad.condition !== normalizedCondition) {
      await ClassifiedAd.updateOne(
        { _id: ad._id },
        { $set: { searchableText, condition: normalizedCondition } }
      );
      updatedCount += 1;
    }
  }

  console.log(`✓ Backfilled searchableText and normalized condition for ${updatedCount} classified ads`);
  process.exit(0);
};

run().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
