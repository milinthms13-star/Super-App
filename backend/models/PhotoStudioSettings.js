const mongoose = require('mongoose');

const PhotoStudioSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default', trim: true, lowercase: true },
    freeTools: { type: [String], default: ['crop', 'rotate', 'resize', 'brightness', 'contrast'] },
    premiumTools: {
      type: [String],
      default: ['ai-enhance', 'background-remove', 'object-remove', 'face-retouch', 'ar-filters', 'watermark-removal'],
    },
    businessTools: { type: [String], default: ['product-editing', 'template-marketplace', 'batch-export'] },
    payPerExportPrice: { type: Number, default: 29, min: 0 },
    watermarkText: { type: String, default: 'NilaHub Photo Studio', trim: true },
    allowFreeWatermarkRemoval: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'photo_studio_settings',
  }
);

module.exports =
  mongoose.models.PhotoStudioSettings ||
  mongoose.model('PhotoStudioSettings', PhotoStudioSettingsSchema);
