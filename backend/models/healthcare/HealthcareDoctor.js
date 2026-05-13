const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, trim: true },
    times: { type: [String], default: [] },
  },
  { _id: false }
);

const healthcareDoctorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true, trim: true },
    specialty: { type: String, required: true, trim: true, index: true },
    qualifications: { type: String, default: '', trim: true },
    experienceYears: { type: Number, default: 0, min: 0 },
    consultationFee: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    languages: { type: [String], default: [] },
    clinicAddress: { type: String, default: '', trim: true },
    availableModes: { type: [String], default: ['clinic', 'video'] },
    availableSlots: { type: [slotSchema], default: [] },
    biography: { type: String, default: '', trim: true },
    profilePhotoUrl: { type: String, default: '' },
    isPartnerProvided: { type: Boolean, default: false },
    approvalStatus: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
      index: true,
    },
    reviewNotes: { type: String, default: '', trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

healthcareDoctorSchema.index({ specialty: 1, approvalStatus: 1, isActive: 1 });

module.exports = mongoose.model('HealthcareDoctor', healthcareDoctorSchema);
