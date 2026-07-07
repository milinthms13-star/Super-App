const mongoose = require('mongoose');

const claimDocumentSchema = new mongoose.Schema(
  {
    documentType: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    storageKey: { type: String, default: '', trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const healthcareInsuranceClaimSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    claimNumber: { type: String, required: true, unique: true, trim: true, index: true },
    insuranceProvider: { type: String, required: true, trim: true },
    policyNumber: { type: String, required: true, trim: true, index: true },
    policyHolderName: { type: String, required: true, trim: true },
    patientName: { type: String, required: true, trim: true },
    patientRelation: { type: String, default: 'Self', trim: true },
    claimType: {
      type: String,
      enum: ['hospitalization', 'consultation', 'lab_test', 'pharmacy', 'surgery', 'other'],
      required: true,
      index: true,
    },
    claimAmount: { type: Number, required: true, min: 0 },
    approvedAmount: { type: Number, default: 0, min: 0 },
    treatmentDate: { type: Date, required: true },
    hospitalName: { type: String, default: '', trim: true },
    doctorName: { type: String, default: '', trim: true },
    diagnosis: { type: String, required: true, trim: true },
    documents: { type: [claimDocumentSchema], default: [] },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'settled', 'appealed'],
      default: 'draft',
      index: true,
    },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    settledAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '', trim: true },
    reviewerNotes: { type: String, default: '', trim: true },
    settlementReference: { type: String, default: '', trim: true },
    settlementMethod: { type: String, default: '', trim: true },
    appealReason: { type: String, default: '', trim: true },
    appealedAt: { type: Date, default: null },
    linkedAppointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthcareAppointment' },
    linkedPharmacyOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthcarePharmacyOrder' },
    linkedRecordIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HealthcareRecord' }],
  },
  { timestamps: true }
);

healthcareInsuranceClaimSchema.index({ userId: 1, submittedAt: -1 });
healthcareInsuranceClaimSchema.index({ insuranceProvider: 1, status: 1 });

module.exports = mongoose.model('HealthcareInsuranceClaim', healthcareInsuranceClaimSchema);
