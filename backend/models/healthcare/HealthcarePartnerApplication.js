const mongoose = require('mongoose');

const partnerDocumentSchema = new mongoose.Schema(
  {
    fileName: { type: String, default: '', trim: true },
    fileType: { type: String, default: '', trim: true },
    fileUrl: { type: String, default: '', trim: true },
    storageKey: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const healthcarePartnerApplicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    entityType: { type: String, enum: ['doctor', 'lab', 'pharmacy'], required: true, index: true },
    vendorName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    address: { type: String, default: '', trim: true },
    licenseNumber: { type: String, default: '', trim: true },
    specialtyOrService: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    documents: { type: [partnerDocumentSchema], default: [] },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revision_requested'],
      default: 'pending',
      index: true,
    },
    reviewNotes: { type: String, default: '', trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

healthcarePartnerApplicationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('HealthcarePartnerApplication', healthcarePartnerApplicationSchema);
