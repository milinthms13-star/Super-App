/**
 * Horoscope Schema - Matrimonial Astrology Profile
 * Stores astrological data for compatibility matching
 */

const mongoose = require('mongoose');

const HoroscopeSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true,
      unique: true,
      index: true,
    },

    // Birth Information
    rashi: {
      type: String,
      enum: [
        'Aries',
        'Taurus',
        'Gemini',
        'Cancer',
        'Leo',
        'Virgo',
        'Libra',
        'Scorpio',
        'Sagittarius',
        'Capricorn',
        'Aquarius',
        'Pisces',
      ],
      required: true,
      index: true,
    },

    nakshatra: {
      type: String,
      enum: [
        'Ashwini',
        'Bharani',
        'Krittika',
        'Rohini',
        'Mrigashirsha',
        'Ardra',
        'Punarvasu',
        'Pushya',
        'Ashlesha',
        'Magha',
        'Purva Phalguni',
        'Uttara Phalguni',
        'Hasta',
        'Chitra',
        'Swati',
        'Vishakha',
        'Anuradha',
        'Jyeshtha',
        'Mula',
        'Purva Ashadha',
        'Uttara Ashadha',
        'Shravana',
        'Dhanishtha',
        'Shatabhisha',
        'Purva Bhadrapada',
        'Uttara Bhadrapada',
        'Revati',
      ],
      required: true,
      index: true,
    },

    star: {
      type: String,
      required: true,
    },

    // Birth Details
    dateOfBirth: {
      type: Date,
      required: true,
    },

    timeOfBirth: {
      hour: { type: Number, min: 0, max: 23 },
      minute: { type: Number, min: 0, max: 59 },
      second: { type: Number, min: 0, max: 59 },
    },

    placeOfBirth: {
      city: String,
      state: String,
      country: String,
      timezone: String,
      latitude: Number,
      longitude: Number,
    },

    // Advanced Astrological Data
    ascendant: String, // Lagna
    moonSign: String, // Chandra Rashi
    sunSign: String,

    planets: {
      sun: { sign: String, degree: Number, house: Number },
      moon: { sign: String, degree: Number, house: Number },
      mars: { sign: String, degree: Number, house: Number },
      mercury: { sign: String, degree: Number, house: Number },
      jupiter: { sign: String, degree: Number, house: Number },
      venus: { sign: String, degree: Number, house: Number },
      saturn: { sign: String, degree: Number, house: Number },
      rahu: { sign: String, degree: Number, house: Number },
      ketu: { sign: String, degree: Number, house: Number },
    },

    // Doshas (astrological afflictions)
    doshas: {
      mangalDosh: { present: Boolean, severity: String }, // critical/high/medium/low
      kalasarpaDosh: { present: Boolean, severity: String },
      papasamyaDosh: { present: Boolean, severity: String },
      pitruDosh: { present: Boolean, severity: String },
    },

    // Horoscope Document/Analysis
    horoscopeDocument: {
      uploadedAt: Date,
      url: String, // S3 URL to horoscope PDF/image
      fileName: String,
      fileSize: Number,
      contentType: String,
    },

    // Professional Analysis (optional, from astrologer)
    analysis: {
      summary: String,
      strengths: [String],
      challenges: [String],
      recommendations: String,
      analyzedBy: String, // Astrologer name
      analyzedAt: Date,
    },

    // Matching Preferences
    acceptableRashis: [String], // Preferred compatible rashis
    acceptableNakshatras: [String],
    donutAcceptDoshas: [String], // Doshas they won't accept in partner

    // Verification
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: String, // Admin who verified

    // Usage flags
    useForMatching: { type: Boolean, default: true },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'horoscopes',
  }
);

// Index for faster matching queries
HoroscopeSchema.index({ rashi: 1, nakshatra: 1 });
HoroscopeSchema.index({ isVerified: 1, useForMatching: 1 });

module.exports = mongoose.model('Horoscope', HoroscopeSchema);
