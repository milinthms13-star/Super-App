const mongoose = require('mongoose');

const consultantSlotSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    date: { type: String, default: 'custom', trim: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const astrologyConsultantSchema = new mongoose.Schema(
  {
    consultantId: { type: String, required: true, unique: true, index: true, trim: true },
    name: { type: String, required: true, trim: true },
    specialty: { type: String, required: true, trim: true },
    rate: { type: String, required: true, trim: true },
    amountInr: { type: Number, required: true, min: 0 },
    availability: { type: String, default: '', trim: true },
    availableSlots: { type: [consultantSlotSchema], default: [] },
    email: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    languages: { type: [String], default: [] },
    rating: { type: Number, min: 0, max: 5, default: 4.5 },
    bio: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true, index: true },
    source: { type: String, default: 'seeded', trim: true },
  },
  { timestamps: true }
);

astrologyConsultantSchema.index(
  { consultantId: 1, 'availableSlots.id': 1 },
  { unique: true, sparse: true }
);

module.exports =
  mongoose.models.AstrologyConsultant ||
  mongoose.model('AstrologyConsultant', astrologyConsultantSchema);
