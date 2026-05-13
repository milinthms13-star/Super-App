const mongoose = require('mongoose');

const businessServiceOrderSchema = new mongoose.Schema(
  {
    customerEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    customerName: { type: String, default: '', trim: true },

    // Catalog references (from frontend selections)
    categoryId: { type: String, required: true, trim: true, index: true },
    categoryName: { type: String, default: '', trim: true },
    serviceId: { type: String, required: true, trim: true, index: true },
    serviceName: { type: String, default: '', trim: true },
    isStarterPackage: { type: Boolean, default: false },

    pricing: {
      priceText: { type: String, default: '', trim: true },
      priceNumber: { type: Number, default: 0, min: 0 },
      durationText: { type: String, default: '', trim: true },
    },

    // order lifecycle
    status: {
      type: String,
      required: true,
      default: 'submitted',
      index: true,
      trim: true,
    },
    orderDate: { type: Date, default: () => new Date() },
    estimatedCompletion: { type: Date, default: null },

    // user-provided form data
    formData: { type: mongoose.Schema.Types.Mixed, default: {} },
    requirements: { type: String, default: '', trim: true },

    // uploaded documents
    documents: [
      {
        fileId: { type: String, required: true, trim: true },
        name: { type: String, default: '', trim: true },
        contentType: { type: String, default: '', trim: true },
        size: { type: Number, default: 0, min: 0 },
        // public URL or private download URL can be constructed client-side
        url: { type: String, default: '', trim: true },
        uploadedAt: { type: Date, default: () => new Date() },
      },
    ],

    // lightweight consultant workflow placeholder
    consultant: {
      assignedEmail: { type: String, default: '', trim: true, lowercase: true },
      assignedName: { type: String, default: '', trim: true },
    },

    adminNotes: { type: String, default: '', trim: true },
    paymentStatus: { type: String, default: 'pending', trim: true, index: true },
    paymentGateway: { type: String, default: '', trim: true },
    paymentMethod: { type: String, default: '', trim: true },
    paymentRecordId: { type: String, default: '', trim: true },
    paymentDetails: { type: mongoose.Schema.Types.Mixed, default: {} },

    // audit trail for status transitions
    history: [
      {
        status: { type: String, required: true, trim: true },
        changedAt: { type: Date, default: () => new Date() },
        changedBy: { type: String, default: '', trim: true }, // email
        note: { type: String, default: '', trim: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('BusinessServiceOrder', businessServiceOrderSchema);
