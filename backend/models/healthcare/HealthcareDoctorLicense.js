const mongoose = require('mongoose');

const healthcareDoctorLicenseSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthcareDoctor', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    licenseNumber: { type: String, required: true, unique: true, trim: true, index: true },
    licenseType: {
      type: String,
      enum: ['medical_council', 'state_board', 'specialty_board', 'telemedicine', 'other'],
      required: true,
    },
    issuingAuthority: { type: String, required: true, trim: true },
    issuingCountry: { type: String, default: 'India', trim: true },
    issuingState: { type: String, required: true, trim: true },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true, index: true },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'expired', 'suspended'],
      default: 'pending',
      index: true,
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date, default: null },
    verificationNotes: { type: String, default: '', trim: true },
    documentUrl: { type: String, default: '', trim: true },
    documentStorageKey: { type: String, default: '', trim: true },
    practiceRestrictions: { type: [String], default: [] },
    telemedicineEnabled: { type: Boolean, default: false },
    allowedStates: { type: [String], default: [] },
    suspensionReason: { type: String, default: '', trim: true },
    suspendedAt: { type: Date, default: null },
    renewalReminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

healthcareDoctorLicenseSchema.index({ doctorId: 1, verificationStatus: 1 });
healthcareDoctorLicenseSchema.index({ expiryDate: 1, verificationStatus: 1 });

module.exports = mongoose.model('HealthcareDoctorLicense', healthcareDoctorLicenseSchema);
