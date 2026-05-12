const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: String,
      unique: true,
      required: true,
      default: () => `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
      address: { type: String, trim: true },
      gstin: { type: String, trim: true, uppercase: true },
    },
    items: [{
      description: { type: String, required: true, trim: true },
      quantity: { type: Number, required: true, min: 1 },
      unitPrice: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 },
      hsnCode: { type: String, trim: true },
    }],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    taxRate: {
      type: Number,
      default: 18,
      min: 0,
      max: 100,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'],
      default: 'Draft',
    },
    dueDate: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    terms: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'UPI', 'Card', 'Cheque', 'Other'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
InvoiceSchema.index({ businessId: 1, status: 1 });
InvoiceSchema.index({ userId: 1, createdAt: -1 });
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ dueDate: 1 });

// Pre-save middleware to calculate totals
InvoiceSchema.pre('save', function(next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);

  // Apply discount
  let discountedAmount = this.subtotal;
  if (this.discountPercentage > 0) {
    this.discount = (this.subtotal * this.discountPercentage) / 100;
    discountedAmount = this.subtotal - this.discount;
  } else if (this.discount > 0) {
    discountedAmount = this.subtotal - this.discount;
  }

  // Calculate tax
  this.taxAmount = (discountedAmount * this.taxRate) / 100;

  // Calculate total
  this.totalAmount = discountedAmount + this.taxAmount;

  next();
});

// Instance method to mark as paid
InvoiceSchema.methods.markAsPaid = function(paymentMethod) {
  this.status = 'Paid';
  if (paymentMethod) {
    this.paymentMethod = paymentMethod;
  }
  return this.save();
};

// Instance method to check if overdue
InvoiceSchema.methods.isOverdue = function() {
  return this.status !== 'Paid' && this.status !== 'Cancelled' && new Date() > this.dueDate;
};

// Static method to get next invoice number for a business
InvoiceSchema.statics.getNextInvoiceNumber = async function(businessId) {
  const lastInvoice = await this.findOne({ businessId })
    .sort({ createdAt: -1 })
    .select('invoiceNumber');

  if (!lastInvoice) {
    return 'INV-001';
  }

  const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1]) || 0;
  const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
  return `INV-${nextNumber}`;
};

module.exports = mongoose.model('Invoice', InvoiceSchema);
