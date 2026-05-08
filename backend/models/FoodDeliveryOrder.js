const mongoose = require('mongoose');

/**
 * FoodDeliveryOrder Model
 * Represents a complete food delivery order with all details
 * 
 * Features:
 * - Order from cart
 * - Order status tracking
 * - Delivery tracking
 * - Payment management
 * - Refund handling
 * - Order history
 */

const OrderItemSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryMenuItem',
      required: true
    },
    itemName: String,
    basePrice: Number,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    selectedVariant: {
      variantId: mongoose.Schema.Types.ObjectId,
      variantName: String,
      variantPrice: Number
    },
    selectedAddons: [
      {
        addonId: mongoose.Schema.Types.ObjectId,
        addonName: String,
        addonPrice: Number
      }
    ],
    specialInstructions: String,
    itemTotal: Number,
    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'delivered', 'cancelled'],
      default: 'pending'
    }
  },
  { _id: true }
);

const OrderSchema = new mongoose.Schema(
  {
    // Reference information
    orderId: {
      type: String,
      unique: true,
      required: true,
      index: true
    }, // Format: FO-YYYYMMDD-XXXXX
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryUser',
      required: true,
      index: true
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryRestaurant',
      required: true,
      index: true
    },
    restaurantName: String,
    restaurantPhone: String,

    // Items in order
    items: [OrderItemSchema],

    // Delivery details
    deliveryAddress: {
      streetAddress: String,
      city: String,
      postalCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    deliveryAddressId: mongoose.Schema.Types.ObjectId,
    deliveryInstructions: String,
    deliveryPersonName: String,
    deliveryPersonPhone: String,
    deliveryPersonImage: String,
    deliveryPersonRating: Number,
    scheduleDeliveryFor: Date,
    isScheduled: {
      type: Boolean,
      default: false
    },

    // Order status
    status: {
      type: String,
      enum: [
        'confirmed',
        'preparing',
        'ready',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned'
      ],
      default: 'confirmed',
      index: true
    },

    // Status timeline
    statusTimeline: [
      {
        status: String,
        timestamp: {
          type: Date,
          default: Date.now
        },
        note: String,
        updatedBy: String // 'customer', 'restaurant', 'rider', 'system'
      }
    ],

    // ETA and timing
    estimatedPrepTime: Number, // minutes
    estimatedDeliveryTime: Number, // minutes
    actualDeliveryTime: Date,
    prepStartedAt: Date,
    readyAt: Date,
    outForDeliveryAt: Date,
    deliveredAt: Date,

    // Pricing breakdown
    subtotal: {
      type: Number,
      required: true
    },
    itemDiscount: {
      type: Number,
      default: 0
    },
    appliedCoupon: {
      couponCode: String,
      discountType: String,
      discountValue: Number,
      couponDiscount: {
        type: Number,
        default: 0
      }
    },
    restaurantOffer: {
      offerId: mongoose.Schema.Types.ObjectId,
      title: String,
      discountType: String,
      discountValue: Number,
      appliedDiscount: {
        type: Number,
        default: 0
      }
    },
    deliveryCharges: {
      type: Number,
      default: 0
    },
    platformFee: {
      type: Number,
      default: 0
    },
    taxes: {
      type: Number,
      default: 0
    },
    tip: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    },

    // Payment
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'wallet', 'netbanking'],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    walletUsed: {
      type: Number,
      default: 0
    },

    // Ratings and reviews
    rating: {
      foodQuality: Number, // 1-5
      delivery: Number, // 1-5
      packaging: Number, // 1-5
      restaurantRating: Number, // 1-5
      riderRating: Number, // 1-5
      comment: String,
      ratedAt: Date,
      feedbackProvided: {
        type: Boolean,
        default: false
      }
    },

    // Cancellation
    cancellationReason: String,
    cancellationRequestedBy: String, // 'customer', 'restaurant'
    cancelledAt: Date,
    cancellationRefundAmount: {
      type: Number,
      default: 0
    },

    // Issue/complaint
    issues: [
      {
        issueType: String, // 'item_missing', 'item_damaged', 'late_delivery', 'quality_issue'
        description: String,
        reportedAt: Date,
        status: {
          type: String,
          enum: ['open', 'in_progress', 'resolved', 'rejected'],
          default: 'open'
        }
      }
    ],

    // Metadata
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    indexes: [
      { userId: 1, createdAt: -1 },
      { restaurantId: 1, status: 1 },
      { orderId: 1 }
    ]
  }
);

/**
 * Generate order ID
 */
OrderSchema.statics.generateOrderId = async function () {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await this.countDocuments({
    createdAt: {
      $gte: new Date().setHours(0, 0, 0, 0),
      $lte: new Date().setHours(23, 59, 59, 999)
    }
  });

  const number = String(count + 1).padStart(5, '0');
  return `FO-${today}-${number}`;
};

/**
 * Add status update to timeline
 */
OrderSchema.methods.updateStatus = function (newStatus, note = '', updatedBy = 'system') {
  this.status = newStatus;

  this.statusTimeline.push({
    status: newStatus,
    timestamp: new Date(),
    note,
    updatedBy
  });

  // Update specific timestamps based on status
  switch (newStatus) {
    case 'preparing':
      this.prepStartedAt = new Date();
      break;
    case 'ready':
      this.readyAt = new Date();
      break;
    case 'out_for_delivery':
      this.outForDeliveryAt = new Date();
      break;
    case 'delivered':
      this.deliveredAt = new Date();
      break;
  }

  this.updatedAt = new Date();
  return this;
};

/**
 * Can be cancelled
 */
OrderSchema.methods.canBeCancelled = function () {
  const nonCancellableStatuses = ['out_for_delivery', 'delivered', 'cancelled'];
  return !nonCancellableStatuses.includes(this.status);
};

/**
 * Cancel order
 */
OrderSchema.methods.cancel = function (reason, requestedBy) {
  if (!this.canBeCancelled()) {
    throw new Error(`Order cannot be cancelled in ${this.status} status`);
  }

  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancellationRequestedBy = requestedBy;
  this.cancelledAt = new Date();

  // Calculate refund (full refund if cancelled before preparation, partial if already preparing)
  if (this.status === 'confirmed') {
    this.cancellationRefundAmount = this.total;
  } else if (this.status === 'preparing') {
    this.cancellationRefundAmount = this.total * 0.5; // 50% refund
  }

  this.updateStatus('cancelled', `Cancelled by ${requestedBy}: ${reason}`, requestedBy);
  return this;
};

/**
 * Can be rated
 */
OrderSchema.methods.canBeRated = function () {
  return ['delivered'].includes(this.status) && !this.rating?.feedbackProvided;
};

/**
 * Add rating
 */
OrderSchema.methods.addRating = function (ratingData) {
  if (!this.canBeRated()) {
    throw new Error('Order cannot be rated in current status');
  }

  this.rating = {
    ...ratingData,
    ratedAt: new Date(),
    feedbackProvided: true
  };

  this.updatedAt = new Date();
  return this;
};

/**
 * Report issue
 */
OrderSchema.methods.reportIssue = function (issueType, description) {
  this.issues.push({
    issueType,
    description,
    reportedAt: new Date(),
    status: 'open'
  });

  this.updatedAt = new Date();
  return this;
};

/**
 * Get order summary
 */
OrderSchema.methods.toSummary = function () {
  return {
    orderId: this.orderId,
    restaurantName: this.restaurantName,
    itemCount: this.items.length,
    status: this.status,
    total: this.total,
    deliveryAddress: this.deliveryAddress,
    estimatedDeliveryTime: this.estimatedDeliveryTime,
    createdAt: this.createdAt
  };
};

/**
 * Get order details
 */
OrderSchema.methods.getDetails = function () {
  return {
    orderId: this.orderId,
    restaurantId: this.restaurantId,
    restaurantName: this.restaurantName,
    status: this.status,
    items: this.items,
    subtotal: this.subtotal,
    total: this.total,
    deliveryCharges: this.deliveryCharges,
    paymentMethod: this.paymentMethod,
    deliveryAddress: this.deliveryAddress,
    estimatedDeliveryTime: this.estimatedDeliveryTime,
    createdAt: this.createdAt,
    rating: this.rating?.feedbackProvided ? this.rating : null,
    canCancel: this.canBeCancelled(),
    canRate: this.canBeRated()
  };
};

module.exports = mongoose.model('FoodDeliveryOrder', OrderSchema);
