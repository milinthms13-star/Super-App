const mongoose = require('mongoose');

const localServiceBookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
    providerId: { type: String, required: true, trim: true, index: true },
    providerName: { type: String, required: true, trim: true },
    providerCategory: { type: String, trim: true },
    providerPhone: { type: String, trim: true, default: '' },
    providerWhatsapp: { type: String, trim: true, default: '' },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true, index: true },
    customerEmail: { type: String, trim: true, lowercase: true, default: '' },
    eventType: { type: String, required: true, trim: true },
    eventDate: { type: Date, required: true, index: true },
    guests: { type: Number, required: true, min: 1 },
    budget: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, default: '' },
    paymentOption: {
      type: String,
      enum: ['advance', 'full', 'quoteOnly'],
      default: 'advance',
    },
    payment: {
      totalAmount: { type: Number, default: 0 },
      paymentOption: { type: String, default: 'advance' },
      advanceAmount: { type: Number, default: 0 },
      amountDue: { type: Number, default: 0 },
    },
    status: { type: String, default: 'Pending vendor response', index: true },
    paymentStatus: { type: String, default: 'Pending advance payment' },
    refundStatus: { type: String, default: 'Not requested' },
    invoiceNumber: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

localServiceBookingSchema.virtual('id').get(function () {
  return this.bookingCode;
});

module.exports = mongoose.model('LocalServiceBooking', localServiceBookingSchema);
