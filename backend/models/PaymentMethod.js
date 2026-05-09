/**
 * PaymentMethod.js
 * Secure storage of payment methods (cards, UPI, wallets)
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const Schema = mongoose.Schema;

const PaymentMethodSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    methodType: {
      type: String,
      enum: ['card', 'upi', 'wallet', 'netbanking', 'paypal'],
      required: true,
      index: true
    },
    paymentGateway: {
      type: String,
      enum: ['razorpay', 'stripe', 'paytm', 'phonepe'],
      default: 'razorpay'
    },
    // Card-specific fields
    cardNumber: {
      type: String, // Encrypted last 4 digits stored as reference
      select: false // Don't return by default
    },
    cardLast4: {
      type: String, // Plain last 4 digits for display
      match: /^\d{4}$/
    },
    cardHolderName: {
      type: String,
      maxlength: 100
    },
    expiryMonth: {
      type: Number,
      min: 1,
      max: 12
    },
    expiryYear: {
      type: Number,
      min: new Date().getFullYear()
    },
    cardBrand: {
      type: String,
      enum: ['visa', 'mastercard', 'amex', 'rupay', 'unknown'],
      default: 'unknown'
    },
    cvv: {
      type: String,
      select: false // Never return CVV
    },
    // UPI-specific fields
    upiId: {
      type: String,
      match: /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/
    },
    // Wallet-specific fields
    walletProvider: {
      type: String,
      enum: ['paytm', 'phonepe', 'googlepay', 'applepay'],
      default: null
    },
    walletBalance: {
      type: Number,
      default: 0
    },
    // Common fields
    isDefault: {
      type: Boolean,
      default: false,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationCode: String,
    verificationExpires: Date,
    verificationAttempts: {
      type: Number,
      default: 0
    },
    // Security
    tokenizedReference: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    fingerprint: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    isFraudulent: {
      type: Boolean,
      default: false
    },
    fraudReasons: [String],
    // Usage tracking
    usageCount: {
      type: Number,
      default: 0
    },
    lastUsedAt: Date,
    lastFailedAt: Date,
    failureCount: {
      type: Number,
      default: 0
    },
    consecutiveFailures: {
      type: Number,
      default: 0
    },
    // Metadata
    label: {
      type: String,
      maxlength: 50,
      default: ''
    },
    billingAddress: {
      type: Schema.Types.ObjectId,
      ref: 'UserAddress'
    },
    expiresAt: Date
  },
  { timestamps: true }
);

// Index for finding active payment methods
PaymentMethodSchema.index({ userId: 1, isActive: 1, methodType: 1 });
PaymentMethodSchema.index({ userId: 1, isDefault: 1 });
PaymentMethodSchema.index({ userId: 1, createdAt: -1 });

// Methods
PaymentMethodSchema.methods.encrypt = function (data, key) {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

PaymentMethodSchema.methods.decrypt = function (encrypted, key) {
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

PaymentMethodSchema.methods.setAsDefault = async function () {
  // Clear previous default for this payment type
  await this.constructor.updateMany(
    {
      userId: this.userId,
      methodType: this.methodType,
      _id: { $ne: this._id }
    },
    { isDefault: false }
  );

  this.isDefault = true;
  return this.save();
};

PaymentMethodSchema.methods.generateVerificationCode = function () {
  this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  this.verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min TTL
  this.verificationAttempts = 0;
  return this.verificationCode;
};

PaymentMethodSchema.methods.verifyPaymentMethod = function (code) {
  if (this.verificationAttempts >= 5) {
    throw new Error('Too many verification attempts. Please try again later.');
  }

  if (
    !this.verificationCode ||
    this.verificationCode !== code ||
    new Date() > this.verificationExpires
  ) {
    this.verificationAttempts += 1;
    this.save();
    throw new Error('Invalid or expired verification code');
  }

  this.isVerified = true;
  this.verificationCode = undefined;
  this.verificationExpires = undefined;
  this.verificationAttempts = 0;
  return this.save();
};

PaymentMethodSchema.methods.recordUsage = function () {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  this.consecutiveFailures = 0;
  return this.save();
};

PaymentMethodSchema.methods.recordFailure = function (reason) {
  this.lastFailedAt = new Date();
  this.failureCount += 1;
  this.consecutiveFailures += 1;

  // Auto-disable after 3 consecutive failures
  if (this.consecutiveFailures >= 3) {
    this.isActive = false;
  }

  return this.save();
};

PaymentMethodSchema.methods.maskSensitiveData = function () {
  const obj = this.toObject();
  delete obj.cardNumber;
  delete obj.cvv;
  if (this.methodType === 'upi') {
    obj.upiId = obj.upiId.replace(/^(.{2})/, (match) => match + '***');
  }
  return obj;
};

PaymentMethodSchema.methods.getDisplayName = function () {
  if (this.methodType === 'card') {
    return `${this.cardBrand.toUpperCase()} ending in ${this.cardLast4}`;
  } else if (this.methodType === 'upi') {
    return this.upiId;
  } else if (this.methodType === 'wallet') {
    return `${this.walletProvider.toUpperCase()} Wallet`;
  }
  return this.label || this.methodType;
};

// Statics
PaymentMethodSchema.statics.getDefault = function (userId, methodType) {
  return this.findOne({ userId, isDefault: true, isActive: true, methodType });
};

PaymentMethodSchema.statics.getActivePaymentMethods = function (userId) {
  return this.find({ userId, isActive: true }).sort({ createdAt: -1 });
};

PaymentMethodSchema.statics.findByFingerprint = function (fingerprint) {
  return this.findOne({ fingerprint });
};

PaymentMethodSchema.statics.createFingerprint = function (methodType, data) {
  let fingerprintData;

  if (methodType === 'card') {
    fingerprintData = `${data.cardNumber}-${data.expiryMonth}-${data.expiryYear}`;
  } else if (methodType === 'upi') {
    fingerprintData = data.upiId;
  } else if (methodType === 'wallet') {
    fingerprintData = `${data.walletProvider}-${data.userId}`;
  }

  return crypto.createHash('sha256').update(fingerprintData).digest('hex');
};

module.exports = mongoose.model('PaymentMethod', PaymentMethodSchema);
