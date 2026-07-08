const mongoose = require('mongoose');

const amountSummarySchema = new mongoose.Schema({
  baseAmount: { type: Number, required: true },
  travelerCount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  chargeableAmount: { type: Number, required: true },
  payableAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  paymentType: { type: String, enum: ['advance', 'full'], default: 'advance' },
  couponCode: { type: String },
  gstAmount: { type: Number, default: 0 },
  serviceChargeAmount: { type: Number, default: 0 },
}, { _id: false });

const paymentDetailsSchema = new mongoose.Schema({
  paymentType: { type: String, enum: ['advance', 'full'], default: 'advance' },
  payableAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'processing', 'paid', 'failed', 'refunded'], default: 'pending' },
  currency: { type: String, default: 'INR' },
  paymentIntentId: { type: String },
  reference: { type: String },
  paidAt: { type: Date },
}, { _id: false });

const tourismBookingSchema = new mongoose.Schema({
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismPackage',
    required: true,
  },
  packageTitle: {
    type: String,
    required: true,
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismVendor',
    required: true,
  },
  vendorName: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'],
    trim: true,
    lowercase: true,
  },
  customerPhone: {
    type: String,
    required: [true, 'Customer phone is required'],
    trim: true,
  },
  travelerCount: {
    type: Number,
    required: true,
    min: [1, 'At least 1 traveler required'],
    max: [20, 'Maximum 20 travelers allowed'],
  },
  pickupCity: {
    type: String,
    required: true,
    trim: true,
  },
  hotelCategory: {
    type: String,
    required: true,
    enum: ['budget', '3-star', '4-star', 'luxury'],
  },
  travelDate: {
    type: String,
    required: [true, 'Travel date is required'],
  },
  bookingNote: {
    type: String,
    trim: true,
  },
  bookingStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'paid', 'cancelled', 'completed', 'refunded'],
    default: 'pending',
  },
  amountSummary: {
    type: amountSummarySchema,
    required: true,
  },
  paymentDetails: {
    type: paymentDetailsSchema,
    required: true,
  },
  refundRules: {
    type: String,
  },
  cancellationReason: {
    type: String,
  },
  cancelledAt: {
    type: Date,
  },
  refundAmount: {
    type: Number,
    default: 0,
  },
  refundStatus: {
    type: String,
    enum: ['not_applicable', 'pending', 'processing', 'completed', 'rejected'],
    default: 'not_applicable',
  },
  refundedAt: {
    type: Date,
  },
  confirmationNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  invoiceUrl: {
    type: String,
  },
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: String,
    notes: String,
  }],
  adminNote: {
    type: String,
  },
  notificationsSent: {
    bookingConfirmation: { type: Boolean, default: false },
    paymentReceipt: { type: Boolean, default: false },
    statusUpdate: { type: Boolean, default: false },
    reminderBeforeTravel: { type: Boolean, default: false },
  },
}, {
  timestamps: true,
});

// Indexes
tourismBookingSchema.index({ customerEmail: 1 });
tourismBookingSchema.index({ customerPhone: 1 });
tourismBookingSchema.index({ userId: 1 });
tourismBookingSchema.index({ vendorId: 1 });
tourismBookingSchema.index({ packageId: 1 });
tourismBookingSchema.index({ bookingStatus: 1 });
tourismBookingSchema.index({ travelDate: 1 });
tourismBookingSchema.index({ confirmationNumber: 1 });
tourismBookingSchema.index({ createdAt: -1 });

// Generate confirmation number
tourismBookingSchema.pre('save', function(next) {
  if (this.isNew && !this.confirmationNumber) {
    this.confirmationNumber = `TB${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

// Add status to history
tourismBookingSchema.methods.addStatusHistory = function(status, changedBy, notes) {
  this.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy,
    notes,
  });
  this.bookingStatus = status;
  return this.save();
};

// Method to mark payment as completed
tourismBookingSchema.methods.markPaymentCompleted = function(paidAmount, reference) {
  this.paymentDetails.status = 'paid';
  this.paymentDetails.paidAmount = paidAmount;
  this.paymentDetails.reference = reference;
  this.paymentDetails.paidAt = new Date();
  this.amountSummary.paidAmount = paidAmount;
  this.bookingStatus = 'paid';
  return this.save();
};

// Method to initiate refund
tourismBookingSchema.methods.initiateRefund = function(amount, reason) {
  this.refundAmount = amount;
  this.refundStatus = 'pending';
  this.cancellationReason = reason;
  this.cancelledAt = new Date();
  this.bookingStatus = 'cancelled';
  return this.save();
};

const TourismBooking = mongoose.model('TourismBooking', tourismBookingSchema);

module.exports = TourismBooking;
