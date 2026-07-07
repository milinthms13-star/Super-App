const mongoose = require('mongoose');

const prescriptionMedicationSchema = new mongoose.Schema(
  {
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthcareMedicine' },
    medicineName: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    instructions: { type: String, default: '', trim: true },
    timing: { type: String, default: 'After food', trim: true },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const healthcarePrescriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthcareDoctor', required: true, index: true },
    doctorName: { type: String, required: true, trim: true },
    doctorLicenseNumber: { type: String, default: '', trim: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthcareAppointment', index: true },
    patientName: { type: String, required: true, trim: true },
    patientAge: { type: Number, default: null },
    patientGender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    diagnosis: { type: String, required: true, trim: true },
    medications: { type: [prescriptionMedicationSchema], default: [] },
    labTests: { type: [String], default: [] },
    followUpDate: { type: Date, default: null },
    specialInstructions: { type: String, default: '', trim: true },
    prescriptionNumber: { type: String, required: true, unique: true, trim: true, index: true },
    validUntil: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    issuedAt: { type: Date, default: Date.now },
    interactionWarnings: { type: [String], default: [] },
    allergyWarnings: { type: [String], default: [] },
    digitalSignature: { type: String, default: '', trim: true },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'expired', 'revoked'],
      default: 'pending',
      index: true,
    },
    revokedReason: { type: String, default: '', trim: true },
    revokedAt: { type: Date, default: null },
    refillsAllowed: { type: Number, default: 0, min: 0 },
    refillsUsed: { type: Number, default: 0, min: 0 },
    pharmacyOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HealthcarePharmacyOrder' }],
  },
  { timestamps: true }
);

healthcarePrescriptionSchema.index({ userId: 1, issuedAt: -1 });
healthcarePrescriptionSchema.index({ doctorId: 1, issuedAt: -1 });
healthcarePrescriptionSchema.index({ prescriptionNumber: 1, verificationStatus: 1 });

module.exports = mongoose.model('HealthcarePrescription', healthcarePrescriptionSchema);
