const mongoose = require('mongoose');

const { Schema } = mongoose;

const locationSchema = new Schema(
  {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  { _id: false }
);

const openingHourSchema = new Schema(
  {
    day: { type: String, required: true, trim: true },
    open: { type: String, trim: true, default: '09:00' },
    close: { type: String, trim: true, default: '21:00' },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    productId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, default: 0, min: 0 },
    stockQty: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    prescriptionRequired: { type: Boolean, default: false },
    imageUrl: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const settlementSchema = new Schema(
  {
    settlementId: { type: String, required: true, trim: true },
    amount: { type: Number, default: 0, min: 0 },
    status: { type: String, trim: true, default: 'pending' },
    periodStart: { type: Date },
    periodEnd: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderItemSchema = new Schema(
  {
    shopId: { type: String, required: true, trim: true },
    shopName: { type: String, trim: true, default: '' },
    productId: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    prescriptionRequired: { type: Boolean, default: false },
  },
  { _id: false }
);

const timelineSchema = new Schema(
  {
    status: { type: String, required: true, trim: true },
    note: { type: String, trim: true, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const payoutSchema = new Schema(
  {
    payoutId: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, trim: true, default: 'requested' },
    requestedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const kycDocSchema = new Schema(
  {
    docType: { type: String, trim: true, default: '' },
    fileName: { type: String, trim: true, default: '' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const HyperlocalShopSchema = new Schema(
  {
    shopId: { type: String, required: true, unique: true, index: true },
    ownerEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    ownerPhone: { type: String, trim: true, default: '' },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true, default: '' },
    open: { type: Boolean, default: true, index: true },
    rating: { type: Number, default: 4.3, min: 0, max: 5 },
    deliveryRadiusKm: { type: Number, default: 5, min: 1, max: 25 },
    minOrderAmount: { type: Number, default: 99, min: 0 },
    deliveryCharge: { type: Number, default: 30, min: 0 },
    taxPercent: { type: Number, default: 5, min: 0, max: 28 },
    openingHours: { type: [openingHourSchema], default: [] },
    location: { type: locationSchema, default: () => ({ lat: 0, lng: 0 }) },
    addressText: { type: String, trim: true, default: '' },
    approvalStatus: { type: String, trim: true, default: 'pending', index: true },
    products: { type: [productSchema], default: [] },
    settlementHistory: { type: [settlementSchema], default: [] },
    sales: {
      totalOrders: { type: Number, default: 0, min: 0 },
      grossSales: { type: Number, default: 0, min: 0 },
      lastOrderAt: { type: Date },
    },
  },
  { timestamps: true }
);

const HyperlocalAddressSchema = new Schema(
  {
    addressId: { type: String, required: true, unique: true, index: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    fullName: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true, default: '' },
    landmark: { type: String, trim: true, default: '' },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    location: { type: locationSchema, default: () => ({ lat: 0, lng: 0 }) },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const HyperlocalOrderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    userPhone: { type: String, trim: true, default: '' },
    paymentMode: { type: String, trim: true, required: true },
    deliveryType: { type: String, trim: true, default: 'instant' },
    address: {
      fullName: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      line1: { type: String, trim: true, default: '' },
      line2: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      pincode: { type: String, trim: true, default: '' },
      location: { type: locationSchema, default: () => ({ lat: 0, lng: 0 }) },
    },
    items: { type: [orderItemSchema], default: [] },
    multiShopMode: { type: Boolean, default: false },
    isEmergencyMedicine: { type: Boolean, default: false },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryCharge: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    couponCode: { type: String, trim: true, default: '' },
    couponDiscount: { type: Number, default: 0, min: 0 },
    finalPayable: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, trim: true, index: true },
    timeline: { type: [timelineSchema], default: [] },
    assignedPartnerId: { type: String, trim: true, default: '' },
    partnerLocation: { type: locationSchema, default: () => ({ lat: 0, lng: 0 }) },
    navigationLink: { type: String, trim: true, default: '' },
    prescriptionFile: { type: String, trim: true, default: '' },
    complaintStatus: { type: String, trim: true, default: '' },
    refundStatus: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

const HyperlocalPartnerSchema = new Schema(
  {
    partnerId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    area: { type: String, trim: true, default: '' },
    vehicleType: { type: String, trim: true, default: 'Bike' },
    online: { type: Boolean, default: false, index: true },
    approvalStatus: { type: String, trim: true, default: 'pending', index: true },
    currentOrderId: { type: String, trim: true, default: '' },
    walletBalance: { type: Number, default: 0, min: 0 },
    payoutHistory: { type: [payoutSchema], default: [] },
    kycStatus: { type: String, trim: true, default: 'pending' },
    kycDocs: { type: [kycDocSchema], default: [] },
  },
  { timestamps: true }
);

const HyperlocalCouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    type: { type: String, required: true, trim: true },
    value: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const HyperlocalSubscriptionSchema = new Schema(
  {
    subscriptionId: { type: String, required: true, unique: true, index: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    planCode: { type: String, required: true, trim: true },
    status: { type: String, trim: true, default: 'active' },
    amount: { type: Number, default: 0, min: 0 },
    validUntil: { type: Date },
  },
  { timestamps: true }
);

const HyperlocalWalletSchema = new Schema(
  {
    walletId: { type: String, required: true, unique: true, index: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    balance: { type: Number, default: 0, min: 0 },
    cashbackBalance: { type: Number, default: 0, min: 0 },
    transactions: {
      type: [
        {
          txId: { type: String, required: true, trim: true },
          type: { type: String, trim: true, default: 'credit' },
          amount: { type: Number, min: 0, default: 0 },
          note: { type: String, trim: true, default: '' },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

const HyperlocalAdSchema = new Schema(
  {
    adId: { type: String, required: true, unique: true, index: true },
    shopId: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    budget: { type: Number, min: 0, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const HyperlocalAdminConfigSchema = new Schema(
  {
    configId: { type: String, required: true, unique: true, index: true },
    zonePricing: {
      zoneName: { type: String, trim: true, default: 'Default Zone' },
      baseDeliveryCharge: { type: Number, default: 30, min: 0 },
      perKmCharge: { type: Number, default: 8, min: 0 },
      maxDeliveryRadiusKm: { type: Number, default: 10, min: 1, max: 30 },
    },
    surgePricing: {
      enabled: { type: Boolean, default: false },
      multiplier: { type: Number, default: 1, min: 1, max: 3 },
      reason: { type: String, trim: true, default: '' },
    },
    commissionPercent: { type: Number, default: 12, min: 0, max: 40 },
    platformFee: { type: Number, default: 5, min: 0, max: 200 },
    emergencyMedicineFee: { type: Number, default: 20, min: 0, max: 300 },
  },
  { timestamps: true }
);

module.exports = {
  HyperlocalShop: mongoose.model('HyperlocalShop', HyperlocalShopSchema),
  HyperlocalAddress: mongoose.model('HyperlocalAddress', HyperlocalAddressSchema),
  HyperlocalOrder: mongoose.model('HyperlocalOrder', HyperlocalOrderSchema),
  HyperlocalPartner: mongoose.model('HyperlocalPartner', HyperlocalPartnerSchema),
  HyperlocalCoupon: mongoose.model('HyperlocalCoupon', HyperlocalCouponSchema),
  HyperlocalSubscription: mongoose.model('HyperlocalSubscription', HyperlocalSubscriptionSchema),
  HyperlocalWallet: mongoose.model('HyperlocalWallet', HyperlocalWalletSchema),
  HyperlocalAd: mongoose.model('HyperlocalAd', HyperlocalAdSchema),
  HyperlocalAdminConfig: mongoose.model('HyperlocalAdminConfig', HyperlocalAdminConfigSchema),
};
