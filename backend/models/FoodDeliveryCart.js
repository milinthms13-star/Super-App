const mongoose = require('mongoose');

/**
 * FoodDeliveryCart Model
 * Manages shopping cart for food delivery customers
 * 
 * Features:
 * - Multiple items from single restaurant
 * - Item variants (size selections)
 * - Addon customization (toppings, extras)
 * - Special instructions per item
 * - Cart-level discounts and coupons
 * - Delivery preferences
 */

const CartItemSchema = new mongoose.Schema(
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
      min: 1,
      default: 1
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
    specialInstructions: {
      type: String,
      maxlength: 500
    },
    itemTotal: {
      type: Number,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

// Calculate item total when saved
CartItemSchema.pre('validate', function (next) {
  const item = this;
  const basePrice = item.basePrice || 0;
  const variantPrice = item.selectedVariant?.variantPrice || 0;
  const addonsPrice = item.selectedAddons.reduce((sum, addon) => sum + (addon.addonPrice || 0), 0);
  item.itemTotal = (basePrice + variantPrice + addonsPrice) * item.quantity;
  next();
});

const FoodDeliveryCartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryUser',
      required: true,
      index: true
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryRestaurant',
      required: true
    },
    restaurantName: String,
    restaurantImage: String,
    items: [CartItemSchema],

    // Delivery details
    deliveryAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryAddress'
    },
    deliveryAddress: {
      streetAddress: String,
      city: String,
      postalCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    deliveryInstructions: {
      type: String,
      maxlength: 500
    },
    scheduleDeliveryFor: Date, // For scheduled orders (null = ASAP)

    // Pricing breakdown
    subtotal: {
      type: Number,
      default: 0
    },
    itemDiscount: {
      type: Number,
      default: 0
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

    // Discounts and coupons
    appliedCoupon: {
      couponCode: String,
      discountType: {
        type: String,
        enum: ['percentage', 'fixed', 'freeDelivery'],
        default: 'percentage'
      },
      discountValue: Number,
      maxDiscount: Number,
      minOrderValue: Number,
      couponDiscount: {
        type: Number,
        default: 0
      }
    },

    // Wallet/payment
    walletAmount: {
      type: Number,
      default: 0
    },
    walletUsed: {
      type: Number,
      default: 0
    },

    // Tip
    tip: {
      type: Number,
      default: 0,
      min: 0
    },

    // Total
    total: {
      type: Number,
      default: 0
    },

    // Payment method
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'wallet', 'netbanking'],
      default: 'cash'
    },

    // Cart status
    status: {
      type: String,
      enum: ['active', 'abandoned', 'converted'],
      default: 'active'
    },

    // Special offers
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

    // Metadata
    lastModified: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
  },
  {
    timestamps: true,
    indexes: [
      { userId: 1, restaurantId: 1 },
      { userId: 1, status: 1 },
      { expiresAt: 1 }
    ]
  }
);

/**
 * Add item to cart
 */
FoodDeliveryCartSchema.methods.addItem = function (itemData) {
  const { menuItemId, itemName, basePrice, quantity, selectedVariant, selectedAddons } = itemData;

  // Check if item already exists (same variant and addons)
  const existingItemIndex = this.items.findIndex(
    item =>
      item.menuItemId.toString() === menuItemId.toString() &&
      JSON.stringify(item.selectedVariant) === JSON.stringify(selectedVariant) &&
      JSON.stringify(item.selectedAddons) === JSON.stringify(selectedAddons)
  );

  if (existingItemIndex !== -1) {
    // Update quantity if same item exists
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].itemTotal =
      (this.items[existingItemIndex].basePrice +
        (this.items[existingItemIndex].selectedVariant?.variantPrice || 0) +
        this.items[existingItemIndex].selectedAddons.reduce((sum, addon) => sum + addon.addonPrice, 0)) *
      this.items[existingItemIndex].quantity;
  } else {
    // Add new item
    const variantPrice = selectedVariant?.variantPrice || 0;
    const addonsPrice = selectedAddons?.reduce((sum, addon) => sum + addon.addonPrice, 0) || 0;
    const itemTotal = (basePrice + variantPrice + addonsPrice) * quantity;

    this.items.push({
      menuItemId,
      itemName,
      basePrice,
      quantity,
      selectedVariant,
      selectedAddons,
      itemTotal
    });
  }

  this.lastModified = new Date();
  return this;
};

/**
 * Remove item from cart
 */
FoodDeliveryCartSchema.methods.removeItem = function (menuItemId, variantId, addonIds) {
  this.items = this.items.filter(item => {
    const isSameItem = item.menuItemId.toString() === menuItemId.toString();
    const isSameVariant = !variantId || item.selectedVariant?.variantId?.toString() === variantId;
    const isSameAddons =
      !addonIds ||
      JSON.stringify(
        item.selectedAddons.map(a => a.addonId.toString()).sort()
      ) === JSON.stringify(addonIds.map(id => id.toString()).sort());

    return !(isSameItem && isSameVariant && isSameAddons);
  });

  this.lastModified = new Date();
  return this;
};

/**
 * Update item quantity
 */
FoodDeliveryCartSchema.methods.updateItemQuantity = function (
  menuItemId,
  variantId,
  newQuantity
) {
  if (newQuantity < 1) {
    return this.removeItem(menuItemId, variantId);
  }

  const item = this.items.find(
    i =>
      i.menuItemId.toString() === menuItemId.toString() &&
      (!variantId || i.selectedVariant?.variantId?.toString() === variantId)
  );

  if (item) {
    item.quantity = newQuantity;
    const variantPrice = item.selectedVariant?.variantPrice || 0;
    const addonsPrice = item.selectedAddons.reduce((sum, addon) => sum + addon.addonPrice, 0);
    item.itemTotal = (item.basePrice + variantPrice + addonsPrice) * newQuantity;
  }

  this.lastModified = new Date();
  return this;
};

/**
 * Clear all items from cart
 */
FoodDeliveryCartSchema.methods.clearCart = function () {
  this.items = [];
  this.appliedCoupon = null;
  this.restaurantOffer = null;
  this.walletUsed = 0;
  this.tip = 0;
  this.lastModified = new Date();
  return this;
};

/**
 * Calculate cart subtotal
 */
FoodDeliveryCartSchema.methods.calculateSubtotal = function () {
  return this.items.reduce((sum, item) => sum + item.itemTotal, 0);
};

/**
 * Get item count
 */
FoodDeliveryCartSchema.methods.getItemCount = function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
};

/**
 * Calculate total with all charges
 */
FoodDeliveryCartSchema.methods.calculateTotal = function () {
  const subtotal = this.calculateSubtotal();
  const itemDiscount = this.itemDiscount || 0;
  const deliveryCharges = this.deliveryCharges || 0;
  const platformFee = this.platformFee || 0;
  const taxes = this.taxes || 0;
  const couponDiscount = this.appliedCoupon?.couponDiscount || 0;
  const restaurantOfferDiscount = this.restaurantOffer?.appliedDiscount || 0;
  const tip = this.tip || 0;

  const total =
    subtotal -
    itemDiscount -
    couponDiscount -
    restaurantOfferDiscount +
    deliveryCharges +
    platformFee +
    taxes +
    tip -
    this.walletUsed;

  return Math.max(0, total);
};

/**
 * Apply coupon code
 */
FoodDeliveryCartSchema.methods.applyCoupon = function (couponData) {
  const subtotal = this.calculateSubtotal();

  // Validate minimum order value
  if (couponData.minOrderValue && subtotal < couponData.minOrderValue) {
    throw new Error(
      `Minimum order value of ₹${couponData.minOrderValue} required for this coupon`
    );
  }

  // Calculate discount
  let discount = 0;
  if (couponData.discountType === 'percentage') {
    discount = (subtotal * couponData.discountValue) / 100;
    if (couponData.maxDiscount) {
      discount = Math.min(discount, couponData.maxDiscount);
    }
  } else if (couponData.discountType === 'fixed') {
    discount = couponData.discountValue;
  } else if (couponData.discountType === 'freeDelivery') {
    discount = this.deliveryCharges || 0;
  }

  this.appliedCoupon = {
    ...couponData,
    couponDiscount: discount
  };

  this.lastModified = new Date();
  return this;
};

/**
 * Remove coupon
 */
FoodDeliveryCartSchema.methods.removeCoupon = function () {
  this.appliedCoupon = null;
  this.lastModified = new Date();
  return this;
};

/**
 * Apply restaurant offer
 */
FoodDeliveryCartSchema.methods.applyRestaurantOffer = function (offerData) {
  const subtotal = this.calculateSubtotal();

  let discount = 0;
  if (offerData.discountType === 'percentage') {
    discount = (subtotal * offerData.discountValue) / 100;
  } else {
    discount = offerData.discountValue;
  }

  this.restaurantOffer = {
    ...offerData,
    appliedDiscount: discount
  };

  this.lastModified = new Date();
  return this;
};

/**
 * Use wallet amount
 */
FoodDeliveryCartSchema.methods.useWallet = function (amount) {
  this.walletUsed = Math.min(amount, this.walletAmount || 0);
  this.lastModified = new Date();
  return this;
};

/**
 * Add tip
 */
FoodDeliveryCartSchema.methods.addTip = function (amount) {
  if (amount < 0) throw new Error('Tip cannot be negative');
  this.tip = amount;
  this.lastModified = new Date();
  return this;
};

/**
 * Set delivery address
 */
FoodDeliveryCartSchema.methods.setDeliveryAddress = function (addressData) {
  this.deliveryAddressId = addressData._id;
  this.deliveryAddress = {
    streetAddress: addressData.streetAddress,
    city: addressData.city,
    postalCode: addressData.postalCode,
    coordinates: addressData.coordinates
  };
  this.lastModified = new Date();
  return this;
};

/**
 * Is cart empty
 */
FoodDeliveryCartSchema.methods.isEmpty = function () {
  return this.items.length === 0;
};

/**
 * Is cart expired
 */
FoodDeliveryCartSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

/**
 * Get cart summary (for response)
 */
FoodDeliveryCartSchema.methods.toSummary = function () {
  return {
    cartId: this._id,
    restaurantId: this.restaurantId,
    restaurantName: this.restaurantName,
    itemCount: this.getItemCount(),
    itemsCount: this.items.length,
    subtotal: this.calculateSubtotal(),
    itemDiscount: this.itemDiscount,
    couponDiscount: this.appliedCoupon?.couponDiscount || 0,
    restaurantOfferDiscount: this.restaurantOffer?.appliedDiscount || 0,
    deliveryCharges: this.deliveryCharges,
    platformFee: this.platformFee,
    taxes: this.taxes,
    tip: this.tip,
    total: this.calculateTotal(),
    appliedCoupon: this.appliedCoupon?.couponCode,
    walletUsed: this.walletUsed
  };
};

/**
 * Get full cart details (for response)
 */
FoodDeliveryCartSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.itemCount = this.getItemCount();
  obj.subtotal = this.calculateSubtotal();
  obj.total = this.calculateTotal();
  obj.isEmpty = this.isEmpty();
  obj.isExpired = this.isExpired();
  return obj;
};

// Create TTL index for automatic deletion of expired carts
FoodDeliveryCartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('FoodDeliveryCart', FoodDeliveryCartSchema);
