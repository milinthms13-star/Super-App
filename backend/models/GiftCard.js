const mongoose = require('mongoose');

const GiftCardSchema = new mongoose.Schema(
  {
    giftCardId: {
      type: String,
      unique: true,
      required: true,
      default: () => `gc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    cardCode: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      match: /^[A-Z0-9]{16}$/,
    },
    issuedBy: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    denomination: {
      type: Number,
      required: true,
      enum: [500, 1000, 2500, 5000, 10000],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    balance: {
      type: Number,
      required: true,
    },
    originalBalance: {
      type: Number,
      required: true,
    },
    recipientEmail: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true, // Optional until gifted
    },
    recipientName: String,
    senderEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    senderName: String,
    giftMessage: {
      type: String,
      default: '',
      maxlength: 500,
    },
    designTemplate: {
      type: String,
      enum: ['Classic', 'Festive', 'Birthday', 'Anniversary', 'Congratulations', 'Custom'],
      default: 'Classic',
    },
    designImage: String, // URL to design image
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    activatedAt: Date, // When recipient first used it
    expiryDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Used', 'Expired', 'Revoked'],
      default: 'Active',
    },
    transactions: [
      {
        transactionId: String,
        orderId: String,
        amount: Number,
        description: String,
        usedAt: {
          type: Date,
          default: Date.now,
        },
        remainingBalance: Number,
      },
    ],
    canBeTransferred: {
      type: Boolean,
      default: true,
    },
    transferHistory: [
      {
        fromEmail: String,
        toEmail: String,
        transferredAt: Date,
        transferMessage: String,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
GiftCardSchema.index({ cardCode: 1 });
GiftCardSchema.index({ recipientEmail: 1, status: 1 });
GiftCardSchema.index({ senderEmail: 1, issuedAt: -1 });
GiftCardSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('GiftCard', GiftCardSchema);
