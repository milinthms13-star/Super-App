/**
 * FoodDeliveryRestaurantValidations
 * Input validation rules for Phase 2 - Restaurant & Menu endpoints
 * Estimated 400+ lines
 */

const { body, param, query, validationResult } = require('express-validator');

class FoodDeliveryRestaurantValidations {
  /**
   * Validate nearby restaurants query
   */
  static nearbyRestaurantsValidation() {
    return [
      query('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
      query('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
      query('radius')
        .optional()
        .isFloat({ min: 0.5, max: 15 })
        .withMessage('Radius must be between 0.5 and 15 km'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('skip')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Skip must be 0 or positive'),
      query('sortBy')
        .optional()
        .isIn(['distance', 'rating', 'delivery-time'])
        .withMessage('Sort by must be: distance, rating, or delivery-time'),
    ];
  }

  /**
   * Validate search restaurants
   */
  static searchRestaurantsValidation() {
    return [
      query('q')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Search query must be between 2 and 100 characters'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('skip')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Skip must be 0 or positive'),
    ];
  }

  /**
   * Validate filtered restaurants
   */
  static filteredRestaurantsValidation() {
    return [
      query('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
      query('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
      query('cuisines')
        .optional()
        .custom((value) => {
          if (typeof value === 'string' && value.length > 0) {
            const cuisines = value.split(',');
            if (cuisines.length > 20) {
              throw new Error('Maximum 20 cuisines can be selected');
            }
          }
          return true;
        }),
      query('priceRange')
        .optional()
        .custom((value) => {
          if (typeof value === 'string' && value.length > 0) {
            const ranges = value.split(',');
            const validRanges = ['budget', 'moderate', 'premium', 'luxury'];
            ranges.forEach((range) => {
              if (!validRanges.includes(range)) {
                throw new Error(`Invalid price range: ${range}`);
              }
            });
          }
          return true;
        }),
      query('vegetarianOnly')
        .optional()
        .isIn(['true', 'false'])
        .withMessage('Vegetarian only must be true or false'),
      query('minRating')
        .optional()
        .isFloat({ min: 0, max: 5 })
        .withMessage('Minimum rating must be between 0 and 5'),
      query('isOpen')
        .optional()
        .isIn(['true', 'false'])
        .withMessage('Is open must be true or false'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('skip')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Skip must be 0 or positive'),
      query('sortBy')
        .optional()
        .isIn(['distance', 'rating', 'delivery-time'])
        .withMessage('Sort by must be: distance, rating, or delivery-time'),
    ];
  }

  /**
   * Validate featured restaurants
   */
  static featuredRestaurantsValidation() {
    return [
      query('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
      query('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),
    ];
  }

  /**
   * Validate restaurant by cuisine
   */
  static restaurantByCuisineValidation() {
    return [
      param('cuisine')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Cuisine must be between 2 and 50 characters'),
      query('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
      query('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('skip')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Skip must be 0 or positive'),
    ];
  }

  /**
   * Validate restaurant ID parameter
   */
  static restaurantIdValidation() {
    return [
      param('id')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
    ];
  }

  /**
   * Validate add review
   */
  static addReviewValidation() {
    return [
      param('id')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
      body('comment')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Comment must not exceed 500 characters'),
      body('foodQuality')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Food quality rating must be between 1 and 5'),
      body('delivery')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Delivery rating must be between 1 and 5'),
      body('packaging')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Packaging rating must be between 1 and 5'),
      body('isVerifiedOrder')
        .optional()
        .isBoolean()
        .withMessage('Is verified order must be boolean'),
    ];
  }

  /**
   * Validate restaurant reviews query
   */
  static restaurantReviewsValidation() {
    return [
      param('id')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),
      query('skip')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Skip must be 0 or positive'),
    ];
  }

  /**
   * Validate menu search
   */
  static searchMenuValidation() {
    return [
      param('restaurantId')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      query('q')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Search query must be between 2 and 100 characters'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('skip')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Skip must be 0 or positive'),
    ];
  }

  /**
   * Validate menu category
   */
  static menuCategoryValidation() {
    return [
      param('restaurantId')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      param('category')
        .trim()
        .notEmpty()
        .withMessage('Category is required'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    ];
  }

  /**
   * Validate item ID parameter
   */
  static itemIdValidation() {
    return [
      param('itemId')
        .isMongoId()
        .withMessage('Invalid item ID'),
    ];
  }

  /**
   * Validate restaurant ID parameter in URL
   */
  static restaurantIdParamValidation() {
    return [
      param('restaurantId')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
    ];
  }

  /**
   * Validate dietary filters
   */
  static dietaryFiltersValidation() {
    return [
      param('restaurantId')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      query('glutenFree')
        .optional()
        .isIn(['true', 'false'])
        .withMessage('Gluten free must be true or false'),
      query('dairy')
        .optional()
        .isIn(['true', 'false'])
        .withMessage('Dairy free must be true or false'),
      query('nuts')
        .optional()
        .isIn(['true', 'false'])
        .withMessage('Nuts free must be true or false'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('skip')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Skip must be 0 or positive'),
    ];
  }

  /**
   * Validate spice level
   */
  static spiceLevelValidation() {
    return [
      param('restaurantId')
        .isMongoId()
        .withMessage('Invalid restaurant ID'),
      param('spiceLevel')
        .isIn(['mild', 'medium', 'hot', 'extra-hot', 'not-spicy'])
        .withMessage('Invalid spice level'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('skip')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Skip must be 0 or positive'),
    ];
  }

  /**
   * Validate calculate price
   */
  static calculatePriceValidation() {
    return [
      param('itemId')
        .isMongoId()
        .withMessage('Invalid item ID'),
      body('variantId')
        .optional()
        .isMongoId()
        .withMessage('Invalid variant ID'),
      body('addonIds')
        .optional()
        .isArray()
        .withMessage('Addon IDs must be an array')
        .custom((value) => {
          if (Array.isArray(value)) {
            value.forEach((id) => {
              if (!id.match(/^[0-9a-fA-F]{24}$/)) {
                throw new Error('Invalid addon ID in array');
              }
            });
          }
          return true;
        }),
    ];
  }

  /**
   * Validation middleware handler
   */
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((err) => ({
          field: err.param,
          message: err.msg,
        })),
      });
    }
    next();
  }
}

module.exports = FoodDeliveryRestaurantValidations;
