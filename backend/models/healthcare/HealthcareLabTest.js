const mongoose = require('mongoose');

const healthcareLabTestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    price: { type: Number, required: true, min: 0 },
    homeCollection: { type: Boolean, default: false },
    type: { type: String, enum: ['blood', 'scan', 'other'], default: 'blood', index: true },
    turnaroundHours: { type: Number, default: 24, min: 1 },
    preparationNotes: { type: String, default: '', trim: true },
    partnerName: { type: String, default: '', trim: true },
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

healthcareLabTestSchema.index({ type: 1, approvalStatus: 1, isActive: 1 });

module.exports = mongoose.model('HealthcareLabTest', healthcareLabTestSchema);
