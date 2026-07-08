const mongoose = require('mongoose');

const beautySelfieSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    photoUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2000,
    },
    photoStorageKey: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    photoStorageProvider: {
      type: String,
      trim: true,
      default: '',
      maxlength: 32,
    },
    photoName: {
      type: String,
      trim: true,
      default: '',
      maxlength: 180,
    },
    status: {
      type: String,
      enum: ['active', 'deleted'],
      default: 'active',
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

beautySelfieSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.BeautySelfie || mongoose.model('BeautySelfie', beautySelfieSchema);
