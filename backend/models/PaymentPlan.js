const mongoose = require('mongoose');

const PaymentPlanSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    priceMonthly: { type: Number, default: 0, min: 0 },
    features: { type: [String], default: [] },
    exportHdEnabled: { type: Boolean, default: false },
    arEnabled: { type: Boolean, default: false },
    aiEnabled: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'photo_studio_payment_plans',
  }
);

module.exports = mongoose.models.PaymentPlan || mongoose.model('PaymentPlan', PaymentPlanSchema);
