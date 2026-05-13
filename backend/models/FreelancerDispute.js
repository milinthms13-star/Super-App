const mongoose = require('mongoose');

const freelancerDisputeSchema = new mongoose.Schema(
  {
    disputeCode: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'FreelancerBooking', required: true, index: true },
    bookingCode: { type: String, trim: true, index: true },
    raisedByRole: { type: String, enum: ['customer', 'provider', 'admin'], required: true },
    raisedByName: { type: String, trim: true, default: '' },
    raisedAgainstRole: { type: String, enum: ['customer', 'provider', 'platform'], required: true },
    reason: { type: String, trim: true, required: true },
    details: { type: String, trim: true, default: '' },
    proofs: [
      {
        originalName: { type: String, trim: true },
        filename: { type: String, trim: true },
        path: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        size: { type: Number, min: 0 },
      },
    ],
    status: { type: String, enum: ['open', 'under-review', 'resolved', 'rejected'], default: 'open', index: true },
    resolution: {
      action: { type: String, trim: true, default: '' },
      note: { type: String, trim: true, default: '' },
      resolvedBy: { type: String, trim: true, default: '' },
      resolvedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

freelancerDisputeSchema.index({ bookingCode: 1, status: 1 });

module.exports = mongoose.model('FreelancerDispute', freelancerDisputeSchema);
