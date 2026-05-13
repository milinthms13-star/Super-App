const mongoose = require('mongoose');

const poojaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    prasadamSupported: { type: Boolean, default: true },
  },
  { _id: false }
);

const devadarshanTempleSchema = new mongoose.Schema(
  {
    templeId: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true, index: true },
    deity: { type: String, required: true, trim: true, index: true },
    templeType: { type: String, default: 'Temple', trim: true },
    timings: { type: String, default: '', trim: true },
    contact: { type: String, default: '', trim: true },
    officialContact: { type: String, default: '', trim: true },
    festivals: [{ type: String, trim: true }],
    photos: [{ type: String, trim: true }],
    mapUrl: { type: String, default: '', trim: true },
    rules: { type: String, default: '', trim: true },
    dressCode: { type: String, default: '', trim: true },
    distanceKm: { type: Number, default: 0, min: 0 },
    popularity: { type: Number, default: 1, min: 1, max: 5 },
    verified: { type: Boolean, default: false, index: true },
    liveDarshanUrl: { type: String, default: '', trim: true },
    poojas: { type: [poojaSchema], default: [] },
    createdByEmail: { type: String, default: '', trim: true, lowercase: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DevadarshanTemple', devadarshanTempleSchema);

