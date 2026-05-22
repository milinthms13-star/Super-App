const mongoose = require('mongoose');

const pharmacyOrderItemSchema = new mongoose.Schema(
  {
    medicineId: { type: String, default: '', trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: '', trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    requiresPrescription: { type: Boolean, default: false },
  },
  { _id: false }
);

const healthcarePharmacyOrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [pharmacyOrderItemSchema], default: [] },
    totalAmount: { type: Number, default: 0, min: 0 },
    deliveryAddress: { type: String, required: true, trim: true },
    pharmacyId: { type: String, default: '', trim: true },
    pharmacyName: { type: String, default: '', trim: true },
    pharmacyArea: { type: String, default: '', trim: true },
    pharmacyVendorId: { type: String, default: '', trim: true },
    phone: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    notes: { type: String, default: '', trim: true },
    prescriptionRequired: { type: Boolean, default: false },
    prescriptionVerified: { type: Boolean, default: false },
    prescriptionReviewStatus: {
      type: String,
      enum: ['not_required', 'pending', 'approved', 'rejected'],
      default: 'not_required',
      index: true,
    },
    prescriptionReviewNotes: { type: String, default: '', trim: true },
    prescriptionReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    prescriptionReviewedAt: { type: Date, default: null },
    prescriptionFileUrl: { type: String, default: '', trim: true },
    prescriptionStorageKey: { type: String, default: '', trim: true },
    interactionAlerts: { type: [String], default: [] },
    safetyFlags: { type: [String], default: [] },
    safetyRuleSource: { type: String, default: 'internal_rules_v1', trim: true },
    requiresPharmacistCall: { type: Boolean, default: false },
    paymentMethod: { type: String, default: 'upi', trim: true },
    paymentProvider: { type: String, default: 'simulated', trim: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentReference: { type: String, default: '', trim: true },
    orderStatus: {
      type: String,
      enum: ['placed', 'verified', 'processing', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'placed',
      index: true,
    },
    orderTimeline: {
      type: [
        {
          status: { type: String, trim: true },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

healthcarePharmacyOrderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('HealthcarePharmacyOrder', healthcarePharmacyOrderSchema);
