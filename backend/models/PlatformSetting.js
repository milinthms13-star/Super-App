const mongoose = require('mongoose');

const PlatformSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global',
      trim: true,
      lowercase: true,
    },
    enabledModules: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'platform_settings',
  }
);

module.exports =
  mongoose.models.PlatformSetting ||
  mongoose.model('PlatformSetting', PlatformSettingSchema);
