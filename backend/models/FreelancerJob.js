const mongoose = require('mongoose');

const freelancerJobSchema = new mongoose.Schema(
  {
    jobCode: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    location: { type: String, required: true, trim: true, index: true },
    requirements: { type: String, required: true, trim: true },
    serviceType: { type: String, enum: ['digital', 'local'], default: 'digital' },
    urgency: { type: String, enum: ['low', 'medium', 'high', 'emergency'], default: 'medium' },
    minBudget: { type: Number, required: true, min: 1 },
    maxBudget: { type: Number, required: true, min: 1 },
    deadline: { type: Date, required: true },
    attachments: [
      {
        originalName: { type: String, trim: true },
        filename: { type: String, trim: true },
        path: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        size: { type: Number, min: 0 },
      },
    ],
    createdBy: {
      customerName: { type: String, trim: true, default: '' },
      customerPhone: { type: String, trim: true, required: true, index: true },
      maskedPhone: { type: String, trim: true, default: '' },
    },
    status: { type: String, enum: ['open', 'in-progress', 'awarded', 'closed', 'cancelled'], default: 'open', index: true },
    bidCount: { type: Number, min: 0, default: 0 },
    shortlistedProviderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FreelancerProvider' }],
    leadPurchases: [
      {
        providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'FreelancerProvider' },
        amount: { type: Number, min: 0, default: 0 },
        purchasedAt: { type: Date, default: () => new Date() },
      },
    ],
  },
  { timestamps: true }
);

freelancerJobSchema.index({ title: 'text', requirements: 'text', category: 'text' });
freelancerJobSchema.index({ category: 1, location: 1, status: 1 });

module.exports = mongoose.model('FreelancerJob', freelancerJobSchema);
