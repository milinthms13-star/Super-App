const mongoose = require('mongoose');

const PhotoTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    language: { type: String, default: 'en', trim: true, lowercase: true },
    premium: { type: Boolean, default: false },
    businessOnly: { type: Boolean, default: false },
    approved: { type: Boolean, default: true },
    previewUrl: { type: String, default: '', trim: true },
    templateConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: String, default: '', trim: true },
  },
  {
    timestamps: true,
    collection: 'photo_studio_templates',
  }
);

module.exports = mongoose.models.PhotoTemplate || mongoose.model('PhotoTemplate', PhotoTemplateSchema);
