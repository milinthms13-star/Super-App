/**
 * Horoscope Model
 * Stores Kundali data and Guna Milan results
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    birthDetails: {
      dateOfBirth: { type: Date, required: true },
      timeOfBirth: { type: String, required: true }, // HH:mm format
      placeOfBirth: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    kundali: {
      ascendant: String,
      moonSign: String,
      sunSign: String,
      nakshatra: String,
      planets: {
        sun: { sign: String, house: Number, degree: Number },
        moon: { sign: String, house: Number, degree: Number },
        mars: { sign: String, house: Number, degree: Number },
        mercury: { sign: String, house: Number, degree: Number },
        jupiter: { sign: String, house: Number, degree: Number },
        venus: { sign: String, house: Number, degree: Number },
        saturn: { sign: String, house: Number, degree: Number },
        rahu: { sign: String, house: Number, degree: Number },
        ketu: { sign: String, house: Number, degree: Number },
      },
    },
    doshas: [
      {
        name: String,
        severity: { type: String, enum: ['None', 'Low', 'Medium', 'High'] },
        description: String,
        remedies: [String],
      },
    ],
    isPublic: {
      type: Boolean,
      default: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'matrimonial_horoscopes',
  }
);

// Index for querying
HoroscopeSchema.index({ profileId: 1 });
HoroscopeSchema.index({ 'kundali.moonSign': 1 });
HoroscopeSchema.index({ 'kundali.nakshatra': 1 });

module.exports = mongoose.model('Horoscope', HoroscopeSchema);
