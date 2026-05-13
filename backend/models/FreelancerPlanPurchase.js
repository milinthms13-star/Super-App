const mongoose = require('mongoose');

const freelancerPlanPurchaseSchema = new mongoose.Schema(
  {
    purchaseCode: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'FreelancerProvider', required: true, index: true },
    providerName: { type: String, trim: true, default: '' },
    planId: { type: String, trim: true, required: true },
    planName: { type: String, trim: true, required: true },
    amount: { type: Number, required: true, min: 0 },
    durationDays: { type: Number, min: 1, default: 30 },
    status: { type: String, enum: ['pending', 'active', 'expired', 'cancelled'], default: 'pending', index: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    paymentReference: { type: String, trim: true, default: '' },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FreelancerPlanPurchase', freelancerPlanPurchaseSchema);
