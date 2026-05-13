const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    amount: { type: Number, min: 0, required: true },
    status: { type: String, enum: ['pending', 'released', 'refunded'], default: 'pending' },
    releasedAt: { type: Date, default: null },
  },
  { _id: false }
);

const freelancerBookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'FreelancerProvider', required: true, index: true },
    providerName: { type: String, required: true, trim: true },
    customer: {
      name: { type: String, trim: true, required: true },
      phone: { type: String, trim: true, required: true, index: true },
      maskedPhone: { type: String, trim: true, default: '' },
    },
    serviceMode: { type: String, enum: ['gig', 'hourly'], default: 'gig' },
    bookingMode: { type: String, enum: ['instant', 'schedule', 'quotation', 'bidding'], default: 'instant' },
    schedule: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    emergency: { type: Boolean, default: false },
    status: {
      type: String,
      enum: [
        'requested',
        'provider_assigned',
        'awaiting_payment',
        'payment_in_escrow',
        'otp_pending',
        'work_in_progress',
        'completed',
        'cancelled',
        'disputed',
      ],
      default: 'requested',
      index: true,
    },
    providerAssignment: {
      assigned: { type: Boolean, default: false },
      assignedAt: { type: Date, default: null },
      assignedBy: { type: String, trim: true, default: '' },
    },
    payment: {
      totalAmount: { type: Number, min: 0, default: 0 },
      escrowAmount: { type: Number, min: 0, default: 0 },
      status: { type: String, enum: ['pending', 'initialized', 'in_escrow', 'partial_released', 'released', 'refund_requested', 'refunded'], default: 'pending' },
      milestones: [milestoneSchema],
      lastTransactionRef: { type: String, trim: true, default: '' },
    },
    otpVerification: {
      otpCode: { type: String, trim: true, default: '' },
      generatedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      verifiedAt: { type: Date, default: null },
      verified: { type: Boolean, default: false },
    },
    cancellation: {
      requested: { type: Boolean, default: false },
      requestedBy: { type: String, enum: ['customer', 'provider', 'admin', 'none'], default: 'none' },
      reason: { type: String, trim: true, default: '' },
      policyApplied: { type: String, trim: true, default: '' },
      requestedAt: { type: Date, default: null },
    },
    statusTimeline: [
      {
        status: { type: String, trim: true, required: true },
        note: { type: String, trim: true, default: '' },
        changedBy: { type: String, trim: true, default: 'system' },
        changedAt: { type: Date, default: () => new Date() },
      },
    ],
  },
  { timestamps: true }
);

freelancerBookingSchema.index({ providerId: 1, status: 1 });
freelancerBookingSchema.index({ 'customer.phone': 1, status: 1 });

module.exports = mongoose.model('FreelancerBooking', freelancerBookingSchema);
