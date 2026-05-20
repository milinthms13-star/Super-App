const mongoose = require('mongoose');

const hotelBookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'HotelProperty', required: false, index: true },
    hotelName: { type: String, required: true, trim: true },
    location: { type: String, default: '', trim: true, index: true },
    roomType: { type: String, default: 'Standard', trim: true },
    guestName: { type: String, required: true, trim: true },
    guestEmail: { type: String, default: '', trim: true, lowercase: true },
    guestPhone: { type: String, required: true, trim: true },
    checkInDate: { type: Date, required: true, index: true },
    checkOutDate: { type: Date, required: true, index: true },
    numberOfNights: { type: Number, required: true, min: 1 },
    numberOfGuests: { type: Number, default: 1, min: 1 },
    numberOfRooms: { type: Number, default: 1, min: 1 },
    pricePerNight: { type: Number, default: 0, min: 0 },
    totalPrice: { type: Number, default: 0, min: 0 },
    gst: { type: Number, default: 0, min: 0 },
    finalTotal: { type: Number, default: 0, min: 0 },
    specialRequests: { type: String, default: '', trim: true },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
      index: true,
    },
    bookingStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Checked In', 'Completed', 'Cancelled', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    status: { type: String, default: 'pending', trim: true, index: true },
    cancellationReason: { type: String, default: '', trim: true },
    partnerNote: { type: String, default: '', trim: true },
    adminNote: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.HotelBooking || mongoose.model('HotelBooking', hotelBookingSchema);
