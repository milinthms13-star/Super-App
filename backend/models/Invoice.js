/**
 * Invoice Model - Phase 12
 * Invoice generation and tracking
 */

const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },
    linkedPaymentId: {
      type: String,
      required: true,
      index: true,
    },
    linkedOrderId: String,
    linkedSubscriptionId: String,
    billFrom: {
      name: String,
      businessName: String,
      gstNumber: String,
      address: String,
      phone: String,
      email: String,
    },
    billTo: {
      name: String,
      address: String,
      phone: String,
      email: String,
      gstNumber: String,
    },
    invoiceDate: {
      type: Date,
      required: true,
      index: true,
    },
    dueDate: Date,
    items: [
      {
        itemName: String,
        description: String,
        quantity: Number,
        unitPrice: Number,
        totalAmount: Number,
        hsnCode: String,
        sacCode: String,
        taxRate: Number,
        taxAmount: Number,
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    discountPercentage: Number,
    taxBreakdown: {
      sgst: {
        rate: Number,
        amount: Number,
      },
      cgst: {
        rate: Number,
        amount: Number,
      },
      igst: {
        rate: Number,
        amount: Number,
      },
      otherTax: Number,
    },
    totalTax: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    outstandingAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'pending', 'partial', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
    },
    invoiceType: {
      type: String,
      enum: ['tax_invoice', 'receipt', 'proforma', 'credit_note', 'debit_note'],
      default: 'tax_invoice',
    },
    notes: String,
    terms: String,
    bankDetails: {
      accountName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
    },
    paymentMethods: [
      {
        method: String,
        details: mongoose.Schema.Types.Mixed,
      },
    ],
    documents: [
      {
        documentId: String,
        documentType: {
          type: String,
          enum: ['pdf', 'image', 'attachment'],
        },
        documentUrl: String,
        uploadedAt: Date,
      },
    ],
    pdfUrl: String,
    pdfGeneratedAt: Date,
    sendHistory: [
      {
        sentAt: Date,
        sentTo: String,
        sentVia: {
          type: String,
          enum: ['email', 'sms', 'whatsapp'],
        },
        status: String,
        deliveryStatus: String,
      },
    ],
    viewHistory: [
      {
        viewedAt: Date,
        viewedBy: String,
        ipAddress: String,
      },
    ],
    paymentHistory: [
      {
        paymentId: String,
        paymentDate: Date,
        amount: Number,
        paymentMethod: String,
        transactionId: String,
        reference: String,
      },
    ],
    auditTrail: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        action: String,
        performedBy: String,
        details: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'invoices',
  }
);

// Indexes
invoiceSchema.index({ linkedPaymentId: 1 });
invoiceSchema.index({ linkedOrderId: 1 });
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ 'billTo.email': 1 });

// Methods
invoiceSchema.methods.isPaid = function () {
  return this.status === 'paid' || this.outstandingAmount === 0;
};

invoiceSchema.methods.isOverdue = function () {
  return this.dueDate && this.dueDate < new Date() && this.paymentStatus !== 'paid';
};

invoiceSchema.methods.getAmountDue = function () {
  return Math.max(0, this.totalAmount - this.amountPaid);
};

invoiceSchema.methods.markAsSent = function (sentTo, sentVia) {
  this.status = 'sent';
  this.sendHistory.push({
    sentAt: new Date(),
    sentTo,
    sentVia,
    status: 'sent',
  });
};

invoiceSchema.methods.recordPayment = function (paymentData) {
  this.amountPaid += paymentData.amount;
  this.outstandingAmount = this.totalAmount - this.amountPaid;

  if (this.outstandingAmount === 0) {
    this.status = 'paid';
    this.paymentStatus = 'paid';
  } else if (this.amountPaid > 0) {
    this.paymentStatus = 'partial';
    this.status = 'partial';
  }

  this.paymentHistory.push({
    paymentId: paymentData.paymentId,
    paymentDate: new Date(),
    amount: paymentData.amount,
    paymentMethod: paymentData.paymentMethod,
    transactionId: paymentData.transactionId,
    reference: paymentData.reference,
  });
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
