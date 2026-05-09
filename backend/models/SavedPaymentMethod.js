const mongoose = require('mongoose');

const SavedPaymentMethodSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    methodId: {
      type: String,
      unique: true,
      required: true,
      default: () => `pm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    name: {
      type: String,
      required: true, // e.g., "Personal Card", "Work UPI"
    },
    type: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'bnpl'],
      required: true,
    },
    // Card Details (encrypted, no raw data)
    card: {
      last4: String, // Last 4 digits
      brand: String, // Visa, Mastercard, etc.
      expiryMonth: Number,
      expiryYear: Number,
      holderName: String,
      tokenId: String, // Payment gateway token ID
      isExpired: {
        type: Boolean,
        default: false,
      },
    },
    // UPI Details
    upi: {
      upiId: String, // Encrypted or hashed
      tokenId: String,
      name: String, // Account holder name
    },
    // Net Banking Details
    netbanking: {
      bankName: String,
      tokenId: String,
      accountName: String,
    },
    // Wallet Details
    wallet: {
      walletProvider: String, // PayPal, Google Pay, Apple Pay, etc.
      accountEmail: String,
      tokenId: String,
    },
    // BNPL Details
    bnpl: {
      provider: String, // Lazerpay, Zest, etc.
      customerId: String,
      isActive: Boolean,
    },
    // Shared details
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    lastUsedOrderId: String,
    // Risk & Security
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationMethod: {
      type: String,
      enum: ['otp', 'token', 'manual', 'none'],
      default: 'none',
    },
    failedAttempts: {
      type: Number,
      default: 0,
    },
    maxFailedAttempts: {
      type: Number,
      default: 3,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    // Linked Addresses
    linkedAddresses: [
      {
        addressId: String,
        linkedAt: Date,
        isDefault: Boolean,
      },
    ],
    // Metadata
    metadata: {
      billingAddress: String,
      shippingAddress: String,
      country: {
        type: String,
        default: 'India',
      },
      state: String,
      notes: String,
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
  {
    timestamps: true,
    collection: 'saved_payment_methods',
  }
);

// Indexes
SavedPaymentMethodSchema.index({ userEmail: 1, isActive: 1 });
SavedPaymentMethodSchema.index({ userEmail: 1, isDefault: 1 });
SavedPaymentMethodSchema.index({ userEmail: 1, createdAt: -1 });
SavedPaymentMethodSchema.index({ userEmail: 1, type: 1 });

// Instance methods
SavedPaymentMethodSchema.methods.markAsDefault = function () {
  this.isDefault = true;
  return this;
};

SavedPaymentMethodSchema.methods.recordUsage = function (orderId = null) {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  if (orderId) {
    this.lastUsedOrderId = orderId;
  }
  this.failedAttempts = 0; // Reset on successful usage
  return this;
};

SavedPaymentMethodSchema.methods.recordFailedAttempt = function () {
  this.failedAttempts += 1;

  if (this.failedAttempts >= this.maxFailedAttempts) {
    this.isLocked = true;
  }

  return this;
};

SavedPaymentMethodSchema.methods.unlock = function () {
  this.isLocked = false;
  this.failedAttempts = 0;
  return this;
};

SavedPaymentMethodSchema.methods.isCardExpired = function () {
  if (this.type !== 'card' || !this.card) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (this.card.expiryYear < currentYear) return true;
  if (this.card.expiryYear === currentYear && this.card.expiryMonth < currentMonth) return true;

  return false;
};

SavedPaymentMethodSchema.methods.getMaskedDetails = function () {
  const masked = {
    methodId: this.methodId,
    name: this.name,
    type: this.type,
    isDefault: this.isDefault,
    usageCount: this.usageCount,
    lastUsedAt: this.lastUsedAt,
  };

  if (this.type === 'card' && this.card) {
    masked.card = {
      last4: this.card.last4,
      brand: this.card.brand,
      holderName: this.card.holderName,
      expiryMonth: this.card.expiryMonth,
      expiryYear: this.card.expiryYear,
      isExpired: this.isCardExpired(),
    };
  } else if (this.type === 'upi' && this.upi) {
    masked.upi = {
      upiId: this.upi.upiId ? this.upi.upiId.substring(0, 5) + '***' : '***',
      name: this.upi.name,
    };
  }

  return masked;
};

// Statics
SavedPaymentMethodSchema.statics.findByEmail = function (email) {
  return this.find({ userEmail: email.toLowerCase(), isActive: true });
};

SavedPaymentMethodSchema.statics.findDefaultForEmail = function (email) {
  return this.findOne({ userEmail: email.toLowerCase(), isDefault: true, isActive: true });
};

SavedPaymentMethodSchema.statics.getOrCreate = async function (userId, userEmail) {
  const methods = await this.find({ userEmail: userEmail.toLowerCase(), isActive: true });
  return methods;
};

SavedPaymentMethodSchema.statics.markOthersAsNonDefault = async function (email, methodId) {
  await this.updateMany(
    { userEmail: email.toLowerCase(), methodId: { $ne: methodId } },
    { isDefault: false }
  );
};

module.exports = mongoose.model('SavedPaymentMethod', SavedPaymentMethodSchema);
