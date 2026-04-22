const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema(
  {
    walletId: {
      type: String,
      unique: true,
      required: true,
      default: () => `wallet-${Date.now()}`,
    },
    userEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    userName: String,
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    transactions: [
      {
        transactionId: String,
        type: {
          type: String,
          enum: ['Credit', 'Debit', 'Refund', 'Transfer'],
        },
        amount: Number,
        description: String,
        relatedOrderId: String,
        relatedRefundId: String,
        previousBalance: Number,
        newBalance: Number,
        status: {
          type: String,
          enum: ['Pending', 'Completed', 'Failed'],
          default: 'Completed',
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    totalCredited: {
      type: Number,
      default: 0,
    },
    totalDebited: {
      type: Number,
      default: 0,
    },
    lastTransactionDate: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    kycVerified: {
      type: Boolean,
      default: false,
    },
    maximumBalance: {
      type: Number,
      default: 100000, // Max wallet balance limit
    },
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

// Index for transaction queries
WalletSchema.index({ userEmail: 1, 'transactions.timestamp': -1 });

module.exports = mongoose.model('Wallet', WalletSchema);
