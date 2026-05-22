const mongoose = require('mongoose');

const healthcareRecordSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    familyProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthcareFamilyProfile', index: true },
    familyMember: { type: String, default: 'Self', trim: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    doctorName: { type: String, default: '', trim: true },
    recordDate: { type: String, required: true, trim: true, index: true },
    notes: { type: String, default: '', trim: true },
    fileName: { type: String, required: true, trim: true },
    fileType: { type: String, default: 'application/octet-stream', trim: true },
    fileSize: { type: Number, default: 0, min: 0 },
    storageKey: { type: String, default: '', trim: true },
    fileUrl: { type: String, default: '', trim: true },
    visibility: {
      type: String,
      enum: ['private', 'family', 'care-team'],
      default: 'private',
      index: true,
    },
    consentAccepted: { type: Boolean, default: false },
    consentGrantedAt: { type: Date, default: null },
    consentExpiryDate: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null, index: true },
    deletionReason: { type: String, default: '', trim: true },
    purgeAfter: { type: Date, default: null, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

healthcareRecordSchema.index({ userId: 1, recordDate: -1 });

module.exports = mongoose.model('HealthcareRecord', healthcareRecordSchema);
