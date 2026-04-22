const mongoose = require('mongoose');

const BulkOrderSchema = new mongoose.Schema(
  {
    bulkOrderId: {
      type: String,
      unique: true,
      required: true,
      default: () => `bulk-${Date.now()}`,
    },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    customerName: String,
    customerPhone: String,
    companyName: String,
    gstNumber: String,
    items: [
      {
        productId: String,
        productName: String,
        quantity: {
          type: Number,
          required: true,
          min: 50, // Minimum bulk quantity
        },
        unitPrice: Number,
        bulkPrice: Number, // Discounted price for bulk
        totalPrice: Number,
      },
    ],
    subtotal: Number,
    bulkDiscount: Number, // Total discount amount
    discountPercentage: {
      type: Number,
      default: 0,
    },
    deliveryAddress: String,
    deliveryFee: Number,
    totalAmount: Number,
    status: {
      type: String,
      enum: ['Pending', 'Quoted', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Partial', 'Completed'],
      default: 'Pending',
    },
    paymentTerms: {
      type: String,
      enum: ['COD', 'Net 7', 'Net 15', 'Net 30', 'Online'],
      default: 'Online',
    },
    purchaseOrder: String, // PO reference number
    notes: String,
    sellerEmail: String,
    sellerName: String,
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BulkOrder', BulkOrderSchema);
