const mongoose = require('mongoose');

const FilterPackSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    premium: { type: Boolean, default: false },
    businessOnly: { type: Boolean, default: false },
    operations: { type: [String], default: [] },
    previewUrl: { type: String, default: '', trim: true },
  },
  {
    timestamps: true,
    collection: 'photo_studio_filter_packs',
  }
);

module.exports = mongoose.models.FilterPack || mongoose.model('FilterPack', FilterPackSchema);
