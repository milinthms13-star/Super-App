const FoodDeliveryCartService = require('../services/FoodDeliveryCartService');
const FoodDeliveryRestaurant = require('../models/FoodDeliveryRestaurant');

/**
 * FoodDeliveryCartController
 * Handles HTTP requests for cart operations
 */

class FoodDeliveryCartController {
  /**
   * GET /cart - Get user's cart
   */
  async getCart(req, res) {
    try {
      const { restaurantId } = req.params;
      const userId = req.user.id;

      const cart = await FoodDeliveryCartService.getUserCart(userId, restaurantId);

      if (!cart) {
        return res.json({
          success: true,
          data: null,
          message: 'Cart is empty'
        });
      }

      res.json({
        success: true,
        data: cart.toJSON()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /cart - Add item to cart
   */
  async addToCart(req, res) {
    try {
      const { restaurantId } = req.params;
      const userId = req.user.id;
      const { menuItemId, quantity, selectedVariant, selectedAddons, specialInstructions } =
        req.body;

      // Validate input
      if (!menuItemId || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'menuItemId and quantity are required'
        });
      }

      if (quantity < 1 || !Number.isInteger(quantity)) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a positive integer'
        });
      }

      const cart = await FoodDeliveryCartService.addItemToCart(userId, restaurantId, {
        menuItemId,
        quantity,
        selectedVariant,
        selectedAddons,
        specialInstructions
      });

      res.status(201).json({
        success: true,
        data: cart.toJSON(),
        message: 'Item added to cart'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PUT /cart/item - Update item quantity
   */
  async updateItemQuantity(req, res) {
    try {
      const { restaurantId, menuItemId } = req.params;
      const { quantity, variantId } = req.body;
      const userId = req.user.id;

      if (quantity === undefined) {
        return res.status(400).json({
          success: false,
          message: 'quantity is required'
        });
      }

      const cart = await FoodDeliveryCartService.updateItemQuantity(
        userId,
        restaurantId,
        menuItemId,
        variantId,
        quantity
      );

      res.json({
        success: true,
        data: cart.toJSON(),
        message: 'Item quantity updated'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * DELETE /cart/item - Remove item from cart
   */
  async removeFromCart(req, res) {
    try {
      const { restaurantId, menuItemId } = req.params;
      const { variantId } = req.query;
      const userId = req.user.id;

      const cart = await FoodDeliveryCartService.removeItemFromCart(
        userId,
        restaurantId,
        menuItemId,
        variantId
      );

      res.json({
        success: true,
        data: cart.toJSON(),
        message: 'Item removed from cart'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * DELETE /cart - Clear entire cart
   */
  async clearCart(req, res) {
    try {
      const { restaurantId } = req.params;
      const userId = req.user.id;

      const cart = await FoodDeliveryCartService.clearCart(userId, restaurantId);

      res.json({
        success: true,
        data: null,
        message: 'Cart cleared'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /cart/coupon - Apply coupon code
   */
  async applyCoupon(req, res) {
    try {
      const { restaurantId } = req.params;
      const { couponCode } = req.body;
      const userId = req.user.id;

      if (!couponCode) {
        return res.status(400).json({
          success: false,
          message: 'couponCode is required'
        });
      }

      const cart = await FoodDeliveryCartService.applyCoupon(userId, restaurantId, couponCode);

      res.json({
        success: true,
        data: {
          cart: cart.toJSON(),
          couponDiscount: cart.appliedCoupon?.couponDiscount || 0,
          newTotal: cart.calculateTotal()
        },
        message: 'Coupon applied successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * DELETE /cart/coupon - Remove coupon
   */
  async removeCoupon(req, res) {
    try {
      const { restaurantId } = req.params;
      const userId = req.user.id;

      const cart = await FoodDeliveryCartService.removeCoupon(userId, restaurantId);

      res.json({
        success: true,
        data: cart.toJSON(),
        message: 'Coupon removed'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /cart/address - Set delivery address
   */
  async setDeliveryAddress(req, res) {
    try {
      const { restaurantId } = req.params;
      const { addressId } = req.body;
      const userId = req.user.id;

      if (!addressId) {
        return res.status(400).json({
          success: false,
          message: 'addressId is required'
        });
      }

      const cart = await FoodDeliveryCartService.setDeliveryAddress(
        userId,
        restaurantId,
        addressId
      );

      res.json({
        success: true,
        data: {
          cart: cart.toJSON(),
          deliveryCharges: cart.deliveryCharges
        },
        message: 'Delivery address set'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /cart/tip - Add tip
   */
  async addTip(req, res) {
    try {
      const { restaurantId } = req.params;
      const { tipAmount } = req.body;
      const userId = req.user.id;

      if (tipAmount === undefined || tipAmount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Tip must be a positive number'
        });
      }

      const cart = await FoodDeliveryCartService.addTip(userId, restaurantId, tipAmount);

      res.json({
        success: true,
        data: {
          tip: cart.tip,
          total: cart.calculateTotal()
        },
        message: 'Tip added'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /cart/payment-method - Set payment method
   */
  async setPaymentMethod(req, res) {
    try {
      const { restaurantId } = req.params;
      const { paymentMethod } = req.body;
      const userId = req.user.id;

      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'paymentMethod is required'
        });
      }

      const cart = await FoodDeliveryCartService.setPaymentMethod(
        userId,
        restaurantId,
        paymentMethod
      );

      res.json({
        success: true,
        data: {
          paymentMethod: cart.paymentMethod
        },
        message: 'Payment method updated'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /cart/wallet - Add wallet amount
   */
  async addWalletAmount(req, res) {
    try {
      const { restaurantId } = req.params;
      const { walletAmount } = req.body;
      const userId = req.user.id;

      if (walletAmount === undefined || walletAmount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Wallet amount must be positive'
        });
      }

      const cart = await FoodDeliveryCartService.addWalletAmount(
        userId,
        restaurantId,
        walletAmount
      );

      res.json({
        success: true,
        data: {
          walletUsed: cart.walletUsed,
          total: cart.calculateTotal()
        },
        message: 'Wallet amount applied'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /cart/instructions - Set delivery instructions
   */
  async setDeliveryInstructions(req, res) {
    try {
      const { restaurantId } = req.params;
      const { instructions } = req.body;
      const userId = req.user.id;

      const cart = await FoodDeliveryCartService.setDeliveryInstructions(
        userId,
        restaurantId,
        instructions
      );

      res.json({
        success: true,
        data: cart.toJSON(),
        message: 'Delivery instructions updated'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /cart/schedule - Schedule delivery
   */
  async scheduleDelivery(req, res) {
    try {
      const { restaurantId } = req.params;
      const { scheduledTime } = req.body;
      const userId = req.user.id;

      if (!scheduledTime) {
        return res.status(400).json({
          success: false,
          message: 'scheduledTime is required'
        });
      }

      const cart = await FoodDeliveryCartService.scheduleDelivery(
        userId,
        restaurantId,
        scheduledTime
      );

      res.json({
        success: true,
        data: {
          scheduleDeliveryFor: cart.scheduleDeliveryFor,
          isScheduled: true
        },
        message: 'Delivery scheduled'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /cart/checkout - Get cart for checkout
   */
  async getCartForCheckout(req, res) {
    try {
      const { restaurantId } = req.params;
      const userId = req.user.id;

      const cart = await FoodDeliveryCartService.getCartForCheckout(userId, restaurantId);

      res.json({
        success: true,
        data: cart
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /cart/validate - Validate cart before checkout
   */
  async validateCart(req, res) {
    try {
      const { restaurantId } = req.params;
      const userId = req.user.id;

      const result = await FoodDeliveryCartService.validateCart(userId, restaurantId);

      res.json({
        success: true,
        data: {
          valid: result.valid,
          itemCount: result.cart.getItemCount(),
          total: result.cart.calculateTotal()
        },
        message: 'Cart is valid for checkout'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new FoodDeliveryCartController();
