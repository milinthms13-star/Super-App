const mongoose = require('mongoose');

const astrologyConsultationBookingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true, trim: true },
    consultantId: { type: String, required: true, trim: true },
    consultantName: { type: String, required: true, trim: true },
    slot: { type: String, required: true, trim: true },
    preferredDate: { type: Date, required: true },
    notes: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['confirmed', 'pending', 'pending_payment', 'completed', 'cancelled'],
      default: 'confirmed',
    },
    confirmationCode: { type: String, required: true, trim: true, unique: true, index: true },
    amountInr: { type: Number, min: 0, required: true },
    currency: { type: String, default: 'INR', trim: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    paymentOrderId: { type: String, trim: true, default: '' },
    paymentId: { type: String, trim: true, default: '' },
    paymentSignature: { type: String, trim: true, default: '' },
    paymentDate: { type: Date },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.AstrologyConsultationBooking ||
  mongoose.model('AstrologyConsultationBooking', astrologyConsultationBookingSchema);
