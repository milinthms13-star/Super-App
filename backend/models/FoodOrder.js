const mongoose = require('mongoose');

const foodOrderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
  items: [{
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    itemName: String,
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
    },
    category: String,
    basePrice: Number,
    selectedVariant: {
      id: String,
      name: String,
      label: String,
      priceModifier: Number,
    },
    selectedAddons: [{
      id: String,
      name: String,
      price: Number,
    }],
    addonsPrice: {
      type: Number,
      default: 0,
    },
    specialInstructions: String,
    customizations: {
      type: Map,
      of: String,
    },
  }],
  subtotal: {
    type: Number,
    default: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  coupon: {
    code: String,
    discountType: String,
    discountValue: Number,
    discountAmount: {
      type: Number,
      default: 0,
    },
  },
  deliveryCharge: {
    type: Number,
    default: 0,
  },
  platformFee: {
    type: Number,
    default: 0,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  tipAmount: {
    type: Number,
    default: 0,
  },
  walletUsed: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  payableAmount: {
    type: Number,
    default: 0,
  },
  deliveryAddress: {
    street: String,
    city: String,
    pincode: String,
    lat: Number,
    lng: Number,
  },
  deliveryInstructions: String,
  scheduleDeliveryFor: Date,
  isScheduled: {
    type: Boolean,
    default: false,
  },
  scheduledWindowLabel: String,
  paymentMethod: {
    type: String,
    enum: ['cod', 'wallet', 'upi', 'card', 'netbanking'],
    default: 'cod',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  orderStatus: {
    type: String,
    enum: ['placed', 'confirmed', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'],
    default: 'placed',
  },
  refundStatus: {
    type: String,
    enum: ['none', 'pending', 'completed'],
    default: 'none',
  },
  refundAmount: {
    type: Number,
    default: 0,
  },
  refundedToWallet: {
    type: Boolean,
    default: false,
  },
  refundedAt: Date,
  cancellationReason: String,
  cancellationRequestedBy: String,
  cancelledAt: Date,
  statusTimeline: [{
    status: String,
    note: String,
    updatedBy: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
  estimatedDelivery: Date,
  actualDelivery: Date,
  etaSnapshot: {
    preparationMinutes: Number,
    deliveryMinutes: Number,
    bufferMinutes: Number,
    totalMinutes: Number,
    trafficMultiplier: Number,
    routeStrategy: String,
    estimatedArrivalAt: Date,
    computedAt: Date,
  },
  trackingId: String,
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
  },
  driverProfile: {
    id: String,
    userId: String,
    name: String,
    phone: String,
    email: String,
    rating: Number,
    vehicleNumber: String,
    vehicleType: String,
  },
  assignedAt: Date,
  assignedBy: String,
  assignmentMode: {
    type: String,
    enum: ['manual', 'auto'],
    default: 'manual',
  },
  pickedUpAt: Date,
  tracking: {
    status: {
      type: String,
      enum: ['unassigned', 'assigned', 'picked-up', 'on-the-way', 'nearby', 'arrived', 'completed'],
      default: 'unassigned',
    },
    restaurantLocation: {
      lat: Number,
      lng: Number,
      address: String,
    },
    deliveryLocation: {
      lat: Number,
      lng: Number,
      address: String,
    },
    currentLocation: {
      lat: Number,
      lng: Number,
      accuracy: Number,
      speed: Number,
      updatedAt: Date,
    },
    distanceFromRestaurantKm: Number,
    distanceToCustomerKm: Number,
    estimatedArrivalMinutes: Number,
    trafficMultiplier: Number,
    routeStrategy: String,
    lastUpdatedAt: Date,
    routeHistory: [
      {
        lat: Number,
        lng: Number,
        accuracy: Number,
        speed: Number,
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  disputes: [
    {
      id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString(),
      },
      issueType: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        enum: ['open', 'investigating', 'resolved', 'rejected'],
        default: 'open',
      },
      createdByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      createdByRole: String,
      createdByName: String,
      resolutionNote: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
      resolvedAt: Date,
      resolvedBy: String,
    },
  ],
  loyalty: {
    pointsEarned: {
      type: Number,
      default: 0,
    },
    pointsRedeemed: {
      type: Number,
      default: 0,
    },
    rewardDiscountAmount: {
      type: Number,
      default: 0,
    },
    credited: {
      type: Boolean,
      default: false,
    },
    creditedAt: Date,
  },
  referral: {
    referralCodeApplied: String,
    referralDiscountAmount: {
      type: Number,
      default: 0,
    },
    referrerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    referrerRewardGranted: {
      type: Boolean,
      default: false,
    },
  },
  recommendations: {
    generatedAt: Date,
    algorithm: String,
    suggestionIds: [String],
  },
  riderSafety: {
    activeSos: {
      type: Boolean,
      default: false,
    },
    lastSosAt: Date,
    sosEvents: [{
      triggeredAt: {
        type: Date,
        default: Date.now,
      },
      message: String,
      lat: Number,
      lng: Number,
      acknowledgedAt: Date,
      acknowledgedBy: String,
      status: {
        type: String,
        enum: ['open', 'acknowledged', 'resolved'],
        default: 'open',
      },
    }],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

foodOrderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('FoodOrder', foodOrderSchema);
