const mongoose = require('mongoose');

const educationTuitionRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    classLevel: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    contactPhone: {
      type: String,
      default: "",
      trim: true,
    },
    preferredMode: {
      type: String,
      default: "online",
      trim: true,
    },
    preferredTime: {
      type: String,
      default: "",
      trim: true,
    },
    details: {
      type: String,
      default: '',
      trim: true,
    },
    priority: {
      type: String,
      default: "normal",
      trim: true,
      index: true,
    },
    status: {
      type: String,
      default: 'submitted',
      trim: true,
      index: true,
      enum: [
        'submitted',
        'matched',
        'trial_scheduled',
        'trial_completed',
        'booked',
        'in_progress',
        'completed',
        'cancelled',
      ],
    },
    assignedTutor: {
      tutorId: { type: String, trim: true, default: '' },
      name: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      mode: { type: String, trim: true, default: '' },
      hourlyFee: { type: Number, default: 0, min: 0 },
      rating: { type: Number, default: 0, min: 0, max: 5 },
    },
    timeline: {
      type: [
        {
          at: { type: Date, default: () => new Date() },
          status: { type: String, trim: true, default: 'submitted' },
          note: { type: String, trim: true, default: '' },
          actor: { type: String, trim: true, default: 'system' },
        },
      ],
      default: [],
    },
    trialSessionAt: {
      type: Date,
      default: null,
    },
    bookedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    sessions: {
      type: [
        {
          sessionId: { type: String, trim: true, required: true },
          scheduledAt: { type: Date, required: true },
          durationMinutes: { type: Number, min: 15, max: 240, default: 60 },
          agenda: { type: String, trim: true, default: "" },
          attendanceStatus: {
            type: String,
            trim: true,
            default: "pending",
            enum: ["pending", "attended", "missed", "rescheduled"],
          },
          homework: { type: String, trim: true, default: "" },
          mentorNotes: { type: String, trim: true, default: "" },
          updatedAt: { type: Date, default: () => new Date() },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

educationTuitionRequestSchema.index({ userEmail: 1, createdAt: -1 });
educationTuitionRequestSchema.index({ status: 1, priority: 1, createdAt: -1 });

module.exports = mongoose.model('EducationTuitionRequest', educationTuitionRequestSchema);
