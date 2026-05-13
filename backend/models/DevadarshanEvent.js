const mongoose = require('mongoose');

const devadarshanEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, trim: true, index: true },
    templeId: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    details: { type: String, default: '', trim: true },
    createdByEmail: { type: String, default: '', trim: true, lowercase: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DevadarshanEvent', devadarshanEventSchema);

