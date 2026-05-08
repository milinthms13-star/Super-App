const express = require('express');
const FoodDeliveryCartController = require('../controllers/FoodDeliveryCartController');
const FoodDeliveryOrderController = require('../controllers/FoodDeliveryOrderController');
const FoodDeliveryCartOrderValidations = require('../middleware/FoodDeliveryCartOrderValidations');
const { authenticateToken } = require('../middleware/auth');

const Validations = FoodDeliveryCartOrderValidations;
const router = express.Router();

/**
 * CART ENDPOINTS
 */

/**
 * GET /restaurants/:restaurantId/cart
 * Get user's cart for a restaurant
 */
router.get(
  '/restaurants/:restaurantId/cart',
  authenticateToken,
  FoodDeliveryCartController.getCart
);

/**
 * POST /restaurants/:restaurantId/cart
 * Add item to cart
 */
router.post(
  '/restaurants/:restaurantId/cart',
  authenticateToken,
  Validations.addToCartValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryCartController.addToCart
);

/**
 * PUT /restaurants/:restaurantId/cart/:menuItemId
 * Update item quantity in cart
 */
router.put(
  '/restaurants/:restaurantId/cart/:menuItemId',
  authenticateToken,
  Validations.updateItemQuantityValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryCartController.updateItemQuantity
);

/**
 * DELETE /restaurants/:restaurantId/cart/:menuItemId
 * Remove item from cart
 */
router.delete(
  '/restaurants/:restaurantId/cart/:menuItemId',
  authenticateToken,
  FoodDeliveryCartController.removeFromCart
);

/**
 * DELETE /restaurants/:restaurantId/cart
 * Clear entire cart
 */
router.delete(
  '/restaurants/:restaurantId/cart',
  authenticateToken,
  FoodDeliveryCartController.clearCart
);

/**
 * POST /restaurants/:restaurantId/cart/coupon
 * Apply coupon code to cart
 */
router.post(
  '/restaurants/:restaurantId/cart/coupon',
  authenticateToken,
  Validations.applyCouponValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryCartController.applyCoupon
);

/**
 * DELETE /restaurants/:restaurantId/cart/coupon
 * Remove coupon from cart
 */
router.delete(
  '/restaurants/:restaurantId/cart/coupon',
  authenticateToken,
  FoodDeliveryCartController.removeCoupon
);

/**
 * POST /restaurants/:restaurantId/cart/address
 * Set delivery address for cart
 */
router.post(
  '/restaurants/:restaurantId/cart/address',
  authenticateToken,
  Validations.setDeliveryAddressValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryCartController.setDeliveryAddress
);

/**
 * POST /restaurants/:restaurantId/cart/tip
 * Add tip to order
 */
router.post(
  '/restaurants/:restaurantId/cart/tip',
  authenticateToken,
  Validations.addTipValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryCartController.addTip
);

/**
 * POST /restaurants/:restaurantId/cart/payment-method
 * Set payment method
 */
router.post(
  '/restaurants/:restaurantId/cart/payment-method',
  authenticateToken,
  Validations.setPaymentMethodValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryCartController.setPaymentMethod
);

/**
 * POST /restaurants/:restaurantId/cart/wallet
 * Add wallet amount to use
 */
router.post(
  '/restaurants/:restaurantId/cart/wallet',
  authenticateToken,
  Validations.addWalletAmountValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryCartController.addWalletAmount
);

/**
 * POST /restaurants/:restaurantId/cart/instructions
 * Set delivery instructions
 */
router.post(
  '/restaurants/:restaurantId/cart/instructions',
  authenticateToken,
  Validations.setDeliveryInstructionsValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryCartController.setDeliveryInstructions
);

/**
 * POST /restaurants/:restaurantId/cart/schedule
 * Schedule delivery for later
 */
router.post(
  '/restaurants/:restaurantId/cart/schedule',
  authenticateToken,
  Validations.scheduleDeliveryValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryCartController.scheduleDelivery
);

/**
 * GET /restaurants/:restaurantId/cart/checkout
 * Get cart ready for checkout
 */
router.get(
  '/restaurants/:restaurantId/cart/checkout',
  authenticateToken,
  FoodDeliveryCartController.getCartForCheckout
);

/**
 * POST /restaurants/:restaurantId/cart/validate
 * Validate cart before checkout
 */
router.post(
  '/restaurants/:restaurantId/cart/validate',
  authenticateToken,
  FoodDeliveryCartController.validateCart
);

/**
 * ORDER ENDPOINTS
 */

/**
 * POST /restaurants/:restaurantId/orders
 * Create order from cart
 */
router.post(
  '/restaurants/:restaurantId/orders',
  authenticateToken,
  Validations.createOrderValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryOrderController.createOrder
);

/**
 * GET /orders
 * Get all user orders
 */
router.get(
  '/orders',
  authenticateToken,
  Validations.getOrdersValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryOrderController.getUserOrders
);

/**
 * GET /orders/:orderId
 * Get order details
 */
router.get(
  '/orders/:orderId',
  authenticateToken,
  FoodDeliveryOrderController.getOrderDetails
);

/**
 * GET /orders/status/:status
 * Get orders by status
 */
router.get(
  '/orders/status/:status',
  authenticateToken,
  Validations.getOrdersByStatusValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryOrderController.getOrdersByStatus
);

/**
 * PUT /orders/:orderId/cancel
 * Cancel an order
 */
router.put(
  '/orders/:orderId/cancel',
  authenticateToken,
  Validations.cancelOrderValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryOrderController.cancelOrder
);

/**
 * POST /orders/:orderId/rating
 * Rate a delivered order
 */
router.post(
  '/orders/:orderId/rating',
  authenticateToken,
  Validations.rateOrderValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryOrderController.rateOrder
);

/**
 * POST /orders/:orderId/issue
 * Report issue with order
 */
router.post(
  '/orders/:orderId/issue',
  authenticateToken,
  Validations.reportIssueValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryOrderController.reportIssue
);

/**
 * GET /orders/:orderId/issues
 * Get issues reported for order
 */
router.get(
  '/orders/:orderId/issues',
  authenticateToken,
  FoodDeliveryOrderController.getIssues
);

/**
 * GET /orders/:orderId/track
 * Track order in real-time
 */
router.get(
  '/orders/:orderId/track',
  FoodDeliveryOrderController.trackOrder
);

/**
 * GET /user/stats
 * Get user order statistics
 */
router.get(
  '/user/stats',
  authenticateToken,
  FoodDeliveryOrderController.getUserStats
);

/**
 * RESTAURANT ENDPOINTS
 */

/**
 * GET /restaurants/:restaurantId/orders
 * Get restaurant's orders
 */
router.get(
  '/restaurants/:restaurantId/orders',
  authenticateToken,
  Validations.getRestaurantOrdersValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryOrderController.getRestaurantOrders
);

/**
 * PUT /restaurants/:restaurantId/orders/:orderId/status
 * Update order status (restaurant-initiated)
 */
router.put(
  '/restaurants/:restaurantId/orders/:orderId/status',
  authenticateToken,
  Validations.updateOrderStatusValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryOrderController.updateOrderStatusRestaurant
);

/**
 * POST /restaurants/:restaurantId/orders/:orderId/assign-delivery
 * Assign delivery person to order
 */
router.post(
  '/restaurants/:restaurantId/orders/:orderId/assign-delivery',
  authenticateToken,
  Validations.assignDeliveryPersonValidation(),
  Validations.handleValidationErrors(),
  FoodDeliveryOrderController.assignDeliveryPerson
);

/**
 * GET /restaurants/:restaurantId/orders/stats
 * Get restaurant order statistics
 */
router.get(
  '/restaurants/:restaurantId/orders/stats',
  authenticateToken,
  FoodDeliveryOrderController.getRestaurantOrderStats
);

module.exports = router;
