const mongoose = require('mongoose');

const hotelPartnerPayoutSchema = new mongoose.Schema(
  {
    partnerId: { type: String, required: true, trim: true, index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    bookings: { type: Number, required: true, min: 1 },
    grossAmount: { type: Number, required: true, min: 0 },
    commission: { type: Number, required: true, min: 0 },
    netAmount: { type: Number, required: true, min: 0 },
    bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HotelBooking' }],
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'rejected'],
      default: 'pending',
      index: true,
    },
    notes: { type: String, default: '', trim: true },
    settledAt: { type: Date, default: null },
    settledBy: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.HotelPartnerPayout ||
  mongoose.model('HotelPartnerPayout', hotelPartnerPayoutSchema);
