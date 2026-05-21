const mongoose = require('mongoose');

const ACTIVE_SLOT_LOCK_STATUSES = new Set(['pending', 'pending_payment', 'confirmed', 'completed']);

const toStartOfUtcDay = (value) => {
  const source = value ? new Date(value) : new Date();
  if (Number.isNaN(source.getTime())) {
    return new Date();
  }

  return new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate()));
};

const deriveActiveSlotLock = (status = '') =>
  ACTIVE_SLOT_LOCK_STATUSES.has(String(status || '').toLowerCase());

const astrologyConsultationBookingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true, trim: true },
    consultantId: { type: String, required: true, trim: true },
    consultantName: { type: String, required: true, trim: true },
    slotId: { type: String, trim: true, default: '' },
    slot: { type: String, required: true, trim: true },
    preferredDate: { type: Date, required: true },
    preferredDateDay: { type: Date, required: true, index: true },
    activeSlotLock: { type: Boolean, default: true, index: true },
    bookingIdempotencyKey: { type: String, trim: true, default: '' },
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

astrologyConsultationBookingSchema.pre('validate', function assignSlotLockState(next) {
  this.preferredDateDay = toStartOfUtcDay(this.preferredDate || Date.now());
  this.activeSlotLock = deriveActiveSlotLock(this.status);
  next();
});

astrologyConsultationBookingSchema.index(
  { consultantId: 1, slot: 1, preferredDateDay: 1, activeSlotLock: 1 },
  { unique: true, partialFilterExpression: { activeSlotLock: true } }
);
astrologyConsultationBookingSchema.index(
  { bookingIdempotencyKey: 1 },
  { unique: true, sparse: true, partialFilterExpression: { bookingIdempotencyKey: { $gt: '' } } }
);
astrologyConsultationBookingSchema.index(
  { paymentOrderId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { paymentOrderId: { $gt: '' } } }
);
astrologyConsultationBookingSchema.index(
  { paymentId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { paymentId: { $gt: '' } } }
);

module.exports =
  mongoose.models.AstrologyConsultationBooking ||
  mongoose.model('AstrologyConsultationBooking', astrologyConsultationBookingSchema);
