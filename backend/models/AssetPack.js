const mongoose = require('mongoose');

const AssetPackSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ['filter', 'sticker', 'frame', 'ar-effect', 'template'], required: true },
    tags: { type: [String], default: [] },
    premium: { type: Boolean, default: false },
    businessOnly: { type: Boolean, default: false },
    previewUrl: { type: String, default: '', trim: true },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: String, default: '', trim: true },
  },
  {
    timestamps: true,
    collection: 'photo_studio_asset_packs',
  }
);

module.exports = mongoose.models.AssetPack || mongoose.model('AssetPack', AssetPackSchema);
