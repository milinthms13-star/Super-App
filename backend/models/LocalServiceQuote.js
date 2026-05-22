const mongoose = require('mongoose');

const localServiceQuoteSchema = new mongoose.Schema(
  {
    quoteCode: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
    providerId: { type: String, required: true, trim: true, index: true },
    providerName: { type: String, required: true, trim: true },
    providerCategory: { type: String, trim: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true, index: true },
    customerEmail: { type: String, trim: true, lowercase: true, default: '' },
    eventType: { type: String, required: true, trim: true },
    eventDate: { type: Date, required: true, index: true },
    guests: { type: Number, required: true, min: 1 },
    budget: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, default: '' },
    status: { type: String, default: 'Quote in progress', index: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

localServiceQuoteSchema.virtual('id').get(function () {
  return this.quoteCode;
});

module.exports = mongoose.model('LocalServiceQuote', localServiceQuoteSchema);
