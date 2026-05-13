const mongoose = require('mongoose');

const healthcareFamilyProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    relation: { type: String, default: 'Family', trim: true },
    gender: { type: String, default: '', trim: true },
    dateOfBirth: { type: String, default: '', trim: true },
    bloodGroup: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    allergies: { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
    notes: { type: String, default: '', trim: true },
    isEmergencyContact: { type: Boolean, default: false },
    emergencyPhone: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

healthcareFamilyProfileSchema.index({ userId: 1, relation: 1, isActive: 1 });

module.exports = mongoose.model('HealthcareFamilyProfile', healthcareFamilyProfileSchema);
