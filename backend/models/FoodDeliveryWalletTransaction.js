const mongoose = require('mongoose');

const WalletTransactionSchema = new mongoose.Schema(
  {
    // Wallet Reference
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryWallet',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryOrder',
      sparse: true,
      index: true,
    },

    // Transaction Details
    transactionType: {
      type: String,
      enum: [
        'credit', // Money added
        'debit', // Money used
        'cashback_pending', // Pending cashback
        'cashback_credited', // Cashback credited
        'transfer_out', // Withdrawal
        'transfer_in', // Money from other source
        'adjustment', // Admin adjustment
        'refund', // Money refunded
      ],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },

    // Transaction Source/Method
    source: {
      type: String,
      enum: ['manual', 'payment', 'cashback', 'refund', 'transfer', 'adjustment', 'promotion'],
      required: true,
    },
    description: String,

    // Balance After Transaction
    balance: {
      type: Number,
      required: true,
      min: 0,
    },

    // Transaction Status
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'completed',
      index: true,
    },

    // Payment Method (for credit transactions)
    paymentMethod: {
      type: String,
      enum: ['upi', 'card', 'netbanking', 'bank_transfer'],
    },

    // Related Payment/Refund
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryPayment',
      sparse: true,
    },
    refundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryRefund',
      sparse: true,
    },

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Virtual: Is credit transaction
WalletTransactionSchema.virtual('isCredit').get(function () {
  return ['credit', 'cashback_credited', 'refund', 'transfer_in'].includes(this.transactionType);
});

// Virtual: Is debit transaction
WalletTransactionSchema.virtual('isDebit').get(function () {
  return ['debit', 'transfer_out'].includes(this.transactionType);
});

// Indexes
WalletTransactionSchema.index({ walletId: 1, createdAt: -1 });
WalletTransactionSchema.index({ userId: 1, createdAt: -1 });
WalletTransactionSchema.index({ orderId: 1 });
WalletTransactionSchema.index({ transactionType: 1, createdAt: -1 });
WalletTransactionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // 1 year

module.exports = mongoose.model('FoodDeliveryWalletTransaction', WalletTransactionSchema);
