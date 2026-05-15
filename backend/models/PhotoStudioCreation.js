const mongoose = require('mongoose');

const PhotoStudioCreationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      default: 'Untitled Creation',
      trim: true,
    },
    sourceUrl: {
      type: String,
      default: '',
      trim: true,
    },
    beforeUrl: {
      type: String,
      default: '',
      trim: true,
    },
    afterUrl: {
      type: String,
      default: '',
      trim: true,
    },
    exportFormat: {
      type: String,
      enum: ['jpg', 'png', 'webp'],
      default: 'jpg',
    },
    planTier: {
      type: String,
      enum: ['free', 'premium', 'business'],
      default: 'free',
    },
    editOperations: {
      type: [String],
      default: [],
    },
    filters: {
      type: [String],
      default: [],
    },
    aiTools: {
      type: [String],
      default: [],
    },
    arEffects: {
      type: [String],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'photo_studio_creations',
  }
);

module.exports =
  mongoose.models.PhotoStudioCreation ||
  mongoose.model('PhotoStudioCreation', PhotoStudioCreationSchema);

