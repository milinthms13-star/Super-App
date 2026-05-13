const mongoose = require('mongoose');

const healthcareAppointmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: String, default: '', trim: true, index: true },
    doctorName: { type: String, required: true, trim: true },
    specialty: { type: String, default: '', trim: true },
    category: { type: String, enum: ['doctor', 'lab', 'scan', 'package', 'other'], default: 'doctor', index: true },
    appointmentDate: { type: String, required: true, trim: true },
    appointmentTime: { type: String, required: true, trim: true },
    mode: { type: String, default: 'clinic', trim: true },
    reason: { type: String, default: '', trim: true },
    patientName: { type: String, required: true, trim: true },
    patientPhone: { type: String, default: '', trim: true },
    familyMember: { type: String, default: 'Self', trim: true },
    collectionAddress: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['booked', 'confirmed', 'rescheduled', 'cancelled', 'completed'],
      default: 'booked',
      index: true,
    },
    cancellationReason: { type: String, default: '', trim: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    amountDue: { type: Number, default: 0, min: 0 },
    paymentReference: { type: String, default: '', trim: true },
    paymentProvider: { type: String, default: '', trim: true },
    paymentCompletedAt: { type: Date },
  },
  { timestamps: true }
);

healthcareAppointmentSchema.index({ userId: 1, appointmentDate: 1, appointmentTime: 1 });

module.exports = mongoose.model('HealthcareAppointment', healthcareAppointmentSchema);
