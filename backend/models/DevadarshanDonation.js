const mongoose = require('mongoose');

const devadarshanDonationSchema = new mongoose.Schema(
  {
    donationCode: { type: String, required: true, trim: true, unique: true, index: true },
    customerEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    customerName: { type: String, default: '', trim: true },
    templeId: { type: String, required: true, trim: true, index: true },
    templeName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    purpose: { type: String, default: '', trim: true },
    paymentMethod: { type: String, default: 'UPI', trim: true },
    paymentStatus: { type: String, default: 'Paid', trim: true, index: true },
    paymentReference: { type: String, default: '', trim: true },
    transactionRef: { type: String, default: '', trim: true },
    receiptNumber: { type: String, default: '', trim: true },
    receiptGeneratedAt: { type: String, default: '', trim: true },
    createdDate: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DevadarshanDonation', devadarshanDonationSchema);
