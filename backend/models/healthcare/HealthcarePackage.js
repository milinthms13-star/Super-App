const mongoose = require('mongoose');

const healthcarePackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    tests: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    discount: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
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

module.exports = mongoose.model('HealthcarePackage', healthcarePackageSchema);
