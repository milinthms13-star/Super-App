const mongoose = require('mongoose');

const healthcareMedicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, default: '', trim: true, index: true },
    requiresPrescription: { type: Boolean, default: false, index: true },
    stock: { type: Number, default: 0, min: 0 },
    vendorName: { type: String, default: '', trim: true },
    approvalStatus: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

healthcareMedicineSchema.index({ category: 1, approvalStatus: 1, isActive: 1 });

module.exports = mongoose.model('HealthcareMedicine', healthcareMedicineSchema);
