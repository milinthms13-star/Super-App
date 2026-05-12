const mongoose = require('mongoose');

const ZODIAC_SIGNS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];

const astrologyReadingSchema = new mongoose.Schema(
  {
    sign: {
      type: String,
      enum: ZODIAC_SIGNS,
      required: true,
      lowercase: true,
      trim: true,
    },
    horoscope: { type: String, required: true, trim: true },
    readingDate: { type: Date, default: Date.now },
  },
  { _id: false }
);

const familyProfileSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true, required: true },
    name: { type: String, trim: true, required: true },
    relation: { type: String, trim: true, default: 'Relative' },
    sign: {
      type: String,
      enum: ZODIAC_SIGNS,
      required: true,
      lowercase: true,
      trim: true,
    },
    birthDate: { type: Date },
    birthTime: { type: String, trim: true },
    birthPlace: { type: String, trim: true },
    nakshatra: { type: String, trim: true },
    rashi: { type: String, trim: true },
    lagna: { type: String, trim: true },
  },
  { _id: false }
);

const astrologyUserProfileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    sign: {
      type: String,
      enum: ZODIAC_SIGNS,
      required: true,
      lowercase: true,
      trim: true,
    },
    birthDate: { type: Date },
    birthTime: { type: String, trim: true },
    birthPlace: { type: String, trim: true },
    preferences: {
      receiveDailyHoroscope: { type: Boolean, default: true },
      favoriteTopics: [{ type: String, trim: true }],
    },
    notifications: {
      dailyHoroscope: { type: Boolean, default: true },
      goodMuhurtam: { type: Boolean, default: true },
      festivalReminders: { type: Boolean, default: true },
      dashaAlerts: { type: Boolean, default: true },
    },
    familyProfiles: [familyProfileSchema],
    savedReadings: [astrologyReadingSchema],
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.AstrologyUserProfile ||
  mongoose.model('AstrologyUserProfile', astrologyUserProfileSchema);
