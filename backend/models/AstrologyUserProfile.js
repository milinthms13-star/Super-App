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
    savedReadings: [astrologyReadingSchema],
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.AstrologyUserProfile ||
  mongoose.model('AstrologyUserProfile', astrologyUserProfileSchema);
