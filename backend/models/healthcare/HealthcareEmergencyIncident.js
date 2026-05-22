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
    incidentType: { type: String, enum: ['medical', 'sos', 'police', 'safe_check_in', 'other'], default: 'sos', index: true },
    message: { type: String, default: '', trim: true },
    status: { type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open', index: true },
    escalationLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical', 'resolved'],
      default: 'high',
      index: true,
    },
    location: { type: emergencyLocationSchema, default: () => ({}) },
    timeline: {
      type: [
        {
          step: { type: String, trim: true },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    actions: {
      call108: { type: Boolean, default: false },
      call112: { type: Boolean, default: false },
      locationShared: { type: Boolean, default: false },
      familyNotified: { type: Boolean, default: false },
      hospitalsViewed: { type: Boolean, default: false },
    },
    contactsNotified: { type: [String], default: [] },
    acknowledgedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    ackDueAt: { type: Date, default: null, index: true },
    escalatedAt: { type: Date, default: null },
    lastEscalationReason: { type: String, default: '', trim: true },
    responderNotes: { type: [String], default: [] },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

healthcareEmergencyIncidentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('HealthcareEmergencyIncident', healthcareEmergencyIncidentSchema);
