const mongoose = require('mongoose');

const healthcareRefillReminderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    familyMember: { type: String, default: 'Self', trim: true },
    medicineName: { type: String, required: true, trim: true },
    dosage: { type: String, default: '', trim: true },
    frequency: { type: String, default: '', trim: true },
    nextRefillDate: { type: String, required: true, trim: true, index: true },
    reminderDaysBefore: { type: Number, default: 5, min: 1, max: 30 },
    active: { type: Boolean, default: true, index: true },
    lastNotifiedAt: { type: Date },
    channels: { type: [String], default: ['in_app'] },
  },
  { timestamps: true }
);

healthcareRefillReminderSchema.index({ userId: 1, active: 1, nextRefillDate: 1 });

module.exports = mongoose.model('HealthcareRefillReminder', healthcareRefillReminderSchema);
