const mongoose = require('mongoose');

const freelancerBidSchema = new mongoose.Schema(
  {
    bidCode: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'FreelancerJob', required: true, index: true },
    jobCode: { type: String, trim: true, index: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'FreelancerProvider', required: true, index: true },
    providerName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    timelineDays: { type: Number, required: true, min: 1 },
    coverLetter: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn'], default: 'submitted', index: true },
  },
  { timestamps: true }
);

freelancerBidSchema.index({ jobId: 1, status: 1 });
freelancerBidSchema.index({ providerId: 1, status: 1 });

module.exports = mongoose.model('FreelancerBid', freelancerBidSchema);
