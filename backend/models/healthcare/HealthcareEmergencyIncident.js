const mongoose = require('mongoose');

const emergencyLocationSchema = new mongoose.Schema(
  {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    accuracy: { type: Number, default: null },
    address: { type: String, default: '', trim: true },
    capturedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const healthcareEmergencyIncidentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    familyMember: { type: String, default: 'Self', trim: true },
    incidentType: { type: String, enum: ['medical', 'sos', 'police', 'other'], default: 'sos', index: true },
    message: { type: String, default: '', trim: true },
    status: { type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open', index: true },
    location: { type: emergencyLocationSchema, default: () => ({}) },
    actions: {
      call108: { type: Boolean, default: false },
      call112: { type: Boolean, default: false },
      locationShared: { type: Boolean, default: false },
      familyNotified: { type: Boolean, default: false },
      hospitalsViewed: { type: Boolean, default: false },
    },
    contactsNotified: { type: [String], default: [] },
  },
  { timestamps: true }
);

healthcareEmergencyIncidentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('HealthcareEmergencyIncident', healthcareEmergencyIncidentSchema);
