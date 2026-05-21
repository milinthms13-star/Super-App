const mongoose = require('mongoose');

const PhotoStudioEventSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true, trim: true },
    eventName: { type: String, required: true, index: true, trim: true, lowercase: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    device: {
      userAgent: { type: String, default: '' },
      ip: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
    collection: 'photo_studio_events',
  }
);

PhotoStudioEventSchema.index({ userId: 1, eventName: 1, createdAt: -1 });

module.exports = mongoose.models.PhotoStudioEvent || mongoose.model('PhotoStudioEvent', PhotoStudioEventSchema);
