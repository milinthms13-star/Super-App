const mongoose = require('mongoose');

const BusinessInvoiceSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: String,
      unique: true,
      required: true,
      default: () => `binv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    customerGSTIN: {
      type: String,
      trim: true,
      uppercase: true,
    },
    customerAddress: {
      type: String,
      trim: true,
    },
    items: [
      {
        itemId: {
          type: String,
          default: () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 0,
          default: 1,
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        taxRate: {
          type: Number,
          default: 0,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    discountAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Paid', 'Overdue'],
      default: 'Sent',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Partial'],
      default: 'Pending',
    },
    businessBranding: {
      logo: String,
      primaryColor: String,
      secondaryColor: String,
    },
  },
  { timestamps: true }
);

BusinessInvoiceSchema.index({ businessId: 1, createdAt: -1 });

module.exports = mongoose.model('BusinessInvoice', BusinessInvoiceSchema);
