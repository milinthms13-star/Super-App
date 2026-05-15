const mongoose = require('mongoose');

const UserExportSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true, trim: true },
    creationId: { type: String, default: '', trim: true },
    exportUrl: { type: String, required: true, trim: true },
    exportFormat: { type: String, enum: ['jpg', 'png', 'webp'], default: 'jpg' },
    quality: { type: String, enum: ['standard', 'hd'], default: 'standard' },
    watermarkApplied: { type: Boolean, default: false },
    creditsCharged: { type: Number, default: 0, min: 0 },
    planTier: { type: String, enum: ['free', 'premium', 'business'], default: 'free' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'photo_studio_user_exports',
  }
);

module.exports = mongoose.models.UserExport || mongoose.model('UserExport', UserExportSchema);
