const mongoose = require('mongoose');

const mediaMetadataSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Message',
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    mediaType: {
      type: String,
      enum: ['images', 'videos', 'documents'],
      required: true,
      index: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    fileHash: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    storagePath: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
    metadata: {
      dimensions: {
        width: Number,
        height: Number,
      },
      duration: Number,
      thumbnail: String,
      pageCount: Number,
      preview: String,
    },
  },
  {
    timestamps: true,
  }
);

mediaMetadataSchema.index({ messageId: 1, createdAt: -1 });
mediaMetadataSchema.index({ fileHash: 1, mediaType: 1 });

module.exports = mongoose.model('MediaMetadata', mediaMetadataSchema);
