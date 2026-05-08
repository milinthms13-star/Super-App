const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * FoodDeliveryCartOrderValidations
 * Input validation rules for cart and order endpoints
 */

class FoodDeliveryCartOrderValidations {
  /**
   * Validation for adding item to cart
   */
  addToCartValidation() {
    return [
      body('menuItemId')
        .notEmpty()
        .withMessage('menuItemId is required')
        .isMongoId()
        .withMessage('Invalid menu item ID'),
      body('quantity')
        .notEmpty()
        .withMessage('quantity is required')
        .isInt({ min: 1, max: 50 })
        .withMessage('Quantity must be between 1 and 50'),
      body('selectedVariant').optional().isObject().withMessage('Invalid variant'),
      body('selectedAddons').optional().isArray().withMessage('Addons must be an array'),
      body('specialInstructions')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Instructions cannot exceed 500 characters')
    ];
  }

  /**
   * Validation for updating item quantity
   */
  updateItemQuantityValidation() {
    return [
      param('restaurantId')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      param('menuItemId')
        .isMongoId()
        .withMessage('Invalid menu item ID'),
      body('quantity')
        .notEmpty()
        .withMessage('quantity is required')
        .isInt({ min: 1, max: 50 })
        .withMessage('Quantity must be between 1 and 50'),
      body('variantId').optional().isMongoId().withMessage('Invalid variant ID')
    ];
  }

  /**
   * Validation for applying coupon
   */
  applyCouponValidation() {
    return [
      param('restaurantId')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      body('couponCode')
        .notEmpty()
        .withMessage('couponCode is required')
        .isLength({ min: 3, max: 20 })
        .withMessage('Coupon code must be 3-20 characters')
        .trim()
        .toUpperCase()
    ];
  }

  /**
   * Validation for setting delivery address
   */
  setDeliveryAddressValidation() {
    return [
      param('restaurantId')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      body('addressId')
        .notEmpty()
        .withMessage('addressId is required')
        .isMongoId()
        .withMessage('Invalid address ID')
    ];
  }

  /**
   * Validation for adding tip
   */
  addTipValidation() {
    return [
      param('restaurantId')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      body('tipAmount')
        .notEmpty()
        .withMessage('tipAmount is required')
        .isFloat({ min: 0, max: 10000 })
        .withMessage('Tip must be between 0 and 10000')
    ];
  }

  /**
   * Validation for payment method
   */
  setPaymentMethodValidation() {
    return [
      param('restaurantId')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      body('paymentMethod')
        .notEmpty()
        .withMessage('paymentMethod is required')
        .isIn(['cash', 'card', 'upi', 'wallet', 'netbanking'])
        .withMessage('Invalid payment method')
    ];
  }

  /**
   * Validation for wallet amount
   */
  addWalletAmountValidation() {
    return [
      param('restaurantId')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      body('walletAmount')
        .notEmpty()
        .withMessage('walletAmount is required')
        .isFloat({ min: 0, max: 100000 })
        .withMessage('Wallet amount must be between 0 and 100000')
    ];
  }

  /**
   * Validation for delivery instructions
   */
  setDeliveryInstructionsValidation() {
    return [
      param('restaurantId')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      body('instructions')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Instructions cannot exceed 500 characters')
    ];
  }

  /**
   * Validation for scheduling delivery
   */
  scheduleDeliveryValidation() {
    return [
      param('restaurantId')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      body('scheduledTime')
        .notEmpty()
        .withMessage('scheduledTime is required')
        .isISO8601()
        .withMessage('Invalid date format (use ISO 8601)')
    ];
  }

  /**
   * Validation for creating order
   */
  createOrderValidation() {
    return [
      param('restaurantId')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      body('paymentMethod')
        .notEmpty()
        .withMessage('paymentMethod is required')
        .isIn(['cash', 'card', 'upi', 'wallet', 'netbanking'])
        .withMessage('Invalid payment method'),
      body('deliveryAddressId')
        .optional()
        .isMongoId()
        .withMessage('Invalid address ID')
    ];
  }

  /**
   * Validation for getting orders
   */
  getOrdersValidation() {
    return [
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('skip')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Skip must be non-negative')
    ];
  }

  /**
   * Validation for getting order by status
   */
  getOrdersByStatusValidation() {
    return [
      param('status')
        .isIn(['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'returned'])
        .withMessage('Invalid order status')
    ];
  }

  /**
   * Validation for canceling order
   */
  cancelOrderValidation() {
    return [
      body('reason')
        .notEmpty()
        .withMessage('Cancellation reason is required')
        .isLength({ min: 3, max: 500 })
        .withMessage('Reason must be 3-500 characters')
    ];
  }

  /**
   * Validation for rating order
   */
  rateOrderValidation() {
    return [
      body('foodQuality')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Food quality rating must be 1-5'),
      body('delivery')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Delivery rating must be 1-5'),
      body('packaging')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Packaging rating must be 1-5'),
      body('restaurantRating')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Restaurant rating must be 1-5'),
      body('riderRating')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Rider rating must be 1-5'),
      body('comment')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Comment cannot exceed 1000 characters')
    ];
  }

  /**
   * Validation for reporting issue
   */
  reportIssueValidation() {
    return [
      body('issueType')
        .notEmpty()
        .withMessage('issueType is required')
        .isIn(['item_missing', 'item_damaged', 'late_delivery', 'quality_issue'])
        .withMessage('Invalid issue type'),
      body('description')
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 10, max: 1000 })
        .withMessage('Description must be 10-1000 characters')
    ];
  }

  /**
   * Validation for assigning delivery person
   */
  assignDeliveryPersonValidation() {
    return [
      body('name')
        .notEmpty()
        .withMessage('Delivery person name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be 2-100 characters'),
      body('phone')
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone must be 10 digits'),
      body('image').optional().isURL().withMessage('Invalid image URL'),
      body('rating')
        .optional()
        .isFloat({ min: 1, max: 5 })
        .withMessage('Rating must be 1-5')
    ];
  }

  /**
   * Validation for updating order status (restaurant)
   */
  updateOrderStatusValidation() {
    return [
      body('status')
        .notEmpty()
        .withMessage('status is required')
        .isIn(['preparing', 'ready'])
        .withMessage('Invalid status for restaurant'),
      body('note')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Note cannot exceed 500 characters')
    ];
  }

  /**
   * Validation for getting restaurant orders
   */
  getRestaurantOrdersValidation() {
    return [
      param('restaurantId')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      query('status')
        .optional()
        .isIn(['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'])
        .withMessage('Invalid status'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be 1-100'),
      query('skip')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Skip must be non-negative')
    ];
  }

  /**
   * Middleware to handle validation errors
   */
  handleValidationErrors() {
    return (req, res, next) => {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map(err => ({
            field: err.param,
            message: err.msg
          }))
        });
      }

      next();
    };
  }
}

module.exports = new FoodDeliveryCartOrderValidations();
