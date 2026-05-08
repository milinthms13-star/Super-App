const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema(
  {
    // Wallet Owner
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Balance Information
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR'],
    },

    // Account Status
    status: {
      type: String,
      enum: ['active', 'frozen', 'suspended', 'closed'],
      default: 'active',
      index: true,
    },
    statusReason: String,
    statusUpdatedAt: Date,

    // KYC & Verification
    kycVerified: {
      type: Boolean,
      default: false,
    },
    kycVerifiedAt: Date,
    kycDocument: {
      type: String,
      documentNumber: String,
      verifiedBy: mongoose.Schema.Types.ObjectId,
    },

    // Wallet Limits
    limits: {
      dailyAddLimit: { type: Number, default: 100000 }, // INR
      monthlyAddLimit: { type: Number, default: 500000 },
      maxBalance: { type: Number, default: 1000000 },
      dailyTransactionCount: { type: Number, default: 20 },
    },

    // Daily Usage Tracking
    dailyUsage: {
      date: Date,
      amountAdded: { type: Number, default: 0 },
      amountUsed: { type: Number, default: 0 },
      transactionCount: { type: Number, default: 0 },
    },

    // Monthly Usage
    monthlyUsage: {
      month: String, // YYYY-MM
      amountAdded: { type: Number, default: 0 },
      amountUsed: { type: Number, default: 0 },
      transactionCount: { type: Number, default: 0 },
    },

    // Linked Payment Methods
    linkedPaymentMethods: [
      {
        type: String,
        value: String, // UPI VPA, Card last4, Bank account
        method: {
          type: String,
          enum: ['upi', 'card', 'netbanking'],
        },
        isDefault: Boolean,
        addedAt: Date,
      },
    ],

    // Cashback & Rewards
    cashbackEarned: {
      type: Number,
      default: 0,
    },
    cashbackRedeemed: {
      type: Number,
      default: 0,
    },
    pendingCashback: [
      {
        amount: Number,
        reason: String,
        expiresAt: Date,
        status: {
          type: String,
          enum: ['pending', 'credited', 'expired'],
          default: 'pending',
        },
        creditedAt: Date,
      },
    ],

    // Loyalty Points
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    pointsExpired: {
      type: Number,
      default: 0,
    },
    pointsRedeemed: {
      type: Number,
      default: 0,
    },

    // Promotional Credits
    promotionalBalance: {
      type: Number,
      default: 0,
    },
    promotionalBreakup: [
      {
        promoCode: String,
        amount: Number,
        expiresAt: Date,
        usedAt: Date,
      },
    ],

    // Freeze Details (if frozen)
    freezeDetails: {
      freezeReason: String,
      frozenAt: Date,
      freezeExpiry: Date,
      frozenBy: mongoose.Schema.Types.ObjectId,
    },

    // Transaction History (latest 50)
    recentTransactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoodDeliveryWalletTransaction',
      },
    ],

    // Beneficiary Details (for withdrawal)
    beneficiary: {
      accountHolderName: String,
      accountNumber: String,
      accountType: {
        type: String,
        enum: ['savings', 'current'],
      },
      ifscCode: String,
      bankName: String,
      upiVpa: String,
      verifiedAt: Date,
    },

    // Preferences
    preferences: {
      autoTopUp: {
        enabled: Boolean,
        amount: Number,
        method: String,
      },
      lowBalanceAlert: {
        enabled: { type: Boolean, default: true },
        threshold: { type: Number, default: 500 },
      },
      transactionNotifications: {
        enabled: { type: Boolean, default: true },
        methods: [String], // push, sms, email
      },
    },

    // Security
    pinSet: {
      type: Boolean,
      default: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    lastAccessAt: Date,
    accessHistory: [
      {
        timestamp: Date,
        ip: String,
        deviceId: String,
        action: String,
      },
    ],

    // Analytics
    totalTransactionsCount: { type: Number, default: 0 },
    totalMoneyAdded: { type: Number, default: 0 },
    totalMoneyUsed: { type: Number, default: 0 },
    averageTransaction: { type: Number, default: 0 },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    lastTransactionAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: Available balance (including promotional)
WalletSchema.virtual('availableBalance').get(function () {
  return this.balance + this.promotionalBalance;
});

// Virtual: Total balance (including cashback pending)
WalletSchema.virtual('totalBalance').get(function () {
  const pendingCashbackAmount = (this.pendingCashback || []).reduce(
    (sum, cb) => (cb.status === 'pending' ? sum + cb.amount : sum),
    0
  );
  return this.availableBalance + pendingCashbackAmount;
});

// Virtual: Is wallet active
WalletSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

// Virtual: Can add money
WalletSchema.virtual('canAddMoney').get(function () {
  if (!this.isActive) return false;
  if (this.dailyUsage && this.dailyUsage.date === new Date().toDateString()) {
    return this.dailyUsage.amountAdded < this.limits.dailyAddLimit;
  }
  return true;
});

// Method: Add money to wallet
WalletSchema.methods.addMoney = function (amount, source = 'manual') {
  if (this.balance + amount > this.limits.maxBalance) {
    throw new Error('Adding this amount would exceed wallet limit');
  }
  this.balance += amount;
  this.totalMoneyAdded += amount;
  this.updatedAt = new Date();
};

// Method: Use wallet balance
WalletSchema.methods.useBalance = function (amount) {
  if (amount > this.balance) {
    throw new Error(`Insufficient balance. Available: ${this.balance}, Required: ${amount}`);
  }
  this.balance -= amount;
  this.totalMoneyUsed += amount;
  this.updatedAt = new Date();
};

// Method: Add cashback
WalletSchema.methods.addCashback = function (amount, reason, expiryDays = 30) {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + expiryDays);

  this.pendingCashback.push({
    amount,
    reason,
    expiresAt: expiry,
    status: 'pending',
  });

  this.cashbackEarned += amount;
  this.updatedAt = new Date();
};

// Method: Credit pending cashback
WalletSchema.methods.creditCashback = function (amount) {
  const pendingCB = this.pendingCashback.find((cb) => cb.status === 'pending' && cb.amount === amount);
  if (pendingCB) {
    pendingCB.status = 'credited';
    pendingCB.creditedAt = new Date();
    this.balance += amount;
    this.updatedAt = new Date();
  }
};

// Method: Add promotional credit
WalletSchema.methods.addPromoCredit = function (promoCode, amount, expiryDays = 7) {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + expiryDays);

  this.promotionalBreakup.push({
    promoCode,
    amount,
    expiresAt: expiry,
  });

  this.promotionalBalance += amount;
  this.updatedAt = new Date();
};

// Method: Freeze wallet
WalletSchema.methods.freeze = function (reason, expiryDays = 30) {
  this.status = 'frozen';
  this.statusReason = reason;
  this.statusUpdatedAt = new Date();
  this.freezeDetails = {
    freezeReason: reason,
    frozenAt: new Date(),
    freezeExpiry: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
  };
  this.updatedAt = new Date();
};

// Method: Unfreeze wallet
WalletSchema.methods.unfreeze = function () {
  this.status = 'active';
  this.statusReason = null;
  this.statusUpdatedAt = new Date();
  this.freezeDetails = null;
  this.updatedAt = new Date();
};

// Method: Get wallet summary
WalletSchema.methods.toSummary = function () {
  return {
    _id: this._id,
    userId: this.userId,
    balance: this.balance,
    promotionalBalance: this.promotionalBalance,
    availableBalance: this.availableBalance,
    cashbackEarned: this.cashbackEarned,
    cashbackRedeemed: this.cashbackRedeemed,
    loyaltyPoints: this.loyaltyPoints,
    status: this.status,
    kycVerified: this.kycVerified,
    lastTransactionAt: this.lastTransactionAt,
  };
};

// Indexes
WalletSchema.index({ userId: 1 });
WalletSchema.index({ status: 1 });
WalletSchema.index({ kycVerified: 1 });
WalletSchema.index({ 'recentTransactions._id': 1 });

module.exports = mongoose.model('FoodDeliveryWallet', WalletSchema);
