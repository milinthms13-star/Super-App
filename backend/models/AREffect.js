const mongoose = require('mongoose');

const AREffectSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    sdk: { type: String, enum: ['banuba', 'deepar', 'mediapipe', 'custom'], default: 'custom' },
    premium: { type: Boolean, default: false },
    businessOnly: { type: Boolean, default: false },
    supportsVideo: { type: Boolean, default: true },
    supportsPhoto: { type: Boolean, default: true },
    previewUrl: { type: String, default: '', trim: true },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'photo_studio_ar_effects',
  }
);

module.exports = mongoose.models.AREffect || mongoose.model('AREffect', AREffectSchema);
