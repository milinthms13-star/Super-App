/**
 * GuestCheckout Model
 * Tracks guest users and their orders before conversion to registered users
 */

const mongoose = require('mongoose');

const GuestCheckoutSchema = new mongoose.Schema({
  guestId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    validate: {
      validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: 'Invalid email address'
    }
  },
  phoneNumber: {
    type: String,
    validate: {
      validator: (v) => !v || /^[6-9]\d{9}$/.test(v),
      message: 'Invalid phone number'
    }
  },
  guestName: String,
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  shippingAddress: {
    houseName: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: String,
    landmark: String,
    coordinates: [Number]
  },
  billingAddress: {
    houseName: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },
  savedPaymentMethods: [{
    paymentMethodId: String,
    type: String, // card, upi, wallet
    lastUsed: Date
  }],
  shoppingHistory: {
    totalOrdersPlaced: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    lastOrderDate: Date,
    favoriteCategories: [String],
    frequentlyBoughtProducts: [mongoose.Schema.Types.ObjectId]
  },
  isConverted: {
    type: Boolean,
    default: false
  },
  convertedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  convertedAt: Date,
  conversionMethod: String, // email_link, phone_otp, social_login
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: true
    },
    orderUpdates: {
      type: Boolean,
      default: true
    },
    promotionalEmails: {
      type: Boolean,
      default: false
    }
  },
  lastActivityAt: Date,
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // Auto-delete after 1 year
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes
GuestCheckoutSchema.index({ email: 1, createdAt: -1 });
GuestCheckoutSchema.index({ phoneNumber: 1, createdAt: -1 });
GuestCheckoutSchema.index({ convertedUserId: 1 });
GuestCheckoutSchema.index({ isConverted: 1, convertedAt: -1 });

// Static methods
GuestCheckoutSchema.statics.createGuest = async function(email, phoneNumber = null) {
  const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

  const guest = new this({
    guestId,
    email,
    phoneNumber,
    expiresAt
  });

  await guest.save();
  return guest;
};

// Instance methods
GuestCheckoutSchema.methods.addOrder = async function(orderId) {
  if (!this.orders.includes(orderId)) {
    this.orders.push(orderId);
    this.shoppingHistory.totalOrdersPlaced = this.orders.length;
    this.lastActivityAt = new Date();
    await this.save();
  }
};

GuestCheckoutSchema.methods.convertToUser = async function(userId, conversionMethod = 'email_link') {
  this.isConverted = true;
  this.convertedUserId = userId;
  this.convertedAt = new Date();
  this.conversionMethod = conversionMethod;
  await this.save();
};

GuestCheckoutSchema.methods.getConversionUrl = function(baseUrl = 'https://nilahub.app') {
  const token = Buffer.from(`${this.guestId}:${this.email}`).toString('base64');
  return `${baseUrl}/convert-guest?token=${token}`;
};

GuestCheckoutSchema.methods.updateShoppingHistory = async function(productId, category) {
  if (!this.shoppingHistory.frequentlyBoughtProducts.includes(productId)) {
    this.shoppingHistory.frequentlyBoughtProducts.push(productId);
  }
  if (!this.shoppingHistory.favoriteCategories.includes(category)) {
    this.shoppingHistory.favoriteCategories.push(category);
  }
  this.lastActivityAt = new Date();
  await this.save();
};

module.exports = mongoose.model('GuestCheckout', GuestCheckoutSchema);
