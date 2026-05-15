const mongoose = require('mongoose');

const PhotoStudioSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'default',
      trim: true,
      lowercase: true,
    },
    freeTools: {
      type: [String],
      default: ['basic-edit', 'crop', 'rotate', 'resize', 'basic-filters'],
    },
    premiumTools: {
      type: [String],
      default: [
        'ai-enhance',
        'face-retouch',
        'background-remove',
        'ar-filters',
        'hd-export',
        'wedding-filters',
        'festival-filters',
      ],
    },
    businessTools: {
      type: [String],
      default: ['product-cleanup', 'branding-templates', 'batch-export', 'brand-kit'],
    },
    payPerExportPrice: {
      type: Number,
      default: 29,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'photo_studio_settings',
  }
);

module.exports =
  mongoose.models.PhotoStudioSetting ||
  mongoose.model('PhotoStudioSetting', PhotoStudioSettingSchema);

