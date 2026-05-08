const FoodDeliveryCart = require('../models/FoodDeliveryCart');
const FoodDeliveryMenuItem = require('../models/FoodDeliveryMenuItem');
const FoodDeliveryRestaurant = require('../models/FoodDeliveryRestaurant');
const FoodDeliveryAddress = require('../models/FoodDeliveryAddress');

/**
 * FoodDeliveryCartService
 * Handles all cart operations: add, remove, update, calculate prices
 */

class FoodDeliveryCartService {
  /**
   * Get or create cart for user and restaurant
   */
  async getOrCreateCart(userId, restaurantId) {
    let cart = await FoodDeliveryCart.findOne({
      userId,
      restaurantId,
      status: 'active'
    });

    if (!cart) {
      // Fetch restaurant details
      const restaurant = await FoodDeliveryRestaurant.findById(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      cart = new FoodDeliveryCart({
        userId,
        restaurantId,
        restaurantName: restaurant.name,
        restaurantImage: restaurant.profileImage,
        status: 'active'
      });

      await cart.save();
    }

    return cart;
  }

  /**
   * Get user's active cart
   */
  async getUserCart(userId, restaurantId = null) {
    const query = {
      userId,
      status: 'active'
    };

    if (restaurantId) {
      query.restaurantId = restaurantId;
    }

    const cart = await FoodDeliveryCart.findOne(query).populate(
      'items.menuItemId',
      'name imageUrl'
    );

    return cart;
  }

  /**
   * Add item to cart (validates and updates)
   */
  async addItemToCart(userId, restaurantId, itemData) {
    const {
      menuItemId,
      quantity,
      selectedVariant,
      selectedAddons,
      specialInstructions
    } = itemData;

    // Validate item exists and is available
    const item = await FoodDeliveryMenuItem.findById(menuItemId);
    if (!item) {
      throw new Error('Menu item not found');
    }

    if (!item.available || item.outOfStock || item.status !== 'active') {
      throw new Error('Item is not available');
    }

    // Verify restaurant
    if (item.restaurantId.toString() !== restaurantId) {
      throw new Error('Item does not belong to this restaurant');
    }

    // Validate variant if provided
    let variantPrice = 0;
    if (selectedVariant) {
      const variant = item.variants.find(
        v => v._id.toString() === selectedVariant.variantId
      );
      if (!variant) {
        throw new Error('Invalid variant selected');
      }
      if (!variant.available) {
        throw new Error('Selected variant is not available');
      }
      variantPrice = variant.price;
    }

    // Validate addons if provided
    const addonsList = [];
    if (selectedAddons && selectedAddons.length > 0) {
      for (const addon of selectedAddons) {
        const addonObj = item.addons.find(a => a._id.toString() === addon.addonId);
        if (!addonObj) {
          throw new Error(`Addon ${addon.addonId} not found`);
        }
        addonsList.push({
          addonId: addon.addonId,
          addonName: addonObj.name,
          addonPrice: addonObj.price
        });
      }
    }

    // Get or create cart
    let cart = await this.getOrCreateCart(userId, restaurantId);

    // Add item to cart
    const cartItemData = {
      menuItemId,
      itemName: item.name,
      basePrice: item.basePrice,
      quantity,
      selectedVariant: selectedVariant
        ? {
            variantId: selectedVariant.variantId,
            variantName: selectedVariant.variantName,
            variantPrice
          }
        : null,
      selectedAddons: addonsList,
      specialInstructions
    };

    cart.addItem(cartItemData);

    // Recalculate totals
    await this._updateCartTotals(cart, restaurantId);

    await cart.save();
    return cart;
  }

  /**
   * Remove item from cart
   */
  async removeItemFromCart(userId, restaurantId, menuItemId, variantId = null) {
    const cart = await this.getUserCart(userId, restaurantId);

    if (!cart) {
      throw new Error('Cart not found');
    }

    cart.removeItem(menuItemId, variantId);

    if (cart.isEmpty()) {
      cart.status = 'abandoned';
    }

    await this._updateCartTotals(cart, restaurantId);
    await cart.save();

    return cart;
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(userId, restaurantId, menuItemId, variantId, newQuantity) {
    if (newQuantity < 1) {
      return this.removeItemFromCart(userId, restaurantId, menuItemId, variantId);
    }

    const cart = await this.getUserCart(userId, restaurantId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    cart.updateItemQuantity(menuItemId, variantId, newQuantity);
    await this._updateCartTotals(cart, restaurantId);
    await cart.save();

    return cart;
  }

  /**
   * Clear cart
   */
  async clearCart(userId, restaurantId) {
    const cart = await this.getUserCart(userId, restaurantId);

    if (cart) {
      cart.clearCart();
      cart.status = 'abandoned';
      await cart.save();
    }

    return cart;
  }

  /**
   * Apply coupon code
   */
  async applyCoupon(userId, restaurantId, couponCode) {
    // In real implementation, fetch coupon from Coupon model
    // For now, we'll use a simplified validation
    const cart = await this.getUserCart(userId, restaurantId);
    if (!cart || cart.isEmpty()) {
      throw new Error('Cart is empty');
    }

    // Mock coupon validation
    const coupon = {
      code: couponCode,
      discountType: 'percentage',
      discountValue: 10,
      maxDiscount: 500,
      minOrderValue: 200
    };

    try {
      cart.applyCoupon(coupon);
      await cart.save();
      return cart;
    } catch (error) {
      throw new Error(`Cannot apply coupon: ${error.message}`);
    }
  }

  /**
   * Remove coupon
   */
  async removeCoupon(userId, restaurantId) {
    const cart = await this.getUserCart(userId, restaurantId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    cart.removeCoupon();
    await cart.save();

    return cart;
  }

  /**
   * Set delivery address
   */
  async setDeliveryAddress(userId, restaurantId, addressId) {
    const cart = await this.getUserCart(userId, restaurantId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    const address = await FoodDeliveryAddress.findById(addressId);
    if (!address) {
      throw new Error('Address not found');
    }

    cart.setDeliveryAddress(address);

    // Recalculate delivery charges based on distance
    await this._updateDeliveryCharges(cart, restaurantId);
    await cart.save();

    return cart;
  }

  /**
   * Add tip
   */
  async addTip(userId, restaurantId, tipAmount) {
    const cart = await this.getUserCart(userId, restaurantId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    cart.addTip(tipAmount);
    await cart.save();

    return cart;
  }

  /**
   * Set payment method
   */
  async setPaymentMethod(userId, restaurantId, paymentMethod) {
    const validMethods = ['cash', 'card', 'upi', 'wallet', 'netbanking'];
    if (!validMethods.includes(paymentMethod)) {
      throw new Error('Invalid payment method');
    }

    const cart = await this.getUserCart(userId, restaurantId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    cart.paymentMethod = paymentMethod;
    await cart.save();

    return cart;
  }

  /**
   * Add wallet amount
   */
  async addWalletAmount(userId, restaurantId, walletAmount) {
    const cart = await this.getUserCart(userId, restaurantId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    cart.walletAmount = walletAmount;
    cart.useWallet(walletAmount);
    await cart.save();

    return cart;
  }

  /**
   * Update delivery instructions
   */
  async setDeliveryInstructions(userId, restaurantId, instructions) {
    const cart = await this.getUserCart(userId, restaurantId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    cart.deliveryInstructions = instructions;
    await cart.save();

    return cart;
  }

  /**
   * Schedule delivery
   */
  async scheduleDelivery(userId, restaurantId, scheduledTime) {
    const cart = await this.getUserCart(userId, restaurantId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    const selectedTime = new Date(scheduledTime);
    const now = new Date();
    const minTime = new Date(now.getTime() + 30 * 60000); // 30 minutes from now

    if (selectedTime < minTime) {
      throw new Error('Delivery must be scheduled at least 30 minutes from now');
    }

    if (selectedTime > new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      throw new Error('Delivery cannot be scheduled more than 24 hours ahead');
    }

    cart.scheduleDeliveryFor = selectedTime;
    await cart.save();

    return cart;
  }

  /**
   * Get cart for checkout (with all details)
   */
  async getCartForCheckout(userId, restaurantId) {
    const cart = await this.getUserCart(userId, restaurantId);

    if (!cart || cart.isEmpty()) {
      throw new Error('Cart is empty');
    }

    if (cart.isExpired()) {
      cart.status = 'abandoned';
      await cart.save();
      throw new Error('Cart has expired');
    }

    return {
      ...cart.toJSON(),
      summary: cart.toSummary()
    };
  }

  /**
   * Validate cart before checkout
   */
  async validateCart(userId, restaurantId) {
    const cart = await this.getUserCart(userId, restaurantId);

    if (!cart || cart.isEmpty()) {
      throw new Error('Cart is empty');
    }

    if (cart.isExpired()) {
      throw new Error('Cart has expired');
    }

    if (!cart.deliveryAddressId) {
      throw new Error('Delivery address not selected');
    }

    const restaurant = await FoodDeliveryRestaurant.findById(restaurantId);
    if (!restaurant || restaurant.status !== 'active') {
      throw new Error('Restaurant is not available');
    }

    // Validate all items are still available
    for (const cartItem of cart.items) {
      const item = await FoodDeliveryMenuItem.findById(cartItem.menuItemId);
      if (!item || !item.available || item.outOfStock) {
        throw new Error(`Item ${cartItem.itemName} is no longer available`);
      }
    }

    return { valid: true, cart };
  }

  /**
   * Internal: Update cart totals
   */
  async _updateCartTotals(cart, restaurantId) {
    const restaurant = await FoodDeliveryRestaurant.findById(restaurantId);

    // Calculate subtotal
    const subtotal = cart.calculateSubtotal();
    cart.subtotal = subtotal;

    // Set delivery charges
    cart.deliveryCharges = restaurant?.deliveryCharges || 0;

    // Set platform fee (2% of subtotal)
    cart.platformFee = Math.round(subtotal * 0.02);

    // Set taxes (GST 5%)
    cart.taxes = Math.round(subtotal * 0.05);

    // Calculate total
    cart.total = cart.calculateTotal();
  }

  /**
   * Internal: Update delivery charges based on distance
   */
  async _updateDeliveryCharges(cart, restaurantId) {
    const restaurant = await FoodDeliveryRestaurant.findById(restaurantId);

    if (!cart.deliveryAddress?.coordinates || !restaurant?.location?.coordinates) {
      cart.deliveryCharges = restaurant?.deliveryCharges || 0;
      return;
    }

    // Calculate distance using Haversine formula
    const distance = this._calculateDistance(
      restaurant.location.coordinates[1],
      restaurant.location.coordinates[0],
      cart.deliveryAddress.coordinates.latitude,
      cart.deliveryAddress.coordinates.longitude
    );

    // Base delivery charges + per km charge
    const baseCharge = restaurant?.deliveryCharges || 0;
    const perKmCharge = 5; // ₹5 per km
    const totalCharges = Math.ceil(baseCharge + distance * perKmCharge);

    cart.deliveryCharges = totalCharges;
  }

  /**
   * Calculate distance in km using Haversine formula
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = this._toRad(lat2 - lat1);
    const dLon = this._toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRad(lat1)) *
        Math.cos(this._toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  _toRad(deg) {
    return deg * (Math.PI / 180);
  }
}

module.exports = new FoodDeliveryCartService();
