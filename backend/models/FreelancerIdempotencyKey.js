const mongoose = require('mongoose');

const freelancerIdempotencyKeySchema = new mongoose.Schema(
  {
    userId: { type: String, trim: true, required: true, index: true },
    scope: { type: String, trim: true, required: true, index: true },
    key: { type: String, trim: true, required: true, index: true },
    requestHash: { type: String, trim: true, required: true, index: true },
    statusCode: { type: Number, min: 100, max: 599, required: true },
    responseBody: { type: mongoose.Schema.Types.Mixed, default: {} },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: () => new Date(), expires: 60 * 60 * 24 * 7 },
  },
  { timestamps: true }
);

freelancerIdempotencyKeySchema.index({ userId: 1, scope: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('FreelancerIdempotencyKey', freelancerIdempotencyKeySchema);
