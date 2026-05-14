const mongoose = require('mongoose');

const bookingTimelineEntrySchema = new mongoose.Schema(
  {
    status: { type: String, required: true, trim: true },
    at: { type: String, required: true, trim: true },
    by: { type: String, default: 'system', trim: true },
    note: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const devadarshanBookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, required: true, trim: true, unique: true, index: true },
    customerEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    customerName: { type: String, default: '', trim: true },
    templeId: { type: String, required: true, trim: true, index: true },
    templeName: { type: String, required: true, trim: true },
    poojaType: { type: String, required: true, trim: true },
    devoteeName: { type: String, required: true, trim: true },
    familyMember: { type: String, default: '', trim: true },
    nakshatra: { type: String, default: '', trim: true },
    bookingDate: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    prasadamOption: { type: String, default: 'No prasadam', trim: true },
    deliveryMode: { type: String, default: 'Temple Pickup', trim: true },
    deliveryAddress: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    paymentMethod: { type: String, default: 'UPI', trim: true },
    paymentStatus: { type: String, default: 'Pending', trim: true, index: true },
    transactionRef: { type: String, default: '', trim: true },
    receiptNumber: { type: String, default: '', trim: true },
    adminApprovalStatus: { type: String, default: 'Pending Admin Approval', trim: true },
    status: { type: String, default: 'Pending', trim: true, index: true },
    paymentGateway: { type: String, default: '', trim: true },
    paymentRecordId: { type: String, default: '', trim: true },
    paymentDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
    refundStatus: { type: String, default: 'Not Requested', trim: true, index: true },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundReference: { type: String, default: '', trim: true },
    statusTimeline: { type: [bookingTimelineEntrySchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DevadarshanBooking', devadarshanBookingSchema);
