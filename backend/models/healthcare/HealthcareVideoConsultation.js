const mongoose = require('mongoose');

const healthcareVideoConsultationSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthcareAppointment', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthcareDoctor', required: true, index: true },
    meetingProvider: {
      type: String,
      enum: ['zoom', 'google_meet', 'microsoft_teams', 'webrtc', 'other'],
      default: 'webrtc',
    },
    meetingId: { type: String, required: true, unique: true, trim: true },
    meetingUrl: { type: String, required: true, trim: true },
    meetingPassword: { type: String, default: '', trim: true },
    hostKey: { type: String, default: '', trim: true },
    participantKey: { type: String, default: '', trim: true },
    scheduledStartTime: { type: Date, required: true },
    scheduledEndTime: { type: Date, required: true },
    actualStartTime: { type: Date, default: null },
    actualEndTime: { type: Date, default: null },
    durationMinutes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['scheduled', 'ready', 'in_progress', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
      index: true,
    },
    recordingUrl: { type: String, default: '', trim: true },
    recordingStorageKey: { type: String, default: '', trim: true },
    recordingEnabled: { type: Boolean, default: false },
    transcriptUrl: { type: String, default: '', trim: true },
    participantJoinedAt: { type: Date, default: null },
    hostJoinedAt: { type: Date, default: null },
    cancellationReason: { type: String, default: '', trim: true },
    technicalIssues: { type: [String], default: [] },
    qualityRating: { type: Number, default: null, min: 1, max: 5 },
    qualityFeedback: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

healthcareVideoConsultationSchema.index({ userId: 1, scheduledStartTime: -1 });
healthcareVideoConsultationSchema.index({ doctorId: 1, scheduledStartTime: -1 });
healthcareVideoConsultationSchema.index({ status: 1, scheduledStartTime: 1 });

module.exports = mongoose.model('HealthcareVideoConsultation', healthcareVideoConsultationSchema);
