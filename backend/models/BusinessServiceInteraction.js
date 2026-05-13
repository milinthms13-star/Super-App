const mongoose = require('mongoose');

const businessServiceInteractionSchema = new mongoose.Schema(
  {
    customerEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    customerName: { type: String, default: '', trim: true },
    interactionType: {
      type: String,
      required: true,
      trim: true,
      enum: ['chat-request', 'call-request', 'consultation-request', 'vendor-contact-request'],
      index: true,
    },
    orderId: { type: String, default: '', trim: true, index: true },
    categoryId: { type: String, default: '', trim: true, index: true },
    serviceId: { type: String, default: '', trim: true, index: true },
    notes: { type: String, default: '', trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      default: 'submitted',
      enum: ['submitted', 'under-review', 'processing', 'completed'],
      trim: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BusinessServiceInteraction', businessServiceInteractionSchema);
